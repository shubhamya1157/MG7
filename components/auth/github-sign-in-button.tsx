"use client";

/**
 * GitHubSignInButton
 * ------------------
 * The single, reusable "Continue with GitHub" button used across the landing
 * page (navbar, hero, closing CTA). It kicks off better-auth's GitHub OAuth
 * flow and, when the user returns, drops them on `/dashboard`.
 *
 * Comment convention used throughout this file:
 *   [DOCS]  → line/pattern taken (near-)verbatim from the better-auth docs.
 *   [LOGIC] → my own product logic (state, UX, error handling, styling).
 *
 * Why a Client Component: OAuth is triggered by a user click and performs a
 * browser redirect, so it must run on the client (`"use client"` above).
 */

import { useState } from "react";
import { GithubLogo } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
// [DOCS] `signIn.social(...)` is the documented entry point for social OAuth.
// We call it through our thin wrapper `signInWithGitHub` (see lib/auth-client.ts)
// so the provider name and default callback live in exactly one place.
import { signInWithGitHub } from "@/lib/auth-client";

/**
 * [LOGIC] Public props. We only expose the two knobs the landing page needs:
 * the visual size (nav uses the compact default, hero/CTA use `lg`) and the
 * label text. Everything else is fixed so every instance behaves identically.
 */
type GitHubSignInButtonProps = {
  size?: "default" | "lg";
  label?: string;
  className?: string;
  /**
   * Where GitHub returns the user after a successful sign-in. Defaults to the
   * post-login dashboard (see `signInWithGitHub`). The sign-in page passes the
   * original `?redirect=` target here so deep links survive the OAuth round-trip.
   */
  callbackURL?: string;
};

export function GitHubSignInButton({
  size = "default",
  label = "Continue with GitHub",
  className,
  callbackURL,
}: GitHubSignInButtonProps) {
  // [LOGIC] `pending` disables the button and swaps the icon for a spinner
  // between the click and the browser actually navigating away to GitHub.
  // Without it, an impatient user can fire several OAuth redirects in a row.
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      // [DOCS] This performs the OAuth handshake and redirects the browser to
      // GitHub. On success it never resolves here — the page unloads — so any
      // code after it only runs on failure.
      await signInWithGitHub(callbackURL);
    } catch (error) {
      // [LOGIC] If better-auth couldn't even start the redirect (network down,
      // misconfigured client id, etc.) we re-enable the button and surface a
      // toast instead of leaving the user stuck on a dead spinner.
      console.error("GitHub sign-in failed:", error);
      toast.error("Could not start GitHub sign-in. Please try again.");
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      size={size}
      onClick={handleClick}
      disabled={pending}
      aria-busy={pending}
      className={className}
    >
      {/* [LOGIC] Show a spinner while redirecting, the GitHub mark otherwise. */}
      {pending ? (
        <Spinner />
      ) : (
        <GithubLogo weight="fill" className="size-4" />
      )}
      {pending ? "Redirecting…" : label}
    </Button>
  );
}
