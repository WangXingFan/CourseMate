# 学习闭环 P0 交付与验收

本次范围为《CourseMate 学习闭环未来工作规划》的阶段 0–3。实现位于 `codex/learning-p0`，审查入口：[PR #1](https://github.com/WangXingFan/CourseMate/pull/1)。阶段 4–8 仍为后续规划。

## 功能入口

| 入口 | 行为 |
| --- | --- |
| 四个 `/learn/experiments/*` 页面 | 答题前提供课程提示，答题后提供 AI 解释；展示来源和课程引用，换题清空旧结果 |
| `/learn/workbench` | 五类信号、反转/尺度/平移、A/B/加/减/乘/卷积、参数重置、自适应坐标范围 |
| `/learn/progress` | 36 类双语误区诊断、24 道服务端评分变式、复习阶段/日期、到期/进行中/完成筛选、作答模式标签 |
| `/learn/quiz?practice=mistakes` | 按服务端复习阶段筛选仍需巩固的原题 |

## API 与数据

- 保留 `GET /api/v1/learning/progress` 和 `POST /api/v1/learning/attempts`。
- 新增 `GET /api/v1/learning/variants/{id}?locale=zh-CN`；只返回题干、选项、基础题 ID 和课程链接，不提前返回答案或解析。
- 新增 `POST /api/v1/learning/reviews`；输入为 UUID、基础题 ID、变式 ID、选项与语言，提交后返回服务端评分、解析、阶段和下次日期。
- 新增 `POST /api/v1/learning/tutor`；使用现有认证、限流、模型授权与渠道路由。
- Swagger 与 TypeScript 契约由生成器维护；应用层类型不携带 JSON 协议标签。
- 数据库仅增加带默认值或可空字段；空模式按 `quiz` 读取，历史错误缺少到期时间时按错误时间加一天读取。
- 复习阶段在事务内计算并保存。PostgreSQL 锁定同一题目的稳定错误记录，避免不同 UUID 并发提交覆盖阶段。同账号同 UUID 返回原结果，内容不同返回 409。
- 最近原题错误与最近变式作答分别展示；后续原题答对保留误区和复习安排。
- 复习间隔为首次错误 1 天，答对后依次 3、7、14、30 天，第 5 阶段退出到期队列；复习答错重置为阶段 0、一天后重试。保存 UTC，界面按浏览器时区显示。
- 变式请求保留原 UUID 重试，失败后锁定已提交答案；不进入快问快答待提交队列。

## 助教与数值边界

答题前的提示使用人工编写的中英文课程内容。答题后的解释尝试模型；无可用模型、超时、非法 JSON、越出课程引用白名单时回退课程内容，并显示“课程精选”。模型请求禁用工具、启用临时请求，学生上下文放在 JSON 分隔区内，引用由服务端白名单重新构造。

输入信号在 `[-8,8]`、`dt=0.025` 上采样；卷积按 `sum * dt` 计算，完整输出范围为 `[-16,16]`。脉冲采用左闭右开的边界；窄脉冲使用有限宽度近似冲激，变换前面积等于幅度参数。无限时长信号在采样窗口外按零处理。对细节分辨率不足的设置显示调整建议，不承诺解析卷积或理想冲激的精确值。

## 验证方式

按规划，不在开发机运行编译、测试、Lint、类型检查、Docker 或 Playwright。本地只进行代码编辑、格式化、契约生成和 Git 差异检查；验证结果来自 GitHub Actions。

| 检查 | 覆盖内容 |
| --- | --- |
| API | Lint、默认与 sidecar 标签构建、Go 测试；包括复习调度、旧记录、幂等冲突、账号隔离、助教回退/引用/输入校验、双语题库完整性 |
| Web | Lint、类型、架构、契约一致性、静态导出；五类信号、六种运算、卷积面积/轴、非法参数、队列隔离和 36 类误区翻译测试 |
| UI smoke | 在 CI 的 Chromium 上验收桌面/390px 窄屏工作台、四实验提示与换题、模型解释展示、误区、到期筛选、丢失响应后的相同 UUID 重试、阶段和历史标签；保留截图 |
| CodeQL | Go、JavaScript/TypeScript、Python 和 Actions 扫描 |
| Image (GHCR) | 功能分支的 amd64、arm64 镜像构建及 manifest 检查 |

UI smoke 使用受控 API 数据验证界面状态；真实后端评分和存储行为由 Go 测试验证。模型路径使用测试网关验证，不要求在 CI 中配置实际上游密钥。

具体运行链接、提交与结果在本文件的验收记录中补充。截图保存在 Web 任务的 `learning-p0-screenshots` artifact。

## 回滚

按功能提交回退 Web 或后端实现；新增数据库列保留，不删除已有记录。回退时同时恢复生成契约。模型故障可直接使用课程回退内容。此次没有合并到 `dev` 或执行部署。

## 验收记录

- 阶段 0：提交 `3c88e611` 的 [CI](https://github.com/WangXingFan/CourseMate/actions/runs/39197037711) 与 [CodeQL](https://github.com/WangXingFan/CourseMate/actions/runs/39197037702) 已通过。
- 完整功能首轮：提交 `aa3fbb6a` 的 [CI](https://github.com/WangXingFan/CourseMate/actions/runs/39198049364) 与 [CodeQL](https://github.com/WangXingFan/CourseMate/actions/runs/39198049365) 已通过，包括 API、Web、Desktop、6 项 Web 学习回归测试、40 项共享核心测试以及桌面/移动端 UI smoke。已检查 [5 张验收截图](https://github.com/WangXingFan/CourseMate/actions/runs/39198049364/artifacts/12162996592)，未发现页面溢出或弹窗截断。
- 完整 P0：等待最终提交的 Actions 结果后填写。
