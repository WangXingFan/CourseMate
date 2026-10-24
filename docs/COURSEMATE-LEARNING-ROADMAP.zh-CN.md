# CourseMate 学习闭环未来工作规划

> 状态：2026-10-19 已实施 P0（阶段 0–3），首轮完整 CI、CodeQL、桌面/移动端交互及双架构镜像验证已通过；最终提交验收见 [PR #1](https://github.com/WangXingFan/CourseMate/pull/1)。阶段 4–8 保持后续规划。
> 编写日期：2026-10-18。
> 代码基线：分支 `dev`，提交 `5761a0d8`（`feat: add learning progress and mistake review`）。
> 适用范围：Web、后端 API、共享契约与后续教师侧能力；桌面端优先复用同一 Web 功能。
> 验证约束：不在开发机执行编译、测试、Lint、类型检查、Docker 或 Playwright。代码推送 GitHub 后，以 GitHub Actions 结果为准。
> 原型状态：第 2 节保留 2026-10-18 的暂停点作为历史背景。阶段 0 修复已通过 CI；当前实现与验证记录见 [P0 交付文档](LEARNING-P0-DELIVERY.zh-CN.md)。

## 1. 文档目标

本文规划 CourseMate 从“学习记录与错题本基础功能”走向完整学习闭环的后续工作，重点覆盖此前确定的前三项：

1. 实验内 AI 助教。
2. 自定义信号工作台。
3. 错题诊断、变式练习与间隔复习。

同时列出之后的工作：学习记录覆盖扩展、分步解题检查、课程知识导航、离散时间专题、实验报告与教师学情分析。

产品闭环目标：

```text
课堂学习 / 章节实验 / 小测 / 课前课后清单
                  ↓
          统一学习记录与知识点映射
                  ↓
       错因诊断 → 提示与解释 → 变式练习
                  ↓
            间隔复习与掌握度更新
                  ↓
        实验报告、教师班级薄弱项分析
```

## 2. 实施前的状态与暂停点（2026-10-18 历史记录）

### 2.1 已存在的稳定基线

基线提交 `5761a0d8` 已提供学习记录与错题本的基础闭环：

- 快问快答作答记录。
- 按账号隔离的学习进度。
- 错题查看与重练。
- 最近作答历史。
- 客户端待提交队列与幂等重试基础。
- 学习实验、课程流程和章节实验页面骨架。

本规划不重新设计这些已存在能力，只在其上扩展。

### 2.2 暂停中的后端原型

工作区当前包含以下未提交改动：

修改文件：

- `backend/internal/application/learning/service.go`
- `backend/internal/domain/learning/types.go`
- `backend/internal/infra/persistence/models/learning.go`
- `backend/internal/infra/persistence/postgres/learning/repository.go`
- `backend/internal/transport/http/learning/dto.go`
- `backend/internal/transport/http/learning/module.go`

新增文件：

- `backend/internal/application/learning/tutor.go`
- `backend/internal/application/learning/tutor_content.go`
- `backend/internal/domain/learning/variants.go`

原型中已经出现但尚未验证的设计包括：

- 作答模式 `quiz` 与 `review`。
- 12 道基础题、每题 3 个错误选项对应的 36 个误区代码。
- 每题 2 道服务端评分变式，共 24 道变式。
- `POST /api/v1/learning/reviews`。
- 间隔复习阶段与下一次复习时间。
- 错题最近错误、误区、建议变式、复习阶段和到期状态字段。
- `POST /api/v1/learning/tutor`。
- 四个实验的精选中英双语助教回退内容。
- 模型路由、禁用工具、临时请求、上下文定界与引用白名单的原型代码。

这些内容只能描述为“暂停中的原型设计”，不能描述为“已完成”或“可用”。

### 2.3 已知阻塞项

| 优先级 | 问题 | 影响 | 处理阶段 |
| --- | --- | --- | --- |
| P0 | `applyReviewState` 将字符串类型的 `Attempt.ID` 与整数 `0` 比较 | 后端无法编译 | 阶段 0 |
| P0 | 学习服务没有在 `backend/internal/app/app.go` 接入 `channelService` 与 `llmClient` | 助教只能走回退，现有装配也不完整 | 阶段 0 |
| P0 | Swagger 契约直接引用应用层 `app.TutorResponse` | 传输契约边界不稳定，生成类型可能不可控 | 阶段 0 |
| P0 | 后端新增逻辑没有测试，API 契约尚未重新生成 | 不能证明评分、幂等、复习与助教边界正确 | 阶段 0 |
| P0 | 工作区改动未提交、未推送、未经过 Actions | 无法确认编译、Lint、构建和镜像 | 阶段 0 |
| P1 | 四个实验没有助教组件接入 | 实验内 AI 助教尚未形成用户闭环 | 阶段 1 |
| P1 | 自定义信号工作台的路由、模型、组件和入口均不存在 | 功能尚未开始 | 阶段 2 |
| P1 | 进度页只支持基础错题重练，没有诊断、变式和到期复习 UI | 错题增强闭环未完成 | 阶段 3 |
| P1 | 36 个误区代码与 24 道变式没有完整双语文案 | 前端无法稳定展示 | 阶段 3 |
| P2 | 学习记录尚未覆盖章节实验、课堂小测、课前课后清单 | 学情数据不完整 | 阶段 4 |
| P2 | Web 包当前没有可被 CI 自动执行的测试脚本 | 工作台纯函数测试可能不会被 Actions 覆盖 | 阶段 2 / 验证改造 |

### 2.4 原型处置原则

- 不把当前未提交改动直接视为可合并成果。
- 恢复工作后先从主分支 `main` 创建独立功能分支，例如 `codex/learning-foundation`，避免继续在 `main` 工作区叠加未验证改动。
- 可将当前工作区先保存为补丁或临时提交，但不得把失败原型直接推送到 `dev`。
- 阶段 0 的修复、测试和契约生成必须形成独立提交，便于回退。
- 若原型修复成本高于重写，按稳定基线重新实现；不得为了保留原型而绕过领域边界或测试。

## 3. 产品与技术原则

### 3.1 学习产品原则

1. **先预测，再看图**：交互实验继续坚持先提交判断和理由，再解锁图形。
2. **提示不直接泄题**：答题前的提示应指出观察方向或公式关系，不直接给出正确选项。
3. **解释要引用课程内容**：助教引用必须来自课程白名单页面，不能生成不存在的章节。
4. **服务端掌握正确答案**：基础题和变式题的正确性不能由浏览器决定。
5. **诊断对应可行动作**：每个误区必须能解释“为什么错”，并映射到变式、课程小节与复习安排。
6. **复习状态以服务端为准**：刷新页面、离线重试或多端打开不能覆盖较新的学习状态。
7. **记录只属于本人**：学生不能读取其他账号的作答、理由、复习计划或报告草稿。
8. **教师看到聚合而非隐私原文**：教师学情分析默认展示知识点统计，不直接暴露学生完整推理文本。
9. **失败必须可见**：模型不可用、引用校验失败或网络中断时，显示回退来源或可重试错误，不能伪装成成功。

### 3.2 技术原则

- 沿用现有 Go 分层：`transport/http` → `application` → `domain` / `repository` → `infra`。
- 沿用 `@deeix/api-contract` 生成类型，不手写与 Swagger 不一致的重复 DTO。
- 所有评分、误区判定、变式答案和复习阶段均由服务端计算。
- 新增数据库字段优先采用向后兼容的可空列或有默认值列。
- 所有写接口使用客户端 UUID 保证幂等；同一 UUID 的不同内容返回冲突。
- 时间计算使用 UTC 保存；页面按用户本地时区显示。
- 纯数学计算不依赖大模型；模型只用于教学提示、解释和自然语言整理。
- 不新增绕过现有认证、限流、渠道密钥管理和审计的调用路径。

## 4. 优先级、依赖与里程碑

| 阶段 | 优先级 | 内容 | 前置依赖 | 粗略工作量* |
| --- | --- | --- | --- | --- |
| 0 | P0 | 收口并验证暂停中的后端原型 | 当前工作区改动 | 1–2 人日 |
| 1 | P0 | 实验内 AI 助教 | 阶段 0 的 tutor API | 2–3 人日 |
| 2 | P0 | 自定义信号工作台 | 现有 `SignalPlot`、学习入口 | 3–4 人日 |
| 3 | P0 | 错题诊断、变式与间隔复习 UI | 阶段 0 的 review API | 4–6 人日 |
| 4 | P1 | 扩展学习记录覆盖 | 统一活动模型 | 5–8 人日 |
| 5 | P1 | 分步解题检查（先做卷积） | 知识点与题目元数据 | 4–7 人日 |
| 6 | P1 | 课程知识导航 | 课程内容清单 | 3–5 人日 |
| 7 | P2 | 离散时间专题 | 现有课程与实验框架 | 6–10 人日 |
| 8 | P2 | 实验报告与教师学情分析 | 阶段 4 的活动数据 | 8–12 人日 |

\* 工作量为单名熟悉仓库的开发者的相对估算，不包含评审等待、内容审校和多轮 CI 修复。

推荐里程碑：

- **M1 学习反馈闭环**：阶段 0–3；实验可提问，错题可诊断和变式复习。
- **M2 学习数据闭环**：阶段 4–6；记录覆盖更广，能按章节导航和检查过程。
- **M3 课程与教学闭环**：阶段 7–8；补齐离散时间专题、实验报告和教师分析。

## 5. 阶段 0：收口并验证暂停中的后端原型

### 5.1 目标

让当前原型达到“可编译、契约清晰、边界可测、可安全合并”的最低状态。阶段 0 不接入前端，不扩展新功能。

### 5.2 关键任务

#### A. 修复复习状态计算

- 将最近一次 review 查找改为 `review, hasReview := latestReview[questionID]` 的形式。
- 仅在 `hasReview` 时将 review 转为 `*domain.Attempt`；禁止继续用字符串 ID 与整数零值比较。
- 明确状态来源：
  - 如果存在复习记录，使用最新一次 review 的阶段和到期时间。
  - 如果没有复习记录，使用最近一次错误作答并安排首次复习。
  - 后续正确快问快答不能删除“最近错误”和既有复习计划。
- 对旧数据增加兼容：`Mode` 为空时按 `quiz` 处理；旧错误记录缺少到期时间时按错误时间加 1 天计算。

#### B. 固定传输层 DTO

- 在 `backend/internal/transport/http/learning/dto.go` 定义 `LearningTutorResponse`、`LearningTutorCitation`。
- 增加应用层到传输层的显式转换。
- Swagger 注解引用传输层 DTO，不直接引用 `application/learning.TutorResponse`。
- 生成契约后检查字段可选性、`null` 语义和时间格式。

#### C. 接入应用装配

在 `backend/internal/app/app.go` 中采用显式构造，例如：

```go
learningService := applearning.NewService(learningrepo.NewRepo(db))
learningService.SetTutor(channelService, llmClient)
learningModule := learninghttp.NewModule(learningService)
```

要求：

- `channelService` 提供现有路由解析与成功/失败记账能力。
- 没有可用渠道或模型配置时，助教仍返回精选内容并标记 `source: "curated"`。
- 不在处理器中读取渠道密钥，不新建第二套上游配置。

#### D. 校验助教安全边界

- 请求字段全部限制长度、数量和可接受范围。
- 参数 map 只接受标量，限制键数和键名长度。
- 学习者提供的内容使用严格分隔标记，禁止被解释为系统指令。
- 模型请求保持：
  - `DisableTools: true`。
  - `Ephemeral: true`。
  - 不持久化原始提示。
- 模型响应必须为受控 JSON；解析失败时回退到精选内容。
- 引用必须再次映射到实验允许的课程白名单，不能信任模型返回的任意 URL。
- 模型返回步骤数量、单步长度和总长度必须有上限。
- 日志不得包含学生理由全文、渠道密钥或未清洗的模型原文。

#### E. 数据兼容与幂等

复习节奏以当前原型为基础，阶段 0 需要写测试将其固定：

| 事件 | 新阶段 | 下次复习 |
| --- | --- | --- |
| 快问快答首次答错 | 0 | 1 天后 |
| 复习答对，0 → 1 | 1 | 3 天后 |
| 复习答对，1 → 2 | 2 | 7 天后 |
| 复习答对，2 → 3 | 3 | 14 天后 |
| 复习答对，3 → 4 | 4 | 30 天后 |
| 复习答对，4 → 5 | 5 | 无到期时间，退出队列 |
| 复习答错 | 0 | 1 天后 |

幂等要求：

- 同一用户、同一 `id`、同一内容和同一变式重复提交，返回首次保存结果。
- 同一 `id` 但修改答案、基础题或变式，返回 `409 Conflict`。
- 时间测试必须注入可控 `now`，不能依赖真实系统时间。
- 不因离线重试重复增加复习阶段。

#### F. 契约与测试

- 重新生成后端 Swagger 和 `packages/api-contract/src/types.generated.ts`。
- 新增或扩展 Go 单元测试与仓储测试。
- 至少覆盖第 7 节列出的阶段 0 测试项。
- 本地只允许执行契约生成、`git diff --check`、`git status --short` 和 `git diff --stat`；编译、Lint、测试统一由 Actions 执行。

### 5.3 文件范围

主要涉及：

- `backend/internal/application/learning/*.go`
- `backend/internal/domain/learning/*.go`
- `backend/internal/infra/persistence/models/learning.go`
- `backend/internal/infra/persistence/postgres/learning/repository.go`
- `backend/internal/transport/http/learning/*.go`
- `backend/internal/app/app.go`
- `backend/docs/*`
- `packages/api-contract/src/types.generated.ts`
- 对应 `*_test.go`

### 5.4 验收标准

- [ ] 后端在默认构建标签和 sidecar 标签下均可编译。
- [ ] 复习状态不再发生字符串/整数类型错误。
- [ ] 后续正确快问快答不会清除最近错误或已有复习阶段。
- [ ] 同一 UUID 重试幂等，不同内容返回冲突。
- [ ] 无模型配置时返回双语精选内容。
- [ ] 模型引用无法越出实验白名单。
- [ ] 请求和响应均通过生成契约暴露，Swagger 不引用应用层 DTO。
- [ ] API CI 与 Web CI 在 GitHub Actions 通过。
- [ ] API 契约生成结果已提交且无再次生成差异。

## 6. 阶段 1：实验内 AI 助教

### 6.1 目标

在四个随机实验内提供上下文相关、可引用的提示和解释，把现有“先预测再看图”流程与学习支持连接起来。

首批实验：

- `signal-basics`
- `time-domain`
- `frequency-domain`
- `s-domain`

### 6.2 用户流程

答题前：

1. 学生阅读参数、题目和预测选项。
2. 学生可请求“给我一个提示”。
3. 助教读取实验 ID、当前参数、已选答案、预测理由和安全的图形摘要。
4. 助教给出 2–4 步提示，但不直接说出正确选项。
5. 学生提交预测并解锁图形。

答题后：

1. 学生可请求“解释我的判断”。
2. 请求包含是否正确、所选答案、原理由和已解锁图形摘要。
3. 助教指出理由中成立或不成立的部分，并给出可核对步骤。
4. 引用以可点击课程小节展示。
5. “换一题”后清空助教会话，避免把上一题解释混入新题。

### 6.3 API 契约

`POST /api/v1/learning/tutor`

请求：

```json
{
  "experimentId": "signal-basics",
  "action": "hint",
  "locale": "zh-CN",
  "parameters": {
    "amplitude": 1.8,
    "decay": 0.9
  },
  "plotSummary": "单边指数衰减，横轴 0 到 6 秒",
  "selected": "energy",
  "reason": "信号最终趋近于零，所以我认为它是能量信号。",
  "correct": false
}
```

响应：

```json
{
  "source": "curated",
  "summary": "先判断信号是否只在一个有限或可积的时间范围内有能量。",
  "steps": [
    "写出能量积分的被积函数。",
    "检查积分是否收敛。",
    "再用功率定义验证结论。"
  ],
  "citations": [
    {
      "id": "signal-basics",
      "chapter": "第一章",
      "section": "信号的分类与基本运算",
      "href": "/learn/experiments/signal-basics"
    }
  ]
}
```

约束：

- `source` 仅允许 `model` 或 `curated`。
- `citations[].href` 必须来自当前实验允许列表。
- 不在响应中返回系统提示、模型名、渠道 ID、内部错误或完整学生理由。
- 未登录用户不能调用。

### 6.4 前端组件

新增：

- `apps/web/features/learning/components/shared/experiment-tutor.tsx`

建议属性：

```ts
type ExperimentTutorProps = {
  experimentId: "signal-basics" | "time-domain" | "frequency-domain" | "s-domain";
  action: "hint" | "explain";
  parameters: Record<string, string | number | boolean>;
  plotSummary: string;
  selected: string | null;
  reason: string;
  correct: boolean | null;
  seed: string;
};
```

行为：

- 在 `PredictionCard` 后渲染。
- 外层使用 `key={seed}`，换题自动重置。
- 答题前只显示 hint 入口；解锁后显示 explain 入口。
- 状态包括 idle、loading、success、error、retry。
- 显示来源标签“课程精选”或“AI 解释”。
- 步骤使用编号列表；引用使用站内链接。
- 流式或分段加载如未实现，不伪装为流式。
- 模型不可用时展示精选来源，不阻塞实验提交。

### 6.5 接入点

- `apps/web/features/learning/components/experiments/signal-basics-experiment.tsx`
- `apps/web/features/learning/components/experiments/time-domain-experiment.tsx`
- `apps/web/features/learning/components/experiments/frequency-domain-experiment.tsx`
- `apps/web/features/learning/components/experiments/s-domain-experiment.tsx`

### 6.6 验收标准

- [ ] 四个实验在预测前可请求提示，解锁后可请求解释。
- [ ] 提示不直接泄露正确选项。
- [ ] 每个实验只允许其课程小节引用。
- [ ] 无模型配置时四个实验均有中英文精选回退。
- [ ] 模型超时、返回非法 JSON 或越权引用时自动回退。
- [ ] 换题后旧回答、加载状态和错误状态全部清除。
- [ ] 引用链接可访问且不跳到无关章节。
- [ ] 请求不包含其他账号数据，响应不持久化学生理由。
- [ ] Web 与 API 的 Actions 检查通过。

## 7. 阶段 2：自定义信号工作台

### 7.1 目标

提供一个可组合的浏览器端信号实验台，让学生直接观察基本信号经过组合、平移、反转、尺度变换和卷积后的结果。

### 7.2 路由与入口

新增页面：

- `apps/web/app/(app)/(project)/learn/workbench/page.tsx`

新增组件：

- `apps/web/features/learning/components/workbench/signal-workbench.tsx`

新增纯计算模型：

- `apps/web/features/learning/model/signal-workbench.ts`

学习首页增加 `learning.hub.quick.workbench` 入口；可在实验首页增加次级入口，但不挤占四个章节实验。

### 7.3 信号类型

首版支持：

- 阶跃信号 `step`
- 窄脉冲 `impulse`
- 矩形脉冲 `rectangle`
- 单边指数 `exponential`
- 正弦 `sine`

每个信号可配置：

- 幅度 `amplitude`
- 时移/中心 `shift` 或 `delay`
- 尺度 `scale`
- 反转 `reversed`
- 类型专属参数，例如脉宽、衰减率、频率

### 7.4 变换约定

统一按“反转 → 尺度 → 平移”解释，并固定为：

```text
y(t) = x(((reversed ? -1 : 1) * (t - shift)) / scale)
```

UI 必须同时展示自然语言规则和公式，避免不同实现使用相反的正负方向。

限制：

- `scale` 不允许为 0；接近 0 时拒绝或夹到安全最小值。
- `shift`、幅度、频率、脉宽均设有限范围。
- 对阶跃和矩形等不连续信号，边界点规则必须统一并在测试中固定。

### 7.5 组合运算

两个信号源 A、B 支持：

- 仅 A
- 仅 B
- `A + B`
- `A - B`
- `A × B`
- `A ∗ B`（卷积）

默认参数和初值应能直接显示一条有意义的曲线，不要求用户先手工配置所有字段。

### 7.6 采样与渲染

- 输入信号统一采样网格为约 `[-8, 8]`，`dt = 0.025`。
- 加法、减法、乘法沿用输入网格。
- 卷积使用离散近似：

```text
y[n] = Σ x[k] h[n-k] · dt
```

- 卷积结果的时间轴按两个输入长度扩展，通常约为 `[-16, 16]`；不得把结果截断到输入范围后冒充完整卷积。
- 对 `NaN`、`Infinity` 和极端值进行清洗或拒绝。
- 根据有限值计算安全的 Y 轴范围；无法计算时回退到例如 `[-1, 1]`。
- 复用 `SignalPlot`；图例、坐标轴、颜色和空状态必须明确。
- 计算失败时显示原因，不渲染断裂或误导曲线。

### 7.7 文件范围

- `apps/web/app/(app)/(project)/learn/workbench/page.tsx`
- `apps/web/features/learning/components/workbench/signal-workbench.tsx`
- `apps/web/features/learning/model/signal-workbench.ts`
- `apps/web/features/learning/index.ts`
- `apps/web/features/learning/components/learning-hub.tsx`
- `apps/web/features/learning/components/experiments/experiment-hub.tsx`（如加入次级入口）
- `apps/web/i18n/messages/zh-CN/learning.json`
- `apps/web/i18n/messages/en-US/learning.json`
- 纯函数测试文件及其测试脚本配置

### 7.8 测试要求

纯函数测试至少覆盖：

- 五种基本信号在典型参数下的值。
- 反转、尺度和平移的顺序与符号。
- 当 `shift` 为正时曲线向右平移。
- 当 `scale > 1` 时信号在时间轴展开。
- A+B、A-B、A×B 的逐点结果。
- 两个矩形脉冲的卷积区间、峰值和 `dt` 缩放。
- 极端值和非有限值不会进入 `SignalPlot`。
- 空信号、零长度和非法参数返回可显示错误。

当前 `@deeix/web` 没有可被根 CI 自动执行的 `test` 脚本。实施时二选一：

1. 将纯数学模块下沉到已有 `@deeix/core` 测试体系；或
2. 为 `@deeix/web` 增加测试脚本，并调整 Actions 使 Web 测试实际运行。

不能只写测试文件而让 CI 跳过。

### 7.9 验收标准

- [ ] `/learn/workbench` 可从学习首页进入。
- [ ] 五种信号、两个信号源和六种操作都可操作。
- [ ] 变换约定在文案、公式和计算结果中一致。
- [ ] 卷积时间轴和 `dt` 缩放正确，有自动化测试。
- [ ] 非有限值和极端值不会导致白屏或错误曲线。
- [ ] 桌面与窄屏布局均可用，控件有标签和键盘焦点。
- [ ] 中英文文案完整。
- [ ] Web CI 的 Lint、类型、架构、构建与新增测试通过。

## 8. 阶段 3：错题诊断、变式练习与间隔复习

### 8.1 目标

把现有“看到错题 → 再答一次”升级为：

```text
识别错误选项 → 解释误区 → 给出同类变式 → 记录复习阶段 → 到期再次复习
```

### 8.2 诊断模型

- 12 道基础题。
- 每题 3 个错误选项对应 3 个误区代码，共 36 个。
- 误区代码由服务端返回，前端只负责本地化文案，不自行推断。
- 诊断文案结构建议包含：
  - 你可能的想法。
  - 这个想法在哪一步失效。
  - 正确判断所需的关键关系。
  - 推荐复习的小节和变式。

素材示例：

- `energy-signal-power`
- `convolution-shift-direction`
- `aliasing-no-fold`
- `damping-more-overshoot`
- `imaginary-axis-decay`

完整代码以服务端稳定目录为准，不能在前后端各自维护不同 ID。

### 8.3 变式模型

- 每题 2 道变式，共 24 道。
- 变式题干、选项、答案、解析和对应误区由服务端管理。
- 浏览器只收到变式 ID、题干和选项；正确答案不提前下发。
- 变式提交使用服务端评分。
- 变式文案必须支持中英文。
- 变式目录 ID 稳定；修改语义时必须新增 ID，不能复用旧 ID。

### 8.4 API

`POST /api/v1/learning/reviews`

```json
{
  "id": "6f686bd6-6d3f-43a0-b03c-8f8c6f5be8bc",
  "baseQuestionId": "energy-signal",
  "variantId": "energy-signal-v1",
  "selected": 2
}
```

响应沿用学习作答数据，但必须包含：

- `mode: "review"`
- `variantId`
- `answer`
- `correct`
- `reviewStage`
- `nextReviewAt`
- `createdAt`

`GET /api/v1/learning/progress` 扩展字段：

- `latestWrong`
- `misconception`
- `suggestedVariantId`
- `reviewStage`
- `nextReviewAt`
- `reviewDue`

不新增单独的“正确答案查询”接口。

### 8.5 前端 API 与状态

更新：

- `apps/web/shared/api/learning.ts`
- `apps/web/shared/api/learning-types.ts`
- `apps/web/features/learning/hooks/use-learning-progress.ts`
- `apps/web/features/learning/components/learning-progress.tsx`

新增独立方法：

```ts
saveLearningReview(accessToken, payload)
```

状态要求：

- 基础快问快答继续使用现有 quiz 待提交队列。
- 复习提交不得进入 quiz 重练队列，避免重放到错误端点。
- 复习提交可有自己的 pending/error 状态；若加入离线队列，必须使用独立存储键与 payload 类型。
- 提交成功后重新拉取服务端进度，不能只本地推进阶段。
- 失败后保留用户选择和重试入口。

### 8.6 进度页 UI

错题卡增加：

- 误区诊断。
- “为什么这个选项常见地看似合理”。
- 推荐变式入口。
- 当前复习阶段。
- 下次复习日期或“已到期”。
- 最近错误与最近复习结果的区别标签。

复习流程：

1. 点击“变式复习”。
2. 显示变式题干与四个选项。
3. 提交后显示对错、正确答案和解析。
4. 显示新的阶段与下次日期。
5. 到期队列只展示 `reviewDue = true` 的题目。
6. 历史记录标注 `quiz` / `review`，避免把变式作答误显示成原题作答。

建议筛选：

- 全部薄弱题。
- 已到期。
- 复习中（阶段 0–4）。
- 已完成（阶段 5）。
- 按知识点。

### 8.7 国际化

需要更新：

- `apps/web/i18n/messages/zh-CN/learning-labs.json`
- `apps/web/i18n/messages/en-US/learning-labs.json`
- `apps/web/i18n/messages/zh-CN/learning.json`
- `apps/web/i18n/messages/en-US/learning.json`

至少包含：

- 36 个误区解释。
- 24 道变式题干、选项、解析。
- 复习阶段标签。
- 到期和下次复习日期文案。
- 复习提交错误与重试。
- 诊断标题、建议变式和完成状态。

### 8.8 验收标准

- [ ] 答错基础题后能显示对应误区，而不是通用“答错了”。
- [ ] 变式答案不会在提交前暴露给浏览器。
- [ ] 变式提交使用独立 API 和独立状态，不进入 quiz 队列。
- [ ] 同一 UUID 重试幂等；同一 UUID 修改答案或变式返回 409。
- [ ] 答对复习题按 3、7、14、30 天推进，最后退出到期队列。
- [ ] 答错复习题重置阶段 0，并在 1 天后再次到期。
- [ ] 后续正确快问快答保留最近错误和复习计划。
- [ ] 刷新页面后阶段和日期与服务端一致。
- [ ] 历史记录明确区分快问快答与变式复习。
- [ ] 中英文无缺失键，日期按本地时区展示。
- [ ] API、Web 与契约 Actions 全部通过。

## 9. 阶段 4：扩展账号学习记录覆盖

### 9.1 当前缺口

目前账号学习记录主要覆盖快问快答、错题重练，并在阶段 3 后覆盖变式复习。尚未覆盖：

- 章节实验完成与理由质量。
- 课堂小测。
- 课前清单。
- 课后清单。
- 后续实验报告与过程材料。

### 9.2 统一活动模型

建议新增“学习活动”记录，而不是继续为每个页面扩列：

```json
{
  "id": "uuid",
  "sourceType": "experiment",
  "sourceId": "signal-basics",
  "topicIds": ["signal-classification"],
  "status": "completed",
  "score": 1,
  "maxScore": 1,
  "startedAt": "2026-10-18T08:00:00Z",
  "completedAt": "2026-10-18T08:12:00Z",
  "metadata": {
    "seed": "cm-3f8d",
    "attemptMode": "experiment"
  }
}
```

建议枚举：

- `quick_quiz`
- `mistake_retry`
- `variant_review`
- `experiment`
- `classroom_quiz`
- `pre_class_checklist`
- `post_class_checklist`
- `report`
- 后续可扩展 `solution_check`

约束：

- 唯一键至少包含用户、来源类型、来源 ID 与事件 ID，防止重复点击或网络重试重复计数。
- `metadata` 只保存结构化、可审计摘要，不保存不必要的隐私原文。
- 活动时间由服务端确认；客户端时间只用于展示或排序辅助。
- 所有活动映射到一个或多个知识点，供掌握度和教师聚合使用。

### 9.3 各入口接入规则

| 入口 | 完成条件 | 备注 |
| --- | --- | --- |
| 快问快答 | 服务端成功保存作答 | 复用现有 attempt，不重复写两份矛盾数据 |
| 错题重练 | 服务端成功保存重练 | 保留来源 question ID |
| 变式复习 | 服务端成功评分 | 与复习阶段同事务或可靠补偿 |
| 章节实验 | 提交预测并通过理由最低长度 | 仅打开页面、拖动滑块不算完成 |
| 课堂小测 | 服务端收到完整提交或按课堂规则判定 | 防止刷新重复计分 |
| 课前清单 | 学生显式勾选完成 | 允许取消时记录最新状态 |
| 课后清单 | 学生显式勾选完成 | 与教师可见范围分开定义 |

### 9.4 实施顺序

1. 定义活动领域类型、数据库表和幂等约束。
2. 提供 `POST /api/v1/learning/activities` 或内部服务接口。
3. 先接入章节实验，验证一个端到端入口。
4. 接入课堂小测和课前课后清单。
5. 更新学习记录页，增加来源类型筛选和完成趋势。
6. 再向教师分析提供聚合读取接口。

### 9.5 验收标准

- [ ] 六类学习活动都有明确完成条件。
- [ ] 同一事件重复提交不会重复计数。
- [ ] 学习记录页可按来源类型和知识点筛选。
- [ ] 章节实验不会因单纯打开页面被标记完成。
- [ ] 课堂小测不能由学生客户端伪造高分。
- [ ] 课前与课后清单状态可恢复且只属于当前账号。
- [ ] 旧快问快答历史仍可读取，迁移不回填虚假活动。
- [ ] 活动查询具有账号隔离测试。

## 10. 阶段 5：分步解题检查

### 10.1 目标

先解决信号与系统课程中错误率最高的卷积积分问题：检查学生步骤，定位第一处错误，而不是只判断最终答案。

### 10.2 首版范围

优先支持模板化题型：

- 卷积积分上下限判断。
- 分段区间的建立。
- 翻转和平移后的重叠区间。
- 积分变量替换。
- 阶跃函数决定的时域范围。

暂不承诺通用自由形式数学证明。

### 10.3 API 设计

建议：

`POST /api/v1/learning/solution-checks`

```json
{
  "id": "uuid",
  "problemId": "convolution-rect-rect-01",
  "steps": [
    {
      "index": 1,
      "expression": "0 < t < 1",
      "explanation": "两个矩形在此时有重叠"
    },
    {
      "index": 2,
      "expression": "y(t)=t",
      "explanation": "重叠长度为 t"
    }
  ]
}
```

响应：

```json
{
  "correct": false,
  "firstErrorStep": 1,
  "errorCode": "convolution-overlap-interval",
  "message": "第一处问题在区间判断：t<0 时仍有部分重叠。",
  "hint": "先固定 t，再分别画出翻转后的 h(t-τ)。",
  "nextPrompt": "请重新写出 t<0 时的重叠区间。",
  "citations": []
}
```

### 10.4 判定架构

- 题目模板和标准区间由服务端定义。
- 对可结构化检查的步骤使用确定性规则，不让模型决定对错。
- 模型仅可用于把规则结果改写为更自然的解释。
- 返回“第一处错误”，后续步骤不再继续判错，避免一次给出过多负反馈。
- 无法解析时返回“需要老师/更结构化输入”，不能猜测正确。
- 学生可修改后再次提交；同一提交 UUID 仍然幂等。

### 10.5 前端

- 分步输入卡片，每步可添加、删除和编辑。
- 显示解析状态、第一处错误、提示和下一步输入。
- 不默认展示完整标准答案；可先修一步再继续。
- 可在卷积课程页和错题复习页接入。

### 10.6 验收标准

- [ ] 矩形-矩形等基础卷积题有确定性标准测试。
- [ ] 能定位第一处错误步骤，而不是只比较最终答案。
- [ ] 区间边界包含关系有明确约定和测试。
- [ ] 模型失败不影响确定性判定。
- [ ] 无法解析时明确返回，不伪造结论。
- [ ] 同一提交幂等，账号之间结果隔离。
- [ ] 首版仅承诺已建模题型，不宣称通用数学证明。

## 11. 阶段 6：课程知识导航

### 11.1 目标

按教材章节建立“概念—公式—例题—实验—练习”的可导航索引，让学习记录中的每个知识点都能跳转到可学习内容。

### 11.2 内容模型

建议使用仓库内受版本控制的课程清单，而不是让模型临时生成目录：

```ts
type KnowledgeNode = {
  id: string;
  chapter: string;
  section: string;
  title: { zh: string; en: string };
  concepts: string[];
  formulas: string[];
  exampleIds: string[];
  experimentHref?: string;
  practiceIds: string[];
  prerequisites: string[];
};
```

### 11.3 页面能力

- 章节树和知识点搜索。
- 概念、公式、例题、实验、练习五类关联入口。
- 从错题诊断、助教引用和实验报告跳转到对应节点。
- 显示前置知识和后续知识，避免一次铺开全部内容。
- 中英文标题和摘要。

### 11.4 文件范围

- 新增课程清单数据文件。
- 新增 `/learn/knowledge` 页面与组件。
- 更新学习首页导航。
- 更新助教引用链接，使引用 ID 与知识导航节点一致。

### 11.5 验收标准

- [ ] 所有现有实验和课程都能映射到至少一个知识节点。
- [ ] 错题、变式和助教引用使用稳定节点 ID。
- [ ] 搜索、章节筛选和空状态可用。
- [ ] 链接目标真实存在，不出现死链。
- [ ] 中英文内容完整。
- [ ] 课程内容不依赖模型实时生成。

## 12. 阶段 7：离散时间专题

### 12.1 目标

补齐离散时间信号与系统学习路径，并复用已验证的“预测—观察—解释—练习”框架。

### 12.2 首版内容

1. 离散卷积
   - 序列翻转、平移、乘加。
   - 与连续卷积的采样近似区别。
2. 差分方程
   - 递推求解。
   - 零输入/零状态、稳定性直观观察。
3. DTFT
   - 周期频谱。
   - 频率归一化与混叠的联系。
4. Z 变换
   - 极点、ROC、稳定性。
   - 与拉普拉斯变换的对比。

### 12.3 实施方式

- 每专题包含公式卡、交互实验、预测题、变式题和课程引用。
- 交互实验继续接入 `PredictionCard`，并在阶段 1 后接入 `ExperimentTutor`。
- 纯数学计算与绘图逻辑独立于 React 组件。
- 离散索引使用整数 `n`，不与连续 `t` 混用。
- 边界、周期和 ROC 文案必须明确。

### 12.4 验收标准

- [ ] 四个专题均有可交互内容和至少一道预测题。
- [ ] 离散卷积索引和边界有自动化测试。
- [ ] DTFT 周期性与采样章节建立交叉链接。
- [ ] Z 变换稳定性结论明确依赖 ROC。
- [ ] 课程引用均在助教允许列表内。
- [ ] 学习记录可按 `discrete-time` 知识点聚合。

## 13. 阶段 8：实验报告与教师学情分析

### 13.1 目标

保存实验过程，形成可提交报告，并把班级数据按知识点汇总为薄弱项，而不是只展示学生个人错题。

### 13.2 实验报告

报告数据来源：

- 实验 ID、seed、参数快照。
- 预测选项与理由。
- 图形摘要或可重现参数，不默认上传原始图形。
- 助教提示与引用使用摘要。
- 变式结果。
- 学生反思。
- 提交时间和版本。

状态：

- `draft`
- `submitted`
- `returned`（可选后续）
- `graded`（可选后续）

要求：

- 草稿仅本人可见。
- 提交后进入锁定版本；修改需新版本或教师退回。
- 参数快照必须足以重放实验，不把不可复现的截图当唯一数据。
- 报告导出如使用 PDF，另行定义模板、字体和渲染测试。

### 13.3 教师学情分析

聚合维度：

- 班级。
- 章节/知识点。
- 实验。
- 误区代码。
- 变式完成率。
- 复习到期完成率。
- 课堂小测得分分布。

隐私规则：

- 默认显示聚合值。
- 小样本是否展示需由产品明确；样本过小时隐藏比例或标注样本不足。
- 教师查看学生具体报告时必须有班级权限。
- 学生理由、模型提示和个人复习计划不进入公开班级排行。
- 导出数据需要权限和审计。

### 13.4 API 与页面

候选 API：

- `GET /api/v1/learning/reports/:experimentId`
- `POST /api/v1/learning/reports`
- `PATCH /api/v1/learning/reports/:id`
- `GET /api/v1/teacher/analytics/topics`
- `GET /api/v1/teacher/analytics/classes/:id`

角色与班级权限沿用现有系统。如果当前角色模型无法表达教师权限，先补最小权限设计，不能仅靠前端隐藏入口。

### 13.5 验收标准

- [ ] 实验过程可生成报告草稿且可恢复。
- [ ] 提交版本锁定，重复提交幂等。
- [ ] 学生无法访问他人报告。
- [ ] 教师只能查看授权班级。
- [ ] 学情分析按知识点和误区聚合，可追溯到活动记录。
- [ ] 小样本和缺失数据展示策略明确。
- [ ] 指标定义有文档和 SQL/服务端测试，统计口径一致。
- [ ] 导出与访问有审计记录。

## 14. API 与数据演进总览

| 能力 | 端点/数据 | 当前状态 | 目标阶段 |
| --- | --- | --- | --- |
| 学习进度 | `GET /api/v1/learning/progress` | 基线已有，原型扩展字段 | 0/3 |
| 快问快答提交 | `POST /api/v1/learning/attempts` | 基线已有，原型修改评分/复习字段 | 0 |
| 变式复习 | `POST /api/v1/learning/reviews` | 未验证原型 | 0/3 |
| 实验助教 | `POST /api/v1/learning/tutor` | 未验证原型 | 0/1 |
| 学习活动 | `POST /api/v1/learning/activities` | 未实现 | 4 |
| 分步检查 | `POST /api/v1/learning/solution-checks` | 未实现 | 5 |
| 知识导航 | 课程清单 + 页面 | 未实现 | 6 |
| 实验报告 | `learning/reports` | 未实现 | 8 |
| 教师分析 | `teacher/analytics` | 未实现 | 8 |

数据演进原则：

- 采用新增表或新增可空/带默认值字段，保证旧客户端仍可读取旧字段。
- 复习和报告锁定所需状态由服务端更新，客户端不得直接写数据库语义字段。
- 生成契约与后端 Swagger 必须同步提交。
- 不在一个提交中同时做“字段重命名 + UI 重做 + 历史数据迁移”。

## 15. GitHub Actions 验证策略

### 15.1 强制约束

本机不执行：

- `go build`
- `go test`
- `make lint`
- `pnpm check`
- `pnpm build`
- `pnpm test`
- Docker 构建
- Playwright 或浏览器端到端测试

本机只允许执行实施所需的操作型命令：

- `pnpm api:generate`（更新声明式契约）
- `git diff --check`
- `git status --short`
- `git diff --stat`

任何“已验证”“通过”“可构建”的结论必须来自 GitHub Actions 的实际结果，并记录工作流、提交 SHA 和运行链接。

### 15.2 分支与推送流程

1. 从稳定基线创建独立功能分支。
2. 将改动拆成可回退的原子提交。
3. 推送功能分支并创建到 `main` 的 Pull Request。
4. PR 的 commit subject 必须符合：

```text
^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test): [ASCII text]+$
```

5. 等待 CI 完成；失败时从 Actions 日志修复，不在本机重复构建。
6. 变更后端、Web 或共享契约时，检查路径过滤是否触发了对应任务。
7. 全部必需检查通过后才允许合并。

### 15.3 工作流职责

| 工作流 | 触发场景 | 重点检查 |
| --- | --- | --- |
| `.github/workflows/ci.yml` | push/PR 到 `dev`、`main`，手动触发 | API Lint/双标签构建/Go 测试；Web Lint/类型/架构/契约/构建；Docker 路径变更时构建镜像 |
| `.github/workflows/api-contract.yml` | 手动触发 | 重新生成 Swagger 与 TS 类型并发布到 `regen/api-contract` 分支 |
| `.github/workflows/codeql.yml` | push/PR/定时/手动 | Actions、Go、JavaScript/TypeScript、Python 安全扫描 |
| `.github/workflows/ghcr-image.yml` | push 到 `dev`/`main`、tag、手动触发 | amd64/arm64 GHCR 镜像构建、推送、manifest 合并和 inspect |
| `.github/workflows/dockerhub-image.yml` | 按仓库现有配置 | Docker Hub 镜像发布（如适用） |

### 15.4 镜像测试

用户明确要求使用 GitHub Actions 验证编译镜像，而不是本机 Docker。建议：

1. 功能分支推送后，先在 PR 上完成 `CI` 的 API/Web 检查。
2. 对需要镜像验证的提交，在 GitHub Actions 手动触发 `Image (GHCR)`，选择功能分支。
3. 等待 amd64 与 arm64 两个矩阵任务以及 manifest merge 任务通过。
4. 记录镜像 tag、digest、提交 SHA 和工作流运行链接。
5. 不在镜像成功前宣称“镜像可发布”。
6. 合并到 `main` 后，再观察分支触发的 GHCR 构建是否成功。

### 15.5 PR 验收模板

```text
Commit:
Workflow run:
API:
Web:
API contract:
CodeQL:
GHCR amd64:
GHCR arm64:
Manifest:
Known limitations:
```

### 15.6 提交拆分建议

```text
fix: stabilize learning review backend
test: cover learning reviews and tutor fallback
chore: regenerate api contract
feat: add experiment tutor
feat: add signal workbench
feat: add review diagnosis workflow
feat: track learning activities
```

提交 subject 使用 ASCII，正文可中文；不要把多个阶段压入一个不可审查的大提交。

## 16. 测试矩阵

| 领域 | 单元测试 | 服务/仓储测试 | 前端/人工验证 | 主要边界 |
| --- | --- | --- | --- | --- |
| 基础作答 | 选项与评分 | 账号隔离、幂等 | 提交与历史 | 同 UUID 不同答案 |
| 诊断 | 误区映射 | 最近错误保留 | 诊断文案 | 后续答对不清除错误 |
| 变式复习 | 阶段推进 | 重试幂等、时间注入 | 到期队列、解析 | 答错重置、阶段 5 退出 |
| 助教 | 输入归一化、引用白名单 | 无模型回退、路由失败回退 | 四实验 hint/explain | 非法 JSON、越权引用、提示泄题 |
| 信号工作台 | 五种信号、六种操作、卷积 | 不涉及后端 | 窄屏、可访问性、空状态 | 非有限值、零尺度、边界点 |
| 学习活动 | 状态机 | 唯一约束、来源隔离 | 清单、实验完成 | 重复点击、后台重放 |
| 分步检查 | 区间规则 | 题目隔离、幂等 | 第一错误步骤 | 无法解析、边界值 |
| 知识导航 | 数据完整性 | 不涉及后端 | 搜索、死链 | 缺失翻译、循环前置 |
| 离散时间 | 索引与变换 | 学习记录映射 | 交互实验 | 周期、边界、ROC |
| 报告与分析 | 聚合口径 | 权限、最小样本 | 教师视图、导出 | 越权、重复提交、空样本 |

优先级最高的回归用例：

1. 同一 UUID 重复提交返回原结果。
2. 同一 UUID 修改选择或变式返回 409。
3. 正确快问快答不清除最近错误和复习计划。
4. 复习答对推进 3、7、14、30 天，答错重置。
5. 助教引用永远在实验白名单内。
6. 无模型配置时四实验回退可用。
7. 工作台卷积结果符合 `sum * dt`，不截断时间轴。
8. 复习提交不进入 quiz 待提交队列。
9. 学习活动不重复计数。
10. 学生不能读取其他账号记录或报告。

## 17. 风险、回退与发布控制

### 17.1 主要风险

| 风险 | 后果 | 缓解 |
| --- | --- | --- |
| 未验证原型直接混入 main | 编译失败、契约漂移 | 独立分支、阶段 0、原子提交 |
| 模型编造引用 | 教学可信度下降 | 白名单二次映射、精选回退 |
| 提示泄露答案 | 破坏先预测原则 | hint/explain 分流、提示词约束、前端验收 |
| 数值卷积实现错误 | 学生学到错误结论 | 纯函数测试、固定采样与 `dt` 测试 |
| 复习时间计算不一致 | 到期队列混乱 | 注入时钟、UTC 存储、阶段表测试 |
| 同一 UUID 重试冲突 | 丢数据或重复推进 | 服务端幂等与冲突测试 |
| 学习活动重复计数 | 教师分析失真 | 唯一约束、事件 ID、补偿事务 |
| 教师越权查看 | 隐私事故 | 班级授权、服务端校验、审计 |
| Actions 成本过高 | 反馈慢 | 路径过滤、缓存、按阶段运行镜像 |
| API 契约与前端手写类型分叉 | 运行时字段错误 | 只使用生成类型、CI 契约检查 |

### 17.2 回退策略

- 每个阶段一个可回退提交或小型提交组。
- 数据库变更采用向后兼容新增；不要在首个版本删除旧字段。
- 助教、工作台、复习 UI 可使用构建时或配置开关渐进开放；开关关闭后应退回基线可用页面。
- 若模型渠道异常，助教回退到精选内容，不影响实验提交。
- 若工作台数值错误，先隐藏入口或回退到只读示例，不回退学习记录。
- 若复习状态迁移有风险，保留旧快问快答读取路径，并停止写入新阶段字段。
- 不执行不可逆数据删除；回滚以代码版本、数据库备份和契约版本为单位。

### 17.3 发布前必须确认

- 数据库升级脚本和旧数据读取已验证。
- 所有新增 API 有认证和账号隔离测试。
- 生成契约与实现一致。
- 失败与空状态不会显示伪成功。
- 已知限制进入交付说明，不用“基本完成”替代。

## 18. 整体完成定义（Definition of Done）

### 18.1 前三项完成定义

只有同时满足以下条件，才能宣称前三项完成：

- 阶段 0 后端通过 API CI。
- 阶段 1 四个实验均接入助教，模型与精选回退都可用。
- 阶段 2 工作台可组合五种信号和六种操作，卷积计算有 CI 测试。
- 阶段 3 进度页支持误区诊断、变式提交、到期复习和历史标签。
- API 契约已生成并通过 Web 契约检查。
- CodeQL 无新增高严重级别问题。
- 需要镜像发布时，GHCR 工作流通过。
- 中英文文案完整。
- 关键回归用例全部由 Actions 或明确的手动验收记录覆盖。
- 文档更新 API、状态、限制和回滚说明。

### 18.2 后续能力完成定义

每个后续阶段都至少交付：

1. 明确的数据模型与权限边界。
2. 可生成契约的 API。
3. 成功、空、加载、错误和重试状态。
4. 自动化测试或清楚的不可自动化验收步骤。
5. GitHub Actions 结果。
6. 监控、回滚和已知限制。

## 19. 原恢复执行顺序（阶段 0–3 已执行）

恢复工作后不要直接继续写前端。按以下顺序执行：

1. 重新阅读仓库和 `apps/web/AGENTS.md` 及适用的 Next.js 本地文档。
2. 检查工作区是否仍是本文记录的 9 个学习功能原型文件改动（不含本文）。
3. 创建独立功能分支。
4. 先修复阶段 0 的编译、应用装配、DTO、复习状态和测试问题。
5. 生成 API 契约。
6. 推送并创建 PR，等待 GitHub Actions。
7. CI 通过后再实施阶段 1，随后阶段 2、阶段 3。
8. 镜像验证通过前不进行发布或“可部署”声明。

当前建议的最近一个可交付目标是 **M1：学习反馈闭环**，而不是同时铺开四个后续专题。
