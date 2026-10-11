import { NextResponse } from "next/server";
import { loadEssentials } from "../../../lib/essentials";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await loadEssentials(fetch));
}
