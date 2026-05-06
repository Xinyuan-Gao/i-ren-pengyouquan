"use strict";

const { app, BrowserWindow, dialog, ipcMain, protocol, net, screen } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");
const { APP_NAME } = require("../shared/constants");
const { createStore } = require("./storage");

let mainWindow;
let store;
let unlocked = false;

const WINDOW_SIZE = {
  width: 1080,
  height: 720,
  minWidth: 860,
  minHeight: 600,
  maxWidth: 1180,
  maxHeight: 820
};

function requireUnlocked() {
  if (!unlocked) throw new Error("请先解锁");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: WINDOW_SIZE.width,
    height: WINDOW_SIZE.height,
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
    mainWindow.setBounds({
      width: Math.min(WINDOW_SIZE.width, workArea.width),
      height: Math.min(WINDOW_SIZE.height, workArea.height)
    });
    mainWindow.center();
    mainWindow.show();
  });
  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
}

function registerIpc() {
  ipcMain.handle("auth:status", () => store.getAuthStatus());
  ipcMain.handle("auth:set-password", (_event, password) => {
    const result = store.setPassword(password);
    unlocked = true;
    return result;
  });
  ipcMain.handle("auth:unlock", (_event, password) => {
    const result = store.unlock(password);
    unlocked = result.ok;
    return result;
  });
  ipcMain.handle("auth:lock", () => {
    unlocked = false;
    return { ok: true };
  });

  ipcMain.handle("images:choose", async () => {
    requireUnlocked();
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "选择图片",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "图片", extensions: ["jpg", "jpeg", "png", "gif", "webp", "bmp", "avif"] }]
    });
    return result.canceled ? [] : result.filePaths.slice(0, 9);
  });

  ipcMain.handle("records:list", (_event, filters) => {
    requireUnlocked();
    return store.listRecords(filters);
  });
  ipcMain.handle("records:create", (_event, input) => {
    requireUnlocked();
    return store.createRecord(input || {});
  });
  ipcMain.handle("records:update", (_event, id, input) => {
    requireUnlocked();
    return store.updateRecord(id, input || {});
  });
  ipcMain.handle("records:toggle-favorite", (_event, id) => {
    requireUnlocked();
    return store.toggleFavorite(id);
  });
  ipcMain.handle("records:toggle-like", (_event, id) => {
    requireUnlocked();
    return store.toggleLike(id);
  });
  ipcMain.handle("records:delete", (_event, id) => {
    requireUnlocked();
    return store.deleteRecord(id);
  });
  ipcMain.handle("records:export", async () => {
    requireUnlocked();
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
  store = createStore(app.getPath("userData"));
  store.init();

  protocol.handle("private-attachment", (request) => {
    const url = new URL(request.url);
    const filePath = store.resolveAttachment(decodeURIComponent(url.hostname || url.pathname.slice(1)));
    return net.fetch(pathToFileURL(filePath).toString());
  });

  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
