import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import type { BlogPostStatus, MetricBlogPost, MetricFact } from "@/lib/blog/types";

export const BLOG_POSTS_COLLECTION = "metric_blog_posts";

type BlogPostDoc = {
  _id: ObjectId;
  slug?: string;
  title?: string;
  summary?: string;
  bodyMd?: string;
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
  const db = client.db(process.env.MONGODB_DB || "maioazul");
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
  const db = client.db(process.env.MONGODB_DB || "maioazul");
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
  const db = client.db(process.env.MONGODB_DB || "maioazul");
  const col = db.collection<BlogPostDoc>(BLOG_POSTS_COLLECTION);
  const doc = await col.findOne({ slug });
  return doc ? mapBlogPost(doc) : null;
}

export async function updateBlogPostStatus(id: string, status: BlogPostStatus) {
  await ensureBlogPostIndexes();
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "maioazul");
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
