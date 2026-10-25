// The Go grader and bilingual web prompts must use one authored answer contract.
import { readFileSync, writeFileSync } from "node:fs";
import { learningBankMessage } from "./learning-bank-message.mjs";

const bank = JSON.parse(readFileSync(new URL("../backend/internal/domain/learning/content/quick-questions.json", import.meta.url), "utf8"));
const check = process.argv.includes("--check");
const topics = {
  "frequency-units": ["频率单位", "Frequency units"],
  "signal-transformation": ["信号变换", "Signal transformations"],
  impulse: ["阶跃与冲激", "Steps and impulses"],
  "system-properties": ["系统性质", "System properties"],
  "system-model": ["系统建模", "System modeling"],
  "zero-state": ["零状态与全响应", "Zero-state and total responses"],
  "zero-input": ["零输入响应", "Zero-input response"],
  "initial-values": ["初始值与跳变", "Initial values and jumps"],
  "step-response": ["冲激与阶跃响应", "Impulse and step responses"],
  correlation: ["相关函数", "Correlation"],
  "frequency-response": ["频率响应", "Frequency response"],
  "spectral-energy": ["能量谱", "Energy spectra"],
  "laplace-roc": ["拉氏变换与收敛域", "Laplace transform and ROC"],
  "laplace-properties": ["拉氏变换性质", "Laplace properties"],
  "laplace-inverse": ["拉氏逆变换", "Inverse Laplace transform"],
  "circuit-model": ["电路 s 域模型", "Circuit s-domain models"],
  stability: ["稳定性", "Stability"],
  "block-diagrams": ["框图与梅森公式", "Block diagrams and Mason’s rule"],
  realization: ["系统实现", "System realization"],
};
for (const [index, locale] of ["zh-CN", "en-US"].entries()) {
  const path = new URL(`../apps/web/i18n/messages/${locale}/learning-labs.json`, import.meta.url);
  const original = readFileSync(path, "utf8");
  const messages = JSON.parse(original);
  for (const q of bank.questions) {
    const text = q[index === 0 ? "zh" : "en"];
    messages.quiz.questions[q.id] = { prompt: learningBankMessage(text.prompt), ...Object.fromEntries(text.options.map((option, i) => [`option${i + 1}`, learningBankMessage(option)])), explain: learningBankMessage(text.explanation) };
    for (const [option, code] of Object.entries(q.misconceptions)) {
      // Original individually authored diagnoses remain more specific.
      if (!messages.progress.diagnoses[code]) messages.progress.diagnoses[code] = {
        thought: learningBankMessage(index === 0 ? `选择“${text.options[Number(option)]}”与题设条件不符。` : `The choice “${text.options[Number(option)]}” does not satisfy the stated conditions.`),
        correction: learningBankMessage(text.explanation),
      };
    }
  }
  for (const [id, labels] of Object.entries(topics)) messages.progress.topics[id] = labels[index];
  const updated = `${JSON.stringify(messages, null, 2)}\n`;
  if (check) {
    if (JSON.stringify(JSON.parse(original)) !== JSON.stringify(messages)) throw new Error(`Stale question text: ${locale}; run node scripts/sync-learning-bank.mjs`);
  } else writeFileSync(path, updated);
}
console.log(`${check ? "Verified" : "Synchronized"} ${bank.questions.length} questions and ${bank.questions.flatMap((q) => q.variants).length} variants (${bank.version}).`);
