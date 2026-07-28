import { promises as fs } from "fs";
import path from "path";
import { MongoClient } from "mongodb";

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

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "maioazul";

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in env.");
  process.exit(1);
}

const experienceImagesPath = path.join(
  root,
  "public",
  "data",
  "experience_images.json"
);

const experienceGroupsPath = path.join(
  root,
  "public",
  "data",
  "experience_places_by_slug.json"
);

const main = async () => {
  const [imagesRaw, groupsRaw] = await Promise.all([
    fs.readFile(experienceImagesPath, "utf8"),
    fs.readFile(experienceGroupsPath, "utf8"),
  ]);

  const images = JSON.parse(imagesRaw);
  const groups = JSON.parse(groupsRaw);

  if (!Array.isArray(images) || !Array.isArray(groups)) {
    throw new Error("Experience source files are not valid arrays.");
  }

  const deleteMissing = process.argv.includes("--delete-missing");

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB);

  const imagesCol = db.collection("experience_images");
  const groupsCol = db.collection("experience_groups");

  const syncCollection = async ({
    collection,
    docs,
    key,
  }) => {
    const existing = await collection
      .find({}, { projection: { _id: 0, [key]: 1 } })
      .toArray();
    const existingKeys = new Set(existing.map((doc) => doc?.[key]).filter(Boolean));

    const toInsert = docs.filter((doc) => doc?.[key] && !existingKeys.has(doc[key]));
    const toUpdate = docs.filter((doc) => doc?.[key] && existingKeys.has(doc[key]));

    let inserted = 0;
    let updated = 0;
    let deleted = 0;

    if (toInsert.length) {
      await collection.insertMany(toInsert);
      inserted = toInsert.length;
    }

    for (const doc of toUpdate) {
      const res = await collection.updateOne({ [key]: doc[key] }, { $set: doc });
      if (res.modifiedCount > 0) updated += 1;
    }

    if (deleteMissing) {
      const docKeys = new Set(docs.map((doc) => doc?.[key]).filter(Boolean));
      const res = await collection.deleteMany({ [key]: { $nin: Array.from(docKeys) } });
      deleted = res.deletedCount || 0;
    }

    return { inserted, updated, deleted };
  };

  const [imagesStats, groupsStats] = await Promise.all([
    syncCollection({ collection: imagesCol, docs: images, key: "id" }),
    syncCollection({ collection: groupsCol, docs: groups, key: "slug" }),
  ]);

  await client.close();

  console.log(
    [
      `experience_images -> inserted ${imagesStats.inserted}, updated ${imagesStats.updated}`,
      deleteMissing ? `, deleted ${imagesStats.deleted}` : "",
      ` | experience_groups -> inserted ${groupsStats.inserted}, updated ${groupsStats.updated}`,
      deleteMissing ? `, deleted ${groupsStats.deleted}` : "",
    ].join("")
  );
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
