# %% [markdown]
# # 实验二 / Lab 2 · 频谱、滤波与采样
# 先在代码中生成输入信号，再求频谱或系统输出。时间 s，频率 Hz。
# 每项任务先写预测，至少修改一个参数，保存图形及读数并与工作台比较。

# %%
import matplotlib.pyplot as plt
import numpy as np
from scipy import signal

# %% [markdown]
# ## L2-1 · 用循环叠加正弦谐波
# 练习：将 K 改为 1、3、7、15。K 表示最高谐波次数，不是叠加项数。
# TODO：记录项数、最高频率、跳变附近极值；解释吉布斯现象。

# %%
def synthesize_square(K=7, f0=10.0):
    if K < 1 or f0 <= 0:
        raise ValueError("K >= 1 and f0 > 0 required")
    harmonics = np.arange(1, int(K) + 1, 2)
    t = np.linspace(-1 / f0, 1 / f0, 6001)
    components = 4 / (np.pi * harmonics[:, None]) * np.sin(2 * np.pi * f0 * harmonics[:, None] * t)
    return t, components.sum(axis=0), harmonics * f0, 4 / (np.pi * harmonics)


if __name__ == "__main__":
    K = 7  # 修改这里 / Edit here
    t, x, frequencies, amplitudes = synthesize_square(K)
    fig, axes = plt.subplots(2, 1, figsize=(10, 7), layout="constrained")
    axes[0].plot(t, x)
    axes[0].set(xlabel="t (s)", ylabel="x(t)")
    axes[1].stem(frequencies, amplitudes)
    axes[1].set(xlabel="f (Hz)", ylabel="One-sided harmonic amplitude")
    print(f"L2-1 terms = {len(frequencies)}, highest frequency = {frequencies[-1]:g} Hz")
    plt.show()

# %% [markdown]
# ## L2-2 · 从矩形采样值计算连续傅里叶变换的近似
# 练习：T=0.5、1、2，shift=0、1，A=1、2；固定其他参数逐个比较。
# FFT 乘 dt 近似积分，按时间轴起点补相位；它不是方波的单边谐波谱。
# np.sinc(q)=sin(pi*q)/(pi*q)。零点附近相位无定义，不应读取。
# TODO：记录零频值、首零点；改变 dt 与观察窗，区分数值误差与时移相位。

# %%
def rectangle_spectrum(A=1.0, T=1.0, shift=0.0, dt=0.002, span=8.0):
    if dt <= 0 or T <= 0 or span <= 0 or abs(shift) + T / 2 >= span / 2:
        raise ValueError("positive dt, T, span and a window containing the full pulse required")
    # 中点采样，脉冲左闭右开，避免两个边界被同时计数。
    count = int(np.ceil(span / dt))
    dt = span / count
    t = -span / 2 + (np.arange(count) + 0.5) * dt
    x = A * ((t >= shift - T / 2) & (t < shift + T / 2))
    f = np.fft.fftshift(np.fft.fftfreq(count, dt))
    X = np.fft.fftshift(np.fft.fft(x)) * dt * np.exp(-2j * np.pi * f * t[0])
    theoretical = A * T * np.sinc(f * T) * np.exp(-2j * np.pi * f * shift)
    return t, x, f, X, theoretical


if __name__ == "__main__":
    t, x, f, X, theory = rectangle_spectrum(A=1.0, T=1.0, shift=0.0)
    fig, axes = plt.subplots(3, 1, figsize=(10, 9), layout="constrained")
    axes[0].plot(t, x)
    axes[0].set(xlabel="t (s)", ylabel="x(t)")
    axes[1].plot(f, np.abs(X), label="dt * FFT")
    axes[1].plot(f, np.abs(theory), "--", label="Continuous transform")
    axes[1].set(xlim=(-5, 5), xlabel="f (Hz)", ylabel="|X(f)| (amplitude*s)")
    axes[1].legend()
    valid = np.abs(X) > np.max(np.abs(X)) * 1e-3
    axes[2].plot(f, np.where(valid, np.angle(X), np.nan), ".-")
    axes[2].set(xlim=(-5, 5), xlabel="f (Hz)", ylabel="Phase (rad)")
    plt.show()

# %% [markdown]
# ## L2-3 · 生成双频信号，并通过一阶低通系统
# 练习：fc=100、200、500 Hz；比较保留 100 Hz 与抑制 1000 Hz 的幅度比。
# lsim 数值求解连续系统，拟合窗口固定为 0.1–0.2 s；幅度比不是功率比。
# TODO：补写理论幅频式，对照拟合值；据两个指标选择方案并解释。

# %%
def lowpass(fc=200.0, dt=0.00001):
    if fc <= 0 or dt <= 0 or dt >= 1 / 2000:
        raise ValueError("fc > 0 and 0 < dt < 1/2000 required")
    t = np.linspace(0, 0.2, int(np.ceil(0.2 / dt)) + 1)
    x = np.sin(2 * np.pi * 100 * t) + 0.3 * np.sin(2 * np.pi * 1000 * t)
    omega_c = 2 * np.pi * fc
    _, y, _ = signal.lsim(([omega_c], [1, omega_c]), U=x, T=t)
    fit = (t >= 0.1) & (t <= 0.2)
    q = t[fit]
    basis = np.column_stack([np.sin(2 * np.pi * 100 * q), np.cos(2 * np.pi * 100 * q),
                             np.sin(2 * np.pi * 1000 * q), np.cos(2 * np.pi * 1000 * q), np.ones_like(q)])
    c = np.linalg.lstsq(basis, y[fit], rcond=None)[0]
    ratios = np.array([np.hypot(c[0], c[1]), np.hypot(c[2], c[3]) / 0.3])
    phases = np.arctan2(c[[1, 3]], c[[0, 2]])
    return t, x, y, ratios, phases


if __name__ == "__main__":
    t, x, y, ratios, phases = lowpass(fc=200.0)
    plt.figure(figsize=(10, 4))
    plt.plot(t, x, label="Input: 100 Hz + 1000 Hz")
    plt.plot(t, y, label="Low-pass output")
    plt.xlim(0.1, 0.12)
    plt.xlabel("t (s)")
    plt.ylabel("Amplitude")
    plt.legend()
    print("L2-3 fitted amplitude ratios [100, 1000 Hz] =", ratios)
    print("Phase (rad) =", phases)
    plt.show()

# %% [markdown]
# ## L2-4 · 按采样时刻自己生成离散样本
# 练习：fs=100、25、15 Hz；改 candidate 找到相同样本的低频余弦。
# sinc 重建只使用 [-1,1] s 的有限样本，因此会有截断误差。
# TODO：写出 n=0、1、2、3 的样本；区分混叠与有限样本边缘误差。

# %%
def sample_cosine(fs=25.0, f0=10.0, candidate=5.0):
    if fs <= 0:
        raise ValueError("fs must be positive")
    n = np.arange(-int(np.floor(fs)), int(np.floor(fs)) + 1)
    sample_t = n / fs
    samples = np.cos(2 * np.pi * f0 * sample_t)
    alternative = np.cos(2 * np.pi * candidate * sample_t)
    t = np.linspace(-0.2, 0.2, 1601)
    reconstructed = np.sinc(fs * (t[:, None] - sample_t)) @ samples
    return t, np.cos(2 * np.pi * f0 * t), sample_t, samples, reconstructed, alternative


if __name__ == "__main__":
    t, original, sample_t, samples, reconstructed, alternative = sample_cosine(fs=25.0, candidate=5.0)
    plt.figure(figsize=(10, 4))
    plt.plot(t, original, label="Original cosine")
    plt.plot(t, reconstructed, "--", label="Finite sinc interpolation")
    plt.stem(sample_t, samples, linefmt="C2-", markerfmt="C2o", basefmt=" ")
    plt.xlim(-0.2, 0.2)
    plt.xlabel("t (s)")
    plt.ylabel("Amplitude")
    plt.legend()
    print("L2-4 maximum candidate sample difference =", np.max(np.abs(samples - alternative)))
    plt.show()
