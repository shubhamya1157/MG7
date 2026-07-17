/**
 * Review-time retrieval (the "R" in RAG).
 *
 * When a repo has been synced (see repositories/server/repo-sync.ts), its
 * code chunks live in a Pinecone namespace with integrated embedding. At
 * review time we query that namespace with text describing the PR — the PR
 * title plus the changed file paths — and get back the most semantically
 * similar chunks of the *existing* codebase. Those snippets let the model
 * spot cross-file issues a bare diff can't reveal (broken callers,
 * duplicated utilities, convention drift).
 *
 * SERVER-ONLY.
 */

import { getPineconeIndex, isPineconeConfigured } from "@/lib/pinecone";
import { buildRepoNamespace } from "@/app/dashboard/repositories/server/repo-sync";
import { prisma } from "@/lib/db";

const CONTEXT_RESULTS = 10;

/**
 * Fetch codebase snippets related to `query` for a synced repo.
 *
 * Returns [] when Pinecone isn't configured or the repo was never synced —
 * the review then simply runs diff-only, same as before RAG existed.
 */
export async function getRepoContextSnippets(
  repoFullName: string,
  query: string,
): Promise<string[]> {
  if (!isPineconeConfigured()) {
    return [];
  }

  const repoSync = await prisma.repoSync.findUnique({
    where: { repoFullName },
    select: { status: true },
  });
  if (repoSync?.status !== "synced") {
    return [];
  }

  const index = getPineconeIndex();
  const response = await index
    .namespace(buildRepoNamespace(repoFullName))
    .searchRecords({
      query: { topK: CONTEXT_RESULTS, inputs: { text: query } },
    });

  const snippets: string[] = [];
  for (const hit of response.result.hits) {
    const fields = hit.fields as { text?: string; filePath?: string };
    if (!fields.text) {
      continue;
    }
    snippets.push(`File: ${fields.filePath}\n${fields.text}`);
  }
  return snippets;
}

/** Format retrieved snippets as a clearly-labelled prompt section. */
export function buildRepoContextSection(snippets: string[]): string {
  if (snippets.length === 0) {
    return "";
  }
  return `\n\nRelated code from the repository (for context only — NOT part of the change under review):\n\n${snippets.join("\n\n---\n\n")}`;
}
