import { strict as assert } from "node:assert";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(appRoot, "../..");
const uiRoot = join(repoRoot, "packages/maio-ui");
const css = readFileSync(join(uiRoot, "maio-ui.css"), "utf8");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return name.endsWith(".tsx") || name.endsWith(".ts") ? [path] : [];
  });
}

test("shared components use namespaced classes and token variables", () => {
  for (const name of [
    ".maio-button",
    ".maio-button-light",
    ".maio-button-white",
    ".maio-button-small",
    ".maio-eyebrow",
    ".maio-chip",
    ".maio-chip-estimate",
    ".maio-card",
    ".maio-skip-link",
    ".maio-header",
    ".maio-footer",
  ]) {
    assert.ok(css.includes(name), name);
  }
  assert.match(css, /border-radius:\s*var\(--radius-pill\)/);
  assert.match(css, /font-size:\s*var\(--fs-label\)/);
  assert.match(css, /color:\s*var\(--maio-chip-fg\)/);
  assert.match(css, /color:\s*var\(--maio-estimate-fg\)/);
  assert.match(css, /height:\s*var\(--header-h\)/);
});

test("package components do not fetch, store, or route", () => {
  const source = sourceFiles(join(uiRoot, "src")).map((path) => readFileSync(path, "utf8")).join("\n");
  assert.equal(source.includes("next/link"), false);
  assert.equal(source.includes("localStorage"), false);
  assert.equal(source.includes("fetch("), false);
  for (const name of ["Button", "Eyebrow", "Chip", "Card", "Section", "SkipLink", "SiteHeader", "SiteFooter"]) {
    assert.match(readFileSync(join(uiRoot, "src/index.ts"), "utf8"), new RegExp(`export \\{ ${name} \\}`));
  }
});

test("maiocv call sites use the shared button, skip link, header, and footer", () => {
  const pages = sourceFiles(join(appRoot, "app")).concat(sourceFiles(join(appRoot, "components")));
  const markup = pages.map((path) => readFileSync(path, "utf8")).join("\n");
  assert.equal(/className="(?:[^"]*\s)?button(?:\s[^"]*)?"/.test(markup), false);
  assert.equal(markup.includes("skip-link"), false);
  assert.equal(markup.includes("site-header"), false);
  assert.equal(markup.includes("site-footer"), false);
  assert.match(markup, /<SkipLink[\s>]/);
  assert.match(markup, /<SiteHeader[\s>]/);
  assert.match(markup, /<SiteFooter[\s>]/);
  assert.match(markup, /<Button[\s>]/);
  assert.match(markup, /<Card[\s>]/);
  assert.match(markup, /<Section[\s>]/);
});
