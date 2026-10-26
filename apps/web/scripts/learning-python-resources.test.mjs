import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";
import { createVirtualLabEngine } from "../public/vendor/signal-lab/core.mjs";

const modelSource = readFileSync(new URL("../features/learning/model/python-labs.ts", import.meta.url), "utf8");
const { PYTHON_LAB_ROOT, PYTHON_LABS, PYTHON_LAB_STARTERS } = await import(
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
