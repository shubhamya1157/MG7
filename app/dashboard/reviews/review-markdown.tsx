"use client";

/**
 * Renders an AI review (markdown) as rich, readable HTML.
 *
 * Client component because react-markdown builds a React element tree at
 * render time; the markdown itself always arrives as a plain string prop from
 * a server component, so nothing sensitive crosses the boundary.
 *
 * - remark-gfm: tables, task lists, strikethrough (models emit these freely)
 * - rehype-highlight: syntax colouring inside ```code fences
 *
 * Styling is done per-element via the `components` map (no typography plugin
 * in this Tailwind v4 setup), tuned for both light and dark themes.
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

import { cn } from "@/lib/utils";

import "highlight.js/styles/github-dark.css";

export function ReviewMarkdown({
  markdown,
  className,
}: {
  markdown: string;
  className?: string;
}) {
  return (
    <div className={cn("text-sm leading-relaxed text-foreground", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ children }) => (
            <h2 className="mt-6 mb-3 font-heading text-xl font-bold tracking-tight first:mt-0">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h3 className="mt-6 mb-2 font-heading text-lg font-semibold tracking-tight first:mt-0">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="mt-5 mb-2 text-base font-semibold first:mt-0">
              {children}
            </h4>
          ),
          p: ({ children }) => <p className="my-3 first:mt-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="my-3 list-disc space-y-1.5 pl-6">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 list-decimal space-y-1.5 pl-6">{children}</ol>
          ),
          li: ({ children }) => <li className="[&>p]:my-1">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-border pl-4 text-muted-foreground italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-5 border-border/60" />,
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-left text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-border/60 bg-muted/60 px-3 py-2 font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border/40 px-3 py-2 last:border-b-0">
              {children}
            </td>
          ),
          // Fenced blocks arrive as <pre><code class="hljs …">; inline code has
          // no surrounding <pre>, so style the two cases differently.
          pre: ({ children }) => (
            <pre className="my-4 overflow-x-auto rounded-lg border border-border/60 bg-[#0d1117] p-4 text-xs leading-relaxed">
              {children}
            </pre>
          ),
          code: ({ className: codeClass, children }) =>
            codeClass?.includes("hljs") || codeClass?.includes("language-") ? (
              <code className={codeClass}>{children}</code>
            ) : (
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] font-medium">
                {children}
              </code>
            ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
