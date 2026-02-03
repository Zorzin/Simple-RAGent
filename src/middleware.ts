import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";

import { locales } from "./i18n/request";

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale: "en",
});

const isProtectedRoute = createRouteMatcher([
  "/(en|pl)/app(.*)",
  "/(en|pl)/admin(.*)",
  "/(en|pl)/create-organization(.*)",
  "/api/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;
  const isApiRoute = pathname.startsWith("/api");

  if (isProtectedRoute(req)) {
    const { isAuthenticated, redirectToSignIn } = await auth();
    if (!isAuthenticated) {
      return redirectToSignIn();
    }
  }

  if (isApiRoute) {
    return NextResponse.next();
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: ["/", "/(en|pl)", "/(en|pl)/:path*", "/api/:path*"],
};
