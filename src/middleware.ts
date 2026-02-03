import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";

import { locales } from "./i18n/request";

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale: "en",
});

const isProtectedRoute = createRouteMatcher([
  "/(en|pl)/app(.*)",
  "/(en|pl)/admin(.*)",
  "/(en|pl)/create-organization(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    const { isAuthenticated, redirectToSignIn } = await auth();
    if (!isAuthenticated) {
      return redirectToSignIn();
    }
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: ["/", "/(en|pl)", "/(en|pl)/:path*"],
};
