import type {
  BracketData,
  HeroId,
  PairStat,
  PairTable,
  Position,
  Reason,
  Recommendation,
  RecommendInput,
  RecommendOptions,
} from "./types";

export const DEFAULT_OPTIONS: Required<RecommendOptions> = {
  k: 200,
  kBase: 50,
  minPairGames: 100,
  minBaselineGames: 500,
  minPositionShare: 0.05,
  enemyWeight: 1,
  allyWeight: 0.7,
  baseWeight: 0.7,
  limit: 10,
};

const clamp = (p: number) => Math.min(0.999, Math.max(0.001, p));
export const logit = (p: number) => Math.log(clamp(p) / (1 - clamp(p)));
export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/** Сжатие винрейта к prior: мало игр, значит ближе к prior. */
export function shrink(stat: PairStat, prior: number, k: number): number {
  return (stat.wins + k * prior) / (stat.games + k);
}

export function recommend(
  data: BracketData,
  position: Position,
  input: RecommendInput,
  options: RecommendOptions = {},
): Recommendation[] {
  const o = { ...DEFAULT_OPTIONS, ...options };
  const taken = new Set<HeroId>([...input.allies, ...input.enemies]);
  const results: Recommendation[] = [];

  const posTable: Record<HeroId, PairStat> = data.byPosition[position] ?? {};

  for (const [idStr, posStat] of Object.entries(posTable)) {
    const heroId = Number(idStr);
    if (taken.has(heroId) || posStat.games < o.minBaselineGames) continue;

    const overallStat = data.overall[heroId];
    if (
      overallStat &&
      overallStat.games > 0 &&
      posStat.games / overallStat.games < o.minPositionShare
    ) {
      continue;
    }

    // Позиционная база: с неё стартуем. Общая база: от неё меряем вклад пар,
    // потому что матчапы посчитаны по всем позициям сразу.
    const posRate = shrink(posStat, 0.5, o.kBase);
    const overallRate = shrink(data.overall[heroId] ?? posStat, 0.5, o.kBase);
    const posLogit = logit(posRate);
    const overallLogit = logit(overallRate);
    const reasons: Reason[] = [];

    const collect = (
      kind: Reason["kind"],
      others: HeroId[],
      table: PairTable,
      weight: number,
    ) => {
      for (const otherId of others) {
        const stat = table[heroId]?.[otherId];
        if (!stat || stat.games < o.minPairGames) continue;
        const delta =
          (logit(shrink(stat, overallRate, o.k)) - overallLogit) * weight;
        reasons.push({
          kind,
          heroId: otherId,
          games: stat.games,
          delta,
          ppEffect: (sigmoid(posLogit + delta) - posRate) * 100,
        });
      }
    };

    collect("vs", input.enemies, data.vs, o.enemyWeight);
    collect("with", input.allies, data.with, o.allyWeight);

    const deltaSum = reasons.reduce((sum, r) => sum + r.delta, 0);
    reasons.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    results.push({
      heroId,
      winProb: sigmoid(posLogit + deltaSum),
      baseWinProb: posRate,
      score: o.baseWeight * posLogit + deltaSum,
      reasons,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, o.limit);
}