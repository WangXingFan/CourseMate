// Run from the workspace root after the web build. API fixtures verify UI
// selection, pagination and partial failure; Go tests cover storage/visibility.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, readFile, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";

const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON);
const { chromium } = require("playwright-core");
const root = resolve("apps/web/out"), artifacts = resolve(".cache/knowledge-bases-smoke");
await mkdir(artifacts, { recursive: true });
const server = createServer(async (req, res) => {
  try {
    let path = resolve(root, `.${decodeURIComponent(new URL(req.url, "http://localhost").pathname)}`);
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    try { await stat(`${path}.html`); path += ".html"; }
    catch { if ((await stat(path)).isDirectory()) path = join(path, "index.html"); }
    res.setHeader("Content-Type", ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2" })[extname(path)] ?? "application/octet-stream");
    res.end(await readFile(path));
  } catch { res.writeHead(404).end("Not found"); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const base = `http://127.0.0.1:${server.address().port}`;
const now = new Date().toISOString();
let files = Array.from({ length: 105 }, (_, i) => ({
  fileID: `file-${i}`, fileName: `教材-${String(i + 1).padStart(3, "0")}.md`,
  mimeType: "text/markdown", fileCategory: "text", sizeBytes: 2048,
  processingReady: true, processing: false, extractStatus: "ready", embedStatus: "ready",
  chunkCount: 2, canVectorize: false, vectorizationReason: "ready", createdAt: now, updatedAt: now,
}));
const originalCount = files.length, deletes = [], errors = [];
let failFile = "file-1";
const kb = () => ({ publicID: "signals", name: "信号与系统", description: "", scope: "builtin", enabled: true,
  fileCount: files.length, readyFileCount: files.length, processingFileCount: 0, createdAt: now, updatedAt: now });
const user = { id: 1, publicID: "qa-admin", username: "admin", displayName: "测试管理员", role: "superadmin",
  status: "active", locale: "zh-CN", timezone: "Asia/Shanghai", initialSecurityRequired: false,
  initialUsernameRequired: false, mustResetPassword: false, onboardingCompletedAt: now, appearancePreferences: "",
  profilePreferences: "", identityProviders: [], email: "", phone: "", passwordEnabled: true };
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const context = await browser.newContext({ locale: "zh-CN", viewport: { width: 1440, height: 950 } });
  await context.route("**/api/v1/**", async (route) => {
    const req = route.request(), url = new URL(req.url());
    let data = {};
    const filePath = url.pathname.match(/\/(?:admin\/)?knowledge-bases\/signals\/files(?:\/(file-\d+))?$/);
    if (filePath) {
      if (req.method() === "DELETE") {
        assert.ok(url.pathname.includes("/knowledge-bases/signals/files/"), "must remove relation, not source file");
        deletes.push(filePath[1]);
        if (filePath[1] === failFile) {
          await route.fulfill({ status: 500, json: { errorMsg: "fixture failure", data: null } }); return;
        }
        files = files.filter((file) => file.fileID !== filePath[1]);
        data = { knowledgeBase: kb(), removedCount: 1 };
      } else {
        const page = Number(url.searchParams.get("page") || 1), size = Number(url.searchParams.get("page_size") || 100);
        data = { total: files.length, results: files.slice((page - 1) * size, page * size) };
      }
    } else if (/\/(?:admin\/)?knowledge-bases$/.test(url.pathname)) data = { total: 1, results: [kb()] };
    else if (url.pathname.endsWith("/knowledge-bases/signals")) data = { knowledgeBase: kb() };
    else if (url.pathname.endsWith("/auth/refresh")) data = { accessToken: "qa-admin", sessionID: "qa" };
    else if (url.pathname.endsWith("/me")) data = { user };
    else if (url.pathname.endsWith("/user/settings")) data = { settings: {} };
    else if (url.pathname.endsWith("/capabilities")) data = { features: { knowledgeBases: true, classrooms: true } };
    else if (url.pathname.endsWith("/branding")) data = { title: "CourseMate", shortName: "CourseMate", description: "", logoURL: "", faviconURL: "/favicon.ico" };
    else if (url.pathname.endsWith("/version")) { await route.fulfill({ json: { version: "0.4.4-beta.3", buildID: "" } }); return; }
    else data = { total: 0, results: [], models: [], groups: [], conversations: [], knowledgeBases: [], settings: {}, items: [] };
    await route.fulfill({ json: { errorMsg: "", data } });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => { errors.push(error.message); console.error(error.stack); });
  await page.goto(`${base}/admin/knowledge-bases`);
  await page.getByRole("row").filter({ hasText: "信号与系统" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox", { name: "全选已加载文件", exact: true }).waitFor();
  assert.equal(await dialog.getByRole("checkbox", { name: /^选择文件/ }).count(), 100);
  const first = dialog.getByRole("checkbox", { name: /教材-001/ });
  const second = dialog.getByRole("checkbox", { name: /教材-002/ });
  await first.click();
  await second.click();
  await dialog.getByText("已选择 2 个", { exact: true }).waitFor();
  assert.equal(await dialog.getByRole("button", { name: "向量化", exact: true }).isDisabled(), true, "ready files can be removed but not re-vectorized");
  await dialog.getByRole("button", { name: "移除所选", exact: true }).click();
  const confirmation = page.getByRole("alertdialog");
  await confirmation.getByText(/原文件将保留/).waitFor();
  await confirmation.getByRole("button", { name: "取消", exact: true }).click();
  assert.equal(deletes.length, 0);
  await dialog.getByRole("button", { name: "移除所选", exact: true }).click();
  await confirmation.getByRole("button", { name: "移除所选", exact: true }).click();
  await dialog.getByText("已选择 1 个", { exact: true }).waitFor();
  assert.equal(files.length, originalCount - 1);
  assert.equal(await second.isChecked(), true, "failed item must stay selected");
  failFile = "";
  await dialog.getByRole("button", { name: "移除所选", exact: true }).click();
  await confirmation.getByRole("button", { name: "移除所选", exact: true }).click();
  await dialog.getByText("已选择 0 个", { exact: true }).waitFor();
  await confirmation.waitFor({ state: "hidden" });
  await dialog.getByRole("button", { name: "加载更多", exact: true }).click();
  await dialog.getByRole("checkbox", { name: "全选", exact: true }).waitFor();
  assert.equal(await dialog.getByRole("checkbox", { name: /教材-/ }).count(), 103, "no skipped files after page offsets shifted");
  await dialog.getByRole("checkbox", { name: "全选", exact: true }).click();
  await dialog.getByText("已选择 103 个", { exact: true }).waitFor();
  for (const width of [1440, 390]) for (const theme of ["light", "dark"]) {
    await page.setViewportSize({ width, height: 950 });
    await page.evaluate((value) => { document.documentElement.classList.toggle("dark", value === "dark"); document.documentElement.style.colorScheme = value; }, theme);
    await page.screenshot({ path: join(artifacts, `admin-files-${width}-${theme}.png`), animations: "disabled" });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "horizontal overflow");
  }
  await dialog.getByRole("button", { name: "移除所选", exact: true }).click();
  await confirmation.getByRole("button", { name: "移除所选", exact: true }).click();
  await dialog.getByText("知识库中还没有文件", { exact: true }).waitFor();
  assert.equal(files.length, 0, "all loaded files removed across the 100-file boundary");
  files = [{ fileID: "read-only", fileName: "只读教材.md", mimeType: "text/markdown", fileCategory: "text", sizeBytes: 2048, processingReady: true, embedStatus: "ready", chunkCount: 2 }];
  user.role = "student";
  await page.goto(`${base}/knowledge-bases`);
  try {
    await page.getByText("信号与系统", { exact: true }).first().click();
  } catch (error) {
    console.error("Read-only page:", page.url(), errors, await page.locator("body").innerText());
    throw error;
  }
  await page.getByText("只读教材.md", { exact: true }).waitFor();
  assert.equal(await page.getByRole("checkbox", { name: /选择文件|全选已加载文件|^全选$/ }).count(), 0, "shared knowledge base stays read-only for students");
  assert.equal(await page.getByRole("button", { name: "移除所选", exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  console.log("PASS: ready-file selection, confirmation, partial failure/retry, pagination, 103-file removal, read-only scope and four visual layouts");
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
