import type { Metadata } from "next";
import SiteChatPage from "@/components/SiteChatPage";

export const metadata: Metadata = {
  title: "Chat",
  description:
    "Ask MaioAzul questions about tourism data, indicators, and dashboard metrics through the site chat.",
  alternates: {
    canonical: "/chat",
  },
  openGraph: {
    title: "MaioAzul Chat",
    description:
      "Chat with MaioAzul using server-side tourism and dashboard tools.",
    url: "/chat",
  },
};

export default function Page() {
  return <SiteChatPage />;
}
