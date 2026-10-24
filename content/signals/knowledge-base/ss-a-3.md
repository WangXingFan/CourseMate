# A.3 傅里叶变换与拉普拉斯变换性质对照

课程：信号与系统
知识点ID：ss-a-3
版本：2026-10-23.1
章节：附录A 公式与变换对总表
课程链接：/learn/knowledge?lesson=ss-a-3

> **校订说明**：本文是课程学习辅助资料，不是官方教材勘误。普通函数的绝对可积判据不直接涵盖冲激直接通路；有理系统极点稳定判据默认适当、已约分并明确因果性；内部稳定须另查完整状态。采样与终值定理均须检查适用条件。修订记录见 corrections.json。

| 性质 | 傅里叶变换 | 拉普拉斯变换 |
|---|---|---|
| 线性 | $af_1+bf_2\leftrightarrow aF_1+bF_2$ | 同左 |
| 尺度 | $\frac{1}{\lvert a\rvert}F(j\omega/a)$，$a\ne0$ | 双边为 $\frac{1}{\lvert a\rvert}F(s/a)$ 并相应变换 ROC；单边常用式要求 $a>0$ |
| 时移 | $e^{-j\omega t_0}F(j\omega)$ | $e^{-st_0}F(s)$（单边需 $u(t-t_0)$） |
| 频移/复频移 | $F(j(\omega-\omega_0))$ | $F(s-s_0)$ |
| 时域微分 | $(j\omega)^nF(j\omega)$ | $s^nF(s)$ 减初始项 |
| 时域积分 | $F/(j\omega)+\pi F(0)\delta(\omega)$ | $F(s)/s$ |
| 时域卷积 | $F_1F_2$ | $F_1F_2$ |
| 频域微分 | $(-jt)^nf\leftrightarrow d^nF/d\omega^n$ | $t^nf\leftrightarrow(-1)^nd^nF/ds^n$ |
| 初值/终值 | 一般不直接使用 | 有初值、终值定理 |
| 帕斯瓦尔 | $\int\lvert f\rvert^2=\frac{1}{2\pi}\int\lvert F\rvert^2$ | 无简单常用形式 |
