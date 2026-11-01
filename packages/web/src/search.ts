import type { HeroMeta } from "@dota-draft/core";
import { ALIASES } from "./aliases";
import { fixLayout } from "./layout";

/** localizedName: имя для показа. en и ru нужны только поиску (ru может не быть). */
export interface Hero extends HeroMeta {
  en: string;
  ru?: string;
}

const norm = (s: string) => s.toLowerCase().replaceAll("ё", "е");
const wordsOf = (s: string) => norm(s).split(/[\s-]+/).filter(Boolean);
const initialsOf = (s: string) => {
  const w = wordsOf(s);
  return w.length >= 2 ? w.map((x) => x.charAt(0)).join("") : "";
};

function termsOf(h: Hero) {
  const names = [norm(h.en), ...(h.ru ? [norm(h.ru)] : [])];
  const given = (ALIASES[h.en.toLowerCase()] ?? []).map(norm);
  const aliases = [
    ...given,
    initialsOf(h.en),
    ...(h.ru ? [initialsOf(h.ru)] : []),
    ...given.map(initialsOf), // «фейслесс войд» даёт «фв»
  ].filter(Boolean);
  return { names, aliases };
}

// 0: точное сокращение, 1: имя или длинное прозвище начинается с запроса,
// 2: начало слова или короткого сокращения, 3: подстрока.
function score(h: Hero, q: string): number {
  const { names, aliases } = termsOf(h);
  if (aliases.includes(q)) return 0;
  if (names.some((n) => n.startsWith(q)) || aliases.some((a) => a.length >= 4 && a.startsWith(q))) return 1;
  if (aliases.some((a) => a.startsWith(q)) || names.some((n) => wordsOf(n).some((w) => w.startsWith(q)))) return 2;
  if (names.some((n) => n.includes(q))) return 3;
  return -1;
}

export function searchHeroes(
  heroes: Hero[],
  query: string,
  taken: Set<number>,
  limit = 6,
): Hero[] {
  const run = (raw: string): Hero[] => {
    const q = norm(raw.trim());
    if (!q) return [];
    const scored: [number, Hero][] = [];
    for (const h of heroes) {
      if (taken.has(h.id)) continue;
      const s = score(h, q);
      if (s >= 0) scored.push([s, h]);
    }
    return scored
      .sort((a, b) => a[0] - b[0] || a[1].localizedName.localeCompare(b[1].localizedName))
      .slice(0, limit)
      .map((x) => x[1]);
  };

  const direct = run(query);
  if (direct.length > 0 || !/[а-яё]/i.test(query)) return direct;
  return run(fixLayout(query)); // набрали английское имя на русской раскладке
}