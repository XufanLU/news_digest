import test from "node:test";
import assert from "node:assert/strict";
import {
  createNoteRecord,
  getYouTubeVideoId,
  isPublishableNote,
  parseFrontmatter,
  renderMarkdown
} from "../scripts/content.mjs";

const generatedMarkdown = `---
title: "A useful note"
channel: "Test Channel"
video_url: "https://www.youtube.com/watch?v=abc123"
published: "2026-06-17T10:00:00Z"
transcript: "transcripts/clean/abc123.txt"
status: "generated"
---

# A useful note

## Learning Takeaways

- A **strong** idea with \`code\`.
`;

test("parses note frontmatter and YouTube IDs", () => {
  const meta = parseFrontmatter(generatedMarkdown);
  assert.equal(meta.title, "A useful note");
  assert.equal(meta.status, "generated");
  assert.equal(getYouTubeVideoId(meta.video_url), "abc123");
});

test("renders escaped Markdown with supported inline formatting", () => {
  const html = renderMarkdown(`${generatedMarkdown}\n<script>alert(1)</script>`);
  assert.match(html, /<strong>strong<\/strong>/);
  assert.match(html, /<code>code<\/code>/);
  assert.doesNotMatch(html, /<script>/);
});

test("publishes only complete generated notes", () => {
  const note = createNoteRecord("note.md", generatedMarkdown);
  assert.equal(isPublishableNote(note, generatedMarkdown), true);
  assert.equal(note.thumbnailUrl, "https://i.ytimg.com/vi/abc123/mqdefault.jpg");
  assert.equal(isPublishableNote({ ...note, status: "draft" }, generatedMarkdown), false);
  assert.equal(isPublishableNote(note, `${generatedMarkdown}\nTODO`), false);
});
