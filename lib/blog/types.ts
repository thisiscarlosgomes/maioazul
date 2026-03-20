export type BlogPostStatus = "draft" | "approved" | "published";

export type MetricFact = {
  label: string;
  value: number;
  unit?: string | null;
  context?: string | null;
};

export type MetricBlogPost = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  bodyMd: string;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  metricKeys: string[];
  year: number | null;
  sourceDataset: string;
  facts: MetricFact[];
  status: BlogPostStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};
