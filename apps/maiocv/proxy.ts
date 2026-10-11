import { NextResponse, type NextRequest } from "next/server";
import { LANG_COOKIE, isLocale, localize, localeFromPath, preferredLocale, stripLocale } from "./lib/locale";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const prefixed = localeFromPath(pathname);

  if (prefixed) {
    const url = request.nextUrl.clone();
    url.pathname = stripLocale(pathname);
    const headers = new Headers(request.headers);
    headers.set("x-maio-lang", prefixed);
    headers.set("x-maio-path", pathname);
    const response = NextResponse.rewrite(url, { request: { headers } });
    response.cookies.set(LANG_COOKIE, prefixed, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  }

  const destination = request.nextUrl.clone();
  if (pathname === "/") {
    const cookie = request.cookies.get(LANG_COOKIE)?.value;
    const locale = isLocale(cookie) ? cookie : preferredLocale(request.headers.get("accept-language"));
    destination.pathname = localize(locale, "/");
  } else {
    destination.pathname = localize("pt", pathname);
  }
  return NextResponse.redirect(destination, 308);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
