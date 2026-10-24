// Keep server-side parameter validation aligned with the shipped experiment engine.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const context = vm.createContext({});
for (const name of ["models", "models-extra", "tasks", "tasks-extra"]) {
  vm.runInContext(readFileSync(new URL(`../public/vendor/signal-lab/assets/js/${name}.js`, import.meta.url), "utf8"), context);
}
const lab = context.SignalLab;
const specs = Object.fromEntries(lab.taskIds.map((id) => [id, {
  params: Object.fromEntries(lab.tasks[id].params.map((p) => [p.key, { type: p.type, min: p.min, max: p.max, options: p.options?.map(([value]) => value), default: p.value }])),
  answers: (lab.tasks[id].answers || []).map((a) => a.key),
}]));
const output = `${JSON.stringify(specs, null, 2)}\n`;
const target = new URL("../../../backend/internal/domain/learning/content/virtual-lab-task-specs.json", import.meta.url);
if (process.argv.includes("--check")) {
  if (readFileSync(target, "utf8") !== output) throw new Error("Run node apps/web/scripts/sync-virtual-lab-schema.mjs");
} else {
  writeFileSync(target, output);
  console.log(`Updated lab parameter schema: ${fileURLToPath(target)}`);
}
