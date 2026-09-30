import snapshot from "@/data/snapshot.json";
import Explorer from "./explorer";
import { paths, type Geometry } from "@/lib/geometry";
export default function Home() {
  const base = snapshot.features
    .filter((f) =>
      f.properties.collections.some((c: string) =>
        ["trails"].includes(c),
      ),
    )
    .flatMap((f) => paths(f.geometry as Geometry));
  return (
    <Explorer
      collections={snapshot.collections}
      datasets={snapshot.datasets.map(({ id, title, scope, status }) => ({
        id,
        title,
        scope,
        status,
      }))}
      sources={snapshot.sources.map(
        ({ id, title, license, sourceUpdatedAt }) => ({
          id,
          title,
          license,
          sourceUpdatedAt,
        }),
      )}
      count={snapshot.features.length}
      revision={snapshot.revision}
      base={base}
    />
  );
}
