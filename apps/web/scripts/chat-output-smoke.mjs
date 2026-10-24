// Run against the static build. Fixtures cover UI behavior; Go tests cover auth, catalog visibility and prompt injection.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, readFile, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";

const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON);
const { chromium } = require("playwright-core");
const root = resolve("apps/web/out"), artifacts = resolve(".cache/chat-output-smoke");
await mkdir(artifacts, { recursive: true });
const server = createServer(async (req, res) => {
  try {
    let path = resolve(root, `.${decodeURIComponent(new URL(req.url, "http://localhost").pathname)}`);
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    try { await stat(`${path}.html`); path += ".html"; }
    catch { if ((await stat(path)).isDirectory()) path = join(path, "index.html"); }
    res.setHeader("Content-Type", ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".woff2": "font/woff2" })[extname(path)] ?? "application/octet-stream");
    res.end(await readFile(path));
  } catch { res.writeHead(404).end(); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const base = `http://127.0.0.1:${server.address().port}`;
const now = new Date().toISOString();
const samples = [
  ["function-plot", { title: "正弦信号比较", functions: [{ expr: "sin(x)" }, { expr: "sin(2*x)" }], x: [-6.28, 6.28], y: [-2, 2] }],
  ["calculator", { title: "一阶系统计算器", inputs: [{ key: "tau", label: "时间常数", min: 0.1, max: 5, step: 0.1, default: 1 }], outputs: [{ label: "阶跃响应", expr: "1-exp(-1/tau)", precision: 4, highlight: true }] }],
  ["chart", { title: "信号采样图", type: "line", x: [0, 1, 2], series: [{ name: "采样值", data: [0, 1, 0] }] }],
  ["data-table", { title: "采样数据", columns: [{ key: "time", label: "时间", type: "number" }, { key: "value", label: "幅值", type: "number" }], rows: [{ time: 0, value: 0 }, { time: 1, value: 1 }, { time: 2, value: 0 }] }],
  ["quiz", { title: "卷积自测", questions: [{ question: "卷积是否满足交换律？", options: ["满足交换律", "不满足交换律"], answer: 0, explanation: "卷积满足交换律。" }] }],
  ["decision-tree", { title: "系统判断", nodes: [{ id: "start", text: "系统是否线性？", options: [{ label: "满足叠加性", next: "linear" }] }, { id: "linear", text: "这是线性系统" }] }],
  ["card-grid", { title: "实验卡片", items: [{ title: "时域", summary: "卷积", tag: "实验一" }, { title: "频域", summary: "频谱", tag: "实验二" }] }],
  ["stat-grid", { title: "采样指标", items: [{ label: "采样率", value: "100", unit: "Hz" }] }],
  ["gantt", { title: "实验排期", tasks: [{ name: "时域实验", start: "2026-10-22", end: "2026-10-23" }] }],
  ["diff", { title: "表达式对比", before: "sin(x)", after: "sin(2*x)" }],
];
const catalog = samples.map(([name], i) => ({ id: i + 1, name, version: 1, enabled: true, scope: "builtin", rendererKind: "builtin", rendererSource: "", propsSchema: "", description: name, propsSummary: "", sortOrder: i }));
const content = samples.map(([component, props], i) => `\`\`\`deeix-ui\n${JSON.stringify({ component, id: `sample-${i}`, props })}\n\`\`\``).join("\n\n");
const conversation = { publicID: "output-test", title: "信号与系统交互输出", model: "test-model", userID: 7, status: "active", labelsJSON: "[]", contextPolicyJSON: "{}", messageCount: 1, createdAt: now, updatedAt: now };
const message = { id: 1, publicID: "output-message", userID: 7, conversationID: 1, role: "assistant", content, contentType: "markdown", status: "completed", createdAt: now, updatedAt: now, attachments: "[]", parentPublicID: "", sourcePublicID: "", parentMessageID: null, branchReason: "default", platformModelName: "test-model", runID: "", myFeedback: "", knowledgeSources: [] };
const user = { id: 7, publicID: "student-output", username: "student7", displayName: "测试学生", role: "user", status: "active", locale: "zh-CN", timezone: "Asia/Shanghai", initialSecurityRequired: false, initialUsernameRequired: false, mustResetPassword: false, onboardingCompletedAt: now, identityProviders: [], appearancePreferences: "", profilePreferences: "", passwordEnabled: true };
const errors = [], submissions = [];
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const context = await browser.newContext({ locale: "zh-CN", viewport: { width: 1360, height: 950 }, acceptDownloads: true });
  await context.route("**/api/v1/**", async (route) => {
    const req = route.request(), url = new URL(req.url());
    let data = { results: [], total: 0, settings: {} };
    if (url.pathname.endsWith("/auth/refresh")) data = { accessToken: "qa-output", sessionID: "qa-output" };
    else if (url.pathname.endsWith("/me")) data = { user };
    else if (url.pathname.endsWith("/ui-components")) data = { results: catalog, total: catalog.length };
    else if (url.pathname.endsWith("/models")) data = [{ platformModelName: "test-model", displayName: "测试模型", capabilitiesJSON: "{}", protocolsJSON: '["openai_chat_completions"]', kindsJSON: '["text"]', vendor: "openai", description: "", icon: "", sortOrder: 1 }];
    else if (url.pathname.endsWith("/messages/stream")) {
      submissions.push(req.postDataJSON());
      await route.fulfill({ status: 400, json: { errorMsg: "test stream stopped", errorCode: "request.invalid_input" } }); return;
    } else if (url.pathname.endsWith("/messages")) data = { results: [message], total: 1 };
    else if (url.pathname.endsWith("/conversations/output-test")) data = { conversation };
    else if (url.pathname.endsWith("/conversations")) data = { results: [conversation], total: 1 };
    else if (url.pathname.endsWith("/capabilities")) data = { features: { knowledgeBases: true, classrooms: true } };
    else if (url.pathname.endsWith("/branding")) data = { title: "CourseMate", shortName: "CourseMate", description: "", logoURL: "", faviconURL: "/favicon.ico" };
    else if (url.pathname.endsWith("/version")) { await route.fulfill({ json: { version: "0.4.4-beta.3", buildID: "" } }); return; }
    await route.fulfill({ json: { errorMsg: "", data } });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/chat?conversation_id=output-test`);
  for (const [, props] of samples) await page.getByText(props.title, { exact: true }).waitFor();
  assert.equal(await page.getByText("组件无法显示", { exact: false }).count(), 0);
  await page.getByRole("button", { name: "输出形式", exact: true }).click();
  assert.equal(await page.locator('[data-selected="true"]').count(), 10);
  await page.waitForFunction(() => [...document.querySelectorAll('[data-state="open"]')].some((node) => node.getAttribute("role") === "dialog" && getComputedStyle(node).opacity === "1"));
  await page.screenshot({ path: join(artifacts, "output-options.png") });
  await page.getByRole("button", { name: "清空", exact: true }).click();
  assert.equal(await page.locator('[data-selected="true"]').count(), 0);
  await page.getByRole("button", { name: "函数图像", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("button", { name: "输出形式", exact: true }).click();
  assert.equal(await page.locator('[data-selected="true"]').count(), 1);
  await page.keyboard.press("Escape");
  const slider = page.getByRole("slider");
  const previousValue = await slider.getAttribute("aria-valuenow");
  await slider.focus(); await page.keyboard.press("ArrowRight");
  assert.notEqual(await slider.getAttribute("aria-valuenow"), previousValue);
  await page.getByRole("button", { name: /满足交换律/, exact: false }).first().click();
  await page.getByText("1 / 1 正确", { exact: true }).waitFor();
  await page.getByRole("button", { name: "满足叠加性", exact: true }).click();
  await page.getByText("这是线性系统", { exact: true }).waitFor();
  await page.locator('input[placeholder="y = sin(x)"]').first().fill("cos(x)");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 CSV", exact: true }).click();
  assert.match((await downloadEvent).suggestedFilename(), /\.csv$/);
  await page.locator("textarea").fill("请比较两个正弦信号");
  const submissionEvent = page.waitForRequest((req) => req.url().includes("/messages/stream"));
  await page.getByRole("button", { name: "发送", exact: true }).click();
  await submissionEvent;
  assert.deepEqual(submissions.at(-1).uiComponentIDs, [1]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/chat?conversation_id=output-test`);
  await page.getByText("正弦信号比较", { exact: true }).waitFor();
  await page.getByText("正弦信号比较", { exact: true }).scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await page.screenshot({ path: join(artifacts, "mobile.png") });
  await page.evaluate(() => localStorage.setItem("theme", "dark"));
  await page.reload();
  await page.getByText("一阶系统计算器", { exact: true }).scrollIntoViewIfNeeded();
  assert.ok(await page.locator("html").evaluate((node) => node.classList.contains("dark")));
  await page.screenshot({ path: join(artifacts, "dark.png") });
  assert.deepEqual(errors, []);
  console.log("PASS: 10 output components, default selection, persistence, request IDs, formula editing, slider, quiz, decision tree, CSV and mobile layout");
} finally {
  await browser?.close(); await new Promise((done) => server.close(done));
}
