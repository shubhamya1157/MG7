import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "@/lib/db";
import { serverEnv } from "@/lib/env";

/**
 * better-auth server instance. This is the single source of truth for
 * authentication and is consumed by:
 *   - the catch-all route handler (app/api/auth/[...all]/route.ts)
 *   - server-side session reads (lib/get-session.ts)
 *
 * Every value here comes from the validated `serverEnv` module, so a missing
 * secret fails at startup rather than silently degrading security.
 */
export const auth = betterAuth({
  // Explicit rather than relying on better-auth's implicit process.env reads —
  // both are validated in one place (lib/env.ts).
  baseURL: serverEnv.BETTER_AUTH_URL,
  secret: serverEnv.BETTER_AUTH_SECRET,

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Only requests originating from our own URL may drive auth state changes and
  // receive OAuth callback redirects. This is the CSRF / open-redirect guard:
  // without it, a malicious site could point the callback at itself.
  trustedOrigins: [serverEnv.BETTER_AUTH_URL],

  socialProviders: {
    github: {
      clientId: serverEnv.GITHUB_CLIENT_ID,
      clientSecret: serverEnv.GITHUB_CLIENT_SECRET,
      scope: ["repo"],
      mapProfileToUser: async (profile) => ({
        email: profile.email ?? `${profile.id}@user.noreply.github.com`,
        name: profile.name ?? profile.login,
      }),
    },
  },

  // Session lifecycle — makes refresh "rolling" and cheap.
  session: {
    // Absolute lifetime of a session before the user must sign in again.
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    // Rolling refresh: whenever a session is read and it's older than
    // `updateAge`, better-auth extends its expiry. So an active user is never
    // logged out mid-use, while an idle one still ages out.
    updateAge: 60 * 60 * 24, // refresh at most once per day
    // Signed cookie cache: the session is verified from a short-lived cookie
    // instead of a DB round-trip on every request. This is the main
    // "smoothness" win — server reads stay fast and don't churn the DB.
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes, then fall back to a DB read
    },
  },

  advanced: {
    // Force the `Secure` cookie flag in production so the session token is only
    // ever sent over HTTPS. better-auth already sets HttpOnly and SameSite=Lax
    // by default; this closes the transport-security gap.
    useSecureCookies: serverEnv.isProduction,
  },

  // `nextCookies()` bridges better-auth's Set-Cookie handling into Next's
  // cookie API so cookies set during server actions / route handlers persist
  // correctly. Per the docs it must be the LAST plugin in the array.
  plugins: [nextCookies()],
});
