import { generateText } from "ai";

import { openrouter } from "@/app/ai-sdk";
import { getGithubApp } from "@/app/dashboard/github/utils/github-app";
import {
  formatPrFilesForReview,
  getPullRequestFiles,
} from "@/app/dashboard/reviews/server/pr-files";
import { prisma } from "@/lib/db";
import { inngest, prReviewRequested } from "@/lib/inngest";

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

      // Fetch the changed files (per-file patches) via an installation token and
      // format them file-by-file — the model can then reference files by name,
      // and the same per-file shape feeds the chunking/indexing stage later.
      const { diff, owner, repo } = await step.run("fetch-diff", async () => {
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

      // Generate reviewComment from the model via OpenRouter
      const reviewComment = await step.run("generate-review-comment", async () => {
        const modelName = process.env.OPENROUTER_MODEL || "google/gemini-2.5-pro";

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

Be concise, clear, and action-oriented. Focus on helpful feedback. Do not nitpick formatting (like whitespace, indentation, semicolons) unless it affects functionality or critical readability.`,
          // The diff is already formatted per-file with its own ```diff fences
          // (see formatPrFilesForReview) — don't wrap it in another fence.
          prompt: `Here are the changed files for Pull Request #${prNumber} ("${pr.title}") in ${repoFullName}:\n\n${diff}`,
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
