/**
 * Server-side data layer for GitHub App installations.
 *
 * Everything that reads or writes the `github_installation` table lives here so
 * the route handler, the server action, and the page all go through one
 * well-typed surface. No `"use server"` here — these are plain server functions
 * imported by server code; the mutating action wraps `deleteInstallation`.
 */

import type { GithubInstallationStatus } from "@/app/dashboard/github/types";
import { getGithubApp } from "@/app/dashboard/github/utils/github-app";
import { prisma } from "@/lib/db";

/**
 * Resolve the display login for an installation's account.
 *
 * GitHub's installation payload types `account` as a union: a user/org (has
 * `login`) or an enterprise (has `slug`). We normalise both to a single string,
 * so downstream code never has to branch on the account kind.
 */
function getAccountLogin(
  account: { login?: string; slug?: string } | null | undefined,
): string | null {
  if (!account) {
    return null;
  }

  if ("login" in account && account.login) {
    return account.login;
  }

  if (account.slug) {
    return account.slug;
  }

  return null;
}

/** The status returned when there is no installation on record for a user. */
function disconnectedStatus(): GithubInstallationStatus {
  return { connected: false, accountLogin: null, installedAt: null };
}

/**
 * Fast connection status for the GitHub page — a single indexed DB read.
 *
 * We deliberately do NOT call GitHub here: liveness is verified when the
 * installation is *saved* (see `saveInstallation`), keeping page loads snappy
 * and resilient to GitHub being slow/down. A stale row (app uninstalled on
 * GitHub's side) is reconciled the next time we actually use the installation.
 */
export async function getInstallationStatus(
  userId: string,
): Promise<GithubInstallationStatus> {
  const installation = await prisma.githubInstallation.findUnique({
    where: { userId },
  });

  if (!installation) {
    return disconnectedStatus();
  }

  return {
    connected: true,
    accountLogin: installation.accountLogin,
    installedAt: installation.createdAt.toISOString(),
  };
}

/**
 * Persist (or refresh) a user's installation after the GitHub callback.
 *
 * This is the one place that talks to GitHub: we fetch the installation's
 * metadata as the App itself, then upsert so re-installing or switching the
 * target account simply overwrites the existing row instead of failing on the
 * `userId` unique constraint.
 */
export async function saveInstallation(userId: string, installationId: number) {
  const app = getGithubApp();

  // Authenticated as the App (JWT), not as a user — this endpoint returns the
  // account the App was installed on plus its target type (User/Organization).
  const { data } = await app.octokit.request(
    "GET /app/installations/{installation_id}",
    { installation_id: installationId },
  );

  const accountLogin = getAccountLogin(data.account);

  await prisma.githubInstallation.upsert({
    where: { userId },
    create: {
      userId,
      installationId,
      accountLogin,
      accountType: data.target_type ?? null,
    },
    update: {
      installationId,
      accountLogin,
      accountType: data.target_type ?? null,
    },
  });
}

/** Remove a user's installation row (the "Disconnect" action). */
export async function deleteInstallation(userId: string) {
  await prisma.githubInstallation.delete({ where: { userId } });
}

/**
 * Reverse lookup: which user owns a given GitHub installation id?
 * Used by webhook handling (later stage) to route incoming events to a user.
 */
export async function getUserIdByInstallationId(installationId: number) {
  const installation = await prisma.githubInstallation.findFirst({
    where: { installationId },
    select: { userId: true },
  });

  return installation?.userId ?? null;
}

/** Forward lookup: the installation id we act through for a given user. */
export async function getUserInstallationId(userId: string) {
  const installation = await prisma.githubInstallation.findUnique({
    where: { userId },
    select: { installationId: true },
  });

  return installation?.installationId ?? null;
}
