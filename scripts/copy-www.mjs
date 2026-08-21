import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const www = join(root, "www");
const assets = ["index.html", "app.js", "styles.css", "favicon.svg", "music"];

if (existsSync(www)) rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });

for (const name of assets) {
  const from = join(root, name);
  if (!existsSync(from)) {
    throw new Error(`Missing web asset: ${name}`);
  }
  cpSync(from, join(www, name), { recursive: true });
}

console.log("Copied web assets to www/");
