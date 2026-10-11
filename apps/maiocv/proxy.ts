import { NextResponse, type NextRequest } from "next/server";
import { BANDWIDTH_COOKIE, bandwidthMode } from "./lib/bandwidth";
import { essentialsSlug, LANG_COOKIE, isLocale, localize, localeFromPath, preferredLocale, stripLocale } from "./lib/locale";

const essentialsPages = new Set(Object.values(essentialsSlug));

function internalPath(pathname: string): string {
  const bare = stripLocale(pathname);
  const slug = bare.replace(/^\//, "");
  if (essentialsPages.has(slug)) return "/essentials";
  return bare;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const prefixed = localeFromPath(pathname);

  if (prefixed) {
    const slug = stripLocale(pathname).replace(/^\/|\/$/g, "");
    if (essentialsPages.has(slug) && slug !== essentialsSlug[prefixed]) {
      const canonical = request.nextUrl.clone();
      canonical.pathname = `/${prefixed}/${essentialsSlug[prefixed]}`;
      return NextResponse.redirect(canonical, 308);
    }
    const url = request.nextUrl.clone();
    url.pathname = internalPath(pathname);
    const headers = new Headers(request.headers);
    headers.set("x-maio-lang", prefixed);
    headers.set("x-maio-path", pathname);
    headers.set(
      "x-maio-bandwidth",
      bandwidthMode(request.cookies.get(BANDWIDTH_COOKIE)?.value, request.headers.get("save-data")),
    );
    const response = NextResponse.rewrite(url, { request: { headers } });
    response.cookies.set(LANG_COOKIE, prefixed, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  }

  const destination = request.nextUrl.clone();
  const cookie = request.cookies.get(LANG_COOKIE)?.value;
  const locale = isLocale(cookie) ? cookie : preferredLocale(request.headers.get("accept-language"));
  destination.pathname = pathname === "/" ? localize(locale, "/") : localize(locale, pathname);
  const response = NextResponse.redirect(destination, 307);
  response.headers.set("Vary", "Accept-Language, Cookie");
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
