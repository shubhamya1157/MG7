"use server";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/get-session";
import { ROUTES } from "@/lib/routes";
import { deleteInstallation } from "@/app/dashboard/github/server/installation";

/**
 * Server Actions for the GitHub App surface.
 *
 * Actions are the *mutating* entry points invoked from the client (via a
 * `<form action={…}>`). They re-check the session server-side — never trust the
 * client to have gated the call — then delegate the actual work to the server
 * data layer in `server/installation.ts`.
 */

/**
 * Disconnect the GitHub App for the signed-in user.
 *
 * Removes our installation record. (The user separately uninstalls the App from
 * GitHub's settings; we only drop our side of the link.) Redirects back to the
 * GitHub page so the card re-renders in its disconnected state.
 */
export async function disconnectGithubApp() {
  const session = await getSession();
  if (!session) {
    redirect(ROUTES.signIn);
  }

  await deleteInstallation(session.user.id);
  redirect(ROUTES.dashboardGithub);
}
