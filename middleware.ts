import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

import { ROUTES } from "@/lib/routes";

/**
 * Edge middleware — an *optimistic* auth gate.
 *
 * It only checks for the presence of the session cookie (no DB call, no crypto
 * verification), which keeps it fast enough to run on every matched request.
 * This is defense-in-depth and a nicer UX (unauthenticated users are bounced
 * before the protected page renders). The authoritative check still happens in
 * each protected Server Component via `getSession()` — never trust this alone.
 */
export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    // Preserve where the user was headed so we can send them back after login.
    const signInUrl = new URL(ROUTES.signIn, request.url);
    signInUrl.searchParams.set(
      "redirect",
      request.nextUrl.pathname + request.nextUrl.search,
    );
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Protect the authenticated area. Add more prefixes here as the app grows.
  matcher: ["/dashboard/:path*"],
};
