import type { Metadata } from "next";
import McpGuidePage from "@/components/McpGuidePage";

export const metadata: Metadata = {
  title: "MCP Guide",
  description:
    "Connect the Visit Maio MCP endpoint to ChatGPT, Claude, Cursor, and other MCP-compatible clients.",
  alternates: { canonical: "/mcp-guide" },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Visit Maio MCP Guide",
    description: "Instructions to connect Visit Maio MCP over streamable HTTP.",
    url: "/mcp-guide",
  },
  twitter: {
    card: "summary_large_image",
    title: "Visit Maio MCP Guide",
    description: "Instructions to connect Visit Maio MCP over streamable HTTP.",
    images: ["https://www.visit-maio.com/cover.jpg"],
  },
};

export default function Page() {
  return <McpGuidePage />;
}
