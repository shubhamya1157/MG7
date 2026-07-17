import { createOpenRouter } from '@openrouter/ai-sdk-provider';

/**
 * OpenRouter provider factory.
 *
 * Callable with an override key so a user's own key (BYOK, Phase 2) can drive
 * their reviews; with no argument it falls back to the app's key from env.
 */
export function getOpenRouter(apiKey?: string) {
  const key = apiKey ?? process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }
  return createOpenRouter({ apiKey: key });
}

/** Model used for review generation — overridable per deployment. */
export function getReviewModelName(): string {
  return process.env.OPENROUTER_MODEL || "google/gemini-2.5-pro";
}
