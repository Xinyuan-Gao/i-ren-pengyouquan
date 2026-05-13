"use strict";

const { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, protocol, net, screen } = require("electron");
const fs = require("fs");
const path = require("path");
const { fileURLToPath, pathToFileURL } = require("url");
const { APP_NAME } = require("../shared/constants");
const { createStore } = require("./storage");

let mainWindow;
let store;
let entered = false;
let windowStatePath;

const WINDOW_SIZE = {
  width: 840,
  height: 560,
  minWidth: 760,
  minHeight: 520,
  maxWidth: 1180,
  maxHeight: 820
};

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".avif"]);

function readWindowState() {
  try {
    const state = JSON.parse(fs.readFileSync(windowStatePath, "utf8"));
    const width = Number(state.width);
    const height = Number(state.height);
    const x = Number(state.x);
    const y = Number(state.y);
    if (!Number.isFinite(width) || !Number.isFinite(height)) return {};
    return {
      width: Math.max(WINDOW_SIZE.minWidth, Math.min(WINDOW_SIZE.maxWidth, Math.round(width))),
      height: Math.max(WINDOW_SIZE.minHeight, Math.min(WINDOW_SIZE.maxHeight, Math.round(height))),
      ...(Number.isFinite(x) && Number.isFinite(y) ? { x: Math.round(x), y: Math.round(y) } : {})
    };
  } catch (_error) {
    return {};
  }
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isMinimized()) return;
  const bounds = mainWindow.getBounds();
  fs.mkdirSync(path.dirname(windowStatePath), { recursive: true });
  fs.writeFileSync(windowStatePath, JSON.stringify(bounds, null, 2), "utf8");
}

function requireEntered() {
  if (!entered) throw new Error("请先进入朋友圈");
}

function createApplicationMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac ? [{
      label: APP_NAME,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" }
      ]
    }] : []),
    {
      label: "编辑",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "pasteAndMatchStyle" },
        { role: "delete" },
        { type: "separator" },
        { role: "selectAll" }
      ]
    },
    {
      label: "显示",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    {
      label: "窗口",
      submenu: [
        { role: "minimize" },
        ...(isMac ? [
          { role: "zoom" },
          { type: "separator" },
          { role: "front" }
        ] : [
          { role: "close" }
        ])
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  const savedBounds = readWindowState();
  mainWindow = new BrowserWindow({
    width: savedBounds.width || WINDOW_SIZE.width,
    height: savedBounds.height || WINDOW_SIZE.height,
    ...(Number.isFinite(savedBounds.x) && Number.isFinite(savedBounds.y) ? { x: savedBounds.x, y: savedBounds.y } : {}),
    minWidth: WINDOW_SIZE.minWidth,
    minHeight: WINDOW_SIZE.minHeight,
    maxWidth: WINDOW_SIZE.maxWidth,
    maxHeight: WINDOW_SIZE.maxHeight,
    title: APP_NAME,
    icon: path.join(__dirname, "../../assets/icon.png"),
    backgroundColor: "#f6f3ef",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.once("ready-to-show", () => {
    const workArea = screen.getDisplayMatching(mainWindow.getBounds()).workArea;
    mainWindow.unmaximize();
    const bounds = mainWindow.getBounds();
    mainWindow.setBounds({
      ...bounds,
      width: Math.min(bounds.width, workArea.width),
      height: Math.min(bounds.height, workArea.height)
    });
    if (!savedBounds.width || !savedBounds.height) mainWindow.center();
    mainWindow.show();
  });
  mainWindow.on("resize", saveWindowState);
  mainWindow.on("move", saveWindowState);
  mainWindow.on("close", saveWindowState);
  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    if (level < 2) return;
    console.error(`[renderer] ${sourceId}:${line} ${message}`);
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error(`[renderer] render process gone: ${details.reason}`);
  });
  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
}

function clipboardFilePaths() {
  const paths = [];
  if (process.platform === "darwin") {
    const fileUrl = clipboard.read("public.file-url");
    if (fileUrl) {
      paths.push(...fileUrl
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean)
        .flatMap((value) => {
          try {
            return [fileURLToPath(value)];
          } catch (_error) {
            return [];
          }
        }));
    }
  }
  if (process.platform === "win32") {
    const raw = clipboard.read("FileNameW");
    if (raw) paths.push(...raw.split(/\0+/).map((value) => value.trim()).filter(Boolean));
  }
  return paths.filter((filePath) => IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase()));
}

function registerIpc() {
  ipcMain.handle("auth:enter", () => {
    entered = true;
    return { ok: true };
  });
  ipcMain.handle("auth:lock", () => {
    entered = false;
    return { ok: true };
  });

  ipcMain.handle("images:choose", async () => {
    requireEntered();
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "选择图片",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "图片", extensions: ["jpg", "jpeg", "png", "gif", "webp", "bmp", "avif"] }]
    });
    return result.canceled ? [] : result.filePaths.slice(0, 9);
  });
  ipcMain.handle("images:paste", () => {
    requireEntered();
    const filePaths = clipboardFilePaths();
    if (filePaths.length) return filePaths.slice(0, 9);
    const image = clipboard.readImage();
    if (image.isEmpty()) return [];
    const pastedDir = path.join(app.getPath("temp"), "private-moments-pasted-images");
    fs.mkdirSync(pastedDir, { recursive: true });
    const filePath = path.join(pastedDir, `pasted-${Date.now()}.png`);
    fs.writeFileSync(filePath, image.toPNG());
    return [filePath];
  });

  ipcMain.handle("records:list", (_event, filters) => {
    requireEntered();
    return store.listRecords(filters);
  });
  ipcMain.handle("records:create", (_event, input) => {
    requireEntered();
    return store.createRecord(input || {});
  });
  ipcMain.handle("records:update", (_event, id, input) => {
    requireEntered();
    return store.updateRecord(id, input || {});
  });
  ipcMain.handle("records:toggle-favorite", (_event, id) => {
    requireEntered();
    return store.toggleFavorite(id);
  });
  ipcMain.handle("records:toggle-like", (_event, id) => {
    requireEntered();
    return store.toggleLike(id);
  });
  ipcMain.handle("records:delete", (_event, id) => {
    requireEntered();
    return store.deleteRecord(id);
  });
  ipcMain.handle("records:export", async () => {
    requireEntered();
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "导出 JSON",
      defaultPath: `private-moments-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: "JSON", extensions: ["json"] }]
    });
    if (result.canceled || !result.filePath) return { ok: false };
    return store.exportData(result.filePath);
  });
}

app.whenReady().then(() => {
  windowStatePath = path.join(app.getPath("userData"), "private-moments", "window-state.json");
  store = createStore(app.getPath("userData"));
  store.init();

  protocol.handle("private-attachment", (request) => {
    requireEntered();
    const url = new URL(request.url);
    const filePath = store.resolveAttachment(decodeURIComponent(url.hostname || url.pathname.slice(1)));
    return net.fetch(pathToFileURL(filePath).toString());
  });

  registerIpc();
  createApplicationMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
