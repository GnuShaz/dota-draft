import type { BracketData, HeroId, Position } from "./types";

const POSITIONS: Position[] = [1, 2, 3, 4, 5];
const EPS = 5; // «виртуальные» игры, чтобы нулевая статистика не обнуляла вероятность

export interface RoleGuess {
  /** Самая правдоподобная расстановка: герой -> позиция. */
  assignment: Record<HeroId, Position>;
  /** Доля лучшей расстановки среди всех возможных (0..1). */
  confidence: number;
  /** Для каждого героя вероятность каждой позиции с учётом остальных героев. */
  marginals: Record<HeroId, Record<Position, number>>;
}

/**
 * Угадывает, кто на какой позиции играет в команде.
 * Модель: на каждой позиции герой выбирается независимо с вероятностью
 * «игры героя на позиции / все игры на позиции». Правдоподобие расстановки равно
 * произведению этих вероятностей, перебираем все расстановки (не больше 120).
 * fixed: герои, чья позиция известна (при конфликте игнорируется).
 */
export function guessRoles(
  data: BracketData,
  heroIds: HeroId[],
  fixed: Record<HeroId, Position> = {},
): RoleGuess {
  const ids = heroIds.slice(0, 5);
  const total: Record<number, number> = {};
  for (const p of POSITIONS) {
    total[p] = Object.values(data.byPosition[p] ?? {}).reduce((s, x) => s + x.games, 0);
  }
  const heroCount = Math.max(1, Object.keys(data.overall).length);
  const logQ = (h: HeroId, p: Position) => {
    const g = data.byPosition[p]?.[h]?.games ?? 0;
    return Math.log((g + EPS) / (total[p] + EPS * heroCount));
  };

  const options: { pos: Position[]; logw: number }[] = [];
  const cur: Position[] = [];
  const used = new Set<Position>();
  const walk = (i: number, logw: number) => {
    if (i === ids.length) {
      options.push({ pos: [...cur], logw });
      return;
    }
    const h = ids[i];
    const want = fixed[h];
    for (const p of POSITIONS) {
      if (used.has(p) || (want !== undefined && want !== p)) continue;
      used.add(p);
      cur.push(p);
      walk(i + 1, logw + logQ(h, p));
      cur.pop();
      used.delete(p);
    }
  };
  walk(0, 0);

  // Противоречивые fixed (два героя на одной позиции): считаем без них.
  if (options.length === 0) return guessRoles(data, ids, {});

  const maxLog = Math.max(...options.map((o) => o.logw));
  const weights = options.map((o) => Math.exp(o.logw - maxLog));
  const sum = weights.reduce((a, b) => a + b, 0);
  let best = 0;
  weights.forEach((w, i) => {
    if (w > weights[best]) best = i;
  });

  const marginals: Record<HeroId, Record<Position, number>> = {};
  for (const h of ids) marginals[h] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  options.forEach((o, i) => {
    const w = weights[i] / sum;
    o.pos.forEach((p, j) => {
      marginals[ids[j]][p] += w;
    });
  });

  const assignment: Record<HeroId, Position> = {};
  ids.forEach((h, j) => {
    assignment[h] = options[best].pos[j];
  });
  return { assignment, confidence: weights[best] / sum, marginals };
}