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
const assignment = { pendingTaskId: "L1-1", inProgress: false, id: "lab", courseId: "L1", active: true, open: true, startsAt: before, deadline: after };
const tasks = [{ id: "L1-1", attempts: [], checkpoints: [] }];
const targetClass = {...classroom,id:"class-target",name:"信号与系统 · 二班"};
const roster = [{id:"student-a",username:"001",displayName:"示例学生",joinedAt:before}];
const consolidation = {id:"consolidation",title:"信号分类 · 巩固练习",purpose:"remediation",targetCount:1,phase:"after_class",status:"draft",sourceQuizId:"",submissionCount:0,createdAt:now,openedAt:null,closedAt:null,questions:[{id:"concept-q",prompt:"选择正确的信号分类",options:["周期","非周期"],answer:0,fields:[],formula:"",explanation:"按是否重复分类",conceptId:"lesson:ss-1-1",conceptTitle:"信号分类",lessonId:"ss-1-1"}]};
let remediationCreated=false,copyCreated=false;
let studentID = "student-a";
let reviewFailure = false;
let fingerprint = "a".repeat(64);
const records = [];
const workbook = Buffer.from("PK-grade-snapshot-browser-fixture");
const homeworkZip = Buffer.from("PK-homework-papers-browser-fixture");
const homeworkExports = [];
let homeworkLoadFailure = false;
const archiveProfile = { academicTerm: "2025–2026 学年第二学期", courseCode: "CS3017", courseName: "信号与系统", teacherName: "示例教师", college: "电子信息学院", teachingLocation: "A201" };
const exportProfiles = new Map([
  ["class", process.env.EXPORT_PROFILE_ONLY ? { ...archiveProfile, academicTerm: "", courseCode: "", college: "", teachingLocation: "" } : { ...archiveProfile }],
  ["class-target", { ...archiveProfile, teacherName: "二班教师", teachingLocation: "B302" }],
]);
let profileSaveFailure = false;
let profileLoadFailure = false;
let excelExports = 0;
const exportedHomeworks = [
  { ...homework, id: "paper-1", title: "作业一", submissionCount: 1 },
  { ...homework, id: "paper-2", title: "作业一", startsAt: new Date(Date.now() - 7200000).toISOString(), status: "closed", submissionCount: 2 },
  { ...homework, id: "scheduled-paper", status: "scheduled" },
  { ...homework, id: "withdrawn-paper", status: "withdrawn" },
];
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
    else if (path.endsWith("/learning/corrections")) data = { items: [] };
    else if (path.endsWith("/learning/mastery")) data = { concepts: [], counts: {}, weeks: [] };
    else if (path.endsWith("/learning/progress")) {
      if (reviewFailure) { await route.fulfill({ status: 503, json: { errorMsg: "复习服务暂时不可用", data: null } }); return; }
      data = { questions: [{ reviewDue: true }, { reviewDue: false }] };
    } else if (path.endsWith("/classrooms")) data = { classrooms: [classroom,targetClass] };
    else if (path.endsWith("/classrooms/class/students")) data = {students:roster};
    else if (path.endsWith("/classrooms/class/homeworks")) {
      if (homeworkLoadFailure) { await route.fulfill({ status: 503, json: { errorMsg: "作业列表暂时不可用", data: null } }); return; }
      data = { items: exportedHomeworks, serverTime: now };
    } else if (path.endsWith("/classrooms/class-target/homeworks")) data = { items: [], serverTime: now };
    else if (path.endsWith("/export-profile")) {
      const id = path.split("/").at(-2);
      if (request.method() === "PUT") {
        if (profileSaveFailure) { await route.fulfill({ status: 503, json: { errorMsg: "表头信息保存失败", data: null } }); return; }
        exportProfiles.set(id, Object.fromEntries(Object.entries(request.postDataJSON()).map(([key, value]) => [key, value.trim()])));
      } else if (profileLoadFailure) { await route.fulfill({ status: 503, json: { errorMsg: "表头信息加载失败", data: null } }); return; }
      data = exportProfiles.get(id);
    } else if (path.endsWith("/classrooms/class/exports")) {
      const options = request.postDataJSON();
      if (options.kind === "homework_reports") {
        homeworkExports.push(options);
        await route.fulfill({ contentType: "application/zip", body: homeworkZip });
      } else {
        excelExports++;
        await route.fulfill({ contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", body: workbook });
      }
      return;
    }
    else if (path.endsWith("/classrooms/class-target/students")) data = {students:[{...roster[0],id:"target-student"}]};
    else if (path.endsWith("/classrooms/class/mastery")) data = {classroomId:"class",concepts:[{concept:{id:"lesson:ss-1-1",title:"信号分类",kind:"lesson",topic:"",chapter:"",evidence:[],status:"weak"},assessed:1,weak:1,secure:0,developing:0}],students:[{id:"student-a",name:"示例学生",username:"001",weakConceptIds:["lesson:ss-1-1"],counts:{assessed:1,weak:1,secure:0,developing:0,unassessed:0}}]};
    else if (path.endsWith("/classrooms/class/remediation-bank")) data = {questions:consolidation.questions};
    else if (path.endsWith("/classrooms/class/remediations")) {const body=request.postDataJSON();assert.deepEqual(body.studentIds,["student-a"]);assert.deepEqual(body.questionIds,["concept-q"]); remediationCreated=true;data={quiz:consolidation};}
    else if (path.endsWith("/quizzes/consolidation/open")) {consolidation.status="open";data={updated:true};}
    else if (path.endsWith("/quizzes/consolidation/submissions")) data={quiz:consolidation,students:roster,submissions:[{studentId:"student-a",score:1}],missing:[],statistics:{studentCount:1,submissionCount:1,averageScore:1,questions:[]}};
    else if (path.endsWith("/classrooms/class/quizzes")) data={quizzes:remediationCreated?[consolidation]:[]};
    else if (path.endsWith("/quizzes/consolidation/copy")) {const body=request.postDataJSON();assert.equal(body.classroomId,"class-target");assert.deepEqual(body.studentIds,["target-student"]);copyCreated=true;data={quiz:{...consolidation,id:"copied",status:"draft"}};}
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

async function checkExportProfile(teacher) {
  await teacher.goto(`${base}/exports`);
  const section = teacher.getByRole("region", { name: "归档表头", exact: true });
  const save = section.getByRole("button", { name: "保存表头信息", exact: true });
  const excel = teacher.getByRole("region", { name: "分项成绩", exact: true }).getByRole("button", { name: "导出 Excel", exact: true }).first();
  const preview = teacher.getByRole("button", { name: "预览并定稿", exact: true });
  await section.getByText("请补全并保存表头信息后导出。", { exact: true }).waitFor();
  assert.equal(await save.isDisabled(), true);
  assert.equal(await excel.isDisabled(), true);
  assert.equal(await preview.isDisabled(), true);
  assert.equal(await teacher.getByRole("region", { name: "学生实验报告", exact: true }).getByRole("button", { name: "打包下载 PDF", exact: true }).isEnabled(), true);
  assert.equal(await section.getByLabel("课程名称", { exact: true }).inputValue(), archiveProfile.courseName);
  const labels = { academicTerm: "学年学期", courseCode: "课程代码", courseName: "课程名称", teacherName: "教师姓名", college: "所属学院", teachingLocation: "上课教室" };
  for (const [key, label] of Object.entries(labels)) await section.getByLabel(label, { exact: true }).fill(archiveProfile[key]);
  assert.equal(await excel.isDisabled(), true, "unsaved headers allowed export");
  await save.click();
  await section.getByText("本班表头信息已保存", { exact: true }).waitFor();
  assert.deepEqual(exportProfiles.get("class"), archiveProfile);
  assert.equal(await excel.isEnabled(), true);
  assert.equal(await preview.isEnabled(), true);
  const downloading = teacher.waitForEvent("download");
  await excel.click();
  assert.deepEqual(await readFile(await (await downloading).path()), workbook);
  assert.equal(excelExports, 1);
  await teacher.reload();
  await section.getByText("本班表头信息已保存", { exact: true }).waitFor();
  for (const [key, label] of Object.entries(labels)) assert.equal(await section.getByLabel(label, { exact: true }).inputValue(), archiveProfile[key]);

  await section.getByLabel("上课教室", { exact: true }).fill("A203");
  await section.getByText("表头信息已修改，请保存后导出。", { exact: true }).waitFor();
  assert.equal(await excel.isDisabled(), true);
  assert.equal(await preview.isDisabled(), true);
  profileSaveFailure = true;
  await save.click();
  await section.getByRole("alert").waitFor();
  assert.equal(exportProfiles.get("class").teachingLocation, "A201");
  assert.equal(await section.getByLabel("上课教室", { exact: true }).inputValue(), "A203");
  assert.equal(await excel.isDisabled(), true);
  profileSaveFailure = false;
  await save.click();
  await section.getByText("本班表头信息已保存", { exact: true }).waitFor();

  const classroomChoice = teacher.getByRole("combobox", { name: "选择班级", exact: true });
  profileLoadFailure = true;
  await classroomChoice.selectOption("class-target");
  await section.getByRole("alert").waitFor();
  assert.equal(await excel.isDisabled(), true);
  assert.equal(await section.getByLabel("上课教室", { exact: true }).inputValue(), "");
  profileLoadFailure = false;
  await section.getByRole("button", { name: "重新加载", exact: true }).click();
  await section.getByText("本班表头信息已保存", { exact: true }).waitFor();
  assert.equal(await section.getByLabel("上课教室", { exact: true }).inputValue(), "B302");
  await classroomChoice.selectOption("class");
  await section.getByText("本班表头信息已保存", { exact: true }).waitFor();
  assert.equal(await section.getByLabel("上课教室", { exact: true }).inputValue(), "A203");

  for (const width of [1440, 390]) for (const colorScheme of ["light", "dark"]) {
    await teacher.setViewportSize({ width, height: 950 });
    await teacher.emulateMedia({ colorScheme });
    await section.scrollIntoViewIfNeeded();
    await screenshot(teacher, `export-profile-${width}-${colorScheme}`);
  }
  const english = await session("teacher", "en-US");
  await english.goto(`${base}/exports`);
  await english.getByText("Header information saved for this class", { exact: true }).waitFor();
  assert.equal(await english.getByLabel("Teaching room", { exact: true }).inputValue(), "A203");
  await english.setViewportSize({ width: 390, height: 950 });
  await screenshot(english, "export-profile-english-mobile");
}

try {
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  if (!process.env.TEACHER_CONTINUITY_ONLY && !process.env.HOMEWORK_EXPORT_ONLY && !process.env.EXPORT_PROFILE_ONLY) {
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
  homework.deadline = before; homework.status = "closed";
  await student.reload();
  await answer.waitFor();
  assert.equal(await answer.inputValue(), "2", "deadline discarded the draft");
  assert.equal(await answer.isDisabled(), true);
  await student.getByText(/已截止，未提交的本机草稿保留/).waitFor();
  homework.deadline = after; homework.status = "open";
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

  }
  const teacher = await session("teacher");
  if (process.env.EXPORT_PROFILE_ONLY) await checkExportProfile(teacher);
  if (!process.env.HOMEWORK_EXPORT_ONLY && !process.env.EXPORT_PROFILE_ONLY) {
  await teacher.goto(`${base}/dashboard`);
  await teacher.waitForURL("**/classrooms");
  await teacher.getByRole("button", {name:/信号与系统 · 一班/}).click();
  await teacher.getByRole("button", {name:"知识掌握",exact:true}).click();
  await teacher.getByRole("button", {name:"选题并布置巩固",exact:true}).click();
  const remediation=teacher.getByRole("dialog");
  await remediation.getByText("选择正确的信号分类",{exact:true}).waitFor();
  assert.equal(await remediation.getByRole("checkbox").count(),2);
  await screenshot(teacher,"remediation-desktop");
  await teacher.setViewportSize({width:390,height:844});
  await screenshot(teacher,"remediation-mobile");
  await remediation.getByRole("button",{name:"发布给所选学生",exact:true}).click();
  await remediation.getByText(/巩固任务已发布到所选学生/).waitFor();
  await remediation.getByRole("button",{name:"刷新完成情况",exact:true}).click();
  await remediation.getByText("已提交 1/1 人",{exact:true}).waitFor();
  await teacher.keyboard.press("Escape");
  await teacher.setViewportSize({width:1360,height:950});
  await teacher.getByRole("button",{name:"课堂活动",exact:true}).click();
  await teacher.getByRole("button",{name:"复制活动",exact:true}).click();
  const copying=teacher.getByRole("dialog");
  await copying.getByLabel("目标班级").selectOption("class-target");
  await copying.getByRole("checkbox").waitFor();
  await copying.getByRole("button",{name:"复制为草稿",exact:true}).click();
  await copying.getByText(/已复制为目标班级的独立草稿/).waitFor();
  assert.equal(copyCreated,true);
  await teacher.keyboard.press("Escape");
  }
  if (!process.env.TEACHER_CONTINUITY_ONLY && !process.env.EXPORT_PROFILE_ONLY) {
    await teacher.goto(`${base}/exports`);
    const section = teacher.getByRole("region", { name: "学生作业答卷", exact: true });
    const choice = section.getByRole("combobox");
    await section.getByText("已提交 1 份答卷", { exact: true }).waitFor();
    assert.equal(await choice.locator("option").count(), 2, "scheduled or withdrawn homework was offered");
    await choice.selectOption("paper-2");
    await section.getByText("已提交 2 份答卷", { exact: true }).waitFor();
    for (const width of [1440, 390]) for (const colorScheme of ["light", "dark"]) {
      await teacher.setViewportSize({ width, height: 950 });
      await teacher.emulateMedia({ colorScheme });
      await section.scrollIntoViewIfNeeded();
      await screenshot(teacher, `homework-export-${width}-${colorScheme}`);
    }
    const downloadButton = section.getByRole("button", { name: "打包下载 PDF", exact: true });
    const filename = section.getByRole("textbox");
    await filename.fill("{实验}");
    assert.equal(await downloadButton.isDisabled(), true);
    await filename.fill("{班级}_{学号}_{姓名}_{作业}");
    const downloading = teacher.waitForEvent("download");
    await downloadButton.click();
    const download = await downloading;
    assert.ok(download.suggestedFilename().endsWith(".zip"));
    assert.ok(download.suggestedFilename().includes("作业一"));
    assert.deepEqual(await readFile(await download.path()), homeworkZip);
    assert.equal(homeworkExports.at(-1).kind, "homework_reports");
    assert.equal(homeworkExports.at(-1).homeworkId, "paper-2");
    assert.equal(homeworkExports.at(-1).includeOngoing, false);
    await teacher.getByRole("combobox", { name: "选择班级", exact: true }).selectOption("class-target");
    await choice.getByText("本班暂无已开始的作业", { exact: true }).waitFor({ state: "attached" });
    assert.equal(await downloadButton.isDisabled(), true);
    homeworkLoadFailure = true;
    await teacher.getByRole("combobox", { name: "选择班级", exact: true }).selectOption("class");
    await section.getByRole("alert").waitFor();
    assert.equal(await downloadButton.isDisabled(), true);
    homeworkLoadFailure = false;
    await teacher.getByRole("button", { name: "刷新班级", exact: true }).click();
    await choice.locator('option[value="paper-1"]').waitFor({ state: "attached" });
    await section.getByRole("alert").waitFor({ state: "hidden" });
    assert.equal(await downloadButton.isEnabled(), true);
    const englishTeacher = await session("teacher", "en-US");
    await englishTeacher.goto(`${base}/exports`);
    await englishTeacher.getByRole("heading", { name: "Student homework papers", exact: true }).waitFor();
  }
  if (!process.env.TEACHER_CONTINUITY_ONLY && !process.env.HOMEWORK_EXPORT_ONLY && !process.env.EXPORT_PROFILE_ONLY) {
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
  }
  assert.deepEqual(errors, []);
  console.log(process.env.EXPORT_PROFILE_ONLY ? "PASS: required archive headers, save/reload, dirty export guard, save/load failures, class isolation, Excel download, bilingual UI and mobile/desktop light/dark layouts." : process.env.HOMEWORK_EXPORT_ONLY ? "PASS: homework selection, ZIP download, classroom isolation, errors, filename validation, bilingual UI and mobile/desktop light/dark layouts." : process.env.TEACHER_CONTINUITY_ONLY ? "PASS: teacher remediation selection, recipients, publication, results and cross-class copying; mobile/desktop." : "PASS: dashboard, read-only drafts, account isolation, submission, remediation, cross-class copying, homework exports and grade records.");
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
