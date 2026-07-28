import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE = "maio_admin_session";
const SESSION_TTL_SECONDS = 12 * 60 * 60;

function parseCookies(header: string | null) {
  if (!header) return new Map<string, string>();
  const pairs = header.split(";").map((part) => part.trim());
  const out = new Map<string, string>();
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx <= 0) continue;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    out.set(key, decodeURIComponent(value));
  }
  return out;
}

function base64url(input: string) {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64url(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + "=".repeat(padLength), "base64").toString("utf8");
}

function sign(payloadBase64: string, secret: string) {
  return createHmac("sha256", secret).update(payloadBase64).digest("hex");
}

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD?.trim() ?? "";
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET?.trim() || getAdminPassword();
}

export function isAdminAuthConfigured() {
  return Boolean(getAdminPassword()) && Boolean(getSessionSecret());
}

export function createAdminSessionToken() {
  const secret = getSessionSecret();
  if (!secret) return null;

  const payload = {
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const payloadBase64 = base64url(JSON.stringify(payload));
  const signature = sign(payloadBase64, secret);
  return `${payloadBase64}.${signature}`;
}

export function verifyAdminSessionToken(token: string | null | undefined) {
  if (!token) return false;
  const secret = getSessionSecret();
  if (!secret) return false;

  const [payloadBase64, signature] = token.split(".");
  if (!payloadBase64 || !signature) return false;

  const expected = sign(payloadBase64, secret);
  const sigBuf = Buffer.from(signature, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length) return false;
  if (!timingSafeEqual(sigBuf, expBuf)) return false;

  try {
    const payloadRaw = fromBase64url(payloadBase64);
    const payload = JSON.parse(payloadRaw) as { exp?: number };
    if (!payload.exp || !Number.isFinite(payload.exp)) return false;
    return payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function isAdminAuthenticatedRequest(request: Request) {
  const cookies = parseCookies(request.headers.get("cookie"));
  const token = cookies.get(ADMIN_SESSION_COOKIE);
  return verifyAdminSessionToken(token);
}

export function verifyAdminPassword(candidate: string | null | undefined) {
  const password = getAdminPassword();
  if (!password) return false;
  return (candidate ?? "") === password;
}

export function unauthorizedAdminResponse() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

