# 题库答案与配对清单

题库版本：2026-11-06-v3。此文件由 `node scripts/export-learning-bank-audit.mjs` 从实际启用的题库生成，供教师逐题核对。

快问快答 **240** 道（第1章 60 道、第2章 60 道、第3章 60 道、第4章 60 道）；复习变式 **480** 道；课程原题 **156** 道；同知识点复测 **52** 道。本清单收录 **928** 个题目实例，不包含作业、实验及其他用途题库。

## 本次扩充与核验

出题边界为 `content/signals/knowledge-base` 的 52 份已发布讲义（含附录 A、B）。快问快答从 80 道扩至 240 道，变式从 160 道扩至 480 道；每道主问题始终配两道变式。全部 720 道均标明讲义出处。

新增 480 道题涵盖 80 个题型，每题均附中英文题面、唯一正确选项、解析和独立计算元数据。`apps/web/scripts/learning-question-bank.test.mjs` 逐题核验，`learning-expansion-calculations.mjs` 使用独立公式、数值积分、直接求和、直接 DFT 和微分方程数值解复算答案，不读取出题脚本的计算结果。选项按需要保留六位小数，并在题面提示选择最接近值。

范围核对发现旧 `damping` 主问题及两道变式要求讲义未展开的阻尼比/超调量公式，已改用新 ID `second-order-mode-decay` 及配套变式，考查 2.1 节的特征根与衰减包络。这 3 道替换题同样经过独立复算，其余 79 组原题题面、答案与 ID 保留。相关函数统一使用讲义的 y(t−τ) 约定。

题库版本升级隔离不同题量的排行榜。退役题的作答仍保存在数据库，当前题库与最近作答视图不再暴露其失效入口，也不把旧作答转记到新题。新增题的正确选项在 A/B/C/D 各分布 120 次；同步检查双语一致性、题目与变式关联、讲义引用和错题诊断。

## 快问快答与复习变式

### 第1章

| ID | 题目 | 正确答案 | 解析 | 讲义依据 |
| --- | --- | --- | --- | --- |
| energy-signal | x(t) = e^{−2t}u(t) 属于哪类信号？ | A · 能量信号 | 指数衰减信号的能量有限，平均功率为 0，因此是能量信号。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| energy-signal-v1 | x(t)=2e^(−t)u(t) 的总能量是多少？ | A · 2 | E=∫₀∞4e^(−2t)dt=2。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| energy-signal-v2 | x(t)=3cos(2πt) 的平均功率是多少？ | B · 4.5 | 余弦的均方值为幅度平方的一半：P=9/2。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| finite-energy-power | 已知非零信号总能量 E=3<∞，按双边时间平均定义，其平均功率是多少？ | B · 0 | P=lim(E_T/(2T))=0，因为分子有界而观察时长趋于无穷。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| finite-energy-power-v1 | 已知非零信号总能量 E=8<∞，按双边时间平均定义，其平均功率是多少？ | C · 0 | P=lim(E_T/(2T))=0，因为分子有界而观察时长趋于无穷。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| finite-energy-power-v2 | 已知非零信号总能量 E=12<∞，按双边时间平均定义，其平均功率是多少？ | D · 0 | P=lim(E_T/(2T))=0，因为分子有界而观察时长趋于无穷。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| cosine-average-power | x(t)=2cos(3t)，其平均功率是多少？ | C · 2 | cos² 的周期平均值为 1/2，P=2²/2=2。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| cosine-average-power-v1 | x(t)=4cos(5t)，其平均功率是多少？ | D · 8 | cos² 的周期平均值为 1/2，P=4²/2=8。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| cosine-average-power-v2 | x(t)=6cos(2t)，其平均功率是多少？ | A · 18 | cos² 的周期平均值为 1/2，P=6²/2=18。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| rectangle-energy | 矩形信号在 [0,3] 秒内幅度为 2，其余为零。总能量是多少？ | D · 12 | E=幅度平方×时长=2²×3=12。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| rectangle-energy-v1 | 矩形信号在 [0,2] 秒内幅度为 3，其余为零。总能量是多少？ | A · 18 | E=幅度平方×时长=3²×2=18。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| rectangle-energy-v2 | 矩形信号在 [0,1] 秒内幅度为 4，其余为零。总能量是多少？ | B · 16 | E=幅度平方×时长=4²×1=16。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| exponential-energy | x(t)=2e^(−2t)u(t)，总能量是多少？ | A · 1 | E=∫₀∞4e^(−4t)dt=1。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| exponential-energy-v1 | x(t)=3e^(−3t)u(t)，总能量是多少？ | B · 1.5 | E=∫₀∞9e^(−6t)dt=1.5。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| exponential-energy-v2 | x(t)=4e^(−2t)u(t)，总能量是多少？ | C · 4 | E=∫₀∞16e^(−4t)dt=4。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| angular-to-hertz | 角频率 ω=40π rad/s，对应频率是多少 Hz？ | B · 20 Hz | f=ω/(2π)=20 Hz。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| angular-to-hertz-v1 | 角频率 ω=100π rad/s，对应频率是多少 Hz？ | C · 50 Hz | f=ω/(2π)=50 Hz。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| angular-to-hertz-v2 | 角频率 ω=240π rad/s，对应频率是多少 Hz？ | D · 120 Hz | f=ω/(2π)=120 Hz。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| harmonic-period | x(t)=cos(2t)+cos(4t)，最小正周期 T=kπ 秒，k 是多少？ | C · 1 | 两频率为 1:2，基波角频率 2 rad/s，所以 T=2π/2。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| harmonic-period-v1 | x(t)=cos(3t)+cos(6t)，最小正周期 T=kπ 秒，k 是多少？ | D · 0.666667 | 两频率为 1:2，基波角频率 3 rad/s，所以 T=2π/3。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| harmonic-period-v2 | x(t)=cos(4t)+cos(8t)，最小正周期 T=kπ 秒，k 是多少？ | A · 0.5 | 两频率为 1:2，基波角频率 4 rad/s，所以 T=2π/4。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| time-width-scale | x(t) 非零区间宽度为 12 秒，x(3t) 的非零区间宽度是多少秒？ | D · 4 s | 正时间压缩 3 倍，宽度为 12/3=4 秒。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| time-width-scale-v1 | x(t) 非零区间宽度为 8 秒，x(2t) 的非零区间宽度是多少秒？ | A · 4 s | 正时间压缩 2 倍，宽度为 8/2=4 秒。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| time-width-scale-v2 | x(t) 非零区间宽度为 15 秒，x(5t) 的非零区间宽度是多少秒？ | B · 3 s | 正时间压缩 5 倍，宽度为 15/5=3 秒。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| support-delay-scale | x(t) 仅在 [0,2] 非零。x(2t−4) 非零区间的左端点是多少？ | A · 2 | 解 0≤2t−4≤2，左端点为 4/2=2。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| support-delay-scale-v1 | x(t) 仅在 [0,3] 非零。x(3t−6) 非零区间的左端点是多少？ | B · 2 | 解 0≤3t−6≤3，左端点为 6/3=2。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| support-delay-scale-v2 | x(t) 仅在 [0,4] 非零。x(2t−8) 非零区间的左端点是多少？ | C · 4 | 解 0≤2t−8≤4，左端点为 8/2=4。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| energy-time-scale | x(t) 的能量为 12，x(-3t) 的能量是多少？ | B · 4 | 变量代换得 E新=E原/\|a\|=12/3=4。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| energy-time-scale-v1 | x(t) 的能量为 20，x(4t) 的能量是多少？ | C · 5 | 变量代换得 E新=E原/\|a\|=20/4=5。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| energy-time-scale-v2 | x(t) 的能量为 18，x(-2t) 的能量是多少？ | D · 9 | 变量代换得 E新=E原/\|a\|=18/2=9。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| impulse-scale-weight | δ(2t)=cδ(t)，系数 c 是多少？ | C · 0.5 | δ(at)=δ(t)/\|a\|，因此 c=1/2。 | [1.3 阶跃函数与冲激函数](../content/signals/knowledge-base/ss-1-3.md) |
| impulse-scale-weight-v1 | δ(4t)=cδ(t)，系数 c 是多少？ | D · 0.25 | δ(at)=δ(t)/\|a\|，因此 c=1/4。 | [1.3 阶跃函数与冲激函数](../content/signals/knowledge-base/ss-1-3.md) |
| impulse-scale-weight-v2 | δ(5t)=cδ(t)，系数 c 是多少？ | A · 0.2 | δ(at)=δ(t)/\|a\|，因此 c=1/5。 | [1.3 阶跃函数与冲激函数](../content/signals/knowledge-base/ss-1-3.md) |
| impulse-sifting | 全实轴积分 ∫(t²+3)δ(t−2)dt 等于多少？ | D · 7 | 冲激取样 t=2，结果 2²+3=7。 | [1.3 阶跃函数与冲激函数](../content/signals/knowledge-base/ss-1-3.md) |
| impulse-sifting-v1 | 全实轴积分 ∫(t²+1)δ(t−3)dt 等于多少？ | A · 10 | 冲激取样 t=3，结果 3²+1=10。 | [1.3 阶跃函数与冲激函数](../content/signals/knowledge-base/ss-1-3.md) |
| impulse-sifting-v2 | 全实轴积分 ∫(t²+2)δ(t−4)dt 等于多少？ | B · 18 | 冲激取样 t=4，结果 4²+2=18。 | [1.3 阶跃函数与冲激函数](../content/signals/knowledge-base/ss-1-3.md) |
| linear-superposition | 线性系统 y(t)=2x(t)。同一时刻 x₁=3、x₂=4，输入 x₁+x₂ 的输出是多少？ | A · 14 | T(x₁+x₂)=2(3+4)=14，与两输出之和一致。 | [1.4 系统的定义、分类与性质](../content/signals/knowledge-base/ss-1-4.md) |
| linear-superposition-v1 | 线性系统 y(t)=3x(t)。同一时刻 x₁=2、x₂=5，输入 x₁+x₂ 的输出是多少？ | B · 21 | T(x₁+x₂)=3(2+5)=21，与两输出之和一致。 | [1.4 系统的定义、分类与性质](../content/signals/knowledge-base/ss-1-4.md) |
| linear-superposition-v2 | 线性系统 y(t)=4x(t)。同一时刻 x₁=1、x₂=3，输入 x₁+x₂ 的输出是多少？ | C · 16 | T(x₁+x₂)=4(1+3)=16，与两输出之和一致。 | [1.4 系统的定义、分类与性质](../content/signals/knowledge-base/ss-1-4.md) |
| square-homogeneity | 非线性系统 T[x]=x²。对某时刻 x=3，T[2x] 的值是多少？ | B · 36 | T[ax]=(ax)²=36，一般不等于 aT[x]。 | [1.4 系统的定义、分类与性质](../content/signals/knowledge-base/ss-1-4.md) |
| square-homogeneity-v1 | 非线性系统 T[x]=x²。对某时刻 x=2，T[3x] 的值是多少？ | C · 36 | T[ax]=(ax)²=36，一般不等于 aT[x]。 | [1.4 系统的定义、分类与性质](../content/signals/knowledge-base/ss-1-4.md) |
| square-homogeneity-v2 | 非线性系统 T[x]=x²。对某时刻 x=4，T[2x] 的值是多少？ | D · 64 | T[ax]=(ax)²=64，一般不等于 aT[x]。 | [1.4 系统的定义、分类与性质](../content/signals/knowledge-base/ss-1-4.md) |
| delay-causality | y(t)=x(t−1)，在全实轴信号上，该系统是否因果、是否有记忆？ | A · 因果且有记忆 | 输出依赖过去输入，因此因果，但不是仅依赖当前输入。 | [1.4 系统的定义、分类与性质](../content/signals/knowledge-base/ss-1-4.md) |
| delay-causality-v1 | y(t)=x(t−2)，在全实轴信号上，该系统是否因果、是否有记忆？ | A · 因果且有记忆 | 输出依赖过去输入，因此因果，但不是仅依赖当前输入。 | [1.4 系统的定义、分类与性质](../content/signals/knowledge-base/ss-1-4.md) |
| delay-causality-v2 | y(t)=x(t−3)，在全实轴信号上，该系统是否因果、是否有记忆？ | A · 因果且有记忆 | 输出依赖过去输入，因此因果，但不是仅依赖当前输入。 | [1.4 系统的定义、分类与性质](../content/signals/knowledge-base/ss-1-4.md) |
| advance-causality | y(t)=x(t+1)，其因果性如何？ | B · 非因果，需要未来输入 | 时刻 t 的输出需要 t+1 的输入，即未来输入。 | [1.4 系统的定义、分类与性质](../content/signals/knowledge-base/ss-1-4.md) |
| advance-causality-v1 | y(t)=x(t+2)，其因果性如何？ | B · 非因果，需要未来输入 | 时刻 t 的输出需要 t+2 的输入，即未来输入。 | [1.4 系统的定义、分类与性质](../content/signals/knowledge-base/ss-1-4.md) |
| advance-causality-v2 | y(t)=x(t+3)，其因果性如何？ | B · 非因果，需要未来输入 | 时刻 t 的输出需要 t+3 的输入，即未来输入。 | [1.4 系统的定义、分类与性质](../content/signals/knowledge-base/ss-1-4.md) |
| time-varying-multiplier | y(t)=t^1x(t)，在全实轴上属于时不变系统吗？ | C · 否，显式时间系数使移位检验不成立 | 移位输入得到 t^n x(t−t0)，移位输出为 (t−t0)^n x(t−t0)，一般不相同。 | [1.4 系统的定义、分类与性质](../content/signals/knowledge-base/ss-1-4.md) |
| time-varying-multiplier-v1 | y(t)=t^2x(t)，在全实轴上属于时不变系统吗？ | C · 否，显式时间系数使移位检验不成立 | 移位输入得到 t^n x(t−t0)，移位输出为 (t−t0)^n x(t−t0)，一般不相同。 | [1.4 系统的定义、分类与性质](../content/signals/knowledge-base/ss-1-4.md) |
| time-varying-multiplier-v2 | y(t)=t^3x(t)，在全实轴上属于时不变系统吗？ | C · 否，显式时间系数使移位检验不成立 | 移位输入得到 t^n x(t−t0)，移位输出为 (t−t0)^n x(t−t0)，一般不相同。 | [1.4 系统的定义、分类与性质](../content/signals/knowledge-base/ss-1-4.md) |
| bounded-gain | y=3x 且 \|x(t)\|≤2，最紧的统一输出幅度上界是多少？ | B · 6 | \|y\|=3\|x\|≤6，常数输入取边界可达到。 | [1.4 系统的定义、分类与性质](../content/signals/knowledge-base/ss-1-4.md) |
| bounded-gain-v1 | y=4x 且 \|x(t)\|≤3，最紧的统一输出幅度上界是多少？ | C · 12 | \|y\|=4\|x\|≤12，常数输入取边界可达到。 | [1.4 系统的定义、分类与性质](../content/signals/knowledge-base/ss-1-4.md) |
| bounded-gain-v2 | y=2x 且 \|x(t)\|≤5，最紧的统一输出幅度上界是多少？ | D · 10 | \|y\|=2\|x\|≤10，常数输入取边界可达到。 | [1.4 系统的定义、分类与性质](../content/signals/knowledge-base/ss-1-4.md) |
| rc-time-units | RC y′+y=x，R=2 kΩ、C=100 μF，时间常数为多少秒？ | C · 0.2 s | τ=RC=2×10³×100×10⁻⁶=0.2 s。 | [4.10 零极点配置与一阶RC低通](../content/signals/knowledge-base/ss-5-10.md)；[1.5 系统的描述](../content/signals/knowledge-base/ss-1-5.md) |
| rc-time-units-v1 | RC y′+y=x，R=3 kΩ、C=200 μF，时间常数为多少秒？ | D · 0.6 s | τ=RC=3×10³×200×10⁻⁶=0.6 s。 | [4.10 零极点配置与一阶RC低通](../content/signals/knowledge-base/ss-5-10.md)；[1.5 系统的描述](../content/signals/knowledge-base/ss-1-5.md) |
| rc-time-units-v2 | RC y′+y=x，R=4 kΩ、C=50 μF，时间常数为多少秒？ | A · 0.2 s | τ=RC=4×10³×50×10⁻⁶=0.2 s。 | [4.10 零极点配置与一阶RC低通](../content/signals/knowledge-base/ss-5-10.md)；[1.5 系统的描述](../content/signals/knowledge-base/ss-1-5.md) |
| total-response | 线性系统某时刻零输入响应为 5，零状态响应为 -2，全响应是多少？ | D · 3 | 全响应是两部分之和：5+(-2)=3。 | [1.6 LTI系统分析方法概述](../content/signals/knowledge-base/ss-1-6.md) |
| total-response-v1 | 线性系统某时刻零输入响应为 7，零状态响应为 3，全响应是多少？ | A · 10 | 全响应是两部分之和：7+(3)=10。 | [1.6 LTI系统分析方法概述](../content/signals/knowledge-base/ss-1-6.md) |
| total-response-v2 | 线性系统某时刻零输入响应为 -2，零状态响应为 6，全响应是多少？ | B · 4 | 全响应是两部分之和：-2+(6)=4。 | [1.6 LTI系统分析方法概述](../content/signals/knowledge-base/ss-1-6.md) |
| ext-dc-sine-power-1 | 连续信号 x(t)=1+3cos(2t) 的平均功率是多少？ | A · 5.5 | 常数与余弦的交叉项平均为零，P=D²+A²/2。代入得 5.5。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-dc-sine-power-1-v1 | 连续信号 x(t)=2+4cos(3t) 的平均功率是多少？ | B · 12 | 常数与余弦的交叉项平均为零，P=D²+A²/2。代入得 12。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-dc-sine-power-1-v2 | 连续信号 x(t)=3+5cos(4t) 的平均功率是多少？ | C · 21.5 | 常数与余弦的交叉项平均为零，P=D²+A²/2。代入得 21.5。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-dc-sine-power-2 | 连续信号 x(t)=4+6cos(5t) 的平均功率是多少？ | D · 34 | 常数与余弦的交叉项平均为零，P=D²+A²/2。代入得 34。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-dc-sine-power-2-v1 | 连续信号 x(t)=5+7cos(6t) 的平均功率是多少？ | A · 49.5 | 常数与余弦的交叉项平均为零，P=D²+A²/2。代入得 49.5。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-dc-sine-power-2-v2 | 连续信号 x(t)=6+8cos(7t) 的平均功率是多少？ | B · 68 | 常数与余弦的交叉项平均为零，P=D²+A²/2。代入得 68。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-two-tone-power-1 | x(t)=2cos(2π·3t)+4sin(2π·6t)，平均功率是多少？ | B · 10 | 不同整数次谐波在共同周期内正交，P=(A²+B²)/2。代入得 10。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-two-tone-power-1-v1 | x(t)=3cos(2π·4t)+5sin(2π·8t)，平均功率是多少？ | C · 17 | 不同整数次谐波在共同周期内正交，P=(A²+B²)/2。代入得 17。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-two-tone-power-1-v2 | x(t)=4cos(2π·5t)+6sin(2π·10t)，平均功率是多少？ | D · 26 | 不同整数次谐波在共同周期内正交，P=(A²+B²)/2。代入得 26。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-two-tone-power-2 | x(t)=5cos(2π·6t)+7sin(2π·12t)，平均功率是多少？ | A · 37 | 不同整数次谐波在共同周期内正交，P=(A²+B²)/2。代入得 37。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-two-tone-power-2-v1 | x(t)=6cos(2π·7t)+8sin(2π·14t)，平均功率是多少？ | B · 50 | 不同整数次谐波在共同周期内正交，P=(A²+B²)/2。代入得 50。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-two-tone-power-2-v2 | x(t)=7cos(2π·8t)+9sin(2π·16t)，平均功率是多少？ | C · 65 | 不同整数次谐波在共同周期内正交，P=(A²+B²)/2。代入得 65。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-duty-power-1 | 周期矩形脉冲每周期前 1 s 为 2，其余为 0，周期 4 s。平均功率是多少？ | C · 1 | 周期功率是一个周期内的平方积分除以周期：P=A²τ/T。代入得 1。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-duty-power-1-v1 | 周期矩形脉冲每周期前 2 s 为 3，其余为 0，周期 7 s。平均功率是多少？（选最接近值。） | D · 2.571429 | 周期功率是一个周期内的平方积分除以周期：P=A²τ/T。代入得 2.571429。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-duty-power-1-v2 | 周期矩形脉冲每周期前 3 s 为 4，其余为 0，周期 10 s。平均功率是多少？ | A · 4.8 | 周期功率是一个周期内的平方积分除以周期：P=A²τ/T。代入得 4.8。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-duty-power-2 | 周期矩形脉冲每周期前 4 s 为 5，其余为 0，周期 13 s。平均功率是多少？（选最接近值。） | B · 7.692308 | 周期功率是一个周期内的平方积分除以周期：P=A²τ/T。代入得 7.692308。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-duty-power-2-v1 | 周期矩形脉冲每周期前 5 s 为 6，其余为 0，周期 16 s。平均功率是多少？ | C · 11.25 | 周期功率是一个周期内的平方积分除以周期：P=A²τ/T。代入得 11.25。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-duty-power-2-v2 | 周期矩形脉冲每周期前 6 s 为 7，其余为 0，周期 19 s。平均功率是多少？（选最接近值。） | D · 15.473684 | 周期功率是一个周期内的平方积分除以周期：P=A²τ/T。代入得 15.473684。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-pulse-amplitude-1 | 单个矩形脉冲宽 3 s、总能量 12，幅度 A>0。A 是多少？ | D · 2 | E=A²T，取正幅度 A=√(E/T)。代入得 2。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-pulse-amplitude-1-v1 | 单个矩形脉冲宽 4 s、总能量 36，幅度 A>0。A 是多少？ | A · 3 | E=A²T，取正幅度 A=√(E/T)。代入得 3。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-pulse-amplitude-1-v2 | 单个矩形脉冲宽 5 s、总能量 80，幅度 A>0。A 是多少？ | B · 4 | E=A²T，取正幅度 A=√(E/T)。代入得 4。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-pulse-amplitude-2 | 单个矩形脉冲宽 6 s、总能量 150，幅度 A>0。A 是多少？ | C · 5 | E=A²T，取正幅度 A=√(E/T)。代入得 5。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-pulse-amplitude-2-v1 | 单个矩形脉冲宽 7 s、总能量 252，幅度 A>0。A 是多少？ | D · 6 | E=A²T，取正幅度 A=√(E/T)。代入得 6。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-pulse-amplitude-2-v2 | 单个矩形脉冲宽 8 s、总能量 392，幅度 A>0。A 是多少？ | A · 7 | E=A²T，取正幅度 A=√(E/T)。代入得 7。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-triangle-energy-1 | x(t)=2(1−\|t\|/3)（\|t\|≤3），其余为零。总能量是多少？ | A · 8 | 利用偶对称，E=2A²∫₀ᵀ(1−t/T)²dt=2A²T/3。代入得 8。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-triangle-energy-1-v1 | x(t)=3(1−\|t\|/4)（\|t\|≤4），其余为零。总能量是多少？ | B · 24 | 利用偶对称，E=2A²∫₀ᵀ(1−t/T)²dt=2A²T/3。代入得 24。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-triangle-energy-1-v2 | x(t)=4(1−\|t\|/5)（\|t\|≤5），其余为零。总能量是多少？（选最接近值。） | C · 53.333333 | 利用偶对称，E=2A²∫₀ᵀ(1−t/T)²dt=2A²T/3。代入得 53.333333。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-triangle-energy-2 | x(t)=5(1−\|t\|/6)（\|t\|≤6），其余为零。总能量是多少？ | D · 100 | 利用偶对称，E=2A²∫₀ᵀ(1−t/T)²dt=2A²T/3。代入得 100。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-triangle-energy-2-v1 | x(t)=6(1−\|t\|/7)（\|t\|≤7），其余为零。总能量是多少？ | A · 168 | 利用偶对称，E=2A²∫₀ᵀ(1−t/T)²dt=2A²T/3。代入得 168。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-triangle-energy-2-v2 | x(t)=7(1−\|t\|/8)（\|t\|≤8），其余为零。总能量是多少？（选最接近值。） | B · 261.333333 | 利用偶对称，E=2A²∫₀ᵀ(1−t/T)²dt=2A²T/3。代入得 261.333333。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-ramp-energy-1 | x(t)=2t（0≤t≤3），区间外为零。总能量是多少？ | B · 36 | 能量积分的是幅度平方：E=∫₀ᵀk²t²dt=k²T³/3。代入得 36。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-ramp-energy-1-v1 | x(t)=3t（0≤t≤4），区间外为零。总能量是多少？ | C · 192 | 能量积分的是幅度平方：E=∫₀ᵀk²t²dt=k²T³/3。代入得 192。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-ramp-energy-1-v2 | x(t)=4t（0≤t≤5），区间外为零。总能量是多少？（选最接近值。） | D · 666.666667 | 能量积分的是幅度平方：E=∫₀ᵀk²t²dt=k²T³/3。代入得 666.666667。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-ramp-energy-2 | x(t)=5t（0≤t≤6），区间外为零。总能量是多少？ | A · 1800 | 能量积分的是幅度平方：E=∫₀ᵀk²t²dt=k²T³/3。代入得 1800。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-ramp-energy-2-v1 | x(t)=6t（0≤t≤7），区间外为零。总能量是多少？ | B · 4116 | 能量积分的是幅度平方：E=∫₀ᵀk²t²dt=k²T³/3。代入得 4116。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-ramp-energy-2-v2 | x(t)=7t（0≤t≤8），区间外为零。总能量是多少？（选最接近值。） | C · 8362.666667 | 能量积分的是幅度平方：E=∫₀ᵀk²t²dt=k²T³/3。代入得 8362.666667。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-bilateral-exp-energy-1 | 双边信号 x(t)=2e^(−3\|t\|) 的总能量是多少？（选最接近值。） | C · 1.333333 | 正负时间各贡献 A²/(2a)，故 E=A²/a。代入得 1.333333。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-bilateral-exp-energy-1-v1 | 双边信号 x(t)=3e^(−4\|t\|) 的总能量是多少？ | D · 2.25 | 正负时间各贡献 A²/(2a)，故 E=A²/a。代入得 2.25。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-bilateral-exp-energy-1-v2 | 双边信号 x(t)=4e^(−5\|t\|) 的总能量是多少？ | A · 3.2 | 正负时间各贡献 A²/(2a)，故 E=A²/a。代入得 3.2。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-bilateral-exp-energy-2 | 双边信号 x(t)=5e^(−6\|t\|) 的总能量是多少？（选最接近值。） | B · 4.166667 | 正负时间各贡献 A²/(2a)，故 E=A²/a。代入得 4.166667。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-bilateral-exp-energy-2-v1 | 双边信号 x(t)=6e^(−7\|t\|) 的总能量是多少？（选最接近值。） | C · 5.142857 | 正负时间各贡献 A²/(2a)，故 E=A²/a。代入得 5.142857。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-bilateral-exp-energy-2-v2 | 双边信号 x(t)=7e^(−8\|t\|) 的总能量是多少？ | D · 6.125 | 正负时间各贡献 A²/(2a)，故 E=A²/a。代入得 6.125。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-geometric-energy-1 | 离散信号 x[n]=2·(0.2)^n u[n]（u[n]=1 当 n≥0），能量 Σ\|x[n]\|² 是多少？（选最接近值。） | D · 4.166667 | 平方后公比为 r²，等比求和 E=A²/(1−r²)。代入得 4.166667。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-geometric-energy-1-v1 | 离散信号 x[n]=3·(0.25)^n u[n]（u[n]=1 当 n≥0），能量 Σ\|x[n]\|² 是多少？ | A · 9.6 | 平方后公比为 r²，等比求和 E=A²/(1−r²)。代入得 9.6。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-geometric-energy-1-v2 | 离散信号 x[n]=4·(0.4)^n u[n]（u[n]=1 当 n≥0），能量 Σ\|x[n]\|² 是多少？（选最接近值。） | B · 19.047619 | 平方后公比为 r²，等比求和 E=A²/(1−r²)。代入得 19.047619。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-geometric-energy-2 | 离散信号 x[n]=5·(0.5)^n u[n]（u[n]=1 当 n≥0），能量 Σ\|x[n]\|² 是多少？（选最接近值。） | C · 33.333333 | 平方后公比为 r²，等比求和 E=A²/(1−r²)。代入得 33.333333。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-geometric-energy-2-v1 | 离散信号 x[n]=6·(0.6)^n u[n]（u[n]=1 当 n≥0），能量 Σ\|x[n]\|² 是多少？ | D · 56.25 | 平方后公比为 r²，等比求和 E=A²/(1−r²)。代入得 56.25。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-geometric-energy-2-v2 | 离散信号 x[n]=7·(0.75)^n u[n]（u[n]=1 当 n≥0），能量 Σ\|x[n]\|² 是多少？ | A · 112 | 平方后公比为 r²，等比求和 E=A²/(1−r²)。代入得 112。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-finite-sequence-energy-1 | 离散信号仅三个非零样本，值为 1、-2、3。总能量是多少？ | A · 14 | 离散能量为各样本绝对值平方之和，不是样本和的平方。代入得 14。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-finite-sequence-energy-1-v1 | 离散信号仅三个非零样本，值为 2、-3、4。总能量是多少？ | B · 29 | 离散能量为各样本绝对值平方之和，不是样本和的平方。代入得 29。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-finite-sequence-energy-1-v2 | 离散信号仅三个非零样本，值为 3、-4、5。总能量是多少？ | C · 50 | 离散能量为各样本绝对值平方之和，不是样本和的平方。代入得 50。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-finite-sequence-energy-2 | 离散信号仅三个非零样本，值为 4、-5、6。总能量是多少？ | D · 77 | 离散能量为各样本绝对值平方之和，不是样本和的平方。代入得 77。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-finite-sequence-energy-2-v1 | 离散信号仅三个非零样本，值为 5、-6、7。总能量是多少？ | A · 110 | 离散能量为各样本绝对值平方之和，不是样本和的平方。代入得 110。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-finite-sequence-energy-2-v2 | 离散信号仅三个非零样本，值为 6、-7、8。总能量是多少？ | B · 149 | 离散能量为各样本绝对值平方之和，不是样本和的平方。代入得 149。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-even-component-1 | 已知 x(1)=5、x(−1)=-2，偶分量 xₑ(1) 是多少？ | B · 1.5 | 偶分量定义为 xₑ(t)=[x(t)+x(−t)]/2。代入得 1.5。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| ext-even-component-1-v1 | 已知 x(2)=7、x(−2)=-3，偶分量 xₑ(2) 是多少？ | C · 2 | 偶分量定义为 xₑ(t)=[x(t)+x(−t)]/2。代入得 2。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| ext-even-component-1-v2 | 已知 x(3)=9、x(−3)=-4，偶分量 xₑ(3) 是多少？ | D · 2.5 | 偶分量定义为 xₑ(t)=[x(t)+x(−t)]/2。代入得 2.5。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| ext-even-component-2 | 已知 x(4)=11、x(−4)=-5，偶分量 xₑ(4) 是多少？ | A · 3 | 偶分量定义为 xₑ(t)=[x(t)+x(−t)]/2。代入得 3。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| ext-even-component-2-v1 | 已知 x(5)=13、x(−5)=-6，偶分量 xₑ(5) 是多少？ | B · 3.5 | 偶分量定义为 xₑ(t)=[x(t)+x(−t)]/2。代入得 3.5。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| ext-even-component-2-v2 | 已知 x(6)=15、x(−6)=-7，偶分量 xₑ(6) 是多少？ | C · 4 | 偶分量定义为 xₑ(t)=[x(t)+x(−t)]/2。代入得 4。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| ext-odd-component-1 | 已知 x(2)=5、x(−2)=-1，奇分量 xₒ(2) 是多少？ | C · 3 | 奇分量定义为 xₒ(t)=[x(t)−x(−t)]/2。代入得 3。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| ext-odd-component-1-v1 | 已知 x(3)=8、x(−3)=0，奇分量 xₒ(3) 是多少？ | D · 4 | 奇分量定义为 xₒ(t)=[x(t)−x(−t)]/2。代入得 4。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| ext-odd-component-1-v2 | 已知 x(4)=11、x(−4)=1，奇分量 xₒ(4) 是多少？ | A · 5 | 奇分量定义为 xₒ(t)=[x(t)−x(−t)]/2。代入得 5。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| ext-odd-component-2 | 已知 x(5)=14、x(−5)=2，奇分量 xₒ(5) 是多少？ | B · 6 | 奇分量定义为 xₒ(t)=[x(t)−x(−t)]/2。代入得 6。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| ext-odd-component-2-v1 | 已知 x(6)=17、x(−6)=3，奇分量 xₒ(6) 是多少？ | C · 7 | 奇分量定义为 xₒ(t)=[x(t)−x(−t)]/2。代入得 7。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| ext-odd-component-2-v2 | 已知 x(7)=20、x(−7)=4，奇分量 xₒ(7) 是多少？ | D · 8 | 奇分量定义为 xₒ(t)=[x(t)−x(−t)]/2。代入得 8。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| ext-reversed-support-1 | x(t) 的支撑为 [1,5] s，y(t)=x(3−2t)。y 的支撑左端点是多少？ | D · -1 s | 解 L≤b−at≤R（a>0）得 (b−R)/a≤t≤(b−L)/a，反转后左右端点交换。代入得 -1 s。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| ext-reversed-support-1-v1 | x(t) 的支撑为 [2,6] s，y(t)=x(4−3t)。y 的支撑左端点是多少？（选最接近值。） | A · -0.666667 s | 解 L≤b−at≤R（a>0）得 (b−R)/a≤t≤(b−L)/a，反转后左右端点交换。代入得 -0.666667 s。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| ext-reversed-support-1-v2 | x(t) 的支撑为 [3,7] s，y(t)=x(5−4t)。y 的支撑左端点是多少？ | B · -0.5 s | 解 L≤b−at≤R（a>0）得 (b−R)/a≤t≤(b−L)/a，反转后左右端点交换。代入得 -0.5 s。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| ext-reversed-support-2 | x(t) 的支撑为 [4,8] s，y(t)=x(6−5t)。y 的支撑左端点是多少？ | C · -0.4 s | 解 L≤b−at≤R（a>0）得 (b−R)/a≤t≤(b−L)/a，反转后左右端点交换。代入得 -0.4 s。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| ext-reversed-support-2-v1 | x(t) 的支撑为 [5,9] s，y(t)=x(7−6t)。y 的支撑左端点是多少？（选最接近值。） | D · -0.333333 s | 解 L≤b−at≤R（a>0）得 (b−R)/a≤t≤(b−L)/a，反转后左右端点交换。代入得 -0.333333 s。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| ext-reversed-support-2-v2 | x(t) 的支撑为 [6,10] s，y(t)=x(8−7t)。y 的支撑左端点是多少？（选最接近值。） | A · -0.285714 s | 解 L≤b−at≤R（a>0）得 (b−R)/a≤t≤(b−L)/a，反转后左右端点交换。代入得 -0.285714 s。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| ext-scaled-signal-energy-1 | x(t) 能量为 3，y(t)=2x(−4t)。y(t) 的能量是多少？ | A · 3 | 幅度乘 k 使能量乘 k²，时间缩放使能量除以 \|a\|，反转不改变能量。代入得 3。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| ext-scaled-signal-energy-1-v1 | x(t) 能量为 4，y(t)=3x(−5t)。y(t) 的能量是多少？ | B · 7.2 | 幅度乘 k 使能量乘 k²，时间缩放使能量除以 \|a\|，反转不改变能量。代入得 7.2。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| ext-scaled-signal-energy-1-v2 | x(t) 能量为 5，y(t)=4x(−6t)。y(t) 的能量是多少？（选最接近值。） | C · 13.333333 | 幅度乘 k 使能量乘 k²，时间缩放使能量除以 \|a\|，反转不改变能量。代入得 13.333333。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| ext-scaled-signal-energy-2 | x(t) 能量为 6，y(t)=5x(−7t)。y(t) 的能量是多少？（选最接近值。） | D · 21.428571 | 幅度乘 k 使能量乘 k²，时间缩放使能量除以 \|a\|，反转不改变能量。代入得 21.428571。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| ext-scaled-signal-energy-2-v1 | x(t) 能量为 7，y(t)=6x(−8t)。y(t) 的能量是多少？ | A · 31.5 | 幅度乘 k 使能量乘 k²，时间缩放使能量除以 \|a\|，反转不改变能量。代入得 31.5。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| ext-scaled-signal-energy-2-v2 | x(t) 能量为 8，y(t)=7x(−9t)。y(t) 的能量是多少？（选最接近值。） | B · 43.555556 | 幅度乘 k 使能量乘 k²，时间缩放使能量除以 \|a\|，反转不改变能量。代入得 43.555556。 | [1.2 基本运算与波形变换](../content/signals/knowledge-base/ss-1-2.md) |
| ext-commensurate-period-1 | x(t)=cos(2π·2t)+cos(2π·3t)，基本周期是多少？ | B · 1 s | 两项非零，基本频率为两个整数频率的最大公约数，T₀=1/gcd(f₁,f₂)。代入得 1 s。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-commensurate-period-1-v1 | x(t)=cos(2π·4t)+cos(2π·6t)，基本周期是多少？ | C · 0.5 s | 两项非零，基本频率为两个整数频率的最大公约数，T₀=1/gcd(f₁,f₂)。代入得 0.5 s。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-commensurate-period-1-v2 | x(t)=cos(2π·6t)+cos(2π·9t)，基本周期是多少？（选最接近值。） | D · 0.333333 s | 两项非零，基本频率为两个整数频率的最大公约数，T₀=1/gcd(f₁,f₂)。代入得 0.333333 s。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-commensurate-period-2 | x(t)=cos(2π·8t)+cos(2π·12t)，基本周期是多少？ | A · 0.25 s | 两项非零，基本频率为两个整数频率的最大公约数，T₀=1/gcd(f₁,f₂)。代入得 0.25 s。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-commensurate-period-2-v1 | x(t)=cos(2π·10t)+cos(2π·15t)，基本周期是多少？ | B · 0.2 s | 两项非零，基本频率为两个整数频率的最大公约数，T₀=1/gcd(f₁,f₂)。代入得 0.2 s。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-commensurate-period-2-v2 | x(t)=cos(2π·12t)+cos(2π·18t)，基本周期是多少？（选最接近值。） | C · 0.166667 s | 两项非零，基本频率为两个整数频率的最大公约数，T₀=1/gcd(f₁,f₂)。代入得 0.166667 s。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-discrete-period-1 | x[n]=cos(2π·2n/5)，最小正整数周期 N 是多少？ | C · 5 | 周期须满足 pN/q 为整数，故 N=q/gcd(p,q)；本题分子分母互质。代入得 5。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-discrete-period-1-v1 | x[n]=cos(2π·3n/8)，最小正整数周期 N 是多少？ | D · 8 | 周期须满足 pN/q 为整数，故 N=q/gcd(p,q)；本题分子分母互质。代入得 8。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-discrete-period-1-v2 | x[n]=cos(2π·4n/9)，最小正整数周期 N 是多少？ | A · 9 | 周期须满足 pN/q 为整数，故 N=q/gcd(p,q)；本题分子分母互质。代入得 9。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-discrete-period-2 | x[n]=cos(2π·5n/12)，最小正整数周期 N 是多少？ | B · 12 | 周期须满足 pN/q 为整数，故 N=q/gcd(p,q)；本题分子分母互质。代入得 12。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-discrete-period-2-v1 | x[n]=cos(2π·5n/16)，最小正整数周期 N 是多少？ | C · 16 | 周期须满足 pN/q 为整数，故 N=q/gcd(p,q)；本题分子分母互质。代入得 16。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-discrete-period-2-v2 | x[n]=cos(2π·7n/18)，最小正整数周期 N 是多少？ | D · 18 | 周期须满足 pN/q 为整数，故 N=q/gcd(p,q)；本题分子分母互质。代入得 18。 | [1.1 信号的分类与基本量](../content/signals/knowledge-base/ss-1-1.md) |
| ext-affine-impulse-area-1 | 积分 ∫₋∞∞ 4δ(-2t−1)dt 等于多少？ | D · 2 | δ(at−b) 的面积为 1/\|a\|，平移不改变面积，外部系数仍需乘入。代入得 2。 | [1.3 阶跃函数与冲激函数](../content/signals/knowledge-base/ss-1-3.md) |
| ext-affine-impulse-area-1-v1 | 积分 ∫₋∞∞ 5δ(-3t−2)dt 等于多少？（选最接近值。） | A · 1.666667 | δ(at−b) 的面积为 1/\|a\|，平移不改变面积，外部系数仍需乘入。代入得 1.666667。 | [1.3 阶跃函数与冲激函数](../content/signals/knowledge-base/ss-1-3.md) |
| ext-affine-impulse-area-1-v2 | 积分 ∫₋∞∞ 6δ(-4t−3)dt 等于多少？ | B · 1.5 | δ(at−b) 的面积为 1/\|a\|，平移不改变面积，外部系数仍需乘入。代入得 1.5。 | [1.3 阶跃函数与冲激函数](../content/signals/knowledge-base/ss-1-3.md) |
| ext-affine-impulse-area-2 | 积分 ∫₋∞∞ 7δ(-5t−4)dt 等于多少？ | C · 1.4 | δ(at−b) 的面积为 1/\|a\|，平移不改变面积，外部系数仍需乘入。代入得 1.4。 | [1.3 阶跃函数与冲激函数](../content/signals/knowledge-base/ss-1-3.md) |
| ext-affine-impulse-area-2-v1 | 积分 ∫₋∞∞ 8δ(-6t−5)dt 等于多少？（选最接近值。） | D · 1.333333 | δ(at−b) 的面积为 1/\|a\|，平移不改变面积，外部系数仍需乘入。代入得 1.333333。 | [1.3 阶跃函数与冲激函数](../content/signals/knowledge-base/ss-1-3.md) |
| ext-affine-impulse-area-2-v2 | 积分 ∫₋∞∞ 9δ(-7t−6)dt 等于多少？（选最接近值。） | A · 1.285714 | δ(at−b) 的面积为 1/\|a\|，平移不改变面积，外部系数仍需乘入。代入得 1.285714。 | [1.3 阶跃函数与冲激函数](../content/signals/knowledge-base/ss-1-3.md) |
| ext-affine-impulse-sift-1 | 积分 ∫₋∞∞ (3t+1)δ(2t−4)dt 等于多少？ | A · 3.5 | 冲激位于 t=b/a，还要乘尺度权重 1/\|a\|，结果为 (cb/a+d)/\|a\|。代入得 3.5。 | [1.3 阶跃函数与冲激函数](../content/signals/knowledge-base/ss-1-3.md) |
| ext-affine-impulse-sift-1-v1 | 积分 ∫₋∞∞ (4t+2)δ(3t−6)dt 等于多少？（选最接近值。） | B · 3.333333 | 冲激位于 t=b/a，还要乘尺度权重 1/\|a\|，结果为 (cb/a+d)/\|a\|。代入得 3.333333。 | [1.3 阶跃函数与冲激函数](../content/signals/knowledge-base/ss-1-3.md) |
| ext-affine-impulse-sift-1-v2 | 积分 ∫₋∞∞ (5t+3)δ(4t−8)dt 等于多少？ | C · 3.25 | 冲激位于 t=b/a，还要乘尺度权重 1/\|a\|，结果为 (cb/a+d)/\|a\|。代入得 3.25。 | [1.3 阶跃函数与冲激函数](../content/signals/knowledge-base/ss-1-3.md) |
| ext-affine-impulse-sift-2 | 积分 ∫₋∞∞ (6t+4)δ(5t−10)dt 等于多少？ | D · 3.2 | 冲激位于 t=b/a，还要乘尺度权重 1/\|a\|，结果为 (cb/a+d)/\|a\|。代入得 3.2。 | [1.3 阶跃函数与冲激函数](../content/signals/knowledge-base/ss-1-3.md) |
| ext-affine-impulse-sift-2-v1 | 积分 ∫₋∞∞ (7t+5)δ(6t−12)dt 等于多少？（选最接近值。） | A · 3.166667 | 冲激位于 t=b/a，还要乘尺度权重 1/\|a\|，结果为 (cb/a+d)/\|a\|。代入得 3.166667。 | [1.3 阶跃函数与冲激函数](../content/signals/knowledge-base/ss-1-3.md) |
| ext-affine-impulse-sift-2-v2 | 积分 ∫₋∞∞ (8t+6)δ(7t−14)dt 等于多少？（选最接近值。） | B · 3.142857 | 冲激位于 t=b/a，还要乘尺度权重 1/\|a\|，结果为 (cb/a+d)/\|a\|。代入得 3.142857。 | [1.3 阶跃函数与冲激函数](../content/signals/knowledge-base/ss-1-3.md) |
| ext-step-window-area-1 | x(t)=2[u(t−1)−u(t−5)]，全时间积分（面积）是多少？ | B · 8 | 两个阶跃之差形成宽 R−L、高 A 的矩形，面积为 A(R−L)。代入得 8。 | [1.3 阶跃函数与冲激函数](../content/signals/knowledge-base/ss-1-3.md) |
| ext-step-window-area-1-v1 | x(t)=3[u(t−2)−u(t−8)]，全时间积分（面积）是多少？ | C · 18 | 两个阶跃之差形成宽 R−L、高 A 的矩形，面积为 A(R−L)。代入得 18。 | [1.3 阶跃函数与冲激函数](../content/signals/knowledge-base/ss-1-3.md) |
| ext-step-window-area-1-v2 | x(t)=4[u(t−3)−u(t−11)]，全时间积分（面积）是多少？ | D · 32 | 两个阶跃之差形成宽 R−L、高 A 的矩形，面积为 A(R−L)。代入得 32。 | [1.3 阶跃函数与冲激函数](../content/signals/knowledge-base/ss-1-3.md) |
| ext-step-window-area-2 | x(t)=5[u(t−4)−u(t−14)]，全时间积分（面积）是多少？ | A · 50 | 两个阶跃之差形成宽 R−L、高 A 的矩形，面积为 A(R−L)。代入得 50。 | [1.3 阶跃函数与冲激函数](../content/signals/knowledge-base/ss-1-3.md) |
| ext-step-window-area-2-v1 | x(t)=6[u(t−5)−u(t−17)]，全时间积分（面积）是多少？ | B · 72 | 两个阶跃之差形成宽 R−L、高 A 的矩形，面积为 A(R−L)。代入得 72。 | [1.3 阶跃函数与冲激函数](../content/signals/knowledge-base/ss-1-3.md) |
| ext-step-window-area-2-v2 | x(t)=7[u(t−6)−u(t−20)]，全时间积分（面积）是多少？ | C · 98 | 两个阶跃之差形成宽 R−L、高 A 的矩形，面积为 A(R−L)。代入得 98。 | [1.3 阶跃函数与冲激函数](../content/signals/knowledge-base/ss-1-3.md) |
| ext-differentiator-amplitude-1 | 理想微分器 y(t)=dx(t)/dt，输入 x(t)=3sin(4t)。输出正弦分量的幅度是多少？ | C · 12 | 对正弦求导得 Aωcos(ωt)，幅度为 Aω；此结论只针对题给正弦输入。代入得 12。 | [1.4 系统的定义、分类与性质](../content/signals/knowledge-base/ss-1-4.md)；[3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-differentiator-amplitude-1-v1 | 理想微分器 y(t)=dx(t)/dt，输入 x(t)=4sin(5t)。输出正弦分量的幅度是多少？ | D · 20 | 对正弦求导得 Aωcos(ωt)，幅度为 Aω；此结论只针对题给正弦输入。代入得 20。 | [1.4 系统的定义、分类与性质](../content/signals/knowledge-base/ss-1-4.md)；[3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-differentiator-amplitude-1-v2 | 理想微分器 y(t)=dx(t)/dt，输入 x(t)=5sin(6t)。输出正弦分量的幅度是多少？ | A · 30 | 对正弦求导得 Aωcos(ωt)，幅度为 Aω；此结论只针对题给正弦输入。代入得 30。 | [1.4 系统的定义、分类与性质](../content/signals/knowledge-base/ss-1-4.md)；[3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-differentiator-amplitude-2 | 理想微分器 y(t)=dx(t)/dt，输入 x(t)=6sin(7t)。输出正弦分量的幅度是多少？ | B · 42 | 对正弦求导得 Aωcos(ωt)，幅度为 Aω；此结论只针对题给正弦输入。代入得 42。 | [1.4 系统的定义、分类与性质](../content/signals/knowledge-base/ss-1-4.md)；[3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-differentiator-amplitude-2-v1 | 理想微分器 y(t)=dx(t)/dt，输入 x(t)=7sin(8t)。输出正弦分量的幅度是多少？ | C · 56 | 对正弦求导得 Aωcos(ωt)，幅度为 Aω；此结论只针对题给正弦输入。代入得 56。 | [1.4 系统的定义、分类与性质](../content/signals/knowledge-base/ss-1-4.md)；[3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-differentiator-amplitude-2-v2 | 理想微分器 y(t)=dx(t)/dt，输入 x(t)=8sin(9t)。输出正弦分量的幅度是多少？ | D · 72 | 对正弦求导得 Aωcos(ωt)，幅度为 Aω；此结论只针对题给正弦输入。代入得 72。 | [1.4 系统的定义、分类与性质](../content/signals/knowledge-base/ss-1-4.md)；[3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-difference-equation-order-1 | 差分方程 y[k+1]+2y[k−2]=x[k] 中，输出序列最高与最低序号都具有非零系数。方程阶数是多少？ | D · 3 | 差分方程阶数是未知输出序列最高序号与最低序号之差。代入得 3。 | [1.5 系统的描述](../content/signals/knowledge-base/ss-1-5.md) |
| ext-difference-equation-order-1-v1 | 差分方程 y[k+2]+2y[k−3]=x[k] 中，输出序列最高与最低序号都具有非零系数。方程阶数是多少？ | A · 5 | 差分方程阶数是未知输出序列最高序号与最低序号之差。代入得 5。 | [1.5 系统的描述](../content/signals/knowledge-base/ss-1-5.md) |
| ext-difference-equation-order-1-v2 | 差分方程 y[k+3]+2y[k−4]=x[k] 中，输出序列最高与最低序号都具有非零系数。方程阶数是多少？ | B · 7 | 差分方程阶数是未知输出序列最高序号与最低序号之差。代入得 7。 | [1.5 系统的描述](../content/signals/knowledge-base/ss-1-5.md) |
| ext-difference-equation-order-2 | 差分方程 y[k+4]+2y[k−5]=x[k] 中，输出序列最高与最低序号都具有非零系数。方程阶数是多少？ | C · 9 | 差分方程阶数是未知输出序列最高序号与最低序号之差。代入得 9。 | [1.5 系统的描述](../content/signals/knowledge-base/ss-1-5.md) |
| ext-difference-equation-order-2-v1 | 差分方程 y[k+5]+2y[k−6]=x[k] 中，输出序列最高与最低序号都具有非零系数。方程阶数是多少？ | D · 11 | 差分方程阶数是未知输出序列最高序号与最低序号之差。代入得 11。 | [1.5 系统的描述](../content/signals/knowledge-base/ss-1-5.md) |
| ext-difference-equation-order-2-v2 | 差分方程 y[k+6]+2y[k−7]=x[k] 中，输出序列最高与最低序号都具有非零系数。方程阶数是多少？ | A · 13 | 差分方程阶数是未知输出序列最高序号与最低序号之差。代入得 13。 | [1.5 系统的描述](../content/signals/knowledge-base/ss-1-5.md) |

### 第2章

| ID | 题目 | 正确答案 | 解析 | 讲义依据 |
| --- | --- | --- | --- | --- |
| convolution-shift | 若 h(t) = δ(t − 2)，则 y(t) = x(t) * h(t) 等于？ | C · x(t − 2) | 与延迟冲激卷积会把输入整体右移 2：y(t) = x(t − 2)。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| convolution-shift-v1 | 已知 y(t)=x(t)∗h(t)，x(t−2)∗h(t) 等于什么？ | A · y(t−2) | 输入延迟 2，卷积输出同样延迟 2。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| convolution-shift-v2 | x(t−1)∗h(t−2) 相对于 y(t)=x(t)∗h(t) 如何变化？ | C · y(t−3) | 卷积的两个输入延迟相加：1+2=3。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| step-response | 标准一阶低通 H(s)=K/(1+τs)，K≠0、τ>0。零状态单位阶跃响应在 t=τ 达到终值的约多少？ | B · 63.2% | g(t)=K(1−e^(−t/τ))u(t)，归一化后 1−e^(−1)≈63.2%。 | [4.10 零极点配置与一阶RC低通](../content/signals/knowledge-base/ss-5-10.md) |
| step-response-v1 | 标准一阶低通 H(s)=K/(1+τs)，K≠0、τ>0，零状态阶跃激励。一阶系统在 t=3τ 时达到终值的约多少？ | C · 95.0% | 归一化响应 1−e^(−3)≈0.9502。 | [4.10 零极点配置与一阶RC低通](../content/signals/knowledge-base/ss-5-10.md) |
| step-response-v2 | 标准一阶低通 H(s)=K/(1+τs)，K≠0、τ>0，零状态阶跃激励。一阶系统在 t=5τ 时达到终值的约多少？ | D · 99.3% | 1−e^(−5)≈0.9933，有限时刻仍未精确到达终值。 | [4.10 零极点配置与一阶RC低通](../content/signals/knowledge-base/ss-5-10.md) |
| time-constant | 标准一阶低通 H(s)=K/(1+τs)，τ>0。保持 K 不变、增大 τ，−3 dB 截止频率如何变化？ | A · 降低 | ωc=1/τ，fc=1/(2πτ)，因此 τ 越大截止频率越低。 | [4.10 零极点配置与一阶RC低通](../content/signals/knowledge-base/ss-5-10.md) |
| time-constant-v1 | 标准一阶低通 H(s)=K/(1+τs)，K≠0、τ>0，零状态阶跃激励。保持增益不变，时间常数加倍，一阶响应会怎样？ | A · 达到相同比例所需时间加倍 | t=−τ ln(1−r)，达到固定比例 r 的时间与 τ 成正比。 | [4.10 零极点配置与一阶RC低通](../content/signals/knowledge-base/ss-5-10.md) |
| time-constant-v2 | 系统 H(s)=1/(s+4) 的时间常数是多少？ | B · 0.25 s | 极点为 −1/τ=−4，所以 τ=1/4 s。 | [4.10 零极点配置与一阶RC低通](../content/signals/knowledge-base/ss-5-10.md) |
| second-order-mode-decay | 非零自由响应对应特征根 −2±j3。0.25 s 后的振幅包络是初始包络的多少倍？（选最接近值。） | B · 0.606531 | 共轭根产生 e^(−2t)(Ccos3t+Dsin3t)，包络比 e^(−2×0.25)≈0.606531。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| second-order-mode-decay-v1 | 非零自由响应对应特征根 −4±j5。0.5 s 后的振幅包络是初始包络的多少倍？（选最接近值。） | A · 0.135335 | 共轭根产生 e^(−4t)(Ccos5t+Dsin5t)，包络比 e^(−4×0.5)≈0.135335。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| second-order-mode-decay-v2 | 非零自由响应对应特征根 −6±j7。0.75 s 后的振幅包络是初始包络的多少倍？（选最接近值。） | D · 0.011109 | 共轭根产生 e^(−6t)(Ccos7t+Dsin7t)，包络比 e^(−6×0.75)≈0.011109。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| decay-exponent | 齐次方程 y′+2y=0，解 y=Ce^(λt) 中 λ 是多少？ | A · -2 | 代入得 λ+2=0，所以 λ=−2。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| decay-exponent-v1 | 齐次方程 y′+3y=0，解 y=Ce^(λt) 中 λ 是多少？ | B · -3 | 代入得 λ+3=0，所以 λ=−3。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| decay-exponent-v2 | 齐次方程 y′+5y=0，解 y=Ce^(λt) 中 λ 是多少？ | C · -5 | 代入得 λ+5=0，所以 λ=−5。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| constant-forced-response | y′+2y=6，稳定稳态常值是多少？ | B · 3 | 稳态 y′=0，因此 y∞=6/2=3。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| constant-forced-response-v1 | y′+3y=12，稳定稳态常值是多少？ | C · 4 | 稳态 y′=0，因此 y∞=12/3=4。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| constant-forced-response-v2 | y′+4y=8，稳定稳态常值是多少？ | D · 2 | 稳态 y′=0，因此 y∞=8/4=2。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| impulse-state-jump | y′+2y=3δ(t)，y(0−)=1，求 y(0+)。 | C · 4 | 跨零积分得 Δy=3，所以 y(0+)=4。 | [2.2 初始状态与初始值（0⁻/0⁺）](../content/signals/knowledge-base/ss-2-2.md) |
| impulse-state-jump-v1 | y′+2y=4δ(t)，y(0−)=2，求 y(0+)。 | D · 6 | 跨零积分得 Δy=4，所以 y(0+)=6。 | [2.2 初始状态与初始值（0⁻/0⁺）](../content/signals/knowledge-base/ss-2-2.md) |
| impulse-state-jump-v2 | y′+2y=5δ(t)，y(0−)=-1，求 y(0+)。 | A · 4 | 跨零积分得 Δy=5，所以 y(0+)=4。 | [2.2 初始状态与初始值（0⁻/0⁺）](../content/signals/knowledge-base/ss-2-2.md) |
| second-order-jump | y″+3y′+2y=2δ(t)，y(0−) 有限，y′(0−)=1。求 y′(0+)。 | D · 3 | 无 δ′ 激励，y 连续；δ 系数匹配给出 Δy′=2，结果 3。 | [2.2 初始状态与初始值（0⁻/0⁺）](../content/signals/knowledge-base/ss-2-2.md) |
| second-order-jump-v1 | y″+3y′+2y=5δ(t)，y(0−) 有限，y′(0−)=-2。求 y′(0+)。 | A · 3 | 无 δ′ 激励，y 连续；δ 系数匹配给出 Δy′=5，结果 3。 | [2.2 初始状态与初始值（0⁻/0⁺）](../content/signals/knowledge-base/ss-2-2.md) |
| second-order-jump-v2 | y″+3y′+2y=4δ(t)，y(0−) 有限，y′(0−)=3。求 y′(0+)。 | B · 7 | 无 δ′ 激励，y 连续；δ 系数匹配给出 Δy′=4，结果 7。 | [2.2 初始状态与初始值（0⁻/0⁺）](../content/signals/knowledge-base/ss-2-2.md) |
| zero-input-initial | y′+2y=x，y(0−)=3。零输入响应 A e^(−2t) 在 t≥0 的系数 A 是多少？ | A · 3 | 输入置零，无冲激引起跳变，A=y(0+)=3。 | [2.3 零输入响应与零状态响应](../content/signals/knowledge-base/ss-2-3.md) |
| zero-input-initial-v1 | y′+2y=x，y(0−)=5。零输入响应 A e^(−2t) 在 t≥0 的系数 A 是多少？ | B · 5 | 输入置零，无冲激引起跳变，A=y(0+)=5。 | [2.3 零输入响应与零状态响应](../content/signals/knowledge-base/ss-2-3.md) |
| zero-input-initial-v2 | y′+2y=x，y(0−)=-2。零输入响应 A e^(−2t) 在 t≥0 的系数 A 是多少？ | C · -2 | 输入置零，无冲激引起跳变，A=y(0+)=-2。 | [2.3 零输入响应与零状态响应](../content/signals/knowledge-base/ss-2-3.md) |
| impulse-step-final | h(t)=4e^(−2t)u(t)，零状态单位阶跃响应终值是多少？ | B · 2 | g∞=∫₀∞h(t)dt=4/2=2。 | [2.4 冲激响应与阶跃响应](../content/signals/knowledge-base/ss-2-4.md) |
| impulse-step-final-v1 | h(t)=6e^(−3t)u(t)，零状态单位阶跃响应终值是多少？ | C · 2 | g∞=∫₀∞h(t)dt=6/3=2。 | [2.4 冲激响应与阶跃响应](../content/signals/knowledge-base/ss-2-4.md) |
| impulse-step-final-v2 | h(t)=8e^(−2t)u(t)，零状态单位阶跃响应终值是多少？ | D · 4 | g∞=∫₀∞h(t)dt=8/2=4。 | [2.4 冲激响应与阶跃响应](../content/signals/knowledge-base/ss-2-4.md) |
| step-impulse-coefficient | 零状态阶跃响应 g(t)=2(1−e^(−3t))u(t)，h(t)=A e^(−3t)u(t)，A 是多少？ | C · 6 | h=g′，且 g 在零点连续为0，无 δ 项；A=2×3=6。 | [2.4 冲激响应与阶跃响应](../content/signals/knowledge-base/ss-2-4.md) |
| step-impulse-coefficient-v1 | 零状态阶跃响应 g(t)=3(1−e^(−4t))u(t)，h(t)=A e^(−4t)u(t)，A 是多少？ | D · 12 | h=g′，且 g 在零点连续为0，无 δ 项；A=3×4=12。 | [2.4 冲激响应与阶跃响应](../content/signals/knowledge-base/ss-2-4.md) |
| step-impulse-coefficient-v2 | 零状态阶跃响应 g(t)=4(1−e^(−2t))u(t)，h(t)=A e^(−2t)u(t)，A 是多少？ | A · 8 | h=g′，且 g 在零点连续为0，无 δ 项；A=4×2=8。 | [2.4 冲激响应与阶跃响应](../content/signals/knowledge-base/ss-2-4.md) |
| impulse-convolution-gain | x(t)*[2δ(t−3)]=A x(t−3)，A 是多少？ | D · 2 | 延迟冲激负责平移，冲激权重保留为增益 2。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| impulse-convolution-gain-v1 | x(t)*[3δ(t−2)]=A x(t−2)，A 是多少？ | A · 3 | 延迟冲激负责平移，冲激权重保留为增益 3。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| impulse-convolution-gain-v2 | x(t)*[4δ(t−1)]=A x(t−1)，A 是多少？ | B · 4 | 延迟冲激负责平移，冲激权重保留为增益 4。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| rectangle-convolution-peak | 两幅度1的因果矩形宽度分别为 2 s、5 s，其卷积峰值是多少？ | A · 2 | 峰值等于最大重叠长度 min(2,5)=2。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| rectangle-convolution-peak-v1 | 两幅度1的因果矩形宽度分别为 3 s、6 s，其卷积峰值是多少？ | B · 3 | 峰值等于最大重叠长度 min(3,6)=3。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| rectangle-convolution-peak-v2 | 两幅度1的因果矩形宽度分别为 4 s、7 s，其卷积峰值是多少？ | C · 4 | 峰值等于最大重叠长度 min(4,7)=4。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| rectangle-convolution-width | 两单位幅度因果矩形支撑为 [0,2] 和 [0,3]，卷积的非零支撑闭包宽度是多少？ | B · 5 | 支撑端点相加，卷积支撑闭包为 [0,5]。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| rectangle-convolution-width-v1 | 两单位幅度因果矩形支撑为 [0,3] 和 [0,5]，卷积的非零支撑闭包宽度是多少？ | C · 8 | 支撑端点相加，卷积支撑闭包为 [0,8]。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| rectangle-convolution-width-v2 | 两单位幅度因果矩形支撑为 [0,4] 和 [0,6]，卷积的非零支撑闭包宽度是多少？ | D · 10 | 支撑端点相加，卷积支撑闭包为 [0,10]。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| equal-exponential-convolution | x=2e^(−1t)u(t)，h=3e^(−1t)u(t)。卷积为 A t e^(−1t)u(t)，A 是多少？ | C · 6 | 积分内指数合为 e^(−1t)，积分区间长 t，A=6。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| equal-exponential-convolution-v1 | x=3e^(−2t)u(t)，h=4e^(−2t)u(t)。卷积为 A t e^(−2t)u(t)，A 是多少？ | D · 12 | 积分内指数合为 e^(−2t)，积分区间长 t，A=12。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| equal-exponential-convolution-v2 | x=4e^(−3t)u(t)，h=2e^(−3t)u(t)。卷积为 A t e^(−3t)u(t)，A 是多少？ | A · 8 | 积分内指数合为 e^(−3t)，积分区间长 t，A=8。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| cascade-impulse-gain | 两 LTI 系统级联，h₁=2δ(t)、h₂=3δ(t)。总 h=Aδ(t)，A 是多少？ | D · 6 | 级联用卷积，δ*δ=δ，增益相乘得 6。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| cascade-impulse-gain-v1 | 两 LTI 系统级联，h₁=3δ(t)、h₂=4δ(t)。总 h=Aδ(t)，A 是多少？ | A · 12 | 级联用卷积，δ*δ=δ，增益相乘得 12。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| cascade-impulse-gain-v2 | 两 LTI 系统级联，h₁=4δ(t)、h₂=5δ(t)。总 h=Aδ(t)，A 是多少？ | B · 20 | 级联用卷积，δ*δ=δ，增益相乘得 20。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| parallel-impulse-gain | 两 LTI 支路并联，输入相同且输出相加，h₁=2δ(t)、h₂=3δ(t)。总冲激权重是多少？ | A · 5 | 并联冲激响应相加：h=(2+(3))δ(t)，权重为 5。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| parallel-impulse-gain-v1 | 两 LTI 支路并联，输入相同且输出相加，h₁=3δ(t)、h₂=-1δ(t)。总冲激权重是多少？ | B · 2 | 并联冲激响应相加：h=(3+(-1))δ(t)，权重为 2。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| parallel-impulse-gain-v2 | 两 LTI 支路并联，输入相同且输出相加，h₁=4δ(t)、h₂=5δ(t)。总冲激权重是多少？ | C · 9 | 并联冲激响应相加：h=(4+(5))δ(t)，权重为 9。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| autocorrelation-zero | 实矩形信号在 [0,3] 幅度为 2，定义 Rxx(τ)=∫x(t)x(t−τ)dt，Rxx(0) 是多少？ | B · 12 | 零延迟自相关等于能量：2²×3=12。 | [2.7 相关函数](../content/signals/knowledge-base/ss-2-7.md) |
| autocorrelation-zero-v1 | 实矩形信号在 [0,2] 幅度为 3，定义 Rxx(τ)=∫x(t)x(t−τ)dt，Rxx(0) 是多少？ | C · 18 | 零延迟自相关等于能量：3²×2=18。 | [2.7 相关函数](../content/signals/knowledge-base/ss-2-7.md) |
| autocorrelation-zero-v2 | 实矩形信号在 [0,1] 幅度为 4，定义 Rxx(τ)=∫x(t)x(t−τ)dt，Rxx(0) 是多少？ | D · 16 | 零延迟自相关等于能量：4²×1=16。 | [2.7 相关函数](../content/signals/knowledge-base/ss-2-7.md) |
| autocorrelation-overlap | x(t) 为 [0,4] 上幅度1矩形。Rxx(τ)=∫x(t)x(t−τ)dt，求 Rxx(1)。 | C · 3 | 重叠长度为 4−1=3，即相关值。 | [2.7 相关函数](../content/signals/knowledge-base/ss-2-7.md) |
| autocorrelation-overlap-v1 | x(t) 为 [0,5] 上幅度1矩形。Rxx(τ)=∫x(t)x(t−τ)dt，求 Rxx(2)。 | D · 3 | 重叠长度为 5−2=3，即相关值。 | [2.7 相关函数](../content/signals/knowledge-base/ss-2-7.md) |
| autocorrelation-overlap-v2 | x(t) 为 [0,6] 上幅度1矩形。Rxx(τ)=∫x(t)x(t−τ)dt，求 Rxx(4)。 | A · 2 | 重叠长度为 6−4=2，即相关值。 | [2.7 相关函数](../content/signals/knowledge-base/ss-2-7.md) |
| continuous-convolution-step | 连续卷积的黎曼和近似中，离散 conv 结果某点为 120，dt=0.01 s。积分近似值是多少？ | D · 1.2 | 离散求和需乘积分步长：120×0.01=1.2。 | [2.5 卷积积分](../content/signals/knowledge-base/ss-2-5.md)；[A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| continuous-convolution-step-v1 | 连续卷积的黎曼和近似中，离散 conv 结果某点为 80，dt=0.02 s。积分近似值是多少？ | A · 1.6 | 离散求和需乘积分步长：80×0.02=1.6。 | [2.5 卷积积分](../content/signals/knowledge-base/ss-2-5.md)；[A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| continuous-convolution-step-v2 | 连续卷积的黎曼和近似中，离散 conv 结果某点为 50，dt=0.04 s。积分近似值是多少？ | B · 2 | 离散求和需乘积分步长：50×0.04=2。 | [2.5 卷积积分](../content/signals/knowledge-base/ss-2-5.md)；[A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| ext-unequal-exponential-convolution-1 | x(t)=e^(−1t)u(t)，h(t)=e^(−2t)u(t)。卷积 (x*h)(0.2) 是多少？（选最接近值。） | A · 0.148411 | 对 0≤τ≤t 积分，(x*h)(t)=[e^(−at)−e^(−bt)]/(b−a)，a≠b。代入得 0.148411。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-unequal-exponential-convolution-1-v1 | x(t)=e^(−2t)u(t)，h(t)=e^(−3t)u(t)。卷积 (x*h)(0.4) 是多少？（选最接近值。） | B · 0.148135 | 对 0≤τ≤t 积分，(x*h)(t)=[e^(−at)−e^(−bt)]/(b−a)，a≠b。代入得 0.148135。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-unequal-exponential-convolution-1-v2 | x(t)=e^(−3t)u(t)，h(t)=e^(−4t)u(t)。卷积 (x*h)(0.6) 是多少？（选最接近值。） | C · 0.074581 | 对 0≤τ≤t 积分，(x*h)(t)=[e^(−at)−e^(−bt)]/(b−a)，a≠b。代入得 0.074581。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-unequal-exponential-convolution-2 | x(t)=e^(−4t)u(t)，h(t)=e^(−5t)u(t)。卷积 (x*h)(0.8) 是多少？（选最接近值。） | D · 0.022447 | 对 0≤τ≤t 积分，(x*h)(t)=[e^(−at)−e^(−bt)]/(b−a)，a≠b。代入得 0.022447。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-unequal-exponential-convolution-2-v1 | x(t)=e^(−5t)u(t)，h(t)=e^(−6t)u(t)。卷积 (x*h)(1) 是多少？（选最接近值。） | A · 0.004259 | 对 0≤τ≤t 积分，(x*h)(t)=[e^(−at)−e^(−bt)]/(b−a)，a≠b。代入得 0.004259。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-unequal-exponential-convolution-2-v2 | x(t)=e^(−6t)u(t)，h(t)=e^(−7t)u(t)。卷积 (x*h)(1.2) 是多少？（选最接近值。） | B · 0.000522 | 对 0≤τ≤t 积分，(x*h)(t)=[e^(−at)−e^(−bt)]/(b−a)，a≠b。代入得 0.000522。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-first-order-step-sample-1 | 因果 LTI 系统 h(t)=2e^(−1t)u(t)，零初始状态下输入 u(t)。y(0.2) 是多少？（选最接近值。） | B · 0.362538 | 阶跃响应是 h 的积分，y(t)=(K/a)[1−e^(−at)]（t≥0）。代入得 0.362538。 | [2.4 冲激响应与阶跃响应](../content/signals/knowledge-base/ss-2-4.md) |
| ext-first-order-step-sample-1-v1 | 因果 LTI 系统 h(t)=3e^(−2t)u(t)，零初始状态下输入 u(t)。y(0.3) 是多少？（选最接近值。） | C · 0.676783 | 阶跃响应是 h 的积分，y(t)=(K/a)[1−e^(−at)]（t≥0）。代入得 0.676783。 | [2.4 冲激响应与阶跃响应](../content/signals/knowledge-base/ss-2-4.md) |
| ext-first-order-step-sample-1-v2 | 因果 LTI 系统 h(t)=4e^(−3t)u(t)，零初始状态下输入 u(t)。y(0.4) 是多少？（选最接近值。） | D · 0.931741 | 阶跃响应是 h 的积分，y(t)=(K/a)[1−e^(−at)]（t≥0）。代入得 0.931741。 | [2.4 冲激响应与阶跃响应](../content/signals/knowledge-base/ss-2-4.md) |
| ext-first-order-step-sample-2 | 因果 LTI 系统 h(t)=5e^(−4t)u(t)，零初始状态下输入 u(t)。y(0.5) 是多少？（选最接近值。） | A · 1.080831 | 阶跃响应是 h 的积分，y(t)=(K/a)[1−e^(−at)]（t≥0）。代入得 1.080831。 | [2.4 冲激响应与阶跃响应](../content/signals/knowledge-base/ss-2-4.md) |
| ext-first-order-step-sample-2-v1 | 因果 LTI 系统 h(t)=6e^(−5t)u(t)，零初始状态下输入 u(t)。y(0.6) 是多少？（选最接近值。） | B · 1.140256 | 阶跃响应是 h 的积分，y(t)=(K/a)[1−e^(−at)]（t≥0）。代入得 1.140256。 | [2.4 冲激响应与阶跃响应](../content/signals/knowledge-base/ss-2-4.md) |
| ext-first-order-step-sample-2-v2 | 因果 LTI 系统 h(t)=7e^(−6t)u(t)，零初始状态下输入 u(t)。y(0.7) 是多少？（选最接近值。） | C · 1.149172 | 阶跃响应是 h 的积分，y(t)=(K/a)[1−e^(−at)]（t≥0）。代入得 1.149172。 | [2.4 冲激响应与阶跃响应](../content/signals/knowledge-base/ss-2-4.md) |
| ext-natural-response-sample-1 | t≥0 时 y′+2y=0，y(0⁺)=3。y(0.1) 是多少？（选最接近值。） | C · 2.456192 | 一阶齐次方程的解为 y(t)=y(0⁺)e^(−at)，由初值确定系数。代入得 2.456192。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-natural-response-sample-1-v1 | t≥0 时 y′+3y=0，y(0⁺)=4。y(0.2) 是多少？（选最接近值。） | D · 2.195247 | 一阶齐次方程的解为 y(t)=y(0⁺)e^(−at)，由初值确定系数。代入得 2.195247。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-natural-response-sample-1-v2 | t≥0 时 y′+4y=0，y(0⁺)=5。y(0.3) 是多少？（选最接近值。） | A · 1.505971 | 一阶齐次方程的解为 y(t)=y(0⁺)e^(−at)，由初值确定系数。代入得 1.505971。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-natural-response-sample-2 | t≥0 时 y′+5y=0，y(0⁺)=6。y(0.4) 是多少？（选最接近值。） | B · 0.812012 | 一阶齐次方程的解为 y(t)=y(0⁺)e^(−at)，由初值确定系数。代入得 0.812012。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-natural-response-sample-2-v1 | t≥0 时 y′+6y=0，y(0⁺)=7。y(0.5) 是多少？（选最接近值。） | C · 0.348509 | 一阶齐次方程的解为 y(t)=y(0⁺)e^(−at)，由初值确定系数。代入得 0.348509。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-natural-response-sample-2-v2 | t≥0 时 y′+7y=0，y(0⁺)=8。y(0.6) 是多少？（选最接近值。） | D · 0.119965 | 一阶齐次方程的解为 y(t)=y(0⁺)e^(−at)，由初值确定系数。代入得 0.119965。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-total-response-sample-1 | t≥0 时 y′+2y=3，y(0⁺)=4。全响应 y(0.1) 是多少？（选最接近值。） | D · 3.546827 | 全响应为稳态值加暂态：y(t)=B/a+[y(0⁺)−B/a]e^(−at)。代入得 3.546827。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-total-response-sample-1-v1 | t≥0 时 y′+3y=5，y(0⁺)=5。全响应 y(0.2) 是多少？（选最接近值。） | A · 3.496039 | 全响应为稳态值加暂态：y(t)=B/a+[y(0⁺)−B/a]e^(−at)。代入得 3.496039。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-total-response-sample-1-v2 | t≥0 时 y′+4y=7，y(0⁺)=6。全响应 y(0.3) 是多少？（选最接近值。） | B · 3.030075 | 全响应为稳态值加暂态：y(t)=B/a+[y(0⁺)−B/a]e^(−at)。代入得 3.030075。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-total-response-sample-2 | t≥0 时 y′+5y=9，y(0⁺)=7。全响应 y(0.4) 是多少？（选最接近值。） | C · 2.503743 | 全响应为稳态值加暂态：y(t)=B/a+[y(0⁺)−B/a]e^(−at)。代入得 2.503743。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-total-response-sample-2-v1 | t≥0 时 y′+6y=11，y(0⁺)=8。全响应 y(0.5) 是多少？（选最接近值。） | D · 2.140354 | 全响应为稳态值加暂态：y(t)=B/a+[y(0⁺)−B/a]e^(−at)。代入得 2.140354。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-total-response-sample-2-v2 | t≥0 时 y′+7y=13，y(0⁺)=9。全响应 y(0.6) 是多少？（选最接近值。） | A · 1.964254 | 全响应为稳态值加暂态：y(t)=B/a+[y(0⁺)−B/a]e^(−at)。代入得 1.964254。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-pulse-response-after-end-1 | 零状态系统 h(t)=2e^(−2t)u(t)，输入 u(t)−u(t−0.1)。y(0.2) 是多少？（选最接近值。） | A · 0.148411 | 脉冲输入是两个错位阶跃之差；在 t=2T，y=(1−e^(−aT))e^(−aT)。代入得 0.148411。 | [2.4 冲激响应与阶跃响应](../content/signals/knowledge-base/ss-2-4.md)；[2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-pulse-response-after-end-1-v1 | 零状态系统 h(t)=3e^(−3t)u(t)，输入 u(t)−u(t−0.2)。y(0.4) 是多少？（选最接近值。） | B · 0.247617 | 脉冲输入是两个错位阶跃之差；在 t=2T，y=(1−e^(−aT))e^(−aT)。代入得 0.247617。 | [2.4 冲激响应与阶跃响应](../content/signals/knowledge-base/ss-2-4.md)；[2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-pulse-response-after-end-1-v2 | 零状态系统 h(t)=4e^(−4t)u(t)，输入 u(t)−u(t−0.3)。y(0.6) 是多少？（选最接近值。） | C · 0.210476 | 脉冲输入是两个错位阶跃之差；在 t=2T，y=(1−e^(−aT))e^(−aT)。代入得 0.210476。 | [2.4 冲激响应与阶跃响应](../content/signals/knowledge-base/ss-2-4.md)；[2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-pulse-response-after-end-2 | 零状态系统 h(t)=5e^(−5t)u(t)，输入 u(t)−u(t−0.4)。y(0.8) 是多少？（选最接近值。） | D · 0.11702 | 脉冲输入是两个错位阶跃之差；在 t=2T，y=(1−e^(−aT))e^(−aT)。代入得 0.11702。 | [2.4 冲激响应与阶跃响应](../content/signals/knowledge-base/ss-2-4.md)；[2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-pulse-response-after-end-2-v1 | 零状态系统 h(t)=6e^(−6t)u(t)，输入 u(t)−u(t−0.5)。y(1) 是多少？（选最接近值。） | A · 0.047308 | 脉冲输入是两个错位阶跃之差；在 t=2T，y=(1−e^(−aT))e^(−aT)。代入得 0.047308。 | [2.4 冲激响应与阶跃响应](../content/signals/knowledge-base/ss-2-4.md)；[2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-pulse-response-after-end-2-v2 | 零状态系统 h(t)=7e^(−7t)u(t)，输入 u(t)−u(t−0.6)。y(1.2) 是多少？（选最接近值。） | B · 0.014771 | 脉冲输入是两个错位阶跃之差；在 t=2T，y=(1−e^(−aT))e^(−aT)。代入得 0.014771。 | [2.4 冲激响应与阶跃响应](../content/signals/knowledge-base/ss-2-4.md)；[2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-rectangle-convolution-sample-1 | x(t) 在 [0,3] 为 2，h(t) 在 [0,5] 为 3，两者区间外均为零。(x*h)(5) 是多少？ | B · 18 | 重叠长度为 max(0,min(T₁,t)−max(0,t−T₂))，再乘两个幅度 AB。代入得 18。 | [2.5 卷积积分](../content/signals/knowledge-base/ss-2-5.md)；[2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-rectangle-convolution-sample-1-v1 | x(t) 在 [0,4] 为 3，h(t) 在 [0,6] 为 4，两者区间外均为零。(x*h)(7) 是多少？ | C · 36 | 重叠长度为 max(0,min(T₁,t)−max(0,t−T₂))，再乘两个幅度 AB。代入得 36。 | [2.5 卷积积分](../content/signals/knowledge-base/ss-2-5.md)；[2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-rectangle-convolution-sample-1-v2 | x(t) 在 [0,5] 为 4，h(t) 在 [0,7] 为 5，两者区间外均为零。(x*h)(9) 是多少？ | D · 60 | 重叠长度为 max(0,min(T₁,t)−max(0,t−T₂))，再乘两个幅度 AB。代入得 60。 | [2.5 卷积积分](../content/signals/knowledge-base/ss-2-5.md)；[2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-rectangle-convolution-sample-2 | x(t) 在 [0,6] 为 5，h(t) 在 [0,8] 为 6，两者区间外均为零。(x*h)(11) 是多少？ | A · 90 | 重叠长度为 max(0,min(T₁,t)−max(0,t−T₂))，再乘两个幅度 AB。代入得 90。 | [2.5 卷积积分](../content/signals/knowledge-base/ss-2-5.md)；[2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-rectangle-convolution-sample-2-v1 | x(t) 在 [0,7] 为 6，h(t) 在 [0,9] 为 7，两者区间外均为零。(x*h)(13) 是多少？ | B · 126 | 重叠长度为 max(0,min(T₁,t)−max(0,t−T₂))，再乘两个幅度 AB。代入得 126。 | [2.5 卷积积分](../content/signals/knowledge-base/ss-2-5.md)；[2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-rectangle-convolution-sample-2-v2 | x(t) 在 [0,8] 为 7，h(t) 在 [0,10] 为 8，两者区间外均为零。(x*h)(15) 是多少？ | C · 168 | 重叠长度为 max(0,min(T₁,t)−max(0,t−T₂))，再乘两个幅度 AB。代入得 168。 | [2.5 卷积积分](../content/signals/knowledge-base/ss-2-5.md)；[2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-shifted-convolution-end-1 | 两个矩形信号分别在 [1,3] s 和 [2,5] s 内恒为 1，外部为零。卷积支撑的右端点是多少？ | C · 8 s | 两个非负矩形的卷积支撑为 [L₁+L₂,R₁+R₂]，右端点是两右端点相加。代入得 8 s。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-shifted-convolution-end-1-v1 | 两个矩形信号分别在 [2,4] s 和 [3,6] s 内恒为 1，外部为零。卷积支撑的右端点是多少？ | D · 10 s | 两个非负矩形的卷积支撑为 [L₁+L₂,R₁+R₂]，右端点是两右端点相加。代入得 10 s。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-shifted-convolution-end-1-v2 | 两个矩形信号分别在 [3,5] s 和 [4,7] s 内恒为 1，外部为零。卷积支撑的右端点是多少？ | A · 12 s | 两个非负矩形的卷积支撑为 [L₁+L₂,R₁+R₂]，右端点是两右端点相加。代入得 12 s。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-shifted-convolution-end-2 | 两个矩形信号分别在 [4,6] s 和 [5,8] s 内恒为 1，外部为零。卷积支撑的右端点是多少？ | B · 14 s | 两个非负矩形的卷积支撑为 [L₁+L₂,R₁+R₂]，右端点是两右端点相加。代入得 14 s。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-shifted-convolution-end-2-v1 | 两个矩形信号分别在 [5,7] s 和 [6,9] s 内恒为 1，外部为零。卷积支撑的右端点是多少？ | C · 16 s | 两个非负矩形的卷积支撑为 [L₁+L₂,R₁+R₂]，右端点是两右端点相加。代入得 16 s。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-shifted-convolution-end-2-v2 | 两个矩形信号分别在 [6,8] s 和 [7,10] s 内恒为 1，外部为零。卷积支撑的右端点是多少？ | D · 18 s | 两个非负矩形的卷积支撑为 [L₁+L₂,R₁+R₂]，右端点是两右端点相加。代入得 18 s。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-convolution-total-area-1 | x(t)=3e^(−2t)u(t)，h(t)=5e^(−4t)u(t)。∫₋∞∞(x*h)(t)dt 是多少？ | D · 1.875 | 绝对可积信号的卷积面积等于两信号面积之积：(A/α)(B/β)。代入得 1.875。 | [2.5 卷积积分](../content/signals/knowledge-base/ss-2-5.md)；[2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-convolution-total-area-1-v1 | x(t)=4e^(−3t)u(t)，h(t)=6e^(−5t)u(t)。∫₋∞∞(x*h)(t)dt 是多少？ | A · 1.6 | 绝对可积信号的卷积面积等于两信号面积之积：(A/α)(B/β)。代入得 1.6。 | [2.5 卷积积分](../content/signals/knowledge-base/ss-2-5.md)；[2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-convolution-total-area-1-v2 | x(t)=5e^(−4t)u(t)，h(t)=7e^(−6t)u(t)。∫₋∞∞(x*h)(t)dt 是多少？（选最接近值。） | B · 1.458333 | 绝对可积信号的卷积面积等于两信号面积之积：(A/α)(B/β)。代入得 1.458333。 | [2.5 卷积积分](../content/signals/knowledge-base/ss-2-5.md)；[2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-convolution-total-area-2 | x(t)=6e^(−5t)u(t)，h(t)=8e^(−7t)u(t)。∫₋∞∞(x*h)(t)dt 是多少？（选最接近值。） | C · 1.371429 | 绝对可积信号的卷积面积等于两信号面积之积：(A/α)(B/β)。代入得 1.371429。 | [2.5 卷积积分](../content/signals/knowledge-base/ss-2-5.md)；[2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-convolution-total-area-2-v1 | x(t)=7e^(−6t)u(t)，h(t)=9e^(−8t)u(t)。∫₋∞∞(x*h)(t)dt 是多少？ | D · 1.3125 | 绝对可积信号的卷积面积等于两信号面积之积：(A/α)(B/β)。代入得 1.3125。 | [2.5 卷积积分](../content/signals/knowledge-base/ss-2-5.md)；[2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-convolution-total-area-2-v2 | x(t)=8e^(−7t)u(t)，h(t)=10e^(−9t)u(t)。∫₋∞∞(x*h)(t)dt 是多少？（选最接近值。） | A · 1.269841 | 绝对可积信号的卷积面积等于两信号面积之积：(A/α)(B/β)。代入得 1.269841。 | [2.5 卷积积分](../content/signals/knowledge-base/ss-2-5.md)；[2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-discrete-convolution-middle-1 | x[0]=1, x[1]=2, h[0]=3, h[1]=5，其余样本均为零。线性卷积 y[1] 是多少？ | A · 11 | 由 y[n]=Σₖx[k]h[n−k]，y[1]=x[0]h[1]+x[1]h[0]。代入得 11。 | [2.5 卷积积分](../content/signals/knowledge-base/ss-2-5.md)；[A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| ext-discrete-convolution-middle-1-v1 | x[0]=2, x[1]=3, h[0]=4, h[1]=6，其余样本均为零。线性卷积 y[1] 是多少？ | B · 24 | 由 y[n]=Σₖx[k]h[n−k]，y[1]=x[0]h[1]+x[1]h[0]。代入得 24。 | [2.5 卷积积分](../content/signals/knowledge-base/ss-2-5.md)；[A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| ext-discrete-convolution-middle-1-v2 | x[0]=3, x[1]=4, h[0]=5, h[1]=7，其余样本均为零。线性卷积 y[1] 是多少？ | C · 41 | 由 y[n]=Σₖx[k]h[n−k]，y[1]=x[0]h[1]+x[1]h[0]。代入得 41。 | [2.5 卷积积分](../content/signals/knowledge-base/ss-2-5.md)；[A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| ext-discrete-convolution-middle-2 | x[0]=4, x[1]=5, h[0]=6, h[1]=8，其余样本均为零。线性卷积 y[1] 是多少？ | D · 62 | 由 y[n]=Σₖx[k]h[n−k]，y[1]=x[0]h[1]+x[1]h[0]。代入得 62。 | [2.5 卷积积分](../content/signals/knowledge-base/ss-2-5.md)；[A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| ext-discrete-convolution-middle-2-v1 | x[0]=5, x[1]=6, h[0]=7, h[1]=9，其余样本均为零。线性卷积 y[1] 是多少？ | A · 87 | 由 y[n]=Σₖx[k]h[n−k]，y[1]=x[0]h[1]+x[1]h[0]。代入得 87。 | [2.5 卷积积分](../content/signals/knowledge-base/ss-2-5.md)；[A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| ext-discrete-convolution-middle-2-v2 | x[0]=6, x[1]=7, h[0]=8, h[1]=10，其余样本均为零。线性卷积 y[1] 是多少？ | B · 116 | 由 y[n]=Σₖx[k]h[n−k]，y[1]=x[0]h[1]+x[1]h[0]。代入得 116。 | [2.5 卷积积分](../content/signals/knowledge-base/ss-2-5.md)；[A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| ext-ramp-step-convolution-1 | x(t)=2t u(t)，h(t)=u(t)。连续卷积 y(3) 是多少？ | B · 9 | 与单位阶跃卷积相当于积分：y(t)=∫₀ᵗAτ dτ=At²/2（t≥0）。代入得 9。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-ramp-step-convolution-1-v1 | x(t)=3t u(t)，h(t)=u(t)。连续卷积 y(4) 是多少？ | C · 24 | 与单位阶跃卷积相当于积分：y(t)=∫₀ᵗAτ dτ=At²/2（t≥0）。代入得 24。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-ramp-step-convolution-1-v2 | x(t)=4t u(t)，h(t)=u(t)。连续卷积 y(5) 是多少？ | D · 50 | 与单位阶跃卷积相当于积分：y(t)=∫₀ᵗAτ dτ=At²/2（t≥0）。代入得 50。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-ramp-step-convolution-2 | x(t)=5t u(t)，h(t)=u(t)。连续卷积 y(6) 是多少？ | A · 90 | 与单位阶跃卷积相当于积分：y(t)=∫₀ᵗAτ dτ=At²/2（t≥0）。代入得 90。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-ramp-step-convolution-2-v1 | x(t)=6t u(t)，h(t)=u(t)。连续卷积 y(7) 是多少？ | B · 147 | 与单位阶跃卷积相当于积分：y(t)=∫₀ᵗAτ dτ=At²/2（t≥0）。代入得 147。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-ramp-step-convolution-2-v2 | x(t)=7t u(t)，h(t)=u(t)。连续卷积 y(8) 是多少？ | C · 224 | 与单位阶跃卷积相当于积分：y(t)=∫₀ᵗAτ dτ=At²/2（t≥0）。代入得 224。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-two-impulse-response-1 | 零状态系统 h(t)=e^(−1t)u(t)，输入 2δ(t)+3δ(t−0.1)。y(0.2) 是多少？（选最接近值。） | C · 4.351974 | 冲激卷积只产生移位与增益：y(t)=Ah(t)+Bh(t−T)，在 t=2T 代入。代入得 4.351974。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-two-impulse-response-1-v1 | 零状态系统 h(t)=e^(−2t)u(t)，输入 3δ(t)+4δ(t−0.2)。y(0.4) 是多少？（选最接近值。） | D · 4.029267 | 冲激卷积只产生移位与增益：y(t)=Ah(t)+Bh(t−T)，在 t=2T 代入。代入得 4.029267。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-two-impulse-response-1-v2 | 零状态系统 h(t)=e^(−3t)u(t)，输入 4δ(t)+5δ(t−0.3)。y(0.6) 是多少？（选最接近值。） | A · 2.694044 | 冲激卷积只产生移位与增益：y(t)=Ah(t)+Bh(t−T)，在 t=2T 代入。代入得 2.694044。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-two-impulse-response-2 | 零状态系统 h(t)=e^(−4t)u(t)，输入 5δ(t)+6δ(t−0.4)。y(0.8) 是多少？（选最接近值。） | B · 1.41519 | 冲激卷积只产生移位与增益：y(t)=Ah(t)+Bh(t−T)，在 t=2T 代入。代入得 1.41519。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-two-impulse-response-2-v1 | 零状态系统 h(t)=e^(−5t)u(t)，输入 6δ(t)+7δ(t−0.5)。y(1) 是多少？（选最接近值。） | C · 0.615023 | 冲激卷积只产生移位与增益：y(t)=Ah(t)+Bh(t−T)，在 t=2T 代入。代入得 0.615023。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-two-impulse-response-2-v2 | 零状态系统 h(t)=e^(−6t)u(t)，输入 7δ(t)+8δ(t−0.6)。y(1.2) 是多少？（选最接近值。） | D · 0.223816 | 冲激卷积只产生移位与增益：y(t)=Ah(t)+Bh(t−T)，在 t=2T 代入。代入得 0.223816。 | [2.6 卷积的性质](../content/signals/knowledge-base/ss-2-6.md) |
| ext-repeated-pole-step-final-1 | 稳定因果系统 h(t)=4t e^(−2t)u(t)，单位阶跃零状态响应的终值是多少？ | D · 1 | 阶跃终值等于冲激响应面积，∫₀∞Kt e^(−at)dt=K/a²。代入得 1。 | [2.4 冲激响应与阶跃响应](../content/signals/knowledge-base/ss-2-4.md) |
| ext-repeated-pole-step-final-1-v1 | 稳定因果系统 h(t)=5t e^(−3t)u(t)，单位阶跃零状态响应的终值是多少？（选最接近值。） | A · 0.555556 | 阶跃终值等于冲激响应面积，∫₀∞Kt e^(−at)dt=K/a²。代入得 0.555556。 | [2.4 冲激响应与阶跃响应](../content/signals/knowledge-base/ss-2-4.md) |
| ext-repeated-pole-step-final-1-v2 | 稳定因果系统 h(t)=6t e^(−4t)u(t)，单位阶跃零状态响应的终值是多少？ | B · 0.375 | 阶跃终值等于冲激响应面积，∫₀∞Kt e^(−at)dt=K/a²。代入得 0.375。 | [2.4 冲激响应与阶跃响应](../content/signals/knowledge-base/ss-2-4.md) |
| ext-repeated-pole-step-final-2 | 稳定因果系统 h(t)=7t e^(−5t)u(t)，单位阶跃零状态响应的终值是多少？ | C · 0.28 | 阶跃终值等于冲激响应面积，∫₀∞Kt e^(−at)dt=K/a²。代入得 0.28。 | [2.4 冲激响应与阶跃响应](../content/signals/knowledge-base/ss-2-4.md) |
| ext-repeated-pole-step-final-2-v1 | 稳定因果系统 h(t)=8t e^(−6t)u(t)，单位阶跃零状态响应的终值是多少？（选最接近值。） | D · 0.222222 | 阶跃终值等于冲激响应面积，∫₀∞Kt e^(−at)dt=K/a²。代入得 0.222222。 | [2.4 冲激响应与阶跃响应](../content/signals/knowledge-base/ss-2-4.md) |
| ext-repeated-pole-step-final-2-v2 | 稳定因果系统 h(t)=9t e^(−7t)u(t)，单位阶跃零状态响应的终值是多少？（选最接近值。） | A · 0.183673 | 阶跃终值等于冲激响应面积，∫₀∞Kt e^(−at)dt=K/a²。代入得 0.183673。 | [2.4 冲激响应与阶跃响应](../content/signals/knowledge-base/ss-2-4.md) |
| ext-second-order-impulse-jump-1 | 系统 2y″+3y′+y=7δ(t)，初始静止，y 在 0 处连续。y′(0⁺) 是多少？ | A · 3.5 | 在冲激两侧积分，m[y′(0⁺)−y′(0⁻)]=J；初始静止，故 y′(0⁺)=J/m。代入得 3.5。 | [2.2 初始状态与初始值（0⁻/0⁺）](../content/signals/knowledge-base/ss-2-2.md) |
| ext-second-order-impulse-jump-1-v1 | 系统 3y″+4y′+y=10δ(t)，初始静止，y 在 0 处连续。y′(0⁺) 是多少？（选最接近值。） | B · 3.333333 | 在冲激两侧积分，m[y′(0⁺)−y′(0⁻)]=J；初始静止，故 y′(0⁺)=J/m。代入得 3.333333。 | [2.2 初始状态与初始值（0⁻/0⁺）](../content/signals/knowledge-base/ss-2-2.md) |
| ext-second-order-impulse-jump-1-v2 | 系统 4y″+5y′+y=13δ(t)，初始静止，y 在 0 处连续。y′(0⁺) 是多少？ | C · 3.25 | 在冲激两侧积分，m[y′(0⁺)−y′(0⁻)]=J；初始静止，故 y′(0⁺)=J/m。代入得 3.25。 | [2.2 初始状态与初始值（0⁻/0⁺）](../content/signals/knowledge-base/ss-2-2.md) |
| ext-second-order-impulse-jump-2 | 系统 5y″+6y′+y=16δ(t)，初始静止，y 在 0 处连续。y′(0⁺) 是多少？ | D · 3.2 | 在冲激两侧积分，m[y′(0⁺)−y′(0⁻)]=J；初始静止，故 y′(0⁺)=J/m。代入得 3.2。 | [2.2 初始状态与初始值（0⁻/0⁺）](../content/signals/knowledge-base/ss-2-2.md) |
| ext-second-order-impulse-jump-2-v1 | 系统 6y″+7y′+y=19δ(t)，初始静止，y 在 0 处连续。y′(0⁺) 是多少？（选最接近值。） | A · 3.166667 | 在冲激两侧积分，m[y′(0⁺)−y′(0⁻)]=J；初始静止，故 y′(0⁺)=J/m。代入得 3.166667。 | [2.2 初始状态与初始值（0⁻/0⁺）](../content/signals/knowledge-base/ss-2-2.md) |
| ext-second-order-impulse-jump-2-v2 | 系统 7y″+8y′+y=22δ(t)，初始静止，y 在 0 处连续。y′(0⁺) 是多少？（选最接近值。） | B · 3.142857 | 在冲激两侧积分，m[y′(0⁺)−y′(0⁻)]=J；初始静止，故 y′(0⁺)=J/m。代入得 3.142857。 | [2.2 初始状态与初始值（0⁻/0⁺）](../content/signals/knowledge-base/ss-2-2.md) |
| ext-first-order-initial-slope-1 | t>0 时 y′+2y=3，y(0⁺)=1。右侧初始斜率 y′(0⁺) 是多少？ | B · 1 | 把右侧初值直接代入微分方程：y′(0⁺)=B−ay(0⁺)。代入得 1。 | [2.2 初始状态与初始值（0⁻/0⁺）](../content/signals/knowledge-base/ss-2-2.md) |
| ext-first-order-initial-slope-1-v1 | t>0 时 y′+3y=4，y(0⁺)=2。右侧初始斜率 y′(0⁺) 是多少？ | C · -2 | 把右侧初值直接代入微分方程：y′(0⁺)=B−ay(0⁺)。代入得 -2。 | [2.2 初始状态与初始值（0⁻/0⁺）](../content/signals/knowledge-base/ss-2-2.md) |
| ext-first-order-initial-slope-1-v2 | t>0 时 y′+4y=5，y(0⁺)=3。右侧初始斜率 y′(0⁺) 是多少？ | D · -7 | 把右侧初值直接代入微分方程：y′(0⁺)=B−ay(0⁺)。代入得 -7。 | [2.2 初始状态与初始值（0⁻/0⁺）](../content/signals/knowledge-base/ss-2-2.md) |
| ext-first-order-initial-slope-2 | t>0 时 y′+5y=6，y(0⁺)=4。右侧初始斜率 y′(0⁺) 是多少？ | A · -14 | 把右侧初值直接代入微分方程：y′(0⁺)=B−ay(0⁺)。代入得 -14。 | [2.2 初始状态与初始值（0⁻/0⁺）](../content/signals/knowledge-base/ss-2-2.md) |
| ext-first-order-initial-slope-2-v1 | t>0 时 y′+6y=7，y(0⁺)=5。右侧初始斜率 y′(0⁺) 是多少？ | B · -23 | 把右侧初值直接代入微分方程：y′(0⁺)=B−ay(0⁺)。代入得 -23。 | [2.2 初始状态与初始值（0⁻/0⁺）](../content/signals/knowledge-base/ss-2-2.md) |
| ext-first-order-initial-slope-2-v2 | t>0 时 y′+7y=8，y(0⁺)=6。右侧初始斜率 y′(0⁺) 是多少？ | C · -34 | 把右侧初值直接代入微分方程：y′(0⁺)=B−ay(0⁺)。代入得 -34。 | [2.2 初始状态与初始值（0⁻/0⁺）](../content/signals/knowledge-base/ss-2-2.md) |
| ext-complex-root-frequency-1 | 齐次方程 y″+4y′+20y=0 的特征根为 −2±j4。非零自由响应的振荡角频率是多少？ | C · 4 rad/s | 共轭根 α±jβ 对应 e^(αt)(Ccosβt+Dsinβt)，角频率是虚部的绝对值 \|β\|。代入得 4 rad/s。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-complex-root-frequency-1-v1 | 齐次方程 y″+6y′+34y=0 的特征根为 −3±j5。非零自由响应的振荡角频率是多少？ | D · 5 rad/s | 共轭根 α±jβ 对应 e^(αt)(Ccosβt+Dsinβt)，角频率是虚部的绝对值 \|β\|。代入得 5 rad/s。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-complex-root-frequency-1-v2 | 齐次方程 y″+8y′+52y=0 的特征根为 −4±j6。非零自由响应的振荡角频率是多少？ | A · 6 rad/s | 共轭根 α±jβ 对应 e^(αt)(Ccosβt+Dsinβt)，角频率是虚部的绝对值 \|β\|。代入得 6 rad/s。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-complex-root-frequency-2 | 齐次方程 y″+10y′+74y=0 的特征根为 −5±j7。非零自由响应的振荡角频率是多少？ | B · 7 rad/s | 共轭根 α±jβ 对应 e^(αt)(Ccosβt+Dsinβt)，角频率是虚部的绝对值 \|β\|。代入得 7 rad/s。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-complex-root-frequency-2-v1 | 齐次方程 y″+12y′+100y=0 的特征根为 −6±j8。非零自由响应的振荡角频率是多少？ | C · 8 rad/s | 共轭根 α±jβ 对应 e^(αt)(Ccosβt+Dsinβt)，角频率是虚部的绝对值 \|β\|。代入得 8 rad/s。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-complex-root-frequency-2-v2 | 齐次方程 y″+14y′+130y=0 的特征根为 −7±j9。非零自由响应的振荡角频率是多少？ | D · 9 rad/s | 共轭根 α±jβ 对应 e^(αt)(Ccosβt+Dsinβt)，角频率是虚部的绝对值 \|β\|。代入得 9 rad/s。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-complex-root-envelope-1 | 非零自由响应由特征根 −2±j4 产生。t=0.1 s 时振幅包络与 t=0 时的比值是多少？（选最接近值。） | D · 0.818731 | 特征根的实部控制振幅包络，包络比为 e^(−at)，虚部只控制振荡频率。代入得 0.818731。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-complex-root-envelope-1-v1 | 非零自由响应由特征根 −3±j5 产生。t=0.2 s 时振幅包络与 t=0 时的比值是多少？（选最接近值。） | A · 0.548812 | 特征根的实部控制振幅包络，包络比为 e^(−at)，虚部只控制振荡频率。代入得 0.548812。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-complex-root-envelope-1-v2 | 非零自由响应由特征根 −4±j6 产生。t=0.3 s 时振幅包络与 t=0 时的比值是多少？（选最接近值。） | B · 0.301194 | 特征根的实部控制振幅包络，包络比为 e^(−at)，虚部只控制振荡频率。代入得 0.301194。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-complex-root-envelope-2 | 非零自由响应由特征根 −5±j7 产生。t=0.4 s 时振幅包络与 t=0 时的比值是多少？（选最接近值。） | C · 0.135335 | 特征根的实部控制振幅包络，包络比为 e^(−at)，虚部只控制振荡频率。代入得 0.135335。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-complex-root-envelope-2-v1 | 非零自由响应由特征根 −6±j8 产生。t=0.5 s 时振幅包络与 t=0 时的比值是多少？（选最接近值。） | D · 0.049787 | 特征根的实部控制振幅包络，包络比为 e^(−at)，虚部只控制振荡频率。代入得 0.049787。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-complex-root-envelope-2-v2 | 非零自由响应由特征根 −7±j9 产生。t=0.6 s 时振幅包络与 t=0 时的比值是多少？（选最接近值。） | A · 0.014996 | 特征根的实部控制振幅包络，包络比为 e^(−at)，虚部只控制振荡频率。代入得 0.014996。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-second-order-step-gain-1 | 稳定因果系统 H(s)=4/(s²+3s+6)，初始静止。单位阶跃输出的终值是多少？（选最接近值。） | A · 0.666667 | 二阶分母各系数为正，极点在左半平面；阶跃终值为直流增益 H(0)=K/c。代入得 0.666667。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md)；[4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-second-order-step-gain-1-v1 | 稳定因果系统 H(s)=5/(s²+4s+7)，初始静止。单位阶跃输出的终值是多少？（选最接近值。） | B · 0.714286 | 二阶分母各系数为正，极点在左半平面；阶跃终值为直流增益 H(0)=K/c。代入得 0.714286。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md)；[4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-second-order-step-gain-1-v2 | 稳定因果系统 H(s)=6/(s²+5s+8)，初始静止。单位阶跃输出的终值是多少？ | C · 0.75 | 二阶分母各系数为正，极点在左半平面；阶跃终值为直流增益 H(0)=K/c。代入得 0.75。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md)；[4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-second-order-step-gain-2 | 稳定因果系统 H(s)=7/(s²+6s+9)，初始静止。单位阶跃输出的终值是多少？（选最接近值。） | D · 0.777778 | 二阶分母各系数为正，极点在左半平面；阶跃终值为直流增益 H(0)=K/c。代入得 0.777778。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md)；[4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-second-order-step-gain-2-v1 | 稳定因果系统 H(s)=8/(s²+7s+10)，初始静止。单位阶跃输出的终值是多少？ | A · 0.8 | 二阶分母各系数为正，极点在左半平面；阶跃终值为直流增益 H(0)=K/c。代入得 0.8。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md)；[4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-second-order-step-gain-2-v2 | 稳定因果系统 H(s)=9/(s²+8s+11)，初始静止。单位阶跃输出的终值是多少？（选最接近值。） | B · 0.818182 | 二阶分母各系数为正，极点在左半平面；阶跃终值为直流增益 H(0)=K/c。代入得 0.818182。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md)；[4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-critical-pole-1 | 特征方程 s²+4s+4=0，其重根是多少？ | B · -2 s⁻¹ | 特征多项式是 (s+a)²，重根为 s=−a。代入得 -2 s⁻¹。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-critical-pole-1-v1 | 特征方程 s²+6s+9=0，其重根是多少？ | C · -3 s⁻¹ | 特征多项式是 (s+a)²，重根为 s=−a。代入得 -3 s⁻¹。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-critical-pole-1-v2 | 特征方程 s²+8s+16=0，其重根是多少？ | D · -4 s⁻¹ | 特征多项式是 (s+a)²，重根为 s=−a。代入得 -4 s⁻¹。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-critical-pole-2 | 特征方程 s²+10s+25=0，其重根是多少？ | A · -5 s⁻¹ | 特征多项式是 (s+a)²，重根为 s=−a。代入得 -5 s⁻¹。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-critical-pole-2-v1 | 特征方程 s²+12s+36=0，其重根是多少？ | B · -6 s⁻¹ | 特征多项式是 (s+a)²，重根为 s=−a。代入得 -6 s⁻¹。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-critical-pole-2-v2 | 特征方程 s²+14s+49=0，其重根是多少？ | C · -7 s⁻¹ | 特征多项式是 (s+a)²，重根为 s=−a。代入得 -7 s⁻¹。 | [2.1 微分方程的经典解](../content/signals/knowledge-base/ss-2-1.md) |
| ext-rectangle-autocorrelation-1 | 实信号 x(t) 在 [0,5] 为 2，其余为零。按 Rxx(τ)=∫x(t)x(t−τ)dt，Rxx(-2) 是多少？ | C · 12 | 矩形自相关为 A²max(T−\|τ\|,0)，由两个矩形的重叠长度得到。代入得 12。 | [2.7 相关函数](../content/signals/knowledge-base/ss-2-7.md) |
| ext-rectangle-autocorrelation-1-v1 | 实信号 x(t) 在 [0,6] 为 3，其余为零。按 Rxx(τ)=∫x(t)x(t−τ)dt，Rxx(-3) 是多少？ | D · 27 | 矩形自相关为 A²max(T−\|τ\|,0)，由两个矩形的重叠长度得到。代入得 27。 | [2.7 相关函数](../content/signals/knowledge-base/ss-2-7.md) |
| ext-rectangle-autocorrelation-1-v2 | 实信号 x(t) 在 [0,7] 为 4，其余为零。按 Rxx(τ)=∫x(t)x(t−τ)dt，Rxx(-4) 是多少？ | A · 48 | 矩形自相关为 A²max(T−\|τ\|,0)，由两个矩形的重叠长度得到。代入得 48。 | [2.7 相关函数](../content/signals/knowledge-base/ss-2-7.md) |
| ext-rectangle-autocorrelation-2 | 实信号 x(t) 在 [0,8] 为 5，其余为零。按 Rxx(τ)=∫x(t)x(t−τ)dt，Rxx(-5) 是多少？ | B · 75 | 矩形自相关为 A²max(T−\|τ\|,0)，由两个矩形的重叠长度得到。代入得 75。 | [2.7 相关函数](../content/signals/knowledge-base/ss-2-7.md) |
| ext-rectangle-autocorrelation-2-v1 | 实信号 x(t) 在 [0,9] 为 6，其余为零。按 Rxx(τ)=∫x(t)x(t−τ)dt，Rxx(-6) 是多少？ | C · 108 | 矩形自相关为 A²max(T−\|τ\|,0)，由两个矩形的重叠长度得到。代入得 108。 | [2.7 相关函数](../content/signals/knowledge-base/ss-2-7.md) |
| ext-rectangle-autocorrelation-2-v2 | 实信号 x(t) 在 [0,10] 为 7，其余为零。按 Rxx(τ)=∫x(t)x(t−τ)dt，Rxx(-7) 是多少？ | D · 147 | 矩形自相关为 A²max(T−\|τ\|,0)，由两个矩形的重叠长度得到。代入得 147。 | [2.7 相关函数](../content/signals/knowledge-base/ss-2-7.md) |
| ext-crosscorrelation-peak-1 | p(t) 是 [0,1] 上的单位矩形，x(t)=p(t−1)，y(t)=p(t−4)。Rxy(τ)=∫x(t)y(t−τ)dt 在哪个 τ 达到最大？ | D · -3 s | 最大值对应完全重叠：y(t−τ)=p(t−τ−b) 与 p(t−a) 对齐，故 τ=a−b。代入得 -3 s。 | [2.7 相关函数](../content/signals/knowledge-base/ss-2-7.md) |
| ext-crosscorrelation-peak-1-v1 | p(t) 是 [0,1] 上的单位矩形，x(t)=p(t−2)，y(t)=p(t−7)。Rxy(τ)=∫x(t)y(t−τ)dt 在哪个 τ 达到最大？ | A · -5 s | 最大值对应完全重叠：y(t−τ)=p(t−τ−b) 与 p(t−a) 对齐，故 τ=a−b。代入得 -5 s。 | [2.7 相关函数](../content/signals/knowledge-base/ss-2-7.md) |
| ext-crosscorrelation-peak-1-v2 | p(t) 是 [0,1] 上的单位矩形，x(t)=p(t−3)，y(t)=p(t−10)。Rxy(τ)=∫x(t)y(t−τ)dt 在哪个 τ 达到最大？ | B · -7 s | 最大值对应完全重叠：y(t−τ)=p(t−τ−b) 与 p(t−a) 对齐，故 τ=a−b。代入得 -7 s。 | [2.7 相关函数](../content/signals/knowledge-base/ss-2-7.md) |
| ext-crosscorrelation-peak-2 | p(t) 是 [0,1] 上的单位矩形，x(t)=p(t−4)，y(t)=p(t−13)。Rxy(τ)=∫x(t)y(t−τ)dt 在哪个 τ 达到最大？ | C · -9 s | 最大值对应完全重叠：y(t−τ)=p(t−τ−b) 与 p(t−a) 对齐，故 τ=a−b。代入得 -9 s。 | [2.7 相关函数](../content/signals/knowledge-base/ss-2-7.md) |
| ext-crosscorrelation-peak-2-v1 | p(t) 是 [0,1] 上的单位矩形，x(t)=p(t−5)，y(t)=p(t−16)。Rxy(τ)=∫x(t)y(t−τ)dt 在哪个 τ 达到最大？ | D · -11 s | 最大值对应完全重叠：y(t−τ)=p(t−τ−b) 与 p(t−a) 对齐，故 τ=a−b。代入得 -11 s。 | [2.7 相关函数](../content/signals/knowledge-base/ss-2-7.md) |
| ext-crosscorrelation-peak-2-v2 | p(t) 是 [0,1] 上的单位矩形，x(t)=p(t−6)，y(t)=p(t−19)。Rxy(τ)=∫x(t)y(t−τ)dt 在哪个 τ 达到最大？ | A · -13 s | 最大值对应完全重叠：y(t−τ)=p(t−τ−b) 与 p(t−a) 对齐，故 τ=a−b。代入得 -13 s。 | [2.7 相关函数](../content/signals/knowledge-base/ss-2-7.md) |

### 第3章

| ID | 题目 | 正确答案 | 解析 | 讲义依据 |
| --- | --- | --- | --- | --- |
| aliasing | 5 Hz 实余弦以 8 Hz 均匀采样，折叠到 [0,fs/2] 后对应的频率是多少？ | D · 3 Hz | \|5 − 8\| = 3 Hz；采样后高频折叠到 3 Hz。 | [3.9 取样定理](../content/signals/knowledge-base/ss-3-9.md) |
| aliasing-v1 | 900 Hz 正弦信号以 1000 Hz 采样，折叠到 [0,500] Hz 后的频率是多少？ | D · 100 Hz | \|900−1000\|=100 Hz，位于奈奎斯特区间。 | [3.9 取样定理](../content/signals/knowledge-base/ss-3-9.md) |
| aliasing-v2 | 700 Hz 正弦信号以 800 Hz 采样，折叠到 [0,400] Hz 后的频率是多少？ | D · 100 Hz | \|700−800\|=100 Hz；混叠频率需落在第一奈奎斯特区间。 | [3.9 取样定理](../content/signals/knowledge-base/ss-3-9.md) |
| nyquist | 基带带限信号最高频率为 4 kHz，其奈奎斯特速率阈值 2fmax 是多少？本题求阈值，通用安全采样需 fs>2fmax。 | A · 8 kHz | 奈奎斯特速率阈值为 8 kHz。等号采样对临界频率分量不能普遍保证重建，实际还需抗混叠过渡带。 | [3.9 取样定理](../content/signals/knowledge-base/ss-3-9.md) |
| nyquist-v1 | 最高频率 300 Hz，要求 fs>2fmax，哪个采样率满足要求？ | B · 800 Hz | 需严格大于 600 Hz，因此选择 800 Hz。 | [3.9 取样定理](../content/signals/knowledge-base/ss-3-9.md) |
| nyquist-v2 | 最高频率 400 Hz，要求 fs>2fmax，哪个采样率满足要求？ | C · 1000 Hz | 需严格大于 800 Hz；等号不能满足本题约定。 | [3.9 取样定理](../content/signals/knowledge-base/ss-3-9.md) |
| square-wave | 零均值、50% 占空比、幅值为 ±A 的理想周期方波，为何没有偶次谐波？ | B · 具有半波反对称性 | 半波反对称 x(t+T/2)=−x(t) 消去直流和偶次谐波。仅有奇对称并不足以消去偶次谐波。 | [3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| square-wave-v1 | 零均值、50% 占空比的双极性方波包含哪些谐波？ | A · 奇次谐波 | 半波反对称使偶次谐波和直流项为零。 | [3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| square-wave-v2 | 零均值、50% 占空比的理想双极性方波，第三次谐波幅度是基波的多少？ | B · 1/3 | 奇次谐波幅度按 1/n 衰减，所以 A₃/A₁=1/3。 | [3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| pulse-spectrum | 矩形脉冲越宽，其频谱主瓣？ | C · 越窄 | 时域展宽对应频域压缩：主瓣宽度与 1/τ 成正比。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| pulse-spectrum-v1 | 矩形脉宽减半，频谱第一个正零点如何变化？ | C · 变为两倍 | 第一个正零点 f₀=1/T，与脉宽成反比。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| pulse-spectrum-v2 | 幅度 A=2、宽度 T=3 的矩形脉冲，其 X(0) 是多少？ | D · 6 | 直流值等于时域积分，即脉冲面积 AT=6。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| am-bandwidth | 单音双边带 AM，载频 fc>fm>0，调制频率为 fm。正频率上下边带之间的带宽是多少？ | C · 2fm | 两条边带位于 fc−fm 和 fc+fm，带宽为 2fm；单边带调制不适用此结论。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| am-bandwidth-v1 | 单音双边带 AM 的调制频率为 4 kHz，带宽是多少？ | C · 8 kHz | 上下边带位于 fc±fm，总带宽为 2fm=8 kHz。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| am-bandwidth-v2 | 载频 100 kHz、调制频率 3 kHz 的双边带 AM，占据的频率范围是什么？ | D · 97–103 kHz | 边带位于 100±3 kHz，即 97 和 103 kHz。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| fourier-fundamental-frequency | 周期 T=0.02 s，傅里叶级数谱线间隔是多少 Hz？ | A · 50 Hz | Δf=f0=1/T=50 Hz。 | [3.3 周期信号的频谱](../content/signals/knowledge-base/ss-3-3.md) |
| fourier-fundamental-frequency-v1 | 周期 T=0.01 s，傅里叶级数谱线间隔是多少 Hz？ | B · 100 Hz | Δf=f0=1/T=100 Hz。 | [3.3 周期信号的频谱](../content/signals/knowledge-base/ss-3-3.md) |
| fourier-fundamental-frequency-v2 | 周期 T=0.04 s，傅里叶级数谱线间隔是多少 Hz？ | C · 25 Hz | Δf=f0=1/T=25 Hz。 | [3.3 周期信号的频谱](../content/signals/knowledge-base/ss-3-3.md) |
| fourier-cosine-coefficient | x(t)=2+4cos(Ωt)，复指数级数系数 F₁ 是多少？ | B · 2 | 余弦拆为正负频率两项，每项系数 4/2=2。 | [3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| fourier-cosine-coefficient-v1 | x(t)=3+6cos(Ωt)，复指数级数系数 F₁ 是多少？ | C · 3 | 余弦拆为正负频率两项，每项系数 6/2=3。 | [3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| fourier-cosine-coefficient-v2 | x(t)=1+8cos(Ωt)，复指数级数系数 F₁ 是多少？ | D · 4 | 余弦拆为正负频率两项，每项系数 8/2=4。 | [3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| pulse-train-average | 周期矩形脉冲串高电平为 2、低电平为0，占空比 25%。直流系数是多少？ | C · 0.5 | 周期平均值为幅度×占空比=2×0.25=0.5。 | [3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| pulse-train-average-v1 | 周期矩形脉冲串高电平为 3、低电平为0，占空比 50%。直流系数是多少？ | D · 1.5 | 周期平均值为幅度×占空比=3×0.5=1.5。 | [3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| pulse-train-average-v2 | 周期矩形脉冲串高电平为 4、低电平为0，占空比 25%。直流系数是多少？ | A · 1 | 周期平均值为幅度×占空比=4×0.25=1。 | [3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| fourier-exponential-dc | x(t)=2e^(−4t)u(t)，X(j0) 是多少？ | D · 0.5 | X(j0)=∫x(t)dt=2/4=0.5。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| fourier-exponential-dc-v1 | x(t)=3e^(−2t)u(t)，X(j0) 是多少？ | A · 1.5 | X(j0)=∫x(t)dt=3/2=1.5。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| fourier-exponential-dc-v2 | x(t)=4e^(−5t)u(t)，X(j0) 是多少？ | B · 0.8 | X(j0)=∫x(t)dt=4/5=0.8。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| fourier-scale-dc | 可积信号 X(j0)=12，y(t)=x(3t)，Y(j0) 是多少？ | A · 4 | 时间尺度性质给出 Y(jω)=X(jω/3)/3，零频值为 4。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| fourier-scale-dc-v1 | 可积信号 X(j0)=10，y(t)=x(2t)，Y(j0) 是多少？ | B · 5 | 时间尺度性质给出 Y(jω)=X(jω/2)/2，零频值为 5。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| fourier-scale-dc-v2 | 可积信号 X(j0)=20，y(t)=x(4t)，Y(j0) 是多少？ | C · 5 | 时间尺度性质给出 Y(jω)=X(jω/4)/4，零频值为 5。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| fourier-delay-phase | y(t)=x(t−2)，在 ω=3 rad/s，延迟因子引入的未折叠相位是多少 rad？ | B · -6 rad | 延迟因子 e^(−jωtd)，相位为 −ωtd=−3×2=-6 rad。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| fourier-delay-phase-v1 | y(t)=x(t−3)，在 ω=4 rad/s，延迟因子引入的未折叠相位是多少 rad？ | C · -12 rad | 延迟因子 e^(−jωtd)，相位为 −ωtd=−4×3=-12 rad。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| fourier-delay-phase-v2 | y(t)=x(t−4)，在 ω=2 rad/s，延迟因子引入的未折叠相位是多少 rad？ | D · -8 rad | 延迟因子 e^(−jωtd)，相位为 −ωtd=−2×4=-8 rad。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| modulation-upper-edge | 基带频谱支撑 [−3,3] kHz，乘 cos(2π·100kHz·t)。平移后正频率频带的上界是多少 kHz？ | C · 103 kHz | 频谱移到 ±fc，上边界 fc+B=103 kHz。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| modulation-upper-edge-v1 | 基带频谱支撑 [−4,4] kHz，乘 cos(2π·120kHz·t)。平移后正频率频带的上界是多少 kHz？ | D · 124 kHz | 频谱移到 ±fc，上边界 fc+B=124 kHz。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| modulation-upper-edge-v2 | 基带频谱支撑 [−5,5] kHz，乘 cos(2π·80kHz·t)。平移后正频率频带的上界是多少 kHz？ | A · 85 kHz | 频谱移到 ±fc，上边界 fc+B=85 kHz。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| sinusoidal-output-amplitude | 稳定 LTI 系统在输入余弦频率处 \|H\|=0.5，输入幅度为 6。正弦稳态输出幅度是多少？ | D · 3 | 同频输出幅度为 \|H\|A=0.5×6=3。 | [3.7 LTI系统的频域分析](../content/signals/knowledge-base/ss-3-7.md) |
| sinusoidal-output-amplitude-v1 | 稳定 LTI 系统在输入余弦频率处 \|H\|=2，输入幅度为 4。正弦稳态输出幅度是多少？ | A · 8 | 同频输出幅度为 \|H\|A=2×4=8。 | [3.7 LTI系统的频域分析](../content/signals/knowledge-base/ss-3-7.md) |
| sinusoidal-output-amplitude-v2 | 稳定 LTI 系统在输入余弦频率处 \|H\|=0.25，输入幅度为 8。正弦稳态输出幅度是多少？ | B · 2 | 同频输出幅度为 \|H\|A=0.25×8=2。 | [3.7 LTI系统的频域分析](../content/signals/knowledge-base/ss-3-7.md) |
| linear-phase-delay | H(jω)=2e^(−j3ω)，群时延是多少秒？ | A · 3 s | τg=−dφ/dω=−d(−3ω)/dω=3 s。 | [3.8 无失真传输与滤波](../content/signals/knowledge-base/ss-3-8.md) |
| linear-phase-delay-v1 | H(jω)=3e^(−j2ω)，群时延是多少秒？ | B · 2 s | τg=−dφ/dω=−d(−2ω)/dω=2 s。 | [3.8 无失真传输与滤波](../content/signals/knowledge-base/ss-3-8.md) |
| linear-phase-delay-v2 | H(jω)=4e^(−j5ω)，群时延是多少秒？ | C · 5 s | τg=−dφ/dω=−d(−5ω)/dω=5 s。 | [3.8 无失真传输与滤波](../content/signals/knowledge-base/ss-3-8.md) |
| parseval-energy | 采用角频率傅里叶约定，∫\|X(jω)\|²dω=8π，总能量是多少？ | B · 4 | Parseval：E=(1/(2π))∫\|X\|²dω=8/2=4。 | [3.10 能量谱与功率谱](../content/signals/knowledge-base/ss-3-10.md) |
| parseval-energy-v1 | 采用角频率傅里叶约定，∫\|X(jω)\|²dω=12π，总能量是多少？ | C · 6 | Parseval：E=(1/(2π))∫\|X\|²dω=12/2=6。 | [3.10 能量谱与功率谱](../content/signals/knowledge-base/ss-3-10.md) |
| parseval-energy-v2 | 采用角频率傅里叶约定，∫\|X(jω)\|²dω=20π，总能量是多少？ | D · 10 | Parseval：E=(1/(2π))∫\|X\|²dω=20/2=10。 | [3.10 能量谱与功率谱](../content/signals/knowledge-base/ss-3-10.md) |
| rectangle-first-zero | 单位幅度、宽度 0.02 s 的单个矩形脉冲，其频谱第一个正零点是多少 Hz？ | C · 50 Hz | X(f)∝sinc(fT)，首个正零点 f=1/T=50 Hz。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| rectangle-first-zero-v1 | 单位幅度、宽度 0.01 s 的单个矩形脉冲，其频谱第一个正零点是多少 Hz？ | D · 100 Hz | X(f)∝sinc(fT)，首个正零点 f=1/T=100 Hz。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| rectangle-first-zero-v2 | 单位幅度、宽度 0.05 s 的单个矩形脉冲，其频谱第一个正零点是多少 Hz？ | A · 20 Hz | X(f)∝sinc(fT)，首个正零点 f=1/T=20 Hz。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| sampling-period | 均匀采样率 fs=1000 Hz，采样周期是多少毫秒？ | D · 1 ms | Ts=1/fs 秒=1000/1000=1 ms。 | [3.9 取样定理](../content/signals/knowledge-base/ss-3-9.md) |
| sampling-period-v1 | 均匀采样率 fs=2000 Hz，采样周期是多少毫秒？ | A · 0.5 ms | Ts=1/fs 秒=1000/2000=0.5 ms。 | [3.9 取样定理](../content/signals/knowledge-base/ss-3-9.md) |
| sampling-period-v2 | 均匀采样率 fs=500 Hz，采样周期是多少毫秒？ | B · 2 ms | Ts=1/fs 秒=1000/500=2 ms。 | [3.9 取样定理](../content/signals/knowledge-base/ss-3-9.md) |
| dft-frequency-grid | fs=800 Hz，采集 400 个真实样本，不补零。DFT 频点间隔是多少 Hz？ | A · 2 Hz | Δf=fs/N=800/400=2 Hz；频点间隔不等于所有信号条件下的实际分辨能力。 | [A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| dft-frequency-grid-v1 | fs=1000 Hz，采集 200 个真实样本，不补零。DFT 频点间隔是多少 Hz？ | B · 5 Hz | Δf=fs/N=1000/200=5 Hz；频点间隔不等于所有信号条件下的实际分辨能力。 | [A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| dft-frequency-grid-v2 | fs=2000 Hz，采集 500 个真实样本，不补零。DFT 频点间隔是多少 Hz？ | C · 4 Hz | Δf=fs/N=2000/500=4 Hz；频点间隔不等于所有信号条件下的实际分辨能力。 | [A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| real-spectrum-conjugate | 实周期信号复系数 F₂=2+j(3)，F₋₂ 的虚部是多少？ | B · -3 | 实信号 F₋n=F_n*，虚部变号，所以为 -3。 | [3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| real-spectrum-conjugate-v1 | 实周期信号复系数 F₂=4+j(-2)，F₋₂ 的虚部是多少？ | C · 2 | 实信号 F₋n=F_n*，虚部变号，所以为 2。 | [3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| real-spectrum-conjugate-v2 | 实周期信号复系数 F₂=3+j(5)，F₋₂ 的虚部是多少？ | D · -5 | 实信号 F₋n=F_n*，虚部变号，所以为 -5。 | [3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| periodic-transform-weight | 周期信号复指数级数系数 F₁=2，傅里叶变换在 ω=Ω 的冲激系数为 Kπ，K 是多少？ | C · 4 | X(jω)=2πΣF_nδ(ω−nΩ)，因此 K=2F₁=4。 | [3.6 周期信号的傅里叶变换](../content/signals/knowledge-base/ss-3-6.md) |
| periodic-transform-weight-v1 | 周期信号复指数级数系数 F₁=3，傅里叶变换在 ω=Ω 的冲激系数为 Kπ，K 是多少？ | D · 6 | X(jω)=2πΣF_nδ(ω−nΩ)，因此 K=2F₁=6。 | [3.6 周期信号的傅里叶变换](../content/signals/knowledge-base/ss-3-6.md) |
| periodic-transform-weight-v2 | 周期信号复指数级数系数 F₁=4，傅里叶变换在 ω=Ω 的冲激系数为 Kπ，K 是多少？ | A · 8 | X(jω)=2πΣF_nδ(ω−nΩ)，因此 K=2F₁=8。 | [3.6 周期信号的傅里叶变换](../content/signals/knowledge-base/ss-3-6.md) |
| ext-period-ms-frequency-1 | 周期信号基本周期 T₀=3 ms，基频 f₀ 是多少 Hz？（选最接近值。） | A · 333.333333 Hz | 先将毫秒换算成秒，再用 f₀=1/T₀，即 f₀=1000/T₀(ms)。代入得 333.333333 Hz。 | [3.3 周期信号的频谱](../content/signals/knowledge-base/ss-3-3.md) |
| ext-period-ms-frequency-1-v1 | 周期信号基本周期 T₀=5 ms，基频 f₀ 是多少 Hz？ | B · 200 Hz | 先将毫秒换算成秒，再用 f₀=1/T₀，即 f₀=1000/T₀(ms)。代入得 200 Hz。 | [3.3 周期信号的频谱](../content/signals/knowledge-base/ss-3-3.md) |
| ext-period-ms-frequency-1-v2 | 周期信号基本周期 T₀=7 ms，基频 f₀ 是多少 Hz？（选最接近值。） | C · 142.857143 Hz | 先将毫秒换算成秒，再用 f₀=1/T₀，即 f₀=1000/T₀(ms)。代入得 142.857143 Hz。 | [3.3 周期信号的频谱](../content/signals/knowledge-base/ss-3-3.md) |
| ext-period-ms-frequency-2 | 周期信号基本周期 T₀=9 ms，基频 f₀ 是多少 Hz？（选最接近值。） | D · 111.111111 Hz | 先将毫秒换算成秒，再用 f₀=1/T₀，即 f₀=1000/T₀(ms)。代入得 111.111111 Hz。 | [3.3 周期信号的频谱](../content/signals/knowledge-base/ss-3-3.md) |
| ext-period-ms-frequency-2-v1 | 周期信号基本周期 T₀=11 ms，基频 f₀ 是多少 Hz？（选最接近值。） | A · 90.909091 Hz | 先将毫秒换算成秒，再用 f₀=1/T₀，即 f₀=1000/T₀(ms)。代入得 90.909091 Hz。 | [3.3 周期信号的频谱](../content/signals/knowledge-base/ss-3-3.md) |
| ext-period-ms-frequency-2-v2 | 周期信号基本周期 T₀=13 ms，基频 f₀ 是多少 Hz？（选最接近值。） | B · 76.923077 Hz | 先将毫秒换算成秒，再用 f₀=1/T₀，即 f₀=1000/T₀(ms)。代入得 76.923077 Hz。 | [3.3 周期信号的频谱](../content/signals/knowledge-base/ss-3-3.md) |
| ext-sine-series-imaginary-1 | 采用 x(t)=ΣCₖe^(jkω₀t)。x(t)=3sin(2t)，ω₀=2。C₁ 的虚部是多少？ | B · -1.5 | sin(ω₀t)=(e^(jω₀t)−e^(−jω₀t))/(2j)，因此 C₁=A/(2j)=−jA/2。代入得 -1.5。 | [3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| ext-sine-series-imaginary-1-v1 | 采用 x(t)=ΣCₖe^(jkω₀t)。x(t)=4sin(3t)，ω₀=3。C₁ 的虚部是多少？ | C · -2 | sin(ω₀t)=(e^(jω₀t)−e^(−jω₀t))/(2j)，因此 C₁=A/(2j)=−jA/2。代入得 -2。 | [3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| ext-sine-series-imaginary-1-v2 | 采用 x(t)=ΣCₖe^(jkω₀t)。x(t)=5sin(4t)，ω₀=4。C₁ 的虚部是多少？ | D · -2.5 | sin(ω₀t)=(e^(jω₀t)−e^(−jω₀t))/(2j)，因此 C₁=A/(2j)=−jA/2。代入得 -2.5。 | [3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| ext-sine-series-imaginary-2 | 采用 x(t)=ΣCₖe^(jkω₀t)。x(t)=6sin(5t)，ω₀=5。C₁ 的虚部是多少？ | A · -3 | sin(ω₀t)=(e^(jω₀t)−e^(−jω₀t))/(2j)，因此 C₁=A/(2j)=−jA/2。代入得 -3。 | [3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| ext-sine-series-imaginary-2-v1 | 采用 x(t)=ΣCₖe^(jkω₀t)。x(t)=7sin(6t)，ω₀=6。C₁ 的虚部是多少？ | B · -3.5 | sin(ω₀t)=(e^(jω₀t)−e^(−jω₀t))/(2j)，因此 C₁=A/(2j)=−jA/2。代入得 -3.5。 | [3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| ext-sine-series-imaginary-2-v2 | 采用 x(t)=ΣCₖe^(jkω₀t)。x(t)=8sin(7t)，ω₀=7。C₁ 的虚部是多少？ | C · -4 | sin(ω₀t)=(e^(jω₀t)−e^(−jω₀t))/(2j)，因此 C₁=A/(2j)=−jA/2。代入得 -4。 | [3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| ext-cosine-series-real-1 | 采用 x(t)=ΣCₖe^(jkt)。x(t)=2cos(t+60°)，C₁ 的实部是多少？ | C · 0.5 | 正频率系数为 C₁=(A/2)e^(jφ)，实部为 (A/2)cosφ；相位角按度换算。代入得 0.5。 | [3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| ext-cosine-series-real-1-v1 | 采用 x(t)=ΣCₖe^(jkt)。x(t)=3cos(t+120°)，C₁ 的实部是多少？ | D · -0.75 | 正频率系数为 C₁=(A/2)e^(jφ)，实部为 (A/2)cosφ；相位角按度换算。代入得 -0.75。 | [3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| ext-cosine-series-real-1-v2 | 采用 x(t)=ΣCₖe^(jkt)。x(t)=4cos(t+180°)，C₁ 的实部是多少？ | A · -2 | 正频率系数为 C₁=(A/2)e^(jφ)，实部为 (A/2)cosφ；相位角按度换算。代入得 -2。 | [3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| ext-cosine-series-real-2 | 采用 x(t)=ΣCₖe^(jkt)。x(t)=5cos(t+240°)，C₁ 的实部是多少？ | B · -1.25 | 正频率系数为 C₁=(A/2)e^(jφ)，实部为 (A/2)cosφ；相位角按度换算。代入得 -1.25。 | [3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| ext-cosine-series-real-2-v1 | 采用 x(t)=ΣCₖe^(jkt)。x(t)=6cos(t+0°)，C₁ 的实部是多少？ | C · 3 | 正频率系数为 C₁=(A/2)e^(jφ)，实部为 (A/2)cosφ；相位角按度换算。代入得 3。 | [3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| ext-cosine-series-real-2-v2 | 采用 x(t)=ΣCₖe^(jkt)。x(t)=8cos(t+90°)，C₁ 的实部是多少？ | D · 0 | 正频率系数为 C₁=(A/2)e^(jφ)，实部为 (A/2)cosφ；相位角按度换算。代入得 0。 | [3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| ext-series-parseval-power-1 | 指数傅里叶级数仅 C₀=1、C₁=2+j3、C₋₁=2−j3 非零。信号平均功率是多少？ | D · 27 | 帕塞瓦尔关系 P=Σ\|Cₖ\|²；正负频率各贡献一次，P=C₀²+2(Re(C₁)²+Im(C₁)²)。代入得 27。 | [3.1 正交分解与傅里叶级数的思想](../content/signals/knowledge-base/ss-3-1.md)；[3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| ext-series-parseval-power-1-v1 | 指数傅里叶级数仅 C₀=2、C₁=3+j4、C₋₁=3−j4 非零。信号平均功率是多少？ | A · 54 | 帕塞瓦尔关系 P=Σ\|Cₖ\|²；正负频率各贡献一次，P=C₀²+2(Re(C₁)²+Im(C₁)²)。代入得 54。 | [3.1 正交分解与傅里叶级数的思想](../content/signals/knowledge-base/ss-3-1.md)；[3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| ext-series-parseval-power-1-v2 | 指数傅里叶级数仅 C₀=3、C₁=4+j5、C₋₁=4−j5 非零。信号平均功率是多少？ | B · 91 | 帕塞瓦尔关系 P=Σ\|Cₖ\|²；正负频率各贡献一次，P=C₀²+2(Re(C₁)²+Im(C₁)²)。代入得 91。 | [3.1 正交分解与傅里叶级数的思想](../content/signals/knowledge-base/ss-3-1.md)；[3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| ext-series-parseval-power-2 | 指数傅里叶级数仅 C₀=4、C₁=5+j6、C₋₁=5−j6 非零。信号平均功率是多少？ | C · 138 | 帕塞瓦尔关系 P=Σ\|Cₖ\|²；正负频率各贡献一次，P=C₀²+2(Re(C₁)²+Im(C₁)²)。代入得 138。 | [3.1 正交分解与傅里叶级数的思想](../content/signals/knowledge-base/ss-3-1.md)；[3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| ext-series-parseval-power-2-v1 | 指数傅里叶级数仅 C₀=5、C₁=6+j7、C₋₁=6−j7 非零。信号平均功率是多少？ | D · 195 | 帕塞瓦尔关系 P=Σ\|Cₖ\|²；正负频率各贡献一次，P=C₀²+2(Re(C₁)²+Im(C₁)²)。代入得 195。 | [3.1 正交分解与傅里叶级数的思想](../content/signals/knowledge-base/ss-3-1.md)；[3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| ext-series-parseval-power-2-v2 | 指数傅里叶级数仅 C₀=6、C₁=7+j8、C₋₁=7−j8 非零。信号平均功率是多少？ | A · 262 | 帕塞瓦尔关系 P=Σ\|Cₖ\|²；正负频率各贡献一次，P=C₀²+2(Re(C₁)²+Im(C₁)²)。代入得 262。 | [3.1 正交分解与傅里叶级数的思想](../content/signals/knowledge-base/ss-3-1.md)；[3.2 周期信号的傅里叶级数](../content/signals/knowledge-base/ss-3-2.md) |
| ext-derivative-spectrum-1 | 采用 X(ω)=∫x(t)e^(−jωt)dt，x 满足微分性质条件。已知 \|X(3)\|=4。y=dx/dt，则 \|Y(3)\| 是多少？ | A · 12 | 时域微分对应 Y(ω)=jωX(ω)，幅度为 \|ω\|·\|X(ω)\|。代入得 12。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-derivative-spectrum-1-v1 | 采用 X(ω)=∫x(t)e^(−jωt)dt，x 满足微分性质条件。已知 \|X(4)\|=5。y=dx/dt，则 \|Y(4)\| 是多少？ | B · 20 | 时域微分对应 Y(ω)=jωX(ω)，幅度为 \|ω\|·\|X(ω)\|。代入得 20。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-derivative-spectrum-1-v2 | 采用 X(ω)=∫x(t)e^(−jωt)dt，x 满足微分性质条件。已知 \|X(5)\|=6。y=dx/dt，则 \|Y(5)\| 是多少？ | C · 30 | 时域微分对应 Y(ω)=jωX(ω)，幅度为 \|ω\|·\|X(ω)\|。代入得 30。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-derivative-spectrum-2 | 采用 X(ω)=∫x(t)e^(−jωt)dt，x 满足微分性质条件。已知 \|X(6)\|=7。y=dx/dt，则 \|Y(6)\| 是多少？ | D · 42 | 时域微分对应 Y(ω)=jωX(ω)，幅度为 \|ω\|·\|X(ω)\|。代入得 42。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-derivative-spectrum-2-v1 | 采用 X(ω)=∫x(t)e^(−jωt)dt，x 满足微分性质条件。已知 \|X(7)\|=8。y=dx/dt，则 \|Y(7)\| 是多少？ | A · 56 | 时域微分对应 Y(ω)=jωX(ω)，幅度为 \|ω\|·\|X(ω)\|。代入得 56。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-derivative-spectrum-2-v2 | 采用 X(ω)=∫x(t)e^(−jωt)dt，x 满足微分性质条件。已知 \|X(8)\|=9。y=dx/dt，则 \|Y(8)\| 是多少？ | B · 72 | 时域微分对应 Y(ω)=jωX(ω)，幅度为 \|ω\|·\|X(ω)\|。代入得 72。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-scaled-transform-area-1 | 可积信号 x(t) 满足 ∫x(t)dt=5。y(t)=3x(−2t)，采用 Y(ω)=∫y(t)e^(−jωt)dt。Y(0) 是多少？ | B · 7.5 | 零频值是面积，幅度因子只乘一次：Y(0)=kX(0)/\|a\|，不同于能量中的 k²。代入得 7.5。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-scaled-transform-area-1-v1 | 可积信号 x(t) 满足 ∫x(t)dt=6。y(t)=4x(−3t)，采用 Y(ω)=∫y(t)e^(−jωt)dt。Y(0) 是多少？ | C · 8 | 零频值是面积，幅度因子只乘一次：Y(0)=kX(0)/\|a\|，不同于能量中的 k²。代入得 8。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-scaled-transform-area-1-v2 | 可积信号 x(t) 满足 ∫x(t)dt=7。y(t)=5x(−4t)，采用 Y(ω)=∫y(t)e^(−jωt)dt。Y(0) 是多少？ | D · 8.75 | 零频值是面积，幅度因子只乘一次：Y(0)=kX(0)/\|a\|，不同于能量中的 k²。代入得 8.75。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-scaled-transform-area-2 | 可积信号 x(t) 满足 ∫x(t)dt=8。y(t)=6x(−5t)，采用 Y(ω)=∫y(t)e^(−jωt)dt。Y(0) 是多少？ | A · 9.6 | 零频值是面积，幅度因子只乘一次：Y(0)=kX(0)/\|a\|，不同于能量中的 k²。代入得 9.6。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-scaled-transform-area-2-v1 | 可积信号 x(t) 满足 ∫x(t)dt=9。y(t)=7x(−6t)，采用 Y(ω)=∫y(t)e^(−jωt)dt。Y(0) 是多少？ | B · 10.5 | 零频值是面积，幅度因子只乘一次：Y(0)=kX(0)/\|a\|，不同于能量中的 k²。代入得 10.5。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-scaled-transform-area-2-v2 | 可积信号 x(t) 满足 ∫x(t)dt=10。y(t)=8x(−7t)，采用 Y(ω)=∫y(t)e^(−jωt)dt。Y(0) 是多少？（选最接近值。） | C · 11.428571 | 零频值是面积，幅度因子只乘一次：Y(0)=kX(0)/\|a\|，不同于能量中的 k²。代入得 11.428571。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-exponential-spectrum-magnitude-1 | x(t)=2e^(−3t)u(t)，X(ω)=∫x(t)e^(−jωt)dt。\|X(4)\| 是多少？ | C · 0.4 | X(ω)=A/(a+jω)，分母模为 √(a²+ω²)，故 \|X\|=A/√(a²+ω²)。代入得 0.4。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| ext-exponential-spectrum-magnitude-1-v1 | x(t)=3e^(−4t)u(t)，X(ω)=∫x(t)e^(−jωt)dt。\|X(3)\| 是多少？ | D · 0.6 | X(ω)=A/(a+jω)，分母模为 √(a²+ω²)，故 \|X\|=A/√(a²+ω²)。代入得 0.6。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| ext-exponential-spectrum-magnitude-1-v2 | x(t)=4e^(−5t)u(t)，X(ω)=∫x(t)e^(−jωt)dt。\|X(12)\| 是多少？（选最接近值。） | A · 0.307692 | X(ω)=A/(a+jω)，分母模为 √(a²+ω²)，故 \|X\|=A/√(a²+ω²)。代入得 0.307692。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| ext-exponential-spectrum-magnitude-2 | x(t)=5e^(−12t)u(t)，X(ω)=∫x(t)e^(−jωt)dt。\|X(5)\| 是多少？（选最接近值。） | B · 0.384615 | X(ω)=A/(a+jω)，分母模为 √(a²+ω²)，故 \|X\|=A/√(a²+ω²)。代入得 0.384615。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| ext-exponential-spectrum-magnitude-2-v1 | x(t)=6e^(−8t)u(t)，X(ω)=∫x(t)e^(−jωt)dt。\|X(15)\| 是多少？（选最接近值。） | C · 0.352941 | X(ω)=A/(a+jω)，分母模为 √(a²+ω²)，故 \|X\|=A/√(a²+ω²)。代入得 0.352941。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| ext-exponential-spectrum-magnitude-2-v2 | x(t)=7e^(−15t)u(t)，X(ω)=∫x(t)e^(−jωt)dt。\|X(8)\| 是多少？（选最接近值。） | D · 0.411765 | X(ω)=A/(a+jω)，分母模为 √(a²+ω²)，故 \|X\|=A/√(a²+ω²)。代入得 0.411765。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| ext-bilateral-exponential-dc-1 | x(t)=2e^(−3\|t\|)，X(ω)=∫x(t)e^(−jωt)dt。X(0) 是多少？（选最接近值。） | D · 1.333333 | X(0) 等于信号面积；两侧各为 A/a，总面积为 2A/a。代入得 1.333333。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| ext-bilateral-exponential-dc-1-v1 | x(t)=3e^(−4\|t\|)，X(ω)=∫x(t)e^(−jωt)dt。X(0) 是多少？ | A · 1.5 | X(0) 等于信号面积；两侧各为 A/a，总面积为 2A/a。代入得 1.5。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| ext-bilateral-exponential-dc-1-v2 | x(t)=4e^(−5\|t\|)，X(ω)=∫x(t)e^(−jωt)dt。X(0) 是多少？ | B · 1.6 | X(0) 等于信号面积；两侧各为 A/a，总面积为 2A/a。代入得 1.6。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| ext-bilateral-exponential-dc-2 | x(t)=5e^(−6\|t\|)，X(ω)=∫x(t)e^(−jωt)dt。X(0) 是多少？（选最接近值。） | C · 1.666667 | X(0) 等于信号面积；两侧各为 A/a，总面积为 2A/a。代入得 1.666667。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| ext-bilateral-exponential-dc-2-v1 | x(t)=6e^(−7\|t\|)，X(ω)=∫x(t)e^(−jωt)dt。X(0) 是多少？（选最接近值。） | D · 1.714286 | X(0) 等于信号面积；两侧各为 A/a，总面积为 2A/a。代入得 1.714286。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| ext-bilateral-exponential-dc-2-v2 | x(t)=7e^(−8\|t\|)，X(ω)=∫x(t)e^(−jωt)dt。X(0) 是多少？ | A · 1.75 | X(0) 等于信号面积；两侧各为 A/a，总面积为 2A/a。代入得 1.75。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| ext-rectangle-spectrum-sample-1 | x(t) 在 \|t\|≤2/2 内为 2，外部为零。X(ω)=∫x(t)e^(−jωt)dt，X(π/2) 是多少？（选最接近值。） | A · 2.546479 | 对称矩形变换为 X(ω)=2A sin(ωT/2)/ω；代入 ω=π/T 得 2AT/π。代入得 2.546479。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| ext-rectangle-spectrum-sample-1-v1 | x(t) 在 \|t\|≤4/2 内为 3，外部为零。X(ω)=∫x(t)e^(−jωt)dt，X(π/4) 是多少？（选最接近值。） | B · 7.639437 | 对称矩形变换为 X(ω)=2A sin(ωT/2)/ω；代入 ω=π/T 得 2AT/π。代入得 7.639437。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| ext-rectangle-spectrum-sample-1-v2 | x(t) 在 \|t\|≤6/2 内为 4，外部为零。X(ω)=∫x(t)e^(−jωt)dt，X(π/6) 是多少？（选最接近值。） | C · 15.278875 | 对称矩形变换为 X(ω)=2A sin(ωT/2)/ω；代入 ω=π/T 得 2AT/π。代入得 15.278875。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| ext-rectangle-spectrum-sample-2 | x(t) 在 \|t\|≤8/2 内为 5，外部为零。X(ω)=∫x(t)e^(−jωt)dt，X(π/8) 是多少？（选最接近值。） | D · 25.464791 | 对称矩形变换为 X(ω)=2A sin(ωT/2)/ω；代入 ω=π/T 得 2AT/π。代入得 25.464791。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| ext-rectangle-spectrum-sample-2-v1 | x(t) 在 \|t\|≤10/2 内为 6，外部为零。X(ω)=∫x(t)e^(−jωt)dt，X(π/10) 是多少？（选最接近值。） | A · 38.197186 | 对称矩形变换为 X(ω)=2A sin(ωT/2)/ω；代入 ω=π/T 得 2AT/π。代入得 38.197186。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| ext-rectangle-spectrum-sample-2-v2 | x(t) 在 \|t\|≤12/2 内为 7，外部为零。X(ω)=∫x(t)e^(−jωt)dt，X(π/12) 是多少？（选最接近值。） | B · 53.476061 | 对称矩形变换为 X(ω)=2A sin(ωT/2)/ω；代入 ω=π/T 得 2AT/π。代入得 53.476061。 | [3.4 非周期信号与傅里叶变换](../content/signals/knowledge-base/ss-3-4.md)；[A.1 傅里叶变换常用对](../content/signals/knowledge-base/ss-a-1.md) |
| ext-delay-phase-degrees-1 | 纯延时系统 y(t)=x(t−5/1000)，时间单位 s。在 20 Hz 处，按 φ(f)=−360fT 的未折叠相位是多少度？ | B · -36° | 延时的频率响应为 e^(−j2πfT)，相位为 −360fT 度，本题不折叠到主值区间。代入得 -36°。 | [3.8 无失真传输与滤波](../content/signals/knowledge-base/ss-3-8.md) |
| ext-delay-phase-degrees-1-v1 | 纯延时系统 y(t)=x(t−10/1000)，时间单位 s。在 30 Hz 处，按 φ(f)=−360fT 的未折叠相位是多少度？ | C · -108° | 延时的频率响应为 e^(−j2πfT)，相位为 −360fT 度，本题不折叠到主值区间。代入得 -108°。 | [3.8 无失真传输与滤波](../content/signals/knowledge-base/ss-3-8.md) |
| ext-delay-phase-degrees-1-v2 | 纯延时系统 y(t)=x(t−15/1000)，时间单位 s。在 40 Hz 处，按 φ(f)=−360fT 的未折叠相位是多少度？ | D · -216° | 延时的频率响应为 e^(−j2πfT)，相位为 −360fT 度，本题不折叠到主值区间。代入得 -216°。 | [3.8 无失真传输与滤波](../content/signals/knowledge-base/ss-3-8.md) |
| ext-delay-phase-degrees-2 | 纯延时系统 y(t)=x(t−20/1000)，时间单位 s。在 50 Hz 处，按 φ(f)=−360fT 的未折叠相位是多少度？ | A · -360° | 延时的频率响应为 e^(−j2πfT)，相位为 −360fT 度，本题不折叠到主值区间。代入得 -360°。 | [3.8 无失真传输与滤波](../content/signals/knowledge-base/ss-3-8.md) |
| ext-delay-phase-degrees-2-v1 | 纯延时系统 y(t)=x(t−25/1000)，时间单位 s。在 60 Hz 处，按 φ(f)=−360fT 的未折叠相位是多少度？ | B · -540° | 延时的频率响应为 e^(−j2πfT)，相位为 −360fT 度，本题不折叠到主值区间。代入得 -540°。 | [3.8 无失真传输与滤波](../content/signals/knowledge-base/ss-3-8.md) |
| ext-delay-phase-degrees-2-v2 | 纯延时系统 y(t)=x(t−30/1000)，时间单位 s。在 70 Hz 处，按 φ(f)=−360fT 的未折叠相位是多少度？ | C · -756° | 延时的频率响应为 e^(−j2πfT)，相位为 −360fT 度，本题不折叠到主值区间。代入得 -756°。 | [3.8 无失真传输与滤波](../content/signals/knowledge-base/ss-3-8.md) |
| ext-delay-difference-notch-1 | 系统 y(t)=x(t)−x(t−2/1000)，时间单位 s。除直流外，幅频响应的第一个正频率零点是多少 Hz？ | C · 500 Hz | H(f)=1−e^(−j2πfT)，零点满足 fT 为整数；首个正频率为 1/T。代入得 500 Hz。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md)；[3.7 LTI系统的频域分析](../content/signals/knowledge-base/ss-3-7.md) |
| ext-delay-difference-notch-1-v1 | 系统 y(t)=x(t)−x(t−3/1000)，时间单位 s。除直流外，幅频响应的第一个正频率零点是多少 Hz？（选最接近值。） | D · 333.333333 Hz | H(f)=1−e^(−j2πfT)，零点满足 fT 为整数；首个正频率为 1/T。代入得 333.333333 Hz。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md)；[3.7 LTI系统的频域分析](../content/signals/knowledge-base/ss-3-7.md) |
| ext-delay-difference-notch-1-v2 | 系统 y(t)=x(t)−x(t−4/1000)，时间单位 s。除直流外，幅频响应的第一个正频率零点是多少 Hz？ | A · 250 Hz | H(f)=1−e^(−j2πfT)，零点满足 fT 为整数；首个正频率为 1/T。代入得 250 Hz。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md)；[3.7 LTI系统的频域分析](../content/signals/knowledge-base/ss-3-7.md) |
| ext-delay-difference-notch-2 | 系统 y(t)=x(t)−x(t−5/1000)，时间单位 s。除直流外，幅频响应的第一个正频率零点是多少 Hz？ | B · 200 Hz | H(f)=1−e^(−j2πfT)，零点满足 fT 为整数；首个正频率为 1/T。代入得 200 Hz。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md)；[3.7 LTI系统的频域分析](../content/signals/knowledge-base/ss-3-7.md) |
| ext-delay-difference-notch-2-v1 | 系统 y(t)=x(t)−x(t−6/1000)，时间单位 s。除直流外，幅频响应的第一个正频率零点是多少 Hz？（选最接近值。） | C · 166.666667 Hz | H(f)=1−e^(−j2πfT)，零点满足 fT 为整数；首个正频率为 1/T。代入得 166.666667 Hz。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md)；[3.7 LTI系统的频域分析](../content/signals/knowledge-base/ss-3-7.md) |
| ext-delay-difference-notch-2-v2 | 系统 y(t)=x(t)−x(t−7/1000)，时间单位 s。除直流外，幅频响应的第一个正频率零点是多少 Hz？（选最接近值。） | D · 142.857143 Hz | H(f)=1−e^(−j2πfT)，零点满足 fT 为整数；首个正频率为 1/T。代入得 142.857143 Hz。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md)；[3.7 LTI系统的频域分析](../content/signals/knowledge-base/ss-3-7.md) |
| ext-ideal-lowpass-output-power-1 | 理想低通在 \|f\|<20 Hz 时 H(f)=3，其余为零。输入 2cos(2π·10t)+4cos(2π·30t)，稳态输出功率是多少？ | D · 18 | 只保留低频分量，输出幅度为 GA，正弦平均功率为 (GA)²/2。代入得 18。 | [3.8 无失真传输与滤波](../content/signals/knowledge-base/ss-3-8.md)；[3.1 正交分解与傅里叶级数的思想](../content/signals/knowledge-base/ss-3-1.md) |
| ext-ideal-lowpass-output-power-1-v1 | 理想低通在 \|f\|<40 Hz 时 H(f)=4，其余为零。输入 3cos(2π·20t)+5cos(2π·60t)，稳态输出功率是多少？ | A · 72 | 只保留低频分量，输出幅度为 GA，正弦平均功率为 (GA)²/2。代入得 72。 | [3.8 无失真传输与滤波](../content/signals/knowledge-base/ss-3-8.md)；[3.1 正交分解与傅里叶级数的思想](../content/signals/knowledge-base/ss-3-1.md) |
| ext-ideal-lowpass-output-power-1-v2 | 理想低通在 \|f\|<60 Hz 时 H(f)=5，其余为零。输入 4cos(2π·30t)+6cos(2π·90t)，稳态输出功率是多少？ | B · 200 | 只保留低频分量，输出幅度为 GA，正弦平均功率为 (GA)²/2。代入得 200。 | [3.8 无失真传输与滤波](../content/signals/knowledge-base/ss-3-8.md)；[3.1 正交分解与傅里叶级数的思想](../content/signals/knowledge-base/ss-3-1.md) |
| ext-ideal-lowpass-output-power-2 | 理想低通在 \|f\|<80 Hz 时 H(f)=6，其余为零。输入 5cos(2π·40t)+7cos(2π·120t)，稳态输出功率是多少？ | C · 450 | 只保留低频分量，输出幅度为 GA，正弦平均功率为 (GA)²/2。代入得 450。 | [3.8 无失真传输与滤波](../content/signals/knowledge-base/ss-3-8.md)；[3.1 正交分解与傅里叶级数的思想](../content/signals/knowledge-base/ss-3-1.md) |
| ext-ideal-lowpass-output-power-2-v1 | 理想低通在 \|f\|<100 Hz 时 H(f)=7，其余为零。输入 6cos(2π·50t)+8cos(2π·150t)，稳态输出功率是多少？ | D · 882 | 只保留低频分量，输出幅度为 GA，正弦平均功率为 (GA)²/2。代入得 882。 | [3.8 无失真传输与滤波](../content/signals/knowledge-base/ss-3-8.md)；[3.1 正交分解与傅里叶级数的思想](../content/signals/knowledge-base/ss-3-1.md) |
| ext-ideal-lowpass-output-power-2-v2 | 理想低通在 \|f\|<120 Hz 时 H(f)=8，其余为零。输入 7cos(2π·60t)+9cos(2π·180t)，稳态输出功率是多少？ | A · 1568 | 只保留低频分量，输出幅度为 GA，正弦平均功率为 (GA)²/2。代入得 1568。 | [3.8 无失真传输与滤波](../content/signals/knowledge-base/ss-3-8.md)；[3.1 正交分解与傅里叶级数的思想](../content/signals/knowledge-base/ss-3-1.md) |
| ext-lowpass-sinusoid-amplitude-1 | 稳定一阶低通 H(jω)=2/(1+jω·0.1)，输入 3cos(4t)。稳态输出幅度是多少？（选最接近值。） | A · 5.57086 | 输出幅度为输入幅度乘 \|H(jω)\|：AK/√(1+(ωτ)²)。代入得 5.57086。 | [3.7 LTI系统的频域分析](../content/signals/knowledge-base/ss-3-7.md)；[4.10 零极点配置与一阶RC低通](../content/signals/knowledge-base/ss-5-10.md) |
| ext-lowpass-sinusoid-amplitude-1-v1 | 稳定一阶低通 H(jω)=3/(1+jω·0.2)，输入 4cos(5t)。稳态输出幅度是多少？（选最接近值。） | B · 8.485281 | 输出幅度为输入幅度乘 \|H(jω)\|：AK/√(1+(ωτ)²)。代入得 8.485281。 | [3.7 LTI系统的频域分析](../content/signals/knowledge-base/ss-3-7.md)；[4.10 零极点配置与一阶RC低通](../content/signals/knowledge-base/ss-5-10.md) |
| ext-lowpass-sinusoid-amplitude-1-v2 | 稳定一阶低通 H(jω)=4/(1+jω·0.3)，输入 5cos(6t)。稳态输出幅度是多少？（选最接近值。） | C · 9.712859 | 输出幅度为输入幅度乘 \|H(jω)\|：AK/√(1+(ωτ)²)。代入得 9.712859。 | [3.7 LTI系统的频域分析](../content/signals/knowledge-base/ss-3-7.md)；[4.10 零极点配置与一阶RC低通](../content/signals/knowledge-base/ss-5-10.md) |
| ext-lowpass-sinusoid-amplitude-2 | 稳定一阶低通 H(jω)=5/(1+jω·0.4)，输入 6cos(7t)。稳态输出幅度是多少？（选最接近值。） | D · 10.090092 | 输出幅度为输入幅度乘 \|H(jω)\|：AK/√(1+(ωτ)²)。代入得 10.090092。 | [3.7 LTI系统的频域分析](../content/signals/knowledge-base/ss-3-7.md)；[4.10 零极点配置与一阶RC低通](../content/signals/knowledge-base/ss-5-10.md) |
| ext-lowpass-sinusoid-amplitude-2-v1 | 稳定一阶低通 H(jω)=6/(1+jω·0.5)，输入 7cos(8t)。稳态输出幅度是多少？（选最接近值。） | A · 10.186496 | 输出幅度为输入幅度乘 \|H(jω)\|：AK/√(1+(ωτ)²)。代入得 10.186496。 | [3.7 LTI系统的频域分析](../content/signals/knowledge-base/ss-3-7.md)；[4.10 零极点配置与一阶RC低通](../content/signals/knowledge-base/ss-5-10.md) |
| ext-lowpass-sinusoid-amplitude-2-v2 | 稳定一阶低通 H(jω)=7/(1+jω·0.6)，输入 8cos(9t)。稳态输出幅度是多少？（选最接近值。） | B · 10.196999 | 输出幅度为输入幅度乘 \|H(jω)\|：AK/√(1+(ωτ)²)。代入得 10.196999。 | [3.7 LTI系统的频域分析](../content/signals/knowledge-base/ss-3-7.md)；[4.10 零极点配置与一阶RC低通](../content/signals/knowledge-base/ss-5-10.md) |
| ext-highpass-sinusoid-amplitude-1 | 稳定高通 H(jω)=jω/(3+jω)，输入 2cos(4t)。稳态输出幅度是多少？ | B · 1.6 | \|H(jω)\|=\|ω\|/√(a²+ω²)，再乘输入幅度。代入得 1.6。 | [3.7 LTI系统的频域分析](../content/signals/knowledge-base/ss-3-7.md)；[4.10 零极点配置与一阶RC低通](../content/signals/knowledge-base/ss-5-10.md) |
| ext-highpass-sinusoid-amplitude-1-v1 | 稳定高通 H(jω)=jω/(4+jω)，输入 3cos(3t)。稳态输出幅度是多少？ | C · 1.8 | \|H(jω)\|=\|ω\|/√(a²+ω²)，再乘输入幅度。代入得 1.8。 | [3.7 LTI系统的频域分析](../content/signals/knowledge-base/ss-3-7.md)；[4.10 零极点配置与一阶RC低通](../content/signals/knowledge-base/ss-5-10.md) |
| ext-highpass-sinusoid-amplitude-1-v2 | 稳定高通 H(jω)=jω/(5+jω)，输入 4cos(12t)。稳态输出幅度是多少？（选最接近值。） | D · 3.692308 | \|H(jω)\|=\|ω\|/√(a²+ω²)，再乘输入幅度。代入得 3.692308。 | [3.7 LTI系统的频域分析](../content/signals/knowledge-base/ss-3-7.md)；[4.10 零极点配置与一阶RC低通](../content/signals/knowledge-base/ss-5-10.md) |
| ext-highpass-sinusoid-amplitude-2 | 稳定高通 H(jω)=jω/(12+jω)，输入 5cos(5t)。稳态输出幅度是多少？（选最接近值。） | A · 1.923077 | \|H(jω)\|=\|ω\|/√(a²+ω²)，再乘输入幅度。代入得 1.923077。 | [3.7 LTI系统的频域分析](../content/signals/knowledge-base/ss-3-7.md)；[4.10 零极点配置与一阶RC低通](../content/signals/knowledge-base/ss-5-10.md) |
| ext-highpass-sinusoid-amplitude-2-v1 | 稳定高通 H(jω)=jω/(8+jω)，输入 6cos(15t)。稳态输出幅度是多少？（选最接近值。） | B · 5.294118 | \|H(jω)\|=\|ω\|/√(a²+ω²)，再乘输入幅度。代入得 5.294118。 | [3.7 LTI系统的频域分析](../content/signals/knowledge-base/ss-3-7.md)；[4.10 零极点配置与一阶RC低通](../content/signals/knowledge-base/ss-5-10.md) |
| ext-highpass-sinusoid-amplitude-2-v2 | 稳定高通 H(jω)=jω/(15+jω)，输入 7cos(8t)。稳态输出幅度是多少？（选最接近值。） | C · 3.294118 | \|H(jω)\|=\|ω\|/√(a²+ω²)，再乘输入幅度。代入得 3.294118。 | [3.7 LTI系统的频域分析](../content/signals/knowledge-base/ss-3-7.md)；[4.10 零极点配置与一阶RC低通](../content/signals/knowledge-base/ss-5-10.md) |
| ext-multiple-zone-alias-1 | 频率 930 Hz 的实余弦按 fs=300 Hz 采样，折叠到 [0,150] Hz 后的频率是多少？ | C · 30 Hz | 采样后相差整数倍 fs 的频率等价，实余弦还可折叠负频率：fa=\|f−round(f/fs)fs\|。代入得 30 Hz。 | [3.9 取样定理](../content/signals/knowledge-base/ss-3-9.md) |
| ext-multiple-zone-alias-1-v1 | 频率 1660 Hz 的实余弦按 fs=400 Hz 采样，折叠到 [0,200] Hz 后的频率是多少？ | D · 60 Hz | 采样后相差整数倍 fs 的频率等价，实余弦还可折叠负频率：fa=\|f−round(f/fs)fs\|。代入得 60 Hz。 | [3.9 取样定理](../content/signals/knowledge-base/ss-3-9.md) |
| ext-multiple-zone-alias-1-v2 | 频率 2590 Hz 的实余弦按 fs=500 Hz 采样，折叠到 [0,250] Hz 后的频率是多少？ | A · 90 Hz | 采样后相差整数倍 fs 的频率等价，实余弦还可折叠负频率：fa=\|f−round(f/fs)fs\|。代入得 90 Hz。 | [3.9 取样定理](../content/signals/knowledge-base/ss-3-9.md) |
| ext-multiple-zone-alias-2 | 频率 3720 Hz 的实余弦按 fs=600 Hz 采样，折叠到 [0,300] Hz 后的频率是多少？ | B · 120 Hz | 采样后相差整数倍 fs 的频率等价，实余弦还可折叠负频率：fa=\|f−round(f/fs)fs\|。代入得 120 Hz。 | [3.9 取样定理](../content/signals/knowledge-base/ss-3-9.md) |
| ext-multiple-zone-alias-2-v1 | 频率 5050 Hz 的实余弦按 fs=700 Hz 采样，折叠到 [0,350] Hz 后的频率是多少？ | C · 150 Hz | 采样后相差整数倍 fs 的频率等价，实余弦还可折叠负频率：fa=\|f−round(f/fs)fs\|。代入得 150 Hz。 | [3.9 取样定理](../content/signals/knowledge-base/ss-3-9.md) |
| ext-multiple-zone-alias-2-v2 | 频率 6580 Hz 的实余弦按 fs=800 Hz 采样，折叠到 [0,400] Hz 后的频率是多少？ | D · 180 Hz | 采样后相差整数倍 fs 的频率等价，实余弦还可折叠负频率：fa=\|f−round(f/fs)fs\|。代入得 180 Hz。 | [3.9 取样定理](../content/signals/knowledge-base/ss-3-9.md) |
| ext-normalized-cycles-1 | 模拟正弦频率 100 Hz，采样率 2000 Hz。归一化频率是多少周期/样本（不是 rad/sample）？ | D · 0.05 cycles/sample | 每个样本间隔内经历 f/fs 个周期；若用 rad/sample 才需再乘 2π。代入得 0.05 cycles/sample。 | [A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| ext-normalized-cycles-1-v1 | 模拟正弦频率 200 Hz，采样率 3000 Hz。归一化频率是多少周期/样本（不是 rad/sample）？（选最接近值。） | A · 0.066667 cycles/sample | 每个样本间隔内经历 f/fs 个周期；若用 rad/sample 才需再乘 2π。代入得 0.066667 cycles/sample。 | [A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| ext-normalized-cycles-1-v2 | 模拟正弦频率 300 Hz，采样率 4000 Hz。归一化频率是多少周期/样本（不是 rad/sample）？ | B · 0.075 cycles/sample | 每个样本间隔内经历 f/fs 个周期；若用 rad/sample 才需再乘 2π。代入得 0.075 cycles/sample。 | [A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| ext-normalized-cycles-2 | 模拟正弦频率 400 Hz，采样率 5000 Hz。归一化频率是多少周期/样本（不是 rad/sample）？ | C · 0.08 cycles/sample | 每个样本间隔内经历 f/fs 个周期；若用 rad/sample 才需再乘 2π。代入得 0.08 cycles/sample。 | [A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| ext-normalized-cycles-2-v1 | 模拟正弦频率 500 Hz，采样率 6000 Hz。归一化频率是多少周期/样本（不是 rad/sample）？（选最接近值。） | D · 0.083333 cycles/sample | 每个样本间隔内经历 f/fs 个周期；若用 rad/sample 才需再乘 2π。代入得 0.083333 cycles/sample。 | [A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| ext-normalized-cycles-2-v2 | 模拟正弦频率 600 Hz，采样率 7000 Hz。归一化频率是多少周期/样本（不是 rad/sample）？（选最接近值。） | A · 0.085714 cycles/sample | 每个样本间隔内经历 f/fs 个周期；若用 rad/sample 才需再乘 2π。代入得 0.085714 cycles/sample。 | [A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| ext-finite-record-samples-1 | 从 t=0 开始以 400 Hz 采样，仅保留 0≤t<0.1 s 的样本。样本数 N 是多少？ | A · 40 | 采样时刻为 n/fs，本题 fsT 为整数且不含右端点，n=0,…,fsT−1，共 fsT 个。代入得 40。 | [A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| ext-finite-record-samples-1-v1 | 从 t=0 开始以 600 Hz 采样，仅保留 0≤t<0.2 s 的样本。样本数 N 是多少？ | B · 120 | 采样时刻为 n/fs，本题 fsT 为整数且不含右端点，n=0,…,fsT−1，共 fsT 个。代入得 120。 | [A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| ext-finite-record-samples-1-v2 | 从 t=0 开始以 800 Hz 采样，仅保留 0≤t<0.3 s 的样本。样本数 N 是多少？ | C · 240 | 采样时刻为 n/fs，本题 fsT 为整数且不含右端点，n=0,…,fsT−1，共 fsT 个。代入得 240。 | [A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| ext-finite-record-samples-2 | 从 t=0 开始以 1000 Hz 采样，仅保留 0≤t<0.4 s 的样本。样本数 N 是多少？ | D · 400 | 采样时刻为 n/fs，本题 fsT 为整数且不含右端点，n=0,…,fsT−1，共 fsT 个。代入得 400。 | [A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| ext-finite-record-samples-2-v1 | 从 t=0 开始以 1200 Hz 采样，仅保留 0≤t<0.5 s 的样本。样本数 N 是多少？ | A · 600 | 采样时刻为 n/fs，本题 fsT 为整数且不含右端点，n=0,…,fsT−1，共 fsT 个。代入得 600。 | [A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| ext-finite-record-samples-2-v2 | 从 t=0 开始以 1400 Hz 采样，仅保留 0≤t<0.6 s 的样本。样本数 N 是多少？ | B · 840 | 采样时刻为 n/fs，本题 fsT 为整数且不含右端点，n=0,…,fsT−1，共 fsT 个。代入得 840。 | [A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| ext-dft-coherent-cosine-1 | x[n]=2cos(2π·3n/32)，n=0,…,31。采用未归一化 DFT：X[k]=Σx[n]e^(−j2πkn/32)，\|X[3]\| 是多少？ | B · 32 | 相干采样且频点不是直流或奈奎斯特点，余弦能量分布在两个频点，每个 DFT 幅值为 AN/2。代入得 32。 | [A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| ext-dft-coherent-cosine-1-v1 | x[n]=3cos(2π·4n/48)，n=0,…,47。采用未归一化 DFT：X[k]=Σx[n]e^(−j2πkn/48)，\|X[4]\| 是多少？ | C · 72 | 相干采样且频点不是直流或奈奎斯特点，余弦能量分布在两个频点，每个 DFT 幅值为 AN/2。代入得 72。 | [A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| ext-dft-coherent-cosine-1-v2 | x[n]=4cos(2π·5n/64)，n=0,…,63。采用未归一化 DFT：X[k]=Σx[n]e^(−j2πkn/64)，\|X[5]\| 是多少？ | D · 128 | 相干采样且频点不是直流或奈奎斯特点，余弦能量分布在两个频点，每个 DFT 幅值为 AN/2。代入得 128。 | [A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| ext-dft-coherent-cosine-2 | x[n]=5cos(2π·6n/80)，n=0,…,79。采用未归一化 DFT：X[k]=Σx[n]e^(−j2πkn/80)，\|X[6]\| 是多少？ | A · 200 | 相干采样且频点不是直流或奈奎斯特点，余弦能量分布在两个频点，每个 DFT 幅值为 AN/2。代入得 200。 | [A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| ext-dft-coherent-cosine-2-v1 | x[n]=6cos(2π·7n/96)，n=0,…,95。采用未归一化 DFT：X[k]=Σx[n]e^(−j2πkn/96)，\|X[7]\| 是多少？ | B · 288 | 相干采样且频点不是直流或奈奎斯特点，余弦能量分布在两个频点，每个 DFT 幅值为 AN/2。代入得 288。 | [A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| ext-dft-coherent-cosine-2-v2 | x[n]=7cos(2π·8n/112)，n=0,…,111。采用未归一化 DFT：X[k]=Σx[n]e^(−j2πkn/112)，\|X[8]\| 是多少？ | C · 392 | 相干采样且频点不是直流或奈奎斯特点，余弦能量分布在两个频点，每个 DFT 幅值为 AN/2。代入得 392。 | [A.6 采样与DFT参数速查](../content/signals/knowledge-base/ss-a-6.md) |
| ext-am-sideband-amplitude-1 | AM 信号 s(t)=3[1+0.1cos(2π·100t)]cos(2π·1000t)。上边带余弦分量的幅度是多少？ | C · 0.15 | 利用 cosαcosβ=[cos(α+β)+cos(α−β)]/2，每个边带幅度为 Acμ/2。代入得 0.15。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-am-sideband-amplitude-1-v1 | AM 信号 s(t)=4[1+0.2cos(2π·200t)]cos(2π·2000t)。上边带余弦分量的幅度是多少？ | D · 0.4 | 利用 cosαcosβ=[cos(α+β)+cos(α−β)]/2，每个边带幅度为 Acμ/2。代入得 0.4。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-am-sideband-amplitude-1-v2 | AM 信号 s(t)=5[1+0.3cos(2π·300t)]cos(2π·3000t)。上边带余弦分量的幅度是多少？ | A · 0.75 | 利用 cosαcosβ=[cos(α+β)+cos(α−β)]/2，每个边带幅度为 Acμ/2。代入得 0.75。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-am-sideband-amplitude-2 | AM 信号 s(t)=6[1+0.4cos(2π·400t)]cos(2π·4000t)。上边带余弦分量的幅度是多少？ | B · 1.2 | 利用 cosαcosβ=[cos(α+β)+cos(α−β)]/2，每个边带幅度为 Acμ/2。代入得 1.2。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-am-sideband-amplitude-2-v1 | AM 信号 s(t)=7[1+0.5cos(2π·500t)]cos(2π·5000t)。上边带余弦分量的幅度是多少？ | C · 1.75 | 利用 cosαcosβ=[cos(α+β)+cos(α−β)]/2，每个边带幅度为 Acμ/2。代入得 1.75。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-am-sideband-amplitude-2-v2 | AM 信号 s(t)=8[1+0.6cos(2π·600t)]cos(2π·6000t)。上边带余弦分量的幅度是多少？ | D · 2.4 | 利用 cosαcosβ=[cos(α+β)+cos(α−β)]/2，每个边带幅度为 Acμ/2。代入得 2.4。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-mixer-difference-frequency-1 | 110 kHz 余弦与 85 kHz 本振余弦相乘。理想低通只保留差频项，输出频率是多少？ | D · 25 kHz | 两余弦乘积产生和频与差频，低通保留 \|fRF−fLO\|。代入得 25 kHz。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-mixer-difference-frequency-1-v1 | 120 kHz 余弦与 90 kHz 本振余弦相乘。理想低通只保留差频项，输出频率是多少？ | A · 30 kHz | 两余弦乘积产生和频与差频，低通保留 \|fRF−fLO\|。代入得 30 kHz。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-mixer-difference-frequency-1-v2 | 130 kHz 余弦与 95 kHz 本振余弦相乘。理想低通只保留差频项，输出频率是多少？ | B · 35 kHz | 两余弦乘积产生和频与差频，低通保留 \|fRF−fLO\|。代入得 35 kHz。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-mixer-difference-frequency-2 | 140 kHz 余弦与 100 kHz 本振余弦相乘。理想低通只保留差频项，输出频率是多少？ | C · 40 kHz | 两余弦乘积产生和频与差频，低通保留 \|fRF−fLO\|。代入得 40 kHz。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-mixer-difference-frequency-2-v1 | 150 kHz 余弦与 105 kHz 本振余弦相乘。理想低通只保留差频项，输出频率是多少？ | D · 45 kHz | 两余弦乘积产生和频与差频，低通保留 \|fRF−fLO\|。代入得 45 kHz。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |
| ext-mixer-difference-frequency-2-v2 | 160 kHz 余弦与 110 kHz 本振余弦相乘。理想低通只保留差频项，输出频率是多少？ | A · 50 kHz | 两余弦乘积产生和频与差频，低通保留 \|fRF−fLO\|。代入得 50 kHz。 | [3.5 傅里叶变换的性质](../content/signals/knowledge-base/ss-3-5.md) |

### 第4章

| ID | 题目 | 正确答案 | 解析 | 讲义依据 |
| --- | --- | --- | --- | --- |
| right-half-plane | 因果、适当有理且已约分的连续 LTI 系统，若 H(s) 有右半平面极点，其 BIBO 稳定性如何？ | D · 不稳定 | 未对消的右半平面极点产生增长模态；因果 ROC 不含整个虚轴，所以不满足 BIBO 稳定。 | [4.6 系统稳定性](../content/signals/knowledge-base/ss-5-6.md) |
| right-half-plane-v1 | 因果有理系统有未对消单极点 s=+2 且留数非零，该极点对应的冲激响应模态怎样变化？ | D · 指数增长 | 该极点产生 e^(2t) 项，随时间增长。 | [4.6 系统稳定性](../content/signals/knowledge-base/ss-5-6.md) |
| right-half-plane-v2 | 因果系统 H(s)=1/(s+3)，其 BIBO 稳定性如何？ | A · 稳定 | 因果 ROC 为 Re(s)>−3，包含虚轴；冲激响应绝对可积。 | [4.6 系统稳定性](../content/signals/knowledge-base/ss-5-6.md) |
| imaginary-axis | 因果有理系统有一对未对消的单极点 s=±jω0（ω0>0），留数非零。这对极点对应的实冲激响应模态如何变化？ | A · 等幅振荡 | 单虚轴共轭极点对应等幅正弦模态；这里描述该对极点的分量，不代表含其他极点时的完整响应。 | [4.5 系统函数与零极点](../content/signals/knowledge-base/ss-5-5.md) |
| imaginary-axis-v1 | 简单极点 s=±j3 对应的自然响应特征是什么？ | A · 持续等幅振荡 | 实部为零，没有衰减或增长包络；虚部决定角频率。 | [4.5 系统函数与零极点](../content/signals/knowledge-base/ss-5-5.md) |
| imaginary-axis-v2 | 因果系统 H(s)=1/(s²+9) 是否 BIBO 稳定？ | B · 不稳定 | 因果 ROC 为 Re(s)>0，不包含虚轴；持续振荡的冲激响应不绝对可积。 | [4.5 系统函数与零极点](../content/signals/knowledge-base/ss-5-5.md) |
| laplace-right-roc | x=e^(−2t)u(t) 的双边拉氏 ROC 为 Re(s)>b，b 是多少？ | D · -2 | 积分收敛要求 Re(s+2)>0，所以 b=−2，边界不含。 | [4.1 拉普拉斯变换的定义与收敛域](../content/signals/knowledge-base/ss-5-1.md) |
| laplace-right-roc-v1 | x=e^(−3t)u(t) 的双边拉氏 ROC 为 Re(s)>b，b 是多少？ | A · -3 | 积分收敛要求 Re(s+3)>0，所以 b=−3，边界不含。 | [4.1 拉普拉斯变换的定义与收敛域](../content/signals/knowledge-base/ss-5-1.md) |
| laplace-right-roc-v2 | x=e^(−5t)u(t) 的双边拉氏 ROC 为 Re(s)>b，b 是多少？ | B · -5 | 积分收敛要求 Re(s+5)>0，所以 b=−5，边界不含。 | [4.1 拉普拉斯变换的定义与收敛域](../content/signals/knowledge-base/ss-5-1.md) |
| laplace-left-roc | X(s)=1/(s+2)，ROC 为 Re(s)<−2。其双边逆变换是什么？ | B · −e^(−2t)u(−t) | 左半平面 ROC 对应左边指数信号；积分给出负号。 | [4.1 拉普拉斯变换的定义与收敛域](../content/signals/knowledge-base/ss-5-1.md) |
| laplace-left-roc-v1 | X(s)=1/(s+3)，ROC 为 Re(s)<−3。其双边逆变换是什么？ | B · −e^(−3t)u(−t) | 左半平面 ROC 对应左边指数信号；积分给出负号。 | [4.1 拉普拉斯变换的定义与收敛域](../content/signals/knowledge-base/ss-5-1.md) |
| laplace-left-roc-v2 | X(s)=1/(s+4)，ROC 为 Re(s)<−4。其双边逆变换是什么？ | B · −e^(−4t)u(−t) | 左半平面 ROC 对应左边指数信号；积分给出负号。 | [4.1 拉普拉斯变换的定义与收敛域](../content/signals/knowledge-base/ss-5-1.md) |
| unilateral-derivative-value | 采用 0− 起点的单边拉氏变换，f(0−)=2，F(1)=5，L[f′] 在 s=1 的值是多少？ | B · 3 | L[f′]=sF−f(0−)=1×5−2=3。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| unilateral-derivative-value-v1 | 采用 0− 起点的单边拉氏变换，f(0−)=3，F(2)=4，L[f′] 在 s=2 的值是多少？ | C · 5 | L[f′]=sF−f(0−)=2×4−3=5。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| unilateral-derivative-value-v2 | 采用 0− 起点的单边拉氏变换，f(0−)=1，F(3)=3，L[f′] 在 s=3 的值是多少？ | D · 8 | L[f′]=sF−f(0−)=3×3−1=8。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| laplace-initial-value | 因果 F(s)=2/(s+3)，原信号无冲激，f(0+) 是多少？ | C · 2 | 初值定理 lim(s→∞)sF(s)=2。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| laplace-initial-value-v1 | 因果 F(s)=3/(s+4)，原信号无冲激，f(0+) 是多少？ | D · 3 | 初值定理 lim(s→∞)sF(s)=3。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| laplace-initial-value-v2 | 因果 F(s)=4/(s+5)，原信号无冲激，f(0+) 是多少？ | A · 4 | 初值定理 lim(s→∞)sF(s)=4。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| laplace-final-value | 因果 F(s)=6/[s(s+2)]，sF 的极点严格位于左半平面。f(∞) 是多少？ | D · 3 | 终值定理适用：lim(s→0)sF=6/2=3。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| laplace-final-value-v1 | 因果 F(s)=12/[s(s+3)]，sF 的极点严格位于左半平面。f(∞) 是多少？ | A · 4 | 终值定理适用：lim(s→0)sF=12/3=4。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| laplace-final-value-v2 | 因果 F(s)=8/[s(s+4)]，sF 的极点严格位于左半平面。f(∞) 是多少？ | B · 2 | 终值定理适用：lim(s→0)sF=8/4=2。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| laplace-repeated-pole | 因果 X(s)=6/(s+2)³，x(t)=A t²e^(−2t)u(t)，A 是多少？ | A · 3 | L[t²e^(−2t)u(t)]=2!/(s+2)³，所以 A=6/2=3。 | [4.3 拉普拉斯逆变换](../content/signals/knowledge-base/ss-5-3.md) |
| laplace-repeated-pole-v1 | 因果 X(s)=8/(s+3)³，x(t)=A t²e^(−3t)u(t)，A 是多少？ | B · 4 | L[t²e^(−3t)u(t)]=2!/(s+3)³，所以 A=8/2=4。 | [4.3 拉普拉斯逆变换](../content/signals/knowledge-base/ss-5-3.md) |
| laplace-repeated-pole-v2 | 因果 X(s)=10/(s+4)³，x(t)=A t²e^(−4t)u(t)，A 是多少？ | C · 5 | L[t²e^(−4t)u(t)]=2!/(s+4)³，所以 A=10/2=5。 | [4.3 拉普拉斯逆变换](../content/signals/knowledge-base/ss-5-3.md) |
| partial-fraction-residue | 1/[(s+1)(s+2)]=A/(s+1)+B/(s+2)，A 是多少？ | B · 1 | 两边乘(s+1)后代 s=−1，A=1/(2−1)=1。 | [4.3 拉普拉斯逆变换](../content/signals/knowledge-base/ss-5-3.md) |
| partial-fraction-residue-v1 | 1/[(s+2)(s+4)]=A/(s+2)+B/(s+4)，A 是多少？ | C · 0.5 | 两边乘(s+2)后代 s=−2，A=1/(4−2)=0.5。 | [4.3 拉普拉斯逆变换](../content/signals/knowledge-base/ss-5-3.md) |
| partial-fraction-residue-v2 | 1/[(s+3)(s+6)]=A/(s+3)+B/(s+6)，A 是多少？ | D · 0.333333 | 两边乘(s+3)后代 s=−3，A=1/(6−3)=0.333333。 | [4.3 拉普拉斯逆变换](../content/signals/knowledge-base/ss-5-3.md) |
| inductor-initial-term | 被动参考方向电感 L=2 H、i(0−)=3 A，单边拉氏 V=sLI+c，初始源常数项 c 是多少？ | C · -6 | V=L(sI−i(0−))，所以 c=−L i(0−)=-6。 | [4.4 电路的s域模型与微分方程变换解](../content/signals/knowledge-base/ss-5-4.md) |
| inductor-initial-term-v1 | 被动参考方向电感 L=3 H、i(0−)=2 A，单边拉氏 V=sLI+c，初始源常数项 c 是多少？ | D · -6 | V=L(sI−i(0−))，所以 c=−L i(0−)=-6。 | [4.4 电路的s域模型与微分方程变换解](../content/signals/knowledge-base/ss-5-4.md) |
| inductor-initial-term-v2 | 被动参考方向电感 L=4 H、i(0−)=2 A，单边拉氏 V=sLI+c，初始源常数项 c 是多少？ | A · -8 | V=L(sI−i(0−))，所以 c=−L i(0−)=-8。 | [4.4 电路的s域模型与微分方程变换解](../content/signals/knowledge-base/ss-5-4.md) |
| transfer-zero-location | 已约分 H(s)=(s+3)/[(s+1)(s+2)]，有限零点在哪里？ | D · -3 | 分子为零给出 s=−3，与分母无公因式。 | [4.5 系统函数与零极点](../content/signals/knowledge-base/ss-5-5.md) |
| transfer-zero-location-v1 | 已约分 H(s)=(s+4)/[(s+1)(s+3)]，有限零点在哪里？ | A · -4 | 分子为零给出 s=−4，与分母无公因式。 | [4.5 系统函数与零极点](../content/signals/knowledge-base/ss-5-5.md) |
| transfer-zero-location-v2 | 已约分 H(s)=(s+5)/[(s+2)(s+3)]，有限零点在哪里？ | B · -5 | 分子为零给出 s=−5，与分母无公因式。 | [4.5 系统函数与零极点](../content/signals/knowledge-base/ss-5-5.md) |
| transfer-rightmost-pole | H(s)=1/[(s+1)(s+3)]，最靠右的极点实部是多少？ | A · -1 | 极点为 −1、−3，较大的实部为 −1。 | [4.5 系统函数与零极点](../content/signals/knowledge-base/ss-5-5.md) |
| transfer-rightmost-pole-v1 | H(s)=1/[(s+2)(s+5)]，最靠右的极点实部是多少？ | B · -2 | 极点为 −2、−5，较大的实部为 −2。 | [4.5 系统函数与零极点](../content/signals/knowledge-base/ss-5-5.md) |
| transfer-rightmost-pole-v2 | H(s)=1/[(s+3)(s+6)]，最靠右的极点实部是多少？ | C · -3 | 极点为 −3、−6，较大的实部为 −3。 | [4.5 系统函数与零极点](../content/signals/knowledge-base/ss-5-5.md) |
| absolute-impulse-integral | h(t)=3e^(−2t)u(t)，∫\|h(t)\|dt 是多少？ | B · 1.5 | h 非负，绝对积分为 3/2=1.5<∞，该系统 BIBO 稳定。 | [4.6 系统稳定性](../content/signals/knowledge-base/ss-5-6.md) |
| absolute-impulse-integral-v1 | h(t)=4e^(−2t)u(t)，∫\|h(t)\|dt 是多少？ | C · 2 | h 非负，绝对积分为 4/2=2<∞，该系统 BIBO 稳定。 | [4.6 系统稳定性](../content/signals/knowledge-base/ss-5-6.md) |
| absolute-impulse-integral-v2 | h(t)=6e^(−3t)u(t)，∫\|h(t)\|dt 是多少？ | D · 2 | h 非负，绝对积分为 6/3=2<∞，该系统 BIBO 稳定。 | [4.6 系统稳定性](../content/signals/knowledge-base/ss-5-6.md) |
| amplitude-decibels | 幅值增益 \|H\|=10，用 20log10\|H\| 表示为多少 dB？ | C · 20 dB | 幅值比使用 20log10，得到 20 dB。 | [4.7 频率响应与滤波特性](../content/signals/knowledge-base/ss-5-7.md) |
| amplitude-decibels-v1 | 幅值增益 \|H\|=100，用 20log10\|H\| 表示为多少 dB？ | D · 40 dB | 幅值比使用 20log10，得到 40 dB。 | [4.7 频率响应与滤波特性](../content/signals/knowledge-base/ss-5-7.md) |
| amplitude-decibels-v2 | 幅值增益 \|H\|=1000，用 20log10\|H\| 表示为多少 dB？ | A · 60 dB | 幅值比使用 20log10，得到 60 dB。 | [4.7 频率响应与滤波特性](../content/signals/knowledge-base/ss-5-7.md) |
| lowpass-cutoff-radians | H(s)=2/(s+2)，−3 dB 截止角频率是多少 rad/s？ | D · 2 rad/s | 相对直流增益降为 1/√2 时 ω=2 rad/s；这里求角频率，不是 Hz。 | [4.7 频率响应与滤波特性](../content/signals/knowledge-base/ss-5-7.md) |
| lowpass-cutoff-radians-v1 | H(s)=4/(s+4)，−3 dB 截止角频率是多少 rad/s？ | A · 4 rad/s | 相对直流增益降为 1/√2 时 ω=4 rad/s；这里求角频率，不是 Hz。 | [4.7 频率响应与滤波特性](../content/signals/knowledge-base/ss-5-7.md) |
| lowpass-cutoff-radians-v2 | H(s)=5/(s+5)，−3 dB 截止角频率是多少 rad/s？ | B · 5 rad/s | 相对直流增益降为 1/√2 时 ω=5 rad/s；这里求角频率，不是 Hz。 | [4.7 频率响应与滤波特性](../content/signals/knowledge-base/ss-5-7.md) |
| mason-single-loop | 信号流图仅一条前向通路增益 P=6、一个接触通路的回路 L=-2。总传输增益是多少？ | A · 2 | 梅森公式 T=P/(1−L)=6/(1−(-2))=2。 | [4.8 s域框图、信号流图与梅森公式](../content/signals/knowledge-base/ss-5-8.md) |
| mason-single-loop-v1 | 信号流图仅一条前向通路增益 P=8、一个接触通路的回路 L=-3。总传输增益是多少？ | B · 2 | 梅森公式 T=P/(1−L)=8/(1−(-3))=2。 | [4.8 s域框图、信号流图与梅森公式](../content/signals/knowledge-base/ss-5-8.md) |
| mason-single-loop-v2 | 信号流图仅一条前向通路增益 P=10、一个接触通路的回路 L=-4。总传输增益是多少？ | C · 2 | 梅森公式 T=P/(1−L)=10/(1−(-4))=2。 | [4.8 s域框图、信号流图与梅森公式](../content/signals/knowledge-base/ss-5-8.md) |
| mason-two-loops | 仅有两个互不接触回路 L₁=0.5、L₂=0.25，梅森行列式 Δ 是多少？ | B · 0.375 | Δ=1−L₁−L₂+L₁L₂=(1−0.5)(1−0.25)=0.375。 | [4.8 s域框图、信号流图与梅森公式](../content/signals/knowledge-base/ss-5-8.md) |
| mason-two-loops-v1 | 仅有两个互不接触回路 L₁=0.25、L₂=0.5，梅森行列式 Δ 是多少？ | C · 0.375 | Δ=1−L₁−L₂+L₁L₂=(1−0.25)(1−0.5)=0.375。 | [4.8 s域框图、信号流图与梅森公式](../content/signals/knowledge-base/ss-5-8.md) |
| mason-two-loops-v2 | 仅有两个互不接触回路 L₁=0.5、L₂=0.125，梅森行列式 Δ 是多少？ | D · 0.4375 | Δ=1−L₁−L₂+L₁L₂=(1−0.5)(1−0.125)=0.4375。 | [4.8 s域框图、信号流图与梅森公式](../content/signals/knowledge-base/ss-5-8.md) |
| direct-two-integrators | 一个 2 阶、严格真有理传递函数采用标准连续直接 II 型实现，需要多少个积分器？ | C · 2 | 标准直接 II 型使用一条 2 级共享状态积分链，需要 2 个积分器。 | [4.9 连续系统的模拟结构](../content/signals/knowledge-base/ss-5-9.md) |
| direct-two-integrators-v1 | 一个 3 阶、严格真有理传递函数采用标准连续直接 II 型实现，需要多少个积分器？ | D · 3 | 标准直接 II 型使用一条 3 级共享状态积分链，需要 3 个积分器。 | [4.9 连续系统的模拟结构](../content/signals/knowledge-base/ss-5-9.md) |
| direct-two-integrators-v2 | 一个 4 阶、严格真有理传递函数采用标准连续直接 II 型实现，需要多少个积分器？ | A · 4 | 标准直接 II 型使用一条 4 级共享状态积分链，需要 4 个积分器。 | [4.9 连续系统的模拟结构](../content/signals/knowledge-base/ss-5-9.md) |
| rc-pole-location | 一阶 RC 低通时间常数 τ=0.1 s，其极点 s 是多少 s⁻¹？ | D · -10 s⁻¹ | H=1/(1+τs)，极点为 s=−1/τ=-10 s⁻¹。 | [4.10 零极点配置与一阶RC低通](../content/signals/knowledge-base/ss-5-10.md) |
| rc-pole-location-v1 | 一阶 RC 低通时间常数 τ=0.2 s，其极点 s 是多少 s⁻¹？ | A · -5 s⁻¹ | H=1/(1+τs)，极点为 s=−1/τ=-5 s⁻¹。 | [4.10 零极点配置与一阶RC低通](../content/signals/knowledge-base/ss-5-10.md) |
| rc-pole-location-v2 | 一阶 RC 低通时间常数 τ=0.5 s，其极点 s 是多少 s⁻¹？ | B · -2 s⁻¹ | H=1/(1+τs)，极点为 s=−1/τ=-2 s⁻¹。 | [4.10 零极点配置与一阶RC低通](../content/signals/knowledge-base/ss-5-10.md) |
| hidden-unstable-mode | 某实现内部含模态 e^(1t)，但在约分后的输入输出传递函数中被零点对消。能否据约分后 H(s) 断言内部渐近稳定？ | B · 不能，可能存在隐藏的不稳定模态 | 代数对消只描述输入输出关系，内部渐近稳定仍需检查完整状态矩阵。 | [4.6 系统稳定性](../content/signals/knowledge-base/ss-5-6.md) |
| hidden-unstable-mode-v1 | 某实现内部含模态 e^(2t)，但在约分后的输入输出传递函数中被零点对消。能否据约分后 H(s) 断言内部渐近稳定？ | B · 不能，可能存在隐藏的不稳定模态 | 代数对消只描述输入输出关系，内部渐近稳定仍需检查完整状态矩阵。 | [4.6 系统稳定性](../content/signals/knowledge-base/ss-5-6.md) |
| hidden-unstable-mode-v2 | 某实现内部含模态 e^(3t)，但在约分后的输入输出传递函数中被零点对消。能否据约分后 H(s) 断言内部渐近稳定？ | B · 不能，可能存在隐藏的不稳定模态 | 代数对消只描述输入输出关系，内部渐近稳定仍需检查完整状态矩阵。 | [4.6 系统稳定性](../content/signals/knowledge-base/ss-5-6.md) |
| ext-laplace-exponential-value-1 | x(t)=3e^(−2t)u(t)，求单边拉氏变换 X(4)。 | A · 0.5 | X(s)=A/(s+a)，给定 s 在 Re(s)>−a 的收敛域内。代入得 0.5。 | [4.1 拉普拉斯变换的定义与收敛域](../content/signals/knowledge-base/ss-5-1.md) |
| ext-laplace-exponential-value-1-v1 | x(t)=4e^(−3t)u(t)，求单边拉氏变换 X(5)。 | B · 0.5 | X(s)=A/(s+a)，给定 s 在 Re(s)>−a 的收敛域内。代入得 0.5。 | [4.1 拉普拉斯变换的定义与收敛域](../content/signals/knowledge-base/ss-5-1.md) |
| ext-laplace-exponential-value-1-v2 | x(t)=5e^(−4t)u(t)，求单边拉氏变换 X(6)。 | C · 0.5 | X(s)=A/(s+a)，给定 s 在 Re(s)>−a 的收敛域内。代入得 0.5。 | [4.1 拉普拉斯变换的定义与收敛域](../content/signals/knowledge-base/ss-5-1.md) |
| ext-laplace-exponential-value-2 | x(t)=6e^(−5t)u(t)，求单边拉氏变换 X(7)。 | D · 0.5 | X(s)=A/(s+a)，给定 s 在 Re(s)>−a 的收敛域内。代入得 0.5。 | [4.1 拉普拉斯变换的定义与收敛域](../content/signals/knowledge-base/ss-5-1.md) |
| ext-laplace-exponential-value-2-v1 | x(t)=7e^(−6t)u(t)，求单边拉氏变换 X(8)。 | A · 0.5 | X(s)=A/(s+a)，给定 s 在 Re(s)>−a 的收敛域内。代入得 0.5。 | [4.1 拉普拉斯变换的定义与收敛域](../content/signals/knowledge-base/ss-5-1.md) |
| ext-laplace-exponential-value-2-v2 | x(t)=8e^(−7t)u(t)，求单边拉氏变换 X(9)。 | B · 0.5 | X(s)=A/(s+a)，给定 s 在 Re(s)>−a 的收敛域内。代入得 0.5。 | [4.1 拉普拉斯变换的定义与收敛域](../content/signals/knowledge-base/ss-5-1.md) |
| ext-laplace-polynomial-value-1 | x(t)=t^1u(t)，求单边拉氏变换 X(2)。 | B · 0.25 | L[tⁿu(t)]=n!/s^(n+1)，注意分子是阶乘，Re(s)>0。代入得 0.25。 | [4.1 拉普拉斯变换的定义与收敛域](../content/signals/knowledge-base/ss-5-1.md) |
| ext-laplace-polynomial-value-1-v1 | x(t)=t^2u(t)，求单边拉氏变换 X(2)。 | C · 0.25 | L[tⁿu(t)]=n!/s^(n+1)，注意分子是阶乘，Re(s)>0。代入得 0.25。 | [4.1 拉普拉斯变换的定义与收敛域](../content/signals/knowledge-base/ss-5-1.md) |
| ext-laplace-polynomial-value-1-v2 | x(t)=t^3u(t)，求单边拉氏变换 X(2)。 | D · 0.375 | L[tⁿu(t)]=n!/s^(n+1)，注意分子是阶乘，Re(s)>0。代入得 0.375。 | [4.1 拉普拉斯变换的定义与收敛域](../content/signals/knowledge-base/ss-5-1.md) |
| ext-laplace-polynomial-value-2 | x(t)=t^4u(t)，求单边拉氏变换 X(2)。 | A · 0.75 | L[tⁿu(t)]=n!/s^(n+1)，注意分子是阶乘，Re(s)>0。代入得 0.75。 | [4.1 拉普拉斯变换的定义与收敛域](../content/signals/knowledge-base/ss-5-1.md) |
| ext-laplace-polynomial-value-2-v1 | x(t)=t^5u(t)，求单边拉氏变换 X(2)。 | B · 1.875 | L[tⁿu(t)]=n!/s^(n+1)，注意分子是阶乘，Re(s)>0。代入得 1.875。 | [4.1 拉普拉斯变换的定义与收敛域](../content/signals/knowledge-base/ss-5-1.md) |
| ext-laplace-polynomial-value-2-v2 | x(t)=t^6u(t)，求单边拉氏变换 X(2)。 | C · 5.625 | L[tⁿu(t)]=n!/s^(n+1)，注意分子是阶乘，Re(s)>0。代入得 5.625。 | [4.1 拉普拉斯变换的定义与收敛域](../content/signals/knowledge-base/ss-5-1.md) |
| ext-delayed-step-transform-1 | x(t)=2u(t−0.1)，求单边拉氏变换 X(2)。（选最接近值。） | C · 0.818731 | 延迟 T 的阶跃变换为 Ae^(−sT)/s，延迟因子不能遗漏。代入得 0.818731。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-delayed-step-transform-1-v1 | x(t)=3u(t−0.2)，求单边拉氏变换 X(3)。（选最接近值。） | D · 0.548812 | 延迟 T 的阶跃变换为 Ae^(−sT)/s，延迟因子不能遗漏。代入得 0.548812。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-delayed-step-transform-1-v2 | x(t)=4u(t−0.3)，求单边拉氏变换 X(4)。（选最接近值。） | A · 0.301194 | 延迟 T 的阶跃变换为 Ae^(−sT)/s，延迟因子不能遗漏。代入得 0.301194。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-delayed-step-transform-2 | x(t)=5u(t−0.4)，求单边拉氏变换 X(5)。（选最接近值。） | B · 0.135335 | 延迟 T 的阶跃变换为 Ae^(−sT)/s，延迟因子不能遗漏。代入得 0.135335。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-delayed-step-transform-2-v1 | x(t)=6u(t−0.5)，求单边拉氏变换 X(6)。（选最接近值。） | C · 0.049787 | 延迟 T 的阶跃变换为 Ae^(−sT)/s，延迟因子不能遗漏。代入得 0.049787。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-delayed-step-transform-2-v2 | x(t)=7u(t−0.6)，求单边拉氏变换 X(7)。（选最接近值。） | D · 0.014996 | 延迟 T 的阶跃变换为 Ae^(−sT)/s，延迟因子不能遗漏。代入得 0.014996。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-shifted-roc-boundary-1 | x(t)=e^(5t)e^(−2t)u(t)。双边拉氏收敛域为 Re(s)>b，b 是多少？ | D · 3 | 合并指数得到 e^((c−a)t)u(t)，或将原 ROC 右移 c，边界为 c−a。代入得 3。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-shifted-roc-boundary-1-v1 | x(t)=e^(7t)e^(−3t)u(t)。双边拉氏收敛域为 Re(s)>b，b 是多少？ | A · 4 | 合并指数得到 e^((c−a)t)u(t)，或将原 ROC 右移 c，边界为 c−a。代入得 4。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-shifted-roc-boundary-1-v2 | x(t)=e^(9t)e^(−4t)u(t)。双边拉氏收敛域为 Re(s)>b，b 是多少？ | B · 5 | 合并指数得到 e^((c−a)t)u(t)，或将原 ROC 右移 c，边界为 c−a。代入得 5。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-shifted-roc-boundary-2 | x(t)=e^(11t)e^(−5t)u(t)。双边拉氏收敛域为 Re(s)>b，b 是多少？ | C · 6 | 合并指数得到 e^((c−a)t)u(t)，或将原 ROC 右移 c，边界为 c−a。代入得 6。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-shifted-roc-boundary-2-v1 | x(t)=e^(13t)e^(−6t)u(t)。双边拉氏收敛域为 Re(s)>b，b 是多少？ | D · 7 | 合并指数得到 e^((c−a)t)u(t)，或将原 ROC 右移 c，边界为 c−a。代入得 7。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-shifted-roc-boundary-2-v2 | x(t)=e^(15t)e^(−7t)u(t)。双边拉氏收敛域为 Re(s)>b，b 是多少？ | A · 8 | 合并指数得到 e^((c−a)t)u(t)，或将原 ROC 右移 c，边界为 c−a。代入得 8。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-unilateral-second-derivative-1 | 采用从 0⁻ 开始的单边变换。F(2)=4，f(0⁻)=1，f′(0⁻)=3。L[f″] 在 s=2 处等于多少？ | A · 11 | 二阶微分要减去两个初始项：L[f″]=s²F(s)−sf(0⁻)−f′(0⁻)。代入得 11。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-unilateral-second-derivative-1-v1 | 采用从 0⁻ 开始的单边变换。F(3)=5，f(0⁻)=2，f′(0⁻)=4。L[f″] 在 s=3 处等于多少？ | B · 35 | 二阶微分要减去两个初始项：L[f″]=s²F(s)−sf(0⁻)−f′(0⁻)。代入得 35。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-unilateral-second-derivative-1-v2 | 采用从 0⁻ 开始的单边变换。F(4)=6，f(0⁻)=3，f′(0⁻)=5。L[f″] 在 s=4 处等于多少？ | C · 79 | 二阶微分要减去两个初始项：L[f″]=s²F(s)−sf(0⁻)−f′(0⁻)。代入得 79。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-unilateral-second-derivative-2 | 采用从 0⁻ 开始的单边变换。F(5)=7，f(0⁻)=4，f′(0⁻)=6。L[f″] 在 s=5 处等于多少？ | D · 149 | 二阶微分要减去两个初始项：L[f″]=s²F(s)−sf(0⁻)−f′(0⁻)。代入得 149。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-unilateral-second-derivative-2-v1 | 采用从 0⁻ 开始的单边变换。F(6)=8，f(0⁻)=5，f′(0⁻)=7。L[f″] 在 s=6 处等于多少？ | A · 251 | 二阶微分要减去两个初始项：L[f″]=s²F(s)−sf(0⁻)−f′(0⁻)。代入得 251。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-unilateral-second-derivative-2-v2 | 采用从 0⁻ 开始的单边变换。F(7)=9，f(0⁻)=6，f′(0⁻)=8。L[f″] 在 s=7 处等于多少？ | B · 391 | 二阶微分要减去两个初始项：L[f″]=s²F(s)−sf(0⁻)−f′(0⁻)。代入得 391。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-time-weighted-transform-1 | x(t)=3e^(−2t)u(t)，y(t)=t x(t)。单边拉氏变换 Y(4) 是多少？（选最接近值。） | B · 0.083333 | 时域乘 t 对应 −dX/ds。X=A/(s+a)，所以 Y=A/(s+a)²。代入得 0.083333。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-time-weighted-transform-1-v1 | x(t)=4e^(−3t)u(t)，y(t)=t x(t)。单边拉氏变换 Y(5) 是多少？ | C · 0.0625 | 时域乘 t 对应 −dX/ds。X=A/(s+a)，所以 Y=A/(s+a)²。代入得 0.0625。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-time-weighted-transform-1-v2 | x(t)=5e^(−4t)u(t)，y(t)=t x(t)。单边拉氏变换 Y(6) 是多少？ | D · 0.05 | 时域乘 t 对应 −dX/ds。X=A/(s+a)，所以 Y=A/(s+a)²。代入得 0.05。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-time-weighted-transform-2 | x(t)=6e^(−5t)u(t)，y(t)=t x(t)。单边拉氏变换 Y(7) 是多少？（选最接近值。） | A · 0.041667 | 时域乘 t 对应 −dX/ds。X=A/(s+a)，所以 Y=A/(s+a)²。代入得 0.041667。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-time-weighted-transform-2-v1 | x(t)=7e^(−6t)u(t)，y(t)=t x(t)。单边拉氏变换 Y(8) 是多少？（选最接近值。） | B · 0.035714 | 时域乘 t 对应 −dX/ds。X=A/(s+a)，所以 Y=A/(s+a)²。代入得 0.035714。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-time-weighted-transform-2-v2 | x(t)=8e^(−7t)u(t)，y(t)=t x(t)。单边拉氏变换 Y(9) 是多少？ | C · 0.03125 | 时域乘 t 对应 −dX/ds。X=A/(s+a)，所以 Y=A/(s+a)²。代入得 0.03125。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-integrated-transform-1 | x(t)=3e^(−2t)u(t)，y(t)=∫₀⁻ᵗx(τ)dτ。单边拉氏变换 Y(4) 是多少？ | C · 0.125 | 零初始积分对应 Y(s)=X(s)/s=A/[s(s+a)]。代入得 0.125。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-integrated-transform-1-v1 | x(t)=4e^(−3t)u(t)，y(t)=∫₀⁻ᵗx(τ)dτ。单边拉氏变换 Y(5) 是多少？ | D · 0.1 | 零初始积分对应 Y(s)=X(s)/s=A/[s(s+a)]。代入得 0.1。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-integrated-transform-1-v2 | x(t)=5e^(−4t)u(t)，y(t)=∫₀⁻ᵗx(τ)dτ。单边拉氏变换 Y(6) 是多少？（选最接近值。） | A · 0.083333 | 零初始积分对应 Y(s)=X(s)/s=A/[s(s+a)]。代入得 0.083333。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-integrated-transform-2 | x(t)=6e^(−5t)u(t)，y(t)=∫₀⁻ᵗx(τ)dτ。单边拉氏变换 Y(7) 是多少？（选最接近值。） | B · 0.071429 | 零初始积分对应 Y(s)=X(s)/s=A/[s(s+a)]。代入得 0.071429。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-integrated-transform-2-v1 | x(t)=7e^(−6t)u(t)，y(t)=∫₀⁻ᵗx(τ)dτ。单边拉氏变换 Y(8) 是多少？ | C · 0.0625 | 零初始积分对应 Y(s)=X(s)/s=A/[s(s+a)]。代入得 0.0625。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-integrated-transform-2-v2 | x(t)=8e^(−7t)u(t)，y(t)=∫₀⁻ᵗx(τ)dτ。单边拉氏变换 Y(9) 是多少？（选最接近值。） | D · 0.055556 | 零初始积分对应 Y(s)=X(s)/s=A/[s(s+a)]。代入得 0.055556。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-rational-initial-value-1 | 因果 F(s)=(3s+2)/[(s+4)(s+5)]，f 不含冲激。f(0⁺) 是多少？ | D · 3 | 初值定理 f(0⁺)=lim(s→∞)sF(s)，由最高次项的系数得到分子的一次项系数。代入得 3。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-rational-initial-value-1-v1 | 因果 F(s)=(4s+3)/[(s+5)(s+6)]，f 不含冲激。f(0⁺) 是多少？ | A · 4 | 初值定理 f(0⁺)=lim(s→∞)sF(s)，由最高次项的系数得到分子的一次项系数。代入得 4。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-rational-initial-value-1-v2 | 因果 F(s)=(5s+4)/[(s+6)(s+7)]，f 不含冲激。f(0⁺) 是多少？ | B · 5 | 初值定理 f(0⁺)=lim(s→∞)sF(s)，由最高次项的系数得到分子的一次项系数。代入得 5。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-rational-initial-value-2 | 因果 F(s)=(6s+5)/[(s+7)(s+8)]，f 不含冲激。f(0⁺) 是多少？ | C · 6 | 初值定理 f(0⁺)=lim(s→∞)sF(s)，由最高次项的系数得到分子的一次项系数。代入得 6。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-rational-initial-value-2-v1 | 因果 F(s)=(7s+6)/[(s+8)(s+9)]，f 不含冲激。f(0⁺) 是多少？ | D · 7 | 初值定理 f(0⁺)=lim(s→∞)sF(s)，由最高次项的系数得到分子的一次项系数。代入得 7。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-rational-initial-value-2-v2 | 因果 F(s)=(8s+7)/[(s+9)(s+10)]，f 不含冲激。f(0⁺) 是多少？ | A · 8 | 初值定理 f(0⁺)=lim(s→∞)sF(s)，由最高次项的系数得到分子的一次项系数。代入得 8。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-two-pole-final-value-1 | 因果 F(s)=5/[s(s+2)(s+3)]。f(t) 的终值是多少？（选最接近值。） | A · 0.833333 | sF 的极点均严格在左半平面，终值定理适用：lim(t→∞)f(t)=lim(s→0)sF(s)=K/(ab)。代入得 0.833333。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-two-pole-final-value-1-v1 | 因果 F(s)=6/[s(s+3)(s+4)]。f(t) 的终值是多少？ | B · 0.5 | sF 的极点均严格在左半平面，终值定理适用：lim(t→∞)f(t)=lim(s→0)sF(s)=K/(ab)。代入得 0.5。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-two-pole-final-value-1-v2 | 因果 F(s)=7/[s(s+4)(s+5)]。f(t) 的终值是多少？ | C · 0.35 | sF 的极点均严格在左半平面，终值定理适用：lim(t→∞)f(t)=lim(s→0)sF(s)=K/(ab)。代入得 0.35。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-two-pole-final-value-2 | 因果 F(s)=8/[s(s+5)(s+6)]。f(t) 的终值是多少？（选最接近值。） | D · 0.266667 | sF 的极点均严格在左半平面，终值定理适用：lim(t→∞)f(t)=lim(s→0)sF(s)=K/(ab)。代入得 0.266667。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-two-pole-final-value-2-v1 | 因果 F(s)=9/[s(s+6)(s+7)]。f(t) 的终值是多少？（选最接近值。） | A · 0.214286 | sF 的极点均严格在左半平面，终值定理适用：lim(t→∞)f(t)=lim(s→0)sF(s)=K/(ab)。代入得 0.214286。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-two-pole-final-value-2-v2 | 因果 F(s)=10/[s(s+7)(s+8)]。f(t) 的终值是多少？（选最接近值。） | B · 0.178571 | sF 的极点均严格在左半平面，终值定理适用：lim(t→∞)f(t)=lim(s→0)sF(s)=K/(ab)。代入得 0.178571。 | [4.2 拉普拉斯变换的性质](../content/signals/knowledge-base/ss-5-2.md) |
| ext-inverse-damped-sine-1 | 因果 F(s)=4/[(s+2)²+9]，f(t)=A e^(−2t)sin(3t)u(t)。A 是多少？（选最接近值。） | B · 1.333333 | L[e^(−at)sin(ωt)u(t)]=ω/[(s+a)²+ω²]，分子匹配要求 A=K/ω。代入得 1.333333。 | [4.3 拉普拉斯逆变换](../content/signals/knowledge-base/ss-5-3.md) |
| ext-inverse-damped-sine-1-v1 | 因果 F(s)=5/[(s+3)²+16]，f(t)=A e^(−3t)sin(4t)u(t)。A 是多少？ | C · 1.25 | L[e^(−at)sin(ωt)u(t)]=ω/[(s+a)²+ω²]，分子匹配要求 A=K/ω。代入得 1.25。 | [4.3 拉普拉斯逆变换](../content/signals/knowledge-base/ss-5-3.md) |
| ext-inverse-damped-sine-1-v2 | 因果 F(s)=6/[(s+4)²+25]，f(t)=A e^(−4t)sin(5t)u(t)。A 是多少？ | D · 1.2 | L[e^(−at)sin(ωt)u(t)]=ω/[(s+a)²+ω²]，分子匹配要求 A=K/ω。代入得 1.2。 | [4.3 拉普拉斯逆变换](../content/signals/knowledge-base/ss-5-3.md) |
| ext-inverse-damped-sine-2 | 因果 F(s)=7/[(s+5)²+36]，f(t)=A e^(−5t)sin(6t)u(t)。A 是多少？（选最接近值。） | A · 1.166667 | L[e^(−at)sin(ωt)u(t)]=ω/[(s+a)²+ω²]，分子匹配要求 A=K/ω。代入得 1.166667。 | [4.3 拉普拉斯逆变换](../content/signals/knowledge-base/ss-5-3.md) |
| ext-inverse-damped-sine-2-v1 | 因果 F(s)=8/[(s+6)²+49]，f(t)=A e^(−6t)sin(7t)u(t)。A 是多少？（选最接近值。） | B · 1.142857 | L[e^(−at)sin(ωt)u(t)]=ω/[(s+a)²+ω²]，分子匹配要求 A=K/ω。代入得 1.142857。 | [4.3 拉普拉斯逆变换](../content/signals/knowledge-base/ss-5-3.md) |
| ext-inverse-damped-sine-2-v2 | 因果 F(s)=9/[(s+7)²+64]，f(t)=A e^(−7t)sin(8t)u(t)。A 是多少？ | C · 1.125 | L[e^(−at)sin(ωt)u(t)]=ω/[(s+a)²+ω²]，分子匹配要求 A=K/ω。代入得 1.125。 | [4.3 拉普拉斯逆变换](../content/signals/knowledge-base/ss-5-3.md) |
| ext-numerator-residue-1 | F(s)=2(s+5)/[(s+1)(s+3)]。部分分式中 1/(s+1) 的系数是多少？ | C · 4 | 单极点留数为 lim(s→−a)(s+a)F(s)=K(z−a)/(b−a)。代入得 4。 | [4.3 拉普拉斯逆变换](../content/signals/knowledge-base/ss-5-3.md) |
| ext-numerator-residue-1-v1 | F(s)=3(s+6)/[(s+2)(s+4)]。部分分式中 1/(s+2) 的系数是多少？ | D · 6 | 单极点留数为 lim(s→−a)(s+a)F(s)=K(z−a)/(b−a)。代入得 6。 | [4.3 拉普拉斯逆变换](../content/signals/knowledge-base/ss-5-3.md) |
| ext-numerator-residue-1-v2 | F(s)=4(s+7)/[(s+3)(s+5)]。部分分式中 1/(s+3) 的系数是多少？ | A · 8 | 单极点留数为 lim(s→−a)(s+a)F(s)=K(z−a)/(b−a)。代入得 8。 | [4.3 拉普拉斯逆变换](../content/signals/knowledge-base/ss-5-3.md) |
| ext-numerator-residue-2 | F(s)=5(s+8)/[(s+4)(s+6)]。部分分式中 1/(s+4) 的系数是多少？ | B · 10 | 单极点留数为 lim(s→−a)(s+a)F(s)=K(z−a)/(b−a)。代入得 10。 | [4.3 拉普拉斯逆变换](../content/signals/knowledge-base/ss-5-3.md) |
| ext-numerator-residue-2-v1 | F(s)=6(s+9)/[(s+5)(s+7)]。部分分式中 1/(s+5) 的系数是多少？ | C · 12 | 单极点留数为 lim(s→−a)(s+a)F(s)=K(z−a)/(b−a)。代入得 12。 | [4.3 拉普拉斯逆变换](../content/signals/knowledge-base/ss-5-3.md) |
| ext-numerator-residue-2-v2 | F(s)=7(s+10)/[(s+6)(s+8)]。部分分式中 1/(s+6) 的系数是多少？ | D · 14 | 单极点留数为 lim(s→−a)(s+a)F(s)=K(z−a)/(b−a)。代入得 14。 | [4.3 拉普拉斯逆变换](../content/signals/knowledge-base/ss-5-3.md) |
| ext-direct-impulse-coefficient-1 | 因果系统 H(s)=(3s+5)/(2s+4)。冲激响应中 δ(t) 的系数是多少？ | D · 1.5 | 分子分母同阶，先长除；商为最高次项系数比 b/a，对应冲激直接项。代入得 1.5。 | [4.3 拉普拉斯逆变换](../content/signals/knowledge-base/ss-5-3.md) |
| ext-direct-impulse-coefficient-1-v1 | 因果系统 H(s)=(4s+6)/(3s+5)。冲激响应中 δ(t) 的系数是多少？（选最接近值。） | A · 1.333333 | 分子分母同阶，先长除；商为最高次项系数比 b/a，对应冲激直接项。代入得 1.333333。 | [4.3 拉普拉斯逆变换](../content/signals/knowledge-base/ss-5-3.md) |
| ext-direct-impulse-coefficient-1-v2 | 因果系统 H(s)=(5s+7)/(4s+6)。冲激响应中 δ(t) 的系数是多少？ | B · 1.25 | 分子分母同阶，先长除；商为最高次项系数比 b/a，对应冲激直接项。代入得 1.25。 | [4.3 拉普拉斯逆变换](../content/signals/knowledge-base/ss-5-3.md) |
| ext-direct-impulse-coefficient-2 | 因果系统 H(s)=(6s+8)/(5s+7)。冲激响应中 δ(t) 的系数是多少？ | C · 1.2 | 分子分母同阶，先长除；商为最高次项系数比 b/a，对应冲激直接项。代入得 1.2。 | [4.3 拉普拉斯逆变换](../content/signals/knowledge-base/ss-5-3.md) |
| ext-direct-impulse-coefficient-2-v1 | 因果系统 H(s)=(7s+9)/(6s+8)。冲激响应中 δ(t) 的系数是多少？（选最接近值。） | D · 1.166667 | 分子分母同阶，先长除；商为最高次项系数比 b/a，对应冲激直接项。代入得 1.166667。 | [4.3 拉普拉斯逆变换](../content/signals/knowledge-base/ss-5-3.md) |
| ext-direct-impulse-coefficient-2-v2 | 因果系统 H(s)=(8s+10)/(7s+9)。冲激响应中 δ(t) 的系数是多少？（选最接近值。） | A · 1.142857 | 分子分母同阶，先长除；商为最高次项系数比 b/a，对应冲激直接项。代入得 1.142857。 | [4.3 拉普拉斯逆变换](../content/signals/knowledge-base/ss-5-3.md) |
| ext-capacitor-initial-current-term-1 | 被动参考方向电容 C=0.1 F，v(0⁻)=3 V。单边变换 I(s)=sCV(s)+q，常数项 q 的数值是多少？ | A · -0.3 | 由 i=C dv/dt，单边变换得到 I=sCV−Cv(0⁻)，初始项为负号。代入得 -0.3。 | [4.4 电路的s域模型与微分方程变换解](../content/signals/knowledge-base/ss-5-4.md) |
| ext-capacitor-initial-current-term-1-v1 | 被动参考方向电容 C=0.2 F，v(0⁻)=4 V。单边变换 I(s)=sCV(s)+q，常数项 q 的数值是多少？ | B · -0.8 | 由 i=C dv/dt，单边变换得到 I=sCV−Cv(0⁻)，初始项为负号。代入得 -0.8。 | [4.4 电路的s域模型与微分方程变换解](../content/signals/knowledge-base/ss-5-4.md) |
| ext-capacitor-initial-current-term-1-v2 | 被动参考方向电容 C=0.3 F，v(0⁻)=5 V。单边变换 I(s)=sCV(s)+q，常数项 q 的数值是多少？ | C · -1.5 | 由 i=C dv/dt，单边变换得到 I=sCV−Cv(0⁻)，初始项为负号。代入得 -1.5。 | [4.4 电路的s域模型与微分方程变换解](../content/signals/knowledge-base/ss-5-4.md) |
| ext-capacitor-initial-current-term-2 | 被动参考方向电容 C=0.4 F，v(0⁻)=6 V。单边变换 I(s)=sCV(s)+q，常数项 q 的数值是多少？ | D · -2.4 | 由 i=C dv/dt，单边变换得到 I=sCV−Cv(0⁻)，初始项为负号。代入得 -2.4。 | [4.4 电路的s域模型与微分方程变换解](../content/signals/knowledge-base/ss-5-4.md) |
| ext-capacitor-initial-current-term-2-v1 | 被动参考方向电容 C=0.5 F，v(0⁻)=7 V。单边变换 I(s)=sCV(s)+q，常数项 q 的数值是多少？ | A · -3.5 | 由 i=C dv/dt，单边变换得到 I=sCV−Cv(0⁻)，初始项为负号。代入得 -3.5。 | [4.4 电路的s域模型与微分方程变换解](../content/signals/knowledge-base/ss-5-4.md) |
| ext-capacitor-initial-current-term-2-v2 | 被动参考方向电容 C=0.6 F，v(0⁻)=8 V。单边变换 I(s)=sCV(s)+q，常数项 q 的数值是多少？ | B · -4.8 | 由 i=C dv/dt，单边变换得到 I=sCV−Cv(0⁻)，初始项为负号。代入得 -4.8。 | [4.4 电路的s域模型与微分方程变换解](../content/signals/knowledge-base/ss-5-4.md) |
| ext-inductor-s-impedance-1 | 零初始电流的理想电感 L=2 H，在 s=3 s⁻¹ 处的 s 域阻抗是多少？ | B · 6 Ω | 零初始状态下电感满足 V(s)=sLI(s)，故 ZL(s)=sL。代入得 6 Ω。 | [4.4 电路的s域模型与微分方程变换解](../content/signals/knowledge-base/ss-5-4.md) |
| ext-inductor-s-impedance-1-v1 | 零初始电流的理想电感 L=3 H，在 s=4 s⁻¹ 处的 s 域阻抗是多少？ | C · 12 Ω | 零初始状态下电感满足 V(s)=sLI(s)，故 ZL(s)=sL。代入得 12 Ω。 | [4.4 电路的s域模型与微分方程变换解](../content/signals/knowledge-base/ss-5-4.md) |
| ext-inductor-s-impedance-1-v2 | 零初始电流的理想电感 L=4 H，在 s=5 s⁻¹ 处的 s 域阻抗是多少？ | D · 20 Ω | 零初始状态下电感满足 V(s)=sLI(s)，故 ZL(s)=sL。代入得 20 Ω。 | [4.4 电路的s域模型与微分方程变换解](../content/signals/knowledge-base/ss-5-4.md) |
| ext-inductor-s-impedance-2 | 零初始电流的理想电感 L=5 H，在 s=6 s⁻¹ 处的 s 域阻抗是多少？ | A · 30 Ω | 零初始状态下电感满足 V(s)=sLI(s)，故 ZL(s)=sL。代入得 30 Ω。 | [4.4 电路的s域模型与微分方程变换解](../content/signals/knowledge-base/ss-5-4.md) |
| ext-inductor-s-impedance-2-v1 | 零初始电流的理想电感 L=6 H，在 s=7 s⁻¹ 处的 s 域阻抗是多少？ | B · 42 Ω | 零初始状态下电感满足 V(s)=sLI(s)，故 ZL(s)=sL。代入得 42 Ω。 | [4.4 电路的s域模型与微分方程变换解](../content/signals/knowledge-base/ss-5-4.md) |
| ext-inductor-s-impedance-2-v2 | 零初始电流的理想电感 L=7 H，在 s=8 s⁻¹ 处的 s 域阻抗是多少？ | C · 56 Ω | 零初始状态下电感满足 V(s)=sLI(s)，故 ZL(s)=sL。代入得 56 Ω。 | [4.4 电路的s域模型与微分方程变换解](../content/signals/knowledge-base/ss-5-4.md) |
| ext-routh-stable-bound-1 | 因果系统 H(s)=1/(s³+3s²+4s+k)，k>0。BIBO 稳定区间为 0<k<K，严格上界 K 是多少？ | C · 12 | 三阶劳斯首列为 1、a、(ab−k)/a、k。严格稳定要求全为正，故 0<k<ab；等号不稳定。代入得 12。 | [4.6 系统稳定性](../content/signals/knowledge-base/ss-5-6.md) |
| ext-routh-stable-bound-1-v1 | 因果系统 H(s)=1/(s³+4s²+5s+k)，k>0。BIBO 稳定区间为 0<k<K，严格上界 K 是多少？ | D · 20 | 三阶劳斯首列为 1、a、(ab−k)/a、k。严格稳定要求全为正，故 0<k<ab；等号不稳定。代入得 20。 | [4.6 系统稳定性](../content/signals/knowledge-base/ss-5-6.md) |
| ext-routh-stable-bound-1-v2 | 因果系统 H(s)=1/(s³+5s²+6s+k)，k>0。BIBO 稳定区间为 0<k<K，严格上界 K 是多少？ | A · 30 | 三阶劳斯首列为 1、a、(ab−k)/a、k。严格稳定要求全为正，故 0<k<ab；等号不稳定。代入得 30。 | [4.6 系统稳定性](../content/signals/knowledge-base/ss-5-6.md) |
| ext-routh-stable-bound-2 | 因果系统 H(s)=1/(s³+6s²+7s+k)，k>0。BIBO 稳定区间为 0<k<K，严格上界 K 是多少？ | B · 42 | 三阶劳斯首列为 1、a、(ab−k)/a、k。严格稳定要求全为正，故 0<k<ab；等号不稳定。代入得 42。 | [4.6 系统稳定性](../content/signals/knowledge-base/ss-5-6.md) |
| ext-routh-stable-bound-2-v1 | 因果系统 H(s)=1/(s³+7s²+8s+k)，k>0。BIBO 稳定区间为 0<k<K，严格上界 K 是多少？ | C · 56 | 三阶劳斯首列为 1、a、(ab−k)/a、k。严格稳定要求全为正，故 0<k<ab；等号不稳定。代入得 56。 | [4.6 系统稳定性](../content/signals/knowledge-base/ss-5-6.md) |
| ext-routh-stable-bound-2-v2 | 因果系统 H(s)=1/(s³+8s²+9s+k)，k>0。BIBO 稳定区间为 0<k<K，严格上界 K 是多少？ | D · 72 | 三阶劳斯首列为 1、a、(ab−k)/a、k。严格稳定要求全为正，故 0<k<ab；等号不稳定。代入得 72。 | [4.6 系统稳定性](../content/signals/knowledge-base/ss-5-6.md) |
| ext-routh-first-column-1 | 多项式 D(s)=s³+3s²+4s+2。按标准劳斯表计算，s¹ 行首列元素是多少？（选最接近值。） | D · 3.333333 | 前两行为 [1,b]、[a,c]，第三行首项为 (ab−c)/a。代入得 3.333333。 | [4.6 系统稳定性](../content/signals/knowledge-base/ss-5-6.md) |
| ext-routh-first-column-1-v1 | 多项式 D(s)=s³+4s²+5s+3。按标准劳斯表计算，s¹ 行首列元素是多少？ | A · 4.25 | 前两行为 [1,b]、[a,c]，第三行首项为 (ab−c)/a。代入得 4.25。 | [4.6 系统稳定性](../content/signals/knowledge-base/ss-5-6.md) |
| ext-routh-first-column-1-v2 | 多项式 D(s)=s³+5s²+6s+4。按标准劳斯表计算，s¹ 行首列元素是多少？ | B · 5.2 | 前两行为 [1,b]、[a,c]，第三行首项为 (ab−c)/a。代入得 5.2。 | [4.6 系统稳定性](../content/signals/knowledge-base/ss-5-6.md) |
| ext-routh-first-column-2 | 多项式 D(s)=s³+6s²+7s+5。按标准劳斯表计算，s¹ 行首列元素是多少？（选最接近值。） | C · 6.166667 | 前两行为 [1,b]、[a,c]，第三行首项为 (ab−c)/a。代入得 6.166667。 | [4.6 系统稳定性](../content/signals/knowledge-base/ss-5-6.md) |
| ext-routh-first-column-2-v1 | 多项式 D(s)=s³+7s²+8s+6。按标准劳斯表计算，s¹ 行首列元素是多少？（选最接近值。） | D · 7.142857 | 前两行为 [1,b]、[a,c]，第三行首项为 (ab−c)/a。代入得 7.142857。 | [4.6 系统稳定性](../content/signals/knowledge-base/ss-5-6.md) |
| ext-routh-first-column-2-v2 | 多项式 D(s)=s³+8s²+9s+7。按标准劳斯表计算，s¹ 行首列元素是多少？ | A · 8.125 | 前两行为 [1,b]、[a,c]，第三行首项为 (ab−c)/a。代入得 8.125。 | [4.6 系统稳定性](../content/signals/knowledge-base/ss-5-6.md) |
| ext-negative-feedback-gain-1 | 静态负反馈框图满足 e=r−0.1y，y=2e。闭环增益 y/r 是多少？（选最接近值。） | A · 1.666667 | 联立 y=G(r−Hy)，得 (1+GH)y=Gr，所以 T=G/(1+GH)。代入得 1.666667。 | [4.8 s域框图、信号流图与梅森公式](../content/signals/knowledge-base/ss-5-8.md) |
| ext-negative-feedback-gain-1-v1 | 静态负反馈框图满足 e=r−0.2y，y=3e。闭环增益 y/r 是多少？ | B · 1.875 | 联立 y=G(r−Hy)，得 (1+GH)y=Gr，所以 T=G/(1+GH)。代入得 1.875。 | [4.8 s域框图、信号流图与梅森公式](../content/signals/knowledge-base/ss-5-8.md) |
| ext-negative-feedback-gain-1-v2 | 静态负反馈框图满足 e=r−0.3y，y=4e。闭环增益 y/r 是多少？（选最接近值。） | C · 1.818182 | 联立 y=G(r−Hy)，得 (1+GH)y=Gr，所以 T=G/(1+GH)。代入得 1.818182。 | [4.8 s域框图、信号流图与梅森公式](../content/signals/knowledge-base/ss-5-8.md) |
| ext-negative-feedback-gain-2 | 静态负反馈框图满足 e=r−0.4y，y=5e。闭环增益 y/r 是多少？（选最接近值。） | D · 1.666667 | 联立 y=G(r−Hy)，得 (1+GH)y=Gr，所以 T=G/(1+GH)。代入得 1.666667。 | [4.8 s域框图、信号流图与梅森公式](../content/signals/knowledge-base/ss-5-8.md) |
| ext-negative-feedback-gain-2-v1 | 静态负反馈框图满足 e=r−0.5y，y=6e。闭环增益 y/r 是多少？ | A · 1.5 | 联立 y=G(r−Hy)，得 (1+GH)y=Gr，所以 T=G/(1+GH)。代入得 1.5。 | [4.8 s域框图、信号流图与梅森公式](../content/signals/knowledge-base/ss-5-8.md) |
| ext-negative-feedback-gain-2-v2 | 静态负反馈框图满足 e=r−0.6y，y=7e。闭环增益 y/r 是多少？（选最接近值。） | B · 1.346154 | 联立 y=G(r−Hy)，得 (1+GH)y=Gr，所以 T=G/(1+GH)。代入得 1.346154。 | [4.8 s域框图、信号流图与梅森公式](../content/signals/knowledge-base/ss-5-8.md) |
| ext-mason-touching-loops-1 | 信号流图恰有两个回路 L₁=0.05、L₂=-0.2，两回路共享节点。梅森特征式 Δ 是多少？ | B · 1.15 | 接触回路不能形成乘积项，只有 Δ=1−L₁−L₂；回路增益保留各自符号。代入得 1.15。 | [4.8 s域框图、信号流图与梅森公式](../content/signals/knowledge-base/ss-5-8.md) |
| ext-mason-touching-loops-1-v1 | 信号流图恰有两个回路 L₁=0.1、L₂=-0.3，两回路共享节点。梅森特征式 Δ 是多少？ | C · 1.2 | 接触回路不能形成乘积项，只有 Δ=1−L₁−L₂；回路增益保留各自符号。代入得 1.2。 | [4.8 s域框图、信号流图与梅森公式](../content/signals/knowledge-base/ss-5-8.md) |
| ext-mason-touching-loops-1-v2 | 信号流图恰有两个回路 L₁=0.15、L₂=-0.4，两回路共享节点。梅森特征式 Δ 是多少？ | D · 1.25 | 接触回路不能形成乘积项，只有 Δ=1−L₁−L₂；回路增益保留各自符号。代入得 1.25。 | [4.8 s域框图、信号流图与梅森公式](../content/signals/knowledge-base/ss-5-8.md) |
| ext-mason-touching-loops-2 | 信号流图恰有两个回路 L₁=0.2、L₂=-0.5，两回路共享节点。梅森特征式 Δ 是多少？ | A · 1.3 | 接触回路不能形成乘积项，只有 Δ=1−L₁−L₂；回路增益保留各自符号。代入得 1.3。 | [4.8 s域框图、信号流图与梅森公式](../content/signals/knowledge-base/ss-5-8.md) |
| ext-mason-touching-loops-2-v1 | 信号流图恰有两个回路 L₁=0.25、L₂=-0.6，两回路共享节点。梅森特征式 Δ 是多少？ | B · 1.35 | 接触回路不能形成乘积项，只有 Δ=1−L₁−L₂；回路增益保留各自符号。代入得 1.35。 | [4.8 s域框图、信号流图与梅森公式](../content/signals/knowledge-base/ss-5-8.md) |
| ext-mason-touching-loops-2-v2 | 信号流图恰有两个回路 L₁=0.3、L₂=-0.7，两回路共享节点。梅森特征式 Δ 是多少？ | C · 1.4 | 接触回路不能形成乘积项，只有 Δ=1−L₁−L₂；回路增益保留各自符号。代入得 1.4。 | [4.8 s域框图、信号流图与梅森公式](../content/signals/knowledge-base/ss-5-8.md) |
| ext-cascade-dc-gain-1 | 两个稳定系统 H₁(s)=3/(s+2)、H₂(s)=5/(s+4) 级联，总直流增益是多少？ | C · 1.875 | 级联系统函数相乘，H(0)=H₁(0)H₂(0)=K₁K₂/(ab)。代入得 1.875。 | [4.9 连续系统的模拟结构](../content/signals/knowledge-base/ss-5-9.md) |
| ext-cascade-dc-gain-1-v1 | 两个稳定系统 H₁(s)=4/(s+3)、H₂(s)=6/(s+5) 级联，总直流增益是多少？ | D · 1.6 | 级联系统函数相乘，H(0)=H₁(0)H₂(0)=K₁K₂/(ab)。代入得 1.6。 | [4.9 连续系统的模拟结构](../content/signals/knowledge-base/ss-5-9.md) |
| ext-cascade-dc-gain-1-v2 | 两个稳定系统 H₁(s)=5/(s+4)、H₂(s)=7/(s+6) 级联，总直流增益是多少？（选最接近值。） | A · 1.458333 | 级联系统函数相乘，H(0)=H₁(0)H₂(0)=K₁K₂/(ab)。代入得 1.458333。 | [4.9 连续系统的模拟结构](../content/signals/knowledge-base/ss-5-9.md) |
| ext-cascade-dc-gain-2 | 两个稳定系统 H₁(s)=6/(s+5)、H₂(s)=8/(s+7) 级联，总直流增益是多少？（选最接近值。） | B · 1.371429 | 级联系统函数相乘，H(0)=H₁(0)H₂(0)=K₁K₂/(ab)。代入得 1.371429。 | [4.9 连续系统的模拟结构](../content/signals/knowledge-base/ss-5-9.md) |
| ext-cascade-dc-gain-2-v1 | 两个稳定系统 H₁(s)=7/(s+6)、H₂(s)=9/(s+8) 级联，总直流增益是多少？ | C · 1.3125 | 级联系统函数相乘，H(0)=H₁(0)H₂(0)=K₁K₂/(ab)。代入得 1.3125。 | [4.9 连续系统的模拟结构](../content/signals/knowledge-base/ss-5-9.md) |
| ext-cascade-dc-gain-2-v2 | 两个稳定系统 H₁(s)=8/(s+7)、H₂(s)=10/(s+9) 级联，总直流增益是多少？（选最接近值。） | D · 1.269841 | 级联系统函数相乘，H(0)=H₁(0)H₂(0)=K₁K₂/(ab)。代入得 1.269841。 | [4.9 连续系统的模拟结构](../content/signals/knowledge-base/ss-5-9.md) |
| ext-scalar-state-dc-gain-1 | 零初始状态的标量模型 x′=−2x+3u，y=4x+1u，其传递函数 H(s) 的直流增益 H(0) 是多少？ | D · 7 | H(s)=C(sI−A)⁻¹B+D=CB/(s+a)+D，令 s=0，保留直接通路 D。代入得 7。 | [A.7 系统关系速查](../content/signals/knowledge-base/ss-a-7.md)；[B.9 状态空间](../content/signals/knowledge-base/ss-b-9.md) |
| ext-scalar-state-dc-gain-1-v1 | 零初始状态的标量模型 x′=−3x+4u，y=5x+2u，其传递函数 H(s) 的直流增益 H(0) 是多少？（选最接近值。） | A · 8.666667 | H(s)=C(sI−A)⁻¹B+D=CB/(s+a)+D，令 s=0，保留直接通路 D。代入得 8.666667。 | [A.7 系统关系速查](../content/signals/knowledge-base/ss-a-7.md)；[B.9 状态空间](../content/signals/knowledge-base/ss-b-9.md) |
| ext-scalar-state-dc-gain-1-v2 | 零初始状态的标量模型 x′=−4x+5u，y=6x+3u，其传递函数 H(s) 的直流增益 H(0) 是多少？ | B · 10.5 | H(s)=C(sI−A)⁻¹B+D=CB/(s+a)+D，令 s=0，保留直接通路 D。代入得 10.5。 | [A.7 系统关系速查](../content/signals/knowledge-base/ss-a-7.md)；[B.9 状态空间](../content/signals/knowledge-base/ss-b-9.md) |
| ext-scalar-state-dc-gain-2 | 零初始状态的标量模型 x′=−5x+6u，y=7x+4u，其传递函数 H(s) 的直流增益 H(0) 是多少？ | C · 12.4 | H(s)=C(sI−A)⁻¹B+D=CB/(s+a)+D，令 s=0，保留直接通路 D。代入得 12.4。 | [A.7 系统关系速查](../content/signals/knowledge-base/ss-a-7.md)；[B.9 状态空间](../content/signals/knowledge-base/ss-b-9.md) |
| ext-scalar-state-dc-gain-2-v1 | 零初始状态的标量模型 x′=−6x+7u，y=8x+5u，其传递函数 H(s) 的直流增益 H(0) 是多少？（选最接近值。） | D · 14.333333 | H(s)=C(sI−A)⁻¹B+D=CB/(s+a)+D，令 s=0，保留直接通路 D。代入得 14.333333。 | [A.7 系统关系速查](../content/signals/knowledge-base/ss-a-7.md)；[B.9 状态空间](../content/signals/knowledge-base/ss-b-9.md) |
| ext-scalar-state-dc-gain-2-v2 | 零初始状态的标量模型 x′=−7x+8u，y=9x+6u，其传递函数 H(s) 的直流增益 H(0) 是多少？（选最接近值。） | A · 16.285714 | H(s)=C(sI−A)⁻¹B+D=CB/(s+a)+D，令 s=0，保留直接通路 D。代入得 16.285714。 | [A.7 系统关系速查](../content/signals/knowledge-base/ss-a-7.md)；[B.9 状态空间](../content/signals/knowledge-base/ss-b-9.md) |

## 课程预习与同知识点复测配对

每个配对共享一个知识点标识。原课中题、课后题可能考查不同子技能，不自动视为等价前后测。

| 小节 / 知识点 | 预习题与答案 | 复测题与答案 | 复测解析 |
| --- | --- | --- | --- |
| 1.1 有限能量与平均功率 | 非零有限能量信号的平均功率是多少？ **A · 0** | 某非零信号总能量为 $5$ J，观察区间为 $[-T,T]$。随着 $T$ 趋于无穷，平均功率趋于什么？ **B · 0** | 分子区间能量不超过5 J，除以不断增大的2T，极限为0。有限能量不等于非零平均功率。 |
| 1.2 时间尺度与波形宽度 | x(2t) 相对 x(t) 的时间宽度如何变化？ **C · 减半** | $x(t)$ 的非零区间宽度为 2 s。$x(t/3)$ 的非零区间宽度是多少？ **C · 6 s** | 原特征点t=a在新信号中满足t/3=a，移到3a，因此宽度扩大3倍。 |
| 1.3 冲激的分布取样性质 | δ(t) 应按什么方式理解？ **B · 对测试函数的积分作用** | 按分布取样性质，全实轴积分 $\int (t+2)\delta(t-3)dt$ 等于多少？ **D · 5** | δ(t−3)对测试函数取t=3处的值，3+2=5；不能把冲激当成普通常数函数。 |
| 1.4 线性叠加检验 | 判别线性时必须同时检查什么？ **A · 齐次性与可加性** | 为了确认算子 $T$ 为线性系统，哪个条件足以直接表达完整的叠加要求？ **A · $T[ax_1+bx_2]=aT[x_1]+bT[x_2]$ 对所有允许输入与标量成立** | 对所有允许输入与标量成立的叠加公式同时包含齐次性和可加性。单个样例无法证明线性。 |
| 1.5 从物理定律建立模型 | 建立电路输入输出微分方程，合理的起点是什么？ **C · KCL/KVL 与元件关系** | 串联RC低通以电容电压y为输出、输入电压为x，采用被动参考方向。由KVL与电容关系应得到哪条方程？ **B · $RCy\prime+y=x$** | KVL给出x=Ri+y，电容电流i=Cy′，代入得到RCy′+y=x。 |
| 1.6 卷积的零状态适用范围 | y=x*h 表示哪部分响应？ **B · 零状态响应** | LTI系统初始储能不为零，输入为x，冲激响应为h。其全响应通常应如何写？ **C · $y=y_{zi}+x*h$** | 卷积x*h只给零状态响应；非零初始状态引起的零输入响应需另外相加。 |
| 2.1 齐次特征根与自然模态 | 常系数微分方程齐次解的模态由什么决定？ **A · 特征根** | 齐次方程 $y\prime+3y=0$ 的非零自然模态是哪一项？ **D · $Ce^{-3t}$** | 代入e^(λt)得到λ+3=0，特征根−3决定指数衰减模态。 |
| 2.2 接入瞬间的左右初值 | 单边拉普拉斯变换的初始条件通常采用哪一侧？ **C · 0⁻** | 采用 $0^-$ 起点。$y\prime+2y=4\delta(t)$、$y(0^-)=2$，跨零积分后 $y(0^+)$ 等于多少？ **A · 6** | 冲激令Δy=4；y(0+)=y(0−)+4=6，不能无条件把左右初值视为相同。 |
| 2.3 零输入不等于零初始状态 | 零输入响应中的‘零’指什么？ **B · 外部输入为零** | 切断外部输入后，已充电电容仍通过电阻放电。这段响应应归为哪一类？ **B · 由初始储能引起的零输入响应** | “零输入”只指外部激励为零；初始状态可非零，并驱动自然响应。 |
| 2.4 阶跃与冲激响应互相求导 | LTI 系统阶跃响应与冲激响应的关系是什么？ **A · $h=g'$** | 因果LTI系统零状态阶跃响应为 $g(t)=(1-e^{-2t})u(t)$，冲激响应是哪一项？ **C · $2e^{-2t}u(t)$** | h=g′；g在零点连续且取0，所以没有额外冲激项，普通导数为2e^(−2t)u(t)。 |
| 2.5 卷积的翻转与平移 | 图解卷积中 h(t−τ) 相对 h(τ) 需要什么操作？ **C · 先翻转，再按 t 平移** | 固定t、以τ为横轴，$h(t-\tau)$ 从 $h(\tau)$ 得到时，正确操作是什么？ **D · 先得到h(−τ)，再沿τ轴向右平移t** | h(t−τ)=h(−(τ−t))，先翻转h(−τ)，再把τ替换为τ−t，即右移t。 |
| 2.6 级联与并联的卷积关系 | 两个 LTI 系统级联的总冲激响应是什么？ **B · $h_1*h_2$** | 先经过冲激响应h₁的系统，再经过h₂。总零状态输出是哪一项？ **A · $y=x*(h_1*h_2)$** | 级联输出为(x*h₁)*h₂，利用结合律等于x*(h₁*h₂)；相加对应并联。 |
| 2.7 零延迟自相关等于能量 | 能量信号的自相关 Rxx(0) 等于什么？ **A · 信号能量** | 复能量信号定义 $R_{xx}(\tau)=\int x(t)x^*(t-\tau)dt$，若总能量为7，$R_{xx}(0)$ 为多少？ **B · 7** | τ=0时，x(t)x*(t)=\|x(t)\|²，积分就是能量7。 |
| 2.8 微分算子的含义 | 微分算子 p 表示什么？ **C · $d/dt$** | 使用 $p=d/dt$，$(p^2+2p+1)y$ 应展开为什么？ **C · $y\prime\prime+2y\prime+y$** | p²表示连续求两次导数，常数项1表示恒等算子，不是把y平方。 |
| 2.9 已知冲激响应时的解法选择 | 已知 h(t) 和输入且初始静止，最直接的方法是什么？ **B · 卷积** | 已知连续LTI系统初始静止、h(t)与x(t)，需要整个零状态输出。哪种运算直接适用？ **D · 连续卷积积分** | 初始静止消除了零输入项，零状态LTI响应由y(t)=∫x(τ)h(t−τ)dτ直接给出。 |
| 3.1 正交投影系数 | 把信号投影到正交基上，系数主要由什么确定？ **A · 内积与基函数范数** | 正交展开中，若 $\langle x,\phiangle=6$、$\langle\phi,\phiangle=3$，沿该基函数的投影系数是多少？ **A · 2** | 投影系数c=⟨x,φ⟩/⟨φ,φ⟩=6/3=2；必须除以基函数范数平方。 |
| 3.2 周期与基波角频率 | 周期为 T 的信号，基波角频率是多少？ **C · $2\pi/T$** | 周期 $T=0.25$ s 的信号，基波角频率是多少？ **B · $8\pi$ rad/s** | f0=1/T=4 Hz，Ω=2πf0=8π rad/s，不能把Hz直接当作rad/s。 |
| 3.3 周期频谱的离散谐波结构 | 周期信号的傅里叶级数频谱是怎样的？ **B · 在整数倍基频处离散分布** | 一个非恒定周期信号的基本周期是0.1 s。其傅里叶级数可能出现的谱线位置是哪一组？ **C · 整数倍10 Hz处（某些系数可为零）** | f0=1/T=10 Hz，级数频率为nf0；对称性可使其中部分谱线为零。 |
| 3.4 傅里叶变换核的符号约定 | 本课程傅里叶正变换核使用什么符号？ **A · $e^{-j\omega t}$** | 采用 $X(j\omega)=\int x(t)e^{-j\omega t}dt$，$\delta(t-2)$ 的傅里叶变换是什么？ **D · $e^{-j2\omega}$** | 冲激取样把t代为2，直接得到负号相位因子e^(−j2ω)。 |
| 3.5 时间与频率尺度互逆 | 时间压缩通常使频谱如何变化？ **C · 展宽并改变幅度尺度** | 若y(t)=x(2t)，正确的傅里叶变换关系是哪一项？ **A · $Y(j\omega)=\tfrac12X(j\omega/2)$** | 变量代换v=2t，dt=dv/2，指数核频率变为ω/2；时域压缩对应频域展宽。 |
| 3.6 周期信号的广义傅里叶变换 | 周期信号的傅里叶变换应在哪种意义下处理？ **B · 广义函数意义** | 周期信号某复指数系数为F₂=3，其傅里叶变换在ω=2Ω处的冲激权重是多少？ **B · $6\pi$** | 周期信号X(jω)=2πΣF_nδ(ω−nΩ)，所以该冲激权重为2π×3=6π。 |
| 3.7 稳定LTI的正弦稳态同频性 | 稳定 LTI 系统对单频正弦稳态输入会怎样？ **A · 保持频率，只改幅度与相位** | 稳定LTI系统输入为100 Hz纯正弦。暂态消退后，非零输出的频率应是什么？ **C · 仍为100 Hz，幅度和相位可变** | 复指数是LTI算子的特征函数；LTI频响只改变该频率分量的幅度与相位。 |
| 3.8 无失真传输条件 | 无失真传输要求信号占用频带内满足什么？ **C · 幅频常数、相频线性** | 在信号占用频带内，哪种频率响应保证输出是输入的定倍延迟？ **D · $H(j\omega)=3e^{-j2\omega}$** | 常幅3与线性相位−2ω对应y(t)=3x(t−2)，两条件需同时满足。 |
| 3.9 安全采样的严格不等式 | 基带带限信号最高频率 fm，通用安全采样条件是什么？ **B · $f_s>2f_m$，并留抗混叠余量** | 基带信号可能含最高3 kHz的正弦分量，不另加边界排除条件。以下哪一采样率满足通用严格条件？ **A · 8 kHz** | 要求fs>2fm=6 kHz；6 kHz只是阈值，不能普遍保证边界分量可重建。 |
| 3.10 能量谱密度取模平方 | 能量谱密度通常由哪个量给出？ **A · $\|X(j\omega)\|^2$** | 某频率处 $X(j\omega)=3+j4$，该处能量谱密度 $\|X(j\omega)\|^2$ 是多少？ **B · 25** | \|3+j4\|²=3²+4²=25，为非负实数，不是直接平方复数或只取实部。 |
| 4.1 ROC决定双边逆变换 | 双边拉氏变换为什么要同时给出 ROC？ **B · 相同代数式在不同 ROC 下可对应不同信号** | 双边变换X(s)=1/(s+1)。哪条信息能区分右边衰减指数与左边增长方向的信号？ **C · ROC位于极点右侧还是左侧** | 右边信号ROC为Re(s)>−1，左边信号为Re(s)<−1；相同代数式不唯一。 |
| 4.2 单边微分的初始项 | 单边拉氏变换中，f′ 的变换是什么？ **A · $sF(s)-f(0^-)$** | 单边拉氏采用0−起点，f(0−)=3。f′的变换应是哪一项？ **D · $sF(s)-3$** | 分部积分的边界项为−f(0−)，不能遗漏初始状态，也不能写成加号。 |
| 4.3 非严格真分式先长除 | 有理函数分子阶数高于或等于分母，逆变换前应先怎样处理？ **C · 多项式长除** | 因果 $X(s)=(s+3)/(s+1)$，长除后常数1的逆拉氏分量是什么？ **A · $\delta(t)$** | X=1+2/(s+1)，常数1对应δ(t)，因此先长除可避免漏掉直接通路冲激。 |
| 4.4 电感初始状态的s域保留 | 非零初始电感电流在 s 域电路中如何处理？ **B · 用元件方程保留等效初始源** | 被动参考方向下，电感L=2 H、i(0−)=3 A。正确的单边s域元件方程是哪一项？ **B · $V(s)=2sI(s)-6$** | v=Ldi/dt，单边微分性质给V=L(sI−i(0−))=2sI−6。 |
| 4.5 系统函数的零状态定义 | 系统函数 H=Y/X 的定义使用什么初始条件？ **A · 零状态** | 测得的总输出含非零初始状态产生的Yzi。定义系统函数时，应取哪种比值？ **C · $H=Y_{zs}/X$，即零状态输出与输入的变换比** | 系统函数描述零状态输入输出关系，初始状态引起的输出必须从定义中分离。 |
| 4.6 BIBO稳定极点条件 | 因果、适当有理且已约分的传递函数，BIBO稳定要求什么？ **C · 所有极点严格位于左半平面** | 对于因果、适当有理且已约分的H(s)，哪组极点满足BIBO稳定条件？ **D · −1与−2** | 所有极点必须严格在左半平面；虚轴单极点不满足BIBO稳定。 |
| 4.7 幅值比与分贝 | 波特幅频图中幅值增益转 dB 使用哪个公式？ **B · $20\log_{10}\|H\|$** | 某频率处幅值增益为0.1，相对幅值增益为多少dB？ **A · −20 dB** | 幅值比使用20log10，20log10(0.1)=−20 dB；功率比公式不能直接套用。 |
| 4.8 梅森公式的不接触回路 | 梅森公式中的不接触回路要求什么？ **A · 没有公共节点** | 信号流图两个回路没有公共支路，但共享一个节点。梅森公式中能否把它们计为不接触回路对？ **B · 不能，共享节点就算接触** | 不接触的定义是不共享任何节点；仅支路不同仍可能在节点接触。 |
| 4.9 连续直接II型的状态存储 | 连续系统直接II型实现最常用的储存单元是什么？ **C · 积分器** | 连续LTI系统的标准直接II型结构用积分器链表示动态。一个四阶严格真有理系统在该标准结构中用几个积分器？ **C · 4** | n阶标准直接II型采用共享的n级状态积分链，四阶需4个积分器。 |
| 4.10 RC极点与时间常数 | 一阶RC低通的极点位置是什么？ **B · $-1/(RC)$** | 一阶RC低通时间常数由0.1 s变为0.2 s，其极点从−10移到哪里？ **D · −5 s⁻¹** | 极点p=−1/τ，τ加倍使极点绝对值减半，仍在左半平面。 |
| A.1 冲激的傅里叶常用对 | δ(t)的傅里叶变换是什么？ **C · 1** | 采用正变换核e^(−jωt)，2δ(t)的傅里叶变换是什么？ **A · 常数2** | δ的变换为1，利用线性性质，2δ变为常数2。 |
| A.2 因果指数的变换与ROC | 因果 e^(−at) 的拉氏变换是什么？ **B · $1/(s+a)$，ROC为Re(s)>−a** | x(t)=e^(−4t)u(t)的双边拉氏变换与ROC是哪一项？ **B · $1/(s+4)$，Re(s)>−4** | ∫₀∞e^(−(s+4)t)dt=1/(s+4)，收敛要求Re(s+4)>0。 |
| A.3 单边与双边微分性质差异 | 与双边傅里叶微分性质相比，单边拉氏微分性质特别要保留什么？ **A · 初始值项** | f(0−)=2。用单边拉氏求导数变换时，若直接写sF(s)，漏掉了什么？ **C · −2的初始值边界项** | 单边积分下限在0−，分部积分产生−f(0−)；应写sF(s)−2。 |
| A.4 延迟冲激的卷积恒等式 | x*δ(t−a) 等于什么？ **C · $x(t-a)$** | 已知y(t)=x(t)*δ(t−4)，x的一个峰原来在t=1，该峰在y中位于哪里？ **D · t=5** | 卷积使信号延迟4，原峰位置1变为1+4=5。 |
| A.5 连续状态内部渐近稳定 | 状态矩阵所有特征值实部严格小于0，说明什么？ **B · 连续有限维LTI系统内部渐近稳定** | 有限维连续LTI系统A的特征值为−2和+1。能否内部渐近稳定？ **A · 不能，+1对应指数增长状态模态** | 连续内部渐近稳定要求全部特征值实部严格小于0，任一正实部就不满足。 |
| A.6 采样周期与采样率互逆 | 采样率fs与采样周期Ts的关系是什么？ **A · $f_s=1/T_s$** | 采样周期Ts=0.002 s，采样率fs是多少？ **B · 500 Hz** | fs=1/Ts=1/0.002=500 Hz，毫秒需先转为秒。 |
| A.7 拉氏代入虚轴的收敛前提 | H(jω)=H(s)\|s=jω 的普通频响解释要求什么？ **C · 相关ROC包含虚轴** | 一个双边拉氏ROC是Re(s)>1。仅将代数式代s=jω，能否据此保证存在通常傅里叶频响？ **C · 不能，ROC不包含虚轴** | 虚轴Re(s)=0不在ROC中；代入得到的代数式不能代替收敛性条件。 |
| B.1 能量信号的平方可积条件 | 判断能量信号时应检查哪个条件？ **B · $0<E<\infty$** | x(t)=1/√t（0<t<1），其余为零。尽管持续时间有限，它是否为能量信号？ **D · 不是，能量积分∫₀¹dt/t发散** | 能量需要∫\|x\|²有限；这里平方后为1/t，在零点对数发散，不能只看持续时间。 |
| B.2 关键点方程定位 | 复合波形变换中，降低出错率的可靠方法是什么？ **A · 跟踪原信号关键点的位置** | x(t)的峰在t=2，y(t)=x(−2t+6)。y的对应峰在哪里？ **A · t=2** | 将新自变量等于原峰位置：−2t+6=2，解得t=2。 |
| B.3 输入与初始状态贡献分离 | 题目同时给出输入和非零初始状态，首先应区分什么？ **C · 零输入与零状态贡献** | 线性系统初始储能非零且接入新输入。若仅算输入与h的卷积，通常少了哪部分？ **B · 零输入响应** | 卷积只计算零状态贡献，完整响应还需由初始状态决定的零输入项。 |
| B.4 卷积积分的重叠区间 | 图解卷积选积分上下限的依据是什么？ **B · 翻转平移后与输入的重叠区间** | x(τ)仅在[0,2]为1，h(t−τ)仅在τ∈[t−3,t]为1。t=1时实际积分区间是什么？ **C · [0,1]** | t=1时第二支撑为[−2,1]，与[0,2]取交集，得到[0,1]。 |
| B.5 实偶信号的频谱对称性 | 实偶信号的傅里叶变换有什么对称性？ **A · 实偶** | x(t)=e^(−\|t\|)为实偶可积信号。其傅里叶变换应具有哪种性质？ **D · 实值且偶对称** | 实偶信号的正弦积分因奇对称消失，余弦积分给出实偶频谱。 |
| B.6 部分分式结果的独立核对 | 部分分式展开完成后，适合做什么检查？ **C · 代入特殊s值或使用适用的初终值定理** | 声称1/[(s+1)(s+2)]=1/(s+1)+1/(s+2)。最快可用哪种办法发现错误？ **A · 代入s=0，左边1/2而右边3/2** | 特殊值代入独立于展开过程，能快速发现符号错误；正确展开第二项系数应为−1。 |
| B.7 内部稳定需查看完整实现 | 分析内部稳定性，应优先查看什么？ **B · 完整状态矩阵或未约去的内部结构** | 两个状态实现约分后的H(s)相同，但一个实现含不可观测的+2特征值。能否据相同H(s)认为两者内部稳定性相同？ **B · 不能，隐藏模态不一定出现在H(s)中** | 内部稳定需检查完整A或未消去内部结构；不可观测不等于该状态模态不存在。 |
| B.8 采样前抗混叠优先 | 设计采样方案时，正确顺序是什么？ **A · 先检查带宽与抗混叠，再设计DFT参数** | 采样前未滤波导致高频分量混叠。仅将所得短记录补零100倍，能否恢复丢失的原频率信息？ **C · 不能，补零只加密DFT频率网格** | 混叠发生于采样阶段；补零不增加真实样本信息，需在采样前控制带宽与采样率。 |
| B.9 状态空间传递函数的零状态前提 | 从状态模型计算H(s)时采用什么初始状态？ **C · 零状态** | 公式H(s)=C(sI−A)⁻¹B+D所描述的输入输出传递关系，采用什么初始状态？ **D · 零初始状态** | 非零状态额外贡献C(sI−A)⁻¹x(0−)，不属于H(s)X(s)的零状态关系。 |
| B.10 能量定义中的幅度平方 | 最容易把能量算错的操作是哪一种？ **B · 忘记对幅度取模平方** | 某信号x(t)能量为3。仅将幅度变为2x(t)、时间尺度不变，新能量是多少？ **A · 12** | \|2x\|²=4\|x\|²，因此能量乘4，结果为12；幅度倍率不能直接当作能量倍率。 |

## 原156道课程题答案

原ID与评分键保留；补严Welch分段和理想微分器的题设条件。

| 小节 | 阶段 / ID | 题目 | 答案 | 解析 |
| --- | --- | --- | --- | --- |
| 1.1 | preview / ss-1-1-preview-v1 | 非零有限能量信号的平均功率是多少？ | A · 0 | 有限总能量除以不断增长的观察时长，极限为零。 |
| 1.1 | in_class / ss-1-1-in_class-v1 | 计算 x(t)=3e^(−2t)u(t) 的能量。可输入小数或分数。 | 能量 E=2.25 | E=9∫₀∞e^(−4t)dt=9/4。不能漏掉幅度平方。 |
| 1.1 | after_class / ss-1-1-after_class-v1 | x(t)=2cos(3t) 的平均功率是多少？ | 平均功率 P=2 | 余弦平方的周期平均值为 1/2，故 P=4/2=2。 |
| 1.2 | preview / ss-1-2-preview-v1 | x(2t) 相对 x(t) 的时间宽度如何变化？ | C · 减半 | 同一特征点从 t=a 移到 t=a/2。 |
| 1.2 | in_class / ss-1-2-in_class-v1 | x(t) 仅在 0≤t≤2 非零。y(t)=x(2t−2) 的非零区间是什么？ | 左端点=1 s；右端点=2 s | 直接解不等式：2≤2t≤4，因此 1≤t≤2。 |
| 1.2 | after_class / ss-1-2-after_class-v1 | 已知 x(t) 的能量为 12，求 x(−3t) 的能量。 | 变换后能量=4 | 反转不改变能量，时间压缩 3 倍使能量变为 12/3=4。 |
| 1.3 | preview / ss-1-3-preview-v1 | δ(t) 应按什么方式理解？ | B · 对测试函数的积分作用 | 冲激是分布，由 ∫δ(t)φ(t)dt=φ(0) 定义。 |
| 1.3 | in_class / ss-1-3-in_class-v1 | 计算全实轴积分 ∫(t²+1)δ(2t−4)dt。 | 积分值=2.5 | 取样点 t=2，缩放系数 1/2，结果 (4+1)/2=5/2。 |
| 1.3 | after_class / ss-1-3-after_class-v1 | 计算全实轴积分 ∫t²δ′(t−1)dt。 | 积分值=-2 | 冲激导数作用于测试函数导数并带负号：−2t 在 t=1 为 −2。 |
| 1.4 | preview / ss-1-4-preview-v1 | 判别线性时必须同时检查什么？ | A · 齐次性与可加性 | 只检查齐次性不足以证明线性。 |
| 1.4 | in_class / ss-1-4-in_class-v1 | 在广义函数/LTI意义下（输入允许光滑有界函数），理想微分器 y=x′ 的性质是什么？ | C · 因果，但不 BIBO 稳定 | h=δ′支撑在零点，按广义LTI定义因果；有界光滑输入sin(t²)的导数2t cos(t²)无界，因此不BIBO稳定。 |
| 1.4 | after_class / ss-1-4-after_class-v1 | y(t)=x²(t) 的正确判断是什么？ | B · 无记忆、因果、非线性 | 输出只依赖当前输入，但平方运算不满足叠加。 |
| 1.5 | preview / ss-1-5-preview-v1 | 建立电路输入输出微分方程，合理的起点是什么？ | C · KCL/KVL 与元件关系 | 从守恒关系和元件伏安关系消去中间变量。 |
| 1.5 | in_class / ss-1-5-in_class-v1 | RC 低通满足 RC y′+y=x，R=2 kΩ，C=100 μF。求时间常数。 | 时间常数=0.2 s | 2×10³×100×10⁻⁶=0.2 s，注意千和微的单位换算。 |
| 1.5 | after_class / ss-1-5-after_class-v1 | 两个不同物理装置的微分方程同形，这意味着什么？ | A · 可用相同的数学分析方法 | 相似系统共享数学结构，但参数和变量物理意义可不同。 |
| 1.6 | preview / ss-1-6-preview-v1 | y=x*h 表示哪部分响应？ | B · 零状态响应 | 卷积描述 LTI 系统在零初始状态下对输入的响应。 |
| 1.6 | in_class / ss-1-6-in_class-v1 | 某时刻零输入响应为 5，零状态响应为 −2，求线性系统全响应。 | 全响应=3 | 全响应按初始状态和激励分解，相加得到 3。 |
| 1.6 | after_class / ss-1-6-after_class-v1 | 初始状态非零时直接写 Y=HX，最容易漏掉什么？ | C · 零输入响应 | 非零初始状态还产生独立于输入的自然响应。 |
| 2.1 | preview / ss-2-1-preview-v1 | 常系数微分方程齐次解的模态由什么决定？ | A · 特征根 | 将齐次方程中的导数替换为 λ，特征多项式的根决定模态。 |
| 2.1 | in_class / ss-2-1-in_class-v1 | y′+2y=4，y(0⁺)=1。填入 t≥0 解 y=A+B e^(−2t) 的系数。 | A=2；B=-1 | 常值特解 A=4/2=2；初值给出 A+B=1，所以 B=−1。 |
| 2.1 | after_class / ss-2-1-after_class-v1 | 激励 e^(−t) 与二重特征根 −1 共振，试探特解应如何调整？ | B · 在常规指数特解前乘 t² | 与齐次解重合二重时，需要乘 t² 才能得到线性独立的特解。 |
| 2.2 | preview / ss-2-2-preview-v1 | 单边拉普拉斯变换的初始条件通常采用哪一侧？ | C · 0⁻ | 以 0⁻ 为起点才能保留接入瞬间冲激引起的跳变。 |
| 2.2 | in_class / ss-2-2-in_class-v1 | y′+2y=3δ(t)，已知 y(0⁻)=1。求 y(0⁺)。 | y(0⁺)=4 | 跨零积分，普通函数积分趋零，冲激积分为3，故 y 跳变3。 |
| 2.2 | after_class / ss-2-2-after_class-v1 | y″+3y′+2y=2δ(t)+6u(t)，y(0⁻)=1、y′(0⁻)=−1。求两项右初值。 | y(0⁺)=1；y′(0⁺)=1 | 无 δ′ 项所以 y 连续；匹配 δ 项得 y′ 跳变2，从−1到1。 |
| 2.3 | preview / ss-2-3-preview-v1 | 零输入响应中的‘零’指什么？ | B · 外部输入为零 | 初始储能可以非零，因此即使没有输入也能产生响应。 |
| 2.3 | in_class / ss-2-3-in_class-v1 | y′+2y=x，y(0⁻)=3。求零输入响应 yzi=Ae^(−2t) 的 A。 | A=3 | 置输入为零解齐次方程，系数由初始值3确定。 |
| 2.3 | after_class / ss-2-3-after_class-v1 | 零状态响应是否只包含强迫响应？ | C · 还可能含系统自然模态 | 初始状态为零不代表没有暂态，零状态解中也可能出现齐次模态。 |
| 2.4 | preview / ss-2-4-preview-v1 | LTI 系统阶跃响应与冲激响应的关系是什么？ | A · $h=g'$ | u′=δ，线性时不变算子与微分在适当条件下可交换。 |
| 2.4 | in_class / ss-2-4-in_class-v1 | h(t)=2e^(−2t)u(t)，将阶跃响应写成 g=A(1−e^(−2t))u(t)。求 A。 | A=1 | 积分得到1−e^(−2t)，稳态增益为1。 |
| 2.4 | after_class / ss-2-4-after_class-v1 | 因果有理 H(s) 的分子、分母同阶，长除后的常数对应什么？ | B · 冲激 δ(t) 项 | 常数的逆拉氏变换是 δ；正次幂多项式才产生冲激导数。 |
| 2.5 | preview / ss-2-5-preview-v1 | 图解卷积中 h(t−τ) 相对 h(τ) 需要什么操作？ | C · 先翻转，再按 t 平移 | 固定 t 后以 τ 为积分变量，h(−τ) 翻转后再平移。 |
| 2.5 | in_class / ss-2-5-in_class-v1 | x=u(t)−u(t−1)，h=u(t)−u(t−2)。填 y=x*h 各区间中的系数；端点按连续延拓。 | a=1；b=1；c=3；d=-1 | 重叠长度依次为 t、1、3−t；区间外没有重叠。每个空独立计分。 |
| 2.5 | after_class / ss-2-5-after_class-v1 | x=e^(−t)u(t)，h=e^(−t)u(t)。在 y=A t e^(−t)u(t) 中填 A。 | A=1 | 同指数项相乘后与 τ 无关，积分长度为 t。 |
| 2.6 | preview / ss-2-6-preview-v1 | 两个 LTI 系统级联的总冲激响应是什么？ | B · $h_1*h_2$ | 级联对应卷积，并联才是相加。 |
| 2.6 | in_class / ss-2-6-in_class-v1 | 已知 x*h=y(t)，求 x(t−2)*h(t−3)=y(t−d) 中的 d。 | 总延迟 d=5 s | 卷积的两路延迟相加，2+3=5。 |
| 2.6 | after_class / ss-2-6-after_class-v1 | x、h 分别为幅度1、宽度2和5的因果矩形。求卷积的底宽、平顶宽度和峰值。 | 底宽=7 s；平顶宽度=3 s；峰值=2 | 重叠长度最大为较短宽度2，底宽7，平顶宽度5−2=3。 |
| 2.7 | preview / ss-2-7-preview-v1 | 能量信号的自相关 Rxx(0) 等于什么？ | A · 信号能量 | 零延迟时与自身共轭相乘再积分，正好是能量定义。 |
| 2.7 | in_class / ss-2-7-in_class-v1 | 实信号 x 为 [0,2] 上幅度1的矩形。求自相关 Rxx(0)、Rxx(1)。 | Rxx(0)=2；Rxx(1)=1 | 相关值等于两矩形重叠长度；延迟0重叠2，延迟1重叠1。 |
| 2.7 | after_class / ss-2-7-after_class-v1 | 复信号相关函数与普通卷积相比需要注意什么？ | B · 反转并取共轭，且说明延迟约定 | 复相关包含共轭；不同教材的延迟正负约定可能不同。 |
| 2.8 | preview / ss-2-8-preview-v1 | 微分算子 p 表示什么？ | C · $d/dt$ | 算子法用多项式表示常系数微分关系。 |
| 2.8 | in_class / ss-2-8-in_class-v1 | 零状态系统 (p²+3p+2)y=(p+4)x，H(p)=(p+a)/[(p+b)(p+c)]，按 b<c 填系数。 | a=4；b=1；c=2 | p²+3p+2=(p+1)(p+2)，分子常数为4。 |
| 2.8 | after_class / ss-2-8-after_class-v1 | 有非零初始状态时，把 p 直接换成 s 并只算 H(s)X(s)，会怎样？ | A · 漏掉初始状态引起的项 | 零状态传输算子不包含历史储能，应单独处理初始条件。 |
| 2.9 | preview / ss-2-9-preview-v1 | 已知 h(t) 和输入且初始静止，最直接的方法是什么？ | B · 卷积 | 冲激响应完整描述零状态 LTI 系统。 |
| 2.9 | in_class / ss-2-9-in_class-v1 | y′+y=u(t)，y(0⁻)=2。t≥0 时 y=A+B e^(−t)，求 A、B。 | A=1；B=1 | 零输入为2e^(−t)，零状态为1−e^(−t)，相加为1+e^(−t)。 |
| 2.9 | after_class / ss-2-9-after_class-v1 | 数值近似连续卷积后发现幅值随 dt 大幅改变，应先检查什么？ | C · 离散 conv 结果是否乘了 dt | 连续积分的黎曼和含 dt；漏乘会产生约1/dt倍的误差。 |
| 3.1 | preview / ss-3-1-preview-v1 | 把信号投影到正交基上，系数主要由什么确定？ | A · 内积与基函数范数 | 正交展开系数为内积除以基函数的能量。 |
| 3.1 | in_class / ss-3-1-in_class-v1 | 一个周期内不同整数谐波复指数的内积通常是什么？ | C · 0 | 不同谐波在一个完整周期上相互正交。 |
| 3.1 | after_class / ss-3-1-after_class-v1 | 截取更多傅里叶级数项，跳变处的吉布斯过冲怎样变化？ | B · 区域变窄，但相对过冲不趋零 | 增加谐波改善大部分区间，跳变附近保留有限相对过冲。 |
| 3.2 | preview / ss-3-2-preview-v1 | 周期为 T 的信号，基波角频率是多少？ | C · $2\pi/T$ | 频率 f=1/T，角频率 Ω=2πf。 |
| 3.2 | in_class / ss-3-2-in_class-v1 | x(t)=2+3cos(Ωt)。复指数傅里叶级数中 F₀、F₁ 为多少？ | F₀=2；F₁=1.5 | 常数项为2，余弦幅度平均分到正负频率各3/2。 |
| 3.2 | after_class / ss-3-2-after_class-v1 | 幅度1、占空比1/4的单极性矩形脉冲串，其直流系数是多少？ | 直流系数=0.25 | 直流分量是一个周期的平均值，等于幅度乘占空比。 |
| 3.3 | preview / ss-3-3-preview-v1 | 周期信号的傅里叶级数频谱是怎样的？ | B · 在整数倍基频处离散分布 | 周期性对应谐波离散性，谱线间隔为基频。 |
| 3.3 | in_class / ss-3-3-in_class-v1 | T=0.02 s 的周期信号，其谱线间隔是多少 Hz？ | 谱线间隔=50 Hz | 1/0.02=50 Hz，不能误写成50 rad/s。 |
| 3.3 | after_class / ss-3-3-after_class-v1 | 对实周期信号，复级数系数满足什么关系？ | C · $F_{-n}=F_n^*$ | 实信号频谱共轭对称，因此幅度偶对称。 |
| 3.4 | preview / ss-3-4-preview-v1 | 本课程傅里叶正变换核使用什么符号？ | A · $e^{-j\omega t}$ | 约定正变换负号，逆变换正号并带1/(2π)。 |
| 3.4 | in_class / ss-3-4-in_class-v1 | x(t)=e^(−2t)u(t)，求 X(j0)。 | X(j0)=0.5 | 零频谱值是时间积分，∫₀∞e^(−2t)dt=1/2。 |
| 3.4 | after_class / ss-3-4-after_class-v1 | 宽度2、中心0、幅度3的矩形脉冲，其傅里叶变换在零频处是多少？ | X(j0)=6 | 零频处等于脉冲面积：3×2=6。 |
| 3.5 | preview / ss-3-5-preview-v1 | 时间压缩通常使频谱如何变化？ | C · 展宽并改变幅度尺度 | x(at)↔X(jω/a)/\|a\|，时间频率尺度互为倒数。 |
| 3.5 | in_class / ss-3-5-in_class-v1 | X(j0)=6，求 x(3t) 的傅里叶变换在零频处的值。 | Y(j0)=2 | 缩放系数为1/3，所以零频值为2。 |
| 3.5 | after_class / ss-3-5-after_class-v1 | x(t)cos(ωct) 的频谱是什么？ | A · 左右平移的两个频谱各乘1/2 | 将余弦展开为两个复指数，分别得到 ±ωc 频移。 |
| 3.6 | preview / ss-3-6-preview-v1 | 周期信号的傅里叶变换应在哪种意义下处理？ | B · 广义函数意义 | 周期信号通常非绝对可积，其频谱可用冲激串表达。 |
| 3.6 | in_class / ss-3-6-in_class-v1 | 若周期信号 F₁=2，变换在 ω=Ω 处冲激系数写为 Kπ，求 K。 | K=4 | 冲激系数为2πF₁=4π。 |
| 3.6 | after_class / ss-3-6-after_class-v1 | 周期冲激串的时间间隔增加一倍，频域冲激间隔怎样变化？ | C · 减半 | 频域间隔为2π/T，与时域间隔互为倒数。 |
| 3.7 | preview / ss-3-7-preview-v1 | 稳定 LTI 系统对单频正弦稳态输入会怎样？ | A · 保持频率，只改幅度与相位 | 复指数是 LTI 系统的特征函数。 |
| 3.7 | in_class / ss-3-7-in_class-v1 | 某频率处 \|H\|=1/2，输入为幅度6的余弦，求稳态输出幅度。 | 输出幅度=3 | 幅度增益1/2乘输入幅度6，得到3。 |
| 3.7 | after_class / ss-3-7-after_class-v1 | t=0 接通正弦输入后，能否把正弦稳态式直接当作所有时刻的完整输出？ | B · 不能，接通过程还可能有暂态 | 稳态式描述暂态衰减后或全时间正弦激励的输出。 |
| 3.8 | preview / ss-3-8-preview-v1 | 无失真传输要求信号占用频带内满足什么？ | C · 幅频常数、相频线性 | 同时保持各频率相对幅度与统一延迟，才能保持波形。 |
| 3.8 | in_class / ss-3-8-in_class-v1 | H(jω)=2e^(−j3ω)，求幅度增益和群时延。 | K=2；群时延=3 s | 幅度为2，相位−3ω的负导数为3 s。 |
| 3.8 | after_class / ss-3-8-after_class-v1 | 理想砖墙低通冲激响应双边无限长，这对严格因果实现意味着什么？ | A · 有限延迟也无法使它严格因果 | 双边无限支撑平移任意有限时间后仍包含负时间部分。 |
| 3.9 | preview / ss-3-9-preview-v1 | 基带带限信号最高频率 fm，通用安全采样条件是什么？ | B · $f_s>2f_m$，并留抗混叠余量 | 等号边界需要排除临界频率分量等条件；实际系统还需过渡带。 |
| 3.9 | in_class / ss-3-9-in_class-v1 | 最高频率3 kHz的基带信号，奈奎斯特速率阈值是多少 kHz？这里填阈值，实际采样率应更高。 | 阈值=6 kHz | 2×3=6 kHz；阈值不等于在所有边界信号上都能安全采用的采样率。 |
| 3.9 | after_class / ss-3-9-after_class-v1 | 采样率1000 Hz，输入800 Hz实余弦，折叠到 [0,fs/2] 后频率是多少？ | 混叠频率=200 Hz | 800 Hz 与−200 Hz离散样本等价，实余弦的正频率折叠值为200 Hz。 |
| 3.10 | preview / ss-3-10-preview-v1 | 能量谱密度通常由哪个量给出？ | A · $\|X(j\omega)\|^2$ | 能量谱非负，自相关与它构成傅里叶变换对。 |
| 3.10 | in_class / ss-3-10-in_class-v1 | 已知 ∫\|X(jω)\|²dω=8π，求总能量。 | E=4 | 根据本课程角频率变换约定，要乘1/(2π)，得到4。 |
| 3.10 | after_class / ss-3-10-after_class-v1 | 对同一固定长度的近似平稳数据，在窗形、归一化和重叠策略可比、可平均的有效分段数增多时，用更短分段进行 Welch 平均，典型折中是什么？ | B · 方差降低，但频率分辨能力可能变差 | 更多有效分段的平均通常降低估计方差；较短观察窗加宽主瓣，频率分辨能力可能变差。分段相关性、窗与归一化也会影响估计。 |
| 4.1 | preview / ss-5-1-preview-v1 | 双边拉氏变换为什么要同时给出 ROC？ | B · 相同代数式在不同 ROC 下可对应不同信号 | 收敛域决定左右边性，代数式本身不足以唯一反变换。 |
| 4.1 | in_class / ss-5-1-in_class-v1 | x=e^(−2t)u(t)，ROC写作 Re(s)>a，求 a。 | ROC边界 a=-2 | 右边指数要求 Re(s+2)>0，所以边界为−2且不含边界。 |
| 4.1 | after_class / ss-5-1-after_class-v1 | 1/(s+2)，ROC为 Re(s)<−2，对应什么？ | C · $-e^{-2t}u(-t)$ | 左边信号的积分给出同一代数式，但有负号且ROC在极点左侧。 |
| 4.2 | preview / ss-5-2-preview-v1 | 单边拉氏变换中，f′ 的变换是什么？ | A · $sF(s)-f(0^-)$ | 微分性质必须保留接入前初始值。 |
| 4.2 | in_class / ss-5-2-in_class-v1 | F(s)=1/(s+2)，求对应因果信号的初值和终值。 | 初值=1；终值=0 | 该真分式无冲激；sF极点在−2，终值定理条件满足。 |
| 4.2 | after_class / ss-5-2-after_class-v1 | F(s)=1/(s²+1)，直接由 lim(s→0)sF=0 断言终值为0，问题在哪？ | B · sF虚轴有极点，终值定理条件不满足 | 原信号为sin(t)u(t)，持续振荡，没有终值。 |
| 4.3 | preview / ss-5-3-preview-v1 | 有理函数分子阶数高于或等于分母，逆变换前应先怎样处理？ | C · 多项式长除 | 长除分离出冲激及其导数对应的多项式。 |
| 4.3 | in_class / ss-5-3-in_class-v1 | 因果 X(s)=1/[(s+1)(s+2)]，写成 A/(s+1)+B/(s+2)，求 A、B。 | A=1；B=-1 | 通分有1=A(s+2)+B(s+1)，代s=−1、−2分别得到1、−1。 |
| 4.3 | after_class / ss-5-3-after_class-v1 | 因果 X(s)=6/(s+2)³，x(t)=A t²e^(−2t)u(t)，求 A。 | A=3 | 三重极点对应 t²/2!，所以系数6/2=3。 |
| 4.4 | preview / ss-5-4-preview-v1 | 非零初始电感电流在 s 域电路中如何处理？ | B · 用元件方程保留等效初始源 | V=sLI−Li(0⁻)，初始项不可省略。 |
| 4.4 | in_class / ss-5-4-in_class-v1 | y′+2y=u(t)，y(0⁻)=3。Y(s)=A/s+B/(s+2)，求 A、B。 | A=0.5；B=2.5 | Y=1/[s(s+2)]+3/(s+2)=0.5/s+2.5/(s+2)。 |
| 4.4 | after_class / ss-5-4-after_class-v1 | 电容初始电压非零时，V(s)=I(s)/(sC) 是否完整？ | C · 不完整，还需 uC(0⁻)/s | 单边积分关系包含初始电压，必须和参考方向一起处理。 |
| 4.5 | preview / ss-5-5-preview-v1 | 系统函数 H=Y/X 的定义使用什么初始条件？ | A · 零状态 | 非零初始状态会引入与输入无关的响应，不能计入系统函数。 |
| 4.5 | in_class / ss-5-5-in_class-v1 | H(s)=(s+3)/[(s+1)(s+2)]，按从小到大填零点、两个极点。 | 零点=-3；较小极点=-2；较大极点=-1 | 分子零点−3，分母根为−1、−2。没有公因式对消。 |
| 4.5 | after_class / ss-5-5-after_class-v1 | 不稳定极点与零点代数对消后，能否断言内部稳定？ | B · 不能，可能仍有隐藏不稳定模态 | 内部稳定需要检查原实现或状态矩阵。 |
| 4.6 | preview / ss-5-6-preview-v1 | 因果、适当有理且已约分的传递函数，BIBO稳定要求什么？ | C · 所有极点严格位于左半平面 | 虚轴极点一般导致不衰减冲激响应，不满足BIBO。 |
| 4.6 | in_class / ss-5-6-in_class-v1 | h(t)=3e^(−2t)u(t)，求 ∫\|h(t)\|dt。 | 绝对积分=1.5 | 结果3/2有限，因此该系统BIBO稳定。 |
| 4.6 | after_class / ss-5-6-after_class-v1 | H(s)=1/(s²+1) 的因果系统属于哪种情况？ | A · 不满足BIBO稳定，可有有界零输入振荡 | h=sin(t)u(t)不绝对可积；‘临界稳定’描述内部自然运动时不能等同BIBO。 |
| 4.7 | preview / ss-5-7-preview-v1 | 波特幅频图中幅值增益转 dB 使用哪个公式？ | B · $20\log_{10}\|H\|$ | 幅值比用20log；功率比才使用10log。 |
| 4.7 | in_class / ss-5-7-in_class-v1 | H(s)=2/(s+2)，求直流增益和−3dB截止角频率。 | 直流增益=1；截止角频率=2 rad/s | 低频增益2/2=1；ω=2时幅值为1/√2。 |
| 4.7 | after_class / ss-5-7-after_class-v1 | 带通中心角频率1000 rad/s，Q=5，求带宽。 | 带宽=200 rad/s | 1000/5=200 rad/s，注意与Hz带宽的区别。 |
| 4.8 | preview / ss-5-8-preview-v1 | 梅森公式中的不接触回路要求什么？ | A · 没有公共节点 | 共享节点即接触，不能作为不接触回路乘积项。 |
| 4.8 | in_class / ss-5-8-in_class-v1 | 单一前向通路增益P=6，一个接触该通路的回路增益L=−2，求总传输增益。 | T=2 | Δ=1−(−2)=3，通路余因子为1，总增益6/3=2。 |
| 4.8 | after_class / ss-5-8-after_class-v1 | 只有两个互不接触回路，L₁=1/2，L₂=1/4。求梅森行列式 Δ。 | Δ=0.375 | 1−1/2−1/4+1/8=3/8。 |
| 4.9 | preview / ss-5-9-preview-v1 | 连续系统直接II型实现最常用的储存单元是什么？ | C · 积分器 | 积分器输出可直接用作状态变量。 |
| 4.9 | in_class / ss-5-9-in_class-v1 | 三阶严格真有理传递函数采用标准直接II型，需要多少个积分器？ | 积分器数=3 | 标准直接II型共享状态链，n阶需n个积分器。 |
| 4.9 | after_class / ss-5-9-after_class-v1 | 相同传递函数的不同框图实现，状态变量是否必须相同？ | A · 不必，可对应不同坐标或非最小实现 | 实现不是唯一的，最小实现之间可通过相似变换联系。 |
| 4.10 | preview / ss-5-10-preview-v1 | 一阶RC低通的极点位置是什么？ | B · $-1/(RC)$ | H=1/(1+sRC)，分母根为−1/(RC)。 |
| 4.10 | in_class / ss-5-10-in_class-v1 | R=1 kΩ，C=10 μF，求RC时间常数和截止角频率。 | τ=0.01 s；ωc=100 rad/s | RC=1000×10×10⁻⁶=0.01s，倒数为100rad/s。 |
| 4.10 | after_class / ss-5-10-after_class-v1 | 保持电阻不变，把电容加倍，截止角频率怎样变化？ | C · 减半 | 截止角频率与RC成反比，而响应时间常数加倍。 |
| A.1 | preview / ss-a-1-preview-v1 | δ(t)的傅里叶变换是什么？ | C · 1 | 由取样性质，∫δ(t)e^(−jωt)dt=1。 |
| A.1 | in_class / ss-a-1-in_class-v1 | 单位幅度、宽度4的中心矩形，X(jω)=A Sa(2ω)，求A。 | A=4 | 矩形面积为4，对应零频值4，因此系数为4。 |
| A.1 | after_class / ss-a-1-after_class-v1 | cos(ω₀t)的傅里叶变换中每根冲激的系数是什么？ | A · $\pi$ | 余弦拆成两个1/2复指数，复指数的变换系数2π，故每根为π。 |
| A.2 | preview / ss-a-2-preview-v1 | 因果 e^(−at) 的拉氏变换是什么？ | B · $1/(s+a)$，ROC为Re(s)>−a | 直接积分需Re(s+a)>0。 |
| A.2 | in_class / ss-a-2-in_class-v1 | x=t²u(t)，X(s)=A/s³，求A。 | A=2 | n=2，2!=2。 |
| A.2 | after_class / ss-a-2-after_class-v1 | 因果 sin(3t) 的拉氏变换是什么？ | C · $3/(s^2+9)$ | 分子s对应余弦，分子角频率对应正弦；ROC为Re(s)>0。 |
| A.3 | preview / ss-a-3-preview-v1 | 与双边傅里叶微分性质相比，单边拉氏微分性质特别要保留什么？ | A · 初始值项 | 积分下限0⁻导致边界初始项。 |
| A.3 | in_class / ss-a-3-in_class-v1 | f(0⁻)=2，F(1)=5，求单边拉氏变换 L[f′] 在s=1的值。 | 变换值=3 | 1×5−2=3；直接使用sF会错为5。 |
| A.3 | after_class / ss-a-3-after_class-v1 | 单边拉氏尺度公式可否直接无条件用于负尺度a？ | B · 不可，负尺度改变积分区间与左右边性 | 常用单边公式以a>0为条件，双边公式另需变换ROC。 |
| A.4 | preview / ss-a-4-preview-v1 | x*δ(t−a) 等于什么？ | C · $x(t-a)$ | 卷积中的延迟冲激使输出延迟a。 |
| A.4 | in_class / ss-a-4-in_class-v1 | u(t)*u(t)=A t u(t)，求A。 | A=1 | 两因果阶跃的重叠积分区间为[0,t]。 |
| A.4 | after_class / ss-a-4-after_class-v1 | tu(t)*u(t)=A t²u(t)，求A。 | A=0.5 | 对斜升积分得到二次函数，系数为1/2。 |
| A.5 | preview / ss-a-5-preview-v1 | 状态矩阵所有特征值实部严格小于0，说明什么？ | B · 连续有限维LTI系统内部渐近稳定 | 连续系统用左半平面，离散系统用单位圆内。 |
| A.5 | in_class / ss-a-5-in_class-v1 | 理想直接通路 y=2x 的 h=2δ，是否BIBO稳定？ | A · 稳定，\|y\|≤2\|x\| | 普通函数的绝对可积判据应推广到有限测度，冲激直接通路可稳定。 |
| A.5 | after_class / ss-a-5-after_class-v1 | 有界零输入自然响应与BIBO稳定能否视为同一概念？ | C · 不能，需要区分内部稳定与输入输出稳定 | 有界自然振荡可在共振有界输入下产生无界输出。 |
| A.6 | preview / ss-a-6-preview-v1 | 采样率fs与采样周期Ts的关系是什么？ | A · $f_s=1/T_s$ | Hz是每秒采样次数，周期是每次采样的秒数。 |
| A.6 | in_class / ss-a-6-in_class-v1 | fs=800 Hz，真实采样400点，求观察时长和原始DFT频点间隔。 | T=0.5 s；Δf=2 Hz | 400/800=0.5s，频点间隔1/0.5=2Hz。 |
| A.6 | after_class / ss-a-6-after_class-v1 | 两带限信号最高频率分别B₁、B₂，其乘积带宽怎样描述更严谨？ | B · 不超过B₁+B₂，实际可能因支撑或抵消更小 | 时域相乘对应频域卷积，支撑给出上界而非普遍等式。 |
| A.7 | preview / ss-a-7-preview-v1 | H(jω)=H(s)\|s=jω 的普通频响解释要求什么？ | C · 相关ROC包含虚轴 | 代数代入不保证傅里叶积分收敛。 |
| A.7 | in_class / ss-a-7-in_class-v1 | 两个稳定系统串联，直流增益分别2和3，求总直流增益。 | 总直流增益=6 | 串联频响相乘，2×3=6。 |
| A.7 | after_class / ss-a-7-after_class-v1 | 非零初始状态时Y(s)=H(s)X(s)要补上什么？ | A · $Y_{zi}(s)$ | 完整输出包含初始状态产生的零输入项。 |
| B.1 | preview / ss-b-1-preview-v1 | 判断能量信号时应检查哪个条件？ | B · $0<E<\infty$ | 有限时长信号若有非平方可积奇点也可能不是能量信号。 |
| B.1 | in_class / ss-b-1-in_class-v1 | x=cos(2t)+cos(3t)，求最小正周期T，答案按 T=kπ 填k。 | k=2 | 两个分量周期为π与2π/3，共同最小正周期为2π。 |
| B.1 | after_class / ss-b-1-after_class-v1 | cos(t)+cos(√2t) 是否周期？ | C · 非周期，两频率比无理 | 连续正弦分量频率比无理时不存在共同正周期。 |
| B.2 | preview / ss-b-2-preview-v1 | 复合波形变换中，降低出错率的可靠方法是什么？ | A · 跟踪原信号关键点的位置 | 解at+b=t原关键点，可避免变换顺序混淆。 |
| B.2 | in_class / ss-b-2-in_class-v1 | 原信号峰值在t=4。变换x(−2t+6)后，该峰值位于何处？ | 峰值时刻=1 s | 直接解关键点方程：−2t=−2，t=1。 |
| B.2 | after_class / ss-b-2-after_class-v1 | 原信号支撑为[−1,1]，x(2t+4)的支撑端点是什么？ | 左端点=-2.5；右端点=-1.5 | 解得−5≤2t≤−3，所以端点为−2.5和−1.5。 |
| B.3 | preview / ss-b-3-preview-v1 | 题目同时给出输入和非零初始状态，首先应区分什么？ | C · 零输入与零状态贡献 | 两类贡献的来源和计算方法不同。 |
| B.3 | in_class / ss-b-3-in_class-v1 | y′+y=0，y(0⁻)=4，求y(ln2)。 | y(ln2)=2 | 齐次响应为4e^(−t)，在ln2处为4/2=2。 |
| B.3 | after_class / ss-b-3-after_class-v1 | 经典法出现冲激接入时，确定积分常数前应做什么？ | A · 先匹配冲激求0⁺初值 | 接入冲激可能引起状态或导数跳变，需先确定右初值。 |
| B.4 | preview / ss-b-4-preview-v1 | 图解卷积选积分上下限的依据是什么？ | B · 翻转平移后与输入的重叠区间 | 随t移动的交集决定实际积分范围。 |
| B.4 | in_class / ss-b-4-in_class-v1 | x、h均为[0,1]上幅度1矩形，求卷积y(0.5)、y(1.5)。 | y(0.5)=0.5；y(1.5)=0.5 | 两处重叠长度都为0.5，卷积关于t=1对称。 |
| B.4 | after_class / ss-b-4-after_class-v1 | 连续卷积用采样和近似，原conv结果某点为120，dt=0.01s。积分近似值是多少？ | 积分近似值=1.2 | 120×0.01=1.2，时间步长是积分权重。 |
| B.5 | preview / ss-b-5-preview-v1 | 实偶信号的傅里叶变换有什么对称性？ | A · 实偶 | 正弦积分因奇对称抵消，余弦项留下实偶频谱。 |
| B.5 | in_class / ss-b-5-in_class-v1 | x(t)=3cos(2t)，求平均功率。 | P=4.5 | 余弦均方为1/2，因此P=9/2。 |
| B.5 | after_class / ss-b-5-after_class-v1 | 使用傅里叶性质化简后，检查零频值的好处是什么？ | B · 可与时间面积核对幅度尺度 | 对可积信号，X(j0)=∫x(t)dt，是实用的系数检查。 |
| B.6 | preview / ss-b-6-preview-v1 | 部分分式展开完成后，适合做什么检查？ | C · 代入特殊s值或使用适用的初终值定理 | 独立代入可发现展开系数的符号错误。 |
| B.6 | in_class / ss-b-6-in_class-v1 | 因果F(s)=(s+3)/[(s+1)(s+2)]，求f(0⁺)。 | 初值=1 | 该严格真分式不含冲激，极限由最高次项系数给出1。 |
| B.6 | after_class / ss-b-6-after_class-v1 | 拉氏反变换中只给1/(s+1)却不给左右边性或ROC，结论是什么？ | A · 双边问题的原信号不能唯一确定 | 若已约定单边因果则可唯一；双边变换必须补充ROC。 |
| B.7 | preview / ss-b-7-preview-v1 | 分析内部稳定性，应优先查看什么？ | B · 完整状态矩阵或未约去的内部结构 | 隐藏模态可能不出现在输入输出传递函数中。 |
| B.7 | in_class / ss-b-7-in_class-v1 | 多项式系数全正是否足以保证所有根在左半平面？ | A · 不够，只是常见必要条件 | 三阶及以上仍需Routh等判据；全正系数不是普遍充分条件。 |
| B.7 | after_class / ss-b-7-after_class-v1 | 三阶多项式s³+2s²+3s+4的Routh表首列为1、2、a、4，求a。 | a=1 | a=(6−4)/2=1，首列全正，没有右半平面根。 |
| B.8 | preview / ss-b-8-preview-v1 | 设计采样方案时，正确顺序是什么？ | A · 先检查带宽与抗混叠，再设计DFT参数 | 采样导致的信息丢失不能通过FFT补零恢复。 |
| B.8 | in_class / ss-b-8-in_class-v1 | fs=2000Hz，希望原始DFT频点间隔5Hz，至少采集多少真实样本？ | N=400 | 2000/5=400，对应观察时长0.2s。 |
| B.8 | after_class / ss-b-8-after_class-v1 | 要分辨两条很近的正弦谱线，通常应优先怎样做？ | B · 延长真实观察时间并选择合适窗 | 真实分辨能力由观察窗和信号条件决定，补零只加密网格。 |
| B.9 | preview / ss-b-9-preview-v1 | 从状态模型计算H(s)时采用什么初始状态？ | C · 零状态 | 传递函数描述零状态输入输出关系。 |
| B.9 | in_class / ss-b-9-in_class-v1 | 一维状态模型A=−3、B=2、C=5、D=1，求H(0)。 | H(0)=4.333333333333333 | H(0)=10/3+1=13/3，可用分数输入。 |
| B.9 | after_class / ss-b-9-after_class-v1 | 更换状态坐标后，可控性与可观性应怎样？ | A · 在可逆相似变换下保持不变 | 可逆坐标变换保持相关矩阵秩，不改变系统结构性质。 |
| B.10 | preview / ss-b-10-preview-v1 | 最容易把能量算错的操作是哪一种？ | B · 忘记对幅度取模平方 | 能量定义为∫\|x\|²dt，而不是∫xdt。 |
| B.10 | in_class / ss-b-10-in_class-v1 | ω=200π rad/s 对应多少Hz？ | A · 100 Hz | f=ω/(2π)=100Hz，赫兹与角频率不能混用。 |
| B.10 | after_class / ss-b-10-after_class-v1 | 复习时遇到公式结论与适用条件冲突，应该怎样做？ | C · 先核对条件、定义和边界情形 | 采样、终值定理和稳定性等结论均依赖明确条件。 |
