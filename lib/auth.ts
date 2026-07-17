import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "@/lib/db";

// read auth config straight from process.env (lib/env.ts was removed);
// fail fast at startup if any required value is missing
const betterAuthUrl = process.env.BETTER_AUTH_URL;
const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

if (!betterAuthUrl) throw new Error("Missing BETTER_AUTH_URL");
if (!betterAuthSecret) throw new Error("Missing BETTER_AUTH_SECRET");
if (!githubClientId) throw new Error("Missing GITHUB_CLIENT_ID");
if (!githubClientSecret) throw new Error("Missing GITHUB_CLIENT_SECRET");


export const auth = betterAuth({

  //after authorised by github where i send user
  baseURL: betterAuthUrl,
  //TO verify
  secret: betterAuthSecret,

  //where to stroe sesson 
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

//To prevent csrf attack
  trustedOrigins: [betterAuthUrl],

  socialProviders: {
    github: {
      //use to erify application not user user is verified by github 
      //and client id is for who i am
      //client secret for proving it 
      clientId: githubClientId,
      clientSecret: githubClientSecret,


      //asking to the permision of sharing repo it come in github to share which repo you want to give permission
      //it also follow principle of least privilege.
      scope: ["repo"],
      

      //when github send information what information is saved in db if not mean private so it
      //sent null then what to store so later on wwe can display
      mapProfileToUser: async (profile) => ({
        email: profile.email ?? `${profile.id}@user.noreply.github.com`,
        name: profile.name ?? profile.login,
      }),
    },
  },

 
  session: {
  
    //session expaired in 7day
    expiresIn: 60 * 60 * 24 * 7, 
  
    //it extand 1day validity if we in present day left if come daily or in given time period
    updateAge: 60 * 60 * 24, 
  
    //caching for avoid db quayry for 5 min
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, 
    },
  },

  //Only send cookies when https only not in http
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },

  //better auth and nextjs internal so they can read and write easyly
  plugins: [nextCookies()],
});
