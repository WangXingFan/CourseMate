import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";
import { createVirtualLabEngine } from "../public/vendor/signal-lab/core.mjs";

const modelSource = readFileSync(new URL("../features/learning/model/python-labs.ts", import.meta.url), "utf8");
const { PYTHON_LAB_ROOT, PYTHON_LABS, PYTHON_LAB_STARTERS, buildPythonLabStarter } = await import(
  `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(modelSource)).toString("base64")}`
);
const root = new URL(`../public${PYTHON_LAB_ROOT}/`, import.meta.url);

test("all twelve interactive tasks have matching Python resources and translated exercises", () => {
  const engine = createVirtualLabEngine();
  assert.deepEqual(Object.keys(PYTHON_LAB_STARTERS).sort(), [...engine.taskIds].sort());
  const localizations = ["zh-CN", "en-US"].map((locale) => JSON.parse(readFileSync(
    new URL(`../i18n/messages/${locale}/learning.json`, import.meta.url), "utf8"
  )).virtualLab.python);
  assert.deepEqual(Object.keys(localizations[0]).sort(), Object.keys(localizations[1]).sort());
  for (const lab of PYTHON_LABS) {
    const script = readFileSync(new URL(`${lab.stem}.py`, root), "utf8");
    const notebook = JSON.parse(readFileSync(new URL(`${lab.stem}.ipynb`, root), "utf8"));
    assert.equal(notebook.nbformat, 4);
    assert.equal(notebook.metadata.kernelspec.name, "python3");
    const notes = notebook.cells.filter((cell) => cell.cell_type === "markdown").map((cell) => cell.source.join("")).join("\n");
    const code = notebook.cells.filter((cell) => cell.cell_type === "code");
    assert.ok(code.length >= 5);
    for (const cell of code) {
      assert.equal(cell.execution_count, null);
      assert.deepEqual(cell.outputs, []);
      assert.ok(!cell.source.join("").includes(`from ${lab.stem} import`), "notebooks must work without an uploaded script");
    }
    assert.equal((notes.match(/我的记录/g) ?? []).length, 4);
    for (const id of engine.courseIds(lab.id)) {
      assert.ok(notes.includes(id));
      const starter = PYTHON_LAB_STARTERS[id];
      const imported = starter.match(/^from (\w+) import (\w+)/);
      assert.equal(imported?.[1], lab.stem);
      assert.ok(script.includes(`def ${imported[2]}(`));
      for (const locale of localizations) assert.ok(locale.tasks[id]?.length > 30);
    }
  }
  for (const name of ["requirements.txt", "README.md", "coursemate-signal-python.zip"]) {
    assert.ok(readFileSync(new URL(name, root)).length > 20);
  }
  const teacherGuide = readFileSync(new URL("../../../backend/internal/application/learning/assets/teacher-guide.html", import.meta.url), "utf8");
  assert.equal((teacherGuide.match(/<section id="python">/g) ?? []).length, 1);
  assert.ok(teacherGuide.includes('href="#python">Python 编程</a>'));
  assert.ok(teacherGuide.includes("10 分钟交互测量，15 分钟生成信号、改代码并作同参数对照"));
  assert.ok(teacherGuide.includes("源代码、Notebook、图形和 CSV"));
});

test("Python verification follows all task models and current numerical parameters", () => {
  const engine = createVirtualLabEngine();
  for (const id of engine.taskIds) {
    const source = buildPythonLabStarter(id, engine.defaults(id));
    assert.ok(source.includes("plt.show()"), id);
    assert.ok(!/NaN|undefined/.test(source), id);
  }
  assert.match(buildPythonLabStarter("L1-1", { ...engine.defaults("L1-1"), mode: "impulse", delta: 0.1 }), /plt.step\(pulse_t, pulse/);
  assert.match(buildPythonLabStarter("L1-2", { ...engine.defaults("L1-2"), kind: "varying", x1: "cos", test: "invariance" }), /x1=lambda t: np.cos\(2\*t\)/);
  assert.match(buildPythonLabStarter("L1-3", { initial: 0.5, enabled: "off", A: 2.5 }), /y0=0.5, input_on=False, A=2.5/);
  assert.match(buildPythonLabStarter("L2-2", { A: 2, T: 0.5, center: -1 }), /A=2, T=0.5, shift=-1/);
  assert.match(buildPythonLabStarter("L3-3", { initial: "0.5", measureTime: 2.2 }), /y0=0.5/);
  assert.throws(() => buildPythonLabStarter("unknown", {}));
});

test("Python drafts, run snapshots and bounded PNGs survive round-trip and old imports", () => {
  const engine = createVirtualLabEngine();
  const task = engine.records.data.tasks["L1-1"];
  const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
  task.python = { code: "print(2)", result: { code: "print(1)", params: { ...task.params }, time: new Date().toISOString(), stdout: "1\n", stderr: "", plots: [[png]] } };
  const snapshot = JSON.parse(JSON.stringify(engine.records.data));
  engine.records.import(snapshot);
  assert.deepEqual(engine.records.data.tasks["L1-1"].python, task.python);
  assert.notEqual(engine.records.data.tasks["L1-1"].python, task.python);
  const before = JSON.stringify(engine.records.data);
  for (const corrupt of [
    (python) => { python.code = "x".repeat(12001); },
    (python) => { python.result.params.a = 0; },
    (python) => { python.result.time = "invalid"; },
    (python) => { python.result.plots = [["<svg onload=alert(1)>"]]; },
    (python) => { python.result.plots = Array.from({ length: 5 }, () => [png]); },
    (python) => { python.result.plots = [[`iVBORw0KGgo${"A".repeat(262144)}`]]; },
  ]) {
    const invalid = JSON.parse(before);
    corrupt(invalid.tasks["L1-1"].python);
    assert.throws(() => engine.records.import(invalid));
    assert.equal(JSON.stringify(engine.records.data), before);
  }
  for (const task of Object.values(snapshot.tasks)) delete task.python;
  engine.records.import(snapshot);
  assert.deepEqual(engine.records.data.tasks["L1-1"].python, { code: "", result: null });
  assert.equal(createVirtualLabEngine().records.data.tasks["L1-1"].python.code, "");
});
