# A.2 拉普拉斯变换常用对

课程：信号与系统
知识点ID：ss-a-2
版本：2026-10-19.1
章节：附录A 公式与变换对总表
课程链接：/learn/knowledge?lesson=ss-a-2

> **校订说明**：本文是课程学习辅助资料，不是官方教材勘误。普通函数的绝对可积判据不直接涵盖冲激直接通路；有理系统极点稳定判据默认适当、已约分并明确因果性；内部稳定须另查完整状态。采样与终值定理均须检查适用条件。修订记录见 corrections.json。

| 时域（因果） | 象函数 | ROC |
|---|---|---|
| $\delta(t)$ | $1$ | 全平面 |
| $u(t)$ | $1/s$ | $\mathrm{Re}(s)>0$ |
| $t^nu(t)$ | $n!/s^{n+1}$ | $\mathrm{Re}(s)>0$ |
| $e^{-at}u(t)$ | $1/(s+a)$ | $\mathrm{Re}(s)>-a$ |
| $te^{-at}u(t)$ | $1/(s+a)^2$ | $\mathrm{Re}(s)>-a$ |
| $\cos\omega_0t\,u(t)$ | $s/(s^2+\omega_0^2)$ | $\mathrm{Re}(s)>0$ |
| $\sin\omega_0t\,u(t)$ | $\omega_0/(s^2+\omega_0^2)$ | $\mathrm{Re}(s)>0$ |
| $e^{-at}\cos\omega_0t\,u(t)$ | $(s+a)/((s+a)^2+\omega_0^2)$ | $\mathrm{Re}(s)>-a$ |
| $e^{-at}\sin\omega_0t\,u(t)$ | $\omega_0/((s+a)^2+\omega_0^2)$ | $\mathrm{Re}(s)>-a$ |
