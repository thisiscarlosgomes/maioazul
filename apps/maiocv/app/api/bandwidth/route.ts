import { NextResponse, type NextRequest } from "next/server";
import { BANDWIDTH_COOKIE, bandwidthChoice } from "../../../lib/bandwidth";

export function GET(request: NextRequest) {
  const choice = bandwidthChoice(request.nextUrl.searchParams.get("mode"));
  const back = request.nextUrl.searchParams.get("return") || "/pt";
  const destination = back.startsWith("/") && !back.startsWith("//") ? back : "/pt";
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.set(BANDWIDTH_COOKIE, choice, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}
