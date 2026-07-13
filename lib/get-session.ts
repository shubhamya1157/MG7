import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Read the current session on the server (Server Components, Route Handlers,
 * Server Actions). Returns `null` when the visitor is not authenticated.
 *
 * Usage:
 *   const session = await getSession();
 *   if (!session) redirect("/");
 */
export async function getSession() {
  return auth.api.getSession({
    // `headers()` carries the auth cookies that better-auth needs to
    // resolve the session for the current request.
    headers: await headers(),
  });
}
