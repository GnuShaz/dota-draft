import type { Position } from "./types";

/**
 * Подписи ролей под слотами в клиенте игры (после приведения к нижнему регистру, «ё» читается как «е»).
 * Русские сверены по скриншоту, английские взяты по памяти: если в вашем клиенте другие, добавьте сюда.
 */
export const ROLE_LABELS: Record<Position, string[]> = {
  1: ["лёгкая", "лёгкая линия", "safe lane", "safelane"],
  2: ["центр", "центральная линия", "mid lane", "midlane", "mid"],
  3: ["сложная", "сложная линия", "off lane", "offlane"],
  4: ["поддержка", "soft support"],
  5: ["полная поддержка", "hard support"],
};

export const ROLE_MIN_SIM = 0.62;
const POSITIONS: Position[] = [1, 2, 3, 4, 5];

export function normLabel(s: string): string {
  return s
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[^a-zа-я\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function lev(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

const sim = (a: string, b: string) => 1 - lev(a, b) / Math.max(a.length, b.length, 1);

export interface RoleMatch {
  pos: Position;
  score: number;
}

/** Ищет в распознанном тексте строку, похожую на название роли. Мусор от значков и ники отсеиваются порогом. */
export function matchRole(text: string): RoleMatch | undefined {
  let best: RoleMatch | undefined;
  for (const line of text.split(/\r?\n/).map(normLabel)) {
    if (line.length < 3) continue;
    // Значок рядом с текстом часто читается как 1-2 лишние буквы: пробуем строку и без коротких слов.
    const variants = new Set<string>([line]);
    const trimmed = line
      .split(" ")
      .filter((w) => w.length > 2)
      .join(" ");
    if (trimmed) variants.add(trimmed);
    for (const v of variants) {
      for (const pos of POSITIONS) {
        for (const label of ROLE_LABELS[pos]) {
          const s = sim(v, normLabel(label));
          if (s >= ROLE_MIN_SIM && (!best || s > best.score)) best = { pos, score: s };
        }
      }
    }
  }
  return best;
}

/** Одна роль на один слот: при повторе остаётся более уверенное совпадение. */
export function uniqueRoles(found: (RoleMatch | undefined)[]): (Position | undefined)[] {
  const out: (Position | undefined)[] = found.map(() => undefined);
  const order = found
    .map((m, i) => ({ m, i }))
    .filter((x): x is { m: RoleMatch; i: number } => x.m !== undefined)
    .sort((a, b) => b.m.score - a.m.score);
  const used = new Set<Position>();
  for (const { m, i } of order) {
    if (used.has(m.pos)) continue;
    used.add(m.pos);
    out[i] = m.pos;
  }
  return out;
}

/**
 * Достраивает роли до полного набора. preferred: догадка по статистике, используется только
 * для ещё свободных ролей. Если неизвестна ровно одна роль, она определяется однозначно.
 */
export function fillRoles(
  known: (Position | undefined)[],
  preferred: (Position | undefined)[] = [],
): Position[] {
  const out = [...known];
  const used = new Set<Position>(known.filter((r): r is Position => r !== undefined));
  out.forEach((r, i) => {
    const p = preferred[i];
    if (r === undefined && p !== undefined && !used.has(p)) {
      out[i] = p;
      used.add(p);
    }
  });
  const free = POSITIONS.filter((p) => !used.has(p));
  return out.map((r) => r ?? free.shift() ?? 1);
}