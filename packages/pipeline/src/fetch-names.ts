import { mkdirSync, writeFileSync } from "node:fs";
import { gql } from "./stratz-client";

const REF = "kind name ofType { kind name ofType { kind name ofType { kind name } } }";
const CYRILLIC = /[а-яё]/i;

interface TypeRef {
  kind: string;
  name: string | null;
  ofType?: TypeRef | null;
}
interface Field {
  name: string;
  type: TypeRef;
  args?: { name: string; type: TypeRef }[];
}

const baseOf = (t: TypeRef): TypeRef => (t.ofType ? baseOf(t.ofType) : t);
const describe = (f: Field) => `${f.name}: ${baseOf(f.type).name}`;

async function fieldsOf(typeName: string): Promise<Field[]> {
  const d = await gql(
    `{ __type(name: "${typeName}") { fields { name type { ${REF} } args { name type { ${REF} } } } } }`,
  );
  return d.__type?.fields ?? [];
}

const root = await gql(`{ __schema { queryType { fields { name type { ${REF} } } } } }`);
const constField = root.__schema.queryType.fields.find((f: Field) => f.name === "constants");
if (!constField) throw new Error("В схеме нет поля constants");

const heroesField = (await fieldsOf(baseOf(constField.type).name!)).find((f) => f.name === "heroes");
if (!heroesField) throw new Error("У constants нет поля heroes");

const langArg = heroesField.args?.find((a) => /lang/i.test(a.name));
if (!langArg) throw new Error("У constants.heroes нет аргумента языка");
const langName = langArg.name;

const heroType = baseOf(heroesField.type).name!;
const heroFields = await fieldsOf(heroType);
console.log(`Поля ${heroType}:`, heroFields.map(describe).join(", "));

// Варианты, где может лежать локализованное название.
const attempts: { label: string; select: string; path: string[] }[] = [
  { label: "displayName", select: "displayName", path: ["displayName"] },
];
for (const f of heroFields) {
  const base = baseOf(f.type);
  if (base.kind === "OBJECT" && /lang|local/i.test(f.name)) {
    for (const s of await fieldsOf(base.name!)) {
      if (baseOf(s.type).kind === "SCALAR" && /name|title/i.test(s.name)) {
        attempts.push({ label: `${f.name}.${s.name}`, select: `${f.name} { ${s.name} }`, path: [f.name, s.name] });
      }
    }
  } else if (
    base.kind === "SCALAR" &&
    /name|title/i.test(f.name) &&
    !["name", "shortName", "displayName"].includes(f.name)
  ) {
    attempts.push({ label: f.name, select: f.name, path: [f.name] });
  }
}

function pluck(row: unknown, path: string[]): string | undefined {
  let v: unknown = row;
  for (const key of path) {
    if (Array.isArray(v)) v = v[0];
    v = (v as Record<string, unknown> | undefined)?.[key];
  }
  if (Array.isArray(v)) v = v[0];
  return typeof v === "string" ? v : undefined;
}

let result: Record<string, string> | null = null;
console.log("Пробую получить названия на русском:");
for (const a of attempts) {
  try {
    const d = await gql(`{ constants { heroes(${langName}: RUSSIAN) { id ${a.select} } } }`);
    const names: Record<string, string> = {};
    for (const h of d.constants.heroes as { id: number }[]) {
      const n = pluck(h, a.path);
      if (n) names[String(h.id)] = n;
    }
    const cyr = Object.values(names).filter((n) => CYRILLIC.test(n)).length;
    console.log(`  ${a.label}: названий ${Object.keys(names).length}, с кириллицей ${cyr}`);
    if (cyr >= 100) {
      result = names;
      break;
    }
  } catch (e) {
    console.log(`  ${a.label}: ошибка ${e instanceof Error ? e.message.slice(0, 160) : e}`);
  }
}

if (!result) {
  console.log("\nРусских названий не нашлось. Пришли весь вывод выше (особенно строку «Поля …»).");
  process.exit(1);
}

mkdirSync("data", { recursive: true });
writeFileSync("data/hero-names.ru.json", JSON.stringify(result, null, 1));
console.log(
  "Примеры:",
  Object.entries(result).slice(0, 8).map(([id, n]) => `${id}=${n}`).join(", "),
);
console.log("Записано: data/hero-names.ru.json");