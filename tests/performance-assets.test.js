"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rendererSource = fs.readFileSync(path.join(__dirname, "../src/renderer/renderer.js"), "utf8");
const indexSource = fs.readFileSync(path.join(__dirname, "../src/renderer/index.html"), "utf8");
const styleSource = fs.readFileSync(path.join(__dirname, "../src/renderer/styles.css"), "utf8");

test("timeline renders thumbnail images lazily instead of full attachments", () => {
  assert.match(rendererSource, /thumbnailUrlFor\(name\)/);
  assert.match(rendererSource, /<img[^>]+src="\$\{thumbnailUrlFor\(name\)\}"[^>]+loading="lazy"[^>]+decoding="async"/);
  assert.match(indexSource, /img-src[^"]*private-thumbnail:/);
});

test("renderer avoids inline style attributes blocked by the app CSP", () => {
  assert.doesNotMatch(rendererSource, /style="/);
  assert.doesNotMatch(rendererSource, /\.style\.setProperty\(/);
  assert.match(rendererSource, /dataset\.interfaceScale/);
  assert.match(rendererSource, /dataset\.backgroundStrengthLevel/);
  assert.match(styleSource, /body\[data-interface-scale="90"\]/);
  assert.match(styleSource, /body\[data-interface-scale="120"\]/);
  assert.match(styleSource, /body\[data-background-strength-level="0"\]/);
  assert.match(styleSource, /body\[data-background-strength-level="100"\]/);
});

test("day grouping appends records without repeatedly copying day arrays", () => {
  const groupByDayBody = rendererSource.match(/function groupByDay\(records\) \{([\s\S]*?)\n\}/)?.[1] || "";

  assert.match(groupByDayBody, /\.push\(record\)/);
  assert.doesNotMatch(groupByDayBody, /\[\.\.\.\(grouped\.get\(key\)/);
});

test("timeline posts avoid the global backdrop blur card style", () => {
  const backdropGroup = styleSource.match(/\.design-card,[\s\S]*?backdrop-filter: blur\(18px\);/)?.[0] || "";

  assert.doesNotMatch(backdropGroup, /\.post,?/);
  assert.match(styleSource, /\.post \{[\s\S]*?background: var\(--card-bg\);/);
});

test("async record loads cannot reopen the feed after locking", () => {
  assert.match(rendererSource, /sessionToken/);
  assert.match(rendererSource, /function beginSession\(\)/);
  assert.match(rendererSource, /function endSession\(\)/);
  assert.match(rendererSource, /function isCurrentSession\(token\)/);
  assert.match(rendererSource, /if \(!isCurrentSession\(sessionToken\)\) return false;/);
  assert.match(rendererSource, /endSession\(\);\s*state\.records = \[\];/);
});
