/**
 * POST /api/github/webhook
 *
 * The endpoint registered as the GitHub App's "Webhook URL". All logic lives in
 * the server module so it can be unit-tested without a route context.
 */

import { handleGithubWebhook } from "@/app/dashboard/github/server/webhook-handler";

export const POST = handleGithubWebhook;
