// Run from the workspace root after building the static frontend.
// UI fixtures exercise the bridge and retry behavior; Go tests cover real auth/DB.
// Set VIRTUAL_LAB_BASE_URL to also verify a running Go server's static responses.
import assert from "node:assert/strict";
import { LAB_FLOWS, labReading } from "../features/learning/model/virtual-lab-flow.ts";
import { BLACK_BOX_PROBES, blackBoxChoices, blackBoxComplete, blackBoxEvidence, blackBoxParams, blackBoxScene, createBlackBoxes } from "../features/learning/model/virtual-lab-black-box.ts";
import { diagnosisComplete, diagnosisScene, expectedDiagnosis } from "../features/learning/model/virtual-lab-response-diagnosis.ts";
import { ECG_STATIONS, ECG_EXERCISES, ecgComplete } from "../features/learning/model/virtual-lab-ecg.ts";
import { createVirtualLabEngine } from "../public/vendor/signal-lab/core.mjs";
import { createVirtualLabEngine as createPhaseTwoEngine } from "../public/vendor/signal-lab/legacy-v1.1.mjs";
import { createVirtualLabEngine as createLegacyEngine } from "../public/vendor/signal-lab/legacy-v1.mjs";
import { labAnswers } from "./virtual-lab-fixtures.mjs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, readFile, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";

const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON);
const { chromium } = require("playwright-core");
const root = resolve("apps/web/out"), artifacts = resolve(".cache/virtual-lab-smoke");
await mkdir(artifacts, { recursive: true });
const server = createServer(async (req, res) => {
  try {
    let path = resolve(root, `.${decodeURIComponent(new URL(req.url, "http://localhost").pathname)}`);
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    try { await stat(`${path}.html`); path += ".html"; }
    catch { if ((await stat(path)).isDirectory()) path = join(path, "index.html"); }
    res.setHeader("Content-Type", ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2" })[extname(path)] ?? "application/octet-stream");
    res.setHeader("X-Frame-Options", "DENY");
    if (path === join(root, "vendor", "signal-lab", "index.html")) {
      res.setHeader("X-Frame-Options", "SAMEORIGIN");
      res.setHeader("Content-Security-Policy", "frame-ancestors 'self'");
    }
    res.end(await readFile(path));
  } catch { res.writeHead(404).end("Not found"); }
});
const externalBase = process.env.VIRTUAL_LAB_BASE_URL?.replace(/\/$/, "");
if (!externalBase) await new Promise((done) => server.listen(0, "127.0.0.1", done));
const base = externalBase || `http://127.0.0.1:${server.address().port}`;
const now = new Date().toISOString();
let actor = 101, role = "student", failSave = false, failLoad = false;
const records = new Map(), writes = [], errors = [];
const guide = await readFile("backend/internal/application/learning/assets/teacher-guide.html", "utf8");
const user = () => ({ id: actor, publicID: `qa-${actor}`, username: `student${actor}`, displayName: `实验测试${actor}`, role,
  status: "active", locale: "zh-CN", timezone: "Asia/Shanghai", initialSecurityRequired: false, initialUsernameRequired: false,
  mustResetPassword: false, onboardingCompletedAt: now, appearancePreferences: "", profilePreferences: "",
  identityProviders: [], email: "", phone: "", passwordEnabled: true });
let browser, page;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const context = await browser.newContext({ locale: "zh-CN", timezoneId: "Asia/Shanghai", viewport: { width: 1360, height: 950 }, acceptDownloads: true });
  await context.route("**/api/v1/**", async (route) => {
    const req = route.request(), url = new URL(req.url());
    const accountId = Number(req.headers().authorization?.split("-").at(-1)) || actor;
    let data = {};
    if (url.pathname.endsWith("/learning/virtual-lab/access")) data = { courses: { L1: true, L2: true, L3: true } };
    else if (url.pathname.endsWith("/learning/virtual-lab/guide")) {
      if (!["teacher", "admin", "superadmin"].includes(role)) { await route.fulfill({ status: 403, json: { errorMsg: "forbidden", data: null } }); return; }
      data = { html: guide };
    } else if (url.pathname.endsWith("/learning/virtual-lab")) {
      const previous = records.get(accountId) || { accountId, revision: 0, document: "", updatedAt: null };
      if (req.method() === "PUT") {
        const body = req.postDataJSON();
        writes.push({ accountId, ...body });
        assert.ok(!Object.hasOwn(body, "userId"));
        if (failSave) { failSave = false; await route.abort("connectionfailed"); return; }
        if (body.revision !== previous.revision && body.document !== previous.document) {
          await route.fulfill({ status: 409, json: { errorMsg: "conflict", data: null } }); return;
        }
        const next = body.document === previous.document ? previous : { accountId, revision: previous.revision + 1, document: body.document, updatedAt: now };
        records.set(accountId, next); data = next;
      } else {
        if (failLoad) { await route.abort("connectionfailed"); return; }
        data = previous;
      }
    } else if (url.pathname.endsWith("/auth/refresh")) data = { accessToken: `qa-student-${actor}`, sessionID: "qa-session" };
    else if (url.pathname.endsWith("/me")) data = { user: user() };
    else if (url.pathname.endsWith("/user/settings")) data = { settings: {} };
    else if (url.pathname.endsWith("/capabilities")) data = { features: { knowledgeBases: true, classrooms: true } };
    else if (url.pathname.endsWith("/branding")) data = { title: "CourseMate", shortName: "CourseMate", description: "", logoURL: "", faviconURL: "/favicon.ico", pwaIcon192URL: "", pwaIcon512URL: "", pwaMaskableIcon512URL: "", appleTouchIcon180URL: "" };
    else if (url.pathname.endsWith("/version")) { await route.fulfill({ json: { version: "0.4.4-beta.3", buildID: "" } }); return; }
    else data = { total: 0, results: [], models: [], groups: [], conversations: [], knowledgeBases: [], settings: {} };
    await route.fulfill({ json: { errorMsg: "", data } });
  });
  page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /FORMATTING_ERROR|MISSING_MESSAGE|INVALID_MESSAGE|IntlError/.test(message.text())) errors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "";
    // Navigating away disposes the sandbox and cancels any pending runtime download.
    if (request.url().includes("jsdelivr.net/pyodide") && failure !== "net::ERR_ABORTED") errors.push(`Pyodide request failed: ${request.url()} ${failure}`);
  });
  page.on("response", (response) => {
    if (response.url().includes("jsdelivr.net/pyodide") && response.status() >= 400) errors.push(`Pyodide response ${response.status()}: ${response.url()}`);
  });
  const frame = () => page.locator("[data-native-lab]");
  const engine = createVirtualLabEngine();
  engine.records.data.tasks["L1-2"].analysis = "原系统性质实验的分析记录";
  const draws = [0.1, 0.5, 0.1], smokeBoxes = createBlackBoxes(engine.records.data.tasks["L1-2"], () => draws.shift() ?? 0.5);
  assert.equal(new Set(smokeBoxes.map((box) => box.kind)).size, 3, "L1-2 gives each black box a different model");
  const seedBox = smokeBoxes[2], seedRecord = engine.records.data.tasks["L1-2"];
  seedRecord.params = blackBoxParams(engine, seedBox, "baseline");
  seedRecord.answers = { evidence: blackBoxEvidence(seedRecord.params) };
  engine.records.trial("L1-2", blackBoxScene(engine, seedBox, "baseline"), null);
  const diagnosisCases = [{ initial: 0.5, amplitude: 1, target: "initial" }, { initial: 2, amplitude: 1.5, target: "input" }, { initial: 0.5, amplitude: 1, target: "initial" }];
  const diagnosisRecord = engine.records.data.tasks["L1-3"];
  diagnosisRecord.params = { ...engine.defaults("L1-3"), A: 1, initial: 0.5, enabled: "on" };
  engine.records.trial("L1-3", diagnosisScene(engine, diagnosisCases, 0, { source: "neither", test: "clearBoth", prediction: "overlap" }), null);
  records.set(101, { accountId: 101, revision: 1, document: JSON.stringify(engine.records.data), updatedAt: now });
  const fillObservation = async (id, step, params, estimateValue) => {
    if (!step.observation) return;
    const readings = engine.scene(id, params, labAnswers(id, params)).readings;
    const value = String(labReading(readings, step.observation.reading));
    if (step.predictedReadingKey && await frame().locator("[data-reading-prediction]").count()) {
      const estimate = estimateValue ?? String(labReading(readings, step.predictedReadingKey));
      const estimateField = frame().locator("#reading-estimate");
      if (await estimateField.evaluate((element) => element.tagName === "SELECT")) await estimateField.selectOption(estimate);
      else await estimateField.fill(estimate);
      await frame().locator('[data-action="reading-estimate"]').click();
    }
    const field = frame().locator("#observation");
    if (await field.evaluate((element) => element.tagName === "SELECT")) await field.selectOption(value);
    else await field.fill(value);
  };
  const saved = () => page.getByText("已保存到当前账号", { exact: true }).waitFor();
  await page.goto(`${base}/learn/experiments`);
  await page.getByRole("heading", { name: "信号与系统 · 三次完整实验", exact: true }).waitFor();
  assert.equal(await page.locator('a[href*="workspace#course/"]').count(), 3);
  assert.equal(await page.getByText("教师开课指南", { exact: true }).count(), 0);
  assert.equal(await page.locator("[data-python-resources]").count(), 0, "Python resources belong in Learning Tools");
  await page.goto(`${base}/learn/python`);
  const pythonResources = page.locator("[data-python-resources]");
  await pythonResources.getByRole("heading", { name: "Python 编程资源", exact: true }).waitFor();
  await pythonResources.locator("[data-python-editor]").waitFor();
  const resourceLinks = await pythonResources.locator("a[download]").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  assert.equal(resourceLinks.length, 4);
  for (const href of resourceLinks) {
    const response = await context.request.get(`${base}${href}`);
    assert.equal(response.status(), 200, href);
    assert.deepEqual(await response.body(), await readFile(join(root, href)), href);
  }
  const pythonDownload = page.waitForEvent("download");
  await pythonResources.getByRole("link", { name: "下载全部代码与 Notebook", exact: true }).click();
  const pythonFile = await pythonDownload;
  assert.equal(pythonFile.suggestedFilename(), "coursemate-signal-python.zip");
  assert.deepEqual(await readFile(await pythonFile.path()), await readFile(join(root, "learning/python/coursemate-signal-python.zip")));
  if (process.env.PYTHON_RUNTIME_SMOKE === "1") {
    const runButton = pythonResources.getByRole("button", { name: "运行代码", exact: true });
    const editor = pythonResources.locator("[data-python-editor]");
    const starter = await editor.inputValue();
    try {
      // A failure on the very first run must return a result and allow correction.
      await editor.fill('raise ValueError("CourseMate Python recovery check")');
      await runButton.click({ timeout: 120000 });
      await pythonResources.getByRole("alert").filter({ hasText: "ValueError: CourseMate Python recovery check" }).waitFor({ timeout: 120000 });
      await assertEventually(async () => assert.ok(await runButton.isEnabled(), "Python errors must not leave Run disabled"));
      await editor.fill(starter);
      await runButton.click();
      await pythonResources.locator("figure img").first().waitFor({ timeout: 120000 });
      await assertEventually(async () => assert.ok(await runButton.isEnabled(), "Run must be available again after a plot is returned"));
      const originalPlot = await pythonResources.locator("figure img").first().getAttribute("src");
      await editor.fill(starter.replace("A=1", "A=2"));
      await runButton.click();
      await pythonResources.locator("figure img").first().waitFor();
      await assertEventually(async () => assert.ok(await runButton.isEnabled(), "Repeated runs must return to ready"));
      assert.notEqual(await pythonResources.locator("figure img").first().getAttribute("src"), originalPlot, "Edited L1-1 parameters must update the plot");
      assert.equal(await pythonResources.getByRole("alert").count(), 0);

      for (const width of [1440, 390]) for (const theme of ["light", "dark"]) {
        await page.setViewportSize({ width, height: 844 });
        await page.evaluate((theme) => {
          document.documentElement.classList.toggle("dark", theme === "dark");
        }, theme);
        const dimensions = await pythonResources.evaluate((element) => {
          element.scrollTop = 0;
          return { height: element.clientHeight, content: element.scrollHeight, width: element.clientWidth, contentWidth: element.scrollWidth };
        });
        assert.ok(dimensions.content > dimensions.height, "Plot results should have scrollable content");
        assert.ok(dimensions.contentWidth <= dimensions.width, "Python results must fit the viewport width");
        const bounds = await pythonResources.boundingBox();
        await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        await page.mouse.wheel(0, 10000);
        await assertEventually(async () => assert.ok(await pythonResources.evaluate((element) => element.scrollTop > 0), "Mouse wheel must scroll the Python page after plotting"));
        await pythonResources.getByRole("link", { name: "下载运行指南", exact: true }).waitFor();
        const footer = await pythonResources.getByRole("link", { name: "下载运行指南", exact: true }).boundingBox();
        assert.ok(footer.y >= 0 && footer.y + footer.height <= 844, "Downloads below the plots must remain reachable");
        assert.ok((await pythonResources.locator("figure img").first().boundingBox()).height <= 844 * 0.6 + 1, "Plots must respect the viewport height limit");
        await page.screenshot({ path: join(artifacts, `python-result-${width}-${theme}.png`) });
        await page.mouse.wheel(0, -10000);
        await assertEventually(async () => assert.equal(await pythonResources.evaluate((element) => element.scrollTop), 0, "Mouse wheel must return to the code and Run button"));
      }
      await page.setViewportSize({ width: 1360, height: 950 });
      await page.evaluate(() => document.documentElement.classList.remove("dark"));
    } catch (error) {
      console.error("Pyodide status:", await pythonResources.getByRole("status").allTextContents().catch(() => []));
      console.error("Pyodide alerts:", await pythonResources.locator('[role="alert"]').allTextContents().catch(() => []));
      console.error("Pyodide network errors:", errors);
      throw error;
    }
    const plot = pythonResources.locator("figure img").first();
    assert.ok(await plot.evaluate((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0), "Python waveform should decode as an image");
  }
  await page.goto(`${base}/learn/experiments/workspace#task/L1-1`);
  await frame().locator("#prediction").waitFor();
  assert.equal(await frame().locator("#param-a, #param-A, #param-shift, #param-delta").count(), 0, "Adjustment controls are absent during prediction");
  assert.equal(await frame().locator('[data-lab-givens] svg[data-chart="given"]').count(), 1, "Prediction needs the original signal");
  assert.equal(await frame().locator('[data-lab-givens] [data-series]').count(), 1, "Only the original signal is shown");
  assert.equal(await frame().locator('[data-lab-givens] [data-series="f(t)"]').count(), 1);
  assert.equal(await frame().locator('svg[data-chart="main"]').count(), 0, "The transformed result is still hidden");
  assert.equal(await frame().locator('[data-phase="observe"]').isDisabled(), true);
  assert.equal(await frame().locator('[data-reading-prediction]').count(), 0, "A numeric estimate appears in the observation phase");
  assert.equal(await frame().locator('[data-python-task]').count(), 0, "Programming does not distract from the first step");
  await frame().locator("#prediction").fill("组合变换会改变峰值位置与高度，窄脉冲的面积保持不变。");
  await frame().locator('[data-action="prediction"]').click();
  for (let index = 0; index < LAB_FLOWS["L1-1"].steps.length; index++) {
    const step = LAB_FLOWS["L1-1"].steps[index];
    assert.equal(await frame().getByLabel("当前对照", { exact: true }).inputValue(), String(index));
    assert.equal(await frame().locator('[data-action="trial"]').count(), 0, "Recording is unavailable before the estimate");
    if (step.controls?.length) for (const key of step.controls) assert.equal(await frame().locator(`#param-${key}`).count(), 0, "L1-1 adjustment controls wait until the estimate is revealed");
    if (index === 0) {
      assert.equal(await frame().locator('[data-reading-prediction]').count(), 1);
      assert.equal(await frame().locator('svg[data-chart="main"]').count(), 0, "The result plot waits for an estimate");
    }
    assert.equal(await frame().locator('[data-python-task]').count(), 0, "Python is available separately in Learning Tools");
    if (index === 1) {
      await saved();
      await page.reload();
      assert.equal(await frame().locator("#param-a").count(), 0, "Reload keeps adjustment hidden during prediction");
      assert.equal(await frame().getByLabel("当前对照", { exact: true }).inputValue(), "1", "Reload resumes a manual step before the target has been reached");
      await frame().locator("#reading-estimate").fill("3");
      await frame().locator('[data-action="reading-estimate"]').click();
      await frame().locator("#param-a").waitFor();
      assert.equal(await frame().locator("#param-a").inputValue(), "1", "The scale is not done for the student");
      await frame().locator("#observation").fill("3");
      await frame().locator('[data-action="trial"]').click();
      await frame().getByRole("alert").filter({ hasText: "先调节上方参数" }).waitFor();
    }
    if (step.controls?.length && index !== 1) await fillObservation("L1-1", step, { ...engine.defaults("L1-1"), ...step.params });
    if (step.controls?.length) for (const key of step.controls) assert.equal(await frame().locator(`#param-${key}`).count(), 1, "Revealing the estimate exposes adjustment controls");
    for (const key of step.controls ?? []) await frame().locator(`#param-${key}`).fill(String(step.params[key]));
    if (index === 1) {
      assert.equal(await frame().locator('svg[data-chart="main"]').count(), 1, "Changing parameters keeps the waveform visible");
      assert.equal(await frame().locator("[data-reading-prediction]").count(), 0, "Exploration does not require another estimate");
      assert.equal(await frame().locator("[data-reading-comparison]").count(), 1, "The forecast remains available after adjustment");
      assert.equal(await frame().locator("#observation").inputValue(), "", "Changing parameters clears the old reading");
      await frame().locator("#observation").fill("99");
      await frame().locator('[data-action="trial"]').click();
      await frame().getByRole("alert").filter({ hasText: "读数与当前图形不符" }).waitFor();
      await saved();
      await page.reload();
      await frame().locator("#reading-estimate").fill("1.5");
      await frame().locator('[data-action="reading-estimate"]').click();
    }
    await fillObservation("L1-1", step, { ...engine.defaults("L1-1"), ...step.params }, index === 0 ? "0" : undefined);
    if (step.predictedReadingKey) {
      assert.equal(await frame().locator('[data-reading-prediction]').count(), 0);
      assert.equal(await frame().locator('svg[data-chart="main"]').count(), 1);
      for (const label of step.hiddenMetrics ?? []) assert.equal(await frame().locator("dl dt").filter({ hasText: label }).count(), 0);
    }
    await frame().locator('[data-action="trial"]').click();
  }
  await frame().locator("#analysis").fill("组合变换改变了峰值位置和高度；窄脉冲面积保持为 1。");
  await frame().locator('[data-action="complete"]').click();
  await saved();
  await frame().locator("[data-lab-prediction-summary]").waitFor();
  assert.equal(await frame().locator("[data-lab-prediction-summary] tbody tr").count(), 4, "Conclusion compares every saved estimate with its reading");
  assert.match(await frame().locator("[data-lab-prediction-summary]").innerText(), /预测值[\s\S]*实测值[\s\S]*1\.5/);
  await frame().getByRole("status").filter({ hasText: "20%" }).waitFor();
  let document = JSON.parse(records.get(101).document);
  assert.equal(document.student.number, "student101");
  assert.equal(document.tasks["L1-1"].trials.length, 4);
  assert.equal(document.tasks["L1-1"].trials[1].params.a, 2);
  assert.equal(document.tasks["L1-1"].trials[1].measurements.supportEnd, 1.5);
  assert.equal(document.tasks["L1-1"].trials[1].measurements.observation.value, 1.5);
  assert.equal(document.tasks["L1-1"].trials[1].measurements.observation.predictedValue, 1.5);
  assert.equal(document.tasks["L1-1"].completion.confirmed, true);
  assert.equal(await page.locator("iframe").count(), 0, "workspace must be native React");
  assert.equal(await page.evaluate(() => Object.hasOwn(window, "SignalLab")), false);
  await page.reload();
  await frame().locator("#analysis").waitFor();
  assert.equal(await frame().locator("#analysis").inputValue(), document.tasks["L1-1"].analysis);
  await frame().locator('[data-phase="observe"]').click();
  await frame().getByLabel("当前对照", { exact: true }).selectOption("1");
  await frame().locator("#param-a").fill("2");
  assert.equal(await frame().locator("[data-reading-prediction]").count(), 0, "Restoring a saved comparison retains its estimate");
  await frame().locator('[data-lab-tools] > summary').click();
  const pngEvent = page.waitForEvent("download");
  await frame().locator('[data-action="png"]').click();
  const png = await pngEvent;
  assert.equal((await readFile(await png.path())).subarray(1, 4).toString(), "PNG");
  await frame().locator('[data-lab-tools] > summary').click();
  await frame().locator('[data-phase="conclude"]').click();
  assert.equal(await frame().locator("[data-python-task], [data-python-editor], iframe").count(), 0, "Experiments do not embed a Python runtime");
  // Screenshots check each phase, including a clean initial view, in both themes.
  for (const width of [1440, 390]) for (const theme of ["light", "dark"]) {
    await page.setViewportSize({ width, height: 950 });
    await page.evaluate((value) => {
      document.documentElement.classList.toggle("dark", value === "dark");
      document.documentElement.classList.toggle("light", value === "light");
    }, theme);
    for (const phase of ["predict", "observe", "conclude"]) {
      await frame().locator(`[data-phase="${phase}"]`).click();
      await frame().evaluate((element) => { element.scrollTop = 0; });
      await page.screenshot({ path: join(artifacts, `guided-${phase}-${width}-${theme}.png`), animations: "disabled" });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      assert.ok(await frame().locator('[data-native-task]').evaluate((element) => element.scrollWidth <= element.clientWidth + 1));
      if (phase === "observe") {
        await frame().locator("#observation").scrollIntoViewIfNeeded();
        await page.screenshot({ path: join(artifacts, `guided-reading-${width}-${theme}.png`), animations: "disabled" });
      }
      if (phase === "conclude") {
        const summary = frame().locator("[data-lab-prediction-summary]");
        await summary.scrollIntoViewIfNeeded();
        await page.screenshot({ path: join(artifacts, `guided-summary-${width}-${theme}.png`), animations: "disabled" });
        assert.ok(await summary.evaluate((element) => element.scrollWidth <= element.clientWidth + 1), "The comparison table scrolls inside the section");
        if (width === 390) {
          const scroller = summary.getByRole("region");
          await scroller.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
          assert.ok(await scroller.evaluate((element) => element.scrollLeft > 0), "Mobile readers can scroll to both value columns");
          await page.screenshot({ path: join(artifacts, `guided-summary-values-${width}-${theme}.png`), animations: "disabled" });
          await scroller.evaluate((element) => { element.scrollLeft = 0; });
        }
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.evaluate(() => { document.documentElement.classList.remove("dark"); document.documentElement.classList.add("light"); });
  // Walk every comparison, including templates and independently adjustable steps.
  for (const [id, flow] of Object.entries(LAB_FLOWS)) {
    await page.goto(`${base}/learn/experiments/workspace#task/${id}`);
    await frame().locator(`[data-native-task="${id}"]`).waitFor();
    if (id === "L1-1") continue;
    if (id === "L1-2") {
      const lab = frame().locator("[data-black-box-lab]");
      assert.equal(await lab.locator('#prediction, #analysis, [data-answer], svg[data-chart="difference"]').count(), 0, "The replacement has no prediction form, manual parameter record or difference graph");
      assert.equal(await lab.locator('[data-action="complete"]').count(), 0);
      for (const box of smokeBoxes) {
        const height = box.kind === "square" ? 4 : 2, shift = box.kind === "timescale" ? 0.5 : 1;
        await lab.locator(`[data-black-box-station="${box.id}"]`).waitFor();
        assert.equal(await lab.locator('[data-model]').count(), 0, "Test all three probes before identifying a model");
        assert.equal(await lab.locator('[data-probe="double"]').isDisabled(), box.id !== "C");
        assert.equal(await lab.locator('[data-probe="shift"]').isDisabled(), box.id !== "C");
        await lab.locator('[data-probe="baseline"]').click();
        const baseline = await lab.locator('[data-series="输出 y(t) · 实线"] polyline').getAttribute("points");
        await lab.locator('[data-probe="double"]').click();
        assert.notEqual(await lab.locator('[data-series="输出 y(t) · 实线"] polyline').getAttribute("points"), baseline, "Doubling the amplitude visibly changes the plotted output");
        const heights = await lab.locator('[data-black-box-readout] dd').allTextContents();
        assert.equal(Number(heights[0]), 2);
        assert.equal(Number(heights[1]), height);
        if (box.id === "A") {
          await saved();
          await page.reload();
          await lab.locator('[data-black-box-readout]').waitFor();
          assert.equal(Number((await lab.locator('[data-black-box-readout] dd').allTextContents())[1]), height, "Reload restores the last probe and its output");
        }
        if (box.id === "A") await captureBlackBox("amplitude");
        await lab.locator('[data-probe="shift"]').click();
        const choiceIDs = () => lab.locator('[data-model]').evaluateAll((elements) => elements.map((element) => element.getAttribute("data-model")));
        assert.deepEqual(await choiceIDs(), blackBoxChoices(box), "The question shows its saved candidates in their saved order");
        assert.equal(await lab.locator('[data-black-box-evidence] tbody tr').count(), 3);
        assert.equal(await lab.locator('[data-black-box-evidence] tbody').innerText().then((text) => text.includes("—")), false, "Every probe has an automatic record");
        const shiftReadout = await lab.locator('[data-black-box-readout] dd').allTextContents();
        assert.equal(Number(shiftReadout[2]), box.kind === "square" ? 2 : box.kind === "delay" ? 3 : 1);
        assert.equal(Number(shiftReadout[3]), box.kind === "timescale" ? 0.5 : 1);
        if (box.id === "C") await captureBlackBox("timing");
        if (box.id === "A") {
          await lab.locator(`[data-model="${box.kind}"]`).check();
          assert.equal(await lab.locator('[data-action="identify"]').isDisabled(), true, "A model guess alone cannot pass");
          await lab.locator('[data-black-box-height]').selectOption(String(height === 4 ? 2 : 4));
          await lab.locator('[data-black-box-shift]').selectOption(String(shift));
          await lab.locator('[data-action="identify"]').click();
          await lab.getByRole("alert").filter({ hasText: "高度判断" }).waitFor();
          assert.equal(await lab.locator('[data-black-box-identified]').count(), 0, "The correct model with incorrect evidence cannot pass");
          await lab.locator('[data-black-box-height]').selectOption(String(height));
          const wrong = blackBoxChoices(box).find((kind) => !["square", "delay", "timescale"].includes(kind));
          await lab.locator(`[data-model="${wrong}"]`).check();
          await lab.locator('[data-action="identify"]').click();
          await lab.getByRole("alert").filter({ hasText: "这个候选" }).waitFor();
          await lab.locator('[data-action="identify"]').click();
          assert.match(await lab.getByRole("alert").innerText(), /这个候选/, "A distractor returns feedback about its own predicted behavior");
          assert.equal(await lab.locator('[data-black-box-identified]').count(), 0);
          await saved();
          await page.reload();
          await lab.locator(`[data-model="${wrong}"]`).waitFor();
          assert.equal(await lab.locator(`[data-model="${wrong}"]`).isChecked(), true, "The wrong guess is retained after refresh");
          assert.deepEqual(await choiceIDs(), blackBoxChoices(box), "Refresh does not change the candidates or their positions");
        }
        await lab.locator('[data-black-box-height]').selectOption(String(height));
        await lab.locator('[data-black-box-shift]').selectOption(String(shift));
        if (box.id === "C") {
          assert.equal(await lab.locator('[data-model]').count(), 3);
          assert.equal(await lab.locator('[data-model="square"]').isEnabled(), true, "A model chosen for A remains available for C");
          const wrong = blackBoxChoices(box).find((kind) => kind !== box.kind);
          await lab.locator(`[data-model="${wrong}"]`).check();
          await lab.locator('[data-action="identify"]').click();
          await lab.getByRole("alert").waitFor();
          assert.equal(await lab.locator('[data-black-box-identified]').count(), 0, "A distractor does not pass the third box");
        }
        await lab.locator(`[data-model="${box.kind}"]`).check();
        await lab.locator('[data-action="identify"]').click();
        await lab.locator('[data-black-box-identified] .katex').waitFor();
        assert.equal(await lab.locator(`[data-box="${box.id}"] svg`).count(), 1);
        if (box.id !== "C") await lab.locator('[data-action="next-box"]').click();
      }
      await lab.locator('[data-black-box-summary]').waitFor();
      await lab.locator('[data-action="complete"]').click();
      await saved();
      const completed = JSON.parse(records.get(101).document).tasks[id];
      assert.equal(completed.completion.confirmed, true);
      assert.equal(blackBoxComplete(completed), true);
      assert.ok(completed.analysis.startsWith("原系统性质实验的分析记录"), "The automatic conclusion preserves earlier analysis");
      for (const box of smokeBoxes) for (const probe of BLACK_BOX_PROBES) assert.ok(completed.trials.some((trial) => trial.measurements.blackBox?.box === box.id && trial.measurements.blackBox.probe === probe));
      assert.deepEqual(createBlackBoxes(completed).map((box) => box.kind), ["timescale", "delay", "square"], "Distinct assignments survive account saves");
      assert.deepEqual(createBlackBoxes(completed).map(blackBoxChoices), smokeBoxes.map(blackBoxChoices), "All candidates survive account saves");
      await page.reload();
      await lab.locator('[data-black-box-summary]').waitFor();
      assert.equal(await lab.locator('[data-action="complete"]').count(), 0, "Completion survives refresh");
      await assertEventually(async () => assert.equal(await lab.locator(`[data-model="${smokeBoxes[0].kind}"]`).isChecked(), true, "The selected box retains its assigned model after refresh"));
      continue;

      async function captureBlackBox(name) {
        for (const width of [1440, 390]) for (const theme of ["light", "dark"]) {
          await page.setViewportSize({ width, height: 950 });
          await page.evaluate((value) => {
            document.documentElement.classList.toggle("dark", value === "dark");
            document.documentElement.classList.toggle("light", value === "light");
          }, theme);
          await lab.locator('[data-black-box-results]').screenshot({ path: join(artifacts, `black-box-${name}-${width}-${theme}.png`), animations: "disabled" });
          if (await lab.locator('[data-black-box-reasoning]').count()) await lab.locator('[data-black-box-reasoning]').screenshot({ path: join(artifacts, `black-box-evidence-${width}-${theme}.png`), animations: "disabled" });
          if (await lab.locator('[data-black-box-choices]').count()) await lab.locator('[data-black-box-choices]').screenshot({ path: join(artifacts, `black-box-choices-${width}-${theme}.png`), animations: "disabled" });
          assert.ok(await lab.evaluate((element) => element.scrollWidth <= element.clientWidth + 1), "The black-box station fits the viewport");
          if (width === 390) {
            const table = lab.getByRole("region", { name: "本台设备的测试记录", exact: true });
            await table.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
            assert.ok(await table.evaluate((element) => element.scrollLeft > 0), "All evidence columns are reachable on mobile");
            await table.evaluate((element) => { element.scrollLeft = 0; });
          }
        }
        await page.setViewportSize({ width: 1440, height: 950 });
        await page.evaluate(() => { document.documentElement.classList.remove("dark"); document.documentElement.classList.add("light"); });
      }
    }
    if (id === "L1-3") {
      const lab = frame().locator("[data-response-diagnosis]");
      assert.equal(await lab.locator('#prediction, #analysis, [data-response-controls], [data-action="complete"]').count(), 0, "Only curve diagnosis remains");
      await lab.locator('[data-action="retry-diagnosis"]').click();
      assert.equal(await lab.locator('[data-response-plot="inputOff"], [data-response-plot="resetInitial"]').count(), 0, "No verification curve before a prediction");
      assert.equal(await lab.locator('[data-action="diagnose"]').isDisabled(), true);
      for (const width of [1440, 390]) for (const theme of ["light", "dark"]) {
        await page.setViewportSize({ width, height: 950 });
        await page.evaluate((theme) => { document.documentElement.classList.toggle("dark", theme === "dark"); document.documentElement.classList.toggle("light", theme === "light"); }, theme);
        await lab.screenshot({ path: join(artifacts, `response-diagnosis-${width}-${theme}.png`), animations: "disabled" });
        assert.ok(await lab.evaluate((element) => element.scrollWidth <= element.clientWidth + 1));
      }
      await page.setViewportSize({ width: 1440, height: 950 });
      await page.evaluate(() => { document.documentElement.classList.remove("dark"); document.documentElement.classList.add("light"); });
      for (let index = 0; index < diagnosisCases.length; index++) {
        await lab.locator(`[data-diagnosis-case="${index}"]`).click();
        const expected = expectedDiagnosis(diagnosisCases[index]);
        const answer = async (values) => { for (const [key, value] of Object.entries(values)) await lab.locator(`input[name="${key}"][value="${value}"]`).check(); };
        if (index === 0) {
          await answer({ ...expected, prediction: "overlap" });
          await lab.locator('[data-action="diagnose"]').click();
          await lab.locator('[data-diagnosis-result]').waitFor();
          assert.match(await lab.locator('[data-diagnosis-result]').innerText(), /结果预测：需要修正/);
          assert.equal(await lab.locator('[data-action="complete"]').count(), 0, "Correct source and operation with a wrong prediction cannot finish");
          await lab.locator('[data-action="retry-diagnosis"]').click();
        }
        assert.equal(await lab.locator('[data-diagnosis-result]').count(), 0);
        await answer(expected);
        const before = await lab.locator('[data-response-plot="comparison"] polyline').first().getAttribute("points");
        await lab.locator('[data-action="diagnose"]').click();
        await lab.locator(`[data-response-plot="${expected.test}"]`).waitFor();
        assert.notEqual(await lab.locator(`[data-response-plot="${expected.test}"] polyline`).first().getAttribute("points"), before, "Isolation visibly changes the output");
        await saved();
        if (index === 0) {
          await page.reload();
          await lab.locator('[data-diagnosis-case="1"][aria-current="step"]').waitFor();
          assert.equal(await lab.locator('[data-action="complete"]').count(), 0, "Unvisited cases still need answers after refresh");
        }
      }
      await lab.locator('[data-action="complete"]').click(); await saved();
      assert.equal(diagnosisComplete(JSON.parse(records.get(101).document).tasks[id]), true);
      await page.reload();
      await lab.getByText("已通过 3/3 组判断", { exact: true }).waitFor();
      assert.equal(await lab.locator('[data-action="complete"]').count(), 0);
      continue;
    }
    if (id === "L1-4") {
      const lab = frame().locator("[data-ecg-experiment]");
      assert.equal(await lab.locator("#prediction, #analysis, [data-reading-prediction]").count(), 0);
      for (const station of ECG_STATIONS) {
        await lab.locator(`[data-ecg-station="${station}"]`).click();
        assert.equal(await lab.locator('[data-action="check-ecg"]').isDisabled(), true);
        const before = await lab.locator('[data-ecg-chart="ecg-output"] [data-ecg-line="signal"]').getAttribute("points");
        await lab.locator(`[data-ecg-width="${ECG_EXERCISES[station].widths[1]}"]`).click();
        assert.notEqual(await lab.locator('[data-ecg-chart="ecg-output"] [data-ecg-line="signal"]').getAttribute("points"), before);
        if (station === "timing") {
          await lab.locator("[data-ecg-time]").fill("450");
          assert.match(await lab.locator("[data-ecg-timeline]").innerText(), /410 ms/);
        }
        if (station === "noise") {
          await lab.locator('input[value="stronger"]').check();
          await lab.locator('[data-action="check-ecg"]').click();
          await lab.locator('[data-action="retry-ecg"]').click();
          assert.equal(await lab.locator('[data-action="complete"]').count(), 0);
        }
        await lab.locator(`input[value="${ECG_EXERCISES[station].answer}"]`).check();
        await lab.locator('[data-action="check-ecg"]').click();
        await lab.locator("[data-ecg-result]").waitFor();
        await saved();
      }
      await lab.locator('[data-action="complete"]').click(); await saved();
      const record = JSON.parse(records.get(101).document).tasks[id];
      assert.equal(ecgComplete(record), true);
      assert.equal(record.prediction, "");
      await page.reload();
      await lab.getByText("已通过 3/3 项观察", { exact: true }).waitFor();
      assert.equal(await lab.locator('[data-action="complete"]').count(), 0);
      continue;
    }
    await frame().locator('[data-lab-givens]').waitFor();
    assert.ok(await frame().locator('[data-given-formula] .katex').count(), `${id}: known conditions`);
    await frame().locator("#prediction").fill("先判断参数变化，再用数据核验。");
    await frame().locator('[data-action="prediction"]').click();
    for (let index = 0; index < flow.steps.length; index++) {
      assert.equal(await frame().getByLabel("当前对照", { exact: true }).inputValue(), String(index), `${id}/${index}`);
      const step = flow.steps[index], params = { ...engine.defaults(id), ...step.params };
      if (step.key === "candidate") params.candidate = 5;
      if (step.key === "ninety") params.measureTime = 2.3;
      if (step.key === "refine") params.T = 1.61;
      if (id === "L2-3" && step.key === "design") Object.assign(params, {filterType:"notch",center:50,alpha:12});
      if (id === "L3-3" && ["design","frequency"].includes(step.key)) Object.assign(params, {center:50,alpha:10});
      if (id === "L3-3" && step.key === "design") {
        assert.equal(await frame().locator('#param-alpha').inputValue(), "12", "Use the saved Lab 2 design, not the later wide-notch comparison");
        assert.equal(await frame().locator('#param-center').inputValue(), "50");
      }
      for (const key of id === "L1-3" ? [] : step.controls ?? []) {
        const control = frame().locator(`#param-${key}`);
        if (await control.evaluate(element=>element.tagName==='SELECT')) await control.selectOption(String(params[key]));
        else await control.fill(String(params[key]));
      }
      if (step.predictedReadingKey) {
        assert.equal(await frame().locator('[data-reading-prediction]').count(), 1, `${id}/${step.key}: estimate first`);
        assert.equal(await frame().locator('svg[data-chart="main"]').count(), 0, `${id}/${step.key}: hide the result before an estimate`);
        for (const label of step.hiddenMetrics ?? []) assert.equal(await frame().locator("dl dt").filter({ hasText: label }).count(), 0, `${id}/${step.key}: hide ${label}`);
      }
      await fillObservation(id, step, params, id === "L2-3" && index === 0 ? "1" : undefined);
      if (id === "L1-3") {
        const controls = frame().locator('[data-response-controls]');
        await controls.waitFor();
        assert.equal(await frame().locator('#observation, #reading-estimate, [data-lab-objective]').count(), 0, "Only the operation and its results remain in the response workflow");
        assert.equal(await frame().locator('[data-action="trial"]').isDisabled(), true, "The target setup must be reached by operating controls");
        assert.equal(await controls.locator('#param-A').inputValue(), String(step.initial.A));
        assert.equal(await controls.locator('#param-initial').inputValue(), String(step.initial.initial));
        assert.equal(await controls.locator(`[data-response-input="${step.initial.enabled}"]`).getAttribute('aria-pressed'), "true");
        const plot = frame().locator('svg[data-chart="main"]');
        const before = await plot.locator('polyline').evaluateAll((lines) => lines.map((line) => line.getAttribute('points')));
        const inputBefore = await controls.locator('[data-response-input-plot] polyline').getAttribute('points');
        if (step.key === "zeroInput") await controls.locator('[data-response-input="off"]').click();
        if (step.key === "zeroState") {
          await controls.locator('#param-initial').fill('0');
          await controls.locator('[data-response-input="on"]').click();
        }
        if (step.key === "total") {
          const slider = controls.getByRole('slider', { name: '初值 y₀滑块', exact: true });
          await slider.focus();
          for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowRight');
        }
        if (step.key === "lower") await controls.locator('#param-initial').fill('0.5');
        if (step.key === "amplitude") await controls.locator('#param-A').fill('2');
        assert.notDeepEqual(await plot.locator('polyline').evaluateAll((lines) => lines.map((line) => line.getAttribute('points'))), before, "Operating the switch or parameter changes the response");
        assert.equal(await frame().locator('[data-action="trial"]').isDisabled(), false);
        assert.equal(await controls.locator('[data-response-input-value]').innerText(), `x(t) = ${params.enabled === "off" ? "0" : `${params.A}u(t)`}`);
        if (["zeroInput", "zeroState", "amplitude"].includes(step.key)) assert.notEqual(await controls.locator('[data-response-input-plot] polyline').getAttribute('points'), inputBefore, "The input plot shows switching and amplitude changes");
        if (step.key === "lower") {
          await saved();
          await page.reload();
          await controls.locator('#param-initial').waitFor();
          assert.equal(await frame().getByLabel('当前对照', { exact: true }).inputValue(), String(index));
          assert.equal(await controls.locator('#param-initial').inputValue(), '0.5', "Refresh retains the operated state");
          assert.equal(await frame().locator('[data-action="trial"]').isDisabled(), false);
        }
        assert.equal(await frame().locator('[data-reading-prediction]').count(), 0, "Response comparisons show the plot without an exact numerical guess");
        assert.ok(await frame().locator('[data-response-instructions]').isVisible());
        assert.equal(await plot.locator('[data-series]').count(), index < 2 ? 1 : 3, "Isolated sources have a single unambiguous curve");
        assert.match(await frame().locator('[data-lab-cursor-readout]').innerText(), /1\.0 s/);
        const decomposition = frame().locator('[data-response-decomposition]');
        assert.equal(await decomposition.count(), index < 2 ? 0 : 1);
        if (index >= 2) {
          const rows = decomposition.locator('tbody tr');
          assert.equal(await rows.count(), 4);
          const values = (await rows.nth(1).locator('td').allTextContents()).map(Number);
          const readings = engine.scene(id, params, {}).readings.atTimes[1];
          assert.ok(Math.abs(values[0] - readings.zeroInput) <= 0.0001);
          assert.ok(Math.abs(values[1] - readings.zeroState) <= 0.0001);
          assert.ok(Math.abs(values[2] - values[3]) <= 0.0001, "The sum matches an independently integrated output");
        }
        for (const width of [1440, 390]) for (const theme of ["light", "dark"]) {
          await page.setViewportSize({ width, height: 950 });
          await page.evaluate((theme) => document.documentElement.classList.toggle("dark", theme === "dark"), theme);
          await frame().locator('[data-lab-phase="observe"]').screenshot({ path: join(artifacts, `response-${step.key}-${width}-${theme}.png`), animations: "disabled" });
          assert.ok(await frame().locator('[data-native-task]').evaluate((element) => element.scrollWidth <= element.clientWidth + 1), "Response comparisons fit the viewport");
          if (index >= 2 && width === 390) {
            const scroller = decomposition.getByRole("region");
            await scroller.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
            assert.ok(await scroller.evaluate((element) => element.scrollLeft > 0), "All response columns are reachable on mobile");
            await scroller.evaluate((element) => { element.scrollLeft = 0; });
          }
        }
        await page.setViewportSize({ width: 1440, height: 950 });
        await page.evaluate(() => document.documentElement.classList.remove("dark"));
      }
      const inputs = frame().locator("[data-answer]"), answers = labAnswers(id, params);
      if (await inputs.count()) assert.ok(await frame().locator('[data-answer-formula] .katex').count());
      for (let j=0; j<await inputs.count(); j++) await inputs.nth(j).fill(answers[await inputs.nth(j).getAttribute("data-answer")]);
      if (id === "L3-3") {
        const polePlot = frame().locator('[data-lab-poles] svg');
        assert.equal(await polePlot.count(),1);
        if (step.key === "design") {
          const box = await polePlot.boundingBox();
          // Drag across the plane, then restore the target through keyboard controls.
          await page.mouse.move(box.x+box.width*0.6,box.y+box.height*0.3);
          await page.mouse.down(); await page.mouse.move(box.x+box.width*0.65,box.y+box.height*0.4,{steps:3}); await page.mouse.up();
          assert.notEqual(await frame().locator('#param-alpha').inputValue(),"10");
          await frame().locator('#param-alpha').fill('80'); await frame().locator('#param-center').fill('60');
          assert.ok(await frame().locator('[data-native-task]').evaluate(element=>element.scrollWidth<=element.clientWidth+1),"Extreme real poles stay in the plot");
          await frame().locator('#param-alpha').fill('10'); await frame().locator('#param-center').fill('50');
        }
      }
      if (id === "L2-4" && params.mode === "audio") {
        const audio=frame().locator('[data-lab-audio]'); assert.equal(await audio.count(),1);
        await audio.getByRole('button').nth(1).click(); await audio.getByRole('button').nth(2).click();
        assert.equal(await audio.getByRole('alert').count(),0);
      }
      if (id === "L1-4" && flow.steps[index].key.startsWith("response")) assert.equal(await frame().locator('svg[data-chart="output"]').first().isVisible(), true);
      if (id === "L2-4" && flow.steps[index].key !== "candidate") assert.equal(await frame().locator('[data-series^="候选"]').count(), 0);
      if ((id === "L1-4" && step.key === "response1") || (id === "L2-3" && step.key === "design") || (id === "L2-4" && step.key === "filtered") || (id === "L3-2" && step.key === "initial2") || (id === "L3-3" && step.key === "design")) {
        for (const width of [1440,390]) for (const theme of ["light","dark"]) {
          await page.setViewportSize({width,height:950});
          await page.evaluate(theme=>document.documentElement.classList.toggle('dark',theme==='dark'),theme);
          await frame().evaluate(element=>{element.scrollTop=0;});
          await page.screenshot({path:join(artifacts,`conditions-${id}-${width}-${theme}.png`),animations:"disabled"});
          assert.ok(await frame().locator('[data-native-task]').evaluate(element=>element.scrollWidth<=element.clientWidth+1),`${id}: no page overflow`);
          if (id === "L3-3") await frame().locator('[data-lab-poles]').screenshot({path:join(artifacts,`poles-${width}-${theme}.png`)});
          if (id === "L2-4") await frame().locator('svg[data-chart="main"]').screenshot({path:join(artifacts,`audio-alias-${width}-${theme}.png`)});
        }
        await page.setViewportSize({width:1440,height:950}); await page.evaluate(()=>document.documentElement.classList.remove('dark'));
      }
      await frame().locator('[data-action="trial"]').click();
    }
    assert.equal(await frame().locator("[data-lab-prediction-summary] tbody tr").count(), flow.steps.filter((step) => step.predictedReadingKey).length, `${id}: all saved estimates appear in the conclusion`);
    if (id === "L1-3") assert.equal(await frame().locator('[data-lab-comparison] tbody tr').count(), 5, "The compact comparison includes the input-amplitude experiment");
    if (id === "L2-3") await frame().getByRole("status").filter({ hasText: "你的判断与读数不一致" }).waitFor();
    await frame().locator("#analysis").fill("已记录各组参数与读数，并比较变化。");
    if (flow.derivation) {
      assert.equal(await frame().locator('[data-action="complete"]').isDisabled(), true);
      await frame().locator("#derivation").fill("推导过程与数值核验记录。");
    }
    await frame().locator('[data-action="complete"]').click();
    assert.equal(await frame().locator("[data-python-task], [data-python-editor]").count(), 0);
    await saved();
    assert.equal(JSON.parse(records.get(101).document).tasks[id].completion.confirmed, true);
  }
  await page.goto(`${base}/learn/experiments/workspace#task/L1-1`);
  await frame().locator("#analysis").waitFor();
  failSave = true;
  await frame().locator("#analysis").fill("断网时保留的草稿");
  await page.getByText("同步失败，请重试或下载备份", { exact: true }).waitFor();
  const failedRequest = writes.at(-1);
  await page.getByRole("button", { name: "重试", exact: true }).click();
  await saved();
  assert.equal(writes.at(-1).revision, failedRequest.revision);
  assert.equal(JSON.parse(records.get(101).document).tasks["L1-1"].analysis, "断网时保留的草稿");
  // Stale revisions must pause and preserve the current draft for download.
  const previous = records.get(101);
  const remote = JSON.parse(previous.document); remote.tasks["L1-1"].analysis = "另一窗口的记录";
  records.set(101, { ...previous, revision: previous.revision + 1, document: JSON.stringify(remote) });
  await frame().locator("#analysis").fill("本窗口冲突草稿");
  await page.getByText("记录冲突，上传已暂停", { exact: true }).waitFor();
  const count = writes.length;
  await frame().locator("#analysis").fill("冲突后继续保留的草稿");
  await assertEventually(async () => assert.equal(writes.length, count));
  const backup = page.waitForEvent("download");
  await page.locator("[data-record-tools] > summary").click();
  await page.getByRole("button", { name: "下载当前记录 JSON", exact: true }).click();
  await page.locator("[data-record-tools] > summary").click();
  const downloaded = await backup;
  document = JSON.parse(await readFile(await downloaded.path(), "utf8"));
  assert.equal(document.tasks["L1-1"].analysis, "冲突后继续保留的草稿");
  await page.getByRole("button", { name: "载入服务器记录（放弃当前草稿）", exact: true }).click();
  await assertEventually(async () => assert.equal(await frame().locator("#analysis").inputValue(), "另一窗口的记录"));
  // Native JSON download retains the schema and current account identity.
  await page.evaluate(() => { window.location.hash = "records/L1"; });
  await frame().locator("#student-number").waitFor();
  assert.equal(await frame().locator("#student-number").inputValue(), "student101");
  assert.ok(await frame().locator("#student-number").getAttribute("readonly") !== null);
  // Restoring from the records page must apply the selected trial, not merely
  // navigate to the task. Importing also retains the current account identity.
  await frame().getByRole("button", { name: "恢复参数", exact: true }).first().click();
  await frame().locator('[data-phase="observe"]').click();
  await frame().locator('[data-lab-tools] > summary').click();
  assert.equal(await frame().locator("#param-shift").inputValue(), "0");
  document = JSON.parse(records.get(101).document);
  document.student.name = "Other account"; document.student.number = "other-student";
  document.tasks["L1-1"].analysis = "导入的备份记录";
  await page.locator("#import-file").setInputFiles({ name: "record.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(document)) });
  await page.getByRole("alertdialog").getByRole("button", { name: "确认", exact: true }).click();
  await saved();
  await assertEventually(async () => assert.equal(JSON.parse(records.get(101).document).tasks["L1-1"].analysis, "导入的备份记录"));
  assert.equal(JSON.parse(records.get(101).document).student.number, "student101");
  assert.equal(JSON.parse(records.get(101).document).student.name, "实验测试101");
  assert.equal(blackBoxComplete(JSON.parse(records.get(101).document).tasks["L1-2"]), true, "Import preserves all black-box identifications");
  await page.evaluate(() => { window.location.hash = "records/L1"; });
  await frame().locator("#student-number").waitFor();
  const exportEvent = page.waitForEvent("download");
  await frame().locator('[data-action="export"]').click();
  const exportFile = await exportEvent;
  assert.equal(Object.keys(JSON.parse(await readFile(await exportFile.path(), "utf8")).tasks).length, 12);
  await saved();
  await page.evaluate(() => { window.print = () => {}; });
  await frame().locator('[data-action="print"]').click();
  await page.locator("#print-report").waitFor({ state: "attached" });
  const report = await page.locator("#print-report").textContent();
  for (const id of ["L1-1", "L1-2", "L1-3", "L1-4"]) assert.ok(report.includes(id));
  assert.match(report, /黑箱 A[\s\S]*幅度加倍[\s\S]*黑箱 C/);
  assert.ok(await page.locator('#print-report svg[data-chart="black-box-input"]').count());
  assert.ok(await page.locator('#print-report svg[data-chart="black-box-output"]').count());
  assert.ok(await page.locator('#print-report svg[data-chart="response-comparison"]').count());
  assert.ok(await page.locator('#print-report svg[data-chart="response-verification"]').count());
  assert.equal(await page.locator('#print-report svg[data-chart="difference"]').count(), 0, "New black-box reports use pulse plots");
  assert.equal(await page.locator("[data-python-report]").count(), 0, "Lab reports omit the retired Python section");
  await page.emulateMedia({ media: "print" });
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor), "rgb(255, 255, 255)", "Reports must print on white paper in either theme");
  await page.pdf({ path: join(artifacts, "account-report.pdf"), format: "A4", printBackground: true, preferCSSPageSize: true });
  await page.emulateMedia({ media: "screen" });
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: join(artifacts, "workspace-mobile.png") });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  // Initial GET failure must not create an empty overwrite.
  failLoad = true;
  await page.goto(`${base}/learn/experiments/workspace`);
  await page.getByText("记录加载失败。请重试，成功加载后才可开始实验。", { exact: true }).waitFor();
  assert.equal(await page.locator("iframe").count(), 0);
  failLoad = false;
  await page.getByRole("button", { name: "重试", exact: true }).click();
  await frame().getByRole("heading", { name: "信号与系统 · 三次完整实验", exact: true }).waitFor();
  // Pending drafts are isolated by account, including a switch in the same tab.
  failSave = true;
  await page.evaluate(() => { window.location.hash = "task/L1-1"; });
  await frame().locator("#analysis").fill("账号101的待上传草稿");
  await page.getByText("同步失败，请重试或下载备份", { exact: true }).waitFor();
  actor = 102;
  await page.reload();
  await frame().locator("#prediction").fill("账号102的独立判断");
  await frame().locator('[data-action="prediction"]').click();
  await frame().locator('[data-phase="conclude"]').click();
  await frame().locator("#analysis").waitFor();
  assert.equal(await frame().locator("#analysis").inputValue(), "");
  await frame().locator("#analysis").fill("账号102独立内容");
  await saved();
  assert.equal(JSON.parse(records.get(102).document).student.number, "student102");
  assert.deepEqual(JSON.parse(records.get(102).document).tasks["L1-1"].python, { code: "", result: null }, "Python evidence must be account scoped");
  actor = 101;
  await page.reload();
  await assertEventually(async () => assert.equal(await frame().locator("#analysis").inputValue(), "账号101的待上传草稿"));
  await saved();
  for (const [legacy, route] of [["signal-basics", "course/L1"], ["time-domain", "task/L1-3"], ["frequency-domain", "course/L2"], ["s-domain", "course/L3"]]) {
    await page.goto(`${base}/learn/experiments/${legacy}`);
    await frame().locator("#main h1").waitFor();
    await assertEventually(async () => assert.equal(await page.locator("#main").getAttribute("data-lab-route"), route));
  }
  const validRecord = records.get(101);
  const legacyRecord = JSON.parse(validRecord.document);
  for (const trial of legacyRecord.tasks["L1-1"].trials) {
    if (trial.measurements.observation) delete trial.measurements.observation.predictedValue;
  }
  records.set(101, { ...validRecord, document: JSON.stringify(legacyRecord) });
  await page.goto(`${base}/learn/experiments/workspace#task/L1-1`);
  await frame().locator("#analysis").waitFor();
  assert.equal(await frame().locator("[data-lab-prediction-summary]").count(), 0, "Legacy records without numeric estimates keep the original result table");
  assert.equal(await frame().locator("[data-lab-comparison] tbody tr").count(), 4);
  assert.match(await frame().locator("[data-lab-comparison]").innerText(), /1\.5/);
  assert.equal(await frame().locator("#analysis").inputValue(), legacyRecord.tasks["L1-1"].analysis);
  // Phase-two evidence has its own model and must remain visible after import.
  const phaseTwo = createPhaseTwoEngine(), phaseTwoTask = phaseTwo.records.data.tasks["L3-3"];
  phaseTwoTask.predictionDraft = "阶段二极点预测"; phaseTwo.records.prediction("L3-3");
  phaseTwoTask.analysis = "阶段二超调分析";
  phaseTwoTask.python.code = "print('phase two')";
  phaseTwo.records.trial("L3-3", phaseTwo.scene("L3-3", phaseTwoTask.params, phaseTwoTask.answers), null);
  await page.locator("#import-file").setInputFiles({name:"v1.1-record.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(phaseTwo.records.data))});
  await page.getByRole("alertdialog").getByRole("button",{name:"确认",exact:true}).click(); await saved();
  assert.equal(JSON.parse(records.get(101).document).phaseTwoArchive.tasks["L3-3"].prediction,"阶段二极点预测");
  await page.evaluate(()=>{window.location.hash="records/L3";});
  await frame().locator('[data-legacy-lab] > summary').first().click();
  await frame().getByText("阶段二极点预测",{exact:true}).waitFor();
  await page.reload(); await frame().locator('[data-legacy-lab] > summary').first().click();
  await frame().getByText("阶段二超调分析",{exact:true}).waitFor();
  const phaseTwoDownloadEvent=page.waitForEvent("download"); await frame().locator('[data-action="export"]').click();
  const phaseTwoDownload=await phaseTwoDownloadEvent;
  assert.equal(JSON.parse(await readFile(await phaseTwoDownload.path(),"utf8")).phaseTwoArchive.tasks["L3-3"].python.code,"print('phase two')");
  const previousEngine = createLegacyEngine(), oldTask = previousEngine.records.data.tasks["L3-3"];
  oldTask.predictionDraft = "旧版初始条件预测"; previousEngine.records.prediction("L3-3");
  oldTask.analysis = "旧版初值分析"; oldTask.python.code = "print('historical')";
  previousEngine.records.trial("L3-3",previousEngine.scene("L3-3",oldTask.params,oldTask.answers),null);
  await page.locator("#import-file").setInputFiles({name:"v1-record.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(previousEngine.records.data))});
  await page.getByRole("alertdialog").getByRole("button",{name:"确认",exact:true}).click(); await saved();
  const upgraded = JSON.parse(records.get(101).document);
  assert.equal(upgraded.appVersion,"1.2.0");
  assert.equal(upgraded.legacyArchive.tasks["L3-3"].prediction,"旧版初始条件预测");
  assert.equal(upgraded.tasks["L3-2"].trials.length,1); assert.equal(upgraded.tasks["L3-3"].trials.length,0);
  await page.evaluate(()=>{window.location.hash="records/L3";});
  await frame().locator('[data-legacy-lab] > summary').first().click();
  await frame().getByText("旧版初始条件预测",{exact:true}).waitFor();
  assert.equal(await frame().locator('[data-legacy-trial]').count(),1);
  await page.reload(); await frame().locator('[data-legacy-lab] > summary').first().click();
  await frame().getByText("旧版初值分析",{exact:true}).waitFor();
  const legacyDownloadEvent=page.waitForEvent("download"); await frame().locator('[data-action="export"]').click();
  const legacyDownload=await legacyDownloadEvent;
  assert.equal(JSON.parse(await readFile(await legacyDownload.path(),"utf8")).legacyArchive.tasks["L3-3"].python.code,"print('historical')");
  await page.evaluate(()=>{window.print=()=>{};}); await frame().locator('[data-action="print"]').click();
  await page.locator('#print-report [data-legacy-lab]').first().waitFor({state:"attached"});
  assert.match(await page.locator('#print-report [data-legacy-lab]').first().textContent(),/旧版初始条件预测/);
  await page.emulateMedia({media:"print"});
  await page.locator('#print-report [data-legacy-lab]').first().waitFor({state:"visible"});
  await page.pdf({path:join(artifacts,"historical-report.pdf"),format:"A4",printBackground:true});
  await page.screenshot({path:join(artifacts,"historical-report-preview.png")});
  await page.emulateMedia({media:"screen"}); await page.evaluate(()=>window.dispatchEvent(new Event("afterprint")));
  // JSON export also saves; finish that write before replacing the server fixture.
  await saved();
  await page.goto(`${base}/learn/experiments`);
  const invalidRecord = JSON.parse(validRecord.document);
  invalidRecord.tasks["L1-1"].params.a = 0;
  records.set(101, { ...validRecord, document: JSON.stringify(invalidRecord) });
  const writeCount = writes.length;
  await page.goto(`${base}/learn/experiments/workspace`);
  await page.getByText("记录校验失败", { exact: true }).waitFor();
  assert.equal(writes.length, writeCount);
  records.set(101, validRecord);
  role = "teacher";
  await page.goto(`${base}/learn/experiments/guide`);
  const guideFrame = page.locator("[data-native-guide]");
  assert.equal(await page.locator("iframe").count(), 0);
  await guideFrame.getByRole("heading", { name: "三、实验一：信号与时域系统", exact: true }).waitFor();
  assert.equal(await guideFrame.locator("details").count(), 12);
  const popupEvent = page.waitForEvent("popup");
  await guideFrame.locator("details").first().locator("summary").click();
  await guideFrame.locator("details").first().getByRole("link", { name: "打开本任务工作台", exact: true }).click();
  const popup = await popupEvent;
  await popup.waitForURL(/\/learn\/experiments\/workspace#task\/L1-1/);
  await popup.close();
  await guideFrame.getByRole("heading", { name: "Python 编程选做：具体操作", exact: true }).first().waitFor();
  assert.deepEqual(errors, []);
  console.log("PASS: 12 guided tasks, all comparisons, prediction gate, completion checks, Python resources and drafts, responsive light/dark layouts, account save/refresh/retry/conflict, backup/JSON/PDF, v1/v1.1 archive import/refresh/export/print, shared ECG design, audio and pole dragging, isolation and teacher guide");
} catch (error) {
  if (page) console.error("Browser page alert:", await page.locator('[role="alert"]').allTextContents().catch(() => []));
  if (page) await page.screenshot({ path: join(artifacts, "failure.png") }).catch(() => {});
  throw error;
} finally {
  if (browser) await browser.close();
  if (server.listening) await new Promise((done) => server.close(done));
}

async function assertEventually(check) {
  const deadline = Date.now() + 20000;
  let last;
  while (Date.now() < deadline) {
    try { await check(); return; } catch (error) { last = error; }
    await new Promise((done) => setTimeout(done, 100));
  }
  throw last;
}
