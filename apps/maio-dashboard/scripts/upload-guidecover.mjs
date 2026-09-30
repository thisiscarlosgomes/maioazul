import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const root = process.cwd();

const loadEnvFile = async (filePath) => {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .forEach((line) => {
        const idx = line.indexOf("=");
        const key = line.slice(0, idx).trim();
        let value = line.slice(idx + 1).trim();
        if (
          (value.startsWith("\"") && value.endsWith("\"")) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      });
  } catch {
    // ignore missing env files
  }
};

await loadEnvFile(path.join(root, ".env.local"));
await loadEnvFile(path.join(root, ".env"));

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error(
    "Missing Cloudinary env vars. Need CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
  );
  process.exit(1);
}

const coverCandidates = [
  path.join(root, "public", "guidecover.jpg"),
  path.join(root, "apps", "guide", "public", "guidecover.jpg"),
];

const sign = (params) => {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(sorted + API_SECRET).digest("hex");
};

const uploadImage = async (filePath) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    folder: "guide",
    public_id: "guidecover",
    overwrite: "true",
    timestamp: String(timestamp),
  };
  const signature = sign(params);

  const buffer = await fs.readFile(filePath);
  const form = new FormData();
  form.append("file", new Blob([buffer]), path.basename(filePath));
  form.append("folder", params.folder);
  form.append("public_id", params.public_id);
  form.append("overwrite", params.overwrite);
  form.append("timestamp", params.timestamp);
  form.append("api_key", API_KEY);
  form.append("signature", signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: form,
    }
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Upload failed (${res.status}): ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.secure_url;
};

const main = async () => {
  let coverPath = null;
  for (const candidate of coverCandidates) {
    const exists = await fs
      .access(candidate)
      .then(() => true)
      .catch(() => false);
    if (exists) {
      coverPath = candidate;
      break;
    }
  }
  if (!coverPath) {
    console.error(`Missing file: guidecover.jpg (checked public and apps/guide/public)`);
    process.exit(1);
  }

  const secureUrl = await uploadImage(coverPath);
  const optimized = secureUrl.replace("/upload/", "/upload/f_auto,q_auto/");
  console.log(optimized);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
