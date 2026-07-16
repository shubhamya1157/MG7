// importing hader for to send cookies to github to taake user details
import { headers } from "next/headers";
import { auth } from "@/lib/auth";


//type diclaration  in which formate i want user profile 
type GitHubProfile = {
  login: string;
  name: string | null;// may be not so set null 
  avatar_url: string | null; // may be not so set null 
  html_url: string;
};

//type diclaration  in which formate i want user repo details 
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



//it's return type is promise beacuse we are calling api it take time to respond and genric we 
//don' tknow which data type we use
async function githubFetch<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      //give data in json formate
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      //API Versioning
      "X-GitHub-Api-Version": "2022-11-28",
    },
    //optimization or caching send new api request after 1 min use cached data for now
    next: { revalidate: 60 },
  });


  // if(response.status>=200 && response.status<300)
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
