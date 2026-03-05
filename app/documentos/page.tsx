import fs from "fs/promises";
import path from "path";
import type { Metadata } from "next";
import Image from "next/image";
import DashboardChatWidget from "@/components/DashboardChatWidget";

type DocumentItem = {
  name: string;
  href: string;
  modifiedAt: Date;
  displayName: string;
  title?: string;
};

type ManifestValue = string | { title?: string; name?: string };
type DocsManifest = Record<string, ManifestValue>;

export const metadata: Metadata = {
  title: "Documentos",
  description: "Lista de documentos PDF disponíveis para download.",
};

function toReadableName(fileName: string) {
  return fileName.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim();
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-PT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function getDocuments(): Promise<DocumentItem[]> {
  const docsDir = path.join(process.cwd(), "public", "docs");
  const manifestPath = path.join(docsDir, "manifest.json");

  let entries: string[] = [];
  try {
    entries = await fs.readdir(docsDir);
  } catch {
    return [];
  }

  let manifest: DocsManifest = {};
  try {
    const rawManifest = await fs.readFile(manifestPath, "utf8");
    manifest = JSON.parse(rawManifest) as DocsManifest;
  } catch {
    manifest = {};
  }

  const pdfNames = entries.filter((entry) => /\.pdf$/i.test(entry));

  const docs = await Promise.all(
    pdfNames.map(async (name) => {
      const filePath = path.join(docsDir, name);
      const stat = await fs.stat(filePath);
      const manifestEntry = manifest[name];
      const manifestLabel =
        typeof manifestEntry === "string" ? manifestEntry : manifestEntry?.title;
      const manifestName =
        typeof manifestEntry === "string" ? manifestEntry : manifestEntry?.name;
      const displayName = manifestName?.trim() || toReadableName(name);
      const title = manifestLabel?.trim();
      return {
        name,
        href: `/docs/${encodeURIComponent(name)}`,
        modifiedAt: stat.mtime,
        displayName,
        title: title && title !== displayName ? title : undefined,
      };
    })
  );

  return docs.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
}

export default async function DocumentosPage() {
  const documents = await getDocuments();

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <div
        className="absolute inset-0 z-0 bg-center bg-no-repeat opacity-[0.04] dark:opacity-[0.035]"
        style={{
          backgroundImage: "url('/maioazul.png')",
          backgroundSize: "300px",
        }}
      />
      <section className="relative z-10 mx-auto w-full max-w-6xl space-y-6 px-6 pb-16 pt-2">
        <header className="pt-6">
          <h1 className="text-xl font-semibold">Documentos</h1>
          <p className="hidden text-sm text-muted-foreground sm:block">
            Clique num ficheiro para descarregar o PDF.
          </p>
        </header>

        {documents.length === 0 ? (
          <div className="rounded-3xl border border-border bg-muted/20 p-8 text-sm text-muted-foreground">
            Nenhum documento PDF encontrado em <code>/public/docs</code>.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
            {documents.map((doc) => (
              <a
                key={doc.name}
                href={doc.href}
                download={doc.name}
                className="group flex h-full flex-col gap-5 rounded-[2rem] border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-foreground/20"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-border bg-[#0f1014] p-4">
                  <Image
                    src="/pdf.png"
                    alt="Documento PDF"
                    fill
                    className="object-contain p-4 transition duration-300 group-hover:scale-[1.02]"
                    sizes="(min-width: 1280px) 22vw, (min-width: 640px) 45vw, 92vw"
                  />
                </div>

                <div className="space-y-1">
                  <p className="line-clamp-2 text-base font-medium leading-tight text-foreground">
                    {doc.displayName}
                  </p>
                  {doc.title ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{doc.title}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">{formatDate(doc.modifiedAt)}</p>
                </div>
                <div className="pt-1">
                  <span className="inline-flex items-center rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground transition group-hover:bg-accent">
                    Download
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
      <DashboardChatWidget
        context={{ surface: "documentos" }}
        storageKey="maioazul-site-chat-documentos-v1"
      />
    </main>
  );
}
