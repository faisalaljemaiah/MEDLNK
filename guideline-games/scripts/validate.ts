// Checks every lesson under content/ against the schema. Run: npm run validate
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { buildLibrary } from "../src/library.ts";

const root = join(import.meta.dirname, "..", "content");
const files: Record<string, unknown> = {};
const bad: string[] = [];

for (const dir of readdirSync(root)) {
  if (!statSync(join(root, dir)).isDirectory()) continue;
  for (const f of readdirSync(join(root, dir))) {
    if (!f.endsWith(".json")) continue;
    const path = `content/${dir}/${f}`;
    try {
      files[path] = JSON.parse(readFileSync(join(root, dir, f), "utf8"));
    } catch (e) {
      bad.push(`${path}\n  - invalid JSON: ${(e as Error).message}`);
    }
  }
}

const { topics, problems } = buildLibrary(files);
for (const p of problems) bad.push(`${p.file}\n${p.errors.map((e) => `  - ${e}`).join("\n")}`);

for (const t of topics) console.log(`✓ ${t.topic.id}: ${t.lessons.map((l) => l.id).join(", ")}`);
if (bad.length) {
  console.error(`\n✗ ${bad.length} file(s) have problems:\n\n${bad.join("\n\n")}`);
  process.exit(1);
}
console.log("All lesson files are valid.");
