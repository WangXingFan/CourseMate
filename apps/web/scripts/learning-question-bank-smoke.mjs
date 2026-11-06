// Run from the repo root after building web. A temporary loopback-only Go
// harness exercises the real question-bank handler without database fixtures.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { createInterface } from "node:readline";

const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON);
const { chromium } = require("playwright-core");
const root = resolve("apps/web/out"), artifacts = resolve(".cache/question-bank-smoke");
await mkdir(artifacts, { recursive: true });
await mkdir("backend/.cache", { recursive: true });
const harness = await mkdtemp(resolve("backend/.cache/question-bank-"));
await writeFile(join(harness, "main.go"), `package main
import (
 "fmt"
 "net"
 "net/http"
 app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/learning"
 transport "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/learning"
 "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
 "github.com/gin-gonic/gin"
)
func main() {
 gin.SetMode(gin.TestMode)
 router := gin.New()
 module := transport.NewModule(app.NewService(nil))
 router.GET("/api/v1/learning/question-bank", func(c *gin.Context) {
  c.Set(middleware.ContextKeyUserRole, c.GetHeader("X-Test-Role"))
  module.QuestionBank(c)
 })
 listener, err := net.Listen("tcp", "127.0.0.1:0")
 if err != nil { panic(err) }
 fmt.Println("http://" + listener.Addr().String())
 if err := http.Serve(listener, router); err != nil { panic(err) }
}
`);
const { execFileSync } = await import("node:child_process");
const executable = join(harness, process.platform === "win32" ? "bank.exe" : "bank");
execFileSync("go", ["build", "-o", executable, join(harness, "main.go")], { cwd: resolve("backend"), stdio: "inherit" });
const api = spawn(executable, [], { stdio: ["ignore", "pipe", "inherit"] });
const apiBase = await new Promise((done, reject) => {
  createInterface({ input: api.stdout }).once("line", done);
  api.once("error", reject);
  api.once("exit", (code) => reject(new Error(`Question-bank harness exited: ${code}`)));
});
const server = createServer(async (req, res) => {
  try {
    let path = resolve(root, `.${decodeURIComponent(new URL(req.url, "http://localhost").pathname)}`);
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    try { await stat(`${path}.html`); path += ".html"; }
    catch { if ((await stat(path)).isDirectory()) path = join(path, "index.html"); }
    res.setHeader("Content-Type", ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" })[extname(path)] ?? "application/octet-stream");
    res.end(await readFile(path));
  } catch { res.writeHead(404).end("Not found"); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const base = `http://127.0.0.1:${server.address().port}`;
const user = { id: 1, publicID: "bank-qa", username: "teacher", displayName: "题库教师", role: "teacher", status: "active", locale: "zh-CN", timezone: "Asia/Shanghai", initialSecurityRequired: false, initialUsernameRequired: false, mustResetPassword: false, onboardingCompletedAt: new Date().toISOString(), appearancePreferences: "", profilePreferences: "", identityProviders: [], email: "", phone: "", passwordEnabled: true };
const errors = [], requests = [];
let browser, page, failNext = false;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const context = await browser.newContext({ locale: "zh-CN", viewport: { width: 1440, height: 950 } });
  await context.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    let data;
    if (url.pathname.endsWith("/learning/question-bank")) {
      requests.push({ role: user.role, query: url.search });
      if (failNext) { failNext = false; await route.fulfill({ status: 500, json: { errorCode: "system.internal", errorMsg: "题库暂时不可用", data: null } }); return; }
      const response = await fetch(apiBase + url.pathname + url.search, { headers: { "X-Test-Role": user.role } });
      await route.fulfill({ status: response.status, contentType: "application/json", body: await response.text() }); return;
    }
    if (url.pathname.endsWith("/auth/refresh")) data = { accessToken: "bank-qa", sessionID: "bank-qa" };
    else if (url.pathname.endsWith("/me")) data = { user };
    else if (url.pathname.endsWith("/capabilities")) data = { features: { knowledgeBases: true, classrooms: true } };
    else if (url.pathname.endsWith("/branding")) data = { title: "CourseMate", shortName: "CourseMate", logoURL: "", faviconURL: "/favicon.ico" };
    else if (url.pathname.endsWith("/version")) { await route.fulfill({ json: { version: "0.4.4-beta.3", buildID: "" } }); return; }
    else data = { total: 0, results: [], models: [], groups: [], conversations: [], settings: {} };
    await route.fulfill({ json: { errorMsg: "", data } });
  });
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => errors.push(error.message));
  const search = page.locator("#question-bank-search");
  const question = (id) => page.locator(`[data-question-id="${id}"]`);
  const selectCategory = async (value) => {
    const select = page.locator("#question-bank-category");
    if (await select.isVisible()) await select.selectOption(value);
    else {
      const text = await select.locator(`option[value="${value}"]`).textContent();
      await page.getByRole("navigation", { name: "题库分类", exact: true }).getByRole("button", { name: text.replace(/[()]/g, "").replace(/\s+/g, " ") }).click();
    }
  };
  await page.goto(`${base}/question-bank`);
  await page.getByText("共 1860 题", { exact: true }).waitFor();
  await page.getByRole("link", { name: "题库", exact: true }).waitFor();
  assert.equal(await page.locator("#question-bank-category option").count(), 12);
  const firstID = await page.locator("article[data-question-id]").first().getAttribute("data-question-id");
  await page.getByRole("button", { name: "下一页", exact: true }).click();
  await page.getByText("第 2 / 93 页", { exact: true }).waitFor();
  assert.notEqual(await page.locator("article[data-question-id]").first().getAttribute("data-question-id"), firstID);
  await selectCategory("review");
  await page.getByText("找到 480 道题目", { exact: true }).waitFor();
  await page.getByText("第 1 / 24 页", { exact: true }).waitFor();
  await search.fill("ENERGY-SIGNAL-V1");
  await page.getByText("找到 1 道题目", { exact: true }).waitFor();
  await question("energy-signal-v1").getByText("解析", { exact: true }).waitFor();
  assert.match(await question("energy-signal-v1").getByRole("link", { name: "对应讲义" }).getAttribute("href"), /\/learn\/knowledge\?lesson=ss-/);
  await page.getByRole("button", { name: "收起答案与解析", exact: true }).click();
  assert.equal(await question("energy-signal-v1").getByText("参考答案", { exact: true }).count(), 0);
  await page.getByRole("button", { name: "查看答案与解析", exact: true }).click();
  for (const width of [1440, 390]) for (const theme of ["light", "dark"]) {
    await page.setViewportSize({ width, height: 950 });
    await page.evaluate((value) => { document.documentElement.classList.toggle("dark", value === "dark"); document.documentElement.style.colorScheme = value; }, theme);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: join(artifacts, `teacher-${width}-${theme}.png`), animations: "disabled" });
  }
  await search.fill("zz-no-matching-question");
  await page.getByText("没有找到匹配的题目", { exact: true }).waitFor();
  await page.getByRole("button", { name: "清除筛选", exact: true }).click();
  await page.getByText("找到 1860 道题目", { exact: true }).waitFor();
  await selectCategory("homework");
  await search.fill("hw2-q1 支撑");
  await question("hw2-q1").waitFor();
  await question("hw2-q1").locator("img").first().waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll("article img")].every((img) => img.complete && img.naturalWidth > 0));
  assert.equal(await page.locator(".katex-error").count(), 0);
  await page.screenshot({ path: join(artifacts, "homework-mobile.png"), animations: "disabled" });
  await selectCategory("in_class");
  await page.getByRole("button", { name: "清除关键词", exact: true }).click();
  await page.getByText("找到 52 道题目", { exact: true }).waitFor();
  await page.locator("article .katex").first().waitFor();
  assert.equal(await page.locator(".katex-error").count(), 0);
  await selectCategory("lab_calculation");
  await search.fill("L2-3-version-01");
  await question("L2-3-version-01").getByRole("heading", { name: /满足双指标/ }).waitFor();
  await question("L2-3-version-01").getByText(/参考方案/).first().waitFor();
  assert.ok(await question("L2-3-version-01").locator(".katex annotation").evaluateAll((nodes) => nodes.some((node) => node.textContent.replace(/\s+/g, "").includes("0<\\alpha\\le80"))));
  await page.screenshot({ path: join(artifacts, "lab-reference-mobile.png"), animations: "disabled" });
  failNext = true;
  await search.fill("L2-3-version-02");
  await page.getByRole("button", { name: "重新加载", exact: true }).waitFor();
  await page.getByRole("button", { name: "重新加载", exact: true }).click();
  await question("L2-3-version-02").waitFor();
  for (const role of ["admin", "superadmin"]) {
    user.role = role;
    await page.setViewportSize({ width: 1440, height: 950 });
    await page.goto(`${base}/admin/question-bank`);
    await page.getByText("共 1860 题", { exact: true }).waitFor();
    await page.getByRole("navigation", { name: "管理", exact: true }).getByRole("link", { name: "题库", exact: true }).waitFor();
    await selectCategory("lab_checkpoint");
    await page.getByText("找到 24 道题目", { exact: true }).waitFor();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 950 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: join(artifacts, `${role}-${width}.png`), animations: "disabled" });
    }
  }
  for (const role of ["student", "user"]) {
    user.role = role;
    const before = requests.length;
    await page.goto(`${base}/question-bank`);
    await page.getByText("仅教师和管理员可以查看题库", { exact: true }).waitFor();
    assert.equal(await page.getByRole("link", { name: "题库", exact: true }).count(), 0);
    assert.equal(requests.length, before, `${role} must not request answer data`);
  }
  assert.deepEqual(errors, []);
  console.log("PASS: real bank handler, teacher/admin entries, 11 categories, search, pagination, explanations, math/images, lab reference answers, retry, role gate and mobile/light/dark layouts.");
} catch (error) {
  if (page) await page.screenshot({ path: join(artifacts, "failure.png") });
  throw error;
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
  const stopped = new Promise((done) => api.once("exit", done));
  api.kill();
  await stopped;
  await rm(harness, { recursive: true, force: true });
}
