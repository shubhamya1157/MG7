export const ROUTES = {
  home: "/",
  signIn: "/sign-in",
  dashboard: "/dashboard",
  dashboardReviews: "/dashboard/reviews",
  dashboardRepositories: "/dashboard/repositories",
  dashboardGithub: "/dashboard/github",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
