import { gql } from "./stratz-client";

const BRACKET = "LEGEND_ANCIENT";
const POSITIONS = "POSITION_1, POSITION_2, POSITION_3, POSITION_4, POSITION_5";

interface Row {
  heroId1: number;
  heroId2: number;
  week: number;
  matchCount: number;
  winCount: number;
}
interface MatchUp {
  heroId: number;
  vs: Row[];
  with: Row[];
}

async function step(label: string, fn: () => Promise<void>) {
  console.log(`\n--- ${label}`);
  try {
    await fn();
  } catch (e) {
    console.log("ERROR:", e instanceof Error ? e.message : e);
  }
}

const matchUpQuery = (week?: number) => `{ heroStats {
  matchUp(heroIds: [1, 14], bracketBasicIds: [${BRACKET}], take: 150${week ? `, week: ${week}` : ""}) {
    heroId
    vs { heroId1 heroId2 week matchCount winCount }
    with { heroId1 heroId2 week matchCount winCount }
  }
} }`;

let currentWeek = 0;

await step("1. Семантика vs / with (герои 1 и 14)", async () => {
  const data = await gql(matchUpQuery());
  const list: MatchUp[] = data.heroStats.matchUp;
  const h1 = list.find((x) => x.heroId === 1);
  const h14 = list.find((x) => x.heroId === 14);
  if (!h1 || !h14) throw new Error(`герои в ответе: ${list.map((x) => x.heroId)}`);

  const a = h1.vs.find((r) => r.heroId2 === 14);
  const b = h14.vs.find((r) => r.heroId2 === 1);
  console.log("1 vs 14:", a);
  console.log("14 vs 1:", b);
  if (a && b) {
    console.log(
      `сумма побед = ${a.winCount + b.winCount}, игр = ${a.matchCount} / ${b.matchCount}`,
    );
  }
  console.log("1 with 14:", h1.with.find((r) => r.heroId2 === 14));
  console.log("14 with 1:", h14.with.find((r) => r.heroId2 === 1));
  currentWeek = a?.week ?? 0;
});

await step("2. stats по позициям (герои 1 и 14)", async () => {
  const data = await gql(`{ heroStats {
    stats(heroIds: [1, 14], bracketBasicIds: [${BRACKET}], positionIds: [${POSITIONS}],
          groupByPosition: true, groupByTime: false) {
      heroId position time matchCount winCount remainingMatchCount week
    }
  } }`);
  const rows: any[] = data.heroStats.stats;
  console.log("строк всего:", rows.length);
  console.log("первые строки:", rows.slice(0, 6));

  const groups: Record<string, any[]> = {};
  for (const r of rows) (groups[`hero ${r.heroId} ${r.position}`] ??= []).push(r);
  for (const [key, g] of Object.entries(groups)) {
    const sum = (f: string) => g.reduce((s, r) => s + (r[f] ?? 0), 0);
    const max = Math.max(...g.map((r) => r.matchCount ?? 0));
    console.log(
      `${key}: rows=${g.length} maxMatchCount=${max} sumMatchCount=${sum("matchCount")} sumWinCount=${sum("winCount")}`,
    );
  }
});

await step("3. Предыдущие недели (пара 1 vs 14)", async () => {
  console.log("week из шага 1:", currentWeek);
  if (!currentWeek) throw new Error("в шаге 1 не получили week");
  const WEEK = 7 * 24 * 3600;
  for (const w of [currentWeek - WEEK, currentWeek - 2 * WEEK]) {
    const data = await gql(matchUpQuery(w));
    const list: MatchUp[] = data.heroStats.matchUp;
    const row = list.find((x) => x.heroId === 1)?.vs.find((r) => r.heroId2 === 14);
    console.log(`week=${w}:`, row ?? "нет данных");
  }
});