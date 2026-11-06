// Run against the static build in CI. API fixtures isolate UI behavior; Go tests
// cover real grading, scheduling, authentication and persistence separately.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile, stat, mkdir } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";

const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON);
const { chromium } = require("playwright-core");
const root = resolve("apps/web/out");
const artifacts = resolve(".cache/learning-p0-smoke");
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
const bank = JSON.parse(await readFile("backend/internal/domain/learning/content/quick-questions.json", "utf8"));
const catalog = bank.questions.map(({id,answer,topic,lesson}) => ({id,answer,topic,lesson}));
assert.equal(catalog.length, 240);
const reviewBase = bank.questions.find((q) => q.id === "ext-routh-stable-bound-1");
assert.ok(reviewBase);
const reviewVariant = reviewBase.variants[0];
const wrongOption = (reviewBase.answer+1)%4;
const choice = `${String.fromCharCode(65+reviewVariant.answer)}. ${reviewVariant.zh.options[reviewVariant.answer]}`;
const now = new Date().toISOString();
const wrong = { id: "c5dadce1-ce3e-42fd-95ae-c70461b32f46", questionId: reviewBase.id, answer: reviewBase.answer, selected: wrongOption, correct: false, mode: "quiz", variantId: "", reviewStage: 0, nextReviewAt: new Date(Date.now() - 86400000).toISOString(), createdAt: now };
const user = { id: 101, publicID: "qa-student", username: "student101", displayName: "学习测试", role: "teacher", status: "active", locale: "zh-CN", timezone: "Asia/Shanghai", initialSecurityRequired: false, initialUsernameRequired: false, mustResetPassword: false, onboardingCompletedAt: now, appearancePreferences: "", profilePreferences: "", identityProviders: [], email: "", phone: "", passwordEnabled: true };
let savedReview = null;
let failReviewResponse = true;
const reviewRequests = [];
const course = JSON.parse(await readFile("backend/internal/domain/learning/content/course.json", "utf8"));
const lessonRequests = [];
function summary(lesson) {
  return { id: lesson.id, number: lesson.number, title: lesson.title, chapter: lesson.chapter, completedStages: 0, masteredStages: 0 };
}
const tutorRequests = [];
const errors = [];
let browser;
let page;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const context = await browser.newContext({ locale: "zh-CN", timezoneId: "Asia/Shanghai", viewport: { width: 1360, height: 950 } });
  await context.route("**/api/v1/**", async (route) => {
    const request = route.request(), url = new URL(request.url());
    let data = {};
    if (url.pathname.endsWith("/learning/course")) {
      data = { canPractice: true, id: course.id, version: course.version, title: course.title, language: course.language, sourceName: course.sourceName, lessons: course.lessons.map(summary) };
    } else if (url.pathname.includes("/learning/lessons/")) {
      const lesson = course.lessons.find((item) => item.id === url.pathname.split("/").at(-1));
      assert.ok(lesson);
      data = { canPractice: true, version: course.version, lesson: summary(lesson), markdown: lesson.markdown, questions: lesson.questions.map(({ id, stage, prompt, options, formula, fields }) => ({ id, stage, prompt, options, formula, fields: fields.map(({ id, label, unit }) => ({ id, label, unit })) })), attempts: [] };
    } else if (url.pathname.endsWith("/learning/lesson-attempts")) {
      lessonRequests.push(request.postDataJSON());
      await route.fulfill({ status: 403, json: { errorMsg: "answer course questions through a teacher-published classroom quiz", errorCode: "learning.teacher_assigned" } }); return;
    } else if (url.pathname.endsWith("/learning/progress")) {
      data = { accountId: user.id, questions: catalog.map((q) => ({ ...q, attempts: q.id === reviewBase.id ? (savedReview ? 2 : 1) : 0, correctCount: q.id === reviewBase.id && savedReview ? 1 : 0, latest: q.id === reviewBase.id ? savedReview ?? wrong : null, latestWrong: q.id === reviewBase.id ? wrong : null, misconception: q.id === reviewBase.id ? reviewBase.misconceptions[wrongOption] : "", suggestedVariantId: q.id === reviewBase.id ? reviewVariant.id : "", reviewStage: savedReview && q.id === reviewBase.id ? 1 : 0, nextReviewAt: q.id === reviewBase.id ? (savedReview ?? wrong).nextReviewAt : null, reviewDue: q.id === reviewBase.id && !savedReview })), recent: savedReview ? [savedReview, wrong] : [wrong] };
    } else if (url.pathname.includes("/learning/variants/")) {
      data = { id: reviewVariant.id, baseQuestionId: reviewBase.id, prompt: reviewVariant.zh.prompt, options: reviewVariant.zh.options, lesson: reviewBase.lesson };
    } else if (url.pathname.endsWith("/learning/reviews")) {
      const body = request.postDataJSON(); reviewRequests.push(body);
      assert.equal(body.baseQuestionId,reviewBase.id); assert.equal(body.variantId,reviewVariant.id); assert.equal(body.selected,reviewVariant.answer);
      savedReview ??= { ...wrong, id: body.id, mode: "review", variantId: body.variantId, selected: body.selected, answer: reviewVariant.answer, correct: true, reviewStage: 1, nextReviewAt: new Date(Date.now() + 3 * 86400000).toISOString() };
      if (failReviewResponse) { failReviewResponse = false; await route.abort("connectionfailed"); return; }
      data = { attempt: savedReview, explanation: reviewVariant.zh.explanation };
    } else if (url.pathname.endsWith("/learning/tutor")) {
      const body = request.postDataJSON(); tutorRequests.push(body);
      assert.ok(!Object.hasOwn(body.parameters, "answerId"));
      data = { source: body.action === "hint" ? "curated" : "model", summary: body.action === "hint" ? "先写出需要比较的数学关系。" : "将你的判断与公式逐步核对。", steps: ["识别参数。", "代入关系并检查单位。"], citations: [{ id: "first-order", chapter: "第二章", section: "一阶系统与时间常数", href: "/learn/first-order" }] };
    } else if (url.pathname.endsWith("/auth/refresh")) data = { accessToken: "qa-session", sessionID: "qa-session" };
    else if (url.pathname.endsWith("/me")) data = { user };
    else if (url.pathname.endsWith("/user/settings")) data = { settings: {} };
    else if (url.pathname.endsWith("/capabilities")) data = { features: { knowledgeBases: true, classrooms: true } };
    else if (url.pathname.endsWith("/branding")) data = { title: "课知伴", shortName: "课知伴", description: "", logoURL: "", faviconURL: "/favicon.ico", pwaIcon192URL: "", pwaIcon512URL: "", pwaMaskableIcon512URL: "", appleTouchIcon180URL: "" };
    else if (url.pathname.endsWith("/version")) { await route.fulfill({ json: { version: "0.4.4-beta.3", buildID: "" } }); return; }
    else data = { total: 0, results: [], models: [], groups: [], conversations: [], knowledgeBases: [], settings: {} };
    await route.fulfill({ json: { errorMsg: "", data } });
  });
  page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on("pageerror", (error) => errors.push(error.message));
  async function screenshot(name) { await page.screenshot({ path: join(artifacts, `${name}.png`) }); }
  async function noOverflow() { assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "horizontal page overflow"); }

  await page.goto(`${base}/learn/workbench`);
  await page.getByRole("heading", { name: "自定义信号工作台", exact: true }).waitFor();
  await page.getByText("1281", { exact: true }).waitFor();
  await screenshot("workbench-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#signal-A-kind").selectOption("sine");
  await page.getByRole("button", { name: "A + B", exact: true }).click();
  await page.getByText("641", { exact: true }).waitFor();
  await noOverflow(); await screenshot("workbench-mobile");

  // Complete lab routes and account persistence are covered by learning-virtual-lab-smoke.mjs.
  await page.goto(`${base}/learn/progress`);
  await page.getByText("误区诊断", { exact: true }).waitFor();
  await page.locator("#review-filter").selectOption("due");
  await page.getByRole("button", { name: "变式复习", exact: true }).click();
  await page.getByRole("radio", { name: choice, exact: true }).check();
  await page.getByRole("button", { name: "提交答案", exact: true }).click();
  await page.getByRole("button", { name: "重试原提交", exact: true }).waitFor();
  assert.equal(await page.getByRole("radio").first().isDisabled(), true);
  await page.getByRole("button", { name: "重试原提交", exact: true }).click();
  await page.getByText("当前复习阶段：1/5", { exact: true }).waitFor();
  assert.equal(reviewRequests.length, 2);
  assert.deepEqual(reviewRequests[0], reviewRequests[1], "retry changed request UUID or answer");
  await noOverflow(); await screenshot("review-result-mobile");
  await page.getByRole("button", { name: "返回错题本", exact: true }).click();
  await page.getByText("当前筛选没有题目", { exact: true }).waitFor();
  await page.locator("#review-filter").selectOption("active");
  await page.getByText("复习阶段 1/5", { exact: true }).waitFor();
  await page.setViewportSize({ width: 1360, height: 950 });
  await screenshot("diagnosis-desktop");
  await page.getByRole("button", { name: "最近作答", exact: true }).click();
  await page.getByText(`变式 ${reviewVariant.id} · 所选选项 ${String.fromCharCode(65+reviewVariant.answer)}`, { exact: true }).waitFor();
  await page.getByRole("button", { name: "变式复习", exact: true }).click();
  await page.getByRole("heading", { name: reviewVariant.zh.prompt, exact: true }).waitFor();

  await page.goto(`${base}/learn/knowledge?lesson=ss-1-1`);
  await page.getByRole("heading", { name: "1.1 信号的分类与基本量", exact: true }).waitFor();
  await page.getByText("本节知识讲义", { exact: true }).waitFor();
  // Lesson exercises are published and submitted from classroom activities;
  // the knowledge page keeps the reading view and no longer renders answer forms.
  assert.equal(await page.getByRole("button", { name: "提交答案", exact: true }).count(), 0);
  await page.reload();
  await page.getByText("本节知识讲义", { exact: true }).waitFor();
  await screenshot("knowledge-desktop");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/learn/knowledge?lesson=ss-2-5`);
  await page.getByRole("heading", { name: "2.5 卷积积分", exact: true }).waitFor();
  await page.getByText("本节知识讲义", { exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "提交答案", exact: true }).count(), 0);
  await noOverflow();
  await page.locator("#lesson-reading").scrollIntoViewIfNeeded(); await screenshot("knowledge-reading-mobile");
  const catalogNavigation = page.getByRole("navigation", { name: "小节目录", exact: true });
  const searchLesson = course.lessons.find((lesson) => lesson.id === "ss-2-5");
  assert.ok(searchLesson, "search fixture lesson is missing from the course catalog");
  await page.locator("#knowledge-search").fill(searchLesson.title);
  await catalogNavigation.getByRole("link", { name: `${searchLesson.number} ${searchLesson.title}`, exact: false }).waitFor();
  assert.equal(await catalogNavigation.getByRole("link").count(), course.lessons.filter((lesson) => `${lesson.number} ${lesson.title} ${lesson.chapter}`.includes(searchLesson.title)).length);
  await page.locator("#knowledge-search").fill("不存在的小节-smoke");
  await catalogNavigation.getByText("没有匹配的小节", { exact: true }).waitFor();
  assert.equal(await catalogNavigation.getByRole("link").count(), 0);
  await page.locator("#knowledge-search").fill("");
  await catalogNavigation.getByRole("link").first().waitFor();
  assert.equal(await catalogNavigation.getByRole("link").count(), course.lessons.length);
  await screenshot("knowledge-search-mobile");
  assert.deepEqual(lessonRequests, [], "knowledge reading must not submit course exercises");
  assert.deepEqual(errors, []);
  console.log("PASS: workbench desktop/mobile, diagnosis, due filter, immutable review retry, scheduling display, history mode labels, knowledge reading and catalog search without exercise submission");
} catch (error) {
  if (page) await page.screenshot({ path: join(artifacts, "failure.png") }).catch(() => {});
  throw error;
} finally {
  if (browser) await browser.close();
  await new Promise((done) => server.close(done));
}
