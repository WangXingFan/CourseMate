# A.4 卷积公式速查

课程：信号与系统
知识点ID：ss-a-4
版本：2026-10-23.1
章节：附录A 公式与变换对总表
课程链接：/learn/knowledge?lesson=ss-a-4

> **校订说明**：本文是课程学习辅助资料，不是官方教材勘误。普通函数的绝对可积判据不直接涵盖冲激直接通路；有理系统极点稳定判据默认适当、已约分并明确因果性；内部稳定须另查完整状态。采样与终值定理均须检查适用条件。修订记录见 corrections.json。

- $f(t)*g(t)=\int_{-\infty}^{\infty}f(\tau)g(t-\tau)d\tau$。
- $f*\delta=f$；$f*\delta(t-t_0)=f(t-t_0)$。
- $f*\delta^{(n)}=f^{(n)}$；$f*u=\int_{-\infty}^{t}f(\tau)d\tau$。
- $(f*g)'=f'*g=f*g'$；$\int(f*g)=(\int f)*g=f*(\int g)$。
- $f(t-t_1)*g(t-t_2)=y(t-t_1-t_2)$，其中 $y=f*g$。
- 等宽矩形卷积 → 三角形；不等宽矩形卷积 → 梯形。
- $e^{-at}u*e^{-bt}u=\frac{e^{-at}-e^{-bt}}{b-a}u(t)\ (a\ne b)$。
- $u*u=tu(t)$；$tu*u=\frac{t^2}{2}u(t)$。
- 时限卷积：支撑长度相加。
- 相关与卷积：$R_{xy}(\tau)=x(\tau)*y(-\tau)$（实信号，按本文定义）。
