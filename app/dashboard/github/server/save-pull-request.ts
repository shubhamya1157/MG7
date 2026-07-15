/**
 * Persist a pull request from a GitHub webhook payload.
 *
 * This is the write-side of the webhook: it maps GitHub's event shape onto our
 * `pull_request` row and upserts, so both a freshly-opened PR and a re-push
 * ("synchronize") land on the same record keyed by (repo, number).
 */

import type { PullRequestWebhookPayload } from "@/app/dashboard/github/server/webhook-handler";
import { prisma } from "@/lib/db";

/** GitHub sends `user: null` for some bot/ghost authors — normalise to null. */
function getAuthorLogin(user: { login: string } | null): string | null {
  return user?.login ?? null;
}

/**
 * Upsert the PR and return the stored row.
 *
 * On update we intentionally refresh only the mutable fields (title, head sha)
 * and reset `status` to "pending" — a new push means the previous review is
 * stale and the PR should be re-reviewed. Returning the row gives the caller
 * the durable `id` to hand to the background job.
 */
export async function savePullRequest(payload: PullRequestWebhookPayload) {
  const repoFullName = payload.repository.full_name;
  const prNumber = payload.pull_request.number;

  return prisma.pullRequest.upsert({
    where: { repoFullName_prNumber: { repoFullName, prNumber } },
    create: {
      installationId: payload.installation.id,
      repoFullName,
      prNumber,
      title: payload.pull_request.title,
      authorLogin: getAuthorLogin(payload.pull_request.user),
      headSha: payload.pull_request.head.sha,
      baseBranch: payload.pull_request.base.ref,
      status: "pending",
    },
    update: {
      title: payload.pull_request.title,
      headSha: payload.pull_request.head.sha,
      status: "pending",
    },
  });
}
