import type {
  Bracket,
  BracketData,
  HeroMeta,
  PairStat,
  PairTable,
  Position,
} from "@dota-draft/core";
import type { DataProvider } from "./provider";
import { gql } from "./stratz-client";

const WEEK_SEC = 7 * 24 * 3600;
const POSITION_ENUMS = "POSITION_1, POSITION_2, POSITION_3, POSITION_4, POSITION_5";
const TAKE = 150;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface PairRow {
  heroId1: number;
  heroId2: number;
  matchCount: number | null;
  winCount: number | null;
}
interface MatchUpRow {
  heroId: number;
  vs: PairRow[] | null;
  with: PairRow[] | null;
}
interface StatsRow {
  heroId: number;
  position: string | null;
  matchCount: number | null;
  winCount: number | null;
}
interface HeroRow {
  id: number;
  displayName: string | null;
  shortName: string | null;
}

function addTo(map: Record<number, PairStat>, key: number, games: number, wins: number) {
  const s = (map[key] ??= { games: 0, wins: 0 });
  s.games += games;
  s.wins += wins;
}

function addPair(table: PairTable, a: number, b: number, games: number, wins: number) {
  addTo((table[a] ??= {}), b, games, wins);
}

export interface StratzOptions {
  /** Сколько недель суммировать, включая текущую неполную. */
  weeksBack?: number;
  /** Не брать недели раньше этой (индекс недели), например начало текущего патча. */
  sinceWeek?: number;
}

export class StratzProvider implements DataProvider {
  readonly name = "stratz";
  private opts: StratzOptions;
  private weeks?: number[];
  private currentWeek?: number;
  private heroes?: HeroMeta[];

  constructor(opts: StratzOptions = {}) {
    this.opts = opts;
  }

  async resolveWeeks(): Promise<number[]> {
    if (this.weeks) return this.weeks;
    // Без параметра week STRATZ отдаёт текущую неделю, из ответа берём её индекс.
    const data = await gql(`{ heroStats { stats(heroIds: [1],
      bracketBasicIds: [LEGEND_ANCIENT], positionIds: [POSITION_1],
      groupByPosition: true, groupByTime: false) { week } } }`);
    const current: number | undefined = data.heroStats.stats[0]?.week;
    if (!current) throw new Error("Не удалось определить текущую неделю");

    this.currentWeek = current;
    const back = this.opts.weeksBack ?? 3;
    const since = this.opts.sinceWeek ?? -Infinity;
    this.weeks = Array.from({ length: back }, (_, i) => current - i).filter(
      (w) => w >= since,
    );
    return this.weeks;
  }

  /** Для текущей недели параметр не передаём (так проверено), для прошлых это timestamp. */
  private weekArg(week: number): string {
    return week === this.currentWeek ? "" : `, week: ${week * WEEK_SEC}`;
  }

  async fetchHeroes(): Promise<HeroMeta[]> {
    if (this.heroes) return this.heroes;
    const data = await gql<{ constants: { heroes: HeroRow[] } }>(
      `{ constants { heroes { id displayName shortName } } }`,
    );
    this.heroes = data.constants.heroes
      .filter((h) => h.shortName)
      .map((h) => ({
        id: h.id,
        name: `npc_dota_hero_${h.shortName}`,
        localizedName: h.displayName ?? h.shortName!,
      }));
    return this.heroes;
  }

  async fetchBracket(bracket: Bracket): Promise<BracketData> {
    const weeks = await this.resolveWeeks();
    const heroIds = (await this.fetchHeroes()).map((h) => h.id);
    const B = bracket.toUpperCase();

    const data: BracketData = {
      overall: {},
      byPosition: { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} },
      vs: {},
      with: {},
    };
    let foreign = 0;

    for (const week of weeks) {
      const w = this.weekArg(week);

      const mu = await gql(`{ heroStats { matchUp(bracketBasicIds: [${B}], take: ${TAKE}${w}) {
        heroId
        vs { heroId1 heroId2 matchCount winCount }
        with { heroId1 heroId2 matchCount winCount }
      } } }`);
      const rows: MatchUpRow[] = mu.heroStats.matchUp;
      if (rows.length >= TAKE) {
        console.warn(`  ! matchUp вернул ${rows.length} героев, возможно, упёрлись в take=${TAKE}`);
      }
      for (const m of rows) {
        for (const r of m.vs ?? []) {
          if (r.heroId1 !== m.heroId) foreign++;
          addPair(data.vs, m.heroId, r.heroId2, r.matchCount ?? 0, r.winCount ?? 0);
        }
        for (const r of m.with ?? []) {
          if (r.heroId1 !== m.heroId) foreign++;
          addPair(data.with, m.heroId, r.heroId2, r.matchCount ?? 0, r.winCount ?? 0);
        }
      }
      await sleep(300);

      const st = await gql(`{ heroStats { stats(heroIds: [${heroIds.join(",")}],
        bracketBasicIds: [${B}], positionIds: [${POSITION_ENUMS}],
        groupByPosition: true, groupByTime: false${w}) {
        heroId position matchCount winCount
      } } }`);
      for (const r of st.heroStats.stats as StatsRow[]) {
        const n = Number((r.position ?? "").replace("POSITION_", ""));
        if (!(n >= 1 && n <= 5)) continue;
        const games = r.matchCount ?? 0;
        const wins = r.winCount ?? 0;
        addTo(data.byPosition[n as Position], r.heroId, games, wins);
        addTo(data.overall, r.heroId, games, wins); // общий винрейт = сумма по позициям 1-5
      }
      await sleep(300);
    }

    if (foreign > 0) {
      console.warn(`  ! ${foreign} строк, где heroId1 не совпал с героем-владельцем, проверь семантику`);
    }
    return data;
  }
}