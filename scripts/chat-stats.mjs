import path from "path";
import { promises as fs } from "fs";
import { MongoClient } from "mongodb";

const root = process.cwd();
const CHAT_USAGE_STATS_COLLECTION = "chat_usage_stats";

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
  const col = db.collection(CHAT_USAGE_STATS_COLLECTION);

  const [globalDoc, recentDaily] = await Promise.all([
    col.findOne(
      { _id: "global" },
      {
        projection: {
          _id: 0,
          kind: 1,
          requests_total: 1,
          successful_requests_total: 1,
          rate_limited_requests_total: 1,
          failed_requests_total: 1,
          user_messages_total: 1,
          assistant_messages_total: 1,
          tool_calls_total: 1,
          by_surface: 1,
          updatedAt: 1,
          lastMessageAt: 1,
        },
      },
    ),
    col
      .find(
        { kind: "daily" },
        {
          projection: {
            _id: 0,
            date: 1,
            requests_total: 1,
            successful_requests_total: 1,
            rate_limited_requests_total: 1,
            failed_requests_total: 1,
            user_messages_total: 1,
            assistant_messages_total: 1,
            tool_calls_total: 1,
          },
        },
      )
      .sort({ date: -1 })
      .limit(7)
      .toArray(),
  ]);

  await client.close();

  console.log(
    JSON.stringify(
      {
        global: globalDoc,
        recentDaily,
      },
      null,
      2,
    ),
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
