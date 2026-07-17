import { generateText } from "ai";

import { getOpenRouter, getReviewModelName } from "@/app/ai-sdk";
import { getGithubApp } from "@/app/dashboard/github/utils/github-app";
import {
  formatPrFilesForReview,
  getPullRequestFiles,
} from "@/app/dashboard/reviews/server/pr-files";
import {
  buildRepoContextSection,
  getRepoContextSnippets,
} from "@/app/dashboard/reviews/server/repo-context";
import {
  buildRepoNamespace,
  chunkRepoFiles,
  deleteRepoNamespace,
  getRepoFiles,
  saveRepoChunks,
} from "@/app/dashboard/repositories/server/repo-sync";
import {
  FREE_MONTHLY_REVIEW_LIMIT,
  getMonthlyReviewCountForInstallation,
} from "@/app/dashboard/settings/server/usage";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { inngest, prReviewRequested, repoSyncRequested } from "@/lib/inngest";

/**
 * Resolve which OpenRouter key this review should run on.
 *
 * BYOK: installation → owning user → settings; if the user stored their own
 * key, decrypt and use it (unmetered). Otherwise the app's key applies, gated
 * by the free-tier monthly quota.
 */
async function resolveReviewKey(installationId: number): Promise<
  | { kind: "byok"; apiKey: string }
  | { kind: "free" }
  | { kind: "quota-exceeded" }
> {
  const installation = await prisma.githubInstallation.findFirst({
    where: { installationId },
    select: {
      user: {
        select: { settings: { select: { openrouterKeyCiphertext: true } } },
      },
    },
  });

  const ciphertext = installation?.user.settings?.openrouterKeyCiphertext;
  if (ciphertext) {
    return { kind: "byok", apiKey: decryptSecret(ciphertext) };
  }

  const used = await getMonthlyReviewCountForInstallation(installationId);
  if (used >= FREE_MONTHLY_REVIEW_LIMIT) {
    return { kind: "quota-exceeded" };
  }
  return { kind: "free" };
}

export const reviewPullRequest = inngest.createFunction(
  {
    id: "review-pull-request",
    // One in-flight review per PR: a rapid re-push shouldn't run two reviews of
    // the same record concurrently and race on the status column.
    concurrency: { key: "event.data.pullRequestId", limit: 1 },
    triggers: [prReviewRequested],
  },
  async ({ event, step }) => {
    const { pullRequestId, headSha, installationId, repoFullName, prNumber } = event.data;

    try {
      // Mark as processing so the UI can show "review in progress".
      const pr = await step.run("mark-processing", async () => {
        return prisma.pullRequest.update({
          where: { id: pullRequestId },
          data: { status: "processing" },
        });
      });

      // A newer push may have superseded this event while it was queued. If the
      // stored head has moved on, abandon quietly — the newer push emitted its own
      // event and will drive its own review.
      if (pr.headSha !== headSha) {
        return { skipped: "superseded", pullRequestId };
      }

      // Decide whose key pays for this review — before any expensive work.
      // step.run results are JSON-serialized, so the decrypted key transits
      // Inngest state; acceptable here, but don't log it.
      const reviewKey = await step.run("resolve-review-key", async () => {
        return resolveReviewKey(installationId);
      });

      if (reviewKey.kind === "quota-exceeded") {
        const comment =
          `MG7 free tier: monthly limit of ${FREE_MONTHLY_REVIEW_LIMIT} reviews reached. ` +
          "Add your own OpenRouter API key in Settings to keep reviews running.";

        await step.run("post-quota-comment", async () => {
          const [ownerName, repoName] = repoFullName.split("/");
          const app = getGithubApp();
          const octokit = await app.getInstallationOctokit(installationId);
          await octokit.rest.issues.createComment({
            owner: ownerName,
            repo: repoName,
            issue_number: prNumber,
            body: comment,
          });
        });

        await step.run("mark-quota-exceeded", async () => {
          return prisma.pullRequest.update({
            where: { id: pullRequestId },
            data: { status: "quota_exceeded" },
          });
        });

        return { skipped: "quota-exceeded", pullRequestId };
      }

      // Fetch the changed files (per-file patches) via an installation token and
      // format them file-by-file — the model can then reference files by name,
      // and the same per-file shape feeds the chunking/indexing stage later.
      const { diff, owner, repo, filePaths } = await step.run("fetch-diff", async () => {
        const [ownerName, repoName] = repoFullName.split("/");

        const files = await getPullRequestFiles(
          installationId,
          repoFullName,
          prNumber,
        );

        return {
          diff: formatPrFilesForReview(files),
          owner: ownerName,
          repo: repoName,
          filePaths: files.map((file) => file.filePath),
        };
      });

      if (!diff || diff.trim() === "") {
        const comment = "No code changes detected in this pull request.";

        await step.run("post-empty-review", async () => {
          const app = getGithubApp();
          const octokit = await app.getInstallationOctokit(installationId);
          await octokit.rest.pulls.createReview({
            owner,
            repo,
            pull_number: prNumber,
            event: "COMMENT",
            body: comment,
          });
        });

        await step.run("save-empty-review-to-db", async () => {
          return prisma.pullRequest.update({
            where: { id: pullRequestId },
            data: {
              status: "reviewed",
              reviewComment: comment,
              reviewedAt: new Date(),
            },
          });
        });

        return { reviewed: pullRequestId, comment: "empty" };
      }

      // RAG: pull related snippets from the synced codebase (Pinecone). The
      // query is the PR title plus changed file paths — enough signal to
      // surface callers, siblings, and duplicated logic. Empty when the repo
      // was never synced or Pinecone isn't configured; the review still runs.
      const repoContextSnippets = await step.run("search-repo-context", async () => {
        const query = `${pr.title}\n${filePaths.join("\n")}`;
        return getRepoContextSnippets(repoFullName, query);
      });

      // Generate reviewComment from the model via OpenRouter — on the user's
      // own key when they've set one, else the app's key.
      const reviewComment = await step.run("generate-review-comment", async () => {
        const openrouter = getOpenRouter(
          reviewKey.kind === "byok" ? reviewKey.apiKey : undefined,
        );
        const modelName = getReviewModelName();

        const response = await generateText({
          model: openrouter(modelName),
          system: `You are MG7, an advanced AI software engineer and code reviewer.
Analyze the provided Git diff of a pull request.
Generate a constructive, professional code review in Markdown format.

Structure your review with the following sections:
1. **Overview**: A brief 2-3 sentence summary of what this PR does and your overall impression.
2. **Major Bugs & Logic Errors**: Any correctness issues, bugs, or logic flaws. Be specific. If none, state "None detected."
3. **Security & Performance**: Any potential security vulnerabilities or performance concerns. If none, state "None detected."
4. **Suggestions for Improvement**: Code quality, readability, refactoring suggestions, or edge cases to consider.

Be concise, clear, and action-oriented. Focus on helpful feedback. Do not nitpick formatting (like whitespace, indentation, semicolons) unless it affects functionality or critical readability.

The prompt may include a "Related code from the repository" section — existing code retrieved for context. Use it to judge how the changes interact with the rest of the codebase (broken callers, duplicated logic, convention drift), but do NOT review that code itself; only the diff is under review.`,
          // The diff is already formatted per-file with its own ```diff fences
          // (see formatPrFilesForReview) — don't wrap it in another fence.
          prompt: `Here are the changed files for Pull Request #${prNumber} ("${pr.title}") in ${repoFullName}:\n\n${diff}${buildRepoContextSection(repoContextSnippets)}`,
        });

        return response.text;
      });

      // Post the review back onto the PR
      await step.run("post-github-review", async () => {
        const app = getGithubApp();
        const octokit = await app.getInstallationOctokit(installationId);
        await octokit.rest.pulls.createReview({
          owner,
          repo,
          pull_number: prNumber,
          event: "COMMENT",
          body: reviewComment,
        });
      });

      // Update status and save the reviewComment in the DB
      await step.run("save-review-to-db", async () => {
        return prisma.pullRequest.update({
          where: { id: pullRequestId },
          data: {
            status: "reviewed",
            reviewComment,
            reviewedAt: new Date(),
          },
        });
      });

      return { reviewed: pullRequestId };
    } catch (error) {
      // Handle failures by marking status as failed
      await step.run("mark-failed", async () => {
        try {
          return await prisma.pullRequest.update({
            where: { id: pullRequestId },
            data: { status: "failed" },
          });
        } catch {
          // ignore DB error in catch block to preserve original error
        }
      });
      throw error; // Rethrow to trigger Inngest retry mechanics
    }
  },
);

/**
 * Index a repo's codebase into Pinecone (fetch tree → chunk → upsert).
 *
 * Triggered from the repositories page. The review job then searches the
 * repo's namespace for context, so reviews of synced repos see related code
 * beyond the diff itself.
 */
export const syncRepoCodebase = inngest.createFunction(
  {
    id: "sync-repo-codebase",
    // One sync per repo at a time — a double-click shouldn't run two jobs
    // that race on the same namespace.
    concurrency: { key: "event.data.repoSyncId", limit: 1 },
    triggers: [repoSyncRequested],
  },
  async ({ event, step }) => {
    const { repoSyncId } = event.data;

    try {
      const repoSync = await step.run("mark-syncing", async () => {
        return prisma.repoSync.update({
          where: { id: repoSyncId },
          data: { status: "syncing" },
        });
      });

      const chunks = await step.run("fetch-and-chunk-codebase", async () => {
        const files = await getRepoFiles(
          repoSync.installationId,
          repoSync.repoFullName,
          repoSync.branch,
        );
        return chunkRepoFiles(files);
      });

      const namespace = buildRepoNamespace(repoSync.repoFullName);

      // On re-sync, drop the old vectors first so chunks from files that were
      // deleted or renamed since the last sync don't linger in search results.
      if (repoSync.syncedAt) {
        await step.run("delete-old-vectors", async () => {
          await deleteRepoNamespace(namespace);
        });
      }

      await step.run("save-vectors-to-pinecone", async () => {
        await saveRepoChunks(namespace, chunks);
      });

      await step.run("mark-synced", async () => {
        return prisma.repoSync.update({
          where: { id: repoSyncId },
          data: {
            status: "synced",
            syncedAt: new Date(),
            chunkCount: chunks.length,
          },
        });
      });

      return { repoSyncId, status: "synced", chunkCount: chunks.length };
    } catch (error) {
      await step.run("mark-sync-failed", async () => {
        try {
          return await prisma.repoSync.update({
            where: { id: repoSyncId },
            data: { status: "failed" },
          });
        } catch {
          // ignore DB error in catch block to preserve original error
        }
      });
      throw error;
    }
  },
);
