// UI fixtures exercise retries and account views; Go tests cover real grading,
// chapter membership, ordering, timeout and database transactions.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, mkdir, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON);
const { chromium } = require("playwright-core");
const root = resolve("apps/web/out");
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
const externalBase = process.env.CLASSROOM_BASE_URL?.replace(/\/$/, "");
if (!externalBase) await new Promise((done) => server.listen(0, "127.0.0.1", done));
const base = externalBase || `http://127.0.0.1:${server.address().port}`;
const artifacts = resolve(".cache/chapter-quiz-smoke");
await mkdir(artifacts, { recursive: true });
const bank = JSON.parse(await readFile("backend/internal/domain/learning/content/quick-questions.json", "utf8"));
const chapters = ["1", "2", "3", "4"].map((id) => ({ id, roundSize: 10, questionIds: bank.questions.filter((q) => q.chapterID === id).map((q) => q.id) }));
const messages = JSON.parse(await readFile("apps/web/i18n/messages/zh-CN/learning-labs.json", "utf8"));
const correct = new Map(bank.questions.map((q) => [q.id, q.answer]));
const user = { id: 101, publicID: "quiz-qa-student", username: "qa101", displayName: "答题测试", role: "student", status: "active", locale: "zh-CN", timezone: "Asia/Shanghai", initialSecurityRequired: false, initialUsernameRequired: false, mustResetPassword: false, onboardingCompletedAt: new Date().toISOString(), appearancePreferences: "", profilePreferences: "", identityProviders: [], email: "", phone: "", passwordEnabled: true };
let round;
let failAnswer = true;
let activityStatus = 500;
const answerRequests = [];
const chapterRequests = [];
const errors = [];
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const context = await browser.newContext({ locale: "zh-CN", timezoneId: "Asia/Shanghai", viewport: { width: 1360, height: 950 } });
await context.route("**/api/v1/**", async (route) => {
  const req = route.request(), url = new URL(req.url()), path = url.pathname;
  let data;
  if (path.endsWith("/learning/quiz/chapters")) data = { chapters };
  else if (path.endsWith("/learning/quiz/leaderboard")) {
    chapterRequests.push(url.searchParams.get("chapterId"));
    data = { rankings: [{ rank: 1, name: "最佳得分", score: 34, elapsedMs: 30000, isCurrentUser: false }, { rank: 2, name: "同分快同学", score: 22, elapsedMs: 7000, isCurrentUser: false }, { rank: 3, name: "答题测试", score: 22, elapsedMs: 8000, isCurrentUser: true }] };
  } else if (path.endsWith("/learning/quiz/rounds")) {
    const body = req.postDataJSON();
    assert.ok(chapters.some((c) => c.id === body.chapterId));
    if (!round || round.id !== body.id) round = { id: body.id, chapterId: body.chapterId, questionIds: chapters.find((c) => c.id === body.chapterId).questionIds.slice(0,10), answers: [], startedAt: new Date().toISOString(), deadlineAt: new Date(Date.now() + 90000).toISOString(), finishedAt: null, elapsedMs: 0, score: 0, correctCount: 0, bestStreak: 0 };
    data = { round, serverTime: new Date().toISOString() };
  } else if (path.includes("/learning/quiz/rounds/") && path.endsWith("/answers")) {
    const body = req.postDataJSON(); answerRequests.push(body);
    assert.ok(round.questionIds.includes(body.questionId));
    if (!round.answers.some((a) => a.questionId === body.questionId)) {
      assert.equal(body.questionId, round.questionIds[round.answers.length]);
      const ok = body.selected === correct.get(body.questionId);
      round.answers.push({ ...body, correct: ok });
      if (ok) { round.score += 10 + round.correctCount * 2; round.correctCount++; round.bestStreak = round.correctCount; }
      if (round.answers.length === round.questionIds.length) { round.finishedAt = new Date().toISOString(); round.elapsedMs = 4250; }
    }
    if (failAnswer) { failAnswer = false; await route.abort("connectionfailed"); return; }
    data = { round, serverTime: new Date().toISOString() };
  } else if (path.endsWith("/student/quizzes")) {
    if (activityStatus !== 200) { await route.fulfill({ status: activityStatus, json: { errorMsg: "加载错误", errorCode: activityStatus === 403 ? "classroom.not_joined" : "system.internal", data: null } }); return; }
    data = { classroom: { id: "joined-class", name: "导入名单测试班", teacherName: "任课老师" }, quizzes: [] };
  } else if (path.endsWith("/auth/refresh")) data = { accessToken: "quiz-qa", sessionID: "quiz-qa" };
  else if (path.endsWith("/me")) data = { user };
  else if (path.endsWith("/capabilities")) data = { features: { knowledgeBases: true, classrooms: true } };
  else if (path.endsWith("/branding")) data = { title: "CourseMate", shortName: "CourseMate", logoURL: "", faviconURL: "/favicon.ico" };
  else if (path.endsWith("/version")) { await route.fulfill({ json: { version: "0.4.4-beta.3", buildID: "" } }); return; }
  else data = { total: 0, results: [], models: [], groups: [], conversations: [], knowledgeBases: [], settings: {} };
  await route.fulfill({ json: { errorMsg: "", data } });
});
const page = await context.newPage(); page.setDefaultTimeout(20000); page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(`${base}/learn/quiz`);
  await page.locator("#quiz-chapter option").nth(3).waitFor({ state: "attached" });
  assert.equal(await page.locator("#quiz-chapter option").count(), 4);
  await page.getByRole("link", { name: "课程知识", exact: true }).waitFor();
  await page.locator("#quiz-chapter").selectOption("2");
  await page.getByRole("cell", { name: "同分快同学", exact: true }).waitFor();
  assert.deepEqual(await page.locator("tbody tr").evaluateAll((rows) => rows.map((r) => r.children[1].textContent)), ["最佳得分", "同分快同学", "答题测试我"]);
  await page.screenshot({ path: resolve(artifacts, "chapter-leaderboard-desktop.png") });
  await page.getByRole("button", { name: "开始挑战", exact: true }).click();
  assert.equal(await page.locator("#quiz-chapter").isDisabled(), true);
  const button = page.getByRole("button", { name: new RegExp(`^${String.fromCharCode(65 + correct.get(round.questionIds[0]))} `) });
  await button.click();
  await page.getByRole("button", { name: "重试原请求", exact: true }).waitFor();
  assert.equal(round.answers.length, 1);
  await page.getByRole("button", { name: "重试原请求", exact: true }).click();
  await page.getByRole("button", { name: "下一题", exact: true }).waitFor();
  assert.deepEqual(answerRequests[0], answerRequests[1]);
  assert.equal(round.answers.length, 1);
  for (let i = 1; i < 10; i++) {
    await page.getByRole("button", { name: "下一题", exact: true }).click();
    const id = round.questionIds[i];
    await page.getByText(messages.quiz.questions[id].prompt, { exact: true }).waitFor();
    await page.getByRole("button", { name: new RegExp(`^${String.fromCharCode(65 + correct.get(id))} `) }).click();
    await page.getByRole("button", { name: i === 9 ? "查看结果" : "下一题", exact: true }).waitFor();
  }
  await page.getByRole("button", { name: "查看结果", exact: true }).click();
  await page.getByRole("heading", { name: "本轮结束", exact: true }).waitFor();
  await page.getByText("4.25s", { exact: true }).waitFor();
  assert.equal(round.score, 190);
  assert.equal(new Set(round.questionIds).size, 10);
  await page.getByRole("button", { name: "返回说明", exact: true }).click();
  await page.locator("#quiz-chapter").selectOption("4");
  await page.getByRole("cell", { name: "同分快同学", exact: true }).waitFor();
  assert.ok(chapterRequests.includes("2") && chapterRequests.includes("4"));
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({ path: resolve(artifacts, "chapter-leaderboard-mobile.png") });
  await page.goto(`${base}/activities`);
  await page.getByRole("heading", { name: "课堂活动加载失败", exact: true }).waitFor();
  assert.equal(await page.getByText("还没有加入班级", { exact: true }).count(), 0);
  activityStatus = 200;
  await page.getByRole("button", { name: "刷新", exact: true }).click();
  await page.getByText("导入名单测试班", { exact: true }).waitFor();
  activityStatus = 403;
  await page.reload();
  await page.getByText("还没有加入班级", { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log("Chapter quiz UI passed: four chapters, scoped answers, retry dedupe, timed results, rankings, mobile and classroom error states.");
} catch (e) { await page.screenshot({ path: resolve(artifacts, "failure.png") }); throw e; }
finally { await browser.close(); if (!externalBase) await new Promise((done) => server.close(done)); }
