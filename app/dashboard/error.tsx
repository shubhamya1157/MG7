"use client";

/**
 * Error boundary for the /dashboard segment. Next.js renders this in place of
 * the page when a Server Component under it throws; `reset()` re-attempts the
 * render, which is usually all a transient DB/GitHub hiccup needs.
 */

import { useEffect } from "react";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard segment error:", error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-500">
              <WarningCircleIcon className="size-5" />
            </span>
            <div>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>
                This part of the dashboard failed to load. It&apos;s usually
                temporary.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={reset}>
            Try again
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
