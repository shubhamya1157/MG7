/**
 * /dashboard — the Overview page inside the authenticated shell.
 *
 * The surrounding layout (app/dashboard/layout.tsx) owns the sidebar, header
 * chrome, and the authoritative session gate. This page re-reads the session
 * only to greet the user and query their data.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRightIcon,
  GitPullRequestIcon,
  GithubLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import { formatDistanceToNow } from "date-fns";

import { getSession } from "@/lib/get-session";
import { getGitHubConnection } from "@/lib/github";
import { ROUTES } from "@/lib/routes";
import { prisma } from "@/lib/db";
import type { PullRequest } from "@/lib/generated/prisma/client";
import { statusBadge, type statusBadgeClass } from "@/lib/status-style";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const LATEST_REVIEWS_LIMIT = 5;

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

export default async function DashboardPage() {
  // Layout already gated the session; re-check anyway (cheap — the request is
  // memoized) so this page never renders without a user even if it moves.
  const session = await getSession();
  if (!session) {
    redirect(ROUTES.signIn);
  }
  const { user } = session;
  const github = await getGitHubConnection();

  let pullRequests: PullRequest[] = [];
  let reviewedCount = 0;
  let issuesCount = 0;

  try {
    const installation = await prisma.githubInstallation.findUnique({
      where: { userId: user.id },
    });

    if (installation) {
      pullRequests = await prisma.pullRequest.findMany({
        where: { installationId: installation.installationId },
        orderBy: { updatedAt: "desc" },
      });
    }

    reviewedCount = pullRequests.filter((pr) => pr.status === "reviewed").length;
    issuesCount = pullRequests.reduce((acc, pr) => {
      if (!pr.reviewComment) return acc;
      const lines = pr.reviewComment.split("\n");
      const issues = lines.filter(
        (line: string) =>
          line.trim().startsWith("-") ||
          line.trim().startsWith("*") ||
          /^\d+\./.test(line.trim())
      ).length;
      return acc + issues;
    }, 0);
  } catch (error) {
    console.error("Failed to query database for pull requests. Database schema might not be synced:", error);
  }

  const latestReviews = pullRequests.slice(0, LATEST_REVIEWS_LIMIT);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Welcome back, {user.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {user.email}
        </p>
        {github.profile ? (
          <p className="text-sm text-muted-foreground">
            GitHub: @{github.profile.login}
          </p>
        ) : null}
      </div>

      {/* Quick stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Repositories", value: String(github.repos.length) },
          { label: "Pull requests reviewed", value: String(reviewedCount) },
          { label: "Issues surfaced", value: String(issuesCount) },
        ].map((stat) => (
          <Card key={stat.label} size="sm">
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Empty state / next step */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            {github.repos.length > 0 ? "Recent repositories" : "Connect a repository"}
          </CardTitle>
          <CardDescription>
            {github.error
              ? "GitHub data could not be loaded with the current authorization."
              : "MG7 will review every new pull request and post feedback directly on the diff."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {github.error ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">{github.error}</p>
              <p className="text-sm text-muted-foreground">
                Sign out, then sign in with GitHub again to approve repository
                access.
              </p>
            </div>
          ) : github.repos.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {github.repos.map((repo) => (
                <a
                  key={repo.id}
                  href={repo.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-border p-4 transition-colors hover:bg-muted/60"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{repo.full_name}</span>
                    <span className="rounded-sm bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {repo.private ? "Private" : "Public"}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <Button size="lg" render={<Link href={ROUTES.dashboardGithub} />}>
              <GithubLogoIcon weight="fill" className="size-4" />
              Connect GitHub repository
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Compact preview of the newest reviews — full list lives on /dashboard/reviews. */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Latest reviews</CardTitle>
          <CardDescription>
            The most recent pull requests reviewed by MG7.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {latestReviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
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
            </div>
          ) : (
            <>
              <div className="divide-y divide-border/60">
                {latestReviews.map((pr) => (
                  <Link
                    key={pr.id}
                    href={ROUTES.dashboardReviews}
                    className="group flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <GitPullRequestIcon className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium transition-colors group-hover:text-primary">
                          {pr.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {pr.repoFullName} #{pr.prNumber}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className={statusBadge(toneFor(pr.status))}>
                        {pr.status}
                      </span>
                      <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
                        {formatDistanceToNow(
                          new Date(pr.reviewedAt ?? pr.updatedAt),
                          { addSuffix: true },
                        )}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <Button
                className="mt-4"
                variant="ghost"
                size="sm"
                render={<Link href={ROUTES.dashboardReviews} />}
              >
                View all reviews
                <ArrowRightIcon className="size-4" />
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
