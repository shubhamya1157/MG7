"use client";

/**
 * ReviewsAutoRefresh — keeps the Reviews page live while Inngest works.
 *
 * The review pipeline runs out-of-band (webhook → Inngest → DB), so the page
 * has no push channel to learn about status changes. While any PR is still
 * `pending`/`processing` we poll `router.refresh()` on an interval — the
 * Server Component re-queries the DB and the list updates in place. As soon
 * as nothing is in flight the effect tears down and polling stops.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 5_000;

export function ReviewsAutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) {
      return;
    }

    const id = setInterval(() => {
      router.refresh();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [active, router]);

  return null;
}
