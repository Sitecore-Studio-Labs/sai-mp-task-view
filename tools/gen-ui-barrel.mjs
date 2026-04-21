import fs from "node:fs";
import path from "node:path";

const lib = "libs/ui/src/lib";
const files = fs.readdirSync(lib).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
const lines = [`export { cn } from "./lib/utils";`, `export { SvgIcon } from "./lib/svg-icon";`];
for (const f of files.sort()) {
  if (f === "utils.ts" || f === "svg-icon.tsx") continue;
  const base = f.replace(/\.tsx?$/, "");
  lines.push(`export * from "./lib/${base}";`);
}
fs.writeFileSync("libs/ui/src/index.ts", lines.join("\n") + "\n");
console.log("wrote", lines.length, "lines");
