import { redirect } from "next/navigation";

import { getSession } from "@/lib/get-session";
import { ROUTES } from "@/lib/routes";
import { Backdrop } from "@/components/landing/backdrop";
import { SignInCard } from "@/components/auth/sign-in-card";

/**
 * Only allow same-origin path redirects ("/dashboard", "/api/github/callback?…").
 * Anything absent, absolute ("https://evil.com") or protocol-relative ("//evil.com")
 * falls back to the dashboard — this is both the open-redirect guard and the
 * "no ?redirect= param" default.
 */
function safeRedirect(raw?: string | string[]): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (
    value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\")
  ) {
    return value;
  }
  return ROUTES.dashboard;
}

function firstParam(raw?: string | string[]): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    redirect?: string | string[];
    error?: string | string[];
  }>;
}) {
  const { redirect: redirectParam, error } = await searchParams;
  const target = safeRedirect(redirectParam);

  // Already signed in? Skip the page entirely and go where they were headed.
  const session = await getSession();
  if (session) {
    redirect(target);
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <Backdrop />
      <SignInCard callbackURL={target} errorCode={firstParam(error)} />
    </main>
  );
}
