// Browser fixtures verify navigation, draft isolation and grade-record actions.
// Real scoring, permissions and immutable XLSX storage are covered by Go tests.
import assert from "node:assert/strict";
import { mkdir, readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, join, resolve, sep } from "node:path";

const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON);
const { chromium } = require("playwright-core");
const root = resolve("apps/web/out");
const artifacts = resolve(".cache/dashboard-smoke");
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
const before = new Date(Date.now() - 3600000).toISOString();
const after = new Date(Date.now() + 3600000).toISOString();
const classroom = { id: "class", name: "信号与系统 · 一班", teacherName: "任课老师", teacherId: "teacher", description: "", studentCount: 2, experiments: { L1: true, L2: false, L3: false }, createdAt: before };
const quiz = { id: "numeric", title: "卷积数值练习", phase: "in_class", status: "open", openedAt: before, closedAt: null, submitted: false, answers: [], fieldAnswers: {}, score: 0, questions: [
  { id: "number", prompt: "计算卷积结果", formula: "", options: [], fields: [{ id: "value", label: "结果", unit: "" }] },
  { id: "choice", prompt: "选择正确结论", formula: "", fields: [], options: ["正确选项", "另一选项"] },
] };
const homework = { id: "homework", title: "时域分析作业", status: "open", startsAt: before, deadline: after, questionCount: 2, total: 100, submission: null, questions: [
  { id: "blank", kind: "blank", prompt: "写出计算结果", points: 50, blankCount: 1, options: [] },
  { id: "option", kind: "choice", prompt: "选择结果", points: 50, blankCount: 1, options: ["A 项", "B 项"] },
] };
const attendance = { session: { id: "attendance", title: "今日课堂签到", startsAt: before, endsAt: after, open: true, lateAfterMinutes: 5, closedAt: null }, record: { status: "absent", checkedAt: null, corrections: [], studentId: "student-a" } };
const assignment = { id: "lab", courseId: "L1", active: true, open: true, startsAt: before, deadline: after };
const tasks = [{ id: "L1-1", attempts: [], checkpoints: [] }];
let studentID = "student-a";
let reviewFailure = false;
let fingerprint = "a".repeat(64);
const records = [];
const workbook = Buffer.from("PK-grade-snapshot-browser-fixture");
const errors = [];
let browser;

async function session(role, locale = "zh-CN") {
  const context = await browser.newContext({ locale, timezoneId: "Asia/Shanghai", colorScheme: "light", reducedMotion: "reduce", viewport: { width: 1360, height: 950 } });
  await context.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let data = {};
    if (path.endsWith("/auth/refresh")) data = { accessToken: `qa-${role}`, sessionID: `qa-${role}` };
    else if (path.endsWith("/me")) data = { user: { id: role === "teacher" ? 1 : 2, publicID: role === "teacher" ? "teacher" : studentID, username: role, displayName: role, role, status: "active", locale, timezone: "Asia/Shanghai", initialSecurityRequired: false, initialUsernameRequired: false, mustResetPassword: false, onboardingCompletedAt: now, appearancePreferences: "", profilePreferences: "", identityProviders: [], email: "", phone: "", passwordEnabled: true } };
    else if (path.endsWith("/capabilities")) data = { features: { classrooms: true, knowledgeBases: true } };
    else if (path.endsWith("/branding")) data = { title: "CourseMate", shortName: "CourseMate", description: "", logoURL: "", faviconURL: "/favicon.ico" };
    else if (path.endsWith("/version")) { await route.fulfill({ json: { version: "0.4.4-beta.3", buildID: "" } }); return; }
    else if (path.endsWith("/student/practice-assignments")) data = { items: [], serverTime: now };
    else if (path.endsWith("/student/quizzes")) data = { classroom, quizzes: [quiz] };
    else if (path.endsWith("/quizzes/numeric/submissions")) {
      const body = request.postDataJSON();
      assert.deepEqual(body, { answers: [-1, 0], fieldAnswers: { number: { value: "9/4" } } });
      Object.assign(quiz, body, { submitted: true, score: 2 });
      data = { submitted: true, score: 2, total: 2 };
    } else if (path.endsWith("/student/homeworks")) data = { classroom, serverTime: new Date().toISOString(), items: [homework, { ...homework, id: "scheduled", title: "下周作业", status: "scheduled", startsAt: after, questions: [], submission: null }] };
    else if (path.endsWith("/homeworks/homework/submissions")) {
      assert.deepEqual(request.postDataJSON().answers, [["2"], ["0"]]);
      homework.submission = { answers: [["2"], ["0"]], score: 100, submittedAt: now, results: [] };
      data = homework.submission;
    } else if (path.endsWith("/student/attendance")) data = { items: [attendance, { ...attendance, session: { ...attendance.session, id: "checked", title: "已完成签到" }, record: { ...attendance.record, checkedAt: now } }] };
    else if (path.endsWith("/student/performance")) data = { record: null };
    else if (path.endsWith("/student/ai-activity")) data = { report: null };
    else if (path.endsWith("/learning/lab-assessments")) data = { items: [assignment] };
    else if (path.endsWith("/learning/lab-assessments/lab")) data = { assignment, tasks };
    else if (path.endsWith("/learning/progress")) {
      if (reviewFailure) { await route.fulfill({ status: 503, json: { errorMsg: "复习服务暂时不可用", data: null } }); return; }
      data = { questions: [{ reviewDue: true }, { reviewDue: false }] };
    } else if (path.endsWith("/classrooms")) data = { classrooms: [classroom] };
    else if (path.endsWith("/performance/records")) data = { records: [] };
    else if (path.endsWith("/grade-preview")) {
      const options = request.postDataJSON();
      assert.equal(options.includeOngoing, false);
      data = { version: "grade-test", classroomId: "class", classroomName: classroom.name, fingerprint, generatedAt: now, weights: options.weights, performanceRecordId: "", aiStartDate: "", aiEndDate: "", students: [{ studentId: "student-a", username: "001234", name: "示例学生", components: [{ kind: "homeworks", score: 80 }, { kind: "labs", score: 90 }, { kind: "attendance", score: 100 }], final: 88 }] };
    } else if (path.endsWith("/grade-records")) {
      if (request.method() === "POST") {
        const body = request.postDataJSON();
        if (body.fingerprint !== fingerprint) { await route.fulfill({ status: 409, json: { errorCode: "exports.stale_preview", errorMsg: "changed", data: null } }); return; }
        const report = { version: "grade-test", classroomId: "class", classroomName: classroom.name, generatedAt: now, fingerprint, weights: body.options.weights, students: [{ studentId: "student-a", username: "001234", name: "示例学生", components: [{ kind: "homeworks", score: 80 }, { kind: "labs", score: 90 }, { kind: "attendance", score: 100 }], final: 88 }] };
        data = { id: "record", title: body.title, createdAt: now, report };
        records.push(data);
      } else data = { records: records.map(({ report, ...info }) => info) };
    } else if (path.endsWith("/grade-records/record/export")) { await route.fulfill({ contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", body: workbook }); return; }
    else if (path.endsWith("/grade-records/record")) data = records[0];
    else data = { total: 0, results: [], models: [], groups: [], conversations: [], knowledgeBases: [], settings: {} };
    await route.fulfill({ json: { errorMsg: "", data } });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => errors.push(error.message));
  return page;
}

async function screenshot(page, name) {
  await page.evaluate(() => document.fonts.ready);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${name}: page overflow`);
  await page.screenshot({ path: join(artifacts, `${name}.png`), animations: "disabled" });
}
const draftKeys = (page) => page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("coursemate.answers.v1:")));

try {
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const student = await session("student");
  await student.goto(`${base}/dashboard`);
  await student.getByRole("heading", { name: "我的学习", exact: true }).waitFor();
  await student.getByRole("link", { name: /1 道错题到期复习/ }).waitFor();
  await student.getByText("正在同步任务", { exact: true }).waitFor({ state: "hidden" });
  assert.equal(await student.locator("main ol > li").count(), 6);
  assert.equal(await student.getByRole("link", { name: /实验1 · 正式验收/ }).getAttribute("href"), "/learn/experiments/assessment#L1-1");
  assert.equal(await student.getByRole("link", { name: /今日课堂签到/ }).getAttribute("href"), "/activities#attendance-attendance");
  await screenshot(student, "dashboard-desktop-light");
  await student.emulateMedia({ colorScheme: "dark" });
  await screenshot(student, "dashboard-desktop-dark");
  await student.setViewportSize({ width: 390, height: 844 });
  await screenshot(student, "dashboard-mobile-dark");
  await student.emulateMedia({ colorScheme: "light" });
  await screenshot(student, "dashboard-mobile-light");
  reviewFailure = true;
  await student.getByRole("button", { name: "刷新", exact: true }).click();
  await student.getByRole("alert").filter({ hasText: "复习服务暂时不可用" }).waitFor();
  await student.getByText("正在同步任务", { exact: true }).waitFor({ state: "hidden" });
  assert.equal(await student.locator("main ol > li").count(), 5, "partial error hid successful tasks");
  reviewFailure = false;
  await student.getByRole("link", { name: /时域分析作业/ }).click();
  const answer = student.locator("main").getByRole("textbox").first();
  await answer.fill("2");
  await student.locator('main input[type=radio]').first().check();
  await student.reload();
  await answer.waitFor();
  assert.equal(await answer.inputValue(), "2");
  assert.equal(await student.locator('main input[type=radio]').first().isChecked(), true);
  studentID = "student-b";
  await student.reload();
  await answer.waitFor();
  assert.equal(await answer.inputValue(), "", "another account received the draft");
  studentID = "student-a";
  await student.reload();
  await answer.waitFor();
  assert.equal(await answer.inputValue(), "2");
  await student.goto(`${base}/dashboard`);
  await student.getByRole("link", { name: /卷积数值练习/ }).click();
  const quizCard = student.locator("#quiz-numeric");
  await quizCard.getByRole("textbox", { name: "1. 结果" }).fill("9/4");
  await quizCard.getByRole("button", { name: "A 正确选项", exact: true }).click();
  await student.reload();
  await quizCard.getByRole("textbox", { name: "1. 结果" }).waitFor();
  assert.equal(await quizCard.getByRole("textbox", { name: "1. 结果" }).inputValue(), "9/4");
  assert.equal((await draftKeys(student)).length, 2);
  await quizCard.getByRole("button", { name: "提交答案", exact: true }).click();
  await quizCard.getByText("已提交", { exact: true }).waitFor();
  assert.equal((await draftKeys(student)).length, 1, "quiz submission did not clear its draft");
  await student.goto(`${base}/homeworks#homework`);
  await answer.waitFor();
  assert.equal(await answer.inputValue(), "2", "draft lost after navigation");
  const ownKey = (await draftKeys(student))[0];
  const ownDraft = await student.evaluate((key) => localStorage.getItem(key), ownKey);
  await student.evaluate(({ key, value }) => {
    const prefix = "coursemate.answers.v1:";
    const scope = JSON.parse(key.slice(prefix.length));
    scope[0] = "https://another-server.example";
    localStorage.setItem(prefix + JSON.stringify(scope), value);
    localStorage.removeItem(key);
  }, { key: ownKey, value: ownDraft });
  await student.reload();
  await answer.waitFor();
  assert.equal(await answer.inputValue(), "", "another server's draft was restored");
  await student.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: ownKey, value: ownDraft });
  await student.reload();
  await answer.waitFor();
  await student.getByRole("button", { name: "提交作业", exact: true }).click();
  await student.getByRole("dialog").getByRole("button", { name: "提交作业", exact: true }).click();
  await student.waitForFunction((key) => localStorage.getItem(key) === null, ownKey);
  await student.goto(`${base}/dashboard`);
  await student.getByRole("link", { name: /1 道错题到期复习/ }).waitFor();
  await student.getByText("正在同步任务", { exact: true }).waitFor({ state: "hidden" });
  assert.equal(await student.locator("main ol > li").count(), 4);

  const teacher = await session("teacher");
  await teacher.goto(`${base}/dashboard`);
  await teacher.waitForURL("**/classrooms");
  await teacher.goto(`${base}/exports`);
  await teacher.getByRole("button", { name: "预览并定稿", exact: true }).click();
  const dialog = teacher.getByRole("dialog");
  await dialog.getByRole("cell", { name: "88", exact: true }).waitFor();
  await screenshot(teacher, "grade-preview-desktop-light");
  await teacher.setViewportSize({ width: 390, height: 844 });
  await teacher.emulateMedia({ colorScheme: "dark" });
  await screenshot(teacher, "grade-preview-mobile-dark");
  await dialog.getByRole("textbox", { name: "定稿名称" }).fill("期末综合成绩");
  fingerprint = "b".repeat(64);
  await dialog.getByRole("button", { name: "确认定稿", exact: true }).click();
  await dialog.getByRole("alert").waitFor();
  assert.equal(records.length, 0, "stale preview was finalized");
  await dialog.getByRole("button", { name: "刷新预览", exact: true }).click();
  await teacher.waitForFunction(() => document.querySelector('[role="dialog"] input')?.value === "");
  await dialog.getByRole("textbox", { name: "定稿名称" }).fill("期末综合成绩");
  await dialog.getByRole("button", { name: "确认定稿", exact: true }).click();
  await teacher.getByText("综合成绩已定稿", { exact: true }).waitFor();
  await teacher.getByRole("button", { name: "期末综合成绩", exact: true }).click();
  await dialog.getByRole("cell", { name: "88", exact: true }).waitFor();
  const downloading = teacher.waitForEvent("download");
  await dialog.getByRole("button", { name: "下载定稿", exact: true }).click();
  const download = await downloading;
  assert.equal(download.suggestedFilename(), "期末综合成绩.xlsx");
  assert.deepEqual(await readFile(await download.path()), workbook);
  await dialog.getByRole("button", { name: "关闭", exact: true }).click();
  await teacher.reload();
  await teacher.getByRole("button", { name: "期末综合成绩", exact: true }).waitFor();
  const english = await session("student", "en-US");
  await english.goto(`${base}/dashboard`);
  await english.getByRole("heading", { name: "My learning", exact: true }).waitFor();
  await screenshot(english, "dashboard-english");
  assert.deepEqual(errors, []);
  console.log("Dashboard, draft restoration/isolation/submission and grade records smoke passed.");
} catch (error) {
  for (const [i, context] of (browser?.contexts() ?? []).entries()) {
    for (const page of context.pages()) await page.screenshot({ path: join(artifacts, `failure-${i}.png`) }).catch(() => {});
  }
  console.error(errors);
  throw error;
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
