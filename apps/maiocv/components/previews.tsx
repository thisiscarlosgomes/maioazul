import Image from "next/image";
export function PortalPreview() {
  return (
    <div className="portal-preview" aria-hidden="true">
      <div className="preview-toolbar">
        <strong>
          maio<span>dados</span>
        </strong>
      </div>
      <div className="preview-body">
        <h4>Uma ilha, muitas perspetivas.</h4>
        <div className="metric-labels">
          <span>Turismo</span>
          <span>Economia</span>
          <span>Território</span>
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
export function ApiPreview() {
  return (
    <div className="api-preview" aria-hidden="true">
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
export function VisitPreview() {
  return (
    <div className="visit-preview">
      <Image
        src="/maio-vila.jpg"
        alt="Barcos na praia da cidade do Porto Inglês, Maio"
        fill
        sizes="(max-width: 700px) 100vw, 50vw"
      />
      <div className="visit-overlay" />
    </div>
  );
}
export function McpPreview() {
  return (
    <div className="mcp-preview" aria-hidden="true">
      <div className="mini-chat-top">
        <strong>Maio × ChatGPT</strong>
        <span className="tiny-badge">MCP</span>
      </div>
      <div className="mini-question">Que dados existem sobre o Maio?</div>
      <div className="mini-answer">
        <div>
          <p>Comecemos pelo que quer descobrir.</p>
          <div className="mini-topics">
            <span>Território</span>
            <span> Economia</span>
            <span>Turismo</span>
          </div>
        </div>
      </div>
      <div className="mini-composer">Pergunte sobre a ilha…</div>
    </div>
  );
}
