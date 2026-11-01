import { mkdirSync, writeFileSync } from "node:fs";
import { gql } from "./stratz-client";

const REF = "kind name ofType { kind name ofType { kind name ofType { kind name } } }";

interface TypeRef {
  kind: string;
  name: string | null;
  ofType?: TypeRef | null;
}
const baseOf = (t: TypeRef): TypeRef => (t.ofType ? baseOf(t.ofType) : t);

const root = await gql(`{ __schema { queryType { fields { name type { ${REF} } } } } }`);
const constField = root.__schema.queryType.fields.find((f: { name: string }) => f.name === "constants");
if (!constField) throw new Error("В схеме нет поля constants");
const constType = baseOf(constField.type).name;

const info = await gql(
  `{ __type(name: "${constType}") { fields { name args { name type { ${REF} } } } } }`,
);
const heroesField = info.__type.fields.find((f: { name: string }) => f.name === "heroes");
if (!heroesField) throw new Error(`В типе ${constType} нет поля heroes`);

const args = heroesField.args as { name: string; type: TypeRef }[];
console.log(
  "аргументы constants.heroes:",
  args.map((a) => `${a.name}: ${baseOf(a.type).name}`).join(", ") || "(нет)",
);

const langArg = args.find((a) => /lang/i.test(a.name));
if (!langArg) {
  console.log("Аргумента языка нет. Пришли строку выше, поищем другой источник.");
  process.exit(1);
}

const enumName = baseOf(langArg.type).name;
const en = await gql(`{ __type(name: "${enumName}") { enumValues { name } } }`);
const values: string[] = en.__type?.enumValues?.map((v: { name: string }) => v.name) ?? [];
console.log(`${enumName}:`, values.join(", ") || "(не enum)");

const ruValue = values.find((v) => /russian|^ru$|^ru_/i.test(v));
if (!ruValue) {
  console.log("Русского языка в списке нет. Пришли вывод выше.");
  process.exit(1);
}

interface H {
  id: number;
  displayName: string | null;
}
type HeroesData = { constants: { heroes: H[] } };

const ru = await gql<HeroesData>(
  `{ constants { heroes(${langArg.name}: ${ruValue}) { id displayName } } }`,
);
const base = await gql<HeroesData>(`{ constants { heroes { id displayName } } }`);

const enById = new Map(base.constants.heroes.map((h) => [h.id, h.displayName ?? ""] as const));
const out: Record<string, string> = {};
let same = 0;
for (const h of ru.constants.heroes) {
  if (!h.displayName) continue;
  out[String(h.id)] = h.displayName;
  if (h.displayName === enById.get(h.id)) same++;
}

const total = Object.keys(out).length;
console.log(`Русских названий: ${total}, совпадают с английскими: ${same}`);
console.log(
  "Примеры:",
  Object.entries(out).slice(0, 8).map(([id, n]) => `${id}=${n}`).join(", "),
);
if (same > total * 0.8) {
  console.log("Почти все совпали с английскими: похоже, язык не применился. Пришли вывод.");
}

mkdirSync("data", { recursive: true });
writeFileSync("data/hero-names.ru.json", JSON.stringify(out, null, 1));
console.log("Записано: data/hero-names.ru.json");