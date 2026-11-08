// Run from the repository root after building web. Uses a temporary SQLite API
// and the real grading/mastery handlers; only the application session is mocked.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { createInterface } from "node:readline";

const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON);
const { chromium } = require("playwright-core");
const root = resolve("apps/web/out"), artifacts = resolve(".cache/practice-smoke");
await mkdir(artifacts, { recursive: true });
await mkdir("backend/.cache", { recursive: true });
const harness = await mkdtemp(resolve("backend/.cache/practice-"));
await writeFile(join(harness, "main.go"), `package main
import (
 "context"
 "fmt"
 "net"
 "net/http"
 "os"
 "strconv"
 app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/learning"
 domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
 "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
 repo "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/postgres/learning"
 transport "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/learning"
 "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
 "github.com/gin-gonic/gin"
 "github.com/google/uuid"
 "gorm.io/driver/sqlite"
 "gorm.io/gorm"
)
func main() {
 gin.SetMode(gin.TestMode)
 db, err := gorm.Open(sqlite.Open(os.Args[1]), &gorm.Config{})
 if err != nil { panic(err) }
 if err = db.AutoMigrate(&models.LearningAttempt{}, &models.LearningLessonAttempt{}, &models.ClassroomQuiz{}, &models.ClassroomQuizSubmission{}, &models.ClassroomHomework{}, &models.ClassroomHomeworkSubmission{}); err != nil { panic(err) }
 service := app.NewService(repo.NewRepo(db))
 q := domain.FindPracticeBank("topic:time-constant", "zh-CN").Questions[0]
 if _, err = service.SubmitPractice(context.Background(), 1, uuid.NewString(), "topic:time-constant", q.ID, "zh-CN", map[string]string{"choice":strconv.Itoa((q.Answer+1)%4)}); err != nil { panic(err) }
 router := gin.New()
 group := router.Group("/api/v1", func(c *gin.Context) { c.Set(middleware.ContextKeyUserID, uint(1)); c.Set(middleware.ContextKeyUserRole, "student") })
 transport.NewModule(service).RegisterRoutes(group)
 listener, err := net.Listen("tcp", "127.0.0.1:0")
 if err != nil { panic(err) }
 fmt.Println("http://"+listener.Addr().String())
 if err = http.Serve(listener, router); err != nil { panic(err) }
}
`);
const executable = join(harness, process.platform === "win32" ? "practice.exe" : "practice");
execFileSync("go", ["build", "-o", executable, join(harness, "main.go")], { cwd: resolve("backend"), stdio: "inherit" });
const api = spawn(executable, [join(harness, "practice.db")], { stdio: ["ignore", "pipe", "inherit"] });
const apiBase = await new Promise((done, reject) => {
  createInterface({ input: api.stdout }).once("line", done);
  api.once("error", reject);
  api.once("exit", (code) => reject(new Error(`Practice harness exited: ${code}`)));
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
const user = { id: 1, publicID: "practice-qa", username: "student", displayName: "专项练习学生", role: "student", status: "active", locale: "zh-CN", timezone: "Asia/Shanghai", initialSecurityRequired: false, initialUsernameRequired: false, mustResetPassword: false, onboardingCompletedAt: new Date().toISOString(), appearancePreferences: "", profilePreferences: "", identityProviders: [], email: "", phone: "", passwordEnabled: true };
const quick = JSON.parse(await readFile("backend/internal/domain/learning/content/quick-questions.json", "utf8"));
const supplements = JSON.parse(await readFile("backend/internal/domain/learning/content/practice-supplements.json", "utf8"));
const keys = [...quick.questions.flatMap((q) => [q, ...q.variants]), ...supplements];
const errors = [], submissions = [];
let browser, page, loseResponse = false;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const context = await browser.newContext({ locale: "zh-CN", viewport: { width: 1440, height: 950 } });
  await context.route("**/api/v1/**", async (route) => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname.includes("/learning/")) {
      const payload = request.postData();
      if (url.pathname.endsWith("/practice-attempts")) submissions.push(JSON.parse(payload));
      const response = await fetch(apiBase + url.pathname + url.search, { method: request.method(), ...(payload ? { body: payload, headers: { "Content-Type": "application/json" } } : {}) });
      if (loseResponse && url.pathname.endsWith("/practice-attempts") && response.ok) {
        loseResponse = false;
        await route.fulfill({ status: 500, json: { errorCode: "system.internal", errorMsg: "模拟响应丢失", data: null } });
      } else await route.fulfill({ status: response.status, contentType: "application/json", body: await response.text() });
      return;
    }
    let data;
    if (url.pathname.endsWith("/auth/refresh")) data = { accessToken: "practice-qa", sessionID: "practice-qa" };
    else if (url.pathname.endsWith("/me")) data = { user };
    else if (url.pathname.endsWith("/models")) data = [];
    else if (url.pathname.endsWith("/capabilities")) data = { features: { knowledgeBases: true, classrooms: true } };
    else if (url.pathname.endsWith("/branding")) data = { title: "CourseMate", shortName: "CourseMate", logoURL: "", faviconURL: "/favicon.ico" };
    else if (url.pathname.endsWith("/version")) { await route.fulfill({ json: { version: "0.4.4-beta.3", buildID: "" } }); return; }
    else data = { total: 0, results: [], models: [], groups: [], conversations: [], settings: {} };
    await route.fulfill({ json: { errorMsg: "", data } });
  });
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("Failed to load resource")) errors.push(message.text()); });
  async function screenshots(stage) {
    for (const width of [1440, 390]) for (const dark of [false, true]) {
      await page.setViewportSize({ width, height: 950 });
      await page.evaluate((value) => document.documentElement.classList.toggle("dark", value), dark);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1), `${stage} horizontal overflow`);
      await page.screenshot({ path: join(artifacts, `${stage}-${width}-${dark ? "dark" : "light"}.png`), animations: "disabled" });
    }
  }
  const current = () => page.locator("[data-practice-question]");
  async function answer(correct = true) {
    const id = await current().getAttribute("data-practice-question");
    const key = keys.find((q) => id.endsWith(`:${q.id}`));
    assert.ok(key, id);
    if (key.expected !== undefined) await current().getByRole("textbox").fill(String(correct ? key.expected : key.expected+1));
    else await current().getByRole("radio").nth(correct ? key.answer : (key.answer+1)%4).check();
    await current().getByRole("button", { name: "提交答案", exact: true }).click();
    if (await page.getByRole("button", { name: "重新提交", exact: true }).isVisible()) {
      await page.getByRole("button", { name: "重新提交", exact: true }).click();
    }
    await current().getByText(correct ? "回答正确" : "回答有误", { exact: true }).waitFor();
  }
  if (!process.env.CONTINUITY_ONLY) {
  await page.goto(`${base}/learn/mastery`);
  const concept = page.locator('[data-mastery-concept="topic:time-constant"]');
  await concept.getByText("需要巩固", { exact: true }).waitFor();
  await concept.getByRole("link", { name: "专题刷题" }).click();
  await page.getByText("可练 10 题", { exact: true }).waitFor();
  await screenshots("bank");
  await page.getByRole("button", { name: "开始刷题" }).click();
  await current().waitFor();
  await screenshots("question");
  // Lose a successful save response, then retry the same UUID and answer.
  loseResponse = true;
  const firstID = await current().getAttribute("data-practice-question");
  const firstKey = keys.find((q) => firstID.endsWith(`:${q.id}`));
  if (firstKey.expected !== undefined) await current().getByRole("textbox").fill(String(firstKey.expected+1));
  else await current().getByRole("radio").nth((firstKey.answer+1)%4).check();
  await page.getByRole("button", { name: "提交答案", exact: true }).click();
  await page.getByRole("button", { name: "重新提交", exact: true }).click();
  await current().getByText("回答有误", { exact: true }).waitFor();
  assert.deepEqual(submissions[0], submissions[1]);
  await page.getByRole("button", { name: "下一题", exact: true }).click();
  for (let i=1; i<10; i++) {
    await answer();
    await page.getByRole("button", { name: i === 9 ? "完成练习" : "下一题", exact: true }).click();
  }
  await page.getByRole("heading", { name: "本轮练习完成" }).waitFor();
  await screenshots("result");
  await page.getByRole("button", { name: "重练本轮错题" }).click();
  await page.getByText("第 1 / 1 题", { exact: true }).waitFor();
  await answer();
  await page.getByRole("button", { name: "完成练习", exact: true }).click();
  await page.getByRole("button", { name: "继续刷题", exact: true }).click();
  await page.reload();
  await page.getByText("可练 10 题", { exact: true }).waitFor();
  await page.getByLabel("练习范围", { exact: true }).selectOption("unanswered");
  await page.getByText("当前范围没有可练题目。", { exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "开始刷题" }).isDisabled(), true);
  await page.getByLabel("练习范围", { exact: true }).selectOption("mistakes");
  assert.equal(await page.getByRole("button", { name: "开始刷题" }).isDisabled(), true);
  await page.getByRole("link", { name: "知识掌握", exact: true }).click();
  await concept.getByText("初步掌握", { exact: true }).waitFor();
  await page.getByRole("link", { name: "专题题库", exact: true }).click();
  await page.getByLabel("筛选专题").selectOption("all");
  await page.getByText("80 个专题", { exact: true }).waitFor();
  await screenshots("catalog");
  await page.locator('[data-practice-concept="lesson:ss-2-8"]').click();
  await page.getByRole("button", { name: "开始刷题" }).click();
  await current().getByRole("textbox").fill("not-a-number");
  await page.getByRole("button", { name: "提交答案", exact: true }).click();
  await current().getByRole("alert").waitFor();
  assert.equal(await current().getByRole("textbox").isEnabled(), true);
  const numericID = await current().getAttribute("data-practice-question");
  const numericKey = keys.find((q) => numericID.endsWith(`:${q.id}`));
  await current().getByRole("textbox").fill(`${numericKey.expected*2}/2`);
  await page.getByRole("button", { name: "重新提交", exact: true }).click();
  await current().getByText("回答正确", { exact: true }).waitFor();
  await screenshots("numeric");
  }
  // Corrections retain mistakes after a later successful independent practice.
  await page.goto(`${base}/learn/progress?source=practice`);
  await page.getByRole("heading", { name: "订正与间隔复习", exact: true }).waitFor();
  assert.equal(await page.getByLabel("题目来源").inputValue(), "practice");
  await page.getByRole("button", { name: "开始订正", exact: true }).first().click();
  const correction = page.getByRole("dialog");
  await correction.getByRole("radio").first().check();
  await correction.getByRole("button", { name: "提交订正", exact: true }).click();
  await correction.getByRole("button", { name: "向 AI 提问", exact: true }).waitFor();
  await screenshots("correction");
  await correction.getByRole("button", { name: "关闭", exact: true }).first().click();
  await page.goto(`${base}/learn/knowledge?lesson=ss-2-5`);
  await page.locator("#lesson-reading").waitFor();
  await page.getByRole("button", { name: "收藏讲义", exact: true }).click();
  await page.getByRole("button", { name: "取消收藏", exact: true }).waitFor();
  assert.equal(await page.getByRole("link", { name: "相关实验", exact: true }).getAttribute("href"), "/learn/experiments/workspace#task/L1-4");
  await page.locator("#lesson-reading").evaluate((node) => { for (let element=node; element; element=element.parentElement) if (getComputedStyle(element).overflowY === "auto" && element.scrollHeight > element.clientHeight) {element.scrollTop=450;break;} });
  await page.waitForFunction(() => Object.keys(localStorage).some((key) => key.startsWith("coursemate.reading.v1:") && JSON.parse(localStorage.getItem(key)).positions["ss-2-5"] >= 400));
  await page.reload();
  await page.locator("#lesson-reading").waitFor();
  await page.waitForFunction(() => { for (let element=document.querySelector("#lesson-reading"); element; element=element.parentElement) if (getComputedStyle(element).overflowY === "auto" && element.scrollTop > 300) return true; return false; });
  await page.getByPlaceholder("搜索讲义标题或正文").fill("卷积");
  await page.getByText("正在加载…", { exact: true }).waitFor({state:"hidden"});
  await page.getByRole("navigation", {name:"小节目录"}).getByRole("link").first().waitFor();
  await page.getByRole("button", { name:"仅看收藏", exact:true }).click();
  assert.equal(await page.getByRole("navigation", {name:"小节目录"}).getByRole("link").count(),1);
  await screenshots("reading");
  await page.evaluate(() => localStorage.setItem("deeix-chat:chat-composer:v2:practice-qa",JSON.stringify({__new__:{draft:"原有草稿",attachments:[],updatedAt:new Date().toISOString()}})));
  await page.getByRole("button", {name:"向 AI 提问",exact:true}).click();
  const help=page.getByRole("dialog");
  await help.getByRole("textbox").fill("请结合卷积解释这段内容");
  await help.getByRole("button", {name:"带入聊天继续提问",exact:true}).click();
  await page.waitForURL("**/chat?learning=*");
  await page.getByRole("link", {name:/卷积/}).last().waitFor();
  assert.ok(await page.locator("textarea").evaluateAll((items)=>items.some((item)=>item.value.includes("请结合卷积解释这段内容"))));
  assert.ok(await page.locator("textarea").evaluateAll((items)=>items.some((item)=>item.value.includes("原有草稿"))));
  assert.equal(await page.evaluate(()=>Object.keys(sessionStorage).filter((key)=>key.startsWith("coursemate.learning-help:")).length),0);
  await screenshots("learning-chat");
  assert.deepEqual(errors, []);
  console.log(process.env.CONTINUITY_ONLY ? "PASS: corrections, source filter, bookmarks, reading position, body search, related experiment, AI handoff and existing draft preservation; mobile/desktop/light/dark." : "PASS: practice bank flows, corrections, reading continuity and AI handoff; mobile/desktop/light/dark.");
} catch (error) {
  console.error(errors);
  if (page) await page.screenshot({ path: join(artifacts, "failure.png") });
  throw error;
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
  const stopped = new Promise((done) => api.once("exit", done));
  api.kill(); await stopped;
  const cacheRoot = resolve("backend/.cache") + sep;
  if (harness.startsWith(cacheRoot)) await rm(harness, { recursive: true, force: true });
}
