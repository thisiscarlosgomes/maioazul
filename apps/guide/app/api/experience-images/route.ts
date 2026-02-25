import { NextResponse, type NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";

type ExperienceImage = {
  id: string;
  title: string;
  subtitle?: { en?: string; pt?: string };
  image: string;
};

const FILE_PATH = path.join(
  process.cwd(),
  "public",
  "data",
  "experience_images.json"
);

const isValidImageUrl = (value: string) =>
  /^https?:\/\//i.test(value) || value.startsWith("/");

async function readItems(): Promise<ExperienceImage[]> {
  const raw = await fs.readFile(FILE_PATH, "utf-8");
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

async function writeItems(items: ExperienceImage[]) {
  await fs.writeFile(FILE_PATH, `${JSON.stringify(items, null, 2)}\n`, "utf-8");
}

export async function GET() {
  try {
    const items = await readItems();
    return NextResponse.json(items);
  } catch (err) {
    console.error("Failed to read experience images", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  const image = typeof body?.image === "string" ? body.image.trim() : "";
  const title = typeof body?.title === "string" ? body.title.trim() : "";

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  if (!image && !title) {
    return NextResponse.json(
      { error: "Provide at least one field: image or title" },
      { status: 400 }
    );
  }
  if (image && !isValidImageUrl(image)) {
    return NextResponse.json(
      { error: "image must be an absolute URL or /path asset" },
      { status: 400 }
    );
  }

  try {
    const items = await readItems();
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const updated = {
      ...items[index],
      ...(image ? { image } : {}),
      ...(title ? { title } : {}),
    };
    items[index] = updated;
    await writeItems(items);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to update experience image", err);
    return NextResponse.json(
      { error: "Failed to update experience image" },
      { status: 500 }
    );
  }
}
