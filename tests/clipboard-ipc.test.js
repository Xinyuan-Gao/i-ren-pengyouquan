"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const mainSource = fs.readFileSync(path.join(__dirname, "../src/main/main.js"), "utf8");
const preloadSource = fs.readFileSync(path.join(__dirname, "../src/main/preload.js"), "utf8");

test("renderer can ask the main process whether the clipboard currently has an image", () => {
  assert.match(mainSource, /ipcMain\.handle\("images:clipboard-has-image"/);
  assert.match(mainSource, /clipboardFilePaths\(\)\.length > 0 \|\| !clipboard\.readImage\(\)\.isEmpty\(\)/);
  assert.match(preloadSource, /clipboardHasImage: \(\) => ipcRenderer\.invoke\("images:clipboard-has-image"\)/);
});
