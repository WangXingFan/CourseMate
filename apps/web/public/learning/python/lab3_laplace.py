# %% [markdown]
# # 实验三 / Lab 3 · 数值核验拉氏变换与响应
# 先独立推导，再用数值积分或微分方程求解核验。时间 s，s 变量单位 s^-1。
# 下面没有代填工作台的解析答案；请自己写变换、初始条件项和设计依据。

# %%
import matplotlib.pyplot as plt
import numpy as np
from scipy.integrate import quad, solve_ivp

# %% [markdown]
# ## L3-1 · 生成信号，对拉普拉斯积分作数值近似
# mode 可选 exp、step、pulse、delayed；与工作台使用相同的 A、a、T、start。
# 练习：先写四类信号的变换；在多个 s 点比较自己的表达式与数值积分。
# 这里只取 Re(s)>0 的共同收敛区域。有限积分窗不能证明 ROC。
# TODO：把 end 从 20 改为 40；区分积分截断误差与解析式错误。

# %%
def laplace_probe(mode="exp", A=1.0, a=1.0, T=1.0, start=1.0, s=1 + 1j, end=20.0):
    if mode not in ("exp", "step", "pulse", "delayed") or a <= 0 or T <= 0 or start < 0:
        raise ValueError("valid mode, a > 0, T > 0 and start >= 0 required")
    if np.real(s) <= 0 or end <= max(T, start + T):
        raise ValueError("Re(s) > 0 and an integration window covering all discontinuities required")

    def x(q):
        if mode == "exp":
            return A * np.exp(-a * q)
        if mode == "step":
            return A * float(q >= T)
        if mode == "pulse":
            return A * float(0 <= q < T)
        return A * float(start <= q < start + T)

    def integrand(q):
        return x(q) * np.exp(-s * q)

    cuts = sorted({q for q in [T, start, start + T] if 0 < q < end})
    real, _ = quad(lambda q: float(np.real(integrand(q))), 0, end, points=cuts, epsabs=1e-10)
    imag, _ = quad(lambda q: float(np.imag(integrand(q))), 0, end, points=cuts, epsabs=1e-10)
    t = np.linspace(0, 5, 2501)
    return t, np.array([x(q) for q in t]), real + 1j * imag


if __name__ == "__main__":
    t, x, estimate = laplace_probe(mode="exp", s=1 + 1j)
    plt.figure(figsize=(10, 4))
    plt.plot(t, x)
    plt.xlabel("t (s)")
    plt.ylabel("x(t)")
    print("L3-1 finite-window Laplace integral =", estimate)
    plt.show()

# %% [markdown]
# ## L3-2 · 通过微分方程独立计算零状态响应
# 方程 y' + y = input(t)。先推 H(s)、X(s)、Y(s)，再将自己的解与数值曲线比较。
# TODO：测量 y(1) 与首次达到 0.9 的时间；解释步长对测量的影响。

# %%
def solve_response(y0=0.0, input_on=True, width=None, dt=0.001, end=5.0):
    """矩形输入按切换时刻分段求解，避免积分器跨越不连续点。"""
    if dt <= 0 or end <= 0 or (width is not None and width <= 0):
        raise ValueError("dt, end and optional width must be positive")
    cuts = [0.0] + ([float(width)] if width is not None and width < end else []) + [float(end)]
    times, values = [0.0], [float(y0)]
    for lo, hi in zip(cuts[:-1], cuts[1:], strict=True):
        active = float(input_on and (width is None or lo < width))
        grid = np.linspace(lo, hi, int(np.ceil((hi - lo) / dt)) + 1)
        result = solve_ivp(lambda _t, y, level=active: level - y, (lo, hi), [values[-1]],
                           t_eval=grid, rtol=1e-9, atol=1e-11, max_step=dt)
        if not result.success:
            raise RuntimeError(result.message)
        times.extend(result.t[1:])
        values.extend(result.y[0, 1:])
    return np.array(times), np.array(values)


if __name__ == "__main__":
    t, y = solve_response(y0=0.0)
    plt.figure(figsize=(10, 4))
    plt.plot(t, y, label="Numerical zero-state response")
    plt.xlabel("t (s)")
    plt.ylabel("y(t)")
    plt.legend()
    # TODO: add your independently derived curve and compute its maximum error.
    plt.show()

# %% [markdown]
# ## L3-3 · 改变初值，数值验证响应分解
# 练习：对 y0=0、0.5、2 分别运行，检查起点、方向及长期值。
# TODO：独立推导时保留 sY-y0；用 np.interp 读 t=1，并计算分量相加的误差。

# %%
def decompose_response(y0=2.0, dt=0.001):
    t, total = solve_response(y0=y0, dt=dt)
    _, zero_input = solve_response(y0=y0, input_on=False, dt=dt)
    _, zero_state = solve_response(y0=0.0, dt=dt)
    return t, total, zero_input, zero_state


if __name__ == "__main__":
    t, total, zi, zs = decompose_response(y0=2.0)
    plt.figure(figsize=(10, 4))
    for values, label in [(total, "Total"), (zi, "Zero input"), (zs, "Zero state")]:
        plt.plot(t, values, label=label)
    plt.xlabel("t (s)")
    plt.ylabel("y(t)")
    plt.legend()
    plt.show()

# %% [markdown]
# ## L3-4 · 自己生成有限脉冲，寻找最短达标持续时间
# 练习：先预测，运行 T=0.5、1、2、3，再自己选临界区的更细参数。
# 要求峰值 >=0.8。数值最大值受时间网格影响，判定不能只看显示的四舍五入值。
# TODO：由拉氏变换推导峰值不等式，并给出相邻更短方案不达标的证据。

# %%
if __name__ == "__main__":
    widths = [0.5, 1.0, 2.0, 3.0]  # 补充自己选择的临界区候选
    plt.figure(figsize=(10, 4))
    for T in widths:
        t, y = solve_response(width=T)
        peak_index = int(np.argmax(y))
        print(f"L3-4 T={T:g} s, peak={y[peak_index]:.8f}, peak time={t[peak_index]:.6f} s")
        plt.plot(t, y, label=f"T={T:g} s")
    plt.axhline(0.8, color="0.4", linestyle="--", label="Target 0.8")
    plt.xlabel("t (s)")
    plt.ylabel("y(t)")
    plt.legend()
    plt.show()
