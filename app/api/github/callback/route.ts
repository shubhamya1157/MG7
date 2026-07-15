/**
 * GET /api/github/callback
 *
 * GitHub redirects here after a user installs (or reconfigures) the App. The
 * request carries `?installation_id=…` (and `?state=<userId>`, which GitHub
 * echoes from the install URL we built).
 *
 * Flow:
 *   1. Require a session. If the user isn't signed in (e.g. they installed the
 *      App in a fresh browser), bounce through sign-in and come *back* to this
 *      same callback so no installation is dropped.
 *   2. With a session + an installation id, persist the installation against
 *      the current user.
 *   3. Land the user on the GitHub dashboard page, now showing "Connected".
 */

import { redirect } from "next/navigation";

import { getSession } from "@/lib/get-session";
import { ROUTES } from "@/lib/routes";
import { saveInstallation } from "@/app/dashboard/github/server/installation";

/**
 * Where to send an *unauthenticated* caller so they return here afterwards.
 * We preserve `installation_id` so the post-login round-trip still saves it.
 */
function returnHereAfterSignIn(installationId: string | null): string {
  const callback = installationId
    ? `/api/github/callback?installation_id=${installationId}`
    : ROUTES.dashboardGithub;

  // Matches the sign-in page's own `?redirect=` contract (see app/sign-in).
  return `${ROUTES.signIn}?redirect=${encodeURIComponent(callback)}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const installationId = searchParams.get("installation_id");

  const session = await getSession();
  if (!session) {
    redirect(returnHereAfterSignIn(installationId));
  }

  // `installation_id` is absent when GitHub sends the user here for reasons
  // other than a completed install (e.g. a bare "configure" bounce); in that
  // case we just return them to the page without touching the DB.
  if (installationId) {
    await saveInstallation(session.user.id, Number(installationId));
  }

  redirect(ROUTES.dashboardGithub);
}
