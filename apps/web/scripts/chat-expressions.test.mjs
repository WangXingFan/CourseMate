import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

const source = await readFile(new URL("../shared/lib/safe-expression.ts", import.meta.url), "utf8");
const js = stripTypeScriptTypes(source, { mode: "transform" });
const { compileExpression, ExpressionError } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`);

test("signal formulas use the requested parameters and mathematical precedence", () => {
  const response = compileExpression("1-exp(-t/tau)");
  close(response.evaluate({ t: 1, tau: 1 }), 1 - Math.exp(-1));
  close(response.evaluate({ t: 1, tau: 2 }), 1 - Math.exp(-0.5));
  close(compileExpression("sin(2*pi*x)").evaluate({ x: 0.25 }), 1);
  close(compileExpression("-2^2").evaluate({}), -4);
  close(compileExpression("2^3^2").evaluate({}), 512);
});

test("variables exclude only declared mathematical constants", () => {
  assert.deepEqual(compileExpression("a*cos(2*pi*f*t)+e").variables, ["a", "f", "t"]);
  assert.throws(() => compileExpression("missing+1").evaluate({}), /unknown variable/);
});

test("model formulas cannot call scripts or inherited object functions", () => {
  for (const expression of ["alert(1)", "constructor(1)", "toString(1)", "__proto__(1)", "x;alert(1)", "Math.sin(x)"])
    assert.throws(() => compileExpression(expression), ExpressionError);
  for (const name of ["constructor", "toString", "__proto__"])
    assert.throws(() => compileExpression(name).evaluate({}), /unknown variable/);
  assert.throws(() => compileExpression("1".repeat(513)), /too long/);
});
