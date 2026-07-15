/**
 * Types for the GitHub App connection surface.
 *
 * Kept in one place so the server (which produces the status) and the client
 * card (which renders it) share a single, authoritative shape.
 */

/**
 * Whether the current user has installed the GitHub App, and where.
 *
 * This is a *projection* of our `github_installation` row — deliberately not the
 * raw Prisma model — so the client card never sees fields it shouldn't
 * (installation id, timestamps as Date objects, etc.).
 *
 *   - `connected`    → is there an installation row for this user at all?
 *   - `accountLogin` → the GitHub username / org the app was installed on.
 *   - `installedAt`  → ISO string (serialisable across the server→client bound).
 */
export type GithubInstallationStatus = {
  connected: boolean;
  accountLogin: string | null;
  installedAt: string | null;
};
