"use client";

/**
 * SessionRefreshButton
 * --------------------
 * A manual "Refresh session" control for the protected `/dashboard` page. On click
 * it re-reads the current session straight from the server (bypassing the
 * short-lived cookie cache) and re-renders the page with the fresh data, while
 * the icon spins for the duration.
 *
 * Comment convention:
 *   [DOCS]  → taken from the better-auth / Next.js docs.
 *   [LOGIC] → my own product logic (state, spin animation, refresh flow).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";

export function SessionRefreshButton() {
  const router = useRouter();
  // [LOGIC] Drives both the disabled state and the spinning icon so the button
  // can't be double-fired while a refresh is already in flight.
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      // [DOCS] Ask better-auth for the session again. `disableCookieCache: true`
      // is the documented flag that forces a full server/DB re-validation
      // instead of trusting the signed 5-minute cookie cache — so this really
      // refreshes rather than reading a stale copy.
      await authClient.getSession({ query: { disableCookieCache: true } });

      // [LOGIC] `/dashboard` is a Server Component that reads the session on the
      // server. `router.refresh()` re-runs it so any updated user data is
      // repainted without a full-page reload.
      router.refresh();
      toast.success("Session refreshed");
    } catch (error) {
      // [LOGIC] Surface failures instead of silently leaving a spinning icon.
      console.error("Session refresh failed:", error);
      toast.error("Could not refresh session. Please try again.");
    } finally {
      // [LOGIC] Always stop the spinner, success or failure.
      setRefreshing(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleRefresh}
      disabled={refreshing}
      aria-busy={refreshing}
    >
      {/* [LOGIC] Same icon throughout; Tailwind's `animate-spin` only while
          the request is running gives the "refreshing" motion. */}
      <ArrowsClockwise
        weight="bold"
        className={cn("size-4", refreshing && "animate-spin")}
      />
      {refreshing ? "Refreshing…" : "Refresh session"}
    </Button>
  );
}
