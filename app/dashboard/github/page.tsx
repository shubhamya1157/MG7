/**
 * /dashboard/github — manage the GitHub App connection.
 *
 * A React Server Component: it reads the session and the installation status on
 * the server before rendering, and computes the (server-only) install URL to
 * hand down to the client card. The dashboard layout owns the shell (sidebar +
 * header) and gates the session; the `getSession()` check here stays as the
 * per-page authoritative guard.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/get-session";
import { ROUTES } from "@/lib/routes";
import { getInstallationStatus } from "@/app/dashboard/github/server/installation";
import { getGithubInstallUrl } from "@/app/dashboard/github/utils/github-app";
import { GithubConnectCard } from "@/components/github/github-connect-card";

export const metadata: Metadata = {
  title: "GitHub App · MG7",
  description: "Install or disconnect the MG7 reviewer on your GitHub account.",
};

export default async function DashboardGithubPage() {
  const session = await getSession();
  if (!session) {
    redirect(ROUTES.signIn);
  }

  // Both computed on the server: the DB-backed status and the install URL (which
  // needs the app name from serverEnv and encodes this user's id in `state`).
  const installation = await getInstallationStatus(session.user.id);
  const installUrl = getGithubInstallUrl(session.user.id);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          GitHub App
        </h1>
        <p className="text-sm text-muted-foreground">
          Install or disconnect the reviewer on your GitHub account.
        </p>
      </div>

      <div className="mt-8">
        <GithubConnectCard installation={installation} installUrl={installUrl} />
      </div>
    </main>
  );
}
