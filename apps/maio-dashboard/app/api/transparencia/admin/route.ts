import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { isAdminAuthenticatedRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";

export async function GET(request: Request) {
  if (!isAdminAuthenticatedRequest(request)) {
    return unauthorizedAdminResponse();
  }

  const client = await clientPromise;
  const db = client.db();

  const docs = await db
    .collection("transparencia_raw")
    .find({})
    .sort({ updatedAt: -1 })
    .toArray();

  const cleaned = docs.map((d) => {
    const data = Array.isArray(d.data)
      ? d.data.filter((row) => row.MES !== null)
      : [];

    return {
      key: d.key,
      meta: d.meta,
      updatedAt: d.updatedAt,
      rows: data.length,
      sample: data.slice(0, 12),
    };
  });

  return NextResponse.json(cleaned);
}
