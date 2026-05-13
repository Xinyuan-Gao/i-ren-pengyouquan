"use strict";

const { contextBridge, ipcRenderer, webUtils } = require("electron");

function fileUrlFor(filePath) {
  return `file://${String(filePath || "")
    .split("/")
    .map((part, index) => (index === 0 ? part : encodeURIComponent(part)))
    .join("/")}`;
}

contextBridge.exposeInMainWorld("privateMoments", {
  enter: () => ipcRenderer.invoke("auth:enter"),
  lock: () => ipcRenderer.invoke("auth:lock"),
  chooseImages: () => ipcRenderer.invoke("images:choose"),
  pasteImages: () => ipcRenderer.invoke("images:paste"),
  clipboardHasImage: () => ipcRenderer.invoke("images:clipboard-has-image"),
  listRecords: (filters) => ipcRenderer.invoke("records:list", filters),
  createRecord: (input) => ipcRenderer.invoke("records:create", input),
  updateRecord: (id, input) => ipcRenderer.invoke("records:update", id, input),
  toggleFavorite: (id) => ipcRenderer.invoke("records:toggle-favorite", id),
  toggleLike: (id) => ipcRenderer.invoke("records:toggle-like", id),
  deleteRecord: (id) => ipcRenderer.invoke("records:delete", id),
  exportJson: () => ipcRenderer.invoke("records:export"),
  attachmentUrl: (filename) => `private-attachment://${encodeURIComponent(filename)}`,
  thumbnailUrl: (filename) => `private-thumbnail://${encodeURIComponent(filename)}`,
  localImageUrl: fileUrlFor,
  filePathFor: (file) => {
    if (webUtils && typeof webUtils.getPathForFile === "function") return webUtils.getPathForFile(file);
    return file && typeof file.path === "string" ? file.path : "";
  }
});
