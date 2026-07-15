/**
 * Inngest serve endpoint.
 *
 * Inngest (cloud or the local dev server) reaches this route to discover the
 * app's functions and to invoke them. The `serve()` helper handles all three
 * verbs: GET for introspection, PUT to register, POST to run a step.
 */

import { serve } from "inngest/next";

import { inngest } from "@/lib/inngest";
import { reviewPullRequest } from "./functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [reviewPullRequest],
});
