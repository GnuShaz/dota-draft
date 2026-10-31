const URL = "https://api.stratz.com/graphql";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function gql<T = any>(query: string, attempts = 4): Promise<T> {
  const token = process.env.STRATZ_TOKEN;
  if (!token) throw new Error("Задай переменную окружения STRATZ_TOKEN");

  for (let i = 1; ; i++) {
    const res = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "STRATZ_API",
      },
      body: JSON.stringify({ query }),
    });
    const text = await res.text();

    if ((res.status === 429 || res.status >= 500) && i < attempts) {
      await sleep(1000 * 2 ** (i - 1)); // 1с, 2с, 4с
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);

    const json = JSON.parse(text);
    if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2));
    return json.data as T;
  }
}