"use client";

/**
 * NavUser — the sidebar-footer user menu.
 *
 * Shows the signed-in user's avatar/name/email and a dropdown with the two
 * session actions that used to live as standalone header buttons:
 *   - Refresh session — re-validates against the server, bypassing the
 *     5-minute signed cookie cache (`disableCookieCache: true`).
 *   - Sign out — clears the better-auth session, then navigates home only
 *     once the cookie is actually gone (no "still logged in" flash).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowsClockwiseIcon,
  CaretUpDownIcon,
  SignOutIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import { authClient, signOut } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export type SidebarUser = {
  name: string;
  email: string;
  image: string | null;
};

/** Two-letter fallback initials from a display name (e.g. "Ada Lovelace" → "AL"). */
function initialsFrom(name: string): string {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export function NavUser({ user }: { user: SidebarUser }) {
  const router = useRouter();
  const { isMobile } = useSidebar();
  // One pending flag per action so the menu can't double-fire either of them.
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const initials = initialsFrom(user.name);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      // Force a full server/DB re-validation instead of trusting the signed
      // short-lived cookie cache, then re-run the Server Components.
      await authClient.getSession({ query: { disableCookieCache: true } });
      router.refresh();
      toast.success("Session refreshed.");
    } catch (error) {
      console.error("Session refresh failed:", error);
      toast.error("Could not refresh the session. Please try again.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut({
        fetchOptions: {
          // Only navigate once the cookie is actually cleared, so the landing
          // page never briefly renders in a "still logged in" state.
          onSuccess: () => {
            router.push("/");
            router.refresh();
          },
        },
      });
    } catch (error) {
      console.error("Sign-out failed:", error);
      toast.error("Could not sign out. Please try again.");
      setSigningOut(false);
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar size="sm">
              {user.image ? (
                <AvatarImage src={user.image} alt={user.name} />
              ) : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>
            <CaretUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
            className="min-w-56 rounded-lg"
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar size="sm">
                  {user.image ? (
                    <AvatarImage src={user.image} alt={user.name} />
                  ) : null}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={refreshing}
              closeOnClick={false}
              onClick={handleRefresh}
            >
              <ArrowsClockwiseIcon
                className={refreshing ? "animate-spin" : undefined}
              />
              {refreshing ? "Refreshing…" : "Refresh session"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={signingOut}
              closeOnClick={false}
              onClick={handleSignOut}
            >
              <SignOutIcon weight="bold" />
              {signingOut ? "Signing out…" : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
