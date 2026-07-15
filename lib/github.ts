import { headers } from "next/headers";

import { auth } from "@/lib/auth";

type GitHubProfile = {
  login: string;
  name: string | null;
  avatar_url: string | null;
  html_url: string;
};

type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  updated_at: string;
};

export type GitHubConnection = {
  profile: GitHubProfile | null;
  repos: GitHubRepo[];
  scopes: string[];
  error: string | null;
};

async function githubFetch<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`GitHub request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getGitHubConnection(): Promise<GitHubConnection> {
  try {
    const token = await auth.api.getAccessToken({
      body: { providerId: "github" },
      headers: await headers(),
    });

    if (!token.accessToken) {
      return {
        profile: null,
        repos: [],
        scopes: token.scopes ?? [],
        error: "GitHub access token was not stored. Sign in with GitHub again.",
      };
    }

    const [profile, repos] = await Promise.all([
      githubFetch<GitHubProfile>("/user", token.accessToken),
      githubFetch<GitHubRepo[]>(
        "/user/repos?per_page=6&sort=updated&affiliation=owner,collaborator,organization_member",
        token.accessToken,
      ),
    ]);

    return {
      profile,
      repos,
      scopes: token.scopes ?? [],
      error: null,
    };
  } catch (error) {
    return {
      profile: null,
      repos: [],
      scopes: [],
      error:
        error instanceof Error
          ? error.message
          : "Unable to fetch GitHub profile and repositories.",
    };
  }
}
