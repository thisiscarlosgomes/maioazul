import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, ".vercel/output");
await readFile(path.join(root, "out/index.html")); // Require a completed build before replacing output.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(path.join(root, "out"), path.join(output, "static"), { recursive: true });
await writeFile(path.join(output, "config.json"), JSON.stringify({
  version: 3,
  routes: [{ handle: "filesystem" }, { src: "/.*", status: 404, dest: "/404.html" }],
}, null, 2));
console.log("Static export prepared in .vercel/output");
