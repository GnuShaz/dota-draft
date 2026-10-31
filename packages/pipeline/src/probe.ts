const BASE = "https://api.opendota.com/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json() as Promise<T>;
}

interface Hero { id: number; localized_name: string }
interface Matchup { hero_id: number; games_played: number; wins: number }

const heroes = await get<Hero[]>("/heroes");
console.log(`heroes: ${heroes.length}`);

// Anti-Mage, Pudge, Invoker
for (const id of [1, 14, 74]) {
  const hero = heroes.find((h) => h.id === id);
  const m = await get<Matchup[]>(`/heroes/${id}/matchups`);
  const games = m.map((x) => x.games_played).sort((a, b) => a - b);
  const median = games[Math.floor(games.length / 2)];
  console.log(
    `${hero?.localized_name}: ${m.length} opponents, games per pair: ` +
      `min=${games[0]} median=${median} max=${games[games.length - 1]}`,
  );
}
export {};