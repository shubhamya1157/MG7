"use client";

/**
 * SignOutButton
 * -------------
 * Ends the current better-auth session and returns the user to the landing
 * page. Rendered on the protected `/dashboard` page.
 *
 * Comment convention:
 *   [DOCS]  → taken from the better-auth docs.
 *   [LOGIC] → my own product logic (state, redirect, error handling).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignOut } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
// [DOCS] `signOut` is re-exported from our auth client (lib/auth-client.ts).
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  // [LOGIC] Guard against double-clicks while the sign-out request is in flight.
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    try {
      // [DOCS] Clears the session cookie on the server. We pass fetch options
      // so we can hook the redirect into the request's success callback.
      await signOut({
        fetchOptions: {
          // [LOGIC] Only navigate once the cookie is actually cleared, so the
          // landing page never briefly renders in a "still logged in" state.
          onSuccess: () => {
            router.push("/");
            // Ensure any Server Component that read the session re-runs.
            router.refresh();
          },
        },
      });
    } catch (error) {
      // [LOGIC] Re-enable and inform the user if the request failed.
      console.error("Sign-out failed:", error);
      toast.error("Could not sign out. Please try again.");
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleSignOut}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? <Spinner /> : <SignOut weight="bold" className="size-4" />}
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
