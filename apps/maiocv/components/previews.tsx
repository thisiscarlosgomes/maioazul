import Image from "next/image";
import { t, type MessageKey } from "../lib/i18n";
import type { Locale } from "../lib/locale";

export function PortalPreview({ locale = "pt" }: { locale?: Locale }) {
  const copy = (key: MessageKey) => t(key, undefined, locale);
  return (
    <div className="portal-preview">
      <div className="preview-toolbar">
        <strong>
          maio<span>{copy("preview.portal.data")}</span>
        </strong>
      </div>
      <div className="preview-body">
        <h4>{copy("preview.portal.title")}</h4>
        <div className="metric-labels">
          <span>{copy("preview.portal.tourism")}</span>
          <span>{copy("preview.portal.economy")}</span>
          <span>{copy("preview.portal.territory")}</span>
        </div>
        <div className="preview-chart" aria-hidden="true">
          {[30, 42, 38, 56, 50, 68, 62, 78, 70, 90, 81, 95].map((v, i) => (
            <i key={i} style={{ height: `${v}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
export function ApiPreview({ locale: _locale = "pt" }: { locale?: Locale }) {
  return (
    <div className="api-preview">
      <div className="preview-toolbar">
        <span>
          <i className="status-dot" /> Maio Open Data
        </span>
        <span>GET</span>
      </div>
      <div className="code-view">
        <p>
          GET <b>/api/v1/collections</b>
        </p>
        <pre>
          <span>&#123;</span>
          {"\n  "}
          <em>"collections"</em>: [{"\n    "}
          <strong>"beaches"</strong>,{"\n    "}
          <strong>"businesses"</strong>,{"\n    "}
          <strong>"protected-areas"</strong>
          {"\n  "}]<br />
          <span>&#125;</span>
        </pre>
      </div>
    </div>
  );
}
export function VisitPreview({ locale = "pt" }: { locale?: Locale }) {
  return (
    <div className="visit-preview">
      <Image
        src="/maio-vila.jpg"
        alt={t("preview.visit.alt", undefined, locale)}
        fill
        sizes="(max-width: 700px) 100vw, 50vw"
      />
      <div className="visit-overlay" />
    </div>
  );
}
export function McpPreview({ locale = "pt" }: { locale?: Locale }) {
  const copy = (key: MessageKey) => t(key, undefined, locale);
  return (
    <div className="mcp-preview">
      <div className="mini-chat-top">
        <strong>Maio × ChatGPT</strong>
        <span className="tiny-badge">MCP</span>
      </div>
      <div className="mini-question">{copy("preview.mcp.question")}</div>
      <div className="mini-answer">
        <div>
          <p>{copy("preview.mcp.answer")}</p>
          <div className="mini-topics">
            <span>{copy("preview.portal.territory")}</span>
            <span> {copy("preview.portal.economy")}</span>
            <span>{copy("preview.portal.tourism")}</span>
          </div>
        </div>
      </div>
      <div className="mini-composer">{copy("preview.mcp.composer")}</div>
    </div>
  );
}
