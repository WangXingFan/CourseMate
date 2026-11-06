# 题目公式显示

教师与管理员题库、教师预览、作业、课堂活动、快问快答、专项练习、错题复习和知识掌握中的答题依据统一使用 `shared/components/question-content.tsx`，复用现有 Markdown / KaTeX 渲染。

- 新题目的行内公式写成 `$x(t)=e^{-2t}u(t)$`，独立公式用 `$$` 包围；分式使用 `\frac{a}{b}`。
- `shared/lib/question-math.ts` 在显示时兼容题库中已有的 `e^(−2t)`、Unicode 上下标、冲激、积分等常见信号表达式，已发布的历史快照无需重发。
- 已标记的 LaTeX、代码和图片链接保持原样；普通叙述文字不整段转为公式。复杂新公式应明确标记，不依赖旧格式识别。
- 点击选项中的公式仍用于选择答案，不触发公式复制；正文公式沿用原有复制功能。
- 题目 ID、选项顺序、标准答案、评分规则和存储内容不变；转换只发生在展示层。

课程练习源文件为 `content/signals/questions.mjs`，快问快答与变式题源文件为 `backend/internal/domain/learning/content/quick-questions.json`。更新内容后仍按原有生成流程同步；不要直接改生成后的翻译或课程目录。
