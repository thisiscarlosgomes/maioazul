import { NextResponse, type NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const FILE_PATH = path.join(
  process.cwd(),
  "public",
  "data",
  "map_pin_image_overrides.json"
);

type OverrideEntry = {
  image_url?: string;
  title?: string;
};
type OverrideMap = Record<string, OverrideEntry | string>;

const normalizeKey = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const isValidImageUrl = (value: string) =>
  /^https?:\/\//i.test(value) || value.startsWith("/");

async function readOverrides(): Promise<OverrideMap> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf-8");
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    return data as OverrideMap;
  } catch {
    return {};
  }
}

async function writeOverrides(data: OverrideMap) {
  await fs.writeFile(FILE_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

function normalizeEntry(raw: OverrideEntry | string | undefined): OverrideEntry {
  if (!raw) return {};
  if (typeof raw === "string") return { image_url: raw };
  return {
    image_url: typeof raw.image_url === "string" ? raw.image_url : undefined,
    title: typeof raw.title === "string" ? raw.title : undefined,
  };
}

export async function GET() {
  const data = await readOverrides();
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const inputKey = typeof body?.key === "string" ? body.key : "";
  const inputName = typeof body?.name === "string" ? body.name : "";
  const rawImage = typeof body?.image_url === "string" ? body.image_url : "";
  const imageUrl = rawImage.trim();
  const rawTitle = typeof body?.title === "string" ? body.title : "";
  const title = rawTitle.trim();

  const key = normalizeKey(inputKey || inputName);
  if (!key) {
    return NextResponse.json({ error: "key or name is required" }, { status: 400 });
  }

  if (imageUrl && !isValidImageUrl(imageUrl)) {
    return NextResponse.json(
      { error: "image_url must be an absolute URL or /path asset" },
      { status: 400 }
    );
  }

  try {
    const data = await readOverrides();
    const current = normalizeEntry(data[key]);
    const next: OverrideEntry = {
      ...(imageUrl ? { image_url: imageUrl } : current.image_url ? { image_url: current.image_url } : {}),
      ...(title ? { title } : current.title ? { title: current.title } : {}),
    };

    if (!next.image_url && !next.title) {
      delete data[key];
    } else {
      data[key] = next;
    }
    await writeOverrides(data);
    const saved = normalizeEntry(data[key]);
    return NextResponse.json({
      key,
      image_url: saved.image_url || null,
      title: saved.title || null,
    });
  } catch (err) {
    console.error("Failed to update map pin image overrides", err);
    return NextResponse.json(
      { error: "Failed to update map pin image overrides" },
      { status: 500 }
    );
  }
}
