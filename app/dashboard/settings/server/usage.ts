/**
 * Free-tier usage accounting.
 *
 * Reviews run out-of-band per *installation*, so usage is measured by counting
 * PullRequests that finished reviewing this calendar month across all of the
 * user's installations. BYOK users bypass the quota entirely (the model calls
 * bill to their own OpenRouter key).
 *
 * SERVER-ONLY.
 */

import { prisma } from "@/lib/db";

/** Reviews per calendar month on the app's own OpenRouter key. */
export const FREE_MONTHLY_REVIEW_LIMIT = 20;

export async function getMonthlyReviewCount(userId: string): Promise<number> {
  const installation = await prisma.githubInstallation.findUnique({
    where: { userId },
    select: { installationId: true },
  });
  if (!installation) {
    return 0;
  }
  return getMonthlyReviewCountForInstallation(installation.installationId);
}

/**
 * Same count keyed by GitHub installation id — the shape the webhook/review
 * job has in hand (webhook payloads carry no user id).
 */
export async function getMonthlyReviewCountForInstallation(
  installationId: number,
): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  return prisma.pullRequest.count({
    where: {
      installationId,
      reviewedAt: { gte: startOfMonth },
    },
  });
}
