// Keep the upstream origin server-side; browsers use a same-origin proxy.
export async function GET(request: Request) {
  const origin =
    process.env.MAIO_API_URL ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3004"
      : "https://maio-open-data.vercel.app");
  try {
    const upstream = new URL("/api/v1/astronomy/sky-map", origin);
    upstream.search = new URL(request.url).search;
    const response = await fetch(upstream, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      if (response.status === 400)
        return Response.json(await response.json(), { status: 400 });
      return Response.json(
        {
          error: {
            message: "Maio API sky map is unavailable. Please try again.",
          },
        },
        { status: 502 },
      );
    }
    return new Response(await response.text(), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Sky-Source": "Maio API",
      },
    });
  } catch {
    return Response.json(
      { error: { message: "Cannot reach the Maio API. Please try again." } },
      { status: 502 },
    );
  }
}
