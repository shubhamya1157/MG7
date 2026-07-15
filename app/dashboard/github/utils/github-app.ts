import { App } from "octokit";

import { serverEnv } from "@/lib/env";

/**
 * GitHub *App* client factory + install-URL builder.
 *
 * This is the low-level bridge to GitHub for anything that acts as the App
 * itself (as opposed to the OAuth-authenticated user): reading installation
 * metadata, minting installation tokens, and — later — verifying webhooks.
 *
 * SERVER-ONLY. It imports `serverEnv`, which reads the App's private key.
 */

// Cached across invocations within a single server runtime. The `App` holds the
// signing key and does JWT minting internally; there's no reason to rebuild it
// (and doing so per-request would re-parse the PEM every time).
let githubApp: App | null = null;

/**
 * Lazily construct (and memoise) the GitHub App client.
 *
 * The private key is stored single-line in the environment with literal `\n`
 * sequences, so we translate those back into real newlines before handing the
 * PEM to octokit — otherwise JWT signing fails with an opaque key error.
 *
 * Webhook verification is wired up *only* when `GITHUB_WEBHOOK_SECRET` is set.
 * Until the webhooks stage that var is absent, and passing `secret: undefined`
 * would make octokit's webhook layer throw at construction time.
 */
export function getGithubApp(): App {
  if (githubApp) {
    return githubApp;
  }

  const privateKey = serverEnv.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n");

  githubApp = new App({
    appId: serverEnv.GITHUB_APP_ID,
    privateKey,
    ...(serverEnv.GITHUB_WEBHOOK_SECRET
      ? { webhooks: { secret: serverEnv.GITHUB_WEBHOOK_SECRET } }
      : {}),
  });

  return githubApp;
}

/**
 * Build the URL that starts the App installation flow on GitHub.
 *
 * The user's id is threaded through GitHub's `state` parameter so that, when
 * GitHub redirects back to our callback, we can associate the resulting
 * installation with the right account. GitHub echoes `state` back verbatim.
 *
 * NOTE: this reads only the public app *name*, so it's safe to call from code
 * paths that also run on the server — but we surface the URL to the client via
 * a prop rather than importing this module into a Client Component (it pulls in
 * `serverEnv`).
 */
export function getGithubInstallUrl(userId: string): string {
  const url = new URL(
    `https://github.com/apps/${serverEnv.GITHUB_APP_NAME}/installations/new`,
  );
  url.searchParams.set("state", userId);
  return url.toString();
}
