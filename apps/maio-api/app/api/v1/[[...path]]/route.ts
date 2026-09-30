import snapshot from "@/data/snapshot.json";
import { ApiError, cors, jsonResponse, resolveApi } from "@/lib/api.mjs";
import { openapi } from "@/lib/openapi.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path?: string[] }> };
export async function GET(request: Request, context: Context) {
  try {
    const segments = (await context.params).path || [];
    const body =
      segments.length === 1 && segments[0] === "openapi.json"
        ? openapi(snapshot)
        : resolveApi(snapshot, segments, new URL(request.url).searchParams);
    return jsonResponse(
      body,
      request,
      ("dataKind" in body && body.dataKind === "calculated-ephemeris") || segments[0] === "astronomy" ? body.revision : snapshot.revision,
      200,
      "type" in body && ["Feature", "FeatureCollection"].includes(body.type),
    );
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    if (status === 500) console.error("Maio API request failed", error);
    return jsonResponse(
      {
        error: {
          status,
          message:
            error instanceof ApiError
              ? error.message
              : "Unable to read snapshot.",
        },
      },
      request,
      snapshot.revision,
      status,
    );
  }
}
export const HEAD = GET;
export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: { ...cors, "Access-Control-Max-Age": "86400" },
  });
}
function readOnly() {
  return new Response(
    JSON.stringify({
      error: { status: 405, message: "This API is read-only." },
    }),
    {
      status: 405,
      headers: {
        ...cors,
        Allow: "GET, HEAD, OPTIONS",
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
}
export const POST = readOnly;
export const PUT = readOnly;
export const PATCH = readOnly;
export const DELETE = readOnly;
