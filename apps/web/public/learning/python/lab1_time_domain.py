# %% [markdown]
# # 实验一 / Lab 1 · 信号生成与时域系统
# 先预测，再运行；修改参数后重新运行本节。时间单位 s，频率单位 Hz。
# 每个任务至少保留原参数和一组自己修改的参数、图形及数据。
# 运行前填写：我预计哪些量变化？运行后填写：测量如何支持或修正预测？

# %%
import matplotlib.pyplot as plt
import numpy as np
from scipy.integrate import quad

# %% [markdown]
# ## L1-1 · 从表达式生成信号
# 逐行解释时间数组、布尔条件、幅度、频率和相位的作用。
# 练习：自己生成余弦与矩形；比较 f(2(t-1)) 与 f(2t-1)。
# 将 dt 减半再计算窄脉冲面积，说明有限采样与理想冲激的区别。
# TODO：记录支撑、峰时、峰值、脉冲宽度及面积；写出修改过的表达式。

# %%
def triangle(t):
    """课程使用的不对称三角脉冲 f(t)，不是对称三角波。"""
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
    axes[1].plot(t, triangle(t), label="f(t)")
    axes[1].plot(t, transformed, label="A*f(a*(t-shift))", linestyle="--")
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
# 系统：affine、timescale、delay、integrator、square；输入在 t<0 为零。
# TODO：画出两条路径和差值。有限组输入一致，能证明普遍成立吗？

# %%
def causal_input(kind, t):
    t = np.asarray(t)
    values = {"step": lambda: np.ones_like(t),
              "pulse": lambda: (t < 1).astype(float),
              "exp": lambda: np.exp(-np.maximum(t, 0)),
              "sin": lambda: np.sin(t)}[kind]()
    return np.where(t >= 0, values, 0.0)


def compare_system(kind="square", test="linearity", alpha=1.0, beta=1.0, delay=1.0,
                   x1=lambda t: causal_input("step", t), x2=lambda t: causal_input("step", t)):
    """The integrator accepts causal inputs; the shifted input starts at delay."""
    t = np.linspace(-2, 5, 1401)

    def system(q, x, origin=0):
        if kind == "integrator":
            return np.array([0.0 if v <= origin else quad(
                lambda u: float(x(u)), origin, v,
                points=[origin + 1] if origin + 1 < v else None,
                epsabs=1e-10)[0] for v in q])
        return {"affine": lambda: x(q) + 1, "timescale": lambda: x(2*q),
                "delay": lambda: x(q-1), "square": lambda: x(q)**2,
                "gain": lambda: 2*x(q), "varying": lambda: q*x(q)}[kind]()

    if test == "linearity":
        left = system(t, lambda q: alpha*x1(q) + beta*x2(q))
        right = alpha*system(t, x1) + beta*system(t, x2)
    elif test == "invariance":
        left = system(t, lambda q: x1(q-delay), origin=delay)
        right = system(t-delay, x1)
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
# 先比较 rr 矩形卷积，再以 ecg 模式比较 20/80 ms 心电滑动平均。
# W/2 是线性相位延迟；复杂波形的 R 峰偏移不必恰好等于 W/2。
# np.convolve 给出离散求和；近似连续卷积必须乘 dt，输出时间轴也需重建。
# TODO：自己实现翻转、平移和乘积面积，解释步长减半后误差的变化。

# %%
def ecg_signal(t, interference=True):
    """Local, normalized P/Q/R/S/T Gaussian teaching waveform; one beat/s."""
    t = np.asarray(t)
    value = 0.02 * np.sin(2*np.pi*5*t)
    for offset in [-1, 0, 1]:
        beat = np.floor(t) + offset
        for amplitude, center, width in [(0.12, .2, .04), (-.15, .37, .012),
                                         (1, .4, .012), (-.25, .43, .012), (.3, .65, .07)]:
            value = value + amplitude*np.exp(-.5*((t-beat-center)/width)**2)
    if interference:
        value = value + .2*np.sin(2*np.pi*50*t)
    return np.where(t >= 0, value, 0.0)


def numerical_convolution(kind="rr", dt=0.002, width=0.02):
    if kind == "ecg":
        count = int(np.ceil(width/dt))
        step = width/count
        t = (np.arange(int(np.ceil(2/step))) + .5)*step
        y = np.convolve(ecg_signal(t), np.ones(count)/width)*step
        return step + np.arange(len(y))*step, y
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
    plt.figure(figsize=(10, 4))
    for width in [.02, .08]:
        t, y = numerical_convolution(kind="ecg", dt=.0005, width=width)
        plt.plot(t, y, label=f"W={width}s, phase delay={width/2}s")
    plt.plot(t, ecg_signal(t, False), "--", label="Clean ECG")
    plt.xlim(0, 2)
    plt.xlabel("t (s)")
    plt.legend()
    plt.show()
