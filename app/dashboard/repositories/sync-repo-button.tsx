"use client";

/**
 * "Sync" button — indexes a repo's codebase into Pinecone so reviews get
 * RAG context. Client component for pending state + toasts; the work happens
 * in the server action and the background Inngest job.
 *
 * The status shown is the RepoSync row at page render; it moves through
 * pending → syncing → synced in the background, so after triggering we show
 * "Syncing…" optimistically and the true state appears on next page load.
 */

import { useState, useTransition } from "react";
import { ArrowsClockwiseIcon, CheckIcon } from "@phosphor-icons/react";
import { toast } from "sonner";

import { syncRepoCodebase } from "@/app/dashboard/repositories/actions";
import { Button } from "@/components/ui/button";

type SyncRepoButtonProps = {
  repoFullName: string;
  branch: string;
  /** RepoSync.status at render time, or null if never synced. */
  syncStatus: string | null;
};

export function SyncRepoButton({
  repoFullName,
  branch,
  syncStatus,
}: SyncRepoButtonProps) {
  const [pending, startTransition] = useTransition();
  const [triggered, setTriggered] = useState(false);

  const syncing =
    pending || triggered || syncStatus === "pending" || syncStatus === "syncing";

  const handleSync = () => {
    startTransition(async () => {
      const result = await syncRepoCodebase(repoFullName, branch);
      if (result.ok) {
        toast.success(result.message);
        setTriggered(true);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={syncing}
      onClick={handleSync}
    >
      {syncStatus === "synced" && !syncing ? (
        <CheckIcon className="size-3.5" />
      ) : (
        <ArrowsClockwiseIcon
          className={syncing ? "size-3.5 animate-spin" : "size-3.5"}
        />
      )}
      {syncing ? "Syncing…" : syncStatus === "synced" ? "Re-sync" : "Sync"}
    </Button>
  );
}
