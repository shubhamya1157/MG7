if (typeof window !== "undefined") {
  throw new Error(
    "lib/env.ts is server-only and must not be imported from client code.",
  );
}

type RawEnv = Record<string, string | undefined>;

/** Require a non-empty value; records an error instead of throwing per-var. */
function requireVar(raw: RawEnv, key: string, errors: string[]): string {
  const value = raw[key]?.trim();
  if (!value) {
    errors.push(`  - ${key} is missing or empty`);
    return "";
  }
  return value;
}

/** Require a non-empty value that also looks like an absolute http(s) URL. */
function requireUrl(raw: RawEnv, key: string, errors: string[]): string {
  const value = requireVar(raw, key, errors);
  if (value && !/^https?:\/\//i.test(value)) {
    errors.push(`  - ${key} must be an absolute http(s) URL (got "${value}")`);
  }
  return value;
}

function loadServerEnv() {
  const raw = process.env as RawEnv;
  const errors: string[] = [];

  const env = {
    DATABASE_URL: requireVar(raw, "DATABASE_URL", errors),
    BETTER_AUTH_SECRET: requireVar(raw, "BETTER_AUTH_SECRET", errors),
    BETTER_AUTH_URL: requireUrl(raw, "BETTER_AUTH_URL", errors),
    GITHUB_CLIENT_ID: requireVar(raw, "GITHUB_CLIENT_ID", errors),
    GITHUB_CLIENT_SECRET: requireVar(raw, "GITHUB_CLIENT_SECRET", errors),

    // GitHub *App* credentials (distinct from the OAuth app above). These drive
    // the installation flow: the App can be installed on repos/orgs and act on
    // its own behalf via short-lived installation tokens.
    GITHUB_APP_ID: requireVar(raw, "GITHUB_APP_ID", errors),
    // The app's URL slug — used to build the install URL
    // (github.com/apps/<name>/installations/new).
    GITHUB_APP_NAME: requireVar(raw, "GITHUB_APP_NAME", errors),
    // PEM private key. Stored single-line with literal "\n" escapes in .env, so
    // the util that consumes it un-escapes them back into real newlines.
    GITHUB_APP_PRIVATE_KEY: requireVar(raw, "GITHUB_APP_PRIVATE_KEY", errors),

    // Shared secret GitHub signs webhook deliveries with. Optional so the app
    // still boots without it, but the webhook route (app/api/github/webhook)
    // refuses to process events until it's set — an unverified webhook must
    // never touch the DB. `getGithubApp` also only wires up webhook crypto when
    // this is present.
    GITHUB_WEBHOOK_SECRET: raw.GITHUB_WEBHOOK_SECRET?.trim() || undefined,

    // Inngest background-jobs credentials. Optional in local dev — the Inngest
    // dev server needs neither — and only required once deployed. Left undefined
    // rather than required so `next dev` + `npx inngest-cli dev` just work.
    INNGEST_EVENT_KEY: raw.INNGEST_EVENT_KEY?.trim() || undefined,
    INNGEST_SIGNING_KEY: raw.INNGEST_SIGNING_KEY?.trim() || undefined,

    isProduction: raw.NODE_ENV === "production",
  } as const;

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${errors.join("\n")}\n` +
        `See .env.example for the full list of required variables.`,
    );
  }

  return env;
}

/** Validated, typed server environment. Access throws if anything is missing. */
export const serverEnv = loadServerEnv();
export type ServerEnv = typeof serverEnv;
