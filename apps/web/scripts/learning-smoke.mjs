// Run against the static build in CI. API fixtures isolate UI behavior; Go tests
// cover real grading, scheduling, authentication and persistence separately.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile, stat, mkdir } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";

const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON);
const { chromium } = require("playwright");
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
const source = await readFile("backend/internal/domain/learning/types.go", "utf8");
const catalog = [...source.matchAll(/ID: "([^"]+)", Answer: (\d), Topic: "([^"]+)", Lesson: "([^"]+)"/g)].map((m) => ({ id: m[1], answer: Number(m[2]), topic: m[3], lesson: m[4] }));
assert.equal(catalog.length, 12);
const now = new Date().toISOString();
const wrong = { id: "c5dadce1-ce3e-42fd-95ae-c70461b32f46", questionId: "energy-signal", answer: 0, selected: 1, correct: false, mode: "quiz", variantId: "", reviewStage: 0, nextReviewAt: new Date(Date.now() - 86400000).toISOString(), createdAt: now };
const user = { id: 101, publicID: "qa-student", username: "student101", displayName: "学习测试", role: "user", status: "active", locale: "zh-CN", timezone: "Asia/Shanghai", initialSecurityRequired: false, initialUsernameRequired: false, mustResetPassword: false, onboardingCompletedAt: now, appearancePreferences: "", profilePreferences: "", identityProviders: [], email: "", phone: "", passwordEnabled: true };
let savedReview = null;
let failReviewResponse = true;
const reviewRequests = [];
const course = JSON.parse(await readFile("backend/internal/domain/learning/content/course.json", "utf8"));
const lessonAttempts = new Map();
const lessonRequests = [];
let failLessonResponse = true;
function summary(lesson) {
  const attempts = [...lessonAttempts.values()].filter((attempt) => attempt.lessonId === lesson.id);
  return { id: lesson.id, number: lesson.number, title: lesson.title, chapter: lesson.chapter, completedStages: attempts.length, masteredStages: attempts.filter((attempt) => attempt.score === attempt.total).length };
}
const tutorRequests = [];
const errors = [];
let browser;
let page;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "zh-CN", timezoneId: "Asia/Shanghai", viewport: { width: 1360, height: 950 } });
  await context.route("**/api/v1/**", async (route) => {
    const request = route.request(), url = new URL(request.url());
    let data = {};
    if (url.pathname.endsWith("/learning/course")) {
      data = { id: course.id, version: course.version, title: course.title, language: course.language, sourceName: course.sourceName, lessons: course.lessons.map(summary) };
    } else if (url.pathname.includes("/learning/lessons/")) {
      const lesson = course.lessons.find((item) => item.id === url.pathname.split("/").at(-1));
      assert.ok(lesson);
      data = { version: course.version, lesson: summary(lesson), markdown: lesson.markdown, questions: lesson.questions.map(({ id, stage, prompt, options, formula, fields }) => ({ id, stage, prompt, options, formula, fields: fields.map(({ id, label, unit }) => ({ id, label, unit })) })), attempts: [...lessonAttempts.values()].filter((item) => item.lessonId === lesson.id) };
    } else if (url.pathname.endsWith("/learning/lesson-attempts")) {
      const body = request.postDataJSON(); lessonRequests.push(body);
      const q = course.lessons.find((item) => item.id === body.lessonId).questions.find((item) => item.id === body.questionId);
      const results = q.options.length ? [{ id: "choice", correct: Number(body.answers.choice) === q.answer, expected: q.options[q.answer] }] : q.fields.map((field) => {
        const parts = body.answers[field.id].split("/").map(Number);
        return { id: field.id, correct: Math.abs(parts[0] / (parts[1] ?? 1) - field.expected) < 1e-6, expected: String(field.expected) };
      });
      let saved = lessonAttempts.get(body.questionId);
      if (!saved || saved.id !== body.id) {
        saved = { ...body, stage: q.stage, score: results.filter((item) => item.correct).length, total: results.length, results, explanation: q.explanation, createdAt: now };
        lessonAttempts.set(body.questionId, saved);
      }
      if (failLessonResponse) { failLessonResponse = false; await route.abort("connectionfailed"); return; }
      data = saved;
    } else if (url.pathname.endsWith("/learning/progress")) {
      data = { accountId: user.id, questions: catalog.map((q) => ({ ...q, attempts: q.id === "energy-signal" ? (savedReview ? 2 : 1) : 0, correctCount: q.id === "energy-signal" && savedReview ? 1 : 0, latest: q.id === "energy-signal" ? savedReview ?? wrong : null, latestWrong: q.id === "energy-signal" ? wrong : null, misconception: q.id === "energy-signal" ? "energy-signal-power" : "", suggestedVariantId: q.id === "energy-signal" ? "energy-signal-v1" : "", reviewStage: savedReview && q.id === "energy-signal" ? 1 : 0, nextReviewAt: q.id === "energy-signal" ? (savedReview ?? wrong).nextReviewAt : null, reviewDue: q.id === "energy-signal" && !savedReview })), recent: savedReview ? [savedReview, wrong] : [wrong] };
    } else if (url.pathname.includes("/learning/variants/")) {
      data = { id: "energy-signal-v1", baseQuestionId: "energy-signal", prompt: "x(t)=2e^(−t)u(t) 的总能量是多少？", options: ["2", "4", "∞", "0"], lesson: "/learn/experiments/signal-basics" };
    } else if (url.pathname.endsWith("/learning/reviews")) {
      const body = request.postDataJSON(); reviewRequests.push(body);
      savedReview ??= { ...wrong, id: body.id, mode: "review", variantId: body.variantId, selected: body.selected, correct: true, reviewStage: 1, nextReviewAt: new Date(Date.now() + 3 * 86400000).toISOString() };
      if (failReviewResponse) { failReviewResponse = false; await route.abort("connectionfailed"); return; }
      data = { attempt: savedReview, explanation: "E=∫₀∞4e^(−2t)dt=2。" };
    } else if (url.pathname.endsWith("/learning/tutor")) {
      const body = request.postDataJSON(); tutorRequests.push(body);
      assert.ok(!Object.hasOwn(body.parameters, "answerId"));
      data = { source: body.action === "hint" ? "curated" : "model", summary: body.action === "hint" ? "先写出需要比较的数学关系。" : "将你的判断与公式逐步核对。", steps: ["识别参数。", "代入关系并检查单位。"], citations: [{ id: "first-order", chapter: "第二章", section: "一阶系统与时间常数", href: "/learn/first-order" }] };
    } else if (url.pathname.endsWith("/auth/refresh")) data = { accessToken: "qa-session", sessionID: "qa-session" };
    else if (url.pathname.endsWith("/me")) data = { user };
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

  for (const experiment of ["signal-basics", "time-domain", "frequency-domain", "s-domain"]) {
    await page.goto(`${base}/learn/experiments/${experiment}`);
    await page.getByRole("button", { name: "给我一个提示", exact: true }).click();
    await page.getByText("课程精选", { exact: true }).waitFor();
    assert.equal(tutorRequests.at(-1).action, "hint");
    await page.getByRole("button", { name: "换一题", exact: true }).click();
    await page.getByText("课程精选", { exact: true }).waitFor({ state: "detached" });
    await noOverflow();
  }
  await page.goto(`${base}/learn/experiments/time-domain`);
  await page.getByRole("group", { name: "选择一个答案" }).getByRole("button").first().click();
  await page.locator("#prediction-reason").fill("我先比较时间与时间常数的比值，再代入指数响应公式检查结果是否合理。");
  await page.getByRole("button", { name: "提交并解锁图形", exact: true }).click();
  await page.getByRole("button", { name: "解释我的判断", exact: true }).click();
  await page.getByText("AI 解释", { exact: true }).waitFor();
  assert.equal(tutorRequests.at(-1).action, "explain");
  await screenshot("tutor-mobile");

  await page.goto(`${base}/learn/progress`);
  await page.getByText("误区诊断", { exact: true }).waitFor();
  await page.locator("#review-filter").selectOption("due");
  await page.getByRole("button", { name: "变式复习", exact: true }).click();
  await page.getByRole("radio", { name: "A. 2", exact: true }).check();
  await page.getByRole("button", { name: "提交答案", exact: true }).click();
  await page.getByRole("button", { name: "重试原提交", exact: true }).waitFor();
  assert.equal(await page.getByRole("radio", { name: "B. 4", exact: true }).isDisabled(), true);
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
  await page.getByText("变式 energy-signal-v1 · 所选选项 A", { exact: true }).waitFor();
  await page.getByRole("button", { name: "变式复习", exact: true }).click();
  await page.getByRole("heading", { name: "x(t)=2e^(−t)u(t) 的总能量是多少？", exact: true }).waitFor();

  await page.goto(`${base}/learn/knowledge?lesson=ss-1-1`);
  await page.getByRole("heading", { name: "1.1 信号的分类与基本量", exact: true }).waitFor();
  for (const stage of ["课前预习", "课中练习", "课后巩固"]) await page.getByRole("heading", { name: stage, exact: true }).waitFor();
  const inClass = page.getByRole("region", { name: "课中练习", exact: true });
  await inClass.getByRole("textbox", { name: "能量 E", exact: true }).fill("9/4");
  await inClass.getByText("公式预览：", { exact: false }).waitFor();
  await inClass.getByRole("button", { name: "提交答案", exact: true }).click();
  await inClass.getByRole("button", { name: "重试原提交", exact: true }).waitFor();
  assert.equal(await inClass.getByRole("textbox").isDisabled(), true);
  await inClass.getByRole("button", { name: "重试原提交", exact: true }).click();
  await inClass.getByText("本次得分 1/1", { exact: true }).waitFor();
  assert.deepEqual(lessonRequests[0], lessonRequests[1], "lesson retry changed original payload");
  await page.reload();
  await inClass.getByText("本次得分 1/1", { exact: true }).waitFor();
  await screenshot("knowledge-desktop");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/learn/knowledge?lesson=ss-2-5`);
  await page.getByRole("heading", { name: "2.5 卷积积分", exact: true }).waitFor();
  for (const [label, value] of [["a", "1"], ["b", "1"], ["c", "3"], ["d", "1"]]) await inClass.getByRole("textbox", { name: label, exact: true }).fill(value);
  await inClass.getByRole("button", { name: "提交答案", exact: true }).click();
  await inClass.getByText("本次得分 3/4", { exact: true }).waitFor();
  await inClass.getByText("参考值：-1", { exact: true }).waitFor();
  await noOverflow();
  await inClass.scrollIntoViewIfNeeded(); await screenshot("knowledge-piecewise-mobile");
  await page.locator("#knowledge-search").fill("小波");
  assert.ok(await page.getByRole("navigation", { name: "小节目录" }).getByRole("link").count() > 0);
  await screenshot("knowledge-search-mobile");
  assert.deepEqual(errors, []);
  console.log("PASS: workbench desktop/mobile, four tutors and reset, explanation, diagnosis, due filter, immutable review retry, scheduling display, history mode labels");
} catch (error) {
  if (page) await page.screenshot({ path: join(artifacts, "failure.png") }).catch(() => {});
  throw error;
} finally {
  if (browser) await browser.close();
  await new Promise((done) => server.close(done));
}
