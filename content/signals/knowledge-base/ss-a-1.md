# A.1 傅里叶变换常用对

课程：信号与系统
知识点ID：ss-a-1
版本：2026-10-23.1
章节：附录A 公式与变换对总表
课程链接：/learn/knowledge?lesson=ss-a-1

> **校订说明**：本文是课程学习辅助资料，不是官方教材勘误。普通函数的绝对可积判据不直接涵盖冲激直接通路；有理系统极点稳定判据默认适当、已约分并明确因果性；内部稳定须另查完整状态。采样与终值定理均须检查适用条件。修订记录见 corrections.json。

| 时域 | 频域 |
|---|---|
| $\delta(t)$ | $1$ |
| $\delta(t-t_0)$ | $e^{-j\omega t_0}$ |
| $1$ | $2\pi\delta(\omega)$ |
| $e^{j\omega_0t}$ | $2\pi\delta(\omega-\omega_0)$ |
| $\cos\omega_0t$ | $\pi[\delta(\omega-\omega_0)+\delta(\omega+\omega_0)]$ |
| $\sin\omega_0t$ | $\frac{\pi}{j}[\delta(\omega-\omega_0)-\delta(\omega+\omega_0)]$ |
| $u(t)$ | $\pi\delta(\omega)+\frac{1}{j\omega}$ |
| $\mathrm{sgn}(t)$ | $\frac{2}{j\omega}$ |
| $e^{-at}u(t)$ | $\frac{1}{a+j\omega}$ |
| $t^ne^{-at}u(t)$ | $\frac{n!}{(a+j\omega)^{n+1}}$ |
| $e^{-a\lvert t\rvert}$ | $\frac{2a}{a^2+\omega^2}$ |
| $G_\tau(t)$ | $\tau\mathrm{Sa}\left(\frac{\omega\tau}{2}\right)$ |
| $\mathrm{Sa}(\omega_ct)$ | $\frac{\pi}{\omega_c}G_{2\omega_c}(\omega)$ |
| $\delta'(t)$ | $j\omega$ |
