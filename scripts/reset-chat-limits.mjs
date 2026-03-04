import path from "path";
import { promises as fs } from "fs";
import { MongoClient } from "mongodb";

const root = process.cwd();
const CHAT_RATE_LIMIT_COLLECTION = "chat_rate_limits";

async function loadEnvFile(filePath) {
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
}

await loadEnvFile(path.join(root, ".env.local"));
await loadEnvFile(path.join(root, ".env"));

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in env.");
  process.exit(1);
}

async function run() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  const db = process.env.MONGODB_DB ? client.db(process.env.MONGODB_DB) : client.db();
  const col = db.collection(CHAT_RATE_LIMIT_COLLECTION);

  const result = await col.deleteMany({});

  await client.close();

  console.log("Chat limits reset complete");
  console.log(`Deleted rate-limit records: ${result.deletedCount}`);
  console.log("All users now effectively have a fresh 10-message allowance.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
