/**
 * Small, reusable styling helpers for status "pills" and status-tinted buttons.
 *
 * Centralising the tone→class mapping keeps semantic colours (success/danger/…)
 * consistent everywhere a connection/health state is shown, and means a palette
 * tweak happens in exactly one file.
 */

import { cn } from "@/lib/utils";

/** Border + background + text colours for inline status badges, keyed by tone. */
export const statusBadgeClass = {
  success:
    "border-emerald-500/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  warning:
    "border-amber-500/40 bg-amber-500/12 text-amber-700 dark:text-amber-400",
  danger: "border-red-500/40 bg-red-500/12 text-red-700 dark:text-red-400",
  info: "border-sky-500/40 bg-sky-500/12 text-sky-700 dark:text-sky-400",
  neutral: "border-border bg-muted text-muted-foreground",
} as const;

/** Extra classes layered onto <Button> for status-tinted primary actions. */
export const statusButtonClass = {
  success:
    "bg-emerald-600 text-white hover:bg-emerald-600/90 focus-visible:ring-emerald-500/30",
  danger:
    "border-red-500/40 bg-red-500/10 text-red-700 hover:bg-red-500/20 dark:text-red-400",
} as const;

/**
 * Build the className for a small status badge pill.
 *
 * @param tone - Semantic colour (one of `statusBadgeClass`' keys).
 * @param className - Optional extras (e.g. `gap-1.5` when the pill holds an icon).
 */
export function statusBadge(
  tone: keyof typeof statusBadgeClass,
  className?: string,
) {
  return cn(
    // Rounded to match the app's `rounded-*` language rather than square chips.
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
    statusBadgeClass[tone],
    className,
  );
}
