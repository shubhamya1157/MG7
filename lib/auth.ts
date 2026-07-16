import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "@/lib/db";
import { serverEnv } from "@/lib/env";


export const auth = betterAuth({
 
  //after authorised by github where i send user
  baseURL: serverEnv.BETTER_AUTH_URL,
  //TO verify 
  secret: serverEnv.BETTER_AUTH_SECRET,

  //where to stroe sesson 
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

//To prevent csrf attack 
  trustedOrigins: [serverEnv.BETTER_AUTH_URL],

  socialProviders: {
    github: {
      //use to erify application not user user is verified by github 
      //and client id is for who i am
      //client secret for proving it 
      clientId: serverEnv.GITHUB_CLIENT_ID,
      clientSecret: serverEnv.GITHUB_CLIENT_SECRET,


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
    useSecureCookies: serverEnv.isProduction,
  },

  //better auth and nextjs internal so they can read and write easyly
  plugins: [nextCookies()],
});
