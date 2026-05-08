"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { app, BrowserWindow } = require("electron");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "docs", "images");
const preloadSource = `
"use strict";

const { contextBridge } = require("electron");

const svg = (a, b, c) => "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">' +
  '<rect width="640" height="640" fill="' + a + '"/>' +
  '<circle cx="488" cy="150" r="94" fill="' + b + '" opacity=".92"/>' +
  '<path d="M84 500c88-144 146-184 216-120 66 60 112 46 180-44 42-56 76-56 118 0v220H84z" fill="' + c + '" opacity=".9"/>' +
  '<path d="M0 0h640v640H0z" fill="none" stroke="rgba(255,255,255,.48)" stroke-width="22"/>' +
  '</svg>'
);

const images = {
  "window-light.png": svg("#e6efe8", "#f2b36d", "#316b57"),
  "desk-note.png": svg("#f5ead6", "#88a79a", "#c08348"),
  "evening-walk.png": svg("#dbe5ee", "#e5a07b", "#557391"),
  "tiny-plant.png": svg("#edf3df", "#e0c771", "#597f5d"),
  "rain-glass.png": svg("#dbe2e9", "#7f96a9", "#495b70")
};

const records = [
  {
    id: "r1",
    text: "上午把房间的窗帘拉开，光正好落在桌面。今天想把节奏放慢一点，先写完最重要的两件事。",
    mood: "calm",
    tags: ["独处", "早晨", "整理"],
    location: "家里的书桌",
    attachments: ["window-light.png", "desk-note.png"],
    favorite: true,
    liked: true,
    likeCount: 3,
    createdAt: "2026-05-07T09:26:00.000Z",
    updatedAt: "2026-05-07T09:26:00.000Z"
  },
  {
    id: "r2",
    text: "傍晚出门走了一圈，没有和谁说话，但耳机里的歌很合适。路边的风把一天轻轻翻过去。",
    mood: "happy",
    tags: ["散步", "音乐"],
    location: "小区外的路口",
    attachments: ["evening-walk.png"],
    favorite: false,
    liked: false,
    likeCount: 1,
    createdAt: "2026-05-06T11:42:00.000Z",
    updatedAt: "2026-05-06T11:42:00.000Z"
  },
  {
    id: "r3",
    text: "给植物换了水，也顺手把旧便签清掉。桌面变空以后，脑子也像腾出了一小格。",
    mood: "inspired",
    tags: ["植物", "整理", "灵感"],
    location: "",
    attachments: ["tiny-plant.png"],
    favorite: true,
    liked: true,
    likeCount: 4,
    createdAt: "2026-05-04T14:18:00.000Z",
    updatedAt: "2026-05-04T14:18:00.000Z"
  },
  {
    id: "r4",
    text: "下雨，窗玻璃上都是细细的水线。适合把计划拆小，也适合早点休息。",
    mood: "tired",
    tags: ["雨天", "休息"],
    location: "卧室",
    attachments: ["rain-glass.png"],
    favorite: false,
    liked: false,
    likeCount: 0,
    createdAt: "2026-05-02T13:05:00.000Z",
    updatedAt: "2026-05-02T13:05:00.000Z"
  },
  {
    id: "r5",
    text: "午后读了三页书，只有三页，但也算向自己靠近了一点。",
    mood: "calm",
    tags: ["阅读", "独处"],
    location: "",
    attachments: [],
    favorite: false,
    liked: true,
    likeCount: 2,
    createdAt: "2026-04-29T07:30:00.000Z",
    updatedAt: "2026-04-29T07:30:00.000Z"
  }
];

const sortRecords = (items) => [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
const includes = (value, query) => String(value || "").toLowerCase().includes(query);

function listRecords(filters = {}) {
  const query = String(filters.query || "").trim().toLowerCase();
  return sortRecords(records.filter((record) => {
    if (filters.favorite && !record.favorite) return false;
    if (filters.mood && record.mood !== filters.mood) return false;
    if (filters.tag && !record.tags.includes(filters.tag)) return false;
    if (filters.dateFrom && record.createdAt.slice(0, 10) < filters.dateFrom) return false;
    if (filters.dateTo && record.createdAt.slice(0, 10) > filters.dateTo) return false;
    if (!query) return true;
    return includes(record.text, query) || includes(record.location, query) || record.tags.some((tag) => includes(tag, query));
  }));
}

contextBridge.exposeInMainWorld("privateMoments", {
  enter: async () => ({ ok: true }),
  lock: async () => ({ ok: true }),
  chooseImages: async () => [],
  pasteImages: async () => [],
  listRecords: async (filters) => listRecords(filters),
  createRecord: async () => records[0],
  updateRecord: async () => records[0],
  toggleFavorite: async () => records[0],
  toggleLike: async () => ({ liked: true }),
  deleteRecord: async () => true,
  exportJson: async () => ({ ok: true }),
  attachmentUrl: (name) => images[name] || images["window-light.png"],
  localImageUrl: () => images["desk-note.png"]
});
`;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForSelector(win, selector) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const exists = await win.webContents.executeJavaScript(`Boolean(document.querySelector(${JSON.stringify(selector)}))`);
    if (exists) return;
    await delay(50);
  }
  throw new Error(`Timed out waiting for ${selector}`);
}

async function click(win, selector) {
  await win.webContents.executeJavaScript(`document.querySelector(${JSON.stringify(selector)})?.click()`);
  await delay(450);
}

async function screenshot(win, filename) {
  const image = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outputDir, filename), image.resize({ width: 1080 }).toPNG());
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "private-moments-readme-"));
  const preloadPath = path.join(tempDir, "preload.js");
  fs.writeFileSync(preloadPath, preloadSource, "utf8");

  await app.whenReady();
  const win = new BrowserWindow({
    width: 1080,
    height: 720,
    show: false,
    resizable: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await win.loadFile(path.join(root, "src", "renderer", "index.html"));
  await waitForSelector(win, "#enter-app");
  await click(win, "#enter-app");
  await waitForSelector(win, ".app-frame");
  await screenshot(win, "log-timeline.png");

  await click(win, '[data-side-panel="search"]');
  await screenshot(win, "log-search.png");

  await click(win, '[data-side-panel="appearance"]');
  await screenshot(win, "log-appearance.png");

  await click(win, '[data-nav-view="calendar"]');
  await screenshot(win, "log-calendar.png");

  win.close();
  await app.quit();
}

main().catch((error) => {
  console.error(error);
  app.exit(1);
});
