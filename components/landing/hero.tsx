import { GitHubSignInButton } from "@/components/auth/github-sign-in-button";
import { ReviewWorkflow } from "@/components/landing/review-workflow";



export function Hero() {
  return (
    <section className="relative mx-auto flex max-w-6xl flex-col items-center gap-16 px-6 pt-40 pb-24 lg:flex-row lg:items-start lg:pb-32">


      <div className="flex-1">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center lg:mx-0 lg:items-start lg:text-left">
          

          <div className="inline-flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/10 px-3 py-1 text-base font-medium text-primary">
            {"<Merge without fear!/>"}
          </div>

        
          <h1 className="mt-6 font-heading text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Ship better {"<Code/>"}
            <br />
            <span className="text-shimmer bg-linear-to-r from-primary via-chart-2 to-primary">
              reviewed at speed of light
            </span>
          </h1>

          {/* Sub-copy */}
          <p className="mt-6 max-w-xl text-balance text-base text-muted-foreground sm:text-lg lg:mx-0">
            MG7 connects to your GitHub, surfaces risky changes, and delivers
            crisp, human-readable feedback on every pull request — so your team
            reviews less and merges with confidence.
          </p>

          {/* Primary + secondary CTA */}
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            <GitHubSignInButton size="lg" label="Continue with GitHub" />
            <a
              href="#how"
              className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              See how it works ↓
            </a>
          </div>

          {/* Trust line */}
          <p className="mt-6 text-xs text-muted-foreground">
            git commit /git push /MG7 review/ git merge
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Right: live, animated review workflow                            */}
      {/* ---------------------------------------------------------------- */}
      <div className="relative w-full max-w-md flex-1">
        {/* Glow behind the card */}
        <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-primary/20 blur-2xl" />

        <div className="relative z-10 animate-fade-up" style={{ animationDelay: "200ms" }}>
          <ReviewWorkflow />
        </div>
      </div>
    </section>
  );
}
