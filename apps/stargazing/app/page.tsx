"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Compass,
  Crosshair,
  LocateFixed,
  MapPin,
  Minus,
  Moon,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { fetchSky, type SkyResponse } from "../lib/api-client.mjs";
import { clamp, deviceView, direction, project, wrap } from "../lib/sky.mjs";

type View = { az: number; alt: number; roll: number };
type SensorEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
};
const initialLocation = {
  latitude: 15.25,
  longitude: -23.15,
  name: "Maio, Cabo Verde",
};

export default function SkyApp() {
  const [now, setNow] = useState<Date | null>(null);
  const [fixedTime, setFixedTime] = useState("");
  const [location, setLocation] = useState(initialLocation);
  const [view, setView] = useState<View>({ az: 180, alt: 45, roll: 0 });
  const [fov, setFov] = useState(95);
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [showLines, setShowLines] = useState(true);
  const [night, setNight] = useState(false);
  const [settings, setSettings] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [sensorPending, setSensorPending] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState(
    "Drag to explore. On your phone, tap Point at sky to follow your view.",
  );
  const [size, setSize] = useState({ width: 1100, height: 760 });
  const mapRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; view: View } | null>(null);
  const sensorCleanup = useRef<() => void>(() => {});
  const initialized = useRef(false);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 15000);
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    if (mapRef.current) observer.observe(mapRef.current);
    return () => {
      clearInterval(timer);
      observer.disconnect();
      sensorCleanup.current();
    };
  }, []);
  useEffect(() => {
    if (!settings) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>("[role=dialog]");
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialog) return;
      const items = Array.from(
        dialog.querySelectorAll<HTMLElement>("button, input, a[href]"),
      );
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [settings]);
  const at = fixedTime ? new Date(fixedTime) : now;
  const skyQuery =
    at && Number.isFinite(+at)
      ? new URLSearchParams({
          at: at.toISOString(),
          latitude: location.latitude.toFixed(6),
          longitude: location.longitude.toFixed(6),
        }).toString()
      : "";
  const [apiState, setApiState] = useState<{
    key: string;
    data: SkyResponse | null;
    error: string;
  }>({ key: "", data: null, error: "" });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!skyQuery) return;
    const controller = new AbortController();
    setApiState({ key: skyQuery, data: null, error: "" });
    const timer = setTimeout(() => {
      setApiState({
        key: skyQuery,
        data: null,
        error: "Maio API timed out. Please try again.",
      });
      controller.abort();
    }, 12000);
    fetchSky(skyQuery, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setApiState({ key: skyQuery, data, error: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setApiState({
            key: skyQuery,
            data: null,
            error: error.message || "Cannot reach the Maio API.",
          });
      })
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [skyQuery, retry]);
  const sky = apiState.key === skyQuery ? apiState.data : null;
  const apiError = apiState.key === skyQuery ? apiState.error : "";
  const visible =
    sky?.constellations
      .filter((c) => c.above)
      .sort((a, b) => b.highest.alt - a.highest.alt) ?? [];
  useEffect(() => {
    if (!sky || initialized.current) return;
    initialized.current = true;
    const target = sky.constellations
      .filter((c) => c.center.alt > 25 && c.center.alt < 70)
      .sort((a, b) => b.count - a.count)[0];
    if (target) {
      setSelected(target.id);
      setView({ ...target.center, roll: 0 });
    }
  }, [sky]);
  const target = sky?.constellations.find((c) => c.id === selected);
  const results =
    (query
      ? sky?.constellations.filter((c) =>
          `${c.name} ${c.abbreviation}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
      : visible) ?? [];
  const darkness = sky
    ? sky.sunAltitude < -18
      ? "Astronomical night"
      : sky.sunAltitude < 0
        ? "Twilight sky"
        : "Daylight sky"
    : apiError
      ? "Sky unavailable"
      : "Connecting to Maio API…";
  const plot = (p: { az: number; alt: number }) => {
    const result = project(p, view, size.width, size.height, fov);
    // Stabilize SVG attributes across JS engines during hydration.
    return result ? { x: +result.x.toFixed(3), y: +result.y.toFixed(3) } : null;
  };
  const inFrame = (p: { x: number; y: number } | null) =>
    p &&
    p.x > -50 &&
    p.x < size.width + 50 &&
    p.y > -50 &&
    p.y < size.height + 50;

  function stopTracking() {
    sensorCleanup.current();
    setTracking(false);
    setSensorPending(false);
    setView((v) => ({ ...v, roll: 0 }));
  }
  function focus(id: string) {
    const c = sky?.constellations.find((c) => c.id === id);
    if (!c) return;
    stopTracking();
    setSelected(id);
    setView({ ...(c.center.alt > 0 ? c.center : c.highest), roll: 0 });
    setMessage(
      c.above
        ? `${c.name} selected. Its star pattern is highlighted on the map.`
        : `${c.name} is below the horizon at this time and location.`,
    );
  }
  function locate() {
    if (!navigator.geolocation) {
      setMessage(
        "Location is unavailable. Set your coordinates in Sky settings.",
      );
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocation({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          name: "Your location",
        });
        setLocating(false);
        setMessage("Sky updated for your location.");
      },
      () => {
        setLocating(false);
        setMessage(
          "Could not get your location. Allow location access or enter coordinates in Sky settings.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }
  async function pointAtSky() {
    if (tracking || sensorPending) {
      stopTracking();
      setMessage("Manual mode. Drag the sky to explore.");
      return;
    }
    if (!window.isSecureContext) {
      setMessage(
        "Phone pointing needs HTTPS. Use manual mode here, or open the app over HTTPS.",
      );
      return;
    }
    if (!("DeviceOrientationEvent" in window)) {
      setMessage(
        "No orientation sensor is available. Drag the map or use the direction controls.",
      );
      return;
    }
    const Orientation =
      DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: (absolute?: boolean) => Promise<string>;
      };
    try {
      if (
        Orientation.requestPermission &&
        (await Orientation.requestPermission(true)) !== "granted"
      ) {
        setMessage("Motion permission was denied. You can still drag the map.");
        return;
      }
    } catch {
      setMessage(
        "Could not enable motion access. Try your phone browser over HTTPS.",
      );
      return;
    }
    setSensorPending(true);
    setMessage(
      "Waiting for compass… Hold the phone upright, then point its back toward the sky.",
    );
    let last = 0,
      received = false;
    const handle = (e: DeviceOrientationEvent) => {
      const event = e as SensorEvent;
      if (event.alpha === null || event.beta === null || event.gamma === null)
        return;
      const heading = event.webkitCompassHeading;
      if (
        !event.absolute &&
        (heading === undefined ||
          !Number.isFinite(heading) ||
          heading < 0 ||
          (event.webkitCompassAccuracy !== undefined &&
            event.webkitCompassAccuracy < 0))
      )
        return;
      if (performance.now() - last < 50) return;
      last = performance.now();
      received = true;
      setSensorPending(false);
      setTracking(true);
      setView(
        deviceView(
          event.alpha,
          event.beta,
          event.gamma,
          screen.orientation?.angle ?? 0,
          heading ?? null,
        ),
      );
      setMessage(
        "Point the back of your phone at the sky. Compass alignment is approximate; keep away from metal and magnets.",
      );
    };
    window.addEventListener("deviceorientationabsolute", handle);
    window.addEventListener("deviceorientation", handle);
    const timer = setTimeout(() => {
      if (!received) {
        stopTracking();
        setMessage(
          "No absolute compass reading received. Try calibrating your phone with a figure-eight motion, or explore manually.",
        );
      }
    }, 8000);
    sensorCleanup.current = () => {
      window.removeEventListener("deviceorientationabsolute", handle);
      window.removeEventListener("deviceorientation", handle);
      clearTimeout(timer);
    };
  }

  return (
    <main className={night ? "app night" : "app"}>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Maio Sky home">
          <span className="brand-icon">
            <Sparkles size={24} />
          </span>
          <span>
            maio<span className="brand-light">sky</span>
            <small>AN ATLAS OF THE NIGHT</small>
          </span>
        </a>
        <div className="top-center">
          <span className="live-dot" />
          {fixedTime ? "TIME EXPLORER" : "LIVE SKY"}
          <span className="divider" />{" "}
          {now
            ? (at ?? now).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—"}{" "}
          <span className="timezone">LOCAL TIME</span>
        </div>
        <button
          className="location-button"
          onClick={locate}
          disabled={locating}
        >
          <MapPin size={16} />
          <span>{locating ? "Finding you…" : location.name}</span>
          <LocateFixed size={14} />
        </button>
      </header>
      <div className="workspace">
        <section className="sky-section" aria-label="Interactive sky atlas">
          <div className="map-intro">
            <p className="eyebrow">LOOK UP. THERE’S MORE.</p>
            <h1>
              A little closer
              <br />
              to the stars.
            </h1>
            <p>
              {fixedTime && at
                ? `Exploring ${at.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · device time`
                : "Your sky, right here. Right now."}
            </p>
            <div className="sky-condition">
              {sky && sky.sunAltitude >= 0 ? (
                <Sun size={14} />
              ) : (
                <Moon size={14} />
              )}{" "}
              {darkness}
            </div>
          </div>
          <div
            ref={mapRef}
            className="sky-map"
            tabIndex={0}
            role="application"
            aria-label="Sky map. Use arrow keys to look around; plus and minus to zoom."
            onKeyDown={(e) => {
              if (
                ![
                  "ArrowLeft",
                  "ArrowRight",
                  "ArrowUp",
                  "ArrowDown",
                  "+",
                  "-",
                ].includes(e.key)
              )
                return;
              e.preventDefault();
              stopTracking();
              setView((v) => ({
                az: wrap(
                  v.az +
                    (e.key === "ArrowRight"
                      ? 5
                      : e.key === "ArrowLeft"
                        ? -5
                        : 0),
                ),
                alt: clamp(
                  v.alt +
                    (e.key === "ArrowUp" ? 5 : e.key === "ArrowDown" ? -5 : 0),
                  -85,
                  85,
                ),
                roll: 0,
              }));
              if (e.key === "+") setFov((f) => clamp(f - 10, 30, 120));
              if (e.key === "-") setFov((f) => clamp(f + 10, 30, 120));
            }}
            onPointerDown={(e) => {
              if ((e.target as Element).closest("[data-constellation]")) return;
              stopTracking();
              drag.current = { x: e.clientX, y: e.clientY, view };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              const d = drag.current;
              setView({
                az: wrap(
                  d.view.az -
                    ((e.clientX - d.x) * fov) /
                      Math.min(size.width, size.height),
                ),
                alt: clamp(
                  d.view.alt +
                    ((e.clientY - d.y) * fov) /
                      Math.min(size.width, size.height),
                  -85,
                  85,
                ),
                roll: 0,
              });
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
          >
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${size.width} ${size.height}`}
              aria-hidden="true"
            >
              <defs>
                <radialGradient id="starGlow">
                  <stop offset="0" stopColor="var(--star)" stopOpacity=".5" />
                  <stop offset="1" stopColor="var(--star)" stopOpacity="0" />
                </radialGradient>
              </defs>
              {[15, 30, 45, 60, 75].map((alt) => (
                <g key={alt} className="grid-lines">
                  {Array.from({ length: 180 }, (_, i) => {
                    const a = plot({ az: i * 2, alt }),
                      b = plot({ az: i * 2 + 2, alt });
                    return a && b && inFrame(a) && inFrame(b) ? (
                      <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                    ) : null;
                  })}
                </g>
              ))}
              {Array.from({ length: 12 }, (_, i) => (
                <g key={i} className="grid-lines">
                  {Array.from({ length: 45 }, (_, j) => {
                    const a = plot({ az: i * 30, alt: j * 2 }),
                      b = plot({ az: i * 30, alt: j * 2 + 2 });
                    return a && b && inFrame(a) && inFrame(b) ? (
                      <line key={j} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                    ) : null;
                  })}
                </g>
              ))}
              {sky?.constellations.map((c) => (
                <g
                  key={c.id}
                  className={
                    selected === c.id
                      ? "constellation selected"
                      : "constellation"
                  }
                >
                  {c.paths.map((path, pi) => (
                    <g key={pi}>
                      {path.map((p, i) => {
                        const a = plot(p),
                          b = i ? plot(path[i - 1]) : null;
                        if (p.alt < 0) return null;
                        return (
                          <g key={i}>
                            {showLines &&
                              a &&
                              b &&
                              path[i - 1].alt >= 0 &&
                              inFrame(a) &&
                              inFrame(b) && (
                                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                              )}{" "}
                            {inFrame(a) && a && (
                              <>
                                <circle
                                  className="glow"
                                  cx={a.x}
                                  cy={a.y}
                                  r={selected === c.id ? 12 : 6}
                                  fill="url(#starGlow)"
                                />
                                <circle
                                  className="star"
                                  cx={a.x}
                                  cy={a.y}
                                  r={selected === c.id ? 2.3 : 1.5}
                                />
                              </>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  ))}
                  {(() => {
                    const p = plot(c.center);
                    return c.center.alt > 0 && inFrame(p) && p ? (
                      <g
                        data-constellation={c.id}
                        className="map-label"
                        onClick={() => focus(c.id)}
                      >
                        <rect
                          x={p.x - 60}
                          y={p.y - 15}
                          width="120"
                          height="32"
                          fill="transparent"
                        />
                        <text x={p.x} y={p.y} textAnchor="middle">
                          {c.name}
                        </text>
                        {selected === c.id && (
                          <text
                            className="selected-caption"
                            x={p.x}
                            y={p.y + 18}
                            textAnchor="middle"
                          >
                            {c.abbreviation.toUpperCase()} · SELECTED
                          </text>
                        )}
                      </g>
                    ) : null;
                  })()}
                </g>
              ))}
              <g className="horizon">
                {Array.from({ length: 180 }, (_, i) => {
                  const a = plot({ az: i * 2, alt: 0 }),
                    b = plot({ az: i * 2 + 2, alt: 0 });
                  return a && b && inFrame(a) && inFrame(b) ? (
                    <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                  ) : null;
                })}
                {[0, 90, 180, 270].map((az) => {
                  const p = plot({ az, alt: 0 });
                  return p && inFrame(p) ? (
                    <text key={az} x={p.x} y={p.y - 10} textAnchor="middle">
                      {direction(az)} · HORIZON
                    </text>
                  ) : null;
                })}
              </g>
            </svg>
            <div className="reticle" aria-hidden="true">
              <span />
              <span />
            </div>
            {view.alt < 0 && (
              <div className="below-horizon">
                Looking below the horizon
                <br />
                <small>Tilt upward to find the stars.</small>
              </div>
            )}
          </div>
          <div className="map-tools">
            <button
              title="Zoom in"
              aria-label="Zoom in"
              onClick={() => setFov((f) => clamp(f - 10, 30, 120))}
              disabled={fov <= 30}
            >
              <Plus size={19} />
            </button>
            <span>{fov}°</span>
            <button
              title="Zoom out"
              aria-label="Zoom out"
              onClick={() => setFov((f) => clamp(f + 10, 30, 120))}
              disabled={fov >= 120}
            >
              <Minus size={19} />
            </button>
            <i />
            <button
              title="Sky settings"
              aria-label="Sky settings"
              onClick={() => setSettings(!settings)}
            >
              <SlidersHorizontal size={18} />
            </button>
          </div>
          <div className="map-bottom">
            <div className="bearing">
              <Compass size={31} />
              <span>
                <strong>
                  {direction(view.az)} <span>{Math.round(view.az)}°</span>
                </strong>
                <small>ALTITUDE {Math.round(view.alt)}°</small>
              </span>
            </div>
            <button
              className={`point-button ${tracking ? "active" : ""}`}
              onClick={pointAtSky}
            >
              <Crosshair size={18} />
              {tracking
                ? "Stop pointing"
                : sensorPending
                  ? "Cancel compass"
                  : "Point at sky"}
              <span>↗</span>
            </button>
            <button
              className={`night-button ${night ? "active" : ""}`}
              onClick={() => setNight(!night)}
              aria-pressed={night}
            >
              <Moon size={17} />
              <span>Night vision</span>
            </button>
          </div>
          <div className="status-message" role="status">
            {apiError ? (
              <>
                {apiError}{" "}
                <button onClick={() => setRetry((n) => n + 1)}>Retry</button>
              </>
            ) : sky ? (
              message
            ) : (
              "Loading sky positions from Maio API…"
            )}
          </div>
        </section>
        <aside className="sidebar">
          <div className="sidebar-heading">
            <div>
              <p className="eyebrow">THE SKY ABOVE YOU</p>
              <h2>
                {fixedTime ? "At this time" : "Up right now"}
                <span>{visible.length}</span>
              </h2>
            </div>
            <Sparkles size={22} />
          </div>
          <p className="sidebar-description">
            Find familiar shapes. Discover something new.
          </p>
          <label className="search">
            <Search size={17} />
            <input
              aria-label="Search constellations"
              placeholder="Find a constellation…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button aria-label="Clear search" onClick={() => setQuery("")}>
                <X size={14} />
              </button>
            )}
          </label>
          <div className="list-caption">
            <span>{query ? "SEARCH RESULTS" : "ABOVE THE HORIZON"}</span>
            <span>{query ? results.length : "ALTITUDE"}</span>
          </div>
          <div className="constellation-list">
            {results.map((c, index) => (
              <button
                className={`constellation-card ${selected === c.id ? "chosen" : ""}`}
                key={c.id}
                onClick={() => focus(c.id)}
              >
                <span className="constellation-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="constellation-name">
                  <strong>{c.name}</strong>
                  <small>
                    {c.abbreviation.toUpperCase()} <span>·</span>{" "}
                    {c.above
                      ? `${direction(c.highest.az)} / above horizon`
                      : "Below horizon"}
                  </small>
                </span>
                <span className="altitude">
                  {Math.round(c.highest.alt)}°<ArrowUpRight size={14} />
                </span>
              </button>
            ))}
            {!results.length && (
              <p className="empty">
                {sky
                  ? "No constellations match your search."
                  : apiError
                    ? "The sky map could not be loaded."
                    : "Loading from Maio API…"}
              </p>
            )}
          </div>
          {target && (
            <div className="selection-detail">
              <p className="eyebrow">
                IN FOCUS <span>✧</span>
              </p>
              <h3>{target.name}</h3>
              <div>
                <span>{target.count} pattern stars</span>
                <span>{target.above ? "Above horizon" : "Below horizon"}</span>
              </div>
              <p>
                Look {direction(target.highest.az)} toward the highest part of
                the pattern, {Math.round(Math.abs(target.highest.alt))}°{" "}
                {target.highest.alt >= 0 ? "above" : "below"} the horizon.
              </p>
            </div>
          )}
          <div className="observing-note">
            <span className="note-dot" />
            <p>
              {sky && sky.sunAltitude >= 0
                ? "It’s daylight at this location. Explore the map now, or change the time to plan an evening under the stars."
                : "Above the horizon doesn’t always mean visible. Clouds, moonlight and nearby lights affect what you can see."}
            </p>
          </div>
        </aside>
      </div>
      <footer>
        <span>
          MAIO AZUL <span className="footer-cross">✦</span> MADE FOR CURIOUS
          NIGHTS
        </span>
        <span>
          88 constellations · Maio API <span>·</span>{" "}
          <a
            href="https://github.com/ofrohn/d3-celestial"
            target="_blank"
            rel="noreferrer"
          >
            d3-celestial
          </a>{" "}
          +{" "}
          <a
            href="https://github.com/cosinekitty/astronomy"
            target="_blank"
            rel="noreferrer"
          >
            Astronomy Engine
          </a>
        </span>
      </footer>
      {settings && (
        <div className="settings-backdrop" onClick={() => setSettings(false)}>
          <section
            className="settings"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSettings(false);
            }}
          >
            <div className="settings-heading">
              <h2 id="settings-title">Your sky settings</h2>
              <button
                aria-label="Close settings"
                onClick={() => setSettings(false)}
                autoFocus
              >
                <X size={20} />
              </button>
            </div>
            <p>Choose where and when you look up.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const d = new FormData(e.currentTarget);
                setLocation({
                  latitude: Number(d.get("latitude")),
                  longitude: Number(d.get("longitude")),
                  name: "Custom location",
                });
                setMessage("Sky updated for your coordinates.");
                setSettings(false);
              }}
            >
              <div className="coordinate-fields">
                <label>
                  Latitude
                  <input
                    name="latitude"
                    type="number"
                    min="-90"
                    max="90"
                    step="any"
                    required
                    defaultValue={location.latitude}
                  />
                </label>
                <label>
                  Longitude
                  <input
                    name="longitude"
                    type="number"
                    min="-180"
                    max="180"
                    step="any"
                    required
                    defaultValue={location.longitude}
                  />
                </label>
              </div>
              <button className="secondary" type="submit">
                Apply location
              </button>
            </form>
            <label className="time-field">
              Explore a time <small>(your device’s timezone)</small>
              <input
                aria-label="Explore a time"
                type="datetime-local"
                min="2000-01-01T00:00"
                max="2100-12-31T23:59"
                value={fixedTime}
                onChange={(e) => {
                  if (e.target.value && e.target.validity.valid)
                    setFixedTime(e.target.value);
                }}
              />
            </label>
            <button className="text-button" onClick={() => setFixedTime("")}>
              Return to live sky
            </button>
            <label className="toggle">
              <span>Constellation lines</span>
              <input
                type="checkbox"
                checked={showLines}
                onChange={(e) => setShowLines(e.target.checked)}
              />
            </label>
            <label className="range-label">
              Direction{" "}
              <span>
                {Math.round(view.az)}° {direction(view.az)}
              </span>
              <input
                aria-label="Direction"
                type="range"
                min="0"
                max="359"
                value={view.az}
                onChange={(e) => {
                  stopTracking();
                  setView((v) => ({ ...v, az: +e.target.value }));
                }}
              />
            </label>
            <label className="range-label">
              Altitude <span>{Math.round(view.alt)}°</span>
              <input
                aria-label="Altitude"
                type="range"
                min="-85"
                max="85"
                value={view.alt}
                onChange={(e) => {
                  stopTracking();
                  setView((v) => ({ ...v, alt: +e.target.value }));
                }}
              />
            </label>
            <p className="settings-note">
              Pointing uses your phone’s compass, not image recognition. Start
              upright and point the back of the phone at the sky. Sensor
              accuracy varies; this is a guide to star patterns, not official
              constellation boundaries. Default location: Maio.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
