import { gql } from "./stratz-client";

const TYPE_REF =
  "kind name ofType { kind name ofType { kind name ofType { kind name } } }";

interface TypeRef {
  kind: string;
  name: string | null;
  ofType?: TypeRef | null;
}

function typeStr(t: TypeRef | null | undefined): string {
  if (!t) return "";
  if (t.kind === "NON_NULL") return typeStr(t.ofType) + "!";
  if (t.kind === "LIST") return `[${typeStr(t.ofType)}]`;
  return t.name ?? "?";
}

function baseName(t: TypeRef): string {
  return t.ofType ? baseName(t.ofType) : (t.name ?? "?");
}

const root = await gql(
  `{ __schema { queryType { fields { name type { ${TYPE_REF} } } } } }`,
);
const heroStatsField = root.__schema.queryType.fields.find(
  (f: any) => f.name === "heroStats",
);
const heroStatsType = baseName(heroStatsField.type);
console.log("heroStats type:", heroStatsType, "\n");

const t = await gql(
  `{ __type(name: "${heroStatsType}") { fields { name args { name type { ${TYPE_REF} } } } } }`,
);

const enums = new Set<string>();
for (const f of t.__type.fields) {
  const args = f.args.map((a: any) => `${a.name}: ${typeStr(a.type)}`).join(", ");
  console.log(`${f.name}(${args})`);
  for (const a of f.args) {
    if (/position|bracket|rank/i.test(a.name)) enums.add(baseName(a.type));
  }
}

console.log();
for (const name of enums) {
  const e = await gql(`{ __type(name: "${name}") { enumValues { name } } }`);
  console.log(
    `enum ${name}:`,
    e.__type?.enumValues?.map((v: any) => v.name).join(", "),
  );
}