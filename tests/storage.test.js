"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createStore } = require("../src/main/storage");

function makeTempStore(options) {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "private-moments-test-"));
  return { baseDir, store: createStore(baseDir, options) };
}

function writeTinyPng(dir, name = "source.png") {
  const filePath = path.join(dir, name);
  const pngBytes = Buffer.from(
    "89504e470d0a1a0a0000000d4948445200000001000000010806000000" +
      "1f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082",
    "hex"
  );
  fs.writeFileSync(filePath, pngBytes);
  return filePath;
}

test("first-run storage starts without auth files", () => {
  const { store } = makeTempStore();

  store.init();
  assert.equal(fs.existsSync(path.join(store.paths.dataDir, "auth.json")), false);
  assert.equal(fs.existsSync(store.paths.recordsPath), true);
});

test("records can be created, read, updated, deleted, searched, and mood-filtered", () => {
  const { store } = makeTempStore();

  const first = store.createRecord({
    text: "Morning coffee and a quiet plan",
    mood: "calm",
    tags: "home plan"
  });
  const second = store.createRecord({
    text: "A bright launch idea",
    mood: "inspired",
    tags: ["work", "idea"]
  });

  const all = store.listRecords();
  assert.equal(all.length, 2);
  assert.deepEqual(new Set(all.map((record) => record.id)), new Set([first.id, second.id]));

  assert.deepEqual(
    store.listRecords({ query: "COFFEE" }).map((record) => record.id),
    [first.id]
  );
  assert.deepEqual(
    store.listRecords({ mood: "inspired" }).map((record) => record.id),
    [second.id]
  );
  assert.deepEqual(
    store.listRecords({ query: "idea", mood: "inspired" }).map((record) => record.id),
    [second.id]
  );
  assert.deepEqual(store.listRecords({ query: "missing" }), []);

  const updated = store.updateRecord(first.id, {
    text: "Evening coffee update",
    mood: "happy",
    tags: "home"
  });
  assert.equal(updated.id, first.id);
  assert.equal(updated.mood, "happy");
  assert.equal(updated.text, "Evening coffee update");
  assert.equal(updated.liked, false);
  assert.equal(updated.likeCount, 0);

  const liked = store.toggleLike(first.id);
  assert.equal(liked.liked, true);
  assert.equal(liked.likeCount, 1);
  const unliked = store.toggleLike(first.id);
  assert.equal(unliked.liked, false);
  assert.equal(unliked.likeCount, 0);

  const favorited = store.toggleFavorite(first.id);
  assert.equal(favorited.favorite, true);
  assert.deepEqual(
    store.listRecords({ favorite: true }).map((record) => record.id),
    [first.id]
  );

  assert.deepEqual(store.deleteRecord(second.id), { ok: true });
  assert.deepEqual(
    store.listRecords().map((record) => record.id),
    [first.id]
  );
});

test("image attachments are copied into app storage without mutating source files", () => {
  const { baseDir, store } = makeTempStore();
  const sourceImage = writeTinyPng(baseDir);
  const originalBytes = fs.readFileSync(sourceImage);

  const record = store.createRecord({
    text: "",
    mood: "happy",
    imagePaths: [sourceImage]
  });

  assert.equal(record.attachments.length, 1);
  assert.notEqual(record.attachments[0], path.basename(sourceImage));
  assert.deepEqual(fs.readFileSync(sourceImage), originalBytes);
  assert.equal(fs.existsSync(store.resolveAttachment(record.attachments[0])), true);

  const secondSource = writeTinyPng(baseDir, "second.png");
  const updated = store.updateRecord(record.id, {
    text: "Now with two images",
    mood: "happy",
    keepAttachments: record.attachments,
    imagePaths: [secondSource]
  });

  assert.equal(updated.attachments.length, 2);
  assert.equal(fs.existsSync(store.resolveAttachment(record.attachments[0])), true);
  assert.equal(fs.existsSync(store.resolveAttachment(updated.attachments[1])), true);

  assert.throws(
    () => store.createRecord({ text: "not an image", imagePaths: [path.join(baseDir, "note.txt")] }),
    /仅支持常见图片格式/
  );
});

test("image attachments get lightweight thumbnails with safe fallback", () => {
  const { baseDir, store } = makeTempStore({
    createThumbnail(_sourcePath, targetPath) {
      fs.writeFileSync(targetPath, "thumb");
    }
  });
  const sourceImage = writeTinyPng(baseDir);

  const record = store.createRecord({
    text: "Thumbnail me",
    mood: "happy",
    imagePaths: [sourceImage]
  });

  const thumbnailPath = store.resolveThumbnail(record.attachments[0]);
  assert.equal(path.dirname(thumbnailPath), store.paths.thumbnailsDir);
  assert.equal(fs.readFileSync(thumbnailPath, "utf8"), "thumb");

  fs.rmSync(thumbnailPath);
  const regeneratedPath = store.resolveThumbnail(record.attachments[0]);
  assert.equal(regeneratedPath, thumbnailPath);
  assert.equal(fs.readFileSync(regeneratedPath, "utf8"), "thumb");
});

test("thumbnail resolution falls back to original attachments without a thumbnailer", () => {
  const { baseDir, store } = makeTempStore();
  const sourceImage = writeTinyPng(baseDir);

  const record = store.createRecord({
    text: "Fallback thumbnail",
    mood: "happy",
    imagePaths: [sourceImage]
  });

  assert.equal(store.resolveThumbnail(record.attachments[0]), store.resolveAttachment(record.attachments[0]));
});

test("json export contains records but no auth material", () => {
  const { baseDir, store } = makeTempStore();
  const sourceImage = writeTinyPng(baseDir);
  const record = store.createRecord({
    text: "Export me",
    mood: "calm",
    tags: "archive",
    imagePaths: [sourceImage]
  });
  const exportPath = path.join(baseDir, "export.json");

  assert.deepEqual(store.exportData(exportPath), { ok: true, path: exportPath });
  const exported = JSON.parse(fs.readFileSync(exportPath, "utf8"));

  assert.equal(exported.version, 1);
  assert.equal(exported.records.length, 1);
  assert.equal(exported.records[0].id, record.id);
  assert.equal(exported.records[0].text, "Export me");
  assert.equal(exported.records[0].mood, "calm");
  assert.equal(exported.records[0].attachments.length, 1);
  assert.equal(path.isAbsolute(exported.records[0].attachments[0]), false);
  assert.equal(JSON.stringify(exported).includes(sourceImage), false);
  assert.equal(JSON.stringify(exported).includes("private-pass"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(exported, "auth"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(exported, "hash"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(exported, "salt"), false);
});

test("records and export remain stable after storage reload", () => {
  const { baseDir, store } = makeTempStore();
  const sourceImage = writeTinyPng(baseDir);
  const textOnly = store.createRecord({
    text: "Text-only memory",
    mood: "calm",
    tags: "memory"
  });
  const imageOnly = store.createRecord({
    mood: "happy",
    imagePaths: [sourceImage]
  });

  const reloadedStore = createStore(baseDir);
  const reloadedRecords = reloadedStore.listRecords();
  assert.deepEqual(
    new Set(reloadedRecords.map((record) => record.id)),
    new Set([textOnly.id, imageOnly.id])
  );
  assert.equal(reloadedRecords.find((record) => record.id === textOnly.id).text, "Text-only memory");
  assert.equal(reloadedRecords.find((record) => record.id === imageOnly.id).attachments.length, 1);

  const exportPath = path.join(baseDir, "reload-export.json");
  assert.deepEqual(reloadedStore.exportData(exportPath), { ok: true, path: exportPath });
  const exported = JSON.parse(fs.readFileSync(exportPath, "utf8"));
  assert.deepEqual(
    new Set(exported.records.map((record) => record.id)),
    new Set([textOnly.id, imageOnly.id])
  );
  assert.equal(exported.records.some((record) => record.attachments.length === 1), true);
  assert.equal(JSON.stringify(exported).includes(sourceImage), false);
});

test("storage logic runs locally without network APIs", () => {
  const storageSource = fs.readFileSync(path.join(__dirname, "../src/main/storage.js"), "utf8");

  assert.equal(/\bfetch\s*\(/.test(storageSource), false);
  assert.equal(/\bhttps?:\/\//.test(storageSource), false);
  assert.equal(/\brequire\(["']https?["']\)/.test(storageSource), false);
});
