// Static UI fixtures cover teacher assignment and student access. Go tests
// verify the same permissions and course question snapshots against the API.
// Set CLASSROOM_BASE_URL to check the built UI served by a running Go backend.
import assert from "node:assert/strict";
import { mkdir, readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, join, resolve, sep } from "node:path";
import { verifyClassroomRollCall } from "./learning-roll-call-smoke.mjs";

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
const externalBase = process.env.CLASSROOM_BASE_URL?.replace(/\/$/, "");
if (!externalBase) await new Promise((done) => server.listen(0, "127.0.0.1", done));
const base = externalBase || `http://127.0.0.1:${server.address().port}`;
const course = JSON.parse(await readFile("backend/internal/domain/learning/content/course.json", "utf8"));
const pairs = JSON.parse(await readFile("backend/internal/domain/learning/content/paired-questions.json", "utf8")).pairs;
const now = new Date().toISOString();
const classroom = { id: "class_one", name: "预习测验证班", description: "", teacherId: "teacher_one", teacherName: "任课老师", studentCount: 1, createdAt: now };
const lessons = course.lessons.map((lesson) => {
  const preview = lesson.questions.find((question) => question.stage === "preview");
  return { id: lesson.id, number: lesson.number, title: lesson.title, chapter: lesson.chapter, prompt: preview.prompt, options: preview.options, answer: preview.answer, explanation: preview.explanation, followup: pairs.find((p) => p.lessonID === lesson.id).followup };
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
let followup;
let retestSubmitted = false;
let retestAnswers = [];
let submitted = false;
let selectedAnswers = [];
let directSubmissions = 0;
let lessonLoadFailures = 1;
const rosterUploadBytes = Buffer.from("PK\x03\x04binary-roster-upload-fixture\x00\xff", "binary");
const rosterImports = [];
function rosterImportResult(line) {
  return { total: 2, created: 1, skipped: 1, failed: 0,
    rows: [{ line, username: "00123456789", status: "created" }, { line: line + 1, username: "00123456789", status: "duplicate" }],
    credentials: [{ username: "00123456789", displayName: "示例学生", initialPassword: "student" }] };
}
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
    else if (path.endsWith("/students/accounts/import/file")) {
      assert.equal(role, "teacher");
      assert.match(request.headers()["content-type"], /^multipart\/form-data; boundary=/);
      assert.ok(request.postDataBuffer().includes(rosterUploadBytes), "Excel bytes changed during upload");
      rosterImports.push("xlsx");
      data = rosterImportResult(8);
    } else if (path.endsWith("/students/accounts/import")) {
      assert.equal(role, "teacher");
      assert.deepEqual(request.postDataJSON(), { csv: "学号,姓名\n00123456789,示例学生" });
      rosterImports.push("csv");
      data = rosterImportResult(2);
    } else if (path.endsWith("/quiz-lessons")) {
      if (lessonLoadFailures-- > 0) { await route.fulfill({ status: 503, json: { errorMsg: "暂时不可用", data: null } }); return; }
      data = { lessons };
    } else if (path.endsWith("/class_one/quizzes")) {
      if (request.method() === "POST") {
        createBody = request.postDataJSON();
        assert.deepEqual(Object.keys(createBody).sort(), ["lessonIds", "title"]);
        quiz = { id: "quiz_one", title: createBody.title, phase: "pre_class", status: "draft", questions: createBody.lessonIds.map((id) => { const q = course.lessons.find((lesson) => lesson.id === id).questions.find((question) => question.stage === "preview"); const pair = pairs.find((p) => p.lessonID === id); return { id: q.id, prompt: q.prompt, options: q.options, answer: q.answer, explanation: q.explanation, lessonId: id, conceptId: pair.conceptID, conceptTitle: pair.conceptTitle }; }), submissionCount: 0, createdAt: now, openedAt: null, closedAt: null };
        data = { quiz };
      } else data = { quizzes: [quiz,followup].filter(Boolean) };
    } else if (path.endsWith("/quizzes/quiz_one/open")) { quiz.status = "open"; quiz.openedAt = now; data = { updated: true }; }
    else if (path.endsWith("/quizzes/quiz_one/close")) { quiz.status = "closed"; data = { updated: true }; }
    else if (path.endsWith("/quizzes/quiz_one/followup")) {
      assert.equal(quiz.status,"closed");
      followup ??= { ...quiz, id:"quiz_followup", sourceQuizId:quiz.id, title:`${quiz.title} · 复测`, phase:"in_class",status:"draft",submissionCount:0,questions:createBody.lessonIds.map((id) => { const p = pairs.find((p) => p.lessonID === id); return {...p.followup,lessonId:id,conceptId:p.conceptID,conceptTitle:p.conceptTitle}; }) };
      data = {quiz:followup};
    } else if (path.endsWith("/quizzes/quiz_followup/open")) { followup.status="open";followup.openedAt=now;data={updated:true}; }
    else if (path.endsWith("/quizzes/quiz_followup/close")) { followup.status="closed";data={updated:true}; }
    else if (path.endsWith("/student/quizzes")) data = { classroom, quizzes:[quiz,followup].filter((q) => q && q.status!=="draft").map((q) => ({...q,questions:q.questions.map(({id,prompt,options})=>({id,prompt,options})), submitted:q===quiz?submitted:retestSubmitted,score:q===quiz?0:(retestSubmitted?1:0),answers:q===quiz?selectedAnswers:retestAnswers})) };
    else if (path.endsWith("/quizzes/quiz_followup/submissions") && request.method()==="POST") {
      assert.equal(followup.status,"open");retestAnswers=request.postDataJSON().answers;assert.deepEqual(retestAnswers,followup.questions.map((q)=>q.answer));retestSubmitted=true;followup.submissionCount=1;data={score:1,total:1,submitted:true};
    } else if (/\/quizzes\/[^/]+\/submissions$/.test(path) && request.method()==="GET") {
      const q=path.includes("quiz_followup")?followup:quiz;
      const answered=q===quiz?submitted:retestSubmitted;
      const answers=q===quiz?selectedAnswers:retestAnswers;
      const student={id:"student_one",username:"student",displayName:"student"};
      const paired=submitted&&retestSubmitted?1:0;
      data={quiz:q,students:[student],submissions:answered?[{studentId:student.id,studentName:"student",username:"student",answers,score:q===quiz?0:1,submittedAt:now}]:[],missing:answered?[]:[student],statistics:{studentCount:1,submissionCount:answered?1:0,averageScore:q===quiz?0:(answered?1:0),questions:q.questions.map((question)=>({...question,correctCount:q===quiz?0:(answered?1:0),optionCounts:question.options.map((_,i)=>answered&&answers[0]===i?1:0)}))},comparison:followup?{beforeId:quiz.id,beforeTitle:quiz.title,afterId:followup.id,afterTitle:followup.title,afterStatus:followup.status,pairedCount:paired,beforeOnly:submitted&&!retestSubmitted?1:0,afterOnly:0,neither:submitted?0:1,questions:quiz.questions.map((q)=>({conceptId:q.conceptId,conceptTitle:q.conceptTitle,pairedCount:paired,beforeCorrect:0,afterCorrect:paired,improved:paired,retained:0,regressed:0,unresolved:0})),students:[{studentId:student.id,studentName:"student",username:"student",beforeSubmitted:submitted,afterSubmitted:retestSubmitted,beforeScore:0,afterScore:paired,changes:[{conceptId:quiz.questions[0].conceptId,outcome:paired?"improved":"before_only"}]}]}:null};
    }
    else if (path.endsWith("/quizzes/quiz_one/submissions") && request.method() === "POST") {
      assert.equal(quiz.status, "open");
      selectedAnswers = request.postDataJSON().answers;
      assert.deepEqual(selectedAnswers, quiz.questions.map((question) => (question.answer+1)%question.options.length));
      submitted = true; quiz.submissionCount = 1;
      data = { score: 0, total: quiz.questions.length, submitted: true };
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
  await teacher.getByRole("button", { name: "导入学生名单", exact: true }).click();
  const rosterDialog = teacher.getByRole("dialog");
  const rosterFileInput = rosterDialog.locator('input[type="file"]');
  await rosterFileInput.setInputFiles({ name: "名单.txt", mimeType: "text/plain", buffer: Buffer.from("invalid") });
  await rosterDialog.getByText("请选择 .xlsx 点名册或 .csv 名单文件。", { exact: true }).waitFor();
  assert.equal(await rosterDialog.getByRole("button", { name: "导入并创建账号", exact: true }).isDisabled(), true);
  await rosterFileInput.setInputFiles({ name: "过大.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.alloc(1_048_577) });
  await rosterDialog.getByText("名单文件不能超过 1 MB。", { exact: true }).waitFor();
  assert.equal(rosterImports.length, 0);
  const uploadFile = { name: "点名册.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: rosterUploadBytes };
  await rosterFileInput.setInputFiles(uploadFile);
  await rosterDialog.getByText("点名册.xlsx", { exact: true }).waitFor();
  assert.equal(await rosterDialog.locator("textarea").count(), 0, "Excel was read as CSV text");
  await teacher.screenshot({ path: join(artifacts, "teacher-roster-upload.png") });
  await teacher.setViewportSize({ width: 390, height: 844 });
  assert.ok(await teacher.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "roster mobile overflow");
  await teacher.screenshot({ path: join(artifacts, "teacher-roster-upload-mobile.png"), animations: "disabled" });
  await teacher.setViewportSize({ width: 1360, height: 950 });
  await rosterDialog.getByRole("button", { name: "移除文件", exact: true }).click();
  await rosterDialog.locator("textarea").waitFor();
  await rosterFileInput.setInputFiles(uploadFile);
  await rosterDialog.getByRole("button", { name: "导入并创建账号", exact: true }).click();
  await teacher.getByRole("heading", { name: "账号与默认密码", exact: true }).waitFor();
  await teacher.getByRole("columnheader", { name: "结果", exact: true }).waitFor();
  await teacher.getByRole("cell", { name: "8", exact: true }).waitFor();
  const downloaded = teacher.waitForEvent("download");
  await teacher.getByRole("button", { name: "下载密码表（1）", exact: true }).click();
  const passwordDownload = await downloaded;
  assert.match(await readFile(await passwordDownload.path(), "utf8"), /00123456789,示例学生,student/);
  await teacher.getByRole("button", { name: "完成", exact: true }).click();
  await teacher.getByRole("button", { name: "导入学生名单", exact: true }).click();
  await teacher.getByRole("dialog").locator("textarea").fill("学号,姓名\n00123456789,示例学生");
  await teacher.getByRole("button", { name: "导入并创建账号", exact: true }).click();
  await teacher.getByRole("heading", { name: "账号与默认密码", exact: true }).waitFor();
  assert.deepEqual(rosterImports, ["xlsx", "csv"]);
  await teacher.getByRole("button", { name: "完成", exact: true }).click();
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
  await article.getByRole("button").nth((quiz.questions[0].answer+1)%quiz.questions[0].options.length).click();
  await article.getByRole("button", { name: "提交答案", exact: true }).click();
  await student.getByText("得分 0/1", { exact: true }).waitFor();
  assert.ok(await article.getByRole("button").first().isDisabled());
  assert.ok(await student.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "mobile overflow");
  await student.screenshot({ path: join(artifacts, "student-published-answer-mobile.png") });
  await teacher.getByRole("button", { name: "截止", exact: true }).click();
  await student.getByRole("button", { name: "刷新", exact: true }).click();
  await student.getByText("已截止", { exact: true }).waitFor();
  assert.equal(directSubmissions, 0);
  await teacher.getByRole("button", {name:"创建同知识点复测",exact:true}).click();
  const report=teacher.getByRole("dialog");
  await report.getByText("复测仍为草稿，请确认题目后发布。",{exact:true}).waitFor();
  await report.getByRole("button",{name:"发布",exact:true}).click();
  await report.waitFor({state:"hidden"});
  await student.getByRole("button",{name:"刷新",exact:true}).click();
  await student.getByRole("heading",{name:followup.title,exact:true}).waitFor();
  const retest=student.locator("article").filter({has:student.getByRole("heading",{name:followup.title,exact:true})});
  await retest.locator(".grid > button").nth(followup.questions[0].answer).click();
  await retest.getByRole("button",{name:"提交答案",exact:true}).click();
  await retest.getByText("得分 1/1",{exact:true}).waitFor();
  await teacher.getByRole("button",{name:"截止",exact:true}).click();
  await teacher.getByRole("button",{name:"统计与抽人",exact:true}).first().click();
  const comparison=report.getByRole("region",{name:"同知识点前后测",exact:true});
  await comparison.getByText("100.0%",{exact:false}).waitFor();
  await comparison.getByText("错 → 对",{exact:true}).first().waitFor();
  await comparison.getByText("展开学生变化明细",{exact:true}).click();
  await comparison.getByRole("cell",{name:"错 → 对",exact:true}).waitFor();
  await teacher.screenshot({path:join(artifacts,"paired-comparison-desktop.png"),animations:"disabled"});
  await teacher.setViewportSize({width:390,height:844});
  assert.ok(await teacher.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"comparison mobile overflow");
  await teacher.screenshot({path:join(artifacts,"paired-comparison-mobile.png"),animations:"disabled"});
  await report.getByRole("button",{name:"关闭",exact:true}).click();
  await teacher.setViewportSize({width:1360,height:950});
  await verifyClassroomRollCall({ teacher, student, base, artifacts });
  assert.deepEqual(errors, []);
  console.log("PASS: default student password, Excel roster upload, CSV fallback, row results and password download, course preview and matched retest, paired statistics and transitions, random roll call with no repeats, class switching, reset, empty roster, retry, stale response isolation, teacher-only navigation, desktop and mobile");
} catch (error) {
  for (const [index, page] of pages.entries()) await page.screenshot({ path: join(artifacts, `failure-${index}.png`) }).catch(() => {});
  throw error;
} finally {
  if (browser) await browser.close();
  if (server.listening) await new Promise((done) => server.close(done));
}
