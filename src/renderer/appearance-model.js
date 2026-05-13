"use strict";

(function initAppearanceModel(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.privateMomentsAppearance = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  const INTERFACE_SCALE = { min: 90, max: 120, step: 5, default: 100 };

  const THEME_OPTIONS = [
    { id: "warm", label: "暖砂" },
    { id: "moss", label: "林下" },
    { id: "mist", label: "雾蓝" },
    { id: "rose", label: "旧笺" },
    { id: "dark", label: "夜色" }
  ];
  const BACKDROP_OPTIONS = [
    { id: "solid", label: "纯色" },
    { id: "glow", label: "窗光" },
    { id: "grid", label: "淡格" },
    { id: "shade", label: "窗影" },
    { id: "paper", label: "棉纸" }
  ];
  const FONT_OPTIONS = [
    { id: "system", label: "系统" },
    { id: "serif", label: "宋体" },
    { id: "rounded", label: "圆体" }
  ];
  const APPEARANCE_MODE_OPTIONS = [
    { id: "system", label: "跟随系统" },
    { id: "light", label: "浅色" },
    { id: "dark", label: "深色" }
  ];
  const ACCENT_OPTIONS = [
    { id: "forest", label: "松绿" },
    { id: "ocean", label: "雾蓝" },
    { id: "rosewood", label: "粉棕" },
    { id: "amber", label: "琥珀" },
    { id: "graphite", label: "石墨" },
    { id: "sage", label: "鼠尾草" }
  ];
  const FEED_STYLE_OPTIONS = [
    { id: "journal", label: "日志卡片" },
    { id: "moments", label: "朋友圈" }
  ];
  const FEED_DENSITY_OPTIONS = [
    { id: "compact", label: "紧凑" },
    { id: "comfortable", label: "标准" },
    { id: "relaxed", label: "舒展" }
  ];
  const CONTENT_TEXT_SIZE_OPTIONS = [
    { id: "small", label: "小" },
    { id: "standard", label: "标准" },
    { id: "large", label: "大" },
    { id: "xlarge", label: "特大" }
  ];
  const CONTENT_LINE_HEIGHT_OPTIONS = [
    { id: "compact", label: "紧凑" },
    { id: "standard", label: "标准" },
    { id: "loose", label: "舒展" }
  ];
  const BACKGROUND_TYPE_OPTIONS = [
    { id: "pattern", label: "图案" },
    { id: "solid", label: "纯色" }
  ];

  const DEFAULT_APPEARANCE = {
    appearancePreset: "calm",
    appearanceMode: "system",
    accent: "forest",
    feedStyle: "journal",
    feedDensity: "comfortable",
    contentTextSize: "standard",
    contentLineHeight: "standard",
    backgroundType: "pattern",
    backgroundStrength: 55,
    theme: "warm",
    backdrop: "glow",
    font: "system",
    interfaceScale: INTERFACE_SCALE.default
  };

  const APPEARANCE_PRESETS = [
    {
      id: "calm",
      label: "安静",
      description: "柔和浅色，保留现在的安静感",
      settings: { ...DEFAULT_APPEARANCE }
    },
    {
      id: "fresh",
      label: "清爽",
      description: "干净纯色，减少背景干扰",
      settings: {
        appearanceMode: "light",
        accent: "ocean",
        feedStyle: "journal",
        feedDensity: "comfortable",
        contentTextSize: "standard",
        contentLineHeight: "standard",
        backgroundType: "solid",
        backgroundStrength: 0,
        theme: "mist",
        backdrop: "solid",
        font: "system"
      }
    },
    {
      id: "journal",
      label: "手帐",
      description: "纸感背景、宋体正文和更松的阅读节奏",
      settings: {
        appearanceMode: "light",
        accent: "rosewood",
        feedStyle: "journal",
        feedDensity: "relaxed",
        contentTextSize: "large",
        contentLineHeight: "loose",
        backgroundType: "pattern",
        backgroundStrength: 48,
        theme: "rose",
        backdrop: "paper",
        font: "serif"
      }
    },
    {
      id: "moments",
      label: "朋友圈",
      description: "更像自己的私密朋友圈",
      settings: {
        appearanceMode: "light",
        accent: "forest",
        feedStyle: "moments",
        feedDensity: "compact",
        contentTextSize: "standard",
        contentLineHeight: "standard",
        backgroundType: "solid",
        backgroundStrength: 0,
        theme: "moss",
        backdrop: "solid",
        font: "system"
      }
    },
    {
      id: "minimal",
      label: "极简",
      description: "低装饰、高留白，适合长期回看",
      settings: {
        appearanceMode: "light",
        accent: "graphite",
        feedStyle: "journal",
        feedDensity: "compact",
        contentTextSize: "standard",
        contentLineHeight: "compact",
        backgroundType: "solid",
        backgroundStrength: 0,
        theme: "mist",
        backdrop: "solid",
        font: "system"
      }
    },
    {
      id: "night",
      label: "夜间",
      description: "低光深色，晚一点也不刺眼",
      settings: {
        appearanceMode: "dark",
        accent: "sage",
        feedStyle: "journal",
        feedDensity: "relaxed",
        contentTextSize: "standard",
        contentLineHeight: "loose",
        backgroundType: "pattern",
        backgroundStrength: 42,
        theme: "dark",
        backdrop: "glow",
        font: "system"
      }
    }
  ];

  const STORAGE_KEYS = {
    appearancePreset: "privateMomentsAppearancePreset",
    appearanceMode: "privateMomentsAppearanceMode",
    accent: "privateMomentsAccent",
    feedStyle: "privateMomentsFeedStyle",
    feedDensity: "privateMomentsFeedDensity",
    contentTextSize: "privateMomentsContentTextSize",
    contentLineHeight: "privateMomentsContentLineHeight",
    backgroundType: "privateMomentsBackgroundType",
    backgroundStrength: "privateMomentsBackgroundStrength",
    theme: "privateMomentsTheme",
    backdrop: "privateMomentsBackdrop",
    font: "privateMomentsFont",
    interfaceScale: "privateMomentsInterfaceScale"
  };

  function optionIds(options) {
    return options.map((option) => option.id);
  }

  function hasOption(options, id) {
    return optionIds(options).includes(id);
  }

  function normalizeOption(options, value, fallback) {
    return hasOption(options, value) ? value : fallback;
  }

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  }

  function clampInterfaceScale(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return INTERFACE_SCALE.default;
    const stepped = Math.round(number / INTERFACE_SCALE.step) * INTERFACE_SCALE.step;
    return Math.min(INTERFACE_SCALE.max, Math.max(INTERFACE_SCALE.min, stepped));
  }

  function normalizeAppearance(input = {}) {
    return {
      appearancePreset: normalizeOption(APPEARANCE_PRESETS, input.appearancePreset, DEFAULT_APPEARANCE.appearancePreset),
      appearanceMode: normalizeOption(APPEARANCE_MODE_OPTIONS, input.appearanceMode, DEFAULT_APPEARANCE.appearanceMode),
      accent: normalizeOption(ACCENT_OPTIONS, input.accent, DEFAULT_APPEARANCE.accent),
      feedStyle: normalizeOption(FEED_STYLE_OPTIONS, input.feedStyle, DEFAULT_APPEARANCE.feedStyle),
      feedDensity: normalizeOption(FEED_DENSITY_OPTIONS, input.feedDensity, DEFAULT_APPEARANCE.feedDensity),
      contentTextSize: normalizeOption(CONTENT_TEXT_SIZE_OPTIONS, input.contentTextSize, DEFAULT_APPEARANCE.contentTextSize),
      contentLineHeight: normalizeOption(CONTENT_LINE_HEIGHT_OPTIONS, input.contentLineHeight, DEFAULT_APPEARANCE.contentLineHeight),
      backgroundType: normalizeOption(BACKGROUND_TYPE_OPTIONS, input.backgroundType, DEFAULT_APPEARANCE.backgroundType),
      backgroundStrength: Math.round(clampNumber(input.backgroundStrength, 0, 100, DEFAULT_APPEARANCE.backgroundStrength)),
      theme: normalizeOption(THEME_OPTIONS, input.theme, DEFAULT_APPEARANCE.theme),
      backdrop: normalizeOption(BACKDROP_OPTIONS, input.backdrop, DEFAULT_APPEARANCE.backdrop),
      font: normalizeOption(FONT_OPTIONS, input.font, DEFAULT_APPEARANCE.font),
      interfaceScale: clampInterfaceScale(input.interfaceScale)
    };
  }

  function applyAppearancePreset(current, presetId) {
    const preset = APPEARANCE_PRESETS.find((item) => item.id === presetId) || APPEARANCE_PRESETS[0];
    return normalizeAppearance({
      ...current,
      ...preset.settings,
      appearancePreset: preset.id
    });
  }

  function readAppearance(storage) {
    const saved = Object.fromEntries(
      Object.entries(STORAGE_KEYS).map(([key, storageKey]) => [key, storage.getItem(storageKey)])
    );
    if (saved.interfaceScale === null) {
      const legacyTextSize = storage.getItem("privateMomentsTextSize");
      if (legacyTextSize === "small") saved.interfaceScale = 90;
      if (legacyTextSize === "large") saved.interfaceScale = 110;
    }
    return normalizeAppearance(saved);
  }

  function writeAppearance(storage, appearance) {
    const normalized = normalizeAppearance(appearance);
    Object.entries(STORAGE_KEYS).forEach(([key, storageKey]) => {
      storage.setItem(storageKey, normalized[key]);
    });
    storage.removeItem("privateMomentsTextSize");
    return normalized;
  }

  function effectiveTheme(appearance, systemPrefersDark = false) {
    const normalized = normalizeAppearance(appearance);
    if (normalized.appearanceMode === "dark") return "dark";
    if (normalized.appearanceMode === "system" && systemPrefersDark) return "dark";
    return normalized.theme === "dark" ? "warm" : normalized.theme;
  }

  return {
    ACCENT_OPTIONS,
    APPEARANCE_MODE_OPTIONS,
    APPEARANCE_PRESETS,
    BACKDROP_OPTIONS,
    BACKGROUND_TYPE_OPTIONS,
    CONTENT_LINE_HEIGHT_OPTIONS,
    CONTENT_TEXT_SIZE_OPTIONS,
    DEFAULT_APPEARANCE,
    FEED_DENSITY_OPTIONS,
    FEED_STYLE_OPTIONS,
    FONT_OPTIONS,
    INTERFACE_SCALE,
    STORAGE_KEYS,
    THEME_OPTIONS,
    applyAppearancePreset,
    clampInterfaceScale,
    effectiveTheme,
    normalizeAppearance,
    readAppearance,
    writeAppearance
  };
});
