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
]);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) {
    auth().protect();
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: ["/", "/(en|pl)/:path*"],
};
