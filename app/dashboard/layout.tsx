/**
 * /dashboard layout — the authenticated app shell.
 *
 * Every page under /dashboard renders inside this layout: a collapsible
 * sidebar (navigation + user menu) and a slim sticky header with the sidebar
 * trigger and theme toggle. The session gate here is authoritative — the edge
 * middleware only checks cookie *presence* — so child pages don't need to
 * repeat the redirect (they may still call `getSession()` for user data).
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/get-session";
import { ROUTES } from "@/lib/routes";
import { prisma } from "@/lib/db";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect(ROUTES.signIn);
  }

  const { user } = session;

  // Reviews badge: how many PRs the Inngest pipeline is working on right now.
  // Soft-fail to 0 — a DB hiccup shouldn't take down the whole shell.
  let processingCount = 0;
  try {
    const installation = await prisma.githubInstallation.findUnique({
      where: { userId: user.id },
      select: { installationId: true },
    });
    if (installation) {
      processingCount = await prisma.pullRequest.count({
        where: {
          installationId: installation.installationId,
          status: { in: ["pending", "processing"] },
        },
      });
    }
  } catch (error) {
    console.error("Failed to count in-flight reviews for sidebar badge:", error);
  }

  // Restore the user's last sidebar state (the provider writes this cookie on
  // toggle) so the shell doesn't "jump" open on every server render.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        user={{
          name: user.name,
          email: user.email,
          image: user.image ?? null,
        }}
        processingCount={processingCount}
      />
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
