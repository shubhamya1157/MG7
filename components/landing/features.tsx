import {
  Robot,
  ShieldCheck,
  Lightning,
  GitMerge,
  Users,
  Gauge,
} from "@phosphor-icons/react/dist/ssr";

/**
 * Static feature data. Kept as an array so the grid stays declarative and
 * easy to extend — add an entry and it renders itself.
 */
const FEATURES = [
  {
    icon: Robot,
    title: "AI reviewer",
    body: "Context-aware suggestions on every diff — style, bugs, and edge cases, explained in plain English.",
  },
  {
    icon: ShieldCheck,
    title: "Security signals",
    body: "Flags leaked secrets, risky dependencies and unsafe patterns before they reach main.",
  },
  {
    icon: Lightning,
    title: "Instant feedback",
    body: "Reviews land the moment a PR opens, so contributors never wait on a human to get unblocked.",
  },
  {
    icon: GitMerge,
    title: "GitHub-native",
    body: "Connects straight to your repos and comments inline, right where your team already works.",
  },
  {
    icon: Users,
    title: "Team insights",
    body: "See review load, hot files and merge velocity across the whole team at a glance.",
  },
  {
    icon: Gauge,
    title: "Merge confidence",
    body: "A single risk score per PR tells reviewers exactly where to focus their attention.",
  },
] as const;

/** Responsive feature grid with hover-glow cards. */
export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
      {/* Section heading */}
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-heading text-sm font-semibold uppercase tracking-widest text-primary">
          Why MG7
        </p>
        <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Everything your review workflow was missing
        </h2>
        <p className="mt-4 text-muted-foreground">
          Purpose-built for fast-moving teams that care about code quality
          without the review bottleneck.
        </p>
      </div>

      {/* Cards */}
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <article
            key={title}
            className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_12px_40px_-12px_var(--primary)]"
          >
            {/* Soft radial glow that appears on hover */}
            <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />

            <span className="inline-grid size-11 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary/20">
              <Icon className="size-5" weight="bold" />
            </span>
            <h3 className="mt-4 font-heading text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
