"use client";

/* ============================================================================
   Imports
============================================================================ */

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { motion, AnimatePresence, useInView, type Variants } from "motion/react";

import {
  GitPullRequestIcon,
  GitMergeIcon,
  SpinnerGapIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  SparkleIcon,
  ChatCircleTextIcon,
  CircleIcon,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

/* ============================================================================
   Types
============================================================================ */

/**
 * The workflow is modelled as a finite state machine. Each phase owns its own
 * on-screen behaviour; adding a new phase is as simple as extending `Phase`
 * and the `PHASE_FLOW` transition table below.
 */
type Phase =
  | "idle"
  | "opening"
  | "scanning"
  | "reviewing"
  | "approved"
  | "merged";

type CommentType = "passed" | "security" | "suggestion" | "insight";

interface ReviewFile {
  id: number;
  path: string;
}

interface ReviewComment {
  id: number;
  type: CommentType;
  message: string;
}

interface StatusConfig {
  label: string;
  className: string;
  icon?: ReactNode;
}

interface CommentStyle {
  icon: ReactNode;
  label: string;
  className: string;
}

/* ============================================================================
   Data
============================================================================ */

const STORAGE_KEY = "mg7-review-workflow-played";

/** Timing (ms) for the automatic, self-advancing timeline. */
const TIMING = {
  bootDelay: 450, // idle -> opening
  chromeSettle: 900, // opening -> scanning
  perFileScan: 620, // cadence of the file scanner
  approveHold: 700, // reviewing done -> approved
  mergeHold: 1100, // approved -> merged
  typeSpeed: 16, // per-character streaming speed
} as const;

const FILES: readonly ReviewFile[] = [
  { id: 1, path: "auth/session.ts" },
  { id: 2, path: "auth/refresh-token.ts" },
  { id: 3, path: "lib/backoff.ts" },
  { id: 4, path: "middleware.ts" },
  { id: 5, path: "lib/auth.ts" },
] as const;

const COMMENTS: readonly ReviewComment[] = [
  {
    id: 1,
    type: "passed",
    message: "Token rotation logic is correct and race-safe.",
  },
  {
    id: 2,
    type: "security",
    message: "Refresh token is no longer logged in plain text.",
  },
  {
    id: 3,
    type: "suggestion",
    message: "Extract retry backoff into a shared helper.",
  },
  {
    id: 4,
    type: "passed",
    message: "Auth middleware now avoids duplicate validation.",
  },
  {
    id: 5,
    type: "insight",
    message: "5 files reviewed • 0 blocking issues • ~2 min saved.",
  },
] as const;

/** Static, deterministic particle field (avoids hydration mismatch). */
const PARTICLES = [
  { left: "12%", top: "22%", size: 3, delay: 0, duration: 9 },
  { left: "78%", top: "16%", size: 2, delay: 1.2, duration: 11 },
  { left: "36%", top: "68%", size: 4, delay: 0.6, duration: 8 },
  { left: "88%", top: "60%", size: 2, delay: 2.1, duration: 12 },
  { left: "22%", top: "84%", size: 3, delay: 1.7, duration: 10 },
  { left: "62%", top: "40%", size: 2, delay: 0.3, duration: 13 },
] as const;

/* ----------------------------------------------------------------------------
   Finite state machine transition table
   Each entry describes which phase comes next and after how long. Phases that
   advance from internal progress (scanning/reviewing) have `next: null`.
---------------------------------------------------------------------------- */
const PHASE_FLOW: Record<Phase, { next: Phase | null; delay: number }> = {
  idle: { next: "opening", delay: TIMING.bootDelay },
  opening: { next: "scanning", delay: TIMING.chromeSettle },
  scanning: { next: null, delay: 0 }, // driven by scannedCount
  reviewing: { next: null, delay: 0 }, // driven by commentIndex
  approved: { next: "merged", delay: TIMING.mergeHold },
  merged: { next: null, delay: 0 }, // terminal
};

/* ============================================================================
   Comment Appearance
============================================================================ */

const COMMENT_STYLES: Record<CommentType, CommentStyle> = {
  passed: {
    icon: <CheckCircleIcon weight="fill" className="size-4 text-emerald-400" />,
    label: "Passed",
    className: "text-emerald-400",
  },
  security: {
    icon: <ShieldCheckIcon weight="fill" className="size-4 text-primary" />,
    label: "Security",
    className: "text-primary",
  },
  suggestion: {
    icon: <ChatCircleTextIcon weight="fill" className="size-4 text-chart-1" />,
    label: "Suggestion",
    className: "text-chart-1",
  },
  insight: {
    icon: <SparkleIcon weight="fill" className="size-4 text-chart-4" />,
    label: "AI Insight",
    className: "text-chart-4",
  },
};

/* ============================================================================
   Animation Variants
============================================================================ */

const cardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 42 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
  },
};

const chromeVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const pillVariants: Variants = {
  hidden: { opacity: 0, scale: 0.85, y: -4 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 420, damping: 26 },
  },
  exit: { opacity: 0, scale: 0.85, y: 4, transition: { duration: 0.15 } },
};

const fileVariants: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.05 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
};

const commentVariants: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 360, damping: 30 },
  },
};

const mergeVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 240, damping: 26 },
  },
  exit: { opacity: 0, y: 28, transition: { duration: 0.3 } },
};

/* ============================================================================
   Hooks
============================================================================ */

/** SSR-safe `prefers-reduced-motion` subscription. */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

const PLAYED_EVENT = "mg7:review-played";

function readPlayed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * True once per browser after the animation has been watched to completion.
 * Backed by `useSyncExternalStore` so the value is SSR-safe and the "watched"
 * write propagates without a synchronous setState in an effect.
 */
function useHasPlayed(): [boolean, () => void] {
  const played = useSyncExternalStore(
    (onChange) => {
      window.addEventListener(PLAYED_EVENT, onChange);
      window.addEventListener("storage", onChange);
      return () => {
        window.removeEventListener(PLAYED_EVENT, onChange);
        window.removeEventListener("storage", onChange);
      };
    },
    readPlayed,
    () => false,
  );

  const markPlayed = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(PLAYED_EVENT));
  }, []);

  return [played, markPlayed];
}

/**
 * Streams `text` one character at a time while `active`. Calls `onDone` exactly
 * once when the last character has been revealed.
 */
function useTypewriter(
  text: string,
  active: boolean,
  speed: number,
  onDone?: () => void,
): string {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Each comment mounts already-active and is never re-activated, so no
    // reset is required — we simply drive the reveal forward while active.
    if (!active) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= text.length) {
        window.clearInterval(id);
        onDone?.();
      }
    }, speed);
    return () => window.clearInterval(id);
  }, [text, active, speed, onDone]);

  return text.slice(0, count);
}

/* ============================================================================
   Utilities
============================================================================ */

/** Derives the status pill from the current phase. */
function statusFor(phase: Phase): StatusConfig {
  switch (phase) {
    case "scanning":
      return {
        label: "Analyzing",
        className: "border-primary/40 bg-primary/10 text-primary",
        icon: <Spinner className="text-primary" />,
      };
    case "reviewing":
      return {
        label: "Reviewing",
        className: "border-chart-1/40 bg-chart-1/10 text-chart-1",
        icon: <Spinner className="text-chart-1" />,
      };
    case "approved":
    case "merged":
      return {
        label: phase === "merged" ? "Merged" : "Approved",
        className: "border-emerald-400/40 bg-emerald-400/10 text-emerald-400",
        icon: <CheckCircleIcon weight="fill" className="size-3.5" />,
      };
    default:
      return {
        label: "Opened",
        className: "border-border/60 bg-muted/40 text-muted-foreground",
        icon: <GitPullRequestIcon weight="bold" className="size-3.5" />,
      };
  }
}

/* ============================================================================
   Spinner Component
============================================================================ */

const Spinner = memo(function Spinner({ className }: { className?: string }) {
  return (
    <motion.span
      className="inline-flex"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
    >
      <SpinnerGapIcon weight="bold" className={cn("size-3.5", className)} />
    </motion.span>
  );
});

/* ============================================================================
   Typing Component
============================================================================ */

interface TypingCommentProps {
  comment: ReviewComment;
  /** Currently streaming (true) vs. already completed (false). */
  active: boolean;
  onComplete: () => void;
}

const TypingComment = memo(function TypingComment({
  comment,
  active,
  onComplete,
}: TypingCommentProps) {
  const style = COMMENT_STYLES[comment.type];
  const streamed = useTypewriter(
    comment.message,
    active,
    TIMING.typeSpeed,
    onComplete,
  );
  const text = active ? streamed : comment.message;
  const caret = active && streamed.length < comment.message.length;

  return (
    <motion.li
      layout
      variants={commentVariants}
      initial="hidden"
      animate="visible"
      className="list-none rounded-xl border border-border/60 bg-background/40 p-3.5 backdrop-blur-sm"
    >
      <div className="flex gap-3">
        <span className="mt-0.5 shrink-0">{style.icon}</span>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
              style.className,
            )}
          >
            {style.label}
          </p>
          <p className="text-sm leading-6 text-foreground/90">
            {text}
            {caret && (
              <motion.span
                aria-hidden
                className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 rounded-full bg-current align-middle"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.75, repeat: Infinity }}
              />
            )}
          </p>
        </div>
      </div>
    </motion.li>
  );
});

/* ============================================================================
   Ambient Background Component
============================================================================ */

const AmbientBackground = memo(function AmbientBackground({
  bloom,
}: {
  bloom: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* soft blue/primary glow */}
      <motion.div
        className="absolute -left-16 -top-16 size-56 rounded-full bg-primary/15 blur-3xl"
        animate={{ opacity: [0.35, 0.55, 0.35], scale: [1, 1.08, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* success bloom on merge */}
      <motion.div
        className="absolute inset-0 bg-emerald-400/10"
        initial={false}
        animate={{ opacity: bloom ? [0, 0.9, 0] : 0 }}
        transition={{ duration: 1.6, ease: "easeInOut" }}
      />
      {/* floating particles */}
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-primary/40"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size }}
          animate={{ y: [0, -14, 0], opacity: [0.15, 0.5, 0.15] }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
      {/* CSS-only noise texture */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      {/* glass reflection sweep */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.06] to-transparent" />
    </div>
  );
});

/* ============================================================================
   Main Component
============================================================================ */

export function ReviewWorkflow() {
  const reducedMotion = usePrefersReducedMotion();
  const [hasPlayed, markPlayed] = useHasPlayed();

  const cardRef = useRef<HTMLDivElement>(null);
  const inView = useInView(cardRef, { once: true, amount: 0.5 });

  const [phase, setPhase] = useState<Phase>("idle");
  const [scannedCount, setScannedCount] = useState(0);
  const [commentIndex, setCommentIndex] = useState(0);

  /** Whether we should short-circuit straight to the finished state. */
  const skip = reducedMotion || hasPlayed;

  // --------------------------------------------------------------------------
  // Time-based transitions declared in PHASE_FLOW. Gated on `inView`, so the
  // `idle -> opening` kick-off happens naturally once the card is on screen.
  // Skipping (reduced motion / already watched) is handled by derivation, not
  // state mutation — see the "effective view" section below.
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (skip || !inView) return;
    const flow = PHASE_FLOW[phase];
    if (!flow.next) return;
    const id = window.setTimeout(() => setPhase(flow.next as Phase), flow.delay);
    return () => window.clearTimeout(id);
  }, [phase, skip, inView]);

  // --------------------------------------------------------------------------
  // Progress-based transition: the file scanner.
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (skip || phase !== "scanning") return;
    if (scannedCount >= FILES.length) {
      const id = window.setTimeout(() => setPhase("reviewing"), TIMING.perFileScan);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(
      () => setScannedCount((c) => c + 1),
      TIMING.perFileScan,
    );
    return () => window.clearTimeout(id);
  }, [skip, phase, scannedCount]);

  // --------------------------------------------------------------------------
  // Progress-based transition: comment streaming completion.
  // --------------------------------------------------------------------------
  const handleCommentDone = useCallback(() => {
    setCommentIndex((i) => Math.min(i + 1, COMMENTS.length));
  }, []);

  useEffect(() => {
    if (skip || phase !== "reviewing") return;
    if (commentIndex < COMMENTS.length) return;
    const id = window.setTimeout(() => setPhase("approved"), TIMING.approveHold);
    return () => window.clearTimeout(id);
  }, [skip, phase, commentIndex]);

  // --------------------------------------------------------------------------
  // Persist "watched" once we reach the terminal state naturally.
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (phase === "merged" && !skip) markPlayed();
  }, [phase, skip, markPlayed]);

  // --------------------------------------------------------------------------
  // Effective (rendered) view state. When skipping, everything reads as the
  // terminal "merged" state without ever mutating the underlying machine.
  // --------------------------------------------------------------------------
  const view: Phase = skip ? "merged" : phase;
  const scanned = skip ? FILES.length : scannedCount;
  const comments = skip ? COMMENTS.length : commentIndex;

  const status = useMemo(() => statusFor(view), [view]);
  const isIdle = view === "idle";
  const isScanning = view === "scanning";
  const isReviewing = view === "reviewing";
  const isDone = view === "approved" || view === "merged";

  const visibleComments = useMemo(() => {
    if (isReviewing) return COMMENTS.slice(0, comments + 1);
    if (isDone) return COMMENTS;
    return [];
  }, [isReviewing, isDone, comments]);

  const scanTarget = Math.min(scanned, FILES.length - 1);

  return (
    <motion.div
      ref={cardRef}
      variants={cardVariants}
      initial="hidden"
      animate={inView || skip ? "visible" : "hidden"}
      className="glass relative overflow-hidden rounded-2xl border border-border/70 shadow-[0_28px_90px_-28px_rgba(0,0,0,0.45)]"
      role="figure"
      aria-label="AI code review workflow demonstration"
    >
      <AmbientBackground bloom={view === "merged"} />

      {/* subtle card breathing */}
      <motion.div
        className="relative"
        animate={
          reducedMotion ? undefined : { scale: [1, 1.004, 1] }
        }
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* ====================================================================
            Window Chrome
        ==================================================================== */}
        <motion.div
          variants={chromeVariants}
          initial="hidden"
          animate={isIdle ? "hidden" : "visible"}
          className="flex items-center gap-3 border-b border-border/60 px-4 py-3"
        >
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-destructive/70" />
            <span className="size-3 rounded-full bg-chart-1/70" />
            <span className="size-3 rounded-full bg-emerald-400/70" />
          </div>

          <div className="ml-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <GitPullRequestIcon weight="bold" className="size-4 shrink-0" />
            <span className="font-medium">PR #482</span>
            <span className="text-muted-foreground/50">•</span>
            <span className="truncate">auth/session-refresh</span>
          </div>

          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={status.label}
              layout
              variants={pillVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={cn(
                "ml-auto flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
                status.className,
              )}
            >
              {status.icon}
              <span>{status.label}</span>
            </motion.span>
          </AnimatePresence>
        </motion.div>

        {/* ====================================================================
            File Scanner
        ==================================================================== */}
        <div className="relative border-b border-border/60 px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Changed Files
            </h3>
            <motion.span
              key={scanned}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-mono text-[11px] text-muted-foreground"
            >
              {Math.min(scanned, FILES.length)}/{FILES.length}
            </motion.span>
          </div>

          <div className="relative">
            {/* premium scan line */}
            <AnimatePresence>
              {isScanning && (
                <motion.div
                  className="pointer-events-none absolute inset-x-0 z-30 h-10 will-change-transform"
                  initial={{ top: 0, opacity: 0 }}
                  animate={{
                    top: scanTarget * 40,
                    opacity: 1,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 26 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-primary/25 via-primary/10 to-transparent blur-lg" />
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_18px_2px] shadow-primary/60" />
                </motion.div>
              )}
            </AnimatePresence>

            <ul className="relative">
              {FILES.map((file, i) => {
                const done = i < scanned;
                const active = i === scanned && isScanning;
                return (
                  <motion.li
                    key={file.id}
                    custom={i}
                    variants={fileVariants}
                    initial="hidden"
                    animate={isIdle ? "hidden" : "visible"}
                    className={cn(
                      "flex h-10 list-none items-center gap-3 rounded-lg border border-transparent px-3 transition-colors duration-300",
                      active && "border-primary/40 bg-primary/[0.06]",
                      done && "bg-emerald-400/[0.04]",
                    )}
                  >
                    <span className="grid size-4 shrink-0 place-items-center">
                      <AnimatePresence mode="wait" initial={false}>
                        {done ? (
                          <motion.span
                            key="done"
                            initial={{ scale: 0, rotate: -30 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 18,
                            }}
                          >
                            <CheckCircleIcon
                              weight="fill"
                              className="size-4 text-emerald-400"
                            />
                          </motion.span>
                        ) : active ? (
                          <Spinner key="active" className="text-primary" />
                        ) : (
                          <CircleIcon
                            key="idle"
                            className="size-4 text-muted-foreground/40"
                          />
                        )}
                      </AnimatePresence>
                    </span>

                    <span
                      className={cn(
                        "truncate font-mono text-sm transition-colors duration-300",
                        active && "text-foreground",
                        done && "text-muted-foreground",
                        !active && !done && "text-muted-foreground/40",
                      )}
                    >
                      {file.path}
                    </span>

                    <AnimatePresence>
                      {active && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[9px] uppercase tracking-widest text-primary"
                        >
                          Scanning
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* ====================================================================
            AI Review
        ==================================================================== */}
        <div className="min-h-[240px] px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              AI Review
            </h3>
            <AnimatePresence>
              {isReviewing && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-[11px] text-chart-1"
                >
                  <Spinner className="text-chart-1" />
                  Generating review…
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {visibleComments.length === 0 ? (
            <div className="flex h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/20">
              <Spinner className="size-6 text-primary" />
              <p className="text-sm text-muted-foreground">
                Reading the pull request…
              </p>
            </div>
          ) : (
            <motion.ul layout className="space-y-2.5">
              <AnimatePresence mode="popLayout">
                {visibleComments.map((comment, i) => (
                  <TypingComment
                    key={comment.id}
                    comment={comment}
                    active={isReviewing && i === visibleComments.length - 1}
                    onComplete={handleCommentDone}
                  />
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </div>

        {/* ====================================================================
            Merge Banner
        ==================================================================== */}
        <AnimatePresence>
          {isDone && (
            <motion.div
              variants={mergeVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative flex items-center gap-3 overflow-hidden border-t border-emerald-400/30 bg-emerald-400/[0.08] px-4 py-3.5"
            >
              <motion.span
                className="absolute inset-0 bg-emerald-400/20 blur-2xl"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: [0, 0.6, 0.2], scale: [0.6, 1.2, 1] }}
                transition={{ duration: 1.4, ease: "easeOut" }}
              />
              <motion.span
                className="relative"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 16 }}
              >
                <GitMergeIcon weight="fill" className="size-5 text-emerald-400" />
              </motion.span>

              <div className="relative min-w-0">
                <h4 className="text-sm font-semibold text-emerald-400">
                  Merged successfully
                </h4>
                <p className="truncate text-xs text-muted-foreground">
                  Reviewed with AI in 2m 04s
                </p>
              </div>

              <motion.span
                className="relative ml-auto"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 14,
                  delay: 0.15,
                }}
              >
                <CheckCircleIcon weight="fill" className="size-6 text-emerald-400" />
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

export default ReviewWorkflow;
