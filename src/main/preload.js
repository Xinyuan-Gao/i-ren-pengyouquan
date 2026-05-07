"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("privateMoments", {
  enter: () => ipcRenderer.invoke("auth:enter"),
  lock: () => ipcRenderer.invoke("auth:lock"),
  chooseImages: () => ipcRenderer.invoke("images:choose"),
  pasteImages: () => ipcRenderer.invoke("images:paste"),
  listRecords: (filters) => ipcRenderer.invoke("records:list", filters),
  createRecord: (input) => ipcRenderer.invoke("records:create", input),
  updateRecord: (id, input) => ipcRenderer.invoke("records:update", id, input),
  toggleFavorite: (id) => ipcRenderer.invoke("records:toggle-favorite", id),
  toggleLike: (id) => ipcRenderer.invoke("records:toggle-like", id),
  deleteRecord: (id) => ipcRenderer.invoke("records:delete", id),
  exportJson: () => ipcRenderer.invoke("records:export"),
  attachmentUrl: (filename) => `private-attachment://${encodeURIComponent(filename)}`,
  localImageUrl: (filePath) => `file://${encodeURI(filePath)}`
});
