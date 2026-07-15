/**
 * /dashboard/repositories — the repositories visible to the signed-in user.
 *
 * Read-only for now: cards link out to GitHub. The list comes from the user's
 * OAuth token via `getGitHubConnection()` (most recently updated first); which
 * repos MG7 actually *reviews* is governed by the GitHub App installation,
 * managed on /dashboard/github.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { BooksIcon, GithubLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { formatDistanceToNow } from "date-fns";

import { getGitHubConnection } from "@/lib/github";
import { ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Repositories · MG7",
  description: "Repositories connected to your GitHub account.",
};

export default async function RepositoriesPage() {
  const github = await getGitHubConnection();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Repositories
        </h1>
        <p className="text-sm text-muted-foreground">
          {github.profile
            ? `Repositories visible to @${github.profile.login}.`
            : "Repositories visible to your GitHub account."}
        </p>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>
            {github.repos.length > 0 ? "Your repositories" : "No repositories"}
          </CardTitle>
          <CardDescription>
            {github.error
              ? "GitHub data could not be loaded with the current authorization."
              : "MG7 reviews pull requests on repositories covered by the GitHub App installation."}
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
                    <span className="truncate font-medium">
                      {repo.full_name}
                    </span>
                    <span className="shrink-0 rounded-sm bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {repo.private ? "Private" : "Public"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Updated{" "}
                    {formatDistanceToNow(new Date(repo.updated_at), {
                      addSuffix: true,
                    })}
                  </p>
                </a>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span className="mb-3 grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground">
                <BooksIcon className="size-5" />
              </span>
              <p className="text-sm font-medium text-foreground">
                No repositories found
              </p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Install the MG7 GitHub App and grant it access to the
                repositories you want reviewed.
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
          )}
        </CardContent>
      </Card>
    </main>
  );
}
