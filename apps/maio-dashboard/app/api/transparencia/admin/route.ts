// app/api/transparencia/admin/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
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
