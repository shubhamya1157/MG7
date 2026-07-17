/**
 * /dashboard/settings — API key (BYOK) and usage.
 *
 * Free tier: FREE_MONTHLY_REVIEW_LIMIT reviews per calendar month on the app's
 * OpenRouter key. Users who add their own key are unmetered — their reviews
 * bill to their own OpenRouter account. Only the key's last 4 characters ever
 * reach the client.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/db";
import { ROUTES } from "@/lib/routes";
import {
  FREE_MONTHLY_REVIEW_LIMIT,
  getMonthlyReviewCount,
} from "@/app/dashboard/settings/server/usage";
import { ApiKeyForm } from "@/app/dashboard/settings/api-key-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";

export const metadata: Metadata = {
  title: "Settings · MG7",
  description: "API key and usage settings.",
};

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect(ROUTES.signIn);
  }
  const userId = session.user.id;

  const [settings, usedThisMonth] = await Promise.all([
    prisma.userSettings.findUnique({
      where: { userId },
      select: { openrouterKeyLast4: true },
    }),
    getMonthlyReviewCount(userId),
  ]);

  const hasByok = Boolean(settings?.openrouterKeyLast4);
  const usagePct = Math.min(
    100,
    Math.round((usedThisMonth / FREE_MONTHLY_REVIEW_LIMIT) * 100),
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Bring your own OpenRouter key, or stay on the free tier.
        </p>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Monthly usage</CardTitle>
          <CardDescription>
            {hasByok
              ? "You're using your own API key — reviews are unmetered."
              : `Free tier includes ${FREE_MONTHLY_REVIEW_LIMIT} reviews per month.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasByok ? (
            <p className="text-sm text-muted-foreground">
              {usedThisMonth} review{usedThisMonth === 1 ? "" : "s"} completed
              this month, billed to your OpenRouter account.
            </p>
          ) : (
            <Progress value={usagePct}>
              <ProgressLabel>Reviews this month</ProgressLabel>
              {/* Base UI's Value takes a render fn — we ignore the formatted
                  percentage and show the raw used/limit count instead. */}
              <ProgressValue>
                {() => `${usedThisMonth} / ${FREE_MONTHLY_REVIEW_LIMIT}`}
              </ProgressValue>
            </Progress>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Your API key</CardTitle>
          <CardDescription>
            Add your own OpenRouter key to lift the free-tier limit. MG7 uses
            it only to generate reviews of your pull requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApiKeyForm keyLast4={settings?.openrouterKeyLast4 ?? null} />
        </CardContent>
      </Card>
    </main>
  );
}
