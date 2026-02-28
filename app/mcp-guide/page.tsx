import type { Metadata } from "next";
import McpGuidePage from "@/components/McpGuidePage";

export const metadata: Metadata = {
  title: "MCP Guide",
  description:
    "Connect the MaioAzul MCP endpoint to ChatGPT, Claude, Cursor, Gemini, VS Code, Windsurf, and other MCP-compatible clients.",
  alternates: {
    canonical: "/mcp-guide",
  },
  openGraph: {
    title: "MaioAzul MCP Guide",
    description:
      "Setup instructions for connecting MaioAzul MCP to your chatbot, IDE, or agent tool.",
    url: "/mcp-guide",
  },
  twitter: {
    card: "summary_large_image",
    title: "MaioAzul MCP Guide",
    description:
      "Setup instructions for connecting MaioAzul MCP to ChatGPT, Claude, Cursor, Gemini, and more.",
  },
};

export default function Page() {
  return <McpGuidePage />;
}
