import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const OUT = "packages/web/public/ocr";

function pkgRoot(entry: string, name: string): string {
  let dir = dirname(entry);
  for (;;) {
    const pj = join(dir, "package.json");
    if (existsSync(pj) && (JSON.parse(readFileSync(pj, "utf8")) as { name?: string }).name === name) return dir;
    const up = dirname(dir);
    if (up === dir) throw new Error(`Не нашёл пакет ${name}`);
    dir = up;
  }
}

const fromWeb = createRequire(join(process.cwd(), "packages/web/package.json"));
const tessRoot = pkgRoot(fromWeb.resolve("tesseract.js"), "tesseract.js");

let coreRoot: string;
try {
  coreRoot = pkgRoot(createRequire(join(tessRoot, "package.json")).resolve("tesseract.js-core"), "tesseract.js-core");
} catch {
  coreRoot = join(dirname(tessRoot), "tesseract.js-core"); // соседняя папка в хранилище pnpm
}
if (!existsSync(coreRoot)) throw new Error(`Не нашёл tesseract.js-core рядом с ${tessRoot}`);

const worker = join(tessRoot, "dist", "worker.min.js");
if (!existsSync(worker)) throw new Error(`Не нашёл ${worker}`);

mkdirSync(join(OUT, "lang"), { recursive: true });
copyFileSync(worker, join(OUT, "worker.min.js"));

let cores = 0;
for (const f of readdirSync(coreRoot)) {
  if (/^tesseract-core.*\.(js|wasm)$/.test(f)) {
    copyFileSync(join(coreRoot, f), join(OUT, f));
    cores++;
  }
}
if (cores === 0) throw new Error(`В ${coreRoot} нет файлов tesseract-core*`);
console.log(`worker.min.js и ${cores} файлов ядра скопированы`);

// Быстрые модели Tesseract для русского и английского (без архива, поэтому gzip: false на сайте).
for (const lang of ["rus", "eng"]) {
  const target = join(OUT, "lang", `${lang}.traineddata`);
  if (existsSync(target) && statSync(target).size > 1_000_000) {
    console.log(`${lang}.traineddata уже есть`);
    continue;
  }
  let ok = false;
  for (const branch of ["main", "master"]) {
    const r = await fetch(`https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/${branch}/${lang}.traineddata`);
    if (!r.ok) continue;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 1_000_000) continue;
    writeFileSync(target, buf);
    console.log(`${lang}.traineddata: ${(buf.length / 1e6).toFixed(1)} МБ (ветка ${branch})`);
    ok = true;
    break;
  }
  if (!ok) throw new Error(`Не удалось скачать ${lang}.traineddata`);
}
console.log("Готово: packages/web/public/ocr");