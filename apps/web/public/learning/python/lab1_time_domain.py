# %% [markdown]
# # 实验一 / Lab 1 · 信号生成与时域系统
# 先预测，再运行；修改参数后重新运行本节。时间单位 s，频率单位 Hz。
# 每个任务至少保留原参数和一组自己修改的参数、图形及数据。
# 运行前填写：我预计哪些量变化？运行后填写：测量如何支持或修正预测？

# %%
import matplotlib.pyplot as plt
import numpy as np

# %% [markdown]
# ## L1-1 · 从表达式生成信号
# 逐行解释时间数组、布尔条件、幅度、频率和相位的作用。
# 练习：自己生成余弦与矩形；比较 p(2(t-1)) 与 p(2t-1)。
# 将 dt 减半再计算窄脉冲面积，说明有限采样与理想冲激的区别。
# TODO：记录支撑、峰时、峰值、脉冲宽度及面积；写出修改过的表达式。

# %%
def triangle(t):
    """课程使用的不对称三角脉冲 p(t)，不是对称三角波。"""
    return np.where((t >= 0) & (t < 1), t,
                    np.where((t >= 1) & (t <= 3), (3 - t) / 2, 0.0))


def generate_signals(A=1.0, a=1.0, shift=0.0, delta=0.2, dt=0.001, f0=1.0, phase=0.0):
    if a == 0 or delta <= 0 or dt <= 0:
        raise ValueError("a must be nonzero; delta and dt must be positive")
    ends = sorted([shift, shift + 3 / a])
    t = np.arange(min(-4, ends[0] - 1), max(6, ends[1] + 1), dt)
    step = (t >= 0).astype(float)
    sine = A * np.sin(2 * np.pi * f0 * t + phase)
    exponential = np.exp(-np.maximum(t, 0)) * step
    transformed = A * triangle(a * (t - shift))
    # 中点采样将 [0, delta) 等分，避免浮点端点被重复计入面积。
    count = max(1, int(np.ceil(delta / dt)))
    pulse_t = (np.arange(count) + 0.5) * delta / count
    pulse = np.ones(count) / delta
    area = np.sum(pulse) * delta / count
    return t, sine, step, exponential, transformed, pulse_t, pulse, area


if __name__ == "__main__":
    A, a, shift, delta = 1.0, 1.0, 0.0, 0.2  # 修改这里 / Edit here
    t, sine, step, exponential, transformed, pulse_t, pulse, area = generate_signals(A, a, shift, delta)
    fig, axes = plt.subplots(3, 1, figsize=(10, 9), layout="constrained")
    for values, label in [(sine, "sin(2*pi*f0*t)"), (step, "u(t)"), (exponential, "exp(-t)u(t)")]:
        axes[0].plot(t, values, label=label)
    axes[1].plot(t, triangle(t), label="p(t)")
    axes[1].plot(t, transformed, label="A*p(a*(t-shift))", linestyle="--")
    axes[2].step(np.r_[0, pulse_t, delta], np.r_[0, pulse, 0], where="mid", label="finite pulse")
    for ax in axes:
        ax.set(xlabel="t (s)", ylabel="Amplitude")
        ax.grid(True, alpha=0.25)
        ax.legend()
    print(f"L1-1 midpoint pulse area = {area:.8f}; this is not an ideal delta")
    plt.show()

# %% [markdown]
# ## L1-2 · 用代码构造系统性质检验
# 练习：改变 x1、x2、alpha、beta 和 delay，为不满足性质的系统找反例。
# 时不变性必须同时平移系统中显式出现的时间因子。
# TODO：画出两条路径和差值。有限组输入一致，能证明普遍成立吗？

# %%
def compare_system(kind="square", test="linearity", alpha=1.0, beta=1.0, delay=1.0,
                   x1=lambda t: np.ones_like(t), x2=lambda t: np.ones_like(t)):
    t = np.linspace(-2, 5, 1401)

    def system(q, x):
        return {"gain": lambda: 2 * x, "square": lambda: x**2, "varying": lambda: q * x}[kind]()

    if test == "linearity":
        left = system(t, alpha * x1(t) + beta * x2(t))
        right = alpha * system(t, x1(t)) + beta * system(t, x2(t))
    elif test == "invariance":
        left = system(t, x1(t - delay))
        right = system(t - delay, x1(t - delay))
    else:
        raise ValueError("test must be linearity or invariance")
    return t, left, right


if __name__ == "__main__":
    t, left, right = compare_system(kind="square", test="linearity")
    plt.figure(figsize=(10, 4))
    plt.plot(t, left, label="Path 1")
    plt.plot(t, right, "--", label="Path 2")
    plt.plot(t, left - right, label="Difference")
    plt.xlabel("t (s)")
    plt.ylabel("Output")
    plt.legend()
    print(f"L1-2 maximum difference = {np.max(np.abs(left - right)):.8f}")
    plt.show()

# %% [markdown]
# ## L1-3 · 分别计算初始状态与输入的贡献
# 练习：设置 y0=0、0.5、2；关闭或开启输入，读取 t=0、1、3、5 s。
# TODO：从微分方程解释起点、长期值，以及两分量相加的意义。

# %%
def response_parts(y0=2.0, input_on=True, A=1.0):
    t = np.linspace(0, 5, 5001)
    zero_input = y0 * np.exp(-t)
    zero_state = A * float(input_on) * (-np.expm1(-t))
    return t, zero_input, zero_state, zero_input + zero_state


if __name__ == "__main__":
    t, zi, zs, total = response_parts(y0=2.0, input_on=True)
    plt.figure(figsize=(10, 4))
    for values, label in [(zi, "Zero input"), (zs, "Zero state"), (total, "Total")]:
        plt.plot(t, values, label=label)
    plt.xlabel("t (s)")
    plt.ylabel("y(t)")
    plt.legend()
    plt.show()

# %% [markdown]
# ## L1-4 · 自己生成输入，再计算卷积
# 练习：在 rr 与 rh 两种组合间切换，修改 dt 并比较关键时刻。
# np.convolve 给出离散求和；近似连续卷积必须乘 dt，输出时间轴也需重建。
# TODO：自己实现翻转、平移和乘积面积，解释步长减半后误差的变化。

# %%
def numerical_convolution(kind="rr", dt=0.002):
    if dt <= 0 or kind not in ("rr", "rh"):
        raise ValueError("positive dt and kind rr/rh required")
    # 以每个小区间的中点采样。卷积坐标从两个首样本时刻之和开始。
    t = (np.arange(int(np.ceil(5 / dt))) + 0.5) * dt
    x = ((t >= 0) & (t < 1)).astype(float)
    h = x if kind == "rr" else np.exp(-t)
    y = np.convolve(x, h, mode="full") * dt
    out_t = 2 * t[0] + np.arange(len(y)) * dt
    return out_t, y


if __name__ == "__main__":
    t, y = numerical_convolution(kind="rr", dt=0.002)
    plt.figure(figsize=(10, 4))
    plt.plot(t, y, label="Numerical continuous convolution")
    plt.xlim(-0.5, 5)
    plt.xlabel("t (s)")
    plt.ylabel("y(t)")
    plt.legend()
    plt.show()
