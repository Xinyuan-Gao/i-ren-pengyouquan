"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { DATA_VERSION, MOODS } = require("../shared/constants");

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".avif"]);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(tempPath, filePath);
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`;
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))].slice(0, 12);
  }
  return [...new Set(String(tags || "")
    .split(/[#,，\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean))].slice(0, 12);
}

function normalizeMood(mood) {
  return MOODS.some((item) => item.id === mood) ? mood : "calm";
}

function sanitizeRecord(record) {
  const liked = Boolean(record.liked || Number(record.likeCount || 0) > 0);
  return {
    id: String(record.id || createId("post")),
    text: String(record.text || "").trim(),
    mood: normalizeMood(record.mood),
    tags: normalizeTags(record.tags),
    attachments: Array.isArray(record.attachments) ? record.attachments.map(String) : [],
    favorite: Boolean(record.favorite),
    liked,
    likeCount: liked ? 1 : 0,
    location: String(record.location || "").trim(),
    createdAt: record.createdAt || nowIso(),
    updatedAt: record.updatedAt || record.createdAt || nowIso()
  };
}

function createStore(baseDir, options = {}) {
  const dataDir = path.join(baseDir, "private-moments");
  const attachmentsDir = path.join(dataDir, "attachments");
  const thumbnailsDir = path.join(dataDir, "thumbnails");
  const recordsPath = path.join(dataDir, "records.json");
  const createThumbnail = typeof options.createThumbnail === "function" ? options.createThumbnail : null;

  function init() {
    ensureDir(attachmentsDir);
    ensureDir(thumbnailsDir);
    if (!fs.existsSync(recordsPath)) {
      writeJson(recordsPath, { version: DATA_VERSION, records: [] });
    }
  }

  function readRecords() {
    init();
    const data = readJson(recordsPath, { version: DATA_VERSION, records: [] });
    return Array.isArray(data.records) ? data.records.map(sanitizeRecord) : [];
  }

  function writeRecords(records) {
    writeJson(recordsPath, {
      version: DATA_VERSION,
      updatedAt: nowIso(),
      records: records.map(sanitizeRecord)
    });
  }

  function listRecords(filters = {}) {
    const query = String(filters.query || "").trim().toLowerCase();
    const mood = String(filters.mood || "");
    const month = String(filters.month || "");
    const hasImages = String(filters.hasImages || "");
    const tag = String(filters.tag || "").trim();
    const favorite = Boolean(filters.favorite);
    const dateFrom = String(filters.dateFrom || "");
    const dateTo = String(filters.dateTo || "");
    return readRecords()
      .filter((record) => {
        const matchesMood = !mood || record.mood === mood;
        const matchesMonth = !month || String(record.createdAt || "").slice(0, 7) === month;
        const imageCount = Array.isArray(record.attachments) ? record.attachments.length : 0;
        const matchesImages = !hasImages || (hasImages === "yes" ? imageCount > 0 : imageCount === 0);
        const day = String(record.createdAt || "").slice(0, 10);
        const matchesDateFrom = !dateFrom || day >= dateFrom;
        const matchesDateTo = !dateTo || day <= dateTo;
        const matchesTag = !tag || record.tags.includes(tag);
        const matchesFavorite = !favorite || record.favorite;
        const text = `${record.text} ${record.tags.join(" ")} ${record.location}`.toLowerCase();
        return matchesMood && matchesMonth && matchesImages && matchesTag && matchesFavorite &&
          matchesDateFrom && matchesDateTo && (!query || text.includes(query));
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  function thumbnailNameFor(filename) {
    const safeName = path.basename(String(filename || ""));
    const parsed = path.parse(safeName);
    return `${parsed.name || safeName}.jpg`;
  }

  function tryCreateThumbnail(sourcePath, filename) {
    if (!createThumbnail) return;
    const thumbnailPath = path.join(thumbnailsDir, thumbnailNameFor(filename));
    try {
      createThumbnail(sourcePath, thumbnailPath);
    } catch (_error) {
      try {
        fs.rmSync(thumbnailPath, { force: true });
      } catch (_cleanupError) {
        // A missing or partial thumbnail should never block saving a record.
      }
    }
  }

  function copyAttachments(filePaths = []) {
    init();
    return filePaths.slice(0, 9).map((filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(ext)) {
        throw new Error("仅支持常见图片格式");
      }
      const filename = `${createId("img")}${ext}`;
      const targetPath = path.join(attachmentsDir, filename);
      fs.copyFileSync(filePath, targetPath);
      tryCreateThumbnail(targetPath, filename);
      return filename;
    });
  }

  function createRecord(input) {
    const text = String(input.text || "").trim();
    if (!text && (!input.imagePaths || input.imagePaths.length === 0)) {
      throw new Error("写点文字或添加图片后再发布");
    }
    const attachments = copyAttachments(input.imagePaths || []);
    const record = sanitizeRecord({
      id: createId("post"),
      text,
      mood: input.mood,
      tags: input.tags,
      attachments,
      location: input.location,
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
    const records = readRecords();
    records.push(record);
    writeRecords(records);
    return record;
  }

  function updateRecord(id, input) {
    const records = readRecords();
    const index = records.findIndex((record) => record.id === id);
    if (index === -1) throw new Error("记录不存在");
    const existing = records[index];
    const keptAttachments = Array.isArray(input.keepAttachments)
      ? input.keepAttachments.filter((name) => existing.attachments.includes(name))
      : existing.attachments;
    const addedAttachments = copyAttachments(input.imagePaths || []);
    const next = sanitizeRecord({
      ...existing,
      text: input.text,
      mood: input.mood,
      tags: input.tags,
      attachments: [...keptAttachments, ...addedAttachments].slice(0, 9),
      favorite: Object.prototype.hasOwnProperty.call(input, "favorite") ? input.favorite : existing.favorite,
      location: input.location,
      updatedAt: nowIso()
    });
    if (!next.text && next.attachments.length === 0) {
      throw new Error("记录不能为空");
    }
    records[index] = next;
    writeRecords(records);
    return next;
  }

  function toggleFavorite(id) {
    const records = readRecords();
    const index = records.findIndex((record) => record.id === id);
    if (index === -1) throw new Error("记录不存在");
    const next = sanitizeRecord({
      ...records[index],
      favorite: !records[index].favorite,
      updatedAt: nowIso()
    });
    records[index] = next;
    writeRecords(records);
    return next;
  }

  function toggleLike(id) {
    const records = readRecords();
    const index = records.findIndex((record) => record.id === id);
    if (index === -1) throw new Error("记录不存在");
    const liked = !records[index].liked;
    const next = sanitizeRecord({
      ...records[index],
      liked,
      likeCount: liked ? 1 : 0,
      updatedAt: nowIso()
    });
    records[index] = next;
    writeRecords(records);
    return next;
  }

  function deleteRecord(id) {
    const records = readRecords();
    const next = records.filter((record) => record.id !== id);
    if (next.length === records.length) throw new Error("记录不存在");
    writeRecords(next);
    return { ok: true };
  }

  function exportData(targetPath) {
    const data = {
      version: DATA_VERSION,
      exportedAt: nowIso(),
      records: readRecords()
    };
    writeJson(targetPath, data);
    return { ok: true, path: targetPath };
  }

  function resolveAttachment(filename) {
    const safeName = path.basename(String(filename || ""));
    const fullPath = path.join(attachmentsDir, safeName);
    if (!fullPath.startsWith(attachmentsDir)) throw new Error("附件路径无效");
    return fullPath;
  }

  function resolveThumbnail(filename) {
    const thumbnailPath = path.join(thumbnailsDir, thumbnailNameFor(filename));
    if (!thumbnailPath.startsWith(thumbnailsDir)) throw new Error("缩略图路径无效");
    if (!fs.existsSync(thumbnailPath) && createThumbnail) {
      tryCreateThumbnail(resolveAttachment(filename), filename);
    }
    return fs.existsSync(thumbnailPath) ? thumbnailPath : resolveAttachment(filename);
  }

  return {
    paths: { dataDir, attachmentsDir, thumbnailsDir, recordsPath },
    init,
    listRecords,
    createRecord,
    updateRecord,
    toggleFavorite,
    toggleLike,
    deleteRecord,
    exportData,
    resolveAttachment,
    resolveThumbnail
  };
}

module.exports = {
  createStore,
  normalizeTags,
  normalizeMood
};
