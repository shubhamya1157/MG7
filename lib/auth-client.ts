import { createAuthClient } from "better-auth/react";

import { ROUTES } from "@/lib/routes";

/**
 * Browser-side auth client for better-auth.
 *
 * Used from Client Components to trigger flows like social sign-in, sign-out
 * and reading the reactive session. It talks to the API routes mounted at
 * `app/api/auth/[...all]/route.ts`.
 *
 * No `baseURL` is provided here, so better-auth talks to the same origin the
 * browser is currently using. That keeps localhost and ngrok sessions from
 * accidentally crossing origins.
 */
export const authClient = createAuthClient();

// Handy named exports so components can `import { signIn } from "@/lib/auth-client"`.
export const { signIn, signOut, useSession } = authClient;

/** Where users land after a successful sign-in when no explicit target is given. */
export const DEFAULT_SIGN_IN_REDIRECT = ROUTES.dashboard;

/**
 * Kick off the GitHub OAuth flow and return the user to `callbackURL` once they
 * come back from GitHub. Defaults to the app's post-login dashboard.
 *
 * The body (`signIn.social({ provider, callbackURL })`) is the pattern from the
 * better-auth docs; the wrapper, the default and this doc comment are ours.
 */
export function signInWithGitHub(callbackURL: string = DEFAULT_SIGN_IN_REDIRECT) {
  return authClient.signIn.social({
    provider: "github",
    callbackURL,
  });
}
