"use strict";

const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");

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

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "private-moments-input-"));
  const preloadPath = path.join(tempDir, "preload.js");
  fs.writeFileSync(preloadPath, `
    "use strict";
    const { contextBridge } = require("electron");
    let pastedImages = 0;
    let clipboardHasImage = false;
    contextBridge.exposeInMainWorld("privateMoments", {
      enter: async () => ({ ok: true }),
      lock: async () => ({ ok: true }),
      chooseImages: async () => [],
      pasteImages: async () => {
        pastedImages += 1;
        return ["/tmp/pasted-smoke-image.png"];
      },
      clipboardHasImage: async () => clipboardHasImage,
      pastedImageCount: () => pastedImages,
      setSmokeClipboardHasImage: (value) => {
        clipboardHasImage = Boolean(value);
      },
      listRecords: async () => [],
      createRecord: async (input) => ({ id: "test", attachments: [], tags: [], liked: false, favorite: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...input }),
      updateRecord: async (_id, input) => ({ id: "test", attachments: [], tags: [], liked: false, favorite: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...input }),
      toggleFavorite: async () => ({ id: "test", favorite: true, liked: false, likeCount: 0, attachments: [], tags: [], createdAt: new Date().toISOString() }),
      toggleLike: async () => ({ id: "test", favorite: false, liked: true, likeCount: 1, attachments: [], tags: [], createdAt: new Date().toISOString() }),
      deleteRecord: async () => ({ ok: true }),
      exportJson: async () => ({ ok: true }),
      attachmentUrl: () => "",
      thumbnailUrl: () => "",
      localImageUrl: () => "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      filePathFor: () => ""
    });
  `, "utf8");
  await app.whenReady();
  const win = new BrowserWindow({
    width: 900,
    height: 680,
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  await win.loadFile(path.join(root, "src", "renderer", "index.html"));
  await waitForSelector(win, "#enter-app");
  await win.webContents.executeJavaScript("document.querySelector('#enter-app').click()");
  await waitForSelector(win, "#record-text");
  await win.webContents.executeJavaScript("document.querySelector('#record-text').focus()");
  win.webContents.sendInputEvent({ type: "char", keyCode: "可" });
  win.webContents.sendInputEvent({ type: "char", keyCode: "以" });
  win.webContents.sendInputEvent({ type: "char", keyCode: "写" });
  await delay(100);
  const result = await win.webContents.executeJavaScript(`({
    value: document.querySelector("#record-text")?.value || "",
    activeId: document.activeElement?.id || "",
    disabled: Boolean(document.querySelector("#record-text")?.disabled),
    readOnly: Boolean(document.querySelector("#record-text")?.readOnly),
    pointerEvents: getComputedStyle(document.querySelector("#record-text")).pointerEvents
  })`);
  if (result.value !== "可以写") {
    throw new Error(`Composer input failed: ${JSON.stringify(result)}`);
  }
  await win.webContents.executeJavaScript(`
    window.privateMoments.setSmokeClipboardHasImage(true);
    const event = new KeyboardEvent("keydown", {
      key: "v",
      metaKey: true,
      bubbles: true,
      cancelable: true
    });
    document.querySelector("#record-text").dispatchEvent(event);
  `);
  await delay(200);
  const pasteResult = await win.webContents.executeJavaScript(`({
    pastedImageCount: window.privateMoments.pastedImageCount(),
    previewCount: document.querySelectorAll(".composer-preview img").length
  })`);
  if (pasteResult.pastedImageCount !== 1 || pasteResult.previewCount !== 1) {
    throw new Error(`Image paste failed: ${JSON.stringify(pasteResult)}`);
  }
  console.log("input smoke test passed");
  win.close();
  app.quit();
}

main().catch((error) => {
  console.error(error);
  app.quit();
  process.exitCode = 1;
});
