import { eventType, Inngest, staticSchema } from "inngest";

export const prReviewRequested = eventType("pull-request/review.requested", {
  schema: staticSchema<{

    pullRequestId: string;

    installationId: number;
    repoFullName: string;
    prNumber: number;

    headSha: string;
  }>(),
});

// Fired when a user asks MG7 to (re-)index a repo's codebase into Pinecone.
export const repoSyncRequested = eventType("repo/sync.requested", {
  schema: staticSchema<{
    repoSyncId: string;
  }>(),
});

export const inngest = new Inngest({
  id: "mg7",
});
