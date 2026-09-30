"use client";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Braces,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Database,
  Globe2,
  Layers,
  MapPin,
  Search,
  Terminal,
  Waves,
  X,
} from "lucide-react";
import { paths, project, type Geometry } from "@/lib/geometry";
type Collection = {
  id: string;
  title: string;
  description: string;
  count: number;
  status: string;
};
type Feature = {
  id: string;
  geometry: Geometry;
  bbox?: number[];
  properties: {
    name: string | Record<string, string> | null;
    displayName?: string;
    collections: string[];
    sourceIds: string[];
    geometryStatus: string;
    lifecycleStatus?: "planned";
    attributes: Record<string, unknown>;
  };
};
type Result = {
  features: Feature[];
  numberMatched: number;
  numberReturned: number;
  links: { next: string | null; previous: string | null };
};
type Props = {
  collections: Collection[];
  datasets: { id: string; title: string; scope: string; status: string }[];
  sources: {
    id: string;
    title: string;
    license: string;
    sourceUpdatedAt: string | null;
  }[];
  count: number;
  revision: string;
  base: string[];
};
const nameOf = (f: Feature) =>
  f.properties.displayName || (typeof f.properties.name === "string"
    ? f.properties.name
    : f.properties.name?.en || f.properties.name?.pt || f.id);
const colors: Record<string, string> = {
  beaches: "#2684c5",
  "protected-areas": "#3c68a8",
  roads: "#567790",
  trails: "#699cda",
  businesses: "#555fa8",
  agriculture: "#3578b8",
  hydrology: "#319bbd",
  tourism: "#2672a4",
  settlements: "#597db4",
};
// Core geography, economy and public services first; visitor assets follow.
const sidebarOrder = [
  "localities", "settlements",
  "businesses", "business-statistics",
  "agriculture",
  "public-infrastructure", "schools", "health", "transport",
  "observations", "hydrology", "protected-areas", "natural-features",
  "sports", "tourism", "heritage", "beaches", "trails",
  "admin-boundaries", "government", "waste-infrastructure", "connectivity", "sensors",
];
export default function Explorer({
  collections,
  datasets,
  sources,
  count,
  revision,
  base,
}: Props) {
  const [collection, setCollection] = useState("beaches");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Feature | null>(null);
  const [view, setView] = useState<"map" | "json">("map");
  const [copied, setCopied] = useState(false);
  const [retry, setRetry] = useState(0);
  const visibleCollections = collections.filter(
    (c) => !["roads", "land-use", "zoning", "water-points"].includes(c.id),
  );
  const sidebarCollections = [...visibleCollections].sort((a, b) => {
    const plannedOrder = Number(a.status === "planned") - Number(b.status === "planned");
    const rank = (id: string) => {
      const index = sidebarOrder.indexOf(id);
      return index === -1 ? sidebarOrder.length : index;
    };
    return plannedOrder || rank(a.id) - rank(b.id) || a.title.localeCompare(b.title);
  });
  const current = collections.find((c) => c.id === collection)!;
  const endpoint = `/api/v1/collections/${collection}/items?limit=50&offset=${offset}${search ? `&q=${encodeURIComponent(search)}` : ""}`;
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      setResult(null);
      setSelected(null);
      try {
        const response = await fetch(endpoint, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error?.message || "Unable to load records.");
        setResult(data);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Unable to load records.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [endpoint, retry]);
  function choose(id: string) {
    setCollection(id);
    setOffset(0);
    setSearch("");
    setSelected(null);
    setResult(null);
    setLoading(true);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${endpoint}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Clipboard unavailable. Select and copy the endpoint below.");
    }
  }
  const color = colors[collection] || "#4685b3";
  return (
    <>
      <header className="header">
        <a className="brand" href="/" aria-label="Maio Open Data home">
          <span className="brand-mark">
            <Waves size={23} />
          </span>
          <strong>
            maio<span> / open data</span>
          </strong>
        </a>
        <nav aria-label="Main navigation">
          <a className="active" href="#explore">
            Explorer
          </a>
          <a href="#developers">Developers</a>
          <a href="#sources">Sources</a>
        </nav>
        <a className="header-api" href="/api/v1/openapi.json">
          API reference <ArrowUpRight size={15} />
        </a>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="dot" /> MAIO, CABO VERDE{" "}
              <span className="eyebrow-divider">/</span> PUBLIC DATA
              INFRASTRUCTURE
            </div>
            <h1>
              One island.
              <br />
              <span>A shared foundation.</span>
            </h1>
            <p>
              A digital representation of Maio. Its places, landscapes and
              infrastructure, connected through one public API.
            </p>
            <div className="hero-actions">
              <a className="primary" href="#explore">
                Explore the island <ArrowRight size={17} />
              </a>
              <a className="text-link" href="#developers">
                <Braces size={17} /> Build with the API
              </a>
            </div>
          </div>
          <div className="hero-note">
            <Globe2 size={30} strokeWidth={1} />
            <p>
              Local knowledge.
              <br />
              Open possibilities.
            </p>
            <span>
              For communities, researchers
              <br />
              and the people building what’s next.
            </span>
            <div className="coordinates">15.2300° N &nbsp; 23.1700° W</div>
          </div>
        </section>
        <section className="stats" aria-label="Snapshot statistics">
          <div>
            <strong>{count.toLocaleString("en-US")}</strong>
            <span>geographic & place records</span>
          </div>
          <div>
            <strong>
              {collections.filter((c) => c.count > 0).length}
              <small> / {collections.length}</small>
            </strong>
            <span>collections with data</span>
          </div>
          <div>
            <strong>{datasets.filter(d => d.status === "available").length.toString().padStart(2, "0")}</strong>
            <span>datasets with source data</span>
          </div>
          <div className="status-stat">
            <span className="status-pill">
              <span className="dot" /> PUBLIC READ ACCESS
            </span>
            <span>No API key required · Snapshot data</span>
          </div>
        </section>
        <section id="explore" className="explore-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">THE ISLAND, IN DATA</span>
              <h2>Explore the collections</h2>
            </div>
            <span className="subtle">
              <Layers size={14} /> WGS84 · GeoJSON
            </span>
          </div>
          <div className="workspace">
            <aside className="collections">
              <div className="panel-label">
                COLLECTIONS <span>{sidebarCollections.length}</span>
              </div>
              <div className="collection-list">
                {sidebarCollections.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => choose(c.id)}
                    aria-pressed={c.id === collection}
                    className={
                      c.id === collection ? "collection selected" : "collection"
                    }
                  >
                    <span
                      className="collection-dot"
                      style={{ background: colors[c.id] || "#789bb8" }}
                    />
                    <span>{c.title}</span>
                    {c.status === "planned" ? (
                      <small>SOON</small>
                    ) : (
                      <b>{c.count.toLocaleString("en-US")}</b>
                    )}
                  </button>
                ))}
              </div>
              <div className="collection-footer">
                <span className="dot" /> A growing picture of Maio
                <p>
                  Coverage follows the source data.
                  <br />
                  An empty layer is an invitation to contribute.
                </p>
              </div>
            </aside>
            <div className="explorer-main">
              <div className="explorer-toolbar">
                <div>
                  <h3>{current.title}</h3>
                  <span>{current.description}</span>
                </div>
                <div className="view-toggle" aria-label="Result view">
                  <button
                    aria-pressed={view === "map"}
                    onClick={() => setView("map")}
                  >
                    <MapPin size={14} /> Map
                  </button>
                  <button
                    aria-pressed={view === "json"}
                    onClick={() => setView("json")}
                  >
                    <Braces size={14} /> JSON
                  </button>
                </div>
              </div>
              <div className="search-row">
                <label className="search">
                  <Search size={16} />
                  <input
                    aria-label="Search collection"
                    placeholder={`Search ${current.title.toLowerCase()}…`}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setOffset(0);
                      setLoading(true);
                      setResult(null);
                      setSelected(null);
                    }}
                  />
                </label>
                <span aria-live="polite">
                  {loading
                    ? "Loading…"
                    : result
                      ? `${result.numberMatched.toLocaleString("en-US")} records`
                      : "Unavailable"}
                </span>
              </div>
              {collection === "business-statistics" && <p style={{ padding: "12px 20px", margin: 0 }}>
                IAE 2024 · Aggregate survey estimates for Maio. No company locations. Values below are rounded for display; the API preserves source precision. Turnover is in thousand CVE. “Not reported” does not mean zero.
              </p>}
              <div className="canvas">
                {view === "map" ? (
                  <>
                    <svg
                      className="island-map"
                      viewBox="0 0 560 650"
                      role="img"
                      aria-label={`Maio trail map with ${current.title.toLowerCase()} from the current results page`}
                    >
                      <defs>
                        <pattern
                          id="grid"
                          width="55"
                          height="55"
                          patternUnits="userSpaceOnUse"
                        >
                          <path
                            d="M 55 0 L 0 0 0 55"
                            fill="none"
                            stroke="#d4e2ee"
                            strokeWidth=".6"
                          />
                        </pattern>
                      </defs>
                      <rect width="560" height="650" fill="url(#grid)" />
                      <g fill="none" stroke="#aac3d9" strokeWidth="1.05">
                        {base.map((d, i) => (
                          <path key={i} d={d} />
                        ))}
                      </g>
                      <g
                        stroke={color}
                        fill={color}
                        fillOpacity=".12"
                        strokeWidth="1.5"
                      >
                        {result?.features
                          .filter((f) => f.geometry)
                          .map((f) => (
                            <g key={f.id}>
                              {f.geometry?.type === "Point" ? (
                                <circle
                                  cx={
                                    project(
                                      f.geometry.coordinates as number[],
                                    )[0]
                                  }
                                  cy={
                                    project(
                                      f.geometry.coordinates as number[],
                                    )[1]
                                  }
                                  r={selected?.id === f.id ? 7 : 4}
                                  fillOpacity=".8"
                                />
                              ) : (
                                paths(f.geometry).map((d, i) => (
                                  <path
                                    key={i}
                                    d={d}
                                    strokeWidth={
                                      selected?.id === f.id ? 4 : 1.5
                                    }
                                  >
                                    <title>{nameOf(f)}</title>
                                  </path>
                                ))
                              )}
                            </g>
                          ))}
                      </g>
                      <text
                        x="65"
                        y="270"
                        className="ocean-label"
                        transform="rotate(-90 65 270)"
                      >
                        ATLANTIC OCEAN
                      </text>
                      <text x="187" y="525" className="map-label">
                        Porto Inglês
                      </text>
                      <text x="172" y="338" className="map-label">
                        Calheta
                      </text>
                      <text x="310" y="265" className="map-label">
                        Pedro Vaz
                      </text>
                    </svg>
                    <div className="map-top">
                      <span>
                        <span className="dot" /> MAIO ISLAND
                      </span>
                      <span>↑ N</span>
                    </div>
                    <div className="map-bottom">
                      <span>
                        <i style={{ background: color }} />
                        {current.title} <small>· Current page</small>
                      </span>
                      <span>© OpenStreetMap contributors · ODbL</span>
                    </div>
                    <div className="map-caption">
                      Road network context · Fixed island extent
                    </div>
                  </>
                ) : (
                  <pre className="json-preview">
                    {result
                      ? JSON.stringify(selected || result, null, 2)
                      : loading
                        ? "Loading response…"
                        : "No response available."}
                  </pre>
                )}
                {error ? (
                  <div className="empty-state" role="alert">
                    <Database />
                    <h4>Couldn’t load this collection</h4>
                    <p>{error}</p>
                    <button
                      className="primary"
                      onClick={() => setRetry((n) => n + 1)}
                    >
                      Try again
                    </button>
                  </div>
                ) : !loading && result?.numberMatched === 0 ? (
                  <div className="empty-state">
                    <Layers />
                    <h4>
                      {current.status === "planned"
                        ? "A place for what comes next"
                        : search
                          ? "No matching records"
                          : "This layer is waiting for data"}
                    </h4>
                    <p>
                      {current.status === "planned"
                        ? "This collection is planned but has no source records available yet."
                        : search
                          ? "Try another place name or clear your search."
                          : "No explicit records exist in the current sources. Missing data is not evidence that these assets do not exist."}
                    </p>
                  </div>
                ) : null}
                {selected && view === "map" ? (
                  <div className="feature-card">
                    <button
                      aria-label="Close feature details"
                      className="close"
                      onClick={() => setSelected(null)}
                    >
                      <X size={16} />
                    </button>
                    <span className="eyebrow">SELECTED RECORD</span>
                    <h4>{nameOf(selected)}</h4>
                    <code>{selected.id}</code>
                    {selected.properties.attributes.datasetId === "business-demography" && (
                      <div>
                        <strong>{selected.properties.attributes.value === null ? "Not reported (---)" : Number(selected.properties.attributes.value).toLocaleString("en-GB", { maximumFractionDigits: 0 })} {String(selected.properties.attributes.unit)}</strong>
                        <p>Survey estimate · {String(selected.properties.attributes.geographicScope)}</p>
                        <p>Source cell: {String(selected.properties.attributes.sourceRecordId)}</p>
                        <p>Aggregate statistics, not company locations. Exact publication link and reuse license remain unverified.</p>
                        <a href="/api/v1/datasets/business-demography/records?year=2024">Read normalized statistics</a>
                      </div>
                    )}
                    {selected.properties.attributes.observationKind === "model-estimate" && (
                      <div>
                        <strong>Model estimate · snapshot</strong>
                        <p>{String(selected.properties.attributes.value)} {String(selected.properties.attributes.unit)}</p>
                        <p>Valid at {String(selected.properties.attributes.validAt)}</p>
                        <p>Retrieved {String(selected.properties.attributes.retrievedAt)}</p>
                        <p>Provider grid point; not a physical sensor reading.</p>
                      </div>
                    )}
                    {selected.properties.lifecycleStatus === "planned" && (
                      <div>
                        <strong>Planned</strong>
                        <p>{Array.isArray(selected.properties.attributes.activities)
                          ? selected.properties.attributes.activities.join(" · ") : ""}</p>
                        <p>{String(selected.properties.attributes.locationNote || "")}</p>
                      </div>
                    )}
                    <p>
                      {selected.properties.geometryStatus === "missing"
                        ? (collection === "business-statistics" ? "No geometry: municipality or island aggregate." : "Location not mapped in source.")
                        : "Geometry available in source."}
                    </p>
                    <span>
                      Sources: {selected.properties.sourceIds.join(", ")}
                    </span>
                    <a
                      href={`/api/v1/features/${selected.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open GeoJSON <ArrowUpRight size={13} />
                    </a>
                  </div>
                ) : null}
              </div>
              <div className="results-strip">
                <span>
                  {loading
                    ? "Reading snapshot…"
                    : result
                      ? `Showing ${result.numberReturned ? offset + 1 : 0}–${offset + (result.numberReturned || 0)} of ${result.numberMatched}`
                      : "No records loaded"}
                </span>
                <div>
                  <button
                    aria-label="Previous page"
                    disabled={loading || !result?.links.previous}
                    onClick={() => {
                      setOffset(Math.max(0, offset - 50));
                      setLoading(true);
                    }}
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <button
                    aria-label="Next page"
                    disabled={loading || !result?.links.next}
                    onClick={() => {
                      setOffset(offset + 50);
                      setLoading(true);
                    }}
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
              {result && result.features.length > 0 ? (
                <div className="record-list">
                  {result.features.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSelected(f)}
                      aria-pressed={selected?.id === f.id}
                    >
                      <MapPin size={13} />
                      <span>{nameOf(f)}{collection === "business-statistics" && <><br /><strong>{f.properties.attributes.value === null ? "Not reported (---)" : Number(f.properties.attributes.value).toLocaleString("en-GB", { maximumFractionDigits: 0 })} {String(f.properties.attributes.unit)}</strong></>}</span>
                      <small>
                        {f.properties.lifecycleStatus === "planned"
                          ? "Planned"
                          : f.properties.geometryStatus === "missing"
                          ? (collection === "business-statistics" ? "2024 estimate" : "Not mapped")
                          : f.geometry?.type}
                      </small>
                      <ArrowUpRight size={13} />
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="endpoint">
                <span className="get">GET</span>
                <a href={endpoint} target="_blank" rel="noreferrer">
                  <code>{endpoint}</code>
                </a>
                <button onClick={copy} aria-label="Copy API URL">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>
        </section>
        <section className="datasets-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">BEYOND THE MAP</span>
              <h2>The island in context</h2>
            </div>
            <a className="text-link" href="/api/v1/datasets">
              All datasets <ArrowUpRight size={15} />
            </a>
          </div>
          <div className="dataset-grid">
            {datasets.filter((d) => d.status === "available").map((d, i) => (
              <a
                key={d.id}
                href={`/api/v1/datasets/${d.id}`}
                className="dataset-card"
              >
                <span className="dataset-number">
                  {String(i + 1).padStart(2, "0")} <Database size={18} />
                </span>
                <h3>{d.title}</h3>
                <p>{d.scope}</p>
                <span className="dataset-format">
                  JSON DATASET <ArrowUpRight size={16} />
                </span>
              </a>
            ))}
          </div>
        </section>
        <section id="developers" className="developer-section">
          <div>
            <span className="eyebrow">BUILT TO BE BUILT ON</span>
            <h2>
              Your next idea.
              <br />
              Our shared island.
            </h2>
            <p>
              One versioned interface for Visit Maio, Maio Guide, the Data
              Portal, researchers and future tools. Read it from any
              application, without an API key.
            </p>
            <a className="primary" href="/api/v1/openapi.json">
              OpenAPI 3.1 specification <ArrowUpRight size={16} />
            </a>
          </div>
          <div className="code-card">
            <div>
              <Terminal size={15} /> YOUR FIRST REQUEST <span>JavaScript</span>
            </div>
            <pre>
              <code>{`const response = await fetch(\n  '/api/v1/collections/beaches/items?limit=10'\n);\nconst beaches = await response.json();\n\nfor (const feature of beaches.features) {\n  console.log(feature.id, feature.geometry);\n}\n\n// Follow beaches.links.next for the next page.\n// Use the deployed API origin from other apps.`}</code>
            </pre>
            <footer>
              <span className="dot" /> GET only · CORS enabled · GeoJSON ·
              Paginated
            </footer>
          </div>
        </section>
        <section className="docs-details">
          <article>
            <h3>Find exactly what you need</h3>
            <p>
              Filter by <code>collection</code>, search with <code>q</code>, or
              use <code>bbox=west,south,east,north</code>. Coordinates are
              longitude, latitude. Spatial queries match feature bounding boxes.
            </p>
          </article>
          <article>
            <h3>Know what you’re reading</h3>
            <p>
              Every feature carries source IDs and a geometry status. Snapshot
              revisions track source changes. Source dates may be unknown; this
              API does not imply live or complete coverage.
            </p>
          </article>
          <article>
            <h3>Make room for the future</h3>
            <p>
              Environmental records include sourced model estimates; physical sensors remain planned.
              The specification includes a future observation contract with
              timestamps, units, provenance and quality flags.
            </p>
          </article>
        </section>
        <section id="sources" className="sources-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">GROUNDED IN REAL SOURCES</span>
              <h2>Provenance is part of the data.</h2>
            </div>
            <a className="text-link" href="/api/v1/sources">
              Source manifest <ArrowUpRight size={15} />
            </a>
          </div>
          <p className="source-intro">
            Open access, with the original attribution intact. OpenStreetMap
            data retains its ODbL obligations. Other content has source-specific
            rights; unspecified licenses are not a blanket permission to
            redistribute.
          </p>
          <div className="source-table">
            {sources.map((s) => (
              <div key={s.id}>
                <strong>{s.title}</strong>
                <span>
                  {s.sourceUpdatedAt
                    ? s.sourceUpdatedAt.slice(0, 10)
                    : "Source date unknown"}
                </span>
                <small>
                  {s.license.startsWith("ODbL")
                    ? "OSM · ODbL + source rights"
                    : s.license === "Not specified by source" ? "Source rights unspecified" : s.license}
                </small>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="footer">
        <a className="brand" href="/">
          <Waves size={22} />
          <strong>
            maio<span> / open data</span>
          </strong>
        </a>
        <span>A foundation for the island’s digital future.</span>
        <code>v1.1 · {revision.slice(0, 8)}</code>
      </footer>
    </>
  );
}
