import type { LabParameters } from "@/public/vendor/signal-lab/core.mjs";

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

export function buildPythonLabStarter(taskID: string, p: LabParameters): string {
  const n = (key: string) => Number(p[key]);
  const s = (key: string) => JSON.stringify(String(p[key]));
  const imports = "import numpy as np\nimport matplotlib.pyplot as plt\n\n";
  const finish = '\nplt.xlabel("t (s)")\nplt.legend()\nplt.show()';
  const signals: Record<string, string> = { constant: "np.ones_like(t)", sin: "np.sin(t)", cos: "np.cos(2*t)" };
  let code: string;
  switch (taskID) {
    case "L1-1": code = `from lab1_time_domain import generate_signals\n${imports}t, sine, step, exponential, x, pulse_t, pulse, area = generate_signals(
    A=${n("A")}, a=${n("a")}, shift=${n("shift")}, delta=${n("delta")}
)
${p.mode === "impulse" ? 'plt.step(pulse_t, pulse, where="mid", label="finite pulse")\nprint("pulse area:", area)' : 'plt.plot(t, x, label="transformed pulse")\nprint("sampled peak:", t[np.argmax(x)], np.max(x))'}`; break;
    case "L1-2": code = `from lab1_time_domain import compare_system\n${imports}t, left, right = compare_system(
    kind=${s("kind")}, test=${s("test")}, alpha=${n("alpha")}, beta=${n("beta")}, delay=${n("delay")},
    x1=lambda t: ${signals[p.x1]}, x2=lambda t: ${signals[p.x2]}
)
plt.plot(t, left, label="path 1")
plt.plot(t, right, "--", label="path 2")
print("maximum difference:", np.max(np.abs(left-right)))`; break;
    case "L1-3": code = `from lab1_time_domain import response_parts\n${imports}t, zero_input, zero_state, total = response_parts(y0=${n("initial")}, input_on=${p.enabled === "on" ? "True" : "False"}, A=${n("A")})
for values, label in [(zero_input, "zero input"), (zero_state, "zero state"), (total, "total")]:
    plt.plot(t, values, label=label)
for q in [0, 1, 3, 5]:
    print(q, np.interp(q, t, total))`; break;
    case "L1-4": code = `from lab1_time_domain import numerical_convolution\n${imports}t, y = numerical_convolution(kind=${s("kind")}, dt=0.002)
q = ${n("time")}
print("y(t):", q, np.interp(q, t, y, left=0, right=0))
plt.plot(t, y, label="numerical convolution")
plt.axvline(q, linestyle="--", label="measurement time")`; break;
    case "L2-1": code = `from lab2_frequency import synthesize_square\n${imports}t, x, frequencies, amplitudes = synthesize_square(K=${n("K")}, f0=10)
print("harmonics:", len(frequencies), "highest frequency:", frequencies[-1])
print("maximum:", x.max())
plt.plot(t, x, label="synthesis")`; break;
    case "L2-2": return `from lab2_frequency import rectangle_spectrum\n${imports}t, x, f, X, theory = rectangle_spectrum(A=${n("A")}, T=${n("T")}, shift=${n("center")}, dt=0.002)
print("X(0):", X[np.argmin(np.abs(f))])
fig, axes = plt.subplots(3, 1, figsize=(8, 8), layout="constrained")
axes[0].plot(t, x)
axes[0].set(xlabel="t (s)", ylabel="x(t)")
axes[1].plot(f, np.abs(X))
axes[1].set(xlim=(-5, 5), xlabel="f (Hz)", ylabel="|X(f)|")
valid = np.abs(X) > np.max(np.abs(X))*1e-3
axes[2].plot(f, np.where(valid, np.angle(X), np.nan))
axes[2].set(xlim=(-5, 5), xlabel="f (Hz)", ylabel="Phase (rad)")
plt.show()`;
    case "L2-3": code = `from lab2_frequency import lowpass\n${imports}t, x, y, ratios, phases = lowpass(fc=${n("fc")})
print("amplitude ratios [100, 1000 Hz]:", ratios)
print("phases (rad):", phases)
plt.plot(t, x, label="input")
plt.plot(t, y, label="output")
plt.xlim(0.1, 0.12)`; break;
    case "L2-4": code = `from lab2_frequency import sample_cosine\n${imports}t, original, sample_t, samples, rebuilt, alternative = sample_cosine(fs=${n("fs")}, f0=10, candidate=${n("candidate")})
print("sample difference:", np.max(np.abs(samples-alternative)))
print("reconstruction error:", np.max(np.abs(original-rebuilt)))
plt.plot(t, original, label="original")
plt.plot(t, rebuilt, "--", label="sinc reconstruction")
plt.scatter(sample_t, samples, label="samples")
plt.xlim(-0.2, 0.2)`; break;
    case "L3-1": code = `from lab3_laplace import laplace_probe\n${imports}for s in [1+0j, 1+1j, 2+1j]:
    t, x, estimate = laplace_probe(mode=${s("mode")}, A=${n("A")}, a=${n("a")}, T=${n("T")}, start=${n("start")}, s=s, end=20)
    print(s, estimate)
plt.plot(t, x, label="input signal")`; break;
    case "L3-2": code = `from lab3_laplace import solve_response\n${imports}t, y = solve_response(y0=0, dt=0.001)
print("y at measurement time:", np.interp(${n("measureTime")}, t, y))
reached = np.flatnonzero(y >= 0.9)
if reached.size:
    print("t90:", t[reached[0]])
plt.plot(t, y, label="numerical response")`; break;
    case "L3-3": code = `from lab3_laplace import decompose_response\n${imports}t, total, zi, zs = decompose_response(y0=${n("initial")})
print("y at measurement time:", np.interp(${n("measureTime")}, t, total))
print("decomposition error:", np.max(np.abs(total-zi-zs)))
for values, label in [(total, "total"), (zi, "zero input"), (zs, "zero state")]:
    plt.plot(t, values, label=label)`; break;
    case "L3-4": code = `from lab3_laplace import solve_response\n${imports}t, y = solve_response(width=${n("T")}, dt=0.001)
index = np.argmax(y)
print("peak time and value:", t[index], y[index])
print("reaches 0.8:", bool(y[index] >= 0.8))
plt.plot(t, y, label="pulse response")`; break;
    default: throw new Error(`Unknown Python task: ${taskID}`);
  }
  return code + finish;
}
