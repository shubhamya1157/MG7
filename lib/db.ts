import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "./generated/prisma/client";
import { serverEnv } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // `serverEnv` has already validated DATABASE_URL is present and non-empty.
  const url = serverEnv.DATABASE_URL;

  // `keepAlive` holds the TCP socket open between queries so the OAuth
  // callback's user/account/session writes skip a fresh connect handshake —
  // the main latency win against a serverless Postgres like Neon.
  const pool = new pg.Pool({ connectionString: url, keepAlive: true, max: 10 });

  // Fire-and-forget warmup: open a connection now so the *first* real query
  // (typically the sign-in DB round-trip) isn't the one paying the
  // cold-connect cost. Errors are ignored here; genuine connectivity problems
  // still surface on the real queries.
  pool.query("SELECT 1").catch(() => {});

  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}