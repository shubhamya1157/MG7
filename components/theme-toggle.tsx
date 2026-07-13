"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

/**
 * Light/dark theme switch backed by next-themes.
 *
 * We wait for mount before rendering the icon to avoid a hydration mismatch
 * (the server doesn't know the resolved theme).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Flip a one-time "mounted" flag after hydration so the icon only renders
  // once the resolved theme is known client-side (canonical next-themes
  // pattern). The set-state-in-effect rule doesn't apply to mount detection.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {/* Render a neutral placeholder until we know the theme client-side. */}
      {!mounted ? (
        <span className="size-4" />
      ) : isDark ? (
        <Sun className="size-4" weight="fill" />
      ) : (
        <Moon className="size-4" weight="fill" />
      )}
    </Button>
  );
}
