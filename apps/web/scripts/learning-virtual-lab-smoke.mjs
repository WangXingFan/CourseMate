// Run from the workspace root after building the static frontend.
// UI fixtures exercise the bridge and retry behavior; Go tests cover real auth/DB.
// Set VIRTUAL_LAB_BASE_URL to also verify a running Go server's static responses.
import assert from "node:assert/strict";
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
  const frame = () => page.locator("[data-native-lab]");
  const saved = () => page.getByText("已保存到当前账号", { exact: true }).waitFor();
  await page.goto(`${base}/learn/experiments`);
  await page.getByRole("heading", { name: "信号与系统 · 三次完整实验", exact: true }).waitFor();
  assert.equal(await page.locator('a[href*="workspace#course/"]').count(), 3);
  assert.equal(await page.getByText("教师开课指南", { exact: true }).count(), 0);
  await page.getByRole("link", { name: /实验一 · 信号与时域系统/ }).click();
  await frame().getByRole("heading", { name: "信号变换与连续系统时域探究", exact: true }).waitFor();
  await page.goto(`${base}/learn/experiments/workspace#task/L1-1`);
  await frame().locator("#prediction").fill("右移一秒，峰值位置加一秒，高度不变。");
  await frame().locator('[data-action="prediction"]').click();
  await frame().getByRole("button", { name: "平移", exact: true }).click();
  await frame().locator('[data-action="trial"]').click();
  await frame().locator("#analysis").fill("测量支撑为 [1,4]，峰时为 2 s，峰高为 1。");
  await saved();
  let document = JSON.parse(records.get(101).document);
  assert.equal(document.student.number, "student101");
  assert.equal(document.tasks["L1-1"].trials[0].params.shift, 1);
  assert.equal(document.tasks["L1-1"].trials[0].measurements.peakTime, 2);
  const pngEvent = page.waitForEvent("download");
  await frame().locator('[data-action="png"]').click();
  const png = await pngEvent;
  const pngBytes = await readFile(await png.path());
  assert.equal(pngBytes.subarray(1, 4).toString(), "PNG");
  assert.equal(await page.locator("iframe").count(), 0, "workspace must be native React");
  assert.equal(await page.evaluate(() => Object.hasOwn(window, "SignalLab")), false, "engine leaked a global");
  await page.screenshot({ path: join(artifacts, "workspace-desktop.png") });
  await page.reload();
  await frame().locator("#analysis").waitFor();
  assert.equal(await frame().locator("#analysis").inputValue(), document.tasks["L1-1"].analysis);
  // Verify all twelve teaching steps are reachable after integration.
  for (const course of [1, 2, 3]) for (const task of [1, 2, 3, 4]) {
    const id = `L${course}-${task}`;
    await page.evaluate((route) => { window.location.hash = route; }, `task/${id}`);
    await frame().locator("#prediction").waitFor();
    await assertEventually(async () => assert.equal(await childRoute(page), id));
    assert.ok(await frame().getByText("保存本次试验", { exact: true }).count());
  }
  await page.evaluate(() => { window.location.hash = "task/L1-1"; });
  await assertEventually(async () => assert.equal(await childRoute(page), "L1-1"));
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
  await page.getByRole("button", { name: "下载当前记录 JSON", exact: true }).click();
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
  await frame().locator("#prediction").waitFor();
  assert.equal(await frame().locator("#param-shift").inputValue(), "1");
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
  await page.emulateMedia({ media: "print" });
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
  await frame().locator("#analysis").waitFor();
  assert.equal(await frame().locator("#analysis").inputValue(), "");
  await frame().locator("#analysis").fill("账号102独立内容");
  await saved();
  assert.equal(JSON.parse(records.get(102).document).student.number, "student102");
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
  assert.deepEqual(errors, []);
  console.log("PASS: three labs, 12 tasks, existing accounts, save/refresh/retry/conflict, backup/JSON/PDF, isolation, initial-load failure, mobile layout and protected teacher-guide links");
} catch (error) {
  if (page) await page.screenshot({ path: join(artifacts, "failure.png") }).catch(() => {});
  throw error;
} finally {
  if (browser) await browser.close();
  if (server.listening) await new Promise((done) => server.close(done));
}

async function childRoute(activePage) {
  return activePage.locator("[data-native-task]").getAttribute("data-native-task");
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
