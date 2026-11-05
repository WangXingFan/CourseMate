import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";

const source = readFileSync(new URL("../features/learning/model/course-videos.ts", import.meta.url), "utf8");
const { COURSE_LESSON_VIDEOS, COURSE_VIDEO_EPISODES, courseVideoURL } = await import(
  `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`
);
const course = JSON.parse(readFileSync(new URL("../../../backend/internal/domain/learning/content/course.json", import.meta.url), "utf8"));

test("preview videos cover the published course chapters with complete external episode links", () => {
  const lessonIDs = course.lessons.filter((lesson) => /^ss-\d+-\d+$/.test(lesson.id)).map((lesson) => lesson.id);
  assert.deepEqual(Object.keys(COURSE_LESSON_VIDEOS).sort(), lessonIDs.sort());
  for (const [id, videos] of Object.entries(COURSE_LESSON_VIDEOS)) {
    assert.ok(videos.recommended.length > 0, id);
    const pages = [...videos.recommended, ...videos.extra];
    assert.equal(new Set(pages).size, pages.length, `${id}: repeated episode`);
    for (const page of pages) {
      const episode = COURSE_VIDEO_EPISODES[page];
      assert.ok(episode?.title && episode.duration > 0, `${id}: P${page}`);
      const url = new URL(courseVideoURL(page));
      assert.equal(url.origin, "https://www.bilibili.com");
      assert.equal(url.pathname, "/video/BV1ga411W7j2/");
      assert.equal(url.search, `?p=${page}`);
    }
  }
});
