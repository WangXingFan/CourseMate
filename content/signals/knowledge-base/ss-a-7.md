# A.7 系统关系速查

课程：信号与系统
知识点ID：ss-a-7
版本：2026-10-23.1
章节：附录A 公式与变换对总表
课程链接：/learn/knowledge?lesson=ss-a-7

> **校订说明**：本文是课程学习辅助资料，不是官方教材勘误。普通函数的绝对可积判据不直接涵盖冲激直接通路；有理系统极点稳定判据默认适当、已约分并明确因果性；内部稳定须另查完整状态。采样与终值定理均须检查适用条件。修订记录见 corrections.json。

- 时域：$y_{zs}=f*h$。
- 频域：$Y(j\omega)=H(j\omega)F(j\omega)$。
- s域：$Y(s)=H(s)F(s)$（零状态）。
- $H(j\omega)=H(s)|_{s=j\omega}$（ROC 含虚轴）。
- $H(s)=\mathcal{L}[h(t)]$；$H(j\omega)=\mathcal{F}[h(t)]$。
- $H(s)=C(sI-A)^{-1}B+D$。
- $H(p)=N(p)/D(p)$（零状态传输算子）。
- 无失真：$H(j\omega)=Ke^{-j\omega t_d}$。
- 理想低通：$h(t)=\frac{\omega_c}{\pi}\mathrm{Sa}(\omega_ct)$。

