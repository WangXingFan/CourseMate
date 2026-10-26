export const PYTHON_LAB_ROOT = "/learning/python";

export const PYTHON_LABS = [
  { id: "L1", stem: "lab1_time_domain" },
  { id: "L2", stem: "lab2_frequency" },
  { id: "L3", stem: "lab3_laplace" },
] as const;

export const PYTHON_LAB_STARTERS: Record<string, string> = {
  "L1-1": `from lab1_time_domain import generate_signals
import matplotlib.pyplot as plt

t, sine, step, exponential, x, pulse_t, pulse, area = generate_signals(
    A=1, a=1, shift=0, delta=0.2, f0=1, phase=0
)
plt.plot(t, sine, label="sine")
plt.plot(t, x, label="transformed pulse")
plt.xlabel("t (s)")
plt.legend()
plt.show()`,
  "L1-2": `from lab1_time_domain import compare_system
import numpy as np

t, left, right = compare_system(
    kind="square", test="linearity", alpha=1, beta=1, delay=1,
    x1=lambda t: np.ones_like(t), x2=lambda t: np.ones_like(t)
)
print(np.max(np.abs(left - right)))`,
  "L1-3": `from lab1_time_domain import response_parts
import numpy as np

t, zero_input, zero_state, total = response_parts(y0=2, input_on=True)
for q in [0, 1, 3, 5]:
    print(q, np.interp(q, t, total))`,
  "L1-4": `from lab1_time_domain import numerical_convolution
import numpy as np

t, y = numerical_convolution(kind="rr", dt=0.002)
for q in [-0.5, 0.5, 1, 1.5, 2.5]:
    print(q, np.interp(q, t, y, left=0, right=0))`,
  "L2-1": `from lab2_frequency import synthesize_square

for K in [1, 3, 7, 15]:
    t, x, frequencies, amplitudes = synthesize_square(K=K, f0=10)
    print(K, len(frequencies), frequencies[-1], x.max())`,
  "L2-2": `from lab2_frequency import rectangle_spectrum
import numpy as np

t, x, f, X, theory = rectangle_spectrum(A=1, T=1, shift=0, dt=0.002)
index = np.argmin(np.abs(f - 0.25))
print(f[index], np.abs(X[index]), np.angle(X[index]))`,
  "L2-3": `from lab2_frequency import lowpass

for fc in [100, 200, 500]:
    t, x, y, ratios, phases = lowpass(fc=fc)
    print(fc, ratios, phases)`,
  "L2-4": `from lab2_frequency import sample_cosine
import numpy as np

t, original, sample_t, samples, rebuilt, candidate = sample_cosine(
    fs=15, f0=10, candidate=5
)
print(np.max(np.abs(samples - candidate)))`,
  "L3-1": `from lab3_laplace import laplace_probe

for s in [1 + 0j, 1 + 1j, 2 + 1j]:
    t, x, estimate = laplace_probe(
        mode="delayed", A=3, T=2, start=1, s=s, end=20
    )
    print(s, estimate)`,
  "L3-2": `from lab3_laplace import solve_response
import numpy as np

t, y = solve_response(y0=0, dt=0.001)
print(np.interp(1, t, y))
reached = np.flatnonzero(y >= 0.9)
if reached.size:
    print(t[reached[0]])`,
  "L3-3": `from lab3_laplace import decompose_response
import numpy as np

for y0 in [0, 0.5, 2]:
    t, total, zi, zs = decompose_response(y0=y0)
    print(y0, total[0], np.interp(1, t, total))
    print(np.max(np.abs(total - zi - zs)))`,
  "L3-4": `from lab3_laplace import solve_response
import numpy as np

for T in [0.5, 1, 2, 3]:
    t, y = solve_response(width=T, dt=0.001)
    index = np.argmax(y)
    print(T, t[index], y[index])`,
};
