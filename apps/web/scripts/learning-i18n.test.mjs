import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import katex from "katex";
import { createTranslator } from "next-intl";

// Resolve the parser already used by next-intl, without adding a dependency.
const require = createRequire(import.meta.url);
const intlRequire = createRequire(require.resolve("next-intl"));
const formatRequire = createRequire(createRequire(intlRequire.resolve("use-intl")).resolve("intl-messageformat"));
const { parse } = await import(pathToFileURL(formatRequire.resolve("@formatjs/icu-messageformat-parser")));
const messagesRoot = new URL("../i18n/messages/", import.meta.url);

for (const locale of ["zh-CN", "en-US"]) {
  test(`${locale}: all formatted messages parse and raw lesson formulas render`, () => {
    let formatted = 0;
    let formulas = 0;
    function visit(value, key, file) {
      if (typeof value !== "string") {
        for (const [name, child] of Object.entries(value)) visit(child, key ? `${key}.${name}` : name, file);
        return;
      }
      // These are data consumed with t.raw(), not ICU messages.
      if (["learning.json", "learning-labs.json"].includes(file) && key.endsWith(".formula")) {
        assert.doesNotThrow(() => katex.renderToString(value, { throwOnError: true }), `${file}:${key}`);
        formulas++;
      } else {
        assert.doesNotThrow(() => parse(value), `${file}:${key}`);
        formatted++;
      }
    }
    const directory = new URL(`${locale}/`, messagesRoot);
    for (const file of readdirSync(directory).filter((name) => name.endsWith(".json"))) {
      visit(JSON.parse(readFileSync(new URL(file, directory), "utf8")), "", file);
    }
    assert.ok(formatted > 1000);
    assert.equal(formulas, 13);
  });

  test(`${locale}: prose exponents retain literal braces and scenario parameters interpolate`, () => {
    const learning = JSON.parse(readFileSync(new URL(`${locale}/learning.json`, messagesRoot), "utf8"));
    const labs = JSON.parse(readFileSync(new URL(`${locale}/learning-labs.json`, messagesRoot), "utf8"));
    const t = createTranslator({ locale, messages: { learning, labs }, onError(error) { throw error; } });
    assert.equal(t("labs.experiments.signalBasics.scenario.energy", { a: 2, d: 3 }), "x(t) = 2·e^{−3t}·u(t)");
    assert.ok(t("labs.quiz.questions.energy-signal.prompt").includes("e^{−2t}"));
    assert.ok(t("learning.convolution.controls.description").includes("e^{-t}"));
    assert.ok(t("learning.convolution.observe.rising").includes("e^{−(t+0.5)}"));
    assert.ok(t("learning.firstOrder.insight.definition").includes("e^{−1}"));
    assert.ok(t.raw("learning.convolution.formula").includes("\\int_{-\\infty}^{\\infty}"));
  });
}
