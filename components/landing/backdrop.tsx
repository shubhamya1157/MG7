export function Backdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background"
    >
      {/* 1. Animated grid, faded out towards the edges with a radial mask. */}
      <div
        className="bg-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,black,transparent)]"
      />

      {/* 2. Rotating aurora ring behind the hero. */}
      <div className="absolute left-1/2 top-[-12rem] size-[42rem] -translate-x-1/2 rounded-full opacity-30 blur-3xl animate-spin-slow bg-[conic-gradient(from_0deg,var(--chart-2),var(--chart-4),var(--primary),var(--chart-2))]" />

      {/* 3. Floating colour orbs. */}
      <div className="animate-float-slow absolute left-[8%] top-[22%] size-72 rounded-full bg-primary/25 blur-3xl animate-glow-pulse" />
      <div
        className="animate-float-slow absolute right-[6%] top-[38%] size-80 rounded-full bg-chart-2/20 blur-3xl animate-glow-pulse"
        style={{ animationDelay: "1.5s" }}
      />

      {/* 4. Vignette / bottom fade so sections below stay legible. */}
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-background" />
    </div>
  );
}
