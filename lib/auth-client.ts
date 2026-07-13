import { createAuthClient } from "better-auth/react";

/**
 * Browser-side auth client for better-auth.
 *
 * This is used from Client Components to trigger flows like social sign-in,
 * sign-out and reading the reactive session. It talks to the API routes
 * mounted at `app/api/auth/[...all]/route.ts`.
 *
 * `baseURL` falls back to the current origin when omitted, but we read it from
 * an env var so the same code works locally and in production.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
});

// Handy named exports so components can `import { signIn } from "@/lib/auth-client"`.
export const { signIn, signOut, useSession } = authClient;

/**
 * Kick off the GitHub OAuth flow and return the user to `callbackURL`
 * once they come back from GitHub.
 */
export function signInWithGitHub(callbackURL = "/dashboard") {
  return authClient.signIn.social({
    provider: "github",
    callbackURL,
  });
}
