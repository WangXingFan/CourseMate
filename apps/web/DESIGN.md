# CourseMate 前端设计规范

本文件是 `@deeix/web` 界面改版的执行依据。任何人或模型修改 UI 前必须先读完本文件，改完按「验收」一节自检。与本文件冲突的旧代码，以本文件为准。

## 1. 定位

- 用户：高校学生与高校教师。场景是课程学习、课堂管理、知识问答，单次使用时间长。
- 气质：教材与学术期刊式的编辑排版。克制、清晰、可信，信息层级靠字号、字重、留白和细线建立，不靠颜色和装饰。
- 不要做成：儿童教育产品、游戏化 App、营销落地页、通用 shadcn 模板。

## 2. 设计 Token

全部定义在 `app/globals.css`，默认主题「学院」。禁止在组件里写死颜色值，一律用 token。

### 2.1 颜色

| Token | 用途 |
| --- | --- |
| `background` / `foreground` | 纸白底、墨蓝字 |
| `card` / `pure` | 卡片面、输入框底 |
| `primary` | 墨蓝，主按钮、选中态、链接、强调数值 |
| `seal` | 印章红，只用于极少量强调：眉题、公式边线、"预测"标签、点名结果标签。单屏不超过 2 处 |
| `muted-foreground` | 次要文字 |
| `border` | 所有分隔线、卡片边框 |
| `secondary` / `accent` | 图标底块、选中行底色 |
| `chart-1` ~ `chart-5` | 图表系列色，按顺序使用 |

深色模式在 `.dark` 中已配齐，新组件必须同时在浅色和深色下检查。其余 7 个可选主题（azure、cobalt 等）保留，不要删。

### 2.2 字体

- `font-display`：Newsreader + 思源宋体/宋体回退。用于页面标题、区块标题、大号数字、人名、问题题干。字重固定 `font-normal`。
- `font-sans`（默认）：Inter + 苹方/微软雅黑。用于所有正文和控件。
- `font-mono`：JetBrains Mono。用于编号、学号、坐标刻度、计数、代码。

### 2.3 字号刻度

刻度已在 `@theme` 中重定义，并随用户字号设置缩放：

| 类名 | 尺寸 | 用途 |
| --- | --- | --- |
| `text-2xs` | 12px | 仅限徽标、计数气泡。不得用于任何句子 |
| `text-xs` | 13px | 辅助说明、表头、标签、时间戳 |
| `text-sm` | 14.5px | 默认正文、表单、列表、按钮 |
| `text-base` | 16px | 段落、导语、卡片标题 |
| `text-lg` / `text-xl` | 18 / 21px | 小节标题 |
| `text-2xl` ~ `text-5xl` | 26 ~ 56px | 页面与展示标题，配 `font-display` |

### 2.4 圆角与阴影

- `--radius` 为 0.625rem。卡片和面板用 `rounded-lg`，控件用 `rounded-md`。不要用 `rounded-2xl`、`rounded-3xl`，胶囊形 `rounded-full` 只用于头像和圆点。
- 阴影整体很浅。静止态卡片不加阴影或用 `shadow-sm`，悬停可升到 `shadow-md`。不要用发光、彩色阴影。

## 3. 组件规则

### 3.1 基础组件默认尺寸（`components/ui`）

| 组件 | 默认 |
| --- | --- |
| Button | `h-9`，`text-sm`；`sm` 为 `h-8`，`xs` 为 `h-7`，`lg` 为 `h-11` |
| Input / Select / Textarea | `h-9`，`text-sm`，边框 `border-input/70` |
| Badge | `text-2xs`，`rounded-md` |
| 表格 | 表头 `h-10 text-xs`，单元格 `py-3 text-sm` |
| 侧边栏菜单项 | `h-9`，选中项左侧 2px `primary` 强调条 |

页面里不得用 `className` 把这些尺寸改小（见第 5 节）。

### 3.2 通用模式

- 页面标题：`font-display text-3xl md:text-4xl font-normal tracking-[-0.015em]`，上方可放 `text-xs tracking-[0.08em] text-seal` 的眉题。
- 页面头部用底部细线 `border-b border-border` 与内容分开，`pb-8`。
- 列表优先用「编号 + 衬线标题 + 说明 + 箭头」的目录行（参考 `learning-hub.tsx` 的 `TopicRow`），而不是彩色卡片网格。
- 选中态：`bg-accent` + `shadow-[inset_2px_0_0_var(--primary)]`。
- 数值读数：左侧 2px 竖线 + `font-mono text-lg`（参考 `lesson-shell.tsx` 的 `Readout`）。
- 公式：放在左侧 `border-l-2 border-seal` 的引文栏里，用 `MathFormula`。
- 图标：只用 `lucide-react`，`strokeWidth` 1.5 ~ 1.6，尺寸至少 `size-4`。装饰性图标加 `aria-hidden`。
- 动效：用 `motion`，时长 200 ~ 300ms，缓动 `[0.16, 1, 0.3, 1]`。必须尊重 `prefers-reduced-motion`。

### 3.3 SVG 图表

SVG 按容器宽度缩放，`viewBox` 里的字号不等于屏幕字号。规则：

- 刻度和标注 `fontSize` 不低于 14（viewBox 宽 640 ~ 900 时约等于屏幕 11.5 ~ 13px）。
- 刻度数字用 `var(--font-mono)`，坐标轴名称用 `var(--font-display)` 斜体（仅西文/符号）。
- 网格线 `strokeDasharray="2 4"`，零轴用 `foreground` 0.45 透明度，曲线宽 2.25。
- 参考 `signal-plot.tsx`、`pole-zero-plot.tsx`、`native-lab-plot.tsx`。

## 4. 已完成的页面（作为样板参考）

| 页面 | 文件 |
| --- | --- |
| 登录页（左右分栏 + 傅里叶动画） | `features/auth/components/login-page.tsx`、`shared/login-hero.tsx` |
| 学习中心（目录式章节索引） | `features/learning/components/learning-hub.tsx` |
| 实验页外壳、预测卡、滑块 | `features/learning/components/shared/` |
| 课堂列表与详情 | `features/classrooms/components/sections/classroom-sidebar.tsx`、`classroom-detail.tsx` |
| 点名 | `features/classrooms/components/classroom-roll-call*.tsx` |
| 设置页、管理后台侧栏 | `shared/components/settings-layout.tsx`、`features/settings/…/settings-sidebar.tsx`、`features/admin/components/admin-sidebar.tsx` |

## 5. 禁止行为

违反任何一条都视为未完成。

### 5.1 文字

- 禁止 `text-[8px]` ~ `text-[13px]` 等任意小字号写法，也禁止新增任何 `text-[Npx]`。只用第 2.3 节的刻度。
- 禁止用 `text-2xs` 写句子、说明、提示、帮助文案。它只给徽标和数字计数用。
- 禁止「小字解释」：不要在标题、按钮、字段下方追加一行小号灰字去解释它是什么。如果说明必要，用 `text-sm` 正常写进描述里；如果不必要，删掉。
- 禁止用灰色小字堆叠元信息（例如 `创建于 · 3 个学生 · ID xxx` 连成一串 12px 灰字）。元信息至少 `text-xs`，只保留用户真正需要的一两项。
- 禁止 SVG 图表里 `fontSize` 小于 14。
- 禁止中文使用斜体（`italic`）。
- 禁止全大写加宽字距（`uppercase tracking-widest`）的英文小标签风格。

### 5.2 控件尺寸

- 禁止在页面里用 `className` 把 Button / Input / SelectTrigger 压到 `h-6`、`h-7`（`size="xs"` 除外）或 `size-6` 以下。
- 禁止图标小于 `size-3.5`；交互图标按钮的点击区域不小于 32 × 32px。

### 5.3 视觉风格

- 禁止表情符号（emoji），图标统一用 Lucide。
- 禁止低龄化元素：彩色碎屑/礼花、星星闪光、弹跳卡通动画、奖杯庆祝弹窗、糖果色渐变、圆滚滚的胶囊卡片。
- 禁止装饰性模糊光斑（`blur-2xl` 彩色圆）、霓虹发光阴影、大面积彩色渐变背景。
- 禁止每个卡片一个颜色的彩虹式配色；`seal` 红色每屏最多 2 处。
- 禁止写死 hex/rgb/oklch 颜色（登录页左侧深色展示面板除外）。

### 5.4 工程

- 禁止修改业务逻辑、接口调用、hook 和状态管理；本次只改展示层。
- 禁止删除或改名 i18n key；新增文案必须同时加 `zh-CN` 与 `en-US`。
- 禁止新增 UI 依赖库。
- 禁止绕过 `scripts/check-architecture.mjs`（例如裸 `as` 类型断言）。
- 禁止提交 `.playwright-mcp/`、截图等临时文件。

## 6. 本轮执行结果（2026-10-25）

原有 8 项待办已完成，后续 UI 改动继续按本文件验收。

1. **i18n 中的 LaTeX 解析错误**：课程和快问快答的独立公式使用 `t.raw()`；两种语言的 5 处正文指数花括号已做 ICU 转义，保留场景中的 `{a}`、`{d}` 参数插值。新增 `scripts/learning-i18n.test.mjs`：全部格式化消息通过 ICU parser，13 个独立公式分别通过 KaTeX，正文实际渲染结果也有回归断言。独立公式属于原始数据，不作为 ICU 模板解析。题库测试比较格式化后的文案，继续验证与后端题意一致。
2. **对话界面**：正文 16px、行高 28px；助手回复采用衬线标题和细线分节；折叠条至少 `text-xs`；输入框使用 `rounded-lg`；移除生成图片占位区的彩色渐变，并取消中文引用的斜体。
3. **实验工作台**：统一头部、导航选中态、面板、表单和读数；说明使用正常正文字号，实验目录采用纵向章节结构；图表不再将中文坐标名设为斜体。
4. **快问快答与学习记录**：移除奖杯、皇冠和火焰图标；成绩单、答题结果和错题采用统一排版；保留原有计分、排名、限时与复习规则。
5. **知识库**：统一标题、文件行、选中态和操作区域；补齐文件状态与预览所需的中英文命名空间，修复文件列表的控制台错误。
6. **管理后台各分区**：统一表格行、筛选栏和抽屉控件尺寸；移除表格对子控件字号与高度的压缩，分页与组合选择框的图标点击区域至少 32 × 32px；抽屉和页签采用规范圆角；补齐管理员登录配置提示的中英文文案。
7. **学生课堂活动页**：统一页面标题、题干、选项、成绩读数和元信息；选中态使用墨蓝边线和浅底色。
8. **桌面端标签栏**：统一字体、边框和选中态；图标按钮至少 32 × 32px；增加焦点样式与标签溢出滚动，保留原有拖动、切换和窗口操作。

验收记录：`pnpm check`、`pnpm test`（46 项）、`pnpm build`（41 个静态页面）通过；第 7 节三类违规搜索均无匹配。另以 JSX 语法解析复查控件类名，覆盖事件回调后的属性、条件类名和原生图标按钮。已使用模拟 API 检查 14 个页面，以及有消息的对话页和模拟 Tauri 标签栏，均覆盖 1440px / 390px、浅色 / 深色；补查上游来源抽屉、用户管理与对话参数弹窗的实际尺寸。截图与浏览器报告仅保存在被忽略的 `.playwright-mcp/`，不进入提交。桌面端原生宿主和真实后端仍需部署环境联调。

## 7. 验收

每完成一项都要做：

1. 在 `apps/web` 下运行 `pnpm check`、`pnpm test` 和 `pnpm build`，全部通过。`pnpm test` 同时包含双语消息与公式回归检查。
2. 搜索确认没有违规：
   ```sh
   grep -rnE "text-\[[0-9.]+px\]" --include=*.tsx app components features shared entities   # 只允许 14/15/17/22/32px 的存量
   grep -rnE "fontSize=\{?\"?(8|9|10|11|12|13)\b" --include=*.tsx features shared          # 应为空
   rg -U -n '<(Button|Input|SelectTrigger)\b[^>]*\bh-[67]\b' features  # 跨行检查，应为空
   ```
3. 在浏览器中以 1440px 和 390px 两个宽度、浅色与深色两种模式截图检查。没有后端时，可用 Playwright 拦截 `http://localhost:8080/**` 返回 `{ "data": … }` 模拟登录态（`/auth/refresh` 返回 `LoginResponse`）。
4. 控制台不得出现新的错误（后端未连接导致的 `ERR_CONNECTION_REFUSED`、manifest 404 除外）。
