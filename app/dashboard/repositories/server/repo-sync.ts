/**
 * Repo codebase sync — fetch, chunk, and index a repository into Pinecone.
 *
 * A synced repo gives the review job retrieval context beyond the diff: at
 * review time we search the repo's namespace for code related to the PR and
 * feed those snippets to the model ("this function is called from…").
 *
 * Pipeline: git tree (recursive) → filter indexable files → fetch blobs →
 * split into fixed-size line chunks → upsert as text records (Pinecone's
 * integrated embedding vectorises them server-side).
 *
 * SERVER-ONLY: mints installation tokens and holds the Pinecone key.
 */

import { getGithubApp } from "@/app/dashboard/github/utils/github-app";
import type { CodeChunk } from "@/app/dashboard/reviews/types";
import { getPineconeIndex } from "@/lib/pinecone";
import { prisma } from "@/lib/db";
import { inngest, repoSyncRequested } from "@/lib/inngest";

// Guardrails so a huge repo can't blow up job time or Pinecone quota.
const MAX_FILE_SIZE_BYTES = 100_000;
const MAX_FILES = 200;
const MAX_CHUNK_LINES = 80;
const UPSERT_BATCH_SIZE = 90;

const CODE_EXTENSIONS = [
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".py", ".go", ".rb", ".rs",
  ".java", ".kt", ".swift", ".c", ".h", ".cpp", ".cs", ".php",
  ".sql", ".prisma", ".css", ".md", ".yml", ".yaml",
];

const SKIPPED_FOLDERS = [
  "node_modules/", "dist/", "build/", ".next/", "generated/", "vendor/",
];

export type RepoFile = {
  filePath: string;
  content: string;
};

type TreeEntry = {
  path?: string;
  type?: string;
  sha?: string;
  size?: number;
};

/**
 * Namespace holding a repo's synced codebase vectors. Pinecone namespaces
 * can't contain "/", so "owner/repo" becomes "owner--repo--codebase".
 */
export function buildRepoNamespace(repoFullName: string): string {
  return `${repoFullName.replace("/", "--")}--codebase`;
}

function isIndexableFile(entry: TreeEntry): boolean {
  if (entry.type !== "blob" || !entry.path || !entry.sha) {
    return false;
  }
  if (entry.size && entry.size > MAX_FILE_SIZE_BYTES) {
    return false;
  }
  if (SKIPPED_FOLDERS.some((folder) => entry.path!.includes(folder))) {
    return false;
  }
  return CODE_EXTENSIONS.some((extension) => entry.path!.endsWith(extension));
}

/**
 * List and download the repo's indexable files at `branch`.
 *
 * One tree call (recursive) for the listing, then one blob call per file —
 * bounded by MAX_FILES.
 */
export async function getRepoFiles(
  installationId: number,
  repoFullName: string,
  branch: string,
): Promise<RepoFile[]> {
  const app = getGithubApp();
  const octokit = await app.getInstallationOctokit(installationId);
  const [owner, repo] = repoFullName.split("/");

  const { data: tree } = await octokit.request(
    "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
    { owner, repo, tree_sha: branch, recursive: "1" },
  );

  const entries = tree.tree.filter(isIndexableFile).slice(0, MAX_FILES);
  const files: RepoFile[] = [];

  for (const entry of entries) {
    const { data: blob } = await octokit.request(
      "GET /repos/{owner}/{repo}/git/blobs/{file_sha}",
      { owner, repo, file_sha: entry.sha! },
    );
    files.push({
      filePath: entry.path!,
      content: Buffer.from(blob.content, "base64").toString("utf-8"),
    });
  }

  return files;
}

/**
 * Split each file into fixed-size line windows. Chunk ids are deterministic
 * (path + part) so re-syncing upserts over the same records.
 */
export function chunkRepoFiles(files: RepoFile[]): CodeChunk[] {
  const chunks: CodeChunk[] = [];

  for (const file of files) {
    const lines = file.content.split("\n");

    for (let start = 0; start < lines.length; start += MAX_CHUNK_LINES) {
      const part = start / MAX_CHUNK_LINES;
      chunks.push({
        id: `repo--${file.filePath}--part-${part}`,
        filePath: file.filePath,
        text: lines.slice(start, start + MAX_CHUNK_LINES).join("\n"),
      });
    }
  }

  return chunks;
}

/** Drop a repo's old vectors (used before re-sync so deleted files vanish). */
export async function deleteRepoNamespace(namespace: string): Promise<void> {
  const index = getPineconeIndex();
  await index.deleteNamespace(namespace);
}

/** Upsert chunks as text records — Pinecone embeds them server-side. */
export async function saveRepoChunks(
  namespace: string,
  chunks: CodeChunk[],
): Promise<void> {
  const index = getPineconeIndex();

  for (let start = 0; start < chunks.length; start += UPSERT_BATCH_SIZE) {
    const batch = chunks.slice(start, start + UPSERT_BATCH_SIZE);
    await index.namespace(namespace).upsertRecords({
      records: batch.map((chunk) => ({
        id: chunk.id,
        text: chunk.text,
        filePath: chunk.filePath,
      })),
    });
  }
}

/**
 * Upsert the RepoSync row to `pending` and kick the background job. The job
 * (not this trigger) flips it to syncing → synced/failed.
 */
export async function triggerRepoSync(
  installationId: number,
  repoFullName: string,
  branch: string,
): Promise<void> {
  const repoSync = await prisma.repoSync.upsert({
    where: { repoFullName },
    create: { installationId, repoFullName, branch, status: "pending" },
    update: { installationId, branch, status: "pending" },
  });

  await inngest.send(
    repoSyncRequested.create({
      repoSyncId: repoSync.id,
    }),
  );
}
