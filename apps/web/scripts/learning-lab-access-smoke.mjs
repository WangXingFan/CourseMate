// Browser integration for classroom experiment gates and readable measurements.
// Run from the repository root after the web build. HTTP/DB enforcement is
// independently exercised by virtual_lab_access_test.go.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, readFile, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON);
const { chromium } = require("playwright-core");
const root = resolve("apps/web/out"), artifacts = resolve(".cache/lab-access-smoke");
await mkdir(artifacts, { recursive: true });
const server = createServer(async (req, res) => {
  try {
    let path = resolve(root, `.${decodeURIComponent(new URL(req.url, "http://localhost").pathname)}`);
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    try { await stat(`${path}.html`); path += ".html"; }
    catch { if ((await stat(path)).isDirectory()) path = join(path, "index.html"); }
    res.setHeader("Content-Type", ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2" })[extname(path)] ?? "application/octet-stream");
    res.setHeader("X-Frame-Options", "DENY");
    if (path === join(root, "vendor", "signal-lab", "index.html")) {
      res.setHeader("X-Frame-Options", "SAMEORIGIN");
      res.setHeader("Content-Security-Policy", "frame-ancestors 'self'");
    }
    res.end(await readFile(path));
  } catch { res.writeHead(404).end("Not found"); }
});
const externalBase = process.env.VIRTUAL_LAB_BASE_URL?.replace(/\/$/, "");
if (!externalBase) await new Promise((done) => server.listen(0, "127.0.0.1", done));
const base = externalBase || `http://127.0.0.1:${server.address().port}`;
const now = new Date().toISOString();
const courses = { L1: false, L2: false, L3: false };
let record = { accountId: 101, revision: 0, document: "", updatedAt: null };
const errors = [];
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
async function account(role) {
  const context = await browser.newContext({ locale: "zh-CN", viewport: { width: 1440, height: 950 } });
  await context.route("**/api/v1/**", async (route) => {
    const req = route.request(), path = new URL(req.url()).pathname;
    let data = {};
    if (path.endsWith("/auth/refresh")) data = { accessToken: `qa-${role}`, sessionID: role };
    else if (path.endsWith("/me")) data = { user: { id: role === "teacher" ? 1 : 101, publicID: role, username: role, displayName: role, role, status: "active", locale: "zh-CN", timezone: "Asia/Shanghai", initialSecurityRequired: false, initialUsernameRequired: false, mustResetPassword: false, onboardingCompletedAt: now, appearancePreferences: "", profilePreferences: "", identityProviders: [], email: "", phone: "", passwordEnabled: true } };
    else if (path.endsWith("/learning/virtual-lab/access")) data = { courses: role === "teacher" ? { L1:true,L2:true,L3:true } : courses };
    else if (path.endsWith("/learning/virtual-lab")) {
      if (req.method() === "PUT") { record = { ...record, ...req.postDataJSON(), revision: record.revision + 1, updatedAt: now }; }
      data = record;
    } else if (path.endsWith("/classrooms")) data = { classrooms: [{ id: "class-one", name: "实验开放验证班", description: "", teacherName: "任课教师", studentCount: 1, createdAt: now, experiments: courses }] };
    else if (/\/experiments\/L[123]$/.test(path)) { courses[path.split("/").at(-1)] = req.postDataJSON().open; data = { updated: true }; }
    else if (path.endsWith("/lab-assessments")) data = { items: [] };
    else if (path.endsWith("/students")) data = { students: [{id:"student",username:"student",displayName:"测试学生"}] };
    else if (path.endsWith("/capabilities")) data = { features: { classrooms: true, knowledgeBases: true } };
    else if (path.endsWith("/user/settings")) data = { settings: {} };
    else if (path.endsWith("/branding")) data = { title:"课知伴",shortName:"课知伴",description:"",logoURL:"",faviconURL:"/favicon.ico",pwaIcon192URL:"",pwaIcon512URL:"",pwaMaskableIcon512URL:"",appleTouchIcon180URL:"" };
    else if (path.endsWith("/version")) { await route.fulfill({ json: {version:"0.4.4-beta.3",buildID:""} }); return; }
    else data = { total:0, results:[],models:[],groups:[],conversations:[],knowledgeBases:[],settings:{} };
    await route.fulfill({ json: { errorMsg:"", data } });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type()==="error" && /FORMATTING_ERROR|MISSING_MESSAGE|IntlError/.test(message.text())) errors.push(message.text()); });
  return page;
}
async function screenshots(page, label) {
  for (const width of [1440,390]) for (const theme of ["light","dark"]) {
    await page.setViewportSize({ width,height:950 });
    await page.evaluate((theme) => { document.documentElement.classList.toggle("dark",theme==="dark"); },theme);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1));
    await page.screenshot({ path:join(artifacts,`${label}-${width}-${theme}.png`),fullPage:true });
  }
  await page.setViewportSize({ width:1440,height:950 });
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
}
try {
  const student = await account("student"), teacher = await account("teacher");
  await student.goto(`${base}/learn/experiments/workspace#task/L1-1`);
  await student.getByText("本实验尚未开放，请等待任课教师开启。",{exact:true}).waitFor();
  assert.equal(await student.locator("[data-native-task]").count(),0);
  await screenshots(student,"closed");
  await teacher.goto(`${base}/learn/experiments`);
  const toggles = teacher.locator("[data-experiment-access]");
  await toggles.getByRole("switch",{name:"开放 L1",exact:true}).waitFor();
  await screenshots(teacher,"teacher");
  await toggles.getByRole("switch",{name:"开放 L1",exact:true}).click();
  await student.locator('[data-native-task="L1-1"]').waitFor();
  assert.deepEqual(courses,{L1:true,L2:false,L3:false});
  await student.locator("#prediction").fill("预测信号平移、反转和压缩会改变关键点的位置。");
  await student.locator('[data-action="prediction"]').click();
  const givens=student.locator("[data-estimate-givens]");
  await givens.waitFor();
  assert.deepEqual(await givens.locator("[data-series]").evaluateAll((items)=>items.map((el)=>el.getAttribute("data-series"))),["f(t)"]);
  assert.equal(await student.locator('svg[data-chart="main"]').count(),0);
  await student.locator("#reading-estimate").fill("1秒");
  await student.locator('[data-action="reading-estimate"]').click();
  const plot=student.locator('svg[data-chart="main"]').first();
  await plot.focus();
  await plot.press("Home");
  await plot.press("ArrowRight");
  assert.ok((await plot.textContent()).match(/-?\d+\.\d s/));
  await student.locator("#observation").fill("1.012s");
  await student.locator('[data-action="trial"]').click();
  await givens.waitFor();
  await screenshots(student,"reference");
  await student.locator("#param-a").fill("2");
  await student.locator("#reading-estimate").fill("1.5s");
  await student.locator('[data-action="reading-estimate"]').click();
  await student.locator("#observation").fill("1.5秒");
  await student.locator('[data-action="trial"]').click();
  await student.getByText("已保存到当前账号",{exact:true}).waitFor();
  assert.equal(JSON.parse(record.document).tasks["L1-1"].trials.length,2);
  // Predict once, then explore pulse widths without hiding the live plot.
  await student.locator('[data-lab-phase="observe"] select').first().selectOption("3");
  await student.locator("#param-delta").fill("0.2");
  await givens.getByText("基准窄脉冲：Δ=0.5 s，高度 2，面积为 1。改变宽度后仍保持面积为 1。", {exact:true}).waitFor();
  await student.locator("#reading-estimate").fill("4");
  await student.locator('[data-action="reading-estimate"]').click();
  await student.locator("#observation").fill("5");
  for (const width of [0.1,0.3,0.5,0.2]) {
    await student.locator("#param-delta").fill(String(width));
    const live = student.locator('svg[data-chart="main"]').first();
    await live.waitFor();
    assert.equal(await student.locator("[data-reading-prediction]").count(),0);
    // Use a click inside the pulse, away from its discontinuous endpoints.
    await live.evaluate((svg, width) => {
      const box=svg.getBoundingClientRect(),w=svg.viewBox.baseVal.width,h=svg.viewBox.baseVal.height;
      svg.dispatchEvent(new MouseEvent("click", {bubbles:true,clientX:box.left+(62+(width/2+0.15)/0.95*(w-85))/w*box.width,clientY:box.top+120/h*box.height}));
    },width);
    assert.equal(await live.locator("[data-cursor-marker]").count(),1);
    assert.ok((await live.locator("[data-cursor-marker]").textContent()).includes("纵轴"));
    const readout=student.locator("[data-lab-cursor-readout]").first();
    assert.ok(Math.abs(Number(await readout.locator("dd").last().textContent())-1/width)<0.001);
    assert.equal(await student.locator("#observation").inputValue(),width===0.2?"5":"");
  }
  await screenshots(student,"pulse-readout");
  await toggles.getByRole("switch",{name:"开放 L2",exact:true}).click();
  await toggles.getByRole("switch",{name:"开放 L1",exact:true}).click();
  await student.getByText("本实验尚未开放，请等待任课教师开启。",{exact:true}).waitFor();
  assert.equal(await student.locator("[data-native-task]").count(),0);
  await student.goto(`${base}/learn/experiments/workspace#task/L2-1`);
  await student.locator('[data-native-task="L2-1"]').waitFor();
  await student.goto(`${base}/learn/experiments/signal-basics`);
  await student.locator("[data-lab-closed]").waitFor();
  await student.goto(`${base}/learn/python`);
  await student.locator("[data-lab-closed]").waitFor();
  assert.equal(await student.locator("[data-python-editor]").count(),0);
  assert.deepEqual(errors,[]);
  console.log("PASS: independent classroom switches; active-page closure and direct-link gates; original-only prediction reference; unit-bearing readings; one-decimal cursor; mobile/desktop light/dark layouts");
} finally { await browser.close(); server.close(); }
