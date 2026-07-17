/**
 * Route-level loading skeleton for /dashboard/reviews/[id] — back link, PR
 * header, then the review card body.
 */

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ReviewDetailLoading() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <Skeleton className="mb-4 h-8 w-28" />

      <div className="flex items-start gap-3">
        <Skeleton className="size-9 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    </main>
  );
}
