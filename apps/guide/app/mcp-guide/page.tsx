import type { Metadata } from "next";
import McpGuidePage from "@/components/McpGuidePage";

export const metadata: Metadata = {
  title: "MCP Guide",
  description:
    "Connect the Visit Maio MCP endpoint to ChatGPT, Claude, Cursor, and other MCP-compatible clients.",
  alternates: { canonical: "/mcp-guide" },
  openGraph: {
    title: "Visit Maio MCP Guide",
    description: "Instructions to connect Visit Maio MCP over streamable HTTP.",
    url: "/mcp-guide",
  },
};

export default function Page() {
  return <McpGuidePage />;
}
