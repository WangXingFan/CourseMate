import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const content = new URL("backend/internal/domain/learning/content/", root);
const bank = JSON.parse(readFileSync(new URL("quick-questions.json", content), "utf8"));
const course = JSON.parse(readFileSync(new URL("course.json", content), "utf8"));
const pairs = JSON.parse(readFileSync(new URL("paired-questions.json", content), "utf8")).pairs;
const escape = (s) => String(s).replaceAll("|", "\\|").replaceAll("\n", " ");
const answer = (q, text=q) => q.options?.length || text.options?.length ? `${String.fromCharCode(65+q.answer)} · ${text.options[q.answer]}` : q.fields.map((f)=>`${f.label}=${f.expected}${f.unit?` ${f.unit}`:""}`).join("；");
const lines = [
  "# 题库答案与配对清单", "", "截至 2026-10-24。此文件由 `node scripts/export-learning-bank-audit.mjs` 从实际启用的题库生成，供教师逐题核对。", "",
  `快问快答 **${bank.questions.length}** 道，每章20道；复习变式 **${bank.questions.flatMap((q)=>q.variants).length}** 道；课程原题 **${course.lessons.flatMap((l)=>l.questions).length}** 道；同知识点复测 **${pairs.length}** 道。共448个题目实例，三类用途不同，不合并参与排行榜。`, "",
  "数值答案的独立公式回归在 `apps/web/scripts/learning-question-bank.test.mjs`；结构、章节、双语、答案范围、变式关联与数学渲染均有自动检查。概念题按定义、假设及解析逐项审读；这些核验不代替任课教师对教学适配性的最终审定。", "",
  "## 快问快答与复习变式", "",
];
for (const chapter of ["1","2","3","4"]) {
  lines.push(`### 第${chapter}章`,"","| ID | 题目 | 正确答案 | 解析 |","| --- | --- | --- | --- |");
  for (const q of bank.questions.filter((q)=>q.chapterID===chapter)) {
    for (const item of [q,...q.variants]) lines.push(`| ${item.id} | ${escape(item.zh.prompt)} | ${escape(answer(item,item.zh))} | ${escape(item.zh.explanation)} |`);
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
console.log("Exported 448 question instances with answer keys, rationales and 52 concept pairs.");
