// Keep server-side parameter validation aligned with the shipped experiment engine.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createVirtualLabEngine } from "../public/vendor/signal-lab/core.mjs";

const lab = createVirtualLabEngine();
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
