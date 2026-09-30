import type { Metadata } from "next";
import FeedRollingCards from "@/components/FeedRollingCards";

export const metadata: Metadata = {
  title: "Feed de Atualizações",
  description:
    "Feed contínuo com as atualizações mais recentes de dados e conteúdos do MaioAzul.",
  alternates: {
    canonical: "/feed",
  },
};

export default function FeedPage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-6xl space-y-6 px-6 pb-16 pt-2">
        <div className="pt-6">
          <h1 className="text-xl font-semibold">Feed</h1>
          <p className="hidden text-sm text-muted-foreground sm:block">
            Atualizações do portal de dados
          </p>
        </div>
        <FeedRollingCards />
      </section>
    </main>
  );
}
