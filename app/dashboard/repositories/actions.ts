"use server";

/**
 * Server action: kick off a background codebase sync for a repo.
 *
 * Re-checks the session inside the action (server actions are network
 * endpoints — the page's gate doesn't protect them) and resolves the caller's
 * own installation id server-side, so a forged request can't sync a repo
 * through someone else's installation.
 */

import { getSession } from "@/lib/get-session";
import { getUserInstallationId } from "@/app/dashboard/github/server/installation";
import { triggerRepoSync } from "@/app/dashboard/repositories/server/repo-sync";
import { isPineconeConfigured } from "@/lib/pinecone";

export type SyncActionResult = {
  ok: boolean;
  message: string;
};

export async function syncRepoCodebase(
  repoFullName: string,
  branch: string,
): Promise<SyncActionResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, message: "Not signed in." };
  }

  if (!isPineconeConfigured()) {
    return {
      ok: false,
      message: "Vector search is not configured on this deployment.",
    };
  }

  const installationId = await getUserInstallationId(session.user.id);
  if (!installationId) {
    return {
      ok: false,
      message: "Install the MG7 GitHub App first (Dashboard → GitHub).",
    };
  }

  await triggerRepoSync(installationId, repoFullName, branch);
  return { ok: true, message: `Syncing ${repoFullName}…` };
}
