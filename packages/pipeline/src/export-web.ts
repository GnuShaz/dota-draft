import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { Snapshot } from "@dota-draft/core";

const snap: Snapshot = JSON.parse(readFileSync("data/snapshot.json", "utf8"));
const out = "packages/web/public/data";
mkdirSync(out, { recursive: true });

const { brackets, ...meta } = snap;
writeFileSync(`${out}/meta.json`, JSON.stringify(meta));
for (const [name, data] of Object.entries(brackets)) {
  writeFileSync(`${out}/${name}.json`, JSON.stringify(data));
}
console.log("экспортировано:", ["meta", ...Object.keys(brackets)].join(", "));