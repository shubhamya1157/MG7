// import { GitHubSignInButton } from "@/components/auth/github-sign-in-button";

/**
 * Closing call-to-action band. A glowing bordered panel that repeats the
 * primary GitHub sign-in so users can convert without scrolling back up.
 */
export function CallToAction() {
  return (
    <section id="cta" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 px-6 py-16 text-center">
        {/* Layered background glow inside the panel */}
        <div className="bg-grid absolute inset-0 opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="absolute left-1/2 top-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />

        <div className="relative">
          <h2 className="mx-auto max-w-2xl font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Give every pull request a{" "}
            <span className="text-primary">senior reviewer</span>.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Connect your repositories today and watch MG7 review your next
            PR in real time.
          </p>
          <div className="mt-8 flex justify-center">
            {/* <GitHubSignInButton size="lg" label="Start with GitHub" /> */}
          </div>
        </div>
      </div>
    </section>
  );
}
