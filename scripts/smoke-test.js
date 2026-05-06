"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createStore, normalizeTags, verifyPassword } = require("../src/main/storage");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "private-moments-test-"));
const imagePath = path.join(tempDir, "sample.png");
fs.writeFileSync(imagePath, Buffer.from("89504e470d0a1a0a", "hex"));

const store = createStore(tempDir);

assert.deepStrictEqual(normalizeTags("生活, 工作 #想法 生活"), ["生活", "工作", "想法"]);
assert.strictEqual(store.getAuthStatus().hasPassword, false);
store.setPassword("1234");
assert.strictEqual(store.getAuthStatus().hasPassword, true);
assert.strictEqual(store.unlock("nope").ok, false);
assert.strictEqual(store.unlock("1234").ok, true);
assert.strictEqual(verifyPassword("1234", JSON.parse(fs.readFileSync(store.paths.authPath, "utf8"))), true);

const created = store.createRecord({
  text: "今天状态不错",
  mood: "happy",
  tags: "生活 记录",
  imagePaths: [imagePath]
});

assert.strictEqual(created.attachments.length, 1);
assert.strictEqual(store.listRecords({ query: "状态" }).length, 1);
assert.strictEqual(store.listRecords({ mood: "sad" }).length, 0);

const updated = store.updateRecord(created.id, {
  text: "今天状态很好",
  mood: "inspired",
  tags: ["灵感"],
  keepAttachments: created.attachments,
  imagePaths: []
});

assert.strictEqual(updated.mood, "inspired");
assert.strictEqual(store.listRecords({ query: "灵感" }).length, 1);

const exportPath = path.join(tempDir, "export.json");
store.exportData(exportPath);
assert.strictEqual(fs.existsSync(exportPath), true);

store.deleteRecord(created.id);
assert.strictEqual(store.listRecords().length, 0);

fs.rmSync(tempDir, { recursive: true, force: true });
console.log("smoke test passed");
