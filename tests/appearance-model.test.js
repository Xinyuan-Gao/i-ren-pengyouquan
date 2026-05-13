"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const appearance = require("../src/renderer/appearance-model");

function makeStorage(seed = {}) {
  const store = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    entries() {
      return Object.fromEntries(store.entries());
    }
  };
}

test("appearance defaults expose the richer workbench controls", () => {
  assert.equal(appearance.DEFAULT_APPEARANCE.appearancePreset, "calm");
  assert.equal(appearance.DEFAULT_APPEARANCE.appearanceMode, "system");
  assert.equal(appearance.DEFAULT_APPEARANCE.accent, "forest");
  assert.equal(appearance.DEFAULT_APPEARANCE.feedStyle, "journal");
  assert.equal(appearance.DEFAULT_APPEARANCE.feedDensity, "comfortable");
  assert.equal(appearance.DEFAULT_APPEARANCE.contentTextSize, "standard");
  assert.equal(appearance.DEFAULT_APPEARANCE.contentLineHeight, "standard");
  assert.equal(appearance.DEFAULT_APPEARANCE.backgroundType, "pattern");
  assert.equal(appearance.DEFAULT_APPEARANCE.backgroundStrength, 55);

  assert.deepEqual(
    appearance.APPEARANCE_PRESETS.map((preset) => preset.id),
    ["calm", "fresh", "journal", "moments", "minimal", "night"]
  );
});

test("backdrop options use refined product-facing names while keeping stable ids", () => {
  assert.deepEqual(
    appearance.BACKDROP_OPTIONS.map((option) => [option.id, option.label]),
    [
      ["solid", "纯色"],
      ["glow", "窗光"],
      ["grid", "淡格"],
      ["shade", "窗影"],
      ["paper", "棉纸"]
    ]
  );
});

test("appearance presets apply concrete visual settings", () => {
  const moments = appearance.applyAppearancePreset(
    { ...appearance.DEFAULT_APPEARANCE, contentTextSize: "large" },
    "moments"
  );

  assert.equal(moments.appearancePreset, "moments");
  assert.equal(moments.appearanceMode, "light");
  assert.equal(moments.feedStyle, "moments");
  assert.equal(moments.feedDensity, "compact");
  assert.equal(moments.backdrop, "solid");
  assert.equal(moments.backgroundType, "solid");
  assert.equal(moments.backgroundStrength, 0);
  assert.equal(moments.contentTextSize, "standard");

  const night = appearance.applyAppearancePreset(appearance.DEFAULT_APPEARANCE, "night");
  assert.equal(night.appearanceMode, "dark");
  assert.equal(night.accent, "sage");
  assert.equal(night.feedDensity, "relaxed");
});

test("appearance normalization keeps bad stored values from reaching the UI", () => {
  const normalized = appearance.normalizeAppearance({
    appearanceMode: "neon",
    accent: "forest",
    feedStyle: "unknown",
    feedDensity: "relaxed",
    contentTextSize: "huge",
    contentLineHeight: "loose",
    backgroundType: "photo",
    backgroundStrength: 187,
    interfaceScale: 88,
    theme: "missing-theme",
    backdrop: "paper",
    font: "rounded"
  });

  assert.equal(normalized.appearanceMode, "system");
  assert.equal(normalized.accent, "forest");
  assert.equal(normalized.feedStyle, "journal");
  assert.equal(normalized.feedDensity, "relaxed");
  assert.equal(normalized.contentTextSize, "standard");
  assert.equal(normalized.contentLineHeight, "loose");
  assert.equal(normalized.backgroundType, "pattern");
  assert.equal(normalized.backgroundStrength, 100);
  assert.equal(normalized.interfaceScale, 90);
  assert.equal(normalized.theme, "warm");
  assert.equal(normalized.backdrop, "paper");
  assert.equal(normalized.font, "rounded");
});

test("appearance settings round-trip through localStorage keys", () => {
  const storage = makeStorage({
    privateMomentsAppearancePreset: "journal",
    privateMomentsAppearanceMode: "dark",
    privateMomentsAccent: "rosewood",
    privateMomentsFeedStyle: "moments",
    privateMomentsFeedDensity: "compact",
    privateMomentsContentTextSize: "large",
    privateMomentsContentLineHeight: "loose",
    privateMomentsBackgroundType: "solid",
    privateMomentsBackgroundStrength: "22",
    privateMomentsTheme: "rose",
    privateMomentsBackdrop: "grid",
    privateMomentsFont: "serif",
    privateMomentsInterfaceScale: "116"
  });

  const read = appearance.readAppearance(storage);
  assert.equal(read.appearancePreset, "journal");
  assert.equal(read.appearanceMode, "dark");
  assert.equal(read.accent, "rosewood");
  assert.equal(read.interfaceScale, 115);

  appearance.writeAppearance(storage, {
    ...read,
    appearancePreset: "minimal",
    backgroundStrength: 7,
    interfaceScale: 103
  });

  assert.equal(storage.getItem("privateMomentsAppearancePreset"), "minimal");
  assert.equal(storage.getItem("privateMomentsBackgroundStrength"), "7");
  assert.equal(storage.getItem("privateMomentsInterfaceScale"), "105");
  assert.equal(storage.getItem("privateMomentsTextSize"), null);
});
