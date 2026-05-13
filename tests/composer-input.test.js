"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rendererSource = fs.readFileSync(path.join(__dirname, "../src/renderer/renderer.js"), "utf8");

test("composer text area is marked as the primary text input", () => {
  assert.match(rendererSource, /<textarea[^>]+id="record-text"[^>]+data-primary-composer-input="true"[^>]+autofocus/);
});

test("composer render path focuses the primary text input", () => {
  assert.match(rendererSource, /function focusPrimaryComposerInput\(/);
  assert.match(rendererSource, /state\.shouldFocusComposer = true;/);
  assert.match(rendererSource, /if \(state\.shouldFocusComposer\) focusPrimaryComposerInput\(\);/);
  assert.match(rendererSource, /state\.shouldFocusComposer = false;/);
});

test("text fields keep native copy and text paste behavior", () => {
  assert.match(rendererSource, /function isEditableTextTarget\(/);
  assert.doesNotMatch(rendererSource, /clipboardHasPlainText/);
  assert.doesNotMatch(rendererSource, /keydown[\s\S]{0,220}preventDefault\(\)[\s\S]{0,80}(?:KeyC|KeyV|KeyX)/);
});

test("focused composer routes pasted and dropped images into the image area", () => {
  const pasteBody = rendererSource.match(/async function handlePasteImages\(event\) \{([\s\S]*?)\n\}/)?.[1] || "";
  const globalPasteBody = rendererSource.match(/async function handleGlobalPaste\(event\) \{([\s\S]*?)\n\}/)?.[1] || "";
  const shortcutBody = rendererSource.match(/async function handleComposerPasteShortcut\(event\) \{([\s\S]*?)\n\}/)?.[1] || "";
  const dragBody = rendererSource.match(/function handleDragOverImages\(event\) \{([\s\S]*?)\n\}/)?.[1] || "";
  const dropBody = rendererSource.match(/async function handleDropImages\(event\) \{([\s\S]*?)\n\}/)?.[1] || "";

  assert.match(rendererSource, /function clipboardHasImage\(/);
  assert.match(rendererSource, /text\.addEventListener\("keydown", handleComposerPasteShortcut\)/);
  assert.match(rendererSource, /async function pasteClipboardImages\(token, files = \[\]\)/);
  assert.match(shortcutBody, /event\.key\?\.toLowerCase\?\.\(\) === "v"/);
  assert.match(shortcutBody, /event\.metaKey \|\| event\.ctrlKey/);
  assert.match(shortcutBody, /if \(!await clipboardHasImage\(\)\) return;/);
  assert.match(shortcutBody, /await pasteClipboardImages\(token\)/);
  assert.match(pasteBody, /const eventHasImage =/);
  assert.match(pasteBody, /const hasImage = eventHasImage \|\| await clipboardHasImage\(\);/);
  assert.match(pasteBody, /if \(!hasImage\) return;/);
  assert.match(pasteBody, /event\.preventDefault\(\);/);
  assert.match(pasteBody, /await pasteClipboardImages\(token, files\);/);
  assert.match(globalPasteBody, /event\.target\.closest\?\.\("\.composer"\)/);
  assert.doesNotMatch(pasteBody, /if \(isTextEntryTarget\(event\.target\)\) return;/);
  assert.doesNotMatch(pasteBody, /if \(isEditableTextTarget\(event\.target\)/);
  assert.doesNotMatch(dragBody, /if \(isTextEntryTarget\(event\.target\)\) return;/);
  assert.doesNotMatch(dropBody, /if \(isTextEntryTarget\(event\.target\)\) return;/);
});
