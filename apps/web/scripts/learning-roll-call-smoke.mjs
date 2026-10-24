import assert from "node:assert/strict";
import { join } from "node:path";

export async function verifyClassroomRollCall({ teacher, student, base, artifacts }) {
  const classes = [
    { id: "draw_one", name: "随机点名测试班" },
    { id: "draw_two", name: "另一个班级" },
    { id: "draw_empty", name: "空名单班级" },
    { id: "draw_retry", name: "加载重试班级" },
    { id: "draw_slow", name: "延迟加载班级" },
  ].map((item) => ({ ...item, description: "", teacherId: "teacher_one", teacherName: "任课老师", studentCount: 3, createdAt: new Date().toISOString() }));
  const roster = [
    { id: "draw_student_one", username: "00123456789", displayName: "同名同学" },
    { id: "draw_student_two", username: "00123456790", displayName: "同名同学" },
    { id: "draw_student_three", username: "00123456791", displayName: "示例同学" },
  ];
  let failRosterOnce = true;
  let slowRequested;
  const requestStarted = new Promise((resolve) => { slowRequested = resolve; });
  let finishSlow;
  const slowResponse = new Promise((resolve) => { finishSlow = resolve; });
  await teacher.route("**/api/v1/classrooms", (route) => route.fulfill({ json: { errorMsg: "", data: { classrooms: classes } } }));
  await teacher.route("**/api/v1/classrooms/*/students", async (route) => {
    const id = new URL(route.request().url()).pathname.split("/").at(-2);
    if (id === "draw_retry" && failRosterOnce) {
      failRosterOnce = false;
      await route.fulfill({ status: 503, json: { errorMsg: "名单暂时不可用", data: null } });
      return;
    }
    if (id === "draw_slow") { slowRequested(); await slowResponse; }
    const students = id === "draw_one" ? [...roster, roster[0]] : id === "draw_empty" ? [] : [{ id: `${id}_student`, username: "00234567890", displayName: "另一班同学" }];
    await route.fulfill({ json: { errorMsg: "", data: { students } } }).catch(() => {});
  });

  await teacher.getByRole("link", { name: "随机点名", exact: true }).click();
  await teacher.waitForURL(`${base}/roll-call`);
  await teacher.getByRole("heading", { name: "随机点名", exact: true }).waitFor();
  const result = teacher.getByRole("status", { name: "点名结果", exact: true });
  const history = teacher.getByRole("list", { name: "本轮点名记录", exact: true });
  await teacher.emulateMedia({ reducedMotion: "no-preference" });
  await teacher.screenshot({ path: join(artifacts, "teacher-roll-call-ready.png") });
  const picked = new Set();
  for (let index = 0; index < roster.length; index++) {
    await teacher.getByRole("button", { name: index === 0 ? "抽一位同学" : "再抽一位", exact: true }).click();
    assert.equal(await result.getAttribute("data-draw-state"), "drawing");
    assert.equal(await teacher.getByRole("button", { name: "正在抽选…", exact: true }).isDisabled(), true);
    assert.equal(await history.getByRole("listitem").count(), index, "rolling names committed a result too early");
    if (index === 0) {
      const firstTick = Number(await result.locator("[data-roll-call-preview]").getAttribute("data-roll-call-preview"));
      await teacher.waitForFunction((tick) => Number(document.querySelector("[data-roll-call-preview]")?.getAttribute("data-roll-call-preview")) > tick, firstTick);
      await teacher.screenshot({ path: join(artifacts, "teacher-roll-call-rolling.png") });
      // Programmatic rapid clicks must also be harmless while the button is locked.
      await teacher.getByRole("button", { name: "正在抽选…", exact: true }).evaluate((button) => { button.click(); button.click(); });
    }
    await teacher.waitForFunction(() => document.querySelector("[data-roll-call-preview]")?.getAttribute("data-roll-call-preview") === "19");
    const lastPreviewID = await result.locator("[data-roll-call-preview] .font-mono").textContent();
    const id = (await result.getByText(/^学号：/).textContent()).replace("学号：", "");
    assert.equal(lastPreviewID, id, "the slowing reel ended on a different student than the revealed result");
    assert.ok(roster.some((item) => item.username === id), "picked a student outside the selected class");
    assert.ok(!picked.has(id), "repeated a student in the same round");
    picked.add(id);
    assert.equal(await history.getByRole("listitem").count(), index + 1);
  }
  assert.equal(picked.size, 3, "duplicate roster entries or shared names changed the candidate pool");
  assert.equal(await teacher.getByRole("button", { name: "本轮已全部点到", exact: true }).isDisabled(), true);
  assert.deepEqual(await teacher.locator("dl dd").allTextContents(), ["3", "3", "0"]);
  await teacher.screenshot({ path: join(artifacts, "teacher-roll-call-desktop.png"), animations: "disabled" });
  await teacher.setViewportSize({ width: 390, height: 844 });
  assert.ok(await teacher.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "roll call mobile overflow");
  await teacher.screenshot({ path: join(artifacts, "teacher-roll-call-mobile.png"), animations: "disabled" });
  await teacher.evaluate(() => document.documentElement.classList.add("dark"));
  await teacher.screenshot({ path: join(artifacts, "teacher-roll-call-mobile-dark.png"), animations: "disabled" });
  await teacher.evaluate(() => document.documentElement.classList.remove("dark"));
  await teacher.setViewportSize({ width: 1360, height: 950 });
  // Reset during a draw cancels the timer, including a late result in the same class.
  await teacher.getByRole("button", { name: "重新开始本轮", exact: true }).click();
  await teacher.getByRole("button", { name: "抽一位同学", exact: true }).click();
  await teacher.getByRole("button", { name: "重新开始本轮", exact: true }).click();
  await result.getByRole("heading", { name: "准备好开始了吗？", exact: true }).waitFor();
  await teacher.waitForTimeout(2300);
  assert.equal(await history.count(), 0, "a cancelled animation added a late result");
  // Switching classes must stop the old animation and leave the new round ready.
  const select = teacher.getByRole("combobox", { name: "选择班级", exact: true });
  await teacher.getByRole("button", { name: "抽一位同学", exact: true }).click();
  await select.selectOption("draw_two");
  await result.getByRole("heading", { name: "准备好开始了吗？", exact: true }).waitFor();
  assert.equal(await history.count(), 0);
  assert.equal(await result.getAttribute("data-draw-state"), "idle");
  await select.selectOption("draw_one");
  // Reduced motion skips the rolling delay while preserving selection behavior.
  await teacher.emulateMedia({ reducedMotion: "reduce" });
  await teacher.getByRole("button", { name: "抽一位同学", exact: true }).click();
  await result.getByText(/^学号：/).waitFor();
  assert.equal(await result.locator("[data-roll-call-preview]").count(), 0);
  await teacher.getByRole("button", { name: "重新开始本轮", exact: true }).click();
  await result.getByRole("heading", { name: "准备好开始了吗？", exact: true }).waitFor();
  assert.equal(await history.count(), 0);
  assert.deepEqual(await teacher.locator("dl dd").allTextContents(), ["3", "0", "3"]);
  await teacher.getByRole("button", { name: "抽一位同学", exact: true }).click();
  assert.equal(await history.getByRole("listitem").count(), 1);

  await select.selectOption("draw_two");
  await teacher.getByRole("button", { name: "抽一位同学", exact: true }).click();
  await result.getByRole("heading", { name: "另一班同学", exact: true }).waitFor();
  assert.equal(await history.getByRole("listitem").count(), 1, "switching classes retained the previous class history");
  assert.deepEqual(await teacher.locator("dl dd").allTextContents(), ["1", "1", "0"]);
  await select.selectOption("draw_empty");
  await result.getByRole("heading", { name: "这个班级还没有学生", exact: true }).waitFor();
  assert.equal(await teacher.getByRole("button", { name: "抽一位同学", exact: true }).isDisabled(), true);
  assert.equal(await history.count(), 0);

  await select.selectOption("draw_retry");
  await teacher.getByRole("alert").getByText("名单加载失败，请刷新重试。", { exact: true }).waitFor();
  assert.equal(await teacher.getByRole("button", { name: "抽一位同学", exact: true }).isDisabled(), true);
  await teacher.getByRole("button", { name: "刷新名单", exact: true }).click();
  await teacher.getByRole("button", { name: "抽一位同学", exact: true }).click();
  await result.getByRole("heading", { name: "另一班同学", exact: true }).waitFor();
  assert.equal(await history.getByRole("listitem").count(), 1);
  await select.selectOption("draw_slow");
  await requestStarted;
  await select.selectOption("draw_empty");
  finishSlow();
  await result.getByRole("heading", { name: "这个班级还没有学生", exact: true }).waitFor();
  assert.equal(await history.count(), 0, "late roster response populated a different class");
  assert.equal(await teacher.getByRole("button", { name: "抽一位同学", exact: true }).isDisabled(), true);

  let studentRosterRequests = 0;
  await student.route("**/api/v1/classrooms**", async (route) => {
    studentRosterRequests++;
    await route.fulfill({ status: 403, json: { errorMsg: "forbidden", data: null } });
  });
  await student.goto(`${base}/roll-call`);
  await student.getByText("随机点名仅供教师使用", { exact: true }).waitFor();
  await student.getByRole("button", { name: "打开侧边栏", exact: true }).click();
  await student.getByRole("link", { name: "课堂活动", exact: true }).waitFor();
  assert.equal(await student.getByRole("link", { name: "随机点名", exact: true }).count(), 0);
  assert.equal(studentRosterRequests, 0, "student route loaded teacher rosters");
}
