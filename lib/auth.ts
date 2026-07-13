import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
// If your Prisma file is located elsewhere, you can change the path
// import { PrismaClient } from "@/lib/generated/prisma/client";

import {prisma } from "@/lib/db";



// const prisma = new PrismaClient(p);
export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql"
    }),

    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID as string,
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      },
    },

    // Session lifecycle — makes refresh "rolling" and cheap.
    session: {
        // Absolute lifetime of a session before the user must sign in again.
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        // Rolling refresh: whenever a session is read and it's older than
        // `updateAge`, better-auth extends its expiry. So an active user is
        // never logged out mid-use, while an idle one still ages out.
        updateAge: 60 * 60 * 24, // refresh at most once per day
        // Signed cookie cache: the session is verified from a short-lived
        // cookie instead of a DB round-trip on every request. This is the
        // main "smoothness" win — server reads stay fast and don't churn.
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60, // 5 minutes, then fall back to a DB read
        },
    },
});