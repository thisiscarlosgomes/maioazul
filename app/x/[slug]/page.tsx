export default function Experience({
  params,
}: {
  params: { slug: string };
}) {
  const title = params.slug.replace("-", " ");

  return (
    <main className="max-w-3xl mx-auto px-6 py-20 space-y-12">

      <section className="space-y-4">
        <span className="text-xs text-accent uppercase">
          Experience
        </span>

        <h1 className="text-4xl text-primary capitalize">
          {title}
        </h1>

        <p className="text-textMuted max-w-xl">
          Detailed information about this experience will live here.
          Availability may vary depending on conditions.
        </p>
      </section>

      <section className="space-y-6">
        <div>
          <h3 className="text-primary">What</h3>
          <p className="text-textMuted">
            Description of the experience or product.
          </p>
        </div>

        <div>
          <h3 className="text-primary">When</h3>
          <p className="text-textMuted">
            Daily / On request
          </p>
        </div>

        <div>
          <h3 className="text-primary">Where</h3>
          <p className="text-textMuted">
            Maio island
          </p>
        </div>
      </section>

      <a
        href="https://wa.me/XXXXXXXX"
        className="inline-block bg-primary text-white px-8 py-4"
      >
        Request via WhatsApp
      </a>

    </main>
  );
}
