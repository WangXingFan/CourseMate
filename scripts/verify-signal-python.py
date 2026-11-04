"""Numerical and executable-notebook checks for the student Python signal labs."""

import json
import os
import re
import runpy
import subprocess
import sys
import unittest
import zipfile
from pathlib import Path

os.environ["MPLBACKEND"] = "Agg"
os.environ.setdefault("MPLCONFIGDIR", str(Path(__file__).resolve().parents[1] / ".cache/matplotlib"))

import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
RESOURCES = ROOT / "apps/web/public/learning/python"
STEMS = ("lab1_time_domain", "lab2_frequency", "lab3_laplace")
LAB1, LAB2, LAB3 = [runpy.run_path(str(RESOURCES / f"{stem}.py")) for stem in STEMS]


class SignalLabsTest(unittest.TestCase):
    def test_signal_generation_and_area(self):
        np.testing.assert_allclose(LAB1["triangle"](np.array([-1, 0, 1, 2, 3, 4])), [0, 0, 1, 0.5, 0, 0])
        for delta in [0.1, 0.2, 0.5]:
            t, sine, step, exponential, x, _, _, area = LAB1["generate_signals"](
                A=2, a=-2, shift=1, delta=delta)
            self.assertAlmostEqual(area, 1)
            self.assertAlmostEqual(t[np.argmax(x)], 0.5, places=8)
            self.assertAlmostEqual(np.max(x), 2, places=8)
            np.testing.assert_allclose(sine, 2 * np.sin(2 * np.pi * t))
            self.assertTrue(np.all(step[t < 0] == 0))
            self.assertTrue(np.all(exponential[t < 0] == 0))

    def test_system_paths_and_response_decomposition(self):
        for kind, linear_error, shift_error in [("affine", 1, 0), ("square", 2, 0), ("timescale", 0, 1), ("delay", 0, 0), ("integrator", 0, 0)]:
            for test, expected in [("linearity", linear_error), ("invariance", shift_error)]:
                _, left, right = LAB1["compare_system"](kind=kind, test=test)
                self.assertAlmostEqual(float(np.max(np.abs(left - right))), expected)
        t, zi, zs, total = LAB1["response_parts"](y0=2)
        np.testing.assert_allclose(total, 1 + np.exp(-t), atol=1e-14)
        np.testing.assert_allclose(total, zi + zs, atol=1e-14)
        for enabled in [True, False]:
            t, zi, zs, total = LAB1["response_parts"](y0=0.5, input_on=enabled, A=2.5)
            np.testing.assert_allclose(total, 0.5 * np.exp(-t) + 2.5 * enabled * (1 - np.exp(-t)), atol=1e-14)

    def test_continuous_convolution_scaling_and_time_axis(self):
        for dt in [0.002, 0.001]:
            t, y = LAB1["numerical_convolution"](kind="rr", dt=dt)
            q = np.array([-0.5, 0.5, 1, 1.5, 2.5])
            np.testing.assert_allclose(np.interp(q, t, y, left=0), [0, 0.5, 1, 0.5, 0], atol=2 * dt)
            t, y = LAB1["numerical_convolution"](kind="rh", dt=dt)
            q = np.array([0.5, 1, 1.5, 2])
            expected = np.where(q <= 1, -np.expm1(-q), (1 - np.exp(-1)) * np.exp(-(q - 1)))
            np.testing.assert_allclose(np.interp(q, t, y), expected, atol=2 * dt)

    def test_harmonics_and_continuous_fft_phase(self):
        for K in [1, 3, 7, 15]:
            _, _, f, amplitudes = LAB2["synthesize_square"](K=K)
            self.assertEqual(len(f), (K + 1) // 2)
            self.assertEqual(f[-1], K * 10)
            self.assertAlmostEqual(amplitudes[0], 4 / np.pi)
        for T in [0.5, 1, 2]:
            _, _, f, X, theory = LAB2["rectangle_spectrum"](A=2, T=T, shift=1)
            self.assertAlmostEqual(X[np.argmin(np.abs(f))].real, 2 * T, places=10)
            low = np.abs(f) <= 5
            np.testing.assert_allclose(X[low], theory[low], atol=0.00003)
        _, _, f, X, _ = LAB2["rectangle_spectrum"](T=1, shift=1)
        self.assertAlmostEqual(float(np.angle(X[np.argmin(np.abs(f - 0.25))])), -np.pi / 2, places=10)

    def test_lowpass_fitted_ratios(self):
        for fc in [100, 200, 500]:
            _, _, _, ratios, phases = LAB2["lowpass"](fc=fc)
            f = np.array([100, 1000])
            np.testing.assert_allclose(ratios, 1 / np.sqrt(1 + (f / fc)**2), atol=0.0005)
            np.testing.assert_allclose(phases, -np.arctan(f / fc), atol=0.0005)

    def test_multi_order_filter_design_and_audio(self):
        for order in [1, 2, 3]:
            for fc in [100, 200, 316, 500]:
                _, _, _, ratios, _ = LAB2["lowpass"](fc=fc, order=order)
                expected = 1/np.sqrt(1+(np.array([100, 1000])/fc)**(2*order))
                np.testing.assert_allclose(ratios, expected, rtol=0.002)
                self.assertEqual(bool(ratios[0] >= 0.95 and ratios[1] <= 0.05), (order >= 2 and fc == 200) or (order == 3 and fc == 316))
        for enabled in [False, True]:
            t, _, sample_t, samples, rebuilt, ratio = LAB2["sample_audio"](enabled)
            np.testing.assert_allclose(np.interp(sample_t, t, rebuilt), samples, atol=1e-12)
            self.assertAlmostEqual(ratio, 1/np.sqrt(1+15**4) if enabled else 1)

    def test_second_order_poles_and_settling(self):
        for zeta in [0, 0.3, 0.6, 1, 1.5, -0.2]:
            t, y, poles, overshoot, settling = LAB3["second_order_response"](zeta, 3)
            self.assertEqual(y[0], 0)
            np.testing.assert_allclose(np.poly(poles), [1, 6*zeta, 9], atol=1e-12)
            if zeta == 0:
                np.testing.assert_allclose(y, 1-np.cos(3*t), atol=1e-8)
            elif zeta == 1:
                np.testing.assert_allclose(y, 1-(1+3*t)*np.exp(-3*t), atol=1e-8)
            elif zeta < 0:
                self.assertIsNone(settling)
                self.assertGreater(np.max(np.abs(y[-100:]-1)), 10)
            elif zeta < 1:
                self.assertAlmostEqual(overshoot, 100*np.exp(-np.pi*zeta/np.sqrt(1-zeta*zeta)), places=3)
            if zeta == 0.6:
                self.assertLess(overshoot, 15)
                self.assertLess(settling, 3)
                self.assertTrue(np.all(np.abs(y[t >= settling+0.002]-1) <= 0.02))

    def test_ecg_notch_models_and_shared_waveform(self):
        t = np.linspace(-.1, 2, 2101)
        np.testing.assert_allclose(LAB1["ecg_signal"](t), LAB2["ecg_signal"](t), atol=0)
        np.testing.assert_allclose(LAB1["ecg_signal"](t), LAB3["ecg_signal"](t), atol=0)
        for center, alpha in [(50, 5), (50, 10), (50, 60), (48, 10)]:
            _, _, _, ratios = LAB2["ecg_filter"](center=center, alpha=alpha)
            w0, w = 2*np.pi*center, 2*np.pi*np.array([10, 50])
            expected = abs(w0*w0-w*w)/np.hypot(alpha*alpha+w0*w0-w*w, 2*alpha*w)
            np.testing.assert_allclose(ratios, expected, atol=.0002)
        for width in [.02, .08]:
            t, y = LAB1["numerical_convolution"](kind="ecg", width=width, dt=.00025)
            q = .4+width/2
            samples = np.linspace(q-width, q, 10001)
            expected = np.trapezoid(LAB1["ecg_signal"](samples), samples)/width
            self.assertAlmostEqual(float(np.interp(q, t, y)), expected, places=4)
        for alpha in [-10, 0, 10]:
            t, x, y, zeros, poles, f, h = LAB3["notch_poles"](alpha=alpha)
            if alpha == 0:
                np.testing.assert_allclose(y, x, atol=1e-12)
                self.assertEqual(len(poles), 0)
                np.testing.assert_allclose(h, 1)
            else:
                np.testing.assert_allclose(poles.real, -alpha)
                np.testing.assert_allclose(np.abs(zeros.imag), 100*np.pi)
                self.assertAlmostEqual(abs(h[np.argmin(abs(f-50))]), 0)

    def test_aliasing_and_sinc_interpolation(self):
        _, _, _, samples, _, alternative = LAB2["sample_cosine"](fs=15, candidate=5)
        np.testing.assert_allclose(samples, alternative, atol=1e-13)
        t, _, sample_t, samples, rebuilt, _ = LAB2["sample_cosine"](fs=25)
        within = (sample_t >= t[0]) & (sample_t <= t[-1])
        np.testing.assert_allclose(np.interp(sample_t[within], t, rebuilt), samples[within], atol=1e-12)

    def test_laplace_quadrature_against_independent_transforms(self):
        A, a, T, start = 3, 0.5, 2, 1
        for s in [1 + 0j, 1 + 1j, 2 + 1j]:
            expected = {"exp": A / (s + a), "step": A * np.exp(-T * s) / s,
                        "pulse": A * (1 - np.exp(-T * s)) / s,
                        "delayed": A * (np.exp(-start * s) - np.exp(-(start + T) * s)) / s}
            for mode, analytic in expected.items():
                _, _, numeric = LAB3["laplace_probe"](mode=mode, A=A, a=a, T=T, start=start, s=s)
                self.assertLess(abs(numeric - analytic), 1e-7)

    def test_ode_initial_conditions_and_pulse_boundary(self):
        for initial in [0, 0.5, 2]:
            t, total, zi, zs = LAB3["decompose_response"](y0=initial)
            self.assertEqual(total[0], initial)
            np.testing.assert_allclose(total, 1 + (initial - 1) * np.exp(-t), atol=1e-8)
            np.testing.assert_allclose(total, zi + zs, atol=1e-8)
        for T in [0.5, 1.6, 1.61, 3]:
            t, y = LAB3["solve_response"](width=T)
            expected = np.where(t <= T, 1 - np.exp(-t), (1 - np.exp(-T)) * np.exp(-(t - T)))
            np.testing.assert_allclose(y, expected, atol=1e-8)
            self.assertAlmostEqual(float(t[np.argmax(y)]), T)
            self.assertEqual(bool(np.max(y) >= 0.8), T >= 1.61)

    def test_generated_artifacts_and_all_notebook_cells(self):
        subprocess.run([sys.executable, str(ROOT / "scripts/build-signal-python.py"), "--check"], check=True)
        with zipfile.ZipFile(RESOURCES / "coursemate-signal-python.zip") as archive:
            self.assertIsNone(archive.testzip())
            self.assertEqual(len(archive.namelist()), 8)
            for name in archive.namelist():
                self.assertEqual(archive.read(name), (RESOURCES / Path(name).name).read_text(encoding="utf-8").encode())
        for index, stem in enumerate(STEMS, start=1):
            document = json.loads((RESOURCES / f"{stem}.ipynb").read_text(encoding="utf-8"))
            self.assertEqual(document["nbformat"], 4)
            markdown = "\n".join("".join(c["source"]) for c in document["cells"] if c["cell_type"] == "markdown")
            for task in range(1, 5):
                self.assertIn(f"L{index}-{task}", markdown)
            namespace = {"__name__": "__main__"}
            for cell_index, cell in enumerate(document["cells"]):
                if cell["cell_type"] != "code":
                    continue
                self.assertIsNone(cell["execution_count"])
                self.assertEqual(cell["outputs"], [])
                source = "".join(cell["source"])
                exec(compile(source, f"{stem}.ipynb:cell{cell_index}", "exec"), namespace)
                plt.close("all")

    def test_all_twelve_starters_execute_with_published_modules(self):
        model = (ROOT / "apps/web/features/learning/model/python-labs.ts").read_text(encoding="utf-8")
        starters = dict(re.findall(r'"(L[123]-[1-4])": `([^`]+)`', model))
        self.assertEqual(len(starters), 12)
        sys.path.insert(0, str(RESOURCES))
        try:
            for task, source in starters.items():
                exec(compile(source, f"starter:{task}", "exec"), {"__name__": "__main__"})
                plt.close("all")
        finally:
            sys.path.remove(str(RESOURCES))

    def test_parameterized_experiment_code_executes(self):
        script = """
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { createVirtualLabEngine } from './apps/web/public/vendor/signal-lab/core.mjs';
const source = readFileSync('./apps/web/features/learning/model/python-labs.ts', 'utf8');
const { buildPythonLabStarter } = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
const engine = createVirtualLabEngine();
const cases = engine.taskIds.map(id => ({ id, params: engine.defaults(id) }));
for (const [id, changes] of [
  ['L1-1', {mode:'impulse',delta:0.1}], ['L1-1', {a:-2,shift:1,A:2}],
  ['L1-2', {kind:'timescale',test:'invariance',x1:'sin',delay:0.5}],
  ['L1-3', {A:2.5,initial:0.5,enabled:'on'}], ['L1-3', {A:2.5,initial:0.5,enabled:'off'}],
  ['L1-4', {kind:'ecg',time:0.44,width:0.08}], ['L2-1', {K:'15'}], ['L2-2', {A:2,T:0.5,center:-1}],
  ['L2-3', {filterType:'notch',center:50,alpha:10}], ['L2-4', {mode:'audio',fs:'4000',antiAlias:'on',filterOrder:'2',filterCutoff:200}], ['L2-4', {fs:'15',candidate:5}], ['L3-1', {mode:'delayed',A:3,T:2,start:1}],
  ['L3-2', {initial:'0.5',measureTime:2.2}], ['L3-3', {center:50,alpha:10}], ['L3-4', {T:1.61}]
]) cases.push({id, params:{...engine.defaults(id),...changes}});
process.stdout.write(JSON.stringify(cases.map(c => ({...c, code:buildPythonLabStarter(c.id,c.params)}))));
"""
        generated = subprocess.run(["node", "--input-type=module", "-e", script], cwd=ROOT, capture_output=True, text=True, check=True)
        cases = json.loads(generated.stdout)
        sys.path.insert(0, str(RESOURCES))
        try:
            for case in cases:
                namespace = {"__name__": "__main__"}
                exec(compile(case["code"], f"experiment:{case['id']}", "exec"), namespace)
                self.assertGreater(len(plt.get_fignums()), 0, case["id"])
                if case["id"] == "L1-3":
                    p = case["params"]
                    expected = p["initial"] * np.exp(-namespace["t"]) + p["A"] * (p["enabled"] == "on") * (1 - np.exp(-namespace["t"]))
                    np.testing.assert_allclose(namespace["total"], expected, atol=1e-14)
                plt.close("all")
        finally:
            sys.path.remove(str(RESOURCES))


if __name__ == "__main__":
    unittest.main(verbosity=2)
