const URL = "https://api.stratz.com/graphql";
const token = process.env.STRATZ_TOKEN;
if (!token) throw new Error("Сначала задай STRATZ_TOKEN");

interface Row { heroId2: number; matchCount: number; winCount: number }
interface MatchUp { heroId: number; vs: Row[]; with: Row[] }

async function gql(query: string) {
  const res = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "STRATZ_API", // STRATZ может блокировать запросы без User-Agent
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
  return JSON.parse(text);
}

function stats(rows: Row[]) {
  const g = rows.map((r) => r.matchCount).sort((a, b) => a - b);
  return `n=${g.length} min=${g[0]} median=${g[Math.floor(g.length / 2)]} max=${g[g.length - 1]}`;
}

for (const bracket of ["DIVINE_IMMORTAL", "LEGEND_ANCIENT"]) {
  const query = `{ heroStats { matchUp(take: 150, bracketBasicIds: [${bracket}]) {
    heroId
    vs { heroId2 matchCount winCount }
    with { heroId2 matchCount winCount }
  } } }`;
  try {
    const json = await gql(query);
    if (json.errors) {
      console.log(bracket, "GraphQL errors:", JSON.stringify(json.errors, null, 2));
      continue;
    }
    const list: MatchUp[] = json.data.heroStats.matchUp;
    console.log(`${bracket}: ${list.length} heroes in response`);
    for (const id of [1, 14, 74]) {
      const h = list.find((x) => x.heroId === id);
      if (!h) { console.log(`  hero ${id}: not found`); continue; }
      console.log(`  hero ${id} vs:   ${stats(h.vs)}`);
      console.log(`  hero ${id} with: ${stats(h.with)}`);
    }
  } catch (e) {
    console.log(bracket, "failed:", e instanceof Error ? e.message : e);
  }
}

export {};