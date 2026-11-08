// Fixtures exercise scoring displays and learning-entry request metadata.
// Go tests verify scoring, deduplication, persistence, permissions and XLSX data.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, readFile, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";

const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON);
const { chromium } = require("playwright-core");
const root = resolve("apps/web/out"), artifacts = resolve(".cache/ai-activity-smoke");
await mkdir(artifacts, { recursive: true });
const server = createServer(async (req, res) => {
  try {
    let path = resolve(root, `.${decodeURIComponent(new URL(req.url, "http://localhost").pathname)}`);
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    try { await stat(`${path}.html`); path += ".html"; }
    catch { if ((await stat(path)).isDirectory()) path = join(path, "index.html"); }
    res.setHeader("Content-Type", ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".woff2": "font/woff2" })[extname(path)] ?? "application/octet-stream");
    res.end(await readFile(path));
  } catch { res.writeHead(404).end(); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const base = `http://127.0.0.1:${server.address().port}`;
const now = new Date().toISOString();
const classroom = { id: "class", name: "信号一班", teacherName: "任课老师", teacherId: "teacher", description: "", studentCount: 1, experiments: {}, createdAt: now };
const week = { startDate: "2026-11-02", endDate: "2026-11-08", status: "closed", activeDays: 1, validRounds: 3, countedRounds: 2, dayScore: 30, roundScore: 20, baseScore: 50, consecutiveWeeks: 2, followupRounds: 2, learningRounds: 2, continuityScore: 10, followupScore: 20, learningScore: 20, bonusScore: 50, score: 100 };
const report = { version: "ai-activity-v2", classroomId: "class", startDate: "2026-11-02", endDate: "2026-11-09", generatedAt: now, students: [{ studentId: "student", username: "001", name: "测试学生", expectedWeeks: 1, activeWeeks: 1, activeDays: 1, validRounds: 3, final: 100, weeks: [week, { ...week, startDate: "2026-11-09", endDate: "2026-11-15", status: "provisional", baseScore: 100, dayScore: 60, roundScore: 40, activeDays: 2, validRounds: 4, countedRounds: 4, bonusScore: 0 }] }] };
const model = { platformModelName: "test-model", displayName: "测试模型", capabilitiesJSON: "{}", protocolsJSON: '["openai_chat_completions"]', kindsJSON: '["text"]', vendor: "openai", description: "", icon: "", sortOrder: 1 };
const conversation = { publicID: "learning-chat", title: "学习提问", model: "test-model", userID: 7, status: "active", labelsJSON: "[]", contextPolicyJSON: "{}", messageCount: 0, createdAt: now, updatedAt: now };
const errors = [], sent = [];
let browser;

async function session(role, locale = "zh-CN") {
  const context = await browser.newContext({ locale, timezoneId: "Asia/Shanghai", viewport: { width: 1440, height: 950 } });
  await context.route("**/api/v1/**", async (route) => {
    const req = route.request(), path = new URL(req.url()).pathname;
    let data = { results: [], total: 0, settings: {}, conversations: [], knowledgeBases: [] };
    if (path.endsWith("/auth/refresh")) data = { accessToken: "qa-ai", sessionID: "qa-ai" };
    else if (path.endsWith("/me")) data = { user: { id: 7, publicID: role, username: "001", displayName: "测试学生", role, status: "active", locale, timezone: "Asia/Shanghai", initialSecurityRequired: false, initialUsernameRequired: false, mustResetPassword: false, onboardingCompletedAt: now, identityProviders: [], appearancePreferences: "", profilePreferences: "", passwordEnabled: true } };
    else if (path.endsWith("/models")) data = [model];
    else if (path.endsWith("/messages/stream")) {
      sent.push(req.postDataJSON());
      await route.fulfill({ status: 400, json: { errorMsg: "test stream stopped", errorCode: "request.invalid_input" } }); return;
    } else if (path.endsWith("/messages")) data = { results: [], total: 0 };
    else if (path.endsWith("/conversations/learning-chat")) data = conversation;
    else if (path.endsWith("/conversations") && req.method() === "POST") data = conversation;
    else if (path.endsWith("/classrooms")) data = { classrooms: [classroom] };
    else if (path.endsWith("/classrooms/class/students")) data = { students: [{ id: "student", username: "001", displayName: "测试学生", joinedAt: now }] };
    else if (path.endsWith("/ai-activity")) data = { report };
    else if (path.endsWith("/student/quizzes")) data = { classroom, quizzes: [] };
    else if (path.endsWith("/student/attendance")) data = { items: [] };
    else if (path.endsWith("/student/performance")) data = { record: null };
    else if (path.endsWith("/capabilities")) data = { features: { knowledgeBases: true, classrooms: true } };
    else if (path.endsWith("/branding")) data = { title: "课知伴", shortName: "课知伴", description: "", logoURL: "", faviconURL: "/favicon.ico" };
    else if (path.endsWith("/version")) { await route.fulfill({ json: { version: "0.4.4-beta.3", buildID: "" } }); return; }
    await route.fulfill({ json: { errorMsg: "", data } });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => errors.push(error.message));
  return page;
}

async function inspectWeeks(page, prefix) {
  await page.getByRole("button", { name: "测试学生 · 每周明细", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("columnheader", { name: "实际加分", exact: true }).waitFor();
  const rows = dialog.locator("tbody tr");
  assert.match(await rows.nth(0).innerText(), /连续 2 周：\+10/);
  assert.match(await rows.nth(0).innerText(), /学习入口 2 轮：\+20/);
  assert.equal(await rows.nth(0).locator("td").nth(3).innerText(), "+50");
  assert.equal(await rows.nth(1).locator("td").nth(3).innerText(), "+0");
  for (const width of [1440, 390]) for (const dark of [false, true]) {
    await page.setViewportSize({ width, height: 950 });
    await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), dark);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: join(artifacts, `${prefix}-${width}-${dark ? "dark" : "light"}.png`), animations: "disabled" });
  }
  await page.keyboard.press("Escape");
}

try {
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const teacher = await session("teacher");
  await teacher.goto(`${base}/classrooms`);
  await teacher.getByRole("button", { name: /信号一班/ }).click();
  await teacher.getByRole("button", { name: "AI 使用活跃度", exact: true }).click();
  await teacher.getByText("可选加分途径", { exact: true }).click();
  await teacher.getByText(/原有方式仍可单独获得满分/).waitFor();
  await inspectWeeks(teacher, "teacher-weekly-bonuses");
  const student = await session("student");
  await student.goto(`${base}/activities`);
  await student.getByText("本周 100/100 · 基础分 100 + 实际加分 0（临时统计）", { exact: true }).waitFor();
  await inspectWeeks(student, "student-weekly-bonuses");
  const english = await session("student", "en-US");
  await english.goto(`${base}/activities`);
  await english.getByText(/This week 100\/100/).waitFor();
  await english.getByText("Optional ways to earn bonus points", { exact: true }).click();
  await english.getByText(/Weekly scores stop at 100/).waitFor();

  for (const [source, returnHref] of [["lesson", "/learn/knowledge?lesson=ss-1-1"], ["practice", "/learn/practice?concept=lesson:ss-1-1"], ["correction", "/learn/progress"], ["experiment", "/learn/experiments/workspace#task/L1-1"], [undefined, "/learn/progress"]]) {
    const page = await session("student");
    await page.goto(`${base}/chat`);
    await page.locator("textarea").waitFor();
    const id = `handoff-${source ?? "removed"}`;
    await page.evaluate(({ id, returnHref }) => {
      const storageKey = `coursemate.learning-help:${JSON.stringify(["http://127.0.0.1:8080", "student", id])}`;
      sessionStorage.setItem(storageKey, JSON.stringify({ title: "信号分类", returnHref, prompt: "我的问题：为什么是周期信号？\n学习上下文：作业中的原题与我的答案。" }));
    }, { id, returnHref });
    await page.goto(`${base}/chat?learning=${id}`);
    await page.waitForFunction(() => document.querySelector("textarea")?.value.includes("学习上下文"));
    if (!source) await page.locator("textarea").fill("普通对话，不包含学习上下文");
    const pending = page.waitForRequest((req) => req.url().includes("/messages/stream"));
    const response = page.waitForResponse((res) => res.url().includes("/messages/stream"));
    await page.getByRole("button", { name: "发送", exact: true }).click();
    const req = await pending;
    assert.equal(req.postDataJSON().learningSource, source);
    assert.equal(req.postDataJSON().parentMessagePublicID, undefined);
    await response;
    await page.context().close();
  }
  assert.equal(sent.length, 5);
  assert.deepEqual(errors, []);
  console.log("PASS: capped bonus details for teachers/students, current-week score, bilingual/mobile/light/dark UI and four learning-entry tags on chat requests.");
} catch (error) {
  for (const [i, context] of (browser?.contexts() ?? []).entries()) for (const page of context.pages()) await page.screenshot({ path: join(artifacts, `failure-${i}.png`) }).catch(() => {});
  throw error;
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
