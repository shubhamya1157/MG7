"use client";

/**
 * GithubConnectCard
 * -----------------
 * The GitHub App connection panel shown on /dashboard/github. It renders one of
 * two states from a single `installation` status:
 *
 *   - disconnected → an "Install GitHub App" link (out to GitHub) + what access
 *     the app will request.
 *   - connected    → which account it's installed on + a "Disconnect" form.
 *
 * Comment convention (matches the sign-in button):
 *   [LOGIC] → product/UX logic that's mine to own.
 *
 * Why a Client Component: the disconnect button submits a Server Action and the
 * install action is an outbound link click. `installUrl` is computed on the
 * server (it needs the app name from `serverEnv`) and passed in as a prop, so
 * this file never imports server-only env.
 */

import { useState } from "react";
import {
  ArrowSquareOut,
  GithubLogo,
  Plugs,
} from "@phosphor-icons/react";

import type { GithubInstallationStatus } from "@/app/dashboard/github/types";
import { statusBadge, statusButtonClass } from "@/lib/status-style";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { disconnectGithubApp } from "@/app/dashboard/github/actions";

type GithubConnectCardProps = {
  installation: GithubInstallationStatus;
  /** Prebuilt GitHub install URL (encodes the user id in `state`). */
  installUrl: string;
};

/** [LOGIC] Human-readable "installed 3 days ago"-ish line, kept dependency-free. */
function formatInstalledAt(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** The connected state: account + a disconnect form wired to the action. */
function ConnectedView({
  accountLogin,
  installedAt,
}: {
  accountLogin: string | null;
  installedAt: string | null;
}) {
  // [LOGIC] `pending` swaps the button for a spinner between submit and the
  // action's redirect so a double-click can't fire two disconnects.
  const [pending, setPending] = useState(false);

  return (
    <>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Installed for{" "}
          <span className="font-medium text-emerald-700 dark:text-emerald-400">
            @{accountLogin ?? "your account"}
          </span>
          . MG7 can read repository metadata and post review comments on pull
          requests.
        </p>
        {installedAt ? (
          <p className="text-xs text-muted-foreground">
            Connected on {installedAt}.
          </p>
        ) : null}
      </CardContent>
      <CardFooter>
        <form action={disconnectGithubApp} onSubmit={() => setPending(true)}>
          <Button
            type="submit"
            variant="outline"
            disabled={pending}
            aria-busy={pending}
            className={statusButtonClass.danger}
          >
            {pending ? <Spinner /> : <Plugs />}
            {pending ? "Disconnecting…" : "Disconnect GitHub App"}
          </Button>
        </form>
      </CardFooter>
    </>
  );
}

/** The disconnected state: what the app needs + the outbound install link. */
function DisconnectedView({ installUrl }: { installUrl: string }) {
  return (
    <>
      <CardContent>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {[
            "Access the public and private repositories you select",
            "Receive webhooks for pull request events",
            "Post AI-generated review comments on your PRs",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/50" />
              {line}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        {/* [LOGIC] base-ui Button rendered as an anchor via `render` — it's an
            outbound navigation to GitHub, not an in-app action. */}
        <Button
          render={<a href={installUrl} />}
          className={statusButtonClass.success}
        >
          <GithubLogo weight="fill" />
          Install GitHub App
          <ArrowSquareOut className="opacity-80" />
        </Button>
      </CardFooter>
    </>
  );
}

export function GithubConnectCard({
  installation,
  installUrl,
}: GithubConnectCardProps) {
  const { connected, accountLogin, installedAt } = installation;

  return (
    <Card
      className={cn(
        "max-w-2xl transition-colors",
        connected ? "border-emerald-500/30" : "border-border",
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "grid size-10 place-items-center rounded-xl border",
                connected
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-border bg-muted text-muted-foreground",
              )}
            >
              <GithubLogo className="size-5" weight="fill" />
            </span>
            <div>
              <CardTitle>GitHub App</CardTitle>
              <CardDescription>
                Install the MG7 reviewer on your account or organization to give
                it access to the repositories you choose.
              </CardDescription>
            </div>
          </div>
          <span className={statusBadge(connected ? "success" : "neutral")}>
            {connected ? "Connected" : "Not connected"}
          </span>
        </div>
      </CardHeader>

      {connected ? (
        <ConnectedView accountLogin={accountLogin} installedAt={formatInstalledAt(installedAt)} />
      ) : (
        <DisconnectedView installUrl={installUrl} />
      )}
    </Card>
  );
}
