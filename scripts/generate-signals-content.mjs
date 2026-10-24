// Content generation only; verification belongs to GitHub Actions.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { exercises } from "../content/signals/questions.mjs";

const root = resolve(import.meta.dirname, "..");
const source = readFileSync(resolve(root, "content/signals/source.md"), "utf8").replaceAll("\r\n", "\n");
const sourceLessonIndexes = new Map([...source.matchAll(/^### ([0-7AB]\.\d+) /gm)].map((match, index) => [match[1], index]));
const corrections = [];
let notes = source;
function revise(section, prefix, replacement, reason) {
  const lines = notes.split("\n");
  let active = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("### ")) active = lines[i].startsWith(`### ${section} `);
    if (!active || !lines[i].startsWith(prefix)) continue;
    corrections.push({ section, original: lines[i], revised: replacement, reason });
    lines[i] = replacement;
    notes = lines.join("\n");
    return;
  }
  throw new Error(`Missing correction target ${section}: ${prefix}`);
}
revise("1.1", "- **连续周期信号之和**", "- **连续周期信号之和**：周期比为有理数时，两周期的公倍数是和信号的周期；若发生抵消，最小正周期可能更小。非退化的不同频率正弦之和，可用频率比判断。", "公倍数不一定是和信号的最小周期。");
revise("1.1", "- **离散正弦序列**", "- **离散正弦序列**：非退化正弦序列在角频率与 $2\\pi$ 比为有理数时周期；将 $\\beta/(2\\pi)=m/N$ 约成互素形式后，通常最小周期为 $N$。恒零等退化情形单独处理。", "需约分并排除退化零序列。");
revise("1.1", "- **离散周期序列之和**", "- **离散周期序列之和**：两周期的最小公倍数是和序列的一个周期，但抵消或对称性可能使最小周期更短。", "区分一个周期与最小周期。");
revise("1.4", "- **非因果例子**", "- **非因果例子**：$y(t)=f(t+1)$、理想砖墙低通。理想微分器 $h(t)=\\delta'(t)$ 在广义函数意义下是因果的，但不满足 BIBO 稳定。", "理想微分器因果性与稳定性混淆。");
revise("1.5", "- **连续系统数学模型**", "- **连续系统数学模型**：常系数线性微分方程用于描述有限维 LTI 系统；最小阶数由独立动态储能状态决定，不能机械地数所有电容、电感。", "受约束的储能元件不一定独立。");
revise("2.3", "- **零状态线性**", "- **零状态线性**：零状态响应对输入满足齐次性与可加性；时移性质还需系统时不变，不能由线性单独推出。", "线性不蕴含时不变。");
revise("2.3", "- **暂态/稳态**", "- **暂态/稳态**：在稳定系统及适当输入条件下，自然暂态衰减，可能留下常值或周期稳态。并非所有稳定系统对任意输入都有有限终值。", "区分稳态、终值与输入条件。");
revise("2.4", "- **求解**", "- **求解**：若系统输入输出方程为 $D(p)y=N(p)f$，则冲激响应满足 $D(p)h=N(p)\\delta$；先做冲激匹配，再求普通函数部分。", "原式漏掉系统分子算子。");
revise("2.4", "- **分子阶数**", "- **分子阶数**：严格真有理 $H(s)$ 不含冲激直接项；分子分母同阶时长除常数对应 $\\delta(t)$；分子阶数更高时才可能含 $\\delta$ 的导数。", "同阶不应笼统包含冲激导数。");
revise("2.4", "- **稳定性**", "- **稳定性**：普通函数冲激响应绝对可积是 BIBO 稳定判据；有冲激直接项时用有限测度形式理解。虚轴极点导致的自然临界稳定不能等同 BIBO 稳定。", "补充直接通路并区分稳定定义。");
revise("2.5", "- **存在条件**", "- **存在条件**：积分需要收敛；若 $f,h\\in L^1$，卷积几乎处处存在且仍属 $L^1$。逐点连续性需要额外正则条件，不能仅由两者绝对可积推出。", "两个L1函数的卷积不必处处连续。");
revise("3.7", "- **周期输入**", "- **周期输入**：全时间周期激励的稳定 LTI 零状态输出可逐谐波合成；若从有限时刻接通，还可能有暂态。稳态可取输入周期为周期，但最小周期可能因谐波被滤除而缩短。", "区分接通暂态与全时间周期输入。");
revise("3.9", "- **时域取样定理**", "- **时域取样定理**：基带带限信号通常取 $f_s>2f_m$。等号需要对边界频率分量等作额外限制；临界频率正弦可能所有样本为零。实际采样还需抗混叠滤波的过渡带余量。", "等号不能保证任意边界信号唯一恢复。");
revise("3.9", "- **奈奎斯特频率/间隔**", "- **奈奎斯特速率与奈奎斯特频率**：信号的奈奎斯特速率阈值为 $2f_m$，相应间隔为 $1/(2f_m)$；给定采样系统的奈奎斯特频率通常指 $f_s/2$。", "区分Nyquist rate与Nyquist frequency。");
const support = "对于基带带限信号，卷积的频谱支撑不超出两频谱支撑交集，相乘不超出支撑之和，相加不超出支撑并集；常用上界分别为较小带宽、带宽之和、较大带宽，但不保证等号。";
revise("3.9", "- **组合信号**", `- **组合信号**：${support}`, "频谱支撑关系给出上界，可能发生抵消。");
revise("5.5", "- **真/假分式**", "- **真/假分式**：严格真有理函数不含冲激直接项；分子分母同阶时，长除常数对应 $\\delta(t)$；分子阶数更高时，长除多项式的正次幂才对应冲激导数。", "与2.4统一，区分冲激与冲激导数。");
revise("5.6", "- **因果系统**", "- **因果系统**：对已约分的适当有理传递函数，全部极点严格在左半平面等价于输入输出 BIBO 稳定；含冲激导数的非适当系统不能只按有限极点判断。", "极点判据需适当有理等条件。");
revise("5.6", "- **临界稳定**", "- **自然运动临界稳定**：有限维连续状态模型的特征值实部非正，且虚轴特征值半单时，零输入状态有界但一般不趋零。这不保证 BIBO 稳定；不能把‘零输入响应有界’误读为‘任意有界输入下响应有界’。", "限定为自然运动，并允许半单的重复特征值。");
revise("5.6", "- **劳斯表**", "- **劳斯表**：在正确处理零首项、全零行等特殊情形后，首列符号变化次数给出右半平面根数；严格稳定还需排除虚轴根。", "不能略去特殊行及虚轴根条件。");
revise("5.6", "- **特殊情况二**", "- **特殊情况二**：出现全零行时，用上一行构造辅助多项式，求导替换该行。全零行说明存在关于原点对称的根，可能是虚轴根，也可能是实轴或复平面中的对称根。", "全零行不专指虚轴共轭根。");
revise("A.3", "| 尺度 |", "| 尺度 | $\\frac{1}{\\lvert a\\rvert}F(j\\omega/a)$，$a\\ne0$ | 双边为 $\\frac{1}{\\lvert a\\rvert}F(s/a)$ 并相应变换 ROC；单边常用式要求 $a>0$ |", "明确双边与单边适用范围。");
revise("A.5", "| 临界稳定 |", "| 自然运动临界稳定（非 BIBO 判据） | 连续状态特征值在闭左半平面，虚轴模态半单；离散状态特征值在闭单位圆内，圆周模态半单。一般不代表 BIBO 稳定 |", "应使用半单特征值而非简单要求代数单根。");
revise("A.6", "- 奈奎斯特：", "- 采样通常取 $f_s>2f_m$、$T_s<1/(2f_m)$；等号边界需额外条件，实际需留抗混叠余量。", "与正文采样条件保持一致。");
revise("A.6", "- 组合信号最高频率", `- 组合信号带宽：${support}`, "支撑上界不应写成无条件等式。");
revise("A.6", "- FFT：", "- 基2 FFT要求 $N=2^M$，复杂度 $O(N\\log_2N)$；其他FFT算法可处理其他长度。", "长度限制只适用于基2算法。");
revise("B.3", "- **有初始状态**", "- **有初始状态**：零输入部分使用接入前状态 $0^-$；经典全响应法需要先匹配冲激求 $0^+$ 初值，不能把全响应右初值直接用于零输入部分。", "原解题路线混用了0⁻和0⁺。");
notes = notes.replace("30. 奈奎斯特：$f_s\\ge2f_m$；重建用理想低通/sinc 插值。", "30. 通用安全采样取 $f_s>2f_m$ 并留余量，等号需边界限制；重建用理想低通/sinc 插值。")
  .replace("34. 因果连续系统稳定：全部极点左半平面；离散：全部极点单位圆内。", "34. 对因果适当有理且约分后的传递函数，BIBO稳定要求连续极点严格在左半平面、离散极点严格在单位圆内；内部稳定另查完整状态。")
  .replace(/^- 范围：.*$/m, "- 范围：信号与系统基本概念、连续系统时域分析、连续系统频域分析、连续系统 s 域分析及附录；章节连续编号为第 1–4 章。")
  .replace(/^- 用法：.*$/m, "- 用法：按章复习概念与方法；附录 A 是公式表，附录 B 是解题路线，附录 C 是考前速记。")
  .replace("- 依据：", "- 原稿注明依据（未经逐页核验）：");
const caveat = "> **校订说明**：本文是课程学习辅助资料，不是官方教材勘误。普通函数的绝对可积判据不直接涵盖冲激直接通路；有理系统极点稳定判据默认适当、已约分并明确因果性；内部稳定须另查完整状态。采样与终值定理均须检查适用条件。修订记录见 corrections.json。\n\n";
notes = notes.replace("---\n\n## 第0章", `---\n\n${caveat}## 第0章`);

// The source is retained as the imported reference. The published course
// package contains only the in-scope chapters; the old chapter 5 is shown as
// chapter 4 while its stable knowledge IDs remain ss-5-*.
const removedChapters = new Set([
  "第0章 全书总框架",
  "第4章 离散傅里叶变换（DFT/FFT）",
  "第6章 系统状态变量分析",
  "第7章 小波与时频分析",
]);
const publishedLines = [];
let publishedChapter = null;
for (const line of notes.split("\n")) {
  if (line.startsWith("## ")) {
    publishedChapter = line.slice(3);
    if (removedChapters.has(publishedChapter)) {
      publishedChapter = "";
      continue;
    }
    if (publishedChapter.startsWith("第5章 ")) {
      publishedChapter = publishedChapter.replace(/^第5章 /, "第4章 ");
    }
    publishedLines.push(`## ${publishedChapter}`);
    continue;
  }
  if (publishedChapter === "") continue;
  if (publishedChapter?.startsWith("第4章 ") && line.startsWith("### 5.")) {
    publishedLines.push(line.replace(/^### 5\./, "### 4."));
  } else {
    publishedLines.push(line);
  }
}
notes = publishedLines.join("\n");
const lessons = [];
let chapter = "", current = null, supplement = "";
for (const line of notes.split("\n")) {
  if (line.startsWith("## ")) {
    chapter = line.slice(3); current = null;
    continue;
  }
  const match = /^### ([0-7AB]\.\d+) (.+)$/.exec(line);
  if (match) {
    const number = match[1];
    const legacyNumber = number.startsWith("4.") && chapter.startsWith("第4章 ") ? number.replace(/^4\./, "5.") : number;
    current = { id: `ss-${legacyNumber.replace(".", "-").toLowerCase()}`, number, title: match[2], chapter, markdown: "", questions: [] };
    current.legacyNumber = legacyNumber;
    lessons.push(current); continue;
  }
  if (chapter === "附录C 考前速记") supplement += `${line}\n`;
  else if (current) current.markdown += `${line}\n`;
}
for (const lesson of lessons) {
  lesson.markdown = lesson.markdown.trim().replace(/\n---$/, "");
  if (lesson.number === "B.10") lesson.markdown += `\n\n## 附录C 考前速记\n\n${supplement.trim()}`;
  lesson.questions = exercises[lesson.legacyNumber].map((question, index) => {
    const stage = ["preview", "in_class", "after_class"][index];
    const q = { ...question, id: `${lesson.id}-${stage}-v1`, stage };
    if (q.options.length) {
      // Keep the original option order for existing question IDs, even when
      // earlier chapters are removed from the published catalog.
      const rotation = (sourceLessonIndexes.get(lesson.legacyNumber) + index) % q.options.length;
      q.options = q.options.map((_, j) => question.options[(j + rotation) % question.options.length]);
      q.answer = (q.options.length - rotation) % q.options.length;
    }
    q.fields = q.fields.map((field, j) => ({ ...field, id: `f${j + 1}` }));
    return q;
  });
  delete lesson.legacyNumber;
}
const catalog = { id: "signals-systems", version: "2026-10-23.1", title: "信号与系统", language: "zh-CN", sourceName: "信号与系统_总知识点总结.md", sourceHash: createHash("sha256").update(source).digest("hex"), lessons };
const write = (path, value) => { mkdirSync(resolve(root, path, ".."), { recursive: true }); writeFileSync(resolve(root, path), value); };
write("backend/internal/domain/learning/content/course.json", `${JSON.stringify(catalog, null, 2)}\n`);
write("content/signals/notes.md", notes);
write("content/signals/corrections.json", `${JSON.stringify(corrections, null, 2)}\n`);
const documents = lessons.map((lesson) => ({
  id: lesson.id,
  markdown: `# ${lesson.number} ${lesson.title}\n\n课程：信号与系统\n知识点ID：${lesson.id}\n版本：${catalog.version}\n章节：${lesson.chapter}\n课程链接：/learn/knowledge?lesson=${lesson.id}\n\n${caveat}${lesson.markdown}\n`,
}));
for (const document of documents) {
  write(`content/signals/knowledge-base/${document.id}.md`, document.markdown);
}
const generatedIDs = new Set(documents.map((document) => document.id));
for (const file of readdirSync(resolve(root, "content/signals/knowledge-base"))) {
  if (!file.endsWith(".md")) continue;
  const id = file.slice(0, -3);
  if (/^ss-[0-7ab]-\d+$/.test(id) && !generatedIDs.has(id)) unlinkSync(resolve(root, "content/signals/knowledge-base", file));
}
write("backend/internal/domain/knowledgebase/content/signals.json", `${JSON.stringify({
  key: catalog.id,
  publicID: "kb_signals_systems",
  version: catalog.version,
  digest: createHash("sha256").update(JSON.stringify(documents)).digest("hex"),
  name: catalog.title,
  description: `CourseMate 内置课程讲义，含 ${lessons.length} 个知识点。配置向量化后可在对话中检索引用。`,
  documents,
}, null, 2)}\n`);
console.log(`Generated ${lessons.length} lessons, ${lessons.reduce((sum, lesson) => sum + lesson.questions.length, 0)} staged questions (${lessons.flatMap((lesson) => lesson.questions).filter((q) => q.fields.length).length} numeric/coefficient questions) and ${corrections.length} correction records.`);
