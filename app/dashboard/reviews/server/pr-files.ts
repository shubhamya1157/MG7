/**
 * Fetch and format a pull request's changed files for the review prompt.
 *
 * Instead of one monolithic raw diff, we ask GitHub for the *per-file* patches
 * (`GET /pulls/{n}/files`). That gives us each file's path alongside its diff,
 * so the prompt can present changes file-by-file — the model references files
 * by name in its feedback, and later stages can chunk/index per file.
 *
 * SERVER-ONLY: mints installation tokens via the GitHub App.
 */

import { getGithubApp } from "@/app/dashboard/github/utils/github-app";
import type { PrFile } from "@/app/dashboard/reviews/types";

const FILES_PER_PAGE = 100;

/** Formats PR file patches into a markdown diff section for the review prompt. */
export function formatPrFilesForReview(files: PrFile[]): string {
  return files
    .map((file) => `### ${file.filePath}\n\`\`\`diff\n${file.patch}\n\`\`\``)
    .join("\n\n");
}

/**
 * List the PR's changed files with their patches.
 *
 * Files without a `patch` (binary files, or diffs GitHub deems too large to
 * inline) are skipped — there is nothing textual to review for them.
 */
export async function getPullRequestFiles(
  installationId: number,
  repoFullName: string,
  prNumber: number,
): Promise<PrFile[]> {
  const app = getGithubApp();
  const octokit = await app.getInstallationOctokit(installationId);
  const [owner, repo] = repoFullName.split("/");

  const { data } = await octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}/files",
    { owner, repo, pull_number: prNumber, per_page: FILES_PER_PAGE },
  );

  const files: PrFile[] = [];

  for (const file of data) {
    if (!file.patch) {
      continue;
    }

    files.push({ filePath: file.filename, patch: file.patch });
  }

  return files;
}
