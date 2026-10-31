import { gql } from "./stratz-client";

const WEEK_SEC = 7 * 24 * 3600;
const CURRENT = 2965; // номер недели из прошлого вывода

const variants: [string, number | null][] = [
  ["не задана", null],
  [`индекс ${CURRENT}`, CURRENT],
  [`индекс ${CURRENT - 1}`, CURRENT - 1],
  [`индекс ${CURRENT - 2}`, CURRENT - 2],
  [`timestamp ${CURRENT - 1}`, (CURRENT - 1) * WEEK_SEC],
  [`timestamp ${CURRENT - 2}`, (CURRENT - 2) * WEEK_SEC],
];

for (const [label, week] of variants) {
  const w = week === null ? "" : `, week: ${week}`;
  try {
    const data = await gql(`{ heroStats {
      stats(heroIds: [1], bracketBasicIds: [LEGEND_ANCIENT], positionIds: [POSITION_1],
            groupByPosition: true, groupByTime: false${w}) {
        heroId position week matchCount winCount
      }
      matchUp(heroIds: [1], bracketBasicIds: [LEGEND_ANCIENT], take: 150${w}) {
        heroId
        vs { heroId2 week matchCount winCount }
      }
    } }`);
    const s = data.heroStats.stats[0];
    const m = data.heroStats.matchUp[0]?.vs.find((r: any) => r.heroId2 === 14);
    console.log(
      `${label}: stats -> week=${s?.week} games=${s?.matchCount} | пара 1 vs 14 -> week=${m?.week} games=${m?.matchCount}`,
    );
  } catch (e) {
    console.log(`${label}: ERROR`, e instanceof Error ? e.message.slice(0, 300) : e);
  }
}

export {};