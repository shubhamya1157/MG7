/**
 * Shared types for the AI review pipeline.
 */

/** A single changed file in a PR, as returned by GitHub's "list PR files" API. */
export type PrFile = {
  /** Path of the file within the repository, e.g. `src/lib/auth.ts`. */
  filePath: string;
  /** Unified diff patch for this file (GitHub omits it for binary/huge files). */
  patch: string;
};

/**
 * A fixed-size slice of a file's diff, sized to embed/search independently.
 * Used by the repo-sync stage to index code for retrieval at review time.
 */
export type CodeChunk = {
  /** Unique id, e.g. `pr-42--src/foo.ts--part-0` — stable across re-runs. */
  id: string;
  /** Source file path this chunk came from. */
  filePath: string;
  /** Raw chunk text that gets embedded and searched. */
  text: string;
};
