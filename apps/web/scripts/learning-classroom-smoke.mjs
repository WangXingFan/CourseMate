// Static UI fixtures cover teacher assignment and student access. Go tests
// verify the same permissions and course question snapshots against the API.
import assert from "node:assert/strict";
import { mkdir, readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, join, resolve, sep } from "node:path";

const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON);
const { chromium } = require("playwright-core");
const root = resolve("apps/web/out");
const artifacts = resolve(".cache/classroom-preview-smoke");
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
const course = JSON.parse(await readFile("backend/internal/domain/learning/content/course.json", "utf8"));
const now = new Date().toISOString();
const classroom = { id: "class_one", name: "预习测验证班", description: "", teacherId: "teacher_one", teacherName: "任课老师", studentCount: 1, createdAt: now };
const lessons = course.lessons.map((lesson) => {
  const preview = lesson.questions.find((question) => question.stage === "preview");
  return { id: lesson.id, number: lesson.number, title: lesson.title, chapter: lesson.chapter, prompt: preview.prompt, options: preview.options };
});
assert.equal(lessons.length, 52);
assert.deepEqual(new Set(lessons.map((lesson) => lesson.chapter)), new Set([
  "第1章 信号与系统基本概念",
  "第2章 连续系统时域分析",
  "第3章 连续系统频域分析",
  "第4章 连续系统s域分析",
  "附录A 公式与变换对总表",
  "附录B 解题方法与易错点",
]));
const summary = (lesson) => ({ id: lesson.id, number: lesson.number, title: lesson.title, chapter: lesson.chapter, completedStages: 0, masteredStages: 0 });
let quiz;
let createBody;
let submitted = false;
let selectedAnswers = [];
let directSubmissions = 0;
let lessonLoadFailures = 1;
let browser;
const pages = [];
const errors = [];

async function session(role, width) {
  const context = await browser.newContext({ locale: "zh-CN", timezoneId: "Asia/Shanghai", reducedMotion: "reduce", viewport: { width, height: 950 } });
  const user = { id: role === "teacher" ? 101 : 102, publicID: `qa-${role}`, username: role, displayName: role, role, status: "active", locale: "zh-CN", timezone: "Asia/Shanghai", initialSecurityRequired: false, initialUsernameRequired: false, mustResetPassword: false, onboardingCompletedAt: now, appearancePreferences: "", profilePreferences: "", identityProviders: [], email: "", phone: "", passwordEnabled: true };
  await context.route("**/api/v1/**", async (route) => {
    const request = route.request(), path = new URL(request.url()).pathname;
    let data = {};
    if (path.endsWith("/classrooms")) data = { classrooms: [classroom] };
    else if (path.endsWith("/students")) data = { students: [{ id: "student_one", username: "student", displayName: "student" }] };
    else if (path.endsWith("/quiz-lessons")) {
      if (lessonLoadFailures-- > 0) { await route.fulfill({ status: 503, json: { errorMsg: "暂时不可用", data: null } }); return; }
      data = { lessons };
    } else if (path.endsWith("/class_one/quizzes")) {
      if (request.method() === "POST") {
        createBody = request.postDataJSON();
        assert.deepEqual(Object.keys(createBody).sort(), ["lessonIds", "title"]);
        quiz = { id: "quiz_one", title: createBody.title, phase: "pre_class", status: "draft", questions: createBody.lessonIds.map((id) => { const q = course.lessons.find((lesson) => lesson.id === id).questions.find((question) => question.stage === "preview"); return { id: q.id, prompt: q.prompt, options: q.options, answer: q.answer }; }), submissionCount: 0, createdAt: now, openedAt: null, closedAt: null };
        data = { quiz };
      } else data = { quizzes: quiz ? [quiz] : [] };
    } else if (path.endsWith("/quizzes/quiz_one/open")) { quiz.status = "open"; quiz.openedAt = now; data = { updated: true }; }
    else if (path.endsWith("/quizzes/quiz_one/close")) { quiz.status = "closed"; data = { updated: true }; }
    else if (path.endsWith("/student/quizzes")) data = { classroom, quizzes: quiz && quiz.status !== "draft" ? [{ ...quiz, questions: quiz.questions.map(({ id, prompt, options }) => ({ id, prompt, options })), submitted, score: submitted ? quiz.questions.length : 0, answers: selectedAnswers }] : [] };
    else if (path.endsWith("/quizzes/quiz_one/submissions") && request.method() === "POST") {
      assert.equal(quiz.status, "open");
      selectedAnswers = request.postDataJSON().answers;
      assert.deepEqual(selectedAnswers, quiz.questions.map((question) => question.answer));
      submitted = true; quiz.submissionCount = 1;
      data = { score: quiz.questions.length, total: quiz.questions.length, submitted: true };
    } else if (path.endsWith("/learning/course")) data = { canPractice: role === "teacher", id: course.id, version: course.version, title: course.title, language: course.language, sourceName: course.sourceName, lessons: course.lessons.map(summary) };
    else if (path.includes("/learning/lessons/")) {
      const lesson = course.lessons.find((item) => item.id === path.split("/").at(-1));
      data = { canPractice: false, version: course.version, lesson: summary(lesson), markdown: lesson.markdown, questions: [], attempts: [] };
    } else if (path.endsWith("/learning/lesson-attempts")) { directSubmissions++; await route.fulfill({ status: 403, json: { errorMsg: "请在老师发布的课堂活动中作答。", data: null } }); return; }
    else if (path.endsWith("/auth/refresh")) data = { accessToken: `qa-${role}`, sessionID: `qa-${role}` };
    else if (path.endsWith("/me")) data = { user };
    else if (path.endsWith("/capabilities")) data = { features: { classrooms: true, knowledgeBases: true } };
    else if (path.endsWith("/branding")) data = { title: "CourseMate", shortName: "CourseMate", description: "", logoURL: "", faviconURL: "/favicon.ico" };
    else if (path.endsWith("/version")) { await route.fulfill({ json: { version: "0.4.4-beta.3", buildID: "" } }); return; }
    else data = { total: 0, results: [], models: [], groups: [], conversations: [], knowledgeBases: [], settings: {} };
    await route.fulfill({ json: { errorMsg: "", data } });
  });
  const page = await context.newPage();
  pages.push(page);
  page.setDefaultTimeout(20000);
  page.on("pageerror", (error) => errors.push(error.message));
  return page;
}

try {
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const teacher = await session("teacher", 1360);
  const student = await session("student", 390);
  await teacher.goto(`${base}/classrooms`);
  await teacher.getByRole("button", { name: "课堂活动", exact: true }).click();
  await teacher.getByRole("button", { name: "新建预习测", exact: true }).first().click();
  const dialog = teacher.getByRole("dialog");
  await dialog.getByText("课程预习题加载失败", { exact: true }).waitFor();
  await dialog.getByRole("button", { name: "刷新", exact: true }).click();
  await dialog.getByRole("checkbox").first().waitFor();
  assert.equal(await dialog.getByRole("textbox").count(), 2, "manual question editing remains");
  await dialog.getByRole("textbox", { name: "预习测名称", exact: true }).fill("卷积课前预习");
  assert.equal(await dialog.getByRole("button", { name: "保存草稿", exact: true }).isDisabled(), true);
  for (const checkbox of (await dialog.getByRole("checkbox").all()).slice(0, 10)) await checkbox.check();
  assert.equal(await dialog.getByRole("checkbox").nth(10).isDisabled(), true);
  for (const checkbox of (await dialog.getByRole("checkbox").all()).slice(0, 10)) await checkbox.uncheck();
  await dialog.getByRole("textbox", { name: "搜索小节编号、标题或章节", exact: true }).fill("4.1 拉普拉斯变换的定义与收敛域");
  assert.equal(await dialog.getByRole("checkbox").count(), 1);
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("checkbox").uncheck();
  await dialog.getByRole("textbox", { name: "搜索小节编号、标题或章节", exact: true }).fill("2.5 卷积积分");
  await dialog.getByRole("checkbox").check();
  await teacher.waitForFunction(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const footer = dialog?.querySelector('[data-slot="dialog-footer"]');
    return footer && footer.getBoundingClientRect().bottom <= dialog.getBoundingClientRect().bottom;
  });
  await teacher.screenshot({ path: join(artifacts, "teacher-lesson-selection.png") });
  await teacher.setViewportSize({ width: 390, height: 844 });
  assert.ok(await teacher.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "teacher mobile overflow");
  await teacher.screenshot({ path: join(artifacts, "teacher-lesson-selection-mobile.png"), animations: "disabled" });
  await teacher.setViewportSize({ width: 1360, height: 950 });
  await dialog.getByRole("button", { name: "保存草稿", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  assert.deepEqual(createBody, { title: "卷积课前预习", lessonIds: ["ss-2-5"] });
  await student.goto(`${base}/learn/knowledge?lesson=ss-2-5`);
  await student.getByRole("heading", { name: "预习题由老师下发", exact: true }).waitFor();
  assert.deepEqual(await student.locator("#knowledge-chapter option").allTextContents(), [
    "选择章节",
    "第1章 信号与系统基本概念",
    "第2章 连续系统时域分析",
    "第3章 连续系统频域分析",
    "第4章 连续系统s域分析",
    "附录A 公式与变换对总表",
    "附录B 解题方法与易错点",
  ]);
  assert.equal(await student.getByRole("radio").count(), 0);
  assert.equal(await student.getByRole("button", { name: "提交答案", exact: true }).count(), 0);
  assert.ok(await student.getByText("本节知识讲义", { exact: true }).isVisible());
  await student.screenshot({ path: join(artifacts, "student-notes-mobile.png") });
  await student.locator("#knowledge-chapter").selectOption("第4章 连续系统s域分析");
  assert.equal(await student.locator("aside nav a").count(), 10);
  await student.locator("aside nav").getByRole("link", { name: "4.1 拉普拉斯变换的定义与收敛域", exact: true }).click();
  await student.getByRole("heading", { name: "4.1 拉普拉斯变换的定义与收敛域", exact: true }).waitFor();
  assert.equal(new URL(student.url()).searchParams.get("lesson"), "ss-5-1");
  await student.screenshot({ path: join(artifacts, "student-renumbered-s-domain-mobile.png") });
  await student.getByRole("link", { name: "查看课堂活动", exact: true }).click();
  await student.getByText("暂时没有已发布的小测", { exact: true }).waitFor();
  await teacher.getByRole("button", { name: "发布", exact: true }).click();
  await teacher.getByText("小测已发布", { exact: true }).waitFor();
  await student.getByRole("button", { name: "刷新", exact: true }).click();
  await student.getByRole("heading", { name: "卷积课前预习", exact: true }).waitFor();
  const article = student.locator("article");
  await article.getByRole("button").nth(quiz.questions[0].answer).click();
  await article.getByRole("button", { name: "提交答案", exact: true }).click();
  await student.getByText("得分 1/1", { exact: true }).waitFor();
  assert.ok(await article.getByRole("button").first().isDisabled());
  assert.ok(await student.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "mobile overflow");
  await student.screenshot({ path: join(artifacts, "student-published-answer-mobile.png") });
  await teacher.getByRole("button", { name: "截止", exact: true }).click();
  await student.getByRole("button", { name: "刷新", exact: true }).click();
  await student.getByText("已截止", { exact: true }).waitFor();
  assert.equal(directSubmissions, 0);
  assert.deepEqual(errors, []);
  console.log("PASS: teacher course selection, renumbered chapter and stable links, load retry, selection limit, draft hiding, publish, student notes only, mobile answer and close");
} catch (error) {
  for (const [index, page] of pages.entries()) await page.screenshot({ path: join(artifacts, `failure-${index}.png`) }).catch(() => {});
  throw error;
} finally {
  if (browser) await browser.close();
  await new Promise((done) => server.close(done));
}
