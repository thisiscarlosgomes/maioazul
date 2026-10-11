export const CHATGPT_URL =
  "https://chatgpt.com/plugins/plugin_asdk_app_6ac76289c1ec8191aea7b978594d4e51";

export const initiatives = [
  { id: "visit", href: "https://visitmaio.com" },
  { id: "portal", href: "https://portal.maio.cv" },
  { id: "api", href: "https://api.maio.cv" },
  { id: "mcp", href: "/mcp" },
] as const;

export type InitiativeId = (typeof initiatives)[number]["id"];
