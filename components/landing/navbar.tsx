import Link from "next/link";
import { GitPullRequestIcon } from "@phosphor-icons/react/dist/ssr";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";


const NAV_LINKS = [
 { href: "#how", label: "How it works" }, 
  { href: "#features", label: "Features" },
 
  { href: "#cta", label: "Get started" },
];


export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-2 pt-2">
      <nav className="glass flex w-full max-w-5xl items-center justify-between gap-4 rounded-2xl border border-border/60 px-4 py-2.5 shadow-lg shadow-black/5 ">
     

        <Link href="/" className="group flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary transition-colors group-hover:bg-primary/25">
            <GitPullRequestIcon className="size-8" weight="bold"/>
          </span>
          <span className="font-heading text-lg font-bold tracking-tight uppercase">mg7</span>
        </Link>


        <ul className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>


        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link href={ROUTES.signIn} className={cn(buttonVariants())}>
            Sign in
          </Link>
        </div>
      </nav>
    </header>
  );
}
