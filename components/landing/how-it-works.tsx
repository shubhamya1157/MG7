import {
  PlugsConnectedIcon,
  GitPullRequestIcon,
  RobotIcon,
  GitMergeIcon,
} from "@phosphor-icons/react/dist/ssr";

/**
 * "How it works" — the end-to-end review workflow, four steps.
 *
 * The navbar links here (`#how`). It mirrors the live card in the hero, but in
 * a linear, scannable form: what actually happens from connecting a repo to
 * merging with confidence. Kept data-driven so steps are easy to reorder.
 */

const STEPS = [
  {
    icon: PlugsConnectedIcon,
    step: "01",
    title: "Connect GitHub",
    body: "Sign in with GitHub and pick the repositories MG7 should watch. No config files, no CI wiring — it's live in under a minute.",
  },
  {
    icon: GitPullRequestIcon,
    step: "02",
    title: "Open a pull request",
    body: "Your team works exactly as before. The moment a PR opens or updates, MG7 picks up the diff automatically.",
  },
  {
    icon: RobotIcon,
    step: "03",
    title: "MG7 reviews the diff",
    body: "It scans every changed file, flags bugs, security risks and edge cases, and leaves clear inline comments with a single risk score.",
  },
  {
    icon: GitMergeIcon,
    step: "04",
    title: "Merge with confidence",
    body: "Reviewers focus only where it matters, resolve the flagged issues, and ship — knowing nothing risky slipped through.",
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
      {/* Section heading */}
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-heading text-sm font-semibold uppercase tracking-widest text-primary">
          How it works
        </p>
        <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          From pull request to merge, on autopilot
        </h2>
        <p className="mt-4 text-muted-foreground">
          Four steps — most of which your team already does. MG7 quietly handles
          the review in between.
        </p>
      </div>

      {/* Step flow */}
      <ol className="relative mt-16 grid gap-8 md:grid-cols-4 md:gap-5">
        {/* Connecting rail behind the step icons (desktop only). */}
        <div className="pointer-events-none absolute inset-x-0 top-7 hidden h-px bg-linear-to-r from-transparent via-border to-transparent md:block" />

        {STEPS.map(({ icon: Icon, step, title, body }) => (
          <li key={step} className="relative flex flex-col items-center text-center md:items-start md:text-left">
            {/* Numbered icon node */}
            <div className="relative">
              <span className="glass relative z-10 grid size-14 place-items-center rounded-2xl border border-primary/30 text-primary shadow-lg shadow-primary/10">
                <Icon className="size-6" weight="bold" />
              </span>
              {/* Step number badge */}
              <span className="absolute -right-1 -top-1 z-20 grid size-5 place-items-center rounded-full bg-primary font-heading text-[10px] font-bold text-primary-foreground">
                {step.replace(/^0/, "")}
              </span>
            </div>

            <h3 className="mt-5 font-heading text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
