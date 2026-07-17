/**
 * /dashboard/reviews/[id] — one pull request's full review.
 *
 * The list page shows a compact row per PR; this page is the deep view:
 * PR metadata (repo, number, author, head commit, timestamps) plus the stored
 * AI review rendered as rich markdown with syntax-highlighted code blocks.
 *
 * Authorization: the row is only served when it belongs to the signed-in
 * user's GitHub App installation — anything else 404s so ids can't be probed.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  GitPullRequestIcon,
} from "@phosphor-icons/react/dist/ssr";
import { format, formatDistanceToNow } from "date-fns";

import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/db";
import { ROUTES } from "@/lib/routes";
import { statusBadge, type statusBadgeClass } from "@/lib/status-style";
import { ReviewMarkdown } from "@/app/dashboard/reviews/review-markdown";
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
  title: "Review · MG7",
  description: "AI-generated review for a pull request.",
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
    case "quota_exceeded":
      return "warning";
    default:
      return "neutral";
  }
}

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    redirect(ROUTES.signIn);
  }

  // Scope the lookup to this user's installation — a PR from someone else's
  // installation must be indistinguishable from a nonexistent id.
  const installation = await prisma.githubInstallation.findUnique({
    where: { userId: session.user.id },
    select: { installationId: true },
  });
  if (!installation) {
    notFound();
  }

  const pr = await prisma.pullRequest.findFirst({
    where: { id, installationId: installation.installationId },
  });
  if (!pr) {
    notFound();
  }

  const prUrl = `https://github.com/${pr.repoFullName}/pull/${pr.prNumber}`;
  const inFlight = pr.status === "pending" || pr.status === "processing";

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      {/* Poll while the pipeline is still working on this PR. */}
      <ReviewsAutoRefresh active={inFlight} />

      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 mb-4 text-muted-foreground"
        render={<Link href={ROUTES.dashboardReviews} />}
      >
        <ArrowLeftIcon className="size-4" />
        All reviews
      </Button>

      {/* PR header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-1 grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-muted text-muted-foreground">
              <GitPullRequestIcon className="size-4.5" />
            </span>
            <div>
              <h1 className="font-heading text-xl font-bold tracking-tight">
                {pr.title}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {pr.repoFullName} #{pr.prNumber} • by @
                {pr.authorLogin || "unknown"} → {pr.baseBranch}
              </p>
            </div>
          </div>
          <span className={statusBadge(toneFor(pr.status))}>{pr.status}</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="font-mono">head {pr.headSha.slice(0, 7)}</span>
          {pr.reviewedAt ? (
            <span title={format(new Date(pr.reviewedAt), "PPpp")}>
              reviewed{" "}
              {formatDistanceToNow(new Date(pr.reviewedAt), {
                addSuffix: true,
              })}
            </span>
          ) : (
            <span>
              updated{" "}
              {formatDistanceToNow(new Date(pr.updatedAt), {
                addSuffix: true,
              })}
            </span>
          )}
          <a
            href={prUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary hover:opacity-80"
          >
            View on GitHub
            <ArrowSquareOutIcon className="size-3.5" />
          </a>
        </div>
      </div>

      {/* Review body */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>AI review</CardTitle>
          <CardDescription>
            {pr.status === "reviewed"
              ? "Generated by MG7 and posted to the pull request on GitHub."
              : inFlight
                ? "The review is being generated — this page refreshes automatically."
                : "No review is available for this pull request."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pr.reviewComment ? (
            <ReviewMarkdown markdown={pr.reviewComment} />
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {inFlight
                ? "Hang tight — MG7 is reading the diff."
                : pr.status === "failed"
                  ? "The review failed. Push a new commit to the PR to retry."
                  : "Nothing to show yet."}
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
