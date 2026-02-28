import type { Metadata } from "next";
import DashboardChatWidget from "@/components/DashboardChatWidget";
import McpGuidePage from "@/components/McpGuidePage";

export const metadata: Metadata = {
  title: "Guia MCP",
  description:
    "Ligue o endpoint MCP do Maioazul ao ChatGPT, Claude, Cursor, Gemini, VS Code, Windsurf e outros clientes compatíveis com MCP.",
  alternates: {
    canonical: "/mcp-guide",
  },
  openGraph: {
    title: "Guia MCP Maioazul",
    description:
      "Instruções para ligar o MCP do Maioazul ao seu chatbot, IDE ou ferramenta de agente.",
    url: "/mcp-guide",
  },
  twitter: {
    card: "summary_large_image",
    title: "Guia MCP Maioazul",
    description:
      "Instruções para ligar o MCP do Maioazul ao ChatGPT, Claude, Cursor, Gemini e mais.",
  },
};

export default function Page() {
  return (
    <>
      <McpGuidePage />
      <DashboardChatWidget />
    </>
  );
}
