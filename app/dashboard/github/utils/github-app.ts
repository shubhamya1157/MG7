import { App } from "octokit";

let githubApp: App | null = null;

export function getGithubApp(): App {
  if (githubApp) {
    return githubApp;
  }

  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!appId) {
    throw new Error("Missing GITHUB_APP_ID");
  }

  if (!privateKey) {
    throw new Error("Missing GITHUB_APP_PRIVATE_KEY");
  }

  githubApp = new App({
    appId,
    // Convert "\n" in .env into real newlines for the PEM key
    privateKey: privateKey.replace(/\\n/g, "\n"),
    ...(webhookSecret
      ? {
          webhooks: {
            secret: webhookSecret,
          },
        }
      : {}),
  });

  return githubApp;
}

export function getGithubInstallUrl(userId: string): string {
  const appName = process.env.GITHUB_APP_NAME;

  if (!appName) {
    throw new Error("Missing GITHUB_APP_NAME");
  }

  const url = new URL(
    `https://github.com/apps/${appName}/installations/new`
  );

  url.searchParams.set("state", userId);

  return url.toString();
}