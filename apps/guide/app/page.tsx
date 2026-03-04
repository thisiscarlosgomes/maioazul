export default function GuideHome() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10 text-foreground">
      <section className="flex w-full max-w-md flex-col items-center gap-1">
        <h1 className="text-lg tracking-tight sm:text-xl">visit maio</h1>
        <a
          href="https://maioazul.com"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-foreground/70 underline-offset-4 hover:underline"
        >
          maioazul.com
        </a>
      </section>
    </main>
  );
}
