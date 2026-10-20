// Builds dist-artifact/guideline-games.html: the whole app inlined into one
// page, for sharing as a link. Run: npm run build:artifact
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const out = join(root, "dist-artifact");
execSync("npx vite build --mode artifact --outDir dist-artifact/build --emptyOutDir", { cwd: root, stdio: "inherit" });

const assets = join(out, "build", "assets");
const files = readdirSync(assets);
const read = (ext: string) => files.filter((f) => f.endsWith(ext)).map((f) => readFileSync(join(assets, f), "utf8")).join("\n");
// Keep a literal "</script" inside the bundle from closing the inline tag.
const js = read(".js").replace(/<\/script/gi, "<\\/script");

mkdirSync(out, { recursive: true });
writeFileSync(
  join(out, "guideline-games.html"),
  `<title>Guideline Games</title>
<style>${read(".css")}</style>
<div id="root"></div>
<script type="module">${js}</script>
`,
);
console.log("Wrote dist-artifact/guideline-games.html");
