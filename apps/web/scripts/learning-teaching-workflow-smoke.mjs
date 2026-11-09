// Real SQLite handlers verify the teaching workflow; only auth and unrelated
// task sources use fixtures. Run after building web, from the repository root.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, join, resolve, sep } from "node:path";
import { createInterface } from "node:readline";

const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON);
const { chromium } = require("playwright-core");
const root = resolve("apps/web/out"), artifacts = resolve(".cache/teaching-workflow-smoke");
await mkdir(artifacts, { recursive: true });
await mkdir("backend/.cache", { recursive: true });
const harness = await mkdtemp(resolve("backend/.cache/teaching-"));
await writeFile(join(harness, "main.go"), `package main
import (
 "context"
 "fmt"
 "net"
 "net/http"
 "os"
 "strconv"
 "time"
 app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/classroom"
 learningapp "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/learning"
 domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
 learning "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
 user "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
 "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
 repo "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/postgres/classroom"
 learningrepo "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/postgres/learning"
 transport "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/classroom"
 "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
 "github.com/gin-gonic/gin"
 "github.com/google/uuid"
 "gorm.io/driver/sqlite"
 "gorm.io/gorm"
 "gorm.io/gorm/logger"
)
type readers struct { db *gorm.DB }
func(r readers) GetByID(ctx context.Context,id uint)(*user.User,error){
 var row models.User
 err:=r.db.WithContext(ctx).First(&row,id).Error
 return &user.User{ID:row.ID,PublicID:row.PublicID,Username:row.Username,Role:row.Role},err
}
func must(err error){if err!=nil {panic(err)}}
func main(){
 gin.SetMode(gin.TestMode)
 db,err:=gorm.Open(sqlite.Open(os.Args[1]),&gorm.Config{Logger:logger.Default.LogMode(logger.Silent)}); must(err)
 must(db.AutoMigrate(&models.User{},&models.Classroom{},&models.ClassroomStudent{},&models.ClassroomHomework{},&models.ClassroomHomeworkSubmission{},&models.ClassroomPracticeAssignment{},&models.ClassroomPracticeSubmission{},&models.LearningAttempt{},&models.LearningLessonAttempt{},&models.ClassroomQuiz{},&models.ClassroomQuizSubmission{}))
 must(db.Create(&[]models.User{{PublicID:"teacher",Username:"teacher",DisplayName:"任课老师",Role:"teacher"},{PublicID:"student",Username:"001",DisplayName:"李明",Role:"student"},{PublicID:"other",Username:"002",DisplayName:"王悦",Role:"student"}}).Error)
 must(db.Create(&[]models.Classroom{{PublicID:"class",Name:"信号与系统 · 一班",TeacherID:1},{PublicID:"second",Name:"信号与系统 · 二班",TeacherID:1}}).Error)
 now:=time.Now().UTC()
 must(db.Create(&[]models.ClassroomStudent{{ClassroomID:1,StudentID:2,CreatedAt:now.Add(-48*time.Hour)},{ClassroomID:1,StudentID:3,CreatedAt:now.Add(-48*time.Hour)}}).Error)
 repository:=repo.NewRepo(db)
 paper:=domain.HomeworkBank()[0]
 for _,item:=range []domain.Homework{{PublicID:"open-homework",ClassroomID:1,TeacherID:1,BankID:paper.ID,Title:"时域分析作业",Questions:paper.Questions,StartsAt:now.Add(-time.Hour),Deadline:now.Add(time.Hour)},{PublicID:"closed-homework",ClassroomID:1,TeacherID:1,BankID:paper.ID,Title:"缺课补交作业",Questions:paper.Questions,StartsAt:now.Add(-24*time.Hour),Deadline:now.Add(-time.Hour)}} {_,err:=repository.CreateHomework(context.Background(),item);must(err)}
 learn:=learningapp.NewService(learningrepo.NewRepo(db))
 q:=learning.FindPracticeBank("topic:time-constant","zh-CN").Questions[0]
 for _,id:=range []uint{2,3}{_,err=learn.SubmitPractice(context.Background(),id,uuid.NewString(),"topic:time-constant",q.ID,"zh-CN",map[string]string{"choice":strconv.Itoa((q.Answer+1)%4)});must(err)}
 service:=app.NewService(repository,readers{db});service.SetMasteryReader(learn)
 router:=gin.New()
 group:=router.Group("/api/v1",func(c *gin.Context){id,err:=strconv.Atoi(c.GetHeader("X-Test-User-ID"));must(err);c.Set(middleware.ContextKeyUserID,uint(id));c.Next()})
 transport.NewModule(transport.NewHandler(service)).RegisterRoutes(group)
 listener,err:=net.Listen("tcp","127.0.0.1:0");must(err)
 fmt.Println("http://"+listener.Addr().String())
 must(http.Serve(listener,router))
}
`);
const executable = join(harness, process.platform === "win32" ? "teaching.exe" : "teaching");
execFileSync("go", ["build", "-o", executable, join(harness, "main.go")], { cwd: resolve("backend"), stdio: "inherit" });
const api = spawn(executable, [join(harness, "teaching.db")], { stdio: ["ignore", "pipe", "inherit"] });
const apiBase = await new Promise((done, reject) => {
  createInterface({ input: api.stdout }).once("line", done);
  api.once("error", reject);
  api.once("exit", (code) => reject(new Error(`Teaching API exited: ${code}`)));
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
const quick = JSON.parse(await readFile("backend/internal/domain/learning/content/quick-questions.json", "utf8"));
const supplements = JSON.parse(await readFile("backend/internal/domain/learning/content/practice-supplements.json", "utf8"));
const keys = [...quick.questions.flatMap((q) => [q, ...q.variants]), ...supplements];
const errors = [];
let browser, practice, loseResponse = true;
async function session(id, locale = "zh-CN") {
  const context = await browser.newContext({ locale, timezoneId: "Asia/Shanghai", reducedMotion: "reduce", viewport: { width: 1440, height: 950 } });
  const role = id === 1 ? "teacher" : "student";
  await context.route("**/api/v1/**", async (route) => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    let data;
    if (path.endsWith("/auth/refresh")) data = { accessToken: `qa-${id}`, sessionID: `qa-${id}` };
    else if (path.endsWith("/me")) data = { user: { id, publicID: ["", "teacher", "student", "other"][id], username: role, displayName: role, role, status: "active", locale, timezone: "Asia/Shanghai", initialSecurityRequired: false, initialUsernameRequired: false, mustResetPassword: false, onboardingCompletedAt: new Date().toISOString(), appearancePreferences: "", profilePreferences: "", identityProviders: [], email: "", phone: "", passwordEnabled: true } };
    else if (path.endsWith("/capabilities")) data = { features: { classrooms: true, knowledgeBases: true } };
    else if (path.endsWith("/branding")) data = { title: "CourseMate", shortName: "CourseMate", logoURL: "", faviconURL: "/favicon.ico" };
    else if (path.endsWith("/version")) { await route.fulfill({ json: { version: "0.4.4-beta.3", buildID: "" } }); return; }
    else if (path.endsWith("/attendance") || path.endsWith("/lab-assessments")) data = { items: [] };
    else if (path.endsWith("/student/performance")) data = { record: null };
    else if (path.endsWith("/student/ai-activity")) data = { report: null };
    else if (path.endsWith("/learning/progress")) data = { questions: [] };
    else if (/\/classrooms(?:\/|$)|\/homeworks\/|\/student\/(homeworks|practice-assignments|quizzes)|\/practice-assignments\//.test(path)) {
      const body = request.postData();
      const response = await fetch(apiBase + path + url.search, { method: request.method(), headers: { "X-Test-User-ID": String(id), "Content-Type": "application/json" }, ...(body ? { body } : {}) });
      const result = await response.text();
      if (path.endsWith("/practice-assignments") && request.method() === "POST" && response.ok) practice = JSON.parse(result).data;
      if (loseResponse && path.includes("/practice-assignments/") && path.endsWith("/submissions") && response.ok) {
        loseResponse = false;
        await route.fulfill({ status: 503, json: { errorMsg: "响应中断，请重新提交", data: null } });
      } else await route.fulfill({ status: response.status, contentType: "application/json", body: result });
      return;
    } else data = { total: 0, results: [], models: [], groups: [], conversations: [], knowledgeBases: [], settings: {} };
    await route.fulfill({ json: { errorMsg: "", data } });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("Failed to load resource")) errors.push(message.text()); });
  return page;
}
async function screenshots(page, stage) {
  await page.evaluate(() => document.fonts.ready);
  for (const width of [1440, 390]) for (const dark of [false, true]) {
    await page.setViewportSize({ width, height: 950 });
    await page.evaluate((value) => document.documentElement.classList.toggle("dark", value), dark);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${stage} overflow`);
    await page.screenshot({ path: join(artifacts, `${stage}-${width}-${dark ? "dark" : "light"}.png`), animations: "disabled" });
  }
  await page.setViewportSize({ width: 1440, height: 950 });
}
try {
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const teacher = await session(1), student = await session(2), other = await session(3);
  await teacher.goto(`${base}/classrooms`);
  await teacher.getByRole("button", { name: /信号与系统 · 一班/ }).click();
  await teacher.locator("[data-classroom-overview]").getByText("时域分析作业", { exact: true }).waitFor();
  await screenshots(teacher, "overview");
  await teacher.getByRole("button", { name: /信号与系统 · 二班/ }).click();
  await teacher.reload();
  await teacher.getByRole("heading", { name: "信号与系统 · 二班", exact: true }).waitFor();
  await teacher.getByRole("button", { name: /信号与系统 · 一班/ }).click();
  await teacher.locator("[data-classroom-overview]").getByRole("link", { name: "实验管理", exact: true }).click();
  const labClass = teacher.locator("[data-teacher-experiments] select").first();
  await labClass.waitFor();
  assert.equal(await labClass.inputValue(), "class", "lab management lost the selected classroom");
  await teacher.goto(`${base}/classrooms`);
  await teacher.getByRole("button", { name: /信号与系统 · 一班/ }).click();
  await teacher.getByRole("button", { name: /发布作业/ }).click();
  const homework = teacher.locator("article").filter({ hasText: "时域分析作业" });
  await homework.getByRole("button", { name: "延长截止时间", exact: true }).click();
  let dialog = teacher.getByRole("dialog").last();
  await dialog.getByRole("textbox", { name: "处理原因", exact: true }).fill("统一延长一天");
  await screenshots(teacher, "extension");
  await dialog.getByRole("button", { name: "确认调整", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await teacher.locator("article").filter({ hasText: "缺课补交作业" }).getByRole("button", { name: "成绩与提交", exact: true }).click();
  dialog = teacher.getByRole("dialog").last();
  await dialog.locator("div.flex.flex-wrap").filter({ hasText: "李明" }).getByRole("button", { name: "允许补交", exact: true }).click();
  const makeup = teacher.getByRole("dialog").last();
  await makeup.getByRole("textbox", { name: "处理原因", exact: true }).fill("请假同学补交");
  await makeup.getByRole("button", { name: "确认调整", exact: true }).click();
  await teacher.getByRole("dialog").getByText("请假同学补交", { exact: true }).waitFor();
  await screenshots(teacher, "deadline-history");
  await teacher.keyboard.press("Escape");
  await teacher.getByRole("button", { name: "今日课堂", exact: true }).click();
  await teacher.locator("[data-classroom-overview]").getByText("缺课补交作业", { exact: true }).waitFor();
  await student.goto(`${base}/dashboard`);
  await student.getByRole("link", { name: /缺课补交作业/ }).click();
  await student.getByText("个人补交期限", { exact: true }).waitFor();
  await other.goto(`${base}/dashboard`);
  await other.getByText("正在同步任务", { exact: true }).waitFor({ state: "hidden" });
  assert.equal(await other.getByRole("link", { name: /缺课补交作业/ }).count(), 0);
  await teacher.getByRole("button", { name: /查看薄弱点/ }).click();
  await teacher.locator("[data-classroom-mastery]").getByRole("button", { name: /时间常数.*2/ }).click();
  await teacher.getByRole("button", { name: "布置巩固练习", exact: true }).click();
  dialog = teacher.getByRole("dialog");
  await dialog.getByRole("checkbox", { name: "王悦", exact: true }).uncheck();
  await dialog.getByRole("checkbox").last().check();
  await dialog.getByRole("textbox", { name: "练习名称", exact: true }).fill("时间常数专项巩固");
  await screenshots(teacher, "practice-publish");
  await dialog.getByRole("button", { name: "发布练习", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  assert.equal(practice.students.length, 1);
  assert.equal(practice.questions.length, 4);
  await student.goto(`${base}/dashboard`);
  await student.getByRole("link", { name: /时间常数专项巩固/ }).click();
  const task = student.locator(`#practice-${practice.id}`);
  await task.waitFor();
  assert.ok(!(await task.innerText()).includes("$63.2"), "percentage option rendered as raw math");
  assert.ok(await task.locator(".katex").count() > 0, "question formulas were not rendered");
  for (const [index, question] of practice.questions.entries()) {
    const key = keys.find((q) => question.id.endsWith(`:${q.id}`));
    assert.ok(key, question.id);
    const fieldset = task.locator("form > fieldset").nth(index);
    if (question.fields.length) await fieldset.getByRole("textbox").fill(String(key.expected));
    else await fieldset.getByRole("radio").nth(key.answer).check();
  }
  await student.reload();
  await task.waitFor();
  assert.ok(await task.getByRole("button", { name: "确认提交", exact: true }).isEnabled(), "draft not restored");
  await screenshots(student, "assigned-practice");
  await task.getByRole("button", { name: "确认提交", exact: true }).click();
  await task.getByRole("alert").waitFor();
  await task.getByRole("button", { name: "确认提交", exact: true }).click();
  await task.getByText("本次答对 4/4 道", { exact: true }).waitFor();
  await task.locator("summary").click();
  await screenshots(student, "practice-result");
  await teacher.getByRole("button", { name: "巩固练习", exact: true }).click();
  await teacher.getByText("时间常数专项巩固", { exact: true }).click();
  await teacher.getByText("已完成 1/1 人", { exact: true }).waitFor();
  await teacher.getByText("本次答对 4/4 道", { exact: true }).waitFor();
  await teacher.locator("details details summary").first().click();
  await screenshots(teacher, "practice-report");
  await other.reload();
  await other.getByText("正在同步任务", { exact: true }).waitFor({ state: "hidden" });
  assert.equal(await other.getByRole("link", { name: /时间常数专项巩固/ }).count(), 0);
  const english = await session(1, "en-US");
  await english.goto(`${base}/classrooms`);
  await english.getByRole("heading", { name: "Today's classroom", exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log("PASS: real API extensions, personal makeup isolation, remembered class, weak-concept assignment, selected recipients, numeric and choice drafts, idempotent retry, teacher results, bilingual UI, desktop/mobile light/dark");
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
  api.kill();
}
