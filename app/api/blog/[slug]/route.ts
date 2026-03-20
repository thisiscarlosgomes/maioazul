import { NextResponse } from "next/server";
import { getBlogPostBySlug } from "@/lib/blog/repository";

type Params = { params: { slug: string } };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { slug } = params;
    if (!slug || !slug.trim()) {
      return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
    }

    const item = await getBlogPostBySlug(slug.trim());
    if (!item) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    console.error("[blog] failed to load post", error);
    return NextResponse.json({ ok: false, error: "Failed to load post" }, { status: 500 });
  }
}
