import Link from "next/link";

const items = [
  {
    title: "Fresh Fish from Maio",
    category: "Fish & Seafood",
    description: "Daily local catch, sourced directly from fishermen.",
    status: "Available",
    slug: "fresh-fish",
  },
  {
    title: "Guided Fishing",
    category: "Experience",
    description: "Fish with locals using traditional methods.",
    status: "Coming soon",
    slug: "guided-fishing",
  },
];

export default function Directory() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-20 space-y-12">

      <section className="space-y-4">
        <h1 className="text-3xl text-primary">
          Local businesses & experiences
        </h1>
        <p className="max-w-xl text-textMuted">
          A growing directory of Maio-based food, activities, and initiatives.
        </p>
      </section>

      <section className="space-y-4">
        {items.map((item) => (
          <Link
            key={item.slug}
            href={`/experiences/${item.slug}`}
            className="border border-blue-100 p-6 flex justify-between hover:bg-primarySoft transition"
          >
            <div>
              <span className="text-xs text-accent uppercase">
                {item.category}
              </span>
              <h2 className="text-lg text-primary mt-1">
                {item.title}
              </h2>
              <p className="text-sm text-textMuted mt-2">
                {item.description}
              </p>
            </div>

            <span className="text-xs text-primary">
              {item.status}
            </span>
          </Link>
        ))}
      </section>

    </main>
  );
}
