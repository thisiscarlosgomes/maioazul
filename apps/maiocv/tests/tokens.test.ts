import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const css = readFileSync(join(root, "packages/maio-tokens/tokens.css"), "utf8");
const fonts = readFileSync(join(root, "packages/maio-tokens/fonts.css"), "utf8");
const tokens = JSON.parse(readFileSync(join(root, "packages/maio-tokens/tokens.json"), "utf8"));

test("tokens.css carries every frozen colour and alias", () => {
  for (const [name, value] of Object.entries(tokens.color) as [string, string][]) {
    assert.match(css, new RegExp(`${name}:\\s*${value}`));
  }
  for (const [name, value] of Object.entries(tokens.alias) as [string, string][]) {
    assert.match(css, new RegExp(`${name}:\\s*${value.replace(/[()]/g, "\\$&")}`));
  }
  assert.equal(css.includes("#6c7b59"), false);
  assert.match(css, /--fs-label:\s*12px/);
});

test("dark theme sets color-scheme and does not invent a palette", () => {
  const dark = css.slice(css.indexOf('[data-theme="dark"]'));
  const block = dark.slice(0, dark.indexOf("}") + 1);
  assert.match(block, /color-scheme:\s*dark/);
  assert.equal(block.includes("#"), false);
});

test("low bandwidth drops elevation, fast motion, and the brand font", () => {
  const low = css.slice(css.indexOf('[data-bandwidth="low"]'));
  assert.match(low, /--elev-1:\s*none/);
  assert.match(low, /--elev-2:\s*none/);
  assert.match(low, /--elev-3:\s*none/);
  assert.match(low, /--dur-fast:\s*0s/);
  assert.match(low, /--font-sans:\s*ui-sans-serif, system-ui, Arial, sans-serif/);
});

test("fonts.css declares PP Neue Montreal at 400 and 500", () => {
  assert.match(fonts, /font-weight:\s*400/);
  assert.match(fonts, /font-weight:\s*500/);
  assert.match(fonts, /PPNeueMontreal-Regular\.woff2/);
  assert.match(fonts, /PPNeueMontreal-Medium\.woff2/);
});
