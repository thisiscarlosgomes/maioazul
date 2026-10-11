import { NextResponse } from "next/server";
import { loadAgora } from "../../../lib/agora";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await loadAgora(fetch));
}
