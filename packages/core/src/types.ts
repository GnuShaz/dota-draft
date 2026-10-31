export type HeroId = number;
export type Position = 1 | 2 | 3 | 4 | 5;
export type Bracket =
  | "herald_guardian"
  | "crusader_archon"
  | "legend_ancient"
  | "divine_immortal";

/** Сырые счётчики. Сглаживание считается в рантайме, чтобы k можно было подбирать без пайплайна. */
export interface PairStat {
  games: number;
  wins: number;
}

export type PairTable = Record<HeroId, Record<HeroId, PairStat>>;

/**
 * Данные одного ранга, все цифры от лица кандидата на пик.
 * Матчапы vs/with общие для всех позиций: STRATZ не фильтрует их по позиции.
 */
export interface BracketData {
  overall: Record<HeroId, PairStat>; // герой по всем позициям
  byPosition: Record<Position, Record<HeroId, PairStat>>; // герой на позиции
  vs: PairTable; // vs[кандидат][враг]
  with: PairTable; // with[кандидат][союзник]
}

export interface HeroMeta {
  id: HeroId;
  name: string; // npc_dota_hero_antimage (для картинок)
  localizedName: string;
}

export interface Snapshot {
  generatedAt: string;
  weeks: number[]; // какие недели STRATZ вошли в снапшот
  heroes: HeroMeta[];
  brackets: Record<Bracket, BracketData>;
}

export interface RecommendInput {
  allies: HeroId[]; // без тебя
  enemies: HeroId[];
}

export interface RecommendOptions {
  k?: number; // сила сглаживания пар
  kBase?: number; // сила сглаживания базовых винрейтов
  minPairGames?: number; // ниже порога вклад пары = 0
  minBaselineGames?: number; // герои с меньшим числом игр на позиции не рекомендуем
  minPositionShare?: number; // доля игр героя на этой позиции от всех его игр (0..1)
  minPickShare?: number; // доля игр героя от всех игр на этой позиции (0..1)
  enemyWeight?: number;
  allyWeight?: number;
  baseWeight?: number;
  limit?: number;
}

export interface Reason {
  kind: "vs" | "with";
  heroId: HeroId;
  games: number;
  delta: number; // вклад в log-odds (уже с весом)
  ppEffect: number; // примерный вклад в процентных пунктах, для UI
}

export interface Recommendation {
  heroId: HeroId;
  winProb: number;
  baseWinProb: number; // винрейт героя на этой позиции
  score: number; // число для сортировки (логиты, с учётом baseWeight)
  reasons: Reason[]; // по убыванию |delta|
}