/**
 * /dashboard/reviews — every pull request the Inngest pipeline has touched.
 *
 * The webhook handler upserts a PullRequest row per PR and emits a
 * `pr.review.requested` event; the Inngest function then walks the row through
 * pending → processing → reviewed (or failed) and stores the AI review. This
 * page is the read side of that pipeline: status counts up top, then each PR
 * as a row linking to its full review page.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CaretRightIcon,
  GitPullRequestIcon,
  GithubLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import { formatDistanceToNow } from "date-fns";

import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/db";
import type { PullRequest } from "@/lib/generated/prisma/client";
import { ROUTES, reviewDetailRoute } from "@/lib/routes";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export const metadata: Metadata = {
  title: "Reviews · MG7",
  description: "Pull requests automatically reviewed by MG7.",
};

const PAGE_SIZE = 25;

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
    case "closed":
      return "info";
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
  closed: "bg-sky-500/10 border-sky-500/30 text-sky-500",
};

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  // Layout already gated the session; re-check anyway (cheap — the request is
  // memoized) so this page never renders without a user even if it moves.
  const session = await getSession();
  if (!session) {
    redirect(ROUTES.signIn);
  }
  const userId = session.user.id;

  const { page: pageParam } = await searchParams;
  const requestedPage = Math.max(1, Number(pageParam) || 1);

  let pullRequests: PullRequest[] = [];
  // Counts come from a groupBy over ALL of the user's PRs — correct even
  // though the list below is paginated.
  const counts = { total: 0, reviewed: 0, inFlight: 0, failed: 0 };
  let totalPages = 1;
  let page = requestedPage;

  try {
    const installation = await prisma.githubInstallation.findUnique({
      where: { userId },
      select: { installationId: true },
    });
    if (installation) {
      const grouped = await prisma.pullRequest.groupBy({
        by: ["status"],
        where: { installationId: installation.installationId },
        _count: { _all: true },
      });
      for (const group of grouped) {
        const n = group._count._all;
        counts.total += n;
        if (group.status === "reviewed") counts.reviewed += n;
        if (group.status === "pending" || group.status === "processing")
          counts.inFlight += n;
        if (group.status === "failed") counts.failed += n;
      }

      totalPages = Math.max(1, Math.ceil(counts.total / PAGE_SIZE));
      page = Math.min(requestedPage, totalPages);

      pullRequests = await prisma.pullRequest.findMany({
        where: { installationId: installation.installationId },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      });
    }
  } catch (error) {
    console.error("Failed to load pull requests for the reviews page:", error);
  }

  const pageHref = (p: number) =>
    p <= 1 ? ROUTES.dashboardReviews : `${ROUTES.dashboardReviews}?page=${p}`;

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
            Open a pull request to read the AI-generated review.
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
                <Link
                  key={pr.id}
                  href={reviewDetailRoute(pr.id)}
                  className="group flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
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
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="flex flex-col items-end gap-1.5">
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
                    <CaretRightIcon className="mt-2 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <Pagination className="mt-6">
              <PaginationContent>
                {page > 1 && (
                  <PaginationItem>
                    <PaginationPrevious href={pageHref(page - 1)} />
                  </PaginationItem>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <PaginationItem key={p}>
                      <PaginationLink href={pageHref(p)} isActive={p === page}>
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}
                {page < totalPages && (
                  <PaginationItem>
                    <PaginationNext href={pageHref(page + 1)} />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
