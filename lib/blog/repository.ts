import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import type { BlogPostStatus, MetricBlogPost, MetricFact } from "@/lib/blog/types";

export const BLOG_POSTS_COLLECTION = "metric_blog_posts";

function slugify(value: string) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function sanitizeSlug(value: string) {
  return slugify(value);
}

function getDb(client: Awaited<typeof clientPromise>) {
  const dbName = process.env.MONGODB_DB?.trim();
  return dbName ? client.db(dbName) : client.db();
}

type BlogPostDoc = {
  _id: ObjectId;
  slug?: string;
  title?: string;
  summary?: string;
  bodyMd?: string;
  heroImageUrl?: string | null;
  heroImageAlt?: string | null;
  metricKeys?: string[];
  year?: number | null;
  sourceDataset?: string;
  facts?: MetricFact[];
  status?: BlogPostStatus;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  publishedAt?: Date | string | null;
};

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

function mapBlogPost(doc: BlogPostDoc): MetricBlogPost {
  return {
    id: String(doc._id),
    slug: String(doc.slug ?? ""),
    title: String(doc.title ?? ""),
    summary: String(doc.summary ?? ""),
    bodyMd: String(doc.bodyMd ?? ""),
    heroImageUrl: doc.heroImageUrl ? String(doc.heroImageUrl) : null,
    heroImageAlt: doc.heroImageAlt ? String(doc.heroImageAlt) : null,
    metricKeys: Array.isArray(doc.metricKeys) ? doc.metricKeys.map(String) : [],
    year: typeof doc.year === "number" ? doc.year : null,
    sourceDataset: String(doc.sourceDataset ?? "maio_core_metrics"),
    facts: Array.isArray(doc.facts)
      ? doc.facts
          .filter((item) => item && typeof item === "object")
          .map((item) => ({
            label: String(item.label ?? ""),
            value: Number(item.value ?? 0),
            unit: item.unit ? String(item.unit) : null,
            context: item.context ? String(item.context) : null,
          }))
      : [],
    status:
      doc.status === "published" || doc.status === "approved" || doc.status === "draft"
        ? doc.status
        : "draft",
    createdAt: toIso(doc.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIso(doc.updatedAt) ?? new Date(0).toISOString(),
    publishedAt: toIso(doc.publishedAt),
  };
}

export async function ensureBlogPostIndexes() {
  const client = await clientPromise;
  const db = getDb(client);
  const col = db.collection(BLOG_POSTS_COLLECTION);

  await Promise.all([
    col.createIndex({ slug: 1 }, { unique: true }),
    col.createIndex({ status: 1, publishedAt: -1, updatedAt: -1 }),
    col.createIndex({ metricKeys: 1 }),
    col.createIndex({ createdAt: -1 }),
  ]);
}

export async function listBlogPosts(params?: {
  status?: BlogPostStatus | "all";
  limit?: number;
}) {
  await ensureBlogPostIndexes();
  const client = await clientPromise;
  const db = getDb(client);
  const col = db.collection<BlogPostDoc>(BLOG_POSTS_COLLECTION);

  const limit = Math.max(1, Math.min(100, Math.floor(params?.limit ?? 20)));
  const status = params?.status ?? "published";
  const query =
    status === "all" ? {} : ({ status } as { status: BlogPostStatus });

  const docs = await col
    .find(query)
    .sort(status === "published" ? { publishedAt: -1, updatedAt: -1 } : { updatedAt: -1 })
    .limit(limit)
    .toArray();

  return docs.map(mapBlogPost);
}

export async function getBlogPostBySlug(slug: string) {
  await ensureBlogPostIndexes();
  const client = await clientPromise;
  const db = getDb(client);
  const col = db.collection<BlogPostDoc>(BLOG_POSTS_COLLECTION);
  const doc = await col.findOne({ slug });
  return doc ? mapBlogPost(doc) : null;
}

export async function getBlogPostById(id: string) {
  await ensureBlogPostIndexes();
  const client = await clientPromise;
  const db = getDb(client);
  const col = db.collection<BlogPostDoc>(BLOG_POSTS_COLLECTION);

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return null;
  }

  const doc = await col.findOne({ _id: objectId });
  return doc ? mapBlogPost(doc) : null;
}

export async function updateBlogPostStatus(id: string, status: BlogPostStatus) {
  await ensureBlogPostIndexes();
  const client = await clientPromise;
  const db = getDb(client);
  const col = db.collection(BLOG_POSTS_COLLECTION);

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return false;
  }

  const now = new Date();
  const result = await col.updateOne(
    { _id: objectId },
    {
      $set: {
        status,
        updatedAt: now,
        ...(status === "published" ? { publishedAt: now } : {}),
      },
      ...(status !== "published" ? { $unset: { publishedAt: "" } } : {}),
    }
  );

  return result.modifiedCount > 0;
}

export async function deleteBlogPost(id: string) {
  await ensureBlogPostIndexes();
  const client = await clientPromise;
  const db = getDb(client);
  const col = db.collection(BLOG_POSTS_COLLECTION);

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return false;
  }

  const result = await col.deleteOne({ _id: objectId });
  return result.deletedCount > 0;
}

export async function updateBlogPostContent(
  id: string,
  payload: {
    slug?: string | null;
    title: string;
    summary: string;
    bodyMd: string;
    heroImageUrl?: string | null;
    heroImageAlt?: string | null;
  }
) {
  await ensureBlogPostIndexes();
  const client = await clientPromise;
  const db = getDb(client);
  const col = db.collection(BLOG_POSTS_COLLECTION);

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return false;
  }

  const nextSlug =
    typeof payload.slug === "string" && payload.slug.trim()
      ? sanitizeSlug(payload.slug.trim())
      : null;

  if (nextSlug) {
    const existing = await col.findOne(
      { slug: nextSlug, _id: { $ne: objectId } },
      { projection: { _id: 1 } }
    );
    if (existing) {
      throw new Error("Slug already exists");
    }
  }

  const result = await col.updateOne(
    { _id: objectId },
    {
      $set: {
        ...(nextSlug ? { slug: nextSlug } : {}),
        title: payload.title,
        summary: payload.summary,
        bodyMd: payload.bodyMd,
        heroImageUrl: payload.heroImageUrl ?? null,
        heroImageAlt: payload.heroImageAlt ?? null,
        updatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
}

export async function updateBlogPostImage(
  id: string,
  payload: { heroImageUrl: string | null; heroImageAlt: string | null }
) {
  await ensureBlogPostIndexes();
  const client = await clientPromise;
  const db = getDb(client);
  const col = db.collection(BLOG_POSTS_COLLECTION);

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return false;
  }

  const result = await col.updateOne(
    { _id: objectId },
    {
      $set: {
        heroImageUrl: payload.heroImageUrl ?? null,
        heroImageAlt: payload.heroImageAlt ?? null,
        updatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
}

async function makeUniqueSlug(
  title: string,
  col: Awaited<ReturnType<typeof getBlogPostsCollection>>
) {
  const base = slugify(title) || `artigo-${Date.now()}`;
  let next = base;
  for (let i = 0; i < 40; i += 1) {
    const exists = await col.countDocuments({ slug: next }, { limit: 1 });
    if (!exists) return next;
    next = `${base.slice(0, 84)}-${i + 1}`;
  }
  return `${base.slice(0, 70)}-${Date.now()}`;
}

async function slugExists(
  col: Awaited<ReturnType<typeof getBlogPostsCollection>>,
  slug: string
) {
  const existing = await col.findOne({ slug }, { projection: { _id: 1 } });
  return Boolean(existing);
}

async function getBlogPostsCollection() {
  await ensureBlogPostIndexes();
  const client = await clientPromise;
  const db = getDb(client);
  return db.collection(BLOG_POSTS_COLLECTION);
}

export async function createBlogPost(payload: {
  title: string;
  summary: string;
  bodyMd: string;
  slug?: string | null;
  year?: number | null;
  sourceDataset?: string;
  status?: BlogPostStatus;
  heroImageUrl?: string | null;
  heroImageAlt?: string | null;
}) {
  const col = await getBlogPostsCollection();
  const now = new Date();
  const requestedSlug =
    typeof payload.slug === "string" && payload.slug.trim()
      ? sanitizeSlug(payload.slug.trim())
      : null;
  const slug = requestedSlug || (await makeUniqueSlug(payload.title, col));

  if (requestedSlug && (await slugExists(col, requestedSlug))) {
    throw new Error("Slug already exists");
  }

  const doc = {
    slug,
    title: payload.title,
    summary: payload.summary,
    bodyMd: payload.bodyMd,
    heroImageUrl: payload.heroImageUrl ?? null,
    heroImageAlt: payload.heroImageAlt ?? null,
    metricKeys: [] as string[],
    year: typeof payload.year === "number" ? payload.year : null,
    sourceDataset: payload.sourceDataset?.trim() || "manual_editor",
    facts: [] as MetricFact[],
    status: payload.status ?? "draft",
    createdAt: now,
    updatedAt: now,
    publishedAt: payload.status === "published" ? now : null,
  };

  const res = await col.insertOne(doc);
  if (!res.insertedId) return null;
  return {
    id: String(res.insertedId),
    slug,
  };
}
