"use client";

/**
 * AppSidebar — the /dashboard navigation rail.
 *
 * Client component: active-link highlighting needs `usePathname()`. Everything
 * user-specific (name/email/avatar, in-flight review count) is computed by the
 * server layout and passed down as plain props.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BooksIcon,
  GitPullRequestIcon,
  GithubLogoIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";

import { ROUTES } from "@/lib/routes";
import { NavUser, type SidebarUser } from "@/components/dashboard/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { title: "Overview", href: ROUTES.dashboard, icon: SquaresFourIcon },
  { title: "Reviews", href: ROUTES.dashboardReviews, icon: GitPullRequestIcon },
  {
    title: "Repositories",
    href: ROUTES.dashboardRepositories,
    icon: BooksIcon,
  },
  { title: "GitHub App", href: ROUTES.dashboardGithub, icon: GithubLogoIcon },
] as const;

/**
 * "/dashboard" must match exactly (it's a prefix of every other item);
 * subsections highlight on prefix so nested pages keep their parent lit.
 */
function isActiveRoute(pathname: string, href: string): boolean {
  if (href === ROUTES.dashboard) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({
  user,
  processingCount,
}: {
  user: SidebarUser;
  processingCount: number;
}) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href={ROUTES.dashboard} />}>
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                <GitPullRequestIcon weight="bold" className="size-5" />
              </span>
              <span className="font-heading text-lg font-bold uppercase tracking-tight">
                mg7
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={isActiveRoute(pathname, item.href)}
                    render={<Link href={item.href} />}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                  {/* Live count of PRs the Inngest pipeline is reviewing. */}
                  {item.href === ROUTES.dashboardReviews &&
                  processingCount > 0 ? (
                    <SidebarMenuBadge className="rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      {processingCount}
                    </SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
