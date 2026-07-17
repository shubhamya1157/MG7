"use client";

/**
 * Overview charts — activity over the last 30 days and PR status breakdown.
 *
 * Client component (recharts renders to the DOM); all data is computed
 * server-side in the dashboard page and passed as plain props. Colors:
 * activity uses a single blue series (validated for light+dark surfaces);
 * the breakdown reuses the app's status palette so bars match the status
 * badges shown everywhere else — with the status name as a visible axis
 * label, never color alone.
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type ActivityPoint = {
  /** Day key, e.g. "2026-07-16" — stable for tooltips. */
  date: string;
  /** Short label rendered on the axis, e.g. "16 Jul". */
  label: string;
  reviews: number;
};

export type StatusSlice = {
  status: string;
  count: number;
};

const activityConfig = {
  reviews: {
    label: "Reviews",
    // Same blue stepped per surface — dark is selected, not auto-flipped.
    theme: { light: "#2a78d6", dark: "#3987e5" },
  },
} satisfies ChartConfig;

/** Status → bar color, matching the badge tones used across the dashboard. */
const statusColor: Record<string, string> = {
  reviewed: "var(--color-status-reviewed)",
  processing: "var(--color-status-processing)",
  pending: "var(--color-status-pending)",
  failed: "var(--color-status-failed)",
  closed: "var(--color-status-closed)",
};

const statusConfig = {
  count: { label: "Pull requests" },
  // Palette validated (lightness band, chroma, CVD separation, contrast) for
  // each surface via the dataviz six-checks script — dark steps are selected,
  // not an automatic flip of the light ones.
  "status-reviewed": { label: "Reviewed", theme: { light: "#059669", dark: "#059669" } },
  "status-processing": { label: "Processing", theme: { light: "#b45309", dark: "#d97706" } },
  "status-pending": { label: "Pending", theme: { light: "#6d28d9", dark: "#8b5cf6" } },
  "status-failed": { label: "Failed", theme: { light: "#dc2626", dark: "#ef4444" } },
  "status-closed": { label: "Closed", theme: { light: "#0284c7", dark: "#0284c7" } },
} satisfies ChartConfig;

export function DashboardCharts({
  activity,
  statuses,
}: {
  activity: ActivityPoint[];
  statuses: StatusSlice[];
}) {
  const hasActivity = activity.some((point) => point.reviews > 0);
  const hasStatuses = statuses.length > 0;

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Review activity</CardTitle>
          <CardDescription>
            Pull requests reviewed per day, last 30 days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasActivity ? (
            <ChartContainer config={activityConfig} className="h-56 w-full">
              <BarChart data={activity} margin={{ left: -20, right: 4 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={32}
                />
                <ChartTooltip
                  cursor={{ fillOpacity: 0.35 }}
                  content={<ChartTooltipContent />}
                />
                <Bar
                  dataKey="reviews"
                  fill="var(--color-reviews)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
              No reviews in the last 30 days yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status breakdown</CardTitle>
          <CardDescription>
            Where every tracked pull request stands right now.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasStatuses ? (
            <ChartContainer config={statusConfig} className="h-56 w-full">
              <BarChart
                data={statuses}
                layout="vertical"
                margin={{ left: 8, right: 24 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="status"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
                <ChartTooltip
                  cursor={{ fillOpacity: 0.35 }}
                  content={<ChartTooltipContent nameKey="count" />}
                />
                <Bar
                  dataKey="count"
                  radius={4}
                  maxBarSize={22}
                  label={{ position: "right", fontSize: 11, fill: "currentColor" }}
                >
                  {statuses.map((slice) => (
                    <Cell
                      key={slice.status}
                      fill={
                        statusColor[slice.status] ?? "var(--color-status-pending)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
              No pull requests tracked yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
