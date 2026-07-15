/**
 * Inngest client + typed event catalogue.
 *
 * Inngest is our durable background-job runner: instead of doing slow work
 * (cloning a repo, calling an AI model) inside a webhook request — where GitHub
 * expects a fast 2xx and will retry on timeout — we emit an *event* and return
 * immediately. Inngest then runs the matching function with automatic retries,
 * step memoisation, and concurrency control.
 *
 * SERVER-ONLY. Emit events from server code via `inngest.send(...)`.
 */

import { eventType, Inngest, staticSchema } from "inngest";

/**
 * The events this app can emit, typed so `inngest.send()` and
 * `createFunction({ triggers })` share one contract — a typo in an event name
 * or a missing field is a compile error, not a silent no-op job.
 *
 * (Inngest v4 replaced the old `EventSchemas().fromRecord<…>()` catalogue with
 * per-event `eventType()` definitions; `staticSchema` gives compile-time types
 * without a runtime validation library.)
 */

/** A reviewable pull request was saved and is ready for AI review. */
export const prReviewRequested = eventType("pull-request/review.requested", {
  schema: staticSchema<{
    /** `PullRequest.id` (our cuid), the durable handle for the job. */
    pullRequestId: string;
    /** GitHub installation id — needed to act back on the PR. */
    installationId: number;
    repoFullName: string;
    prNumber: number;
    /** Head commit under review; lets the job detect superseding pushes. */
    headSha: string;
  }>(),
});

export const inngest = new Inngest({
  id: "mg7",
});
