// Run from the workspace root after building the static frontend.
// UI fixtures exercise the bridge and retry behavior; Go tests cover real auth/DB.
// Set VIRTUAL_LAB_BASE_URL to also verify a running Go server's static responses.
import assert from "node:assert/strict";
import { LAB_FLOWS, labReading } from "../features/learning/model/virtual-lab-flow.ts";
import { createVirtualLabEngine } from "../public/vendor/signal-lab/core.mjs";
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
    if (url.pathname.endsWith("/learning/virtual-lab/guide")) {
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
  const fillObservation = async (id, step, params) => {
    if (!step.observation) return;
    const value = String(labReading(engine.scene(id, params, labAnswers(id, params)).readings, step.observation.reading));
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
  assert.equal(await frame().locator('[data-lab-givens] svg[data-chart="given"]').count(), 1, "Prediction needs the original signal");
  assert.equal(await frame().locator('[data-lab-givens] [data-series]').count(), 1, "Only the original signal is shown");
  assert.equal(await frame().locator('[data-lab-givens] [data-series="p(t)"]').count(), 1);
  assert.equal(await frame().locator('svg[data-chart="main"]').count(), 0, "The transformed result is still hidden");
  assert.equal(await frame().locator('[data-phase="observe"]').isDisabled(), true);
  assert.equal(await frame().locator('[data-python-task]').count(), 0, "Programming does not distract from the first step");
  await frame().locator("#prediction").fill("右移一秒，峰值时刻加一秒，高度不变。");
  await frame().locator('[data-action="prediction"]').click();
  for (let index = 0; index < LAB_FLOWS["L1-1"].steps.length; index++) {
    const step = LAB_FLOWS["L1-1"].steps[index];
    assert.equal(await frame().getByLabel("当前对照", { exact: true }).inputValue(), String(index));
    assert.equal(await frame().locator('[data-action="trial"]').isDisabled(), true, "Saving without an observation is blocked");
    assert.equal(await frame().locator('[data-python-task]').count(), 0, "Python is only offered after the main experiment");
    if (index === 1) {
      await saved();
      await page.reload();
      await frame().locator("#param-shift").waitFor();
      assert.equal(await frame().getByLabel("当前对照", { exact: true }).inputValue(), "1", "Reload resumes a manual step before the target has been reached");
      assert.equal(await frame().locator("#param-shift").inputValue(), "0", "The shift is not done for the student");
      await frame().locator("#observation").fill("1");
      await frame().locator('[data-action="trial"]').click();
      await frame().getByRole("alert").filter({ hasText: "先调节上方参数" }).waitFor();
    }
    for (const key of step.controls ?? []) await frame().locator(`#param-${key}`).fill(String(step.params[key]));
    if (index === 1) {
      assert.equal(await frame().locator("#observation").inputValue(), "", "Changing parameters clears the old reading");
      await frame().locator("#observation").fill("99");
      await frame().locator('[data-action="trial"]').click();
      await frame().getByRole("alert").filter({ hasText: "读数与当前图形不符" }).waitFor();
    }
    await fillObservation("L1-1", step, { ...engine.defaults("L1-1"), ...step.params });
    await frame().locator('[data-action="trial"]').click();
  }
  await frame().locator("#analysis").fill("右移改变峰时，反转改变方向，压缩缩短信号；窄脉冲面积保持为 1。");
  await frame().locator('[data-action="complete"]').click();
  await saved();
  let document = JSON.parse(records.get(101).document);
  assert.equal(document.student.number, "student101");
  assert.equal(document.tasks["L1-1"].trials.length, 8);
  assert.equal(document.tasks["L1-1"].trials[1].params.shift, 1);
  assert.equal(document.tasks["L1-1"].trials[1].measurements.peakTime, 2);
  assert.equal(document.tasks["L1-1"].trials[1].measurements.observation.value, 2);
  assert.equal(document.tasks["L1-1"].completion.confirmed, true);
  assert.equal(await page.locator("iframe").count(), 0, "workspace must be native React");
  assert.equal(await page.evaluate(() => Object.hasOwn(window, "SignalLab")), false);
  await page.reload();
  await frame().locator("#analysis").waitFor();
  assert.equal(await frame().locator("#analysis").inputValue(), document.tasks["L1-1"].analysis);
  await frame().locator('[data-phase="observe"]').click();
  await frame().getByLabel("当前对照", { exact: true }).selectOption("1");
  await frame().locator("#param-shift").fill("1");
  await frame().locator('[data-lab-tools] > summary').click();
  const pngEvent = page.waitForEvent("download");
  await frame().locator('[data-action="png"]').click();
  const png = await pngEvent;
  assert.equal((await readFile(await png.path())).subarray(1, 4).toString(), "PNG");
  await frame().locator('[data-lab-tools] > summary').click();
  await frame().locator('[data-phase="conclude"]').click();
  const embedded = frame().locator('[data-python-task="L1-1"]');
  await embedded.locator("summary").click();
  const editor = embedded.locator("[data-python-editor]");
  await editor.waitFor();
  assert.match(await editor.inputValue(), /shift=1/);
  await editor.fill(`${await editor.inputValue()}\n# integration evidence`);
  await saved();
  assert.equal(JSON.parse(records.get(101).document).tasks["L1-1"].python.code.endsWith("# integration evidence"), true);
  if (process.env.PYTHON_RUNTIME_SMOKE === "1") {
    await embedded.getByRole("button", { name: "运行代码", exact: true }).click({ timeout: 120000 });
    await embedded.locator("figure img").waitFor({ timeout: 120000 });
    await assertEventually(async () => assert.ok(JSON.parse(records.get(101).document).tasks["L1-1"].python.result));
    const evidence = JSON.parse(records.get(101).document).tasks["L1-1"].python;
    assert.equal(evidence.result.params.shift, 1);
    assert.ok(evidence.result.stdout.includes("sampled peak"));
  }
  await embedded.locator("summary").click();
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
        const optional = frame().locator('[data-python-task="L1-1"]');
        await optional.locator("summary").click();
        await optional.locator("summary").scrollIntoViewIfNeeded();
        await page.screenshot({ path: join(artifacts, `guided-python-${width}-${theme}.png`), animations: "disabled" });
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
    await frame().locator('[data-lab-givens]').waitFor();
    assert.ok(await frame().locator('[data-given-formula] .katex').count(), `${id}: known conditions`);
    await frame().locator("#prediction").fill("先判断参数变化，再用数据核验。");
    await frame().locator('[data-action="prediction"]').click();
    for (let index = 0; index < flow.steps.length; index++) {
      assert.equal(await frame().getByLabel("当前对照", { exact: true }).inputValue(), String(index), `${id}/${index}`);
      const inputs = frame().locator("[data-answer]");
      if (await inputs.count()) assert.ok(await frame().locator('[data-answer-formula] .katex').count(), `${id}: complete answer template`);
      const step = flow.steps[index], params = { ...engine.defaults(id), ...step.params };
      if (step.key === "candidate") params.candidate = 5;
      if (step.key === "ninety") params.measureTime = 2.3;
      if (step.key === "refine") params.T = 1.61;
      const answers = labAnswers(id, params);
      for (let j = 0; j < await inputs.count(); j++) await inputs.nth(j).fill(answers[await inputs.nth(j).getAttribute("data-answer")]);
      if (step.key === "ninety" || step.key === "refine") {
        await frame().locator('[data-action="trial"]').click();
        await frame().getByRole("alert").waitFor();
      }
      for (const key of step.controls ?? []) await frame().locator(`#param-${key}`).fill(String(params[key]));
      await fillObservation(id, step, params);
      if (id === "L1-4" && flow.steps[index].key.startsWith("response")) assert.equal(await frame().locator('svg[data-chart="output"]').first().isVisible(), true);
      if (id === "L2-4" && flow.steps[index].key !== "candidate") assert.equal(await frame().locator('[data-series^="候选"]').count(), 0);
      if ((id === "L1-2" && index === 0) || (id === "L1-4" && flow.steps[index].key === "response0") || (id === "L2-3" && index === 0) || (id === "L3-1" && flow.steps[index].key === "delayed")) {
        for (const width of [1440, 390]) {
          await page.setViewportSize({ width, height: 950 });
          await frame().evaluate((element) => { element.scrollTop = 0; });
          await page.screenshot({ path: join(artifacts, `conditions-${id}-${width}.png`), animations: "disabled" });
          assert.ok(await frame().locator('[data-native-task]').evaluate((element) => element.scrollWidth <= element.clientWidth + 1), `${id}: no horizontal page overflow`);
        }
        await page.setViewportSize({ width: 1440, height: 950 });
      }
      await frame().locator('[data-action="trial"]').click();
    }
    await frame().locator("#analysis").fill("已记录各组参数与读数，并比较变化。");
    if (flow.derivation) {
      assert.equal(await frame().locator('[data-action="complete"]').isDisabled(), true);
      await frame().locator("#derivation").fill("推导过程与数值核验记录。");
    }
    await frame().locator('[data-action="complete"]').click();
    const python = frame().locator(`[data-python-task="${id}"]`);
    assert.equal(await python.evaluate((element) => element.open), false);
    await python.locator("summary").click();
    await python.locator("[data-python-editor]").waitFor();
    assert.ok((await python.locator("[data-python-editor]").inputValue()).includes("plt.show()"));
    await saved();
    assert.equal(JSON.parse(records.get(101).document).tasks[id].completion.confirmed, true, "Opening optional Python must not undo the completed experiment");
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
  if (process.env.PYTHON_RUNTIME_SMOKE === "1") {
    assert.ok(report.includes("integration evidence"), "Printed report includes executed Python code");
    assert.equal(await page.locator('[data-python-report="L1-1"] img').count(), 1);
  }
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
  await guideFrame.getByRole("heading", { name: "第一次实验 信号与时域系统", exact: true }).waitFor();
  assert.equal(await guideFrame.locator("details").count(), 12);
  const popupEvent = page.waitForEvent("popup");
  await guideFrame.getByRole("link", { name: "直接打开 L1-1 ↗", exact: true }).click();
  const popup = await popupEvent;
  await popup.waitForURL(/\/learn\/experiments\/workspace#task\/L1-1/);
  await popup.close();
  await guideFrame.getByRole("heading", { name: "把代码生成信号纳入实验", exact: true }).first().waitFor();
  assert.deepEqual(errors, []);
  console.log("PASS: 12 guided tasks, all comparisons, prediction gate, completion checks, Python resources and drafts, responsive light/dark layouts, account save/refresh/retry/conflict, backup/JSON/PDF, isolation and teacher guide");
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
