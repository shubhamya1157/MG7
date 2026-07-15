/**
 * /dashboard/reviews — every pull request the Inngest pipeline has touched.
 *
 * The webhook handler upserts a PullRequest row per PR and emits a
 * `pr.review.requested` event; the Inngest function then walks the row through
 * pending → processing → reviewed (or failed) and stores the AI review. This
 * page is the read side of that pipeline: status counts up top, then each PR
 * as an expandable row revealing the stored review comment.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GitPullRequestIcon, GithubLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { formatDistanceToNow } from "date-fns";

import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/db";
import type { PullRequest } from "@/lib/generated/prisma/client";
import { ROUTES } from "@/lib/routes";
import { statusBadge, type statusBadgeClass } from "@/lib/status-style";
import { cn } from "@/lib/utils";
import { ReviewsAutoRefresh } from "@/app/dashboard/reviews/reviews-auto-refresh";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Reviews · MG7",
  description: "Pull requests automatically reviewed by MG7.",
};

/** Map a PullRequest.status to the shared badge tone. */
function toneFor(status: string): keyof typeof statusBadgeClass {
  switch (status) {
    case "reviewed":
      return "success";
    case "processing":
      return "warning";
    case "failed":
      return "danger";
    default:
      return "neutral";
  }
}

/** Icon-tile colours per status — matches the badge tones above. */
const iconTileClass: Record<string, string> = {
  reviewed: "bg-emerald-500/10 border-emerald-500/30 text-emerald-500",
  processing:
    "bg-amber-500/10 border-amber-500/30 text-amber-500 animate-pulse",
  failed: "bg-red-500/10 border-red-500/30 text-red-500",
};

export default async function ReviewsPage() {
  // Layout already gated the session; re-check anyway (cheap — the request is
  // memoized) so this page never renders without a user even if it moves.
  const session = await getSession();
  if (!session) {
    redirect(ROUTES.signIn);
  }
  const userId = session.user.id;

  let pullRequests: PullRequest[] = [];
  try {
    const installation = await prisma.githubInstallation.findUnique({
      where: { userId },
      select: { installationId: true },
    });
    if (installation) {
      pullRequests = await prisma.pullRequest.findMany({
        where: { installationId: installation.installationId },
        orderBy: { updatedAt: "desc" },
      });
    }
  } catch (error) {
    console.error("Failed to load pull requests for the reviews page:", error);
  }

  const counts = {
    total: pullRequests.length,
    reviewed: pullRequests.filter((pr) => pr.status === "reviewed").length,
    inFlight: pullRequests.filter(
      (pr) => pr.status === "pending" || pr.status === "processing",
    ).length,
    failed: pullRequests.filter((pr) => pr.status === "failed").length,
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      {/* Poll while the pipeline is running so statuses update live. */}
      <ReviewsAutoRefresh active={counts.inFlight > 0} />

      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Reviews
        </h1>
        <p className="text-sm text-muted-foreground">
          Every pull request scanned and reviewed by MG7 on your connected
          repositories.
        </p>
      </div>

      {/* Pipeline stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total pull requests", value: counts.total },
          { label: "Reviewed", value: counts.reviewed },
          { label: "In progress", value: counts.inFlight },
          { label: "Failed", value: counts.failed },
        ].map((stat) => (
          <Card key={stat.label} size="sm">
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl">{String(stat.value)}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>All reviews</CardTitle>
          <CardDescription>
            Expand a pull request to read the AI-generated review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pullRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span className="mb-3 grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground">
                <GitPullRequestIcon className="size-5" />
              </span>
              <p className="text-sm font-medium text-foreground">
                No pull requests reviewed yet
              </p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Once the GitHub App is installed, every pull request opened or
                updated on your connected repositories will show up here.
              </p>
              <Button
                className="mt-4"
                variant="outline"
                render={<Link href={ROUTES.dashboardGithub} />}
              >
                <GithubLogoIcon weight="fill" className="size-4" />
                Set up the GitHub App
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {pullRequests.map((pr) => (
                <details key={pr.id} className="group py-4 first:pt-0 last:pb-0">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 [&::-webkit-details-marker]:hidden">
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border",
                          iconTileClass[pr.status] ??
                            "border-border bg-muted text-muted-foreground",
                        )}
                      >
                        <GitPullRequestIcon className="size-4" />
                      </span>
                      <div className="flex flex-col">
                        <span className="pr-2 text-sm font-medium transition-colors group-hover:text-primary">
                          {pr.title}
                        </span>
                        <span className="mt-0.5 text-xs text-muted-foreground">
                          {pr.repoFullName} #{pr.prNumber} • by @
                          {pr.authorLogin || "unknown"}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className={statusBadge(toneFor(pr.status))}>
                        {pr.status}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {formatDistanceToNow(
                          new Date(pr.reviewedAt ?? pr.updatedAt),
                          { addSuffix: true },
                        )}
                      </span>
                    </div>
                  </summary>
                  {pr.status === "reviewed" && pr.reviewComment && (
                    <div className="mt-4 max-h-[400px] overflow-x-auto rounded-lg border border-border/40 bg-muted/40 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground select-all">
                      {pr.reviewComment}
                    </div>
                  )}
                </details>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
