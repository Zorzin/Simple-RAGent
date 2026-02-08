import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { locales } from "./i18n/request";

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale: "en",
});

const protectedRoutes = [
  /^\/(en|pl)\/app(.*)/,
  /^\/(en|pl)\/admin(.*)/,
  /^\/(en|pl)\/create-organization(.*)/,
  /^\/api\/(.*)/,
];

const isProtectedRoute = (pathname: string) =>
  protectedRoutes.some((pattern) => pattern.test(pathname));

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApiRoute = pathname.startsWith("/api");
  const isAuthRoute = pathname.startsWith("/api/auth");

  if (isApiRoute || isAuthRoute) {
    return NextResponse.next();
  }

  if (isProtectedRoute(pathname)) {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    });
    if (!token) {
      const locale = pathname.split("/")[1] || "en";
      const signInUrl = new URL(`/${locale}/sign-in`, req.url);
      signInUrl.searchParams.set("callbackUrl", `${req.nextUrl.pathname}${req.nextUrl.search}`);
      return NextResponse.redirect(signInUrl);
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/", "/(en|pl)", "/(en|pl)/:path*", "/api/:path*"],
};
