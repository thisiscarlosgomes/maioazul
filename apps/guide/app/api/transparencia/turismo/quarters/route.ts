import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year") || 2025);

    const client = await clientPromise;
    const db = client.db();
    const col = db.collection("turismo_raw");

    const pipeline = [
      { $match: { year } },
      {
        $group: {
          _id: {
            ilha: "$ilha",
            quarter: "$quarter",
          },
          hospedes: { $sum: "$hospedes" },
          dormidas: { $sum: "$dormidas" },
        },
      },
      {
        $group: {
          _id: "$_id.ilha",
          quarters: {
            $push: {
              quarter: "$_id.quarter",
              hospedes: "$hospedes",
              dormidas: "$dormidas",
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const data = await col.aggregate(pipeline).toArray();

    return NextResponse.json({
      year,
      islands: data.map((d) => ({
        ilha: d._id,
        quarters: d.quarters,
      })),
      source: "INE Cabo Verde · Estatísticas do Turismo",
    });
  } catch (err) {
    console.error("[Tourism quarters API]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
