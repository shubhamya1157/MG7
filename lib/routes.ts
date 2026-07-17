export const ROUTES = {
  home: "/",
  signIn: "/sign-in",
  dashboard: "/dashboard",
  dashboardReviews: "/dashboard/reviews",
  dashboardRepositories: "/dashboard/repositories",
  dashboardGithub: "/dashboard/github",
  dashboardSettings: "/dashboard/settings",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

/**
 * Dynamic route helper — kept separate from ROUTES so `AppRoute` stays a
 * union of const strings.
 */
export function reviewDetailRoute(id: string): string {
  return `${ROUTES.dashboardReviews}/${id}`;
}
