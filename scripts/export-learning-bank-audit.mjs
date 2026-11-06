import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const content = new URL("backend/internal/domain/learning/content/", root);
const bank = JSON.parse(readFileSync(new URL("quick-questions.json", content), "utf8"));
const course = JSON.parse(readFileSync(new URL("course.json", content), "utf8"));
const pairs = JSON.parse(readFileSync(new URL("paired-questions.json", content), "utf8")).pairs;
const variantCount = bank.questions.flatMap((q) => q.variants).length;
const courseCount = course.lessons.flatMap((l) => l.questions).length;
const total = bank.questions.length + variantCount + courseCount + pairs.length;
const chapterCounts = ["1","2","3","4"].map((id) => `第${id}章 ${bank.questions.filter((q) => q.chapterID === id).length} 道`).join("、");
const sources = new Map();
function handouts(item) {
  return item.sources.map((id) => {
    if (!sources.has(id)) sources.set(id, readFileSync(new URL(`content/signals/knowledge-base/${id}.md`, root), "utf8").split(/\r?\n/)[0].replace(/^# /,""));
    return `[${sources.get(id)}](../content/signals/knowledge-base/${id}.md)`;
  }).join("；");
}
const escape = (s) => String(s).replaceAll("|", "\\|").replaceAll("\n", " ");
const answer = (q, text=q) => q.options?.length || text.options?.length ? `${String.fromCharCode(65+q.answer)} · ${text.options[q.answer]}` : q.fields.map((f)=>`${f.label}=${f.expected}${f.unit?` ${f.unit}`:""}`).join("；");
const lines = [
  "# 题库答案与配对清单", "", `题库版本：${bank.version}。此文件由 \`node scripts/export-learning-bank-audit.mjs\` 从实际启用的题库生成，供教师逐题核对。`, "",
  `快问快答 **${bank.questions.length}** 道（${chapterCounts}）；复习变式 **${variantCount}** 道；课程原题 **${courseCount}** 道；同知识点复测 **${pairs.length}** 道。本清单收录 **${total}** 个题目实例，不包含作业、实验及其他用途题库。`, "",
  "## 本次扩充与核验", "",
  "出题边界为 `content/signals/knowledge-base` 的 52 份已发布讲义（含附录 A、B）。快问快答从 80 道扩至 240 道，变式从 160 道扩至 480 道；每道主问题始终配两道变式。全部 720 道均标明讲义出处。", "",
  "新增 480 道题涵盖 80 个题型，每题均附中英文题面、唯一正确选项、解析和独立计算元数据。`apps/web/scripts/learning-question-bank.test.mjs` 逐题核验，`learning-expansion-calculations.mjs` 使用独立公式、数值积分、直接求和、直接 DFT 和微分方程数值解复算答案，不读取出题脚本的计算结果。选项按需要保留六位小数，并在题面提示选择最接近值。", "",
  "范围核对发现旧 `damping` 主问题及两道变式要求讲义未展开的阻尼比/超调量公式，已改用新 ID `second-order-mode-decay` 及配套变式，考查 2.1 节的特征根与衰减包络。这 3 道替换题同样经过独立复算，其余 79 组原题题面、答案与 ID 保留。相关函数统一使用讲义的 y(t−τ) 约定。", "",
  "题库版本升级隔离不同题量的排行榜。退役题的作答仍保存在数据库，当前题库与最近作答视图不再暴露其失效入口，也不把旧作答转记到新题。新增题的正确选项在 A/B/C/D 各分布 120 次；同步检查双语一致性、题目与变式关联、讲义引用和错题诊断。", "",
  "## 快问快答与复习变式", "",
];
for (const chapter of ["1","2","3","4"]) {
  lines.push(`### 第${chapter}章`,"","| ID | 题目 | 正确答案 | 解析 | 讲义依据 |","| --- | --- | --- | --- | --- |");
  for (const q of bank.questions.filter((q)=>q.chapterID===chapter)) {
    for (const item of [q,...q.variants]) lines.push(`| ${item.id} | ${escape(item.zh.prompt)} | ${escape(answer(item,item.zh))} | ${escape(item.zh.explanation)} | ${handouts(item)} |`);
  }
  lines.push("");
}
lines.push("## 课程预习与同知识点复测配对", "", "每个配对共享一个知识点标识。原课中题、课后题可能考查不同子技能，不自动视为等价前后测。", "", "| 小节 / 知识点 | 预习题与答案 | 复测题与答案 | 复测解析 |", "| --- | --- | --- | --- |");
for (const l of course.lessons) {
  const pair=pairs.find((p)=>p.lessonID===l.id),pre=l.questions.find((q)=>q.stage==="preview"),post=pair.followup;
  lines.push(`| ${l.number} ${escape(pair.conceptTitle)} | ${escape(pre.prompt)} **${escape(answer(pre))}** | ${escape(post.prompt)} **${escape(answer(post))}** | ${escape(post.explanation)} |`);
}
lines.push("", "## 原156道课程题答案", "", "原ID与评分键保留；补严Welch分段和理想微分器的题设条件。", "", "| 小节 | 阶段 / ID | 题目 | 答案 | 解析 |", "| --- | --- | --- | --- | --- |");
for (const l of course.lessons) for (const q of l.questions) lines.push(`| ${l.number} | ${q.stage} / ${q.id} | ${escape(q.prompt)} | ${escape(answer(q))} | ${escape(q.explanation)} |`);
writeFileSync(new URL("docs/QUESTION-BANK-ANSWER-AUDIT.zh-CN.md",root),`${lines.join("\n")}\n`);
console.log(`Exported ${total} question instances with answer keys, rationales, handout references and ${pairs.length} concept pairs.`);
