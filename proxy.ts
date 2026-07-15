// It check user is login or not withiut loading the page is it loged in then render the page



import { NextResponse,  NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { ROUTES } from "@/lib/routes";

//checking
export function proxy(request: NextRequest) {
  // const sessionCookie = request.cookies.get("session")?.value;

  //both are very diffrent
  //firest give just value
  //second also validate

  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {

    const signInUrl = new URL(ROUTES.signIn, request.url);
    signInUrl.searchParams.set(
      "redirect",
      request.nextUrl.pathname + request.nextUrl.search,

       // return NextResponse.redirect(
    //   "http://localhost:3000/sign-in"
    // );
    );

   
    return NextResponse.redirect(signInUrl);
  }



      // console.log("========== REQUEST ==========");
    // console.log("URL:", request.url);
    // console.log("Method:", request.method);
    // console.log("Path:", request.nextUrl.pathname);
    // console.log("Query:", request.nextUrl.search);
    // console.log("Headers:", [...request.headers.entries()]);
    // console.log("Cookies:", request.cookies.getAll());

  return NextResponse.next();
}

//where to apply
export const config = {
  //match only related to dasboard
  matcher: ["/dashboard/:path*"],

};


