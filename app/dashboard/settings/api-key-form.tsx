"use client";

/**
 * BYOK form — save or remove the user's own OpenRouter API key.
 *
 * Client component for the pending states and toasts; the actual work happens
 * in the server actions (which re-check the session and do the encryption).
 * The raw key never renders back — only the stored last4 is shown.
 */

import { useState, useTransition } from "react";
import { KeyIcon, TrashIcon } from "@phosphor-icons/react";
import { toast } from "sonner";

import {
  removeOpenrouterKey,
  saveOpenrouterKey,
} from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ApiKeyForm({ keyLast4 }: { keyLast4: string | null }) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState("");

  const handleSave = (formData: FormData) => {
    startTransition(async () => {
      const result = await saveOpenrouterKey(formData);
      if (result.ok) {
        toast.success(result.message);
        setValue("");
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeOpenrouterKey();
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="space-y-4">
      {keyLast4 ? (
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
              <KeyIcon className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium">Your key is active</p>
              <p className="font-mono text-xs text-muted-foreground">
                sk-or-…{keyLast4}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={handleRemove}
          >
            <TrashIcon className="size-4" />
            Remove
          </Button>
        </div>
      ) : null}

      <form action={handleSave} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="apiKey">
            {keyLast4 ? "Replace key" : "OpenRouter API key"}
          </Label>
          <Input
            id="apiKey"
            name="apiKey"
            type="password"
            placeholder="sk-or-v1-…"
            autoComplete="off"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Stored encrypted (AES-256-GCM). Create one at{" "}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline underline-offset-4"
            >
              openrouter.ai/keys
            </a>
            .
          </p>
        </div>
        <Button type="submit" disabled={pending || value.trim().length === 0}>
          {pending ? "Saving…" : "Save key"}
        </Button>
      </form>
    </div>
  );
}
