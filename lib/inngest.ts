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

export const inngest = new Inngest({
  id: "mg7",
});
