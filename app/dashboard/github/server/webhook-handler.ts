/**
 * GitHub webhook processing.
 *
 * The hot path GitHub hits on every event for installed repositories. Contract:
 * verify fast, persist the minimum, hand the slow work to Inngest, return 2xx.
 * GitHub retries deliveries that don't answer promptly, so nothing here may
 * block on model calls or repo fetches.
 *
 * Security: every request is HMAC-verified against `GITHUB_WEBHOOK_SECRET`
 * before the payload is even parsed. An unverified body never touches the DB.
 */

import { serverEnv } from "@/lib/env";
import { inngest, prReviewRequested } from "@/lib/inngest";
import { getGithubApp } from "@/app/dashboard/github/utils/github-app";
import { savePullRequest } from "@/app/dashboard/github/server/save-pull-request";

/** PR actions that warrant a (re-)review; everything else is acknowledged and dropped. */
const REVIEWABLE_ACTIONS = ["opened", "synchronize", "reopened"] as const;

/** The subset of GitHub's `pull_request` event payload we actually consume. */
export type PullRequestWebhookPayload = {
  /** e.g. `opened`, `synchronize`, `reopened`, `closed`, … */
  action: string;
  /** The App installation this event was delivered for. */
  installation: { id: number };
  repository: { full_name: string };
  pull_request: {
    number: number;
    title: string;
    user: { login: string } | null;
    head: { sha: string };
    base: { ref: string };
  };
};

/**
 * Verify GitHub's HMAC signature over the raw body.
 * Octokit implements the timing-safe comparison; we only feed it inputs.
 */
async function isSignatureValid(
  payload: string,
  signature: string | null,
): Promise<boolean> {
  if (!signature) {
    return false;
  }
  return getGithubApp().webhooks.verify(payload, signature);
}

export async function handleGithubWebhook(request: Request): Promise<Response> {
  // Misconfiguration guard: without the shared secret we cannot authenticate
  // deliveries, and processing unauthenticated webhooks is worse than downtime.
  if (!serverEnv.GITHUB_WEBHOOK_SECRET) {
    console.error(
      "GITHUB_WEBHOOK_SECRET is not set — rejecting webhook delivery.",
    );
    return Response.json({ error: "Webhook not configured" }, { status: 503 });
  }

  // Read the raw text first: signature verification must run over the exact
  // bytes GitHub signed, not a re-serialisation of parsed JSON.
  const payload = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!(await isSignatureValid(payload, signature))) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Cheap header check before JSON.parse — most deliveries (pings, stars,
  // installation churn) aren't PR events at all.
  const eventName = request.headers.get("x-github-event");
  if (eventName !== "pull_request") {
    return Response.json({ received: true });
  }

  const event = JSON.parse(payload) as PullRequestWebhookPayload;

  if (!REVIEWABLE_ACTIONS.includes(event.action as (typeof REVIEWABLE_ACTIONS)[number])) {
    return Response.json({ received: true });
  }

  // Persist first, then enqueue: the job references the row by id, so the row
  // must exist before the event is in flight.
  const pullRequest = await savePullRequest(event);

  await inngest.send(
    prReviewRequested.create({
      pullRequestId: pullRequest.id,
      installationId: pullRequest.installationId,
      repoFullName: pullRequest.repoFullName,
      prNumber: pullRequest.prNumber,
      headSha: pullRequest.headSha,
    }),
  );

  return Response.json({ received: true });
}
