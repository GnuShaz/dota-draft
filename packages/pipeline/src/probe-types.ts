import { gql } from "./stratz-client";

const REF = "kind name ofType { kind name ofType { kind name ofType { kind name } } }";

interface TypeRef {
  kind: string;
  name: string | null;
  ofType?: TypeRef | null;
}

const typeStr = (t?: TypeRef | null): string =>
  !t ? "" : t.kind === "NON_NULL" ? typeStr(t.ofType) + "!"
  : t.kind === "LIST" ? `[${typeStr(t.ofType)}]`
  : (t.name ?? "?");

const baseRef = (t: TypeRef): TypeRef => (t.ofType ? baseRef(t.ofType) : t);

async function describeType(name: string, indent: string, depth: number) {
  const data = await gql(
    `{ __type(name: "${name}") { fields { name description type { ${REF} } } } }`,
  );
  for (const f of data.__type?.fields ?? []) {
    const note = f.description ? `   // ${f.description}` : "";
    console.log(`${indent}${f.name}: ${typeStr(f.type)}${note}`);
    const base = baseRef(f.type);
    if (depth > 0 && base.kind === "OBJECT" && base.name) {
      await describeType(base.name, indent + "  ", depth - 1);
    }
  }
}

const wanted = process.argv.slice(2); // имена полей heroStats
const hs = await gql(
  `{ __type(name: "HeroStatsQuery") { fields { name description
       args { name description type { ${REF} } } type { ${REF} } } } }`,
);

for (const f of hs.__type.fields) {
  if (!wanted.includes(f.name)) continue;
  console.log(`\n=== ${f.name} -> ${typeStr(f.type)}`);
  if (f.description) console.log(`// ${f.description}`);
  for (const a of f.args) {
    const note = a.description ? `   // ${a.description}` : "";
    console.log(`  arg ${a.name}: ${typeStr(a.type)}${note}`);
  }
  console.log("  returns:");
  await describeType(baseRef(f.type).name!, "    ", 2);
}