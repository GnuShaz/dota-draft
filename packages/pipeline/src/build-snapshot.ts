import { mkdirSync, statSync, writeFileSync } from "node:fs";
import type { Bracket, BracketData, Snapshot } from "@dota-draft/core";
import { StratzProvider } from "./stratz-provider";

const BRACKETS: Bracket[] = [
  "herald_guardian",
  "crusader_archon",
  "legend_ancient",
  "divine_immortal",
];

const sinceWeek = process.env.SINCE_WEEK ? Number(process.env.SINCE_WEEK) : undefined;
const provider = new StratzProvider({ weeksBack: 3, sinceWeek });

const weeks = await provider.resolveWeeks();
console.log("недели (индексы):", weeks.join(", "));
const heroes = await provider.fetchHeroes();
console.log("героев:", heroes.length);

const brackets = {} as Record<Bracket, BracketData>;
for (const b of BRACKETS) {
  console.log(`загружаю ${b}...`);
  brackets[b] = await provider.fetchBracket(b);
}

const snapshot: Snapshot = {
  generatedAt: new Date().toISOString(),
  weeks,
  heroes,
  brackets,
};
mkdirSync("data", { recursive: true });
writeFileSync("data/snapshot.json", JSON.stringify(snapshot));
const mb = statSync("data/snapshot.json").size / 1e6;
console.log(`готово: data/snapshot.json, ${mb.toFixed(1)} МБ`);