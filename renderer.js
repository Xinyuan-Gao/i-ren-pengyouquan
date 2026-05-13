"use strict";

const api = window.privateMoments;
const appearanceModel = window.privateMomentsAppearance;
const APP_NAME = "i 人朋友圈";
const PROFILE = { name: "我", note: "仅自己可见", avatar: "我" };

const MOODS = [
  { id: "calm", label: "平静", icon: "☻", color: "#1f6f5b" },
  { id: "happy", label: "开心", icon: "☼", color: "#b87422" },
  { id: "tired", label: "疲惫", icon: "◐", color: "#69707a" },
  { id: "sad", label: "低落", icon: "☂", color: "#4f78b0" },
  { id: "inspired", label: "有灵感", icon: "✦", color: "#8d62a5" },
  { id: "angry", label: "烦躁", icon: "!", color: "#c35d62" }
];

const TOP_VIEWS = ["timeline", "calendar", "month"];
const SWIPE_VIEWS = ["timeline", "calendar", "month"];
const {
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
  THEME_OPTIONS
} = appearanceModel;

const state = {
  records: [],
  allRecords: [],
  query: "",
  mood: "",
  tag: "",
  dateFrom: "",
  dateTo: "",
  view: "timeline",
  month: toMonthKey(new Date()),
  selectedDay: toDateKey(new Date()),
  pendingImages: [],
  editing: null,
  keepAttachments: [],
  pendingLocate: "",
  draftText: "",
  draftTags: "",
  draftMood: "calm",
  draftLocation: "",
  sidePanel: "compose",
  imageViewer: null,
  ...DEFAULT_APPEARANCE,
  busy: false
};

const app = document.querySelector("#app");

function moodById(id) {
  return MOODS.find((mood) => mood.id === id) || MOODS[0];
}

function toDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function toMonthKey(value) {
  const date = toDate(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toDateKey(value) {
  const date = toDate(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthStart(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function shiftMonth(monthKey, delta) {
  const date = monthStart(monthKey);
  date.setMonth(date.getMonth() + delta);
  return toMonthKey(date);
}

function monthLabel(monthKey) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(monthStart(monthKey));
}

function formatTime(value) {
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(toDate(value));
}

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "short" }).format(toDate(value));
}

function weekdayShort(value) {
  return new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(toDate(value));
}

function imageName(filePath) {
  return String(filePath || "").split(/[\\/]/).filter(Boolean).pop() || "图片";
}

function isImageFile(file) {
  return file && (String(file.type || "").startsWith("image/") || /\.(avif|bmp|gif|jpe?g|png|webp)$/i.test(file.name || ""));
}

function isTextEntryTarget(target) {
  return Boolean(target?.closest?.("input, textarea, select, [contenteditable='true']"));
}

function filePathFor(file) {
  try {
    if (api.filePathFor) return api.filePathFor(file);
  } catch (_error) {
    return "";
  }
  return file && typeof file.path === "string" ? file.path : "";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toast(message, tone = "info") {
  const node = document.createElement("div");
  node.className = `toast ${tone}`;
  node.textContent = message;
  document.body.appendChild(node);
  window.setTimeout(() => node.remove(), 2600);
}

function setBusy(value) {
  state.busy = value;
  document.body.classList.toggle("is-busy", value);
}

async function run(action, successMessage) {
  try {
    setBusy(true);
    const result = await action();
    if (successMessage) toast(successMessage, "success");
    return result;
  } catch (error) {
    toast(error.message || "操作失败", "error");
    return null;
  } finally {
    setBusy(false);
  }
}

async function boot() {
  try {
    document.title = APP_NAME;
    Object.assign(state, appearanceModel.readAppearance(localStorage));
    applyAppearance();
    bindSystemAppearance();
    document.addEventListener("keydown", handleGlobalKeydown);
    document.addEventListener("paste", handleGlobalPaste);
    document.addEventListener("dragover", handleGlobalDragOver);
    document.addEventListener("drop", handleGlobalDrop);
    renderAuth();
  } catch (error) {
    renderFatalError(error);
  }
}

function renderFatalError(error) {
  console.error(error);
  app.innerHTML = `
    <section class="fatal-error">
      <h1>启动时遇到问题</h1>
      <p>${escapeHtml(error?.message || "未知错误")}</p>
    </section>
  `;
}

function appearanceState() {
  return {
    appearancePreset: state.appearancePreset,
    appearanceMode: state.appearanceMode,
    accent: state.accent,
    feedStyle: state.feedStyle,
    feedDensity: state.feedDensity,
    contentTextSize: state.contentTextSize,
    contentLineHeight: state.contentLineHeight,
    backgroundType: state.backgroundType,
    backgroundStrength: state.backgroundStrength,
    theme: state.theme,
    backdrop: state.backdrop,
    font: state.font,
    interfaceScale: state.interfaceScale
  };
}

function updateAppearance(next) {
  Object.assign(state, appearanceModel.normalizeAppearance({
    ...appearanceState(),
    ...next
  }));
}

function systemPrefersDark() {
  return Boolean(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

function bindSystemAppearance() {
  if (!window.matchMedia) return;
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const handleChange = () => {
    if (state.appearanceMode !== "system") return;
    applyAppearance();
  };
  if (query.addEventListener) query.addEventListener("change", handleChange);
  else if (query.addListener) query.addListener(handleChange);
}

function applyAppearance() {
  const normalized = appearanceModel.normalizeAppearance(appearanceState());
  Object.assign(state, normalized);
  document.body.dataset.theme = appearanceModel.effectiveTheme(normalized, systemPrefersDark());
  document.body.dataset.appearanceMode = state.appearanceMode;
  document.body.dataset.accent = state.accent;
  document.body.dataset.preset = state.appearancePreset;
  document.body.dataset.backdrop = state.backgroundType === "solid" ? "solid" : state.backdrop;
  document.body.dataset.backgroundType = state.backgroundType;
  document.body.dataset.backgroundStrength = String(state.backgroundStrength);
  document.body.dataset.font = state.font;
  document.body.dataset.feedStyle = state.feedStyle;
  document.body.dataset.feedDensity = state.feedDensity;
  document.body.dataset.contentSize = state.contentTextSize;
  document.body.dataset.contentLineHeight = state.contentLineHeight;
  document.body.dataset.interfaceScale = String(state.interfaceScale);
  document.body.style.setProperty("--ui-scale", String(state.interfaceScale / 100));
  document.body.style.setProperty("--backdrop-alpha", String(state.backgroundStrength / 100));
  appearanceModel.writeAppearance(localStorage, state);
}

function renderAuth() {
  document.body.classList.add("auth-mode");
  app.innerHTML = `
    <section class="auth-shell" id="enter-app" role="button" tabindex="0" aria-label="进入朋友圈">
      <p class="auth-enter-hint">轻点任意一处，让今天浮上来。</p>
    </section>
  `;

  const enterApp = async () => {
    const result = await run(() => api.enter());
    if (!result || !result.ok) return;
    await loadRecords();
    renderApp();
  };

  const shell = document.querySelector("#enter-app");
  shell.focus();
  shell.addEventListener("click", enterApp);
  shell.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    await enterApp();
  });
}

async function loadRecords() {
  const [records, allRecords] = await Promise.all([
    run(() => api.listRecords({
      query: state.query,
      mood: state.mood,
      tag: state.tag,
      dateFrom: state.dateFrom,
      dateTo: state.dateTo,
      favorite: state.view === "favorites"
    })),
    run(() => api.listRecords({}))
  ]);
  state.records = Array.isArray(records) ? records : [];
  state.allRecords = Array.isArray(allRecords) ? allRecords : [];
}

function allTags() {
  return [...new Set(state.allRecords.flatMap((record) => record.tags))].slice(0, 16);
}

function monthOptions() {
  const months = new Set(state.allRecords.map((record) => toMonthKey(record.createdAt)));
  months.add(state.month);
  return [...months].sort().reverse();
}

function recordsForMonth(monthKey = state.month, source = state.records) {
  return source.filter((record) => toMonthKey(record.createdAt) === monthKey);
}

function recordsForDay(dayKey) {
  return state.records.filter((record) => toDateKey(record.createdAt) === dayKey);
}

function renderApp() {
  document.body.classList.remove("auth-mode");
  app.innerHTML = `
    <div class="app-frame">
      ${renderRail()}
      <section class="compose-column">
        ${renderSidePanel()}
      </section>
      <main class="main-column">
        ${renderMainHeader()}
        <div class="feed-surface" data-swipe-stage>
          ${renderCurrentView()}
        </div>
      </main>
    </div>
  `;

  bindAppEvents();
  mountImageViewer();
  focusLocatedPost();
}

function renderRail() {
  return `
    <aside class="rail">
      <div class="rail-brand">
        <img src="./assets/app-icon.png" alt="i 人朋友圈图标">
        <div>
          <strong>${APP_NAME}</strong>
          <span>⌂ 仅自己可见</span>
        </div>
      </div>
      <nav class="rail-nav" aria-label="主导航">
        ${renderNavButton("timeline", "▤", "动态流")}
        ${renderNavButton("calendar", "□", "日历")}
        ${renderNavButton("month", "◱", "月份回看")}
        ${renderNavButton("favorites", "☆", "收藏")}
        ${renderNavButton("memories", "◷", "回顾")}
        <button data-export type="button"><span>⇩</span>导出</button>
        <button id="lock-app" type="button"><span>⌂</span>入口</button>
        <button id="settings-button" type="button"><span>⚙</span>外观</button>
      </nav>
    </aside>
  `;
}

function renderNavButton(view, icon, label) {
  return `<button class="${state.view === view ? "active" : ""}" data-nav-view="${view}" type="button"><span>${icon}</span>${label}</button>`;
}

function renderSidePanel() {
  const tabs = [
    { id: "compose", label: "写下" },
    { id: "search", label: "搜索" },
    { id: "review", label: "回顾" },
    { id: "appearance", label: "外观" }
  ];
  return `
    <div class="side-panel-tabs" aria-label="侧栏工具">
      ${tabs.map((tab) => `
        <button class="${state.sidePanel === tab.id ? "active" : ""}" data-side-panel="${tab.id}" type="button">${tab.label}</button>
      `).join("")}
    </div>
    ${state.sidePanel === "compose" ? `${renderComposer()}${renderTodayStatus()}` : ""}
    ${state.sidePanel === "search" ? renderInspector() : ""}
    ${state.sidePanel === "review" ? renderWeekReview() : ""}
    ${state.sidePanel === "appearance" ? renderAppearancePanel() : ""}
  `;
}

function renderAppearancePanel() {
  return `
    <section class="appearance-panel design-card">
      <div class="section-title">
        <h2>外观</h2>
        <button class="text-button" data-appearance-reset type="button">恢复默认</button>
      </div>
      ${renderAppearancePresetGroup()}
      ${renderAppearanceGroup("模式", APPEARANCE_MODE_OPTIONS, state.appearanceMode, "mode")}
      ${renderAppearanceGroup("色彩", ACCENT_OPTIONS, state.accent, "accent")}
      ${renderAppearanceGroup("颜色底板", THEME_OPTIONS.filter((theme) => theme.id !== "dark"), state.theme === "dark" ? "warm" : state.theme, "theme")}
      ${renderAppearanceGroup("动态卡片", FEED_STYLE_OPTIONS, state.feedStyle, "feed-style")}
      ${renderAppearanceGroup("动态密度", FEED_DENSITY_OPTIONS, state.feedDensity, "feed-density")}
      ${renderAppearanceGroup("正文字号", CONTENT_TEXT_SIZE_OPTIONS, state.contentTextSize, "content-size")}
      ${renderAppearanceGroup("正文行距", CONTENT_LINE_HEIGHT_OPTIONS, state.contentLineHeight, "content-line-height")}
      ${renderAppearanceGroup("背景类型", BACKGROUND_TYPE_OPTIONS, state.backgroundType, "background-type")}
      ${state.backgroundType === "pattern" ? renderAppearanceGroup("背景图案", BACKDROP_OPTIONS.filter((option) => option.id !== "solid"), state.backdrop, "backdrop") : ""}
      ${renderBackgroundStrengthControl()}
      ${renderAppearanceGroup("字体", FONT_OPTIONS, state.font, "font")}
      ${renderInterfaceScaleControl()}
      ${renderAppearancePreview()}
    </section>
  `;
}

function renderAppearancePresetGroup() {
  return `
    <div class="appearance-group appearance-presets">
      <h3>一键风格</h3>
      <div class="preset-grid">
        ${APPEARANCE_PRESETS.map((preset) => `
          <button class="${state.appearancePreset === preset.id ? "active" : ""}" data-appearance-preset="${preset.id}" type="button">
            <strong>${preset.label}</strong>
            <span>${preset.description}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function renderBackgroundStrengthControl() {
  return `
    <div class="appearance-group appearance-scale">
      <div class="appearance-scale-head">
        <h3>背景强度</h3>
        <output data-background-strength-value>${state.backgroundStrength}%</output>
      </div>
      <input
        data-background-strength
        type="range"
        min="0"
        max="100"
        step="5"
        value="${state.backgroundStrength}"
        aria-label="背景强度"
      >
      <div class="appearance-scale-labels" aria-hidden="true">
        <span>关闭</span>
        <span>轻</span>
        <span>标准</span>
        <span>明显</span>
      </div>
    </div>
  `;
}

function renderInterfaceScaleControl() {
  return `
    <div class="appearance-group appearance-scale">
      <div class="appearance-scale-head">
        <h3>界面大小</h3>
        <output data-interface-scale-value>${state.interfaceScale}%</output>
      </div>
      <input
        data-interface-scale
        type="range"
        min="${INTERFACE_SCALE.min}"
        max="${INTERFACE_SCALE.max}"
        step="${INTERFACE_SCALE.step}"
        value="${state.interfaceScale}"
        aria-label="界面大小"
      >
      <div class="appearance-scale-labels" aria-hidden="true">
        <span>紧凑</span>
        <span>标准</span>
        <span>舒展</span>
        <span>大</span>
      </div>
      <button class="text-button scale-reset" data-interface-scale-reset type="button">恢复标准</button>
    </div>
  `;
}

function renderAppearanceGroup(title, options, active, kind) {
  return `
    <div class="appearance-group">
      <h3>${title}</h3>
      <div class="appearance-options">
        ${options.map((option) => `
          <button class="${active === option.id ? "active" : ""}" data-appearance-${kind}="${option.id}" type="button">
            <span class="appearance-swatch ${kind}-${option.id}"></span>
            ${option.label}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function renderAppearancePreview() {
  return `
    <div class="appearance-group">
      <h3>即时预览</h3>
      <div class="appearance-preview">
        <article class="preview-post">
          <div class="preview-avatar">${PROFILE.avatar}</div>
          <div>
            <div class="preview-head"><strong>${PROFILE.name}</strong><span>${PROFILE.note}</span></div>
            <p>今天把想发又没发出去的话，安安静静地留给自己。</p>
            <div class="preview-gallery"><span></span><span></span><span></span></div>
            <div class="preview-meta">09:41　平静　#日常</div>
          </div>
        </article>
      </div>
    </div>
  `;
}

function renderComposer() {
  const text = state.editing ? state.editing.text : state.draftText;
  const tags = state.editing ? state.editing.tags.join(" ") : state.draftTags;
  const moodValue = state.editing ? state.editing.mood : state.draftMood;
  const location = state.editing ? state.editing.location : state.draftLocation;
  const imageCount = state.pendingImages.length + state.keepAttachments.length;
  return `
    <section class="composer design-card">
      <div class="section-title">
        <h2>${state.editing ? "编辑这一刻" : "写下这一刻"}</h2>
        ${state.editing ? '<button class="text-button" id="cancel-edit" type="button">取消</button>' : ""}
      </div>
      <div class="text-shell">
        <textarea id="record-text" maxlength="500" rows="6" placeholder="今天想留给自己的是什么？" inputmode="text">${escapeHtml(text)}</textarea>
        <span id="char-count">${text.length}/500</span>
      </div>
      <div class="field-row">
        <label>
          <span>心情</span>
          <select id="record-mood">
            ${MOODS.map((mood) => `<option value="${mood.id}" ${mood.id === moodValue ? "selected" : ""}>${mood.icon} ${mood.label}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>标签</span>
          <input id="record-tags" type="text" placeholder="添加标签（可多选）" value="${escapeHtml(tags)}">
        </label>
      </div>
      <div class="attachments-box">
        <div class="attachment-actions">
          <span>图片（${imageCount}/9）</span>
        </div>
        <button class="upload-box" id="choose-images" type="button">＋ 添加图片、粘贴或拖拽上传</button>
        ${imageCount ? `<div class="composer-preview" id="image-chips">${renderImagePreview()}</div>` : '<div id="image-chips"></div>'}
      </div>
      <div class="field-row">
        <label>
          <span>位置（可选）</span>
          <input id="record-location" type="text" placeholder="⌖ 添加位置" value="${escapeHtml(location)}">
        </label>
        <label>
          <span>时间（可选）</span>
          <input type="text" disabled value="◷ 使用发布时间">
        </label>
      </div>
      <button class="primary wide" id="save-record" type="button">${state.editing ? "保存修改" : "保存到自己可见"}</button>
    </section>
  `;
}

function renderImagePreview() {
  return composerImageItems().map((item, index) => `
      <div class="preview-tile">
        <button class="preview-image-button" data-open-composer-image="${index}" type="button" title="查看图片">
          <img alt="${item.saved ? "已保存图片" : "待发布图片"}" src="${escapeHtml(item.src)}">
        </button>
        <button class="preview-remove" ${item.saved ? `data-remove-kept="${escapeHtml(item.value)}"` : `data-remove-pending="${escapeHtml(item.value)}"`} type="button">移除</button>
      </div>
    `).join("");
}

function composerImageItems() {
  return [
    ...state.keepAttachments.map((name) => ({
      src: api.attachmentUrl(name),
      label: imageName(name),
      saved: true,
      value: name
    })),
    ...state.pendingImages.map((filePath) => ({
      src: api.localImageUrl(filePath),
      label: imageName(filePath),
      saved: false,
      value: filePath
    }))
  ];
}

function recordImageItems(record) {
  return (record?.attachments || []).map((name) => ({
    src: api.attachmentUrl(name),
    label: imageName(name)
  }));
}

function renderImageViewer() {
  if (!state.imageViewer || !state.imageViewer.items.length) return "";
  const { items, index } = state.imageViewer;
  const item = items[index] || items[0];
  const count = `${index + 1} / ${items.length}`;
  return `
    <div class="image-viewer" role="dialog" aria-modal="true" aria-label="查看图片">
      <button class="image-viewer-backdrop" data-close-viewer type="button" aria-label="关闭图片查看"></button>
      <div class="image-viewer-panel">
        <header class="image-viewer-head">
          <span>${count}</span>
          <button class="ghost icon-button" data-close-viewer type="button" aria-label="关闭图片查看">×</button>
        </header>
        <img class="image-viewer-image" src="${escapeHtml(item.src)}" alt="${escapeHtml(item.label || "图片")}">
        ${items.length > 1 ? `
          <button class="image-viewer-nav prev" data-viewer-step="-1" type="button" aria-label="上一张">‹</button>
          <button class="image-viewer-nav next" data-viewer-step="1" type="button" aria-label="下一张">›</button>
        ` : ""}
      </div>
    </div>
  `;
}

function mountImageViewer() {
  document.querySelector(".image-viewer")?.remove();
  if (!state.imageViewer) return;
  document.body.insertAdjacentHTML("beforeend", renderImageViewer());
  bindImageViewerEvents();
}

function openImageViewer(items, index = 0) {
  if (!items.length) return;
  state.imageViewer = {
    items,
    index: Math.max(0, Math.min(index, items.length - 1))
  };
  mountImageViewer();
}

function closeImageViewer() {
  state.imageViewer = null;
  document.querySelector(".image-viewer")?.remove();
}

function stepImageViewer(step) {
  if (!state.imageViewer) return;
  const total = state.imageViewer.items.length;
  state.imageViewer.index = (state.imageViewer.index + step + total) % total;
  mountImageViewer();
}

function bindImageViewerEvents() {
  const viewer = document.querySelector(".image-viewer");
  if (!viewer) return;
  viewer.addEventListener("click", (event) => {
    const close = event.target.closest("[data-close-viewer]");
    const step = event.target.closest("[data-viewer-step]");
    if (close) closeImageViewer();
    if (step) stepImageViewer(Number(step.dataset.viewerStep));
  });
}

function handleGlobalKeydown(event) {
  if (!state.imageViewer) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeImageViewer();
    return;
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    stepImageViewer(-1);
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    stepImageViewer(1);
  }
}

function renderTodayStatus() {
  const stats = weekStats(state.allRecords);
  const mood = moodById(stats.topMood);
  return `
    <section class="today-card design-card">
      <div class="section-title">
        <h2>今日状态</h2>
        <button class="text-button" data-nav-view="month" type="button">更多 ›</button>
      </div>
      <div class="mini-stat"><span>▣ 7 天记录</span><strong>${stats.weekCount} 次</strong><i></i></div>
      <div class="mini-stat"><span>☻ 最常出现：${mood.label}</span><strong>${stats.moodPercent}%</strong><i></i></div>
      <div class="mini-stat"><span>▧ 照片</span><strong>${stats.photoCount} 张</strong><i></i></div>
    </section>
  `;
}

function renderMainHeader() {
  return `
    <header class="main-head">
      <div>
        <h1>${viewTitle()}</h1>
      </div>
      <div class="head-actions">
        <button class="ghost icon-action" data-export type="button" title="导出" aria-label="导出">⇩</button>
        <button class="ghost icon-action" data-nav-view="favorites" type="button" title="收藏" aria-label="收藏">☆</button>
        <button class="ghost icon-action" data-nav-view="memories" type="button" title="回顾" aria-label="回顾">⟲</button>
      </div>
      <div class="top-tabs">
        ${renderTopTab("timeline", "动态流")}
        ${renderTopTab("calendar", "日历")}
        ${renderTopTab("month", "月份回看")}
      </div>
    </header>
  `;
}

function renderTopTab(view, label) {
  return `<button class="${state.view === view ? "active" : ""}" data-nav-view="${view}" type="button">${label}</button>`;
}

function viewTitle() {
  if (state.view === "calendar") return "日历";
  if (state.view === "month") return "月份回看";
  if (state.view === "favorites") return "我的收藏";
  if (state.view === "memories") return "回顾";
  return "我的动态流";
}

function renderCurrentView() {
  if (state.view === "calendar") return renderCalendar();
  if (state.view === "month") return renderMonthReview();
  if (state.view === "favorites") return renderTimeline(state.records.filter((record) => record.favorite));
  if (state.view === "memories") return renderMemories();
  return renderTimeline();
}

function renderTimeline(records = state.records) {
  if (records.length === 0) return renderEmpty("还没有记录", "写下一条动态，这里会出现你的私密时间线。");
  const groups = groupByDay(records);
  return `
    <section class="feed-panel">
      <div class="feed-meta">
        <span>共 ${records.length} 条记录</span>
        <button type="button">按时间倒序⌄</button>
      </div>
      ${groups.map(([day, items]) => `
        <section class="day-group">
          <h2>${formatDayHeading(day)}</h2>
          ${items.map(renderPost).join("")}
        </section>
      `).join("")}
    </section>
  `;
}

function groupByDay(records) {
  const grouped = new Map();
  records.forEach((record) => {
    const key = toDateKey(record.createdAt);
    grouped.set(key, [...(grouped.get(key) || []), record]);
  });
  return [...grouped.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

function formatDayHeading(dayKey) {
  const date = toDate(dayKey);
  return `${date.getMonth() + 1}月${date.getDate()}日　${weekdayShort(date)}`;
}

function renderPost(record) {
  const mood = moodById(record.mood);
  const likeCount = Number(record.likeCount || (record.liked ? 1 : 0));
  return `
    <article class="post" data-post-id="${record.id}">
      <div class="post-time">${formatTime(record.createdAt)}</div>
      <div class="post-body">
        <div class="post-profile" aria-hidden="true">
          <span class="post-avatar">${PROFILE.avatar}</span>
          <div><strong>${PROFILE.name}</strong><span>${PROFILE.note} · ${formatTime(record.createdAt)}</span></div>
        </div>
        <header class="post-head">
          <span class="mood" style="--mood:${mood.color}">${mood.icon} ${mood.label}</span>
          <div class="post-actions">
            <button class="text-button ${record.favorite ? "favorited" : ""}" data-favorite="${record.id}" type="button">${record.favorite ? "★ 已收藏" : "☆ 收藏"}</button>
            <button class="text-button" data-edit="${record.id}" type="button">✎ 编辑</button>
            <button class="text-button danger" data-delete="${record.id}" type="button">♲ 删除</button>
          </div>
        </header>
        ${record.text ? `<p class="post-text">${escapeHtml(record.text).replaceAll("\n", "<br>")}</p>` : ""}
        ${record.tags.length ? `<div class="tags">${record.tags.map((tag) => `<button data-tag="${escapeHtml(tag)}" type="button">${escapeHtml(tag)}</button>`).join("")}</div>` : ""}
        ${record.location ? `<p class="location-line">⌖ ${escapeHtml(record.location)}</p>` : ""}
        ${record.attachments.length ? `<div class="gallery count-${Math.min(record.attachments.length, 9)}">${record.attachments.map((name, index) => `
          <button class="gallery-image" data-open-record="${escapeHtml(record.id)}" data-open-image="${index}" type="button" title="查看图片">
            <img alt="记录图片" src="${api.attachmentUrl(name)}">
          </button>
        `).join("")}</div>` : ""}
        <div class="post-reactions">
          <button class="reaction-button like-button ${record.liked ? "liked" : ""}" data-like="${record.id}" type="button">
            <span>${record.liked ? "♥" : "♡"}</span>
            ${record.liked ? "已喜欢" : "喜欢"} ${likeCount}
          </button>
        </div>
        <button class="more-button" type="button">...</button>
      </div>
    </article>
  `;
}

function renderInspector() {
  const tags = allTags();
  return `
    <section class="inspector-card design-card">
      <label class="search-box">
        <span>⌕</span>
        <input id="search" type="search" placeholder="搜索记录、标签或内容" value="${escapeHtml(state.query)}">
        <kbd>⌘ K</kbd>
      </label>
      <div class="filter-block">
        <h3>心情筛选</h3>
        <div class="pill-grid">
          <button class="${state.mood === "" ? "active" : ""}" data-filter-mood="" type="button">全部</button>
          ${MOODS.map((mood) => `<button class="${state.mood === mood.id ? "active" : ""}" data-filter-mood="${mood.id}" type="button">${mood.label}</button>`).join("")}
        </div>
      </div>
      <div class="filter-block">
        <h3>标签筛选</h3>
        <div class="pill-grid">
          <button class="${state.tag === "" ? "active" : ""}" data-tag-filter="" type="button">全部</button>
          ${tags.map((tag) => `<button class="${state.tag === tag ? "active" : ""}" data-tag-filter="${escapeHtml(tag)}" type="button">${escapeHtml(tag)}</button>`).join("")}
        </div>
        <button class="manage-tags" type="button">⚙ 管理标签</button>
      </div>
      <div class="filter-block">
        <h3>日期筛选</h3>
        <div class="date-range">
          <input id="date-from" type="date" value="${state.dateFrom}">
          <span>~</span>
          <input id="date-to" type="date" value="${state.dateTo}">
        </div>
      </div>
    </section>
  `;
}

function weekStats(records) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  const weekRecords = records.filter((record) => toDate(record.createdAt) >= start);
  const moodCounts = MOODS.map((mood) => ({
    mood: mood.id,
    count: weekRecords.filter((record) => record.mood === mood.id).length
  })).sort((a, b) => b.count - a.count);
  const topMood = moodCounts[0] && moodCounts[0].count ? moodCounts[0].mood : "calm";
  const moodPercent = weekRecords.length ? Math.round((moodCounts[0].count / weekRecords.length) * 100) : 0;
  return {
    weekCount: weekRecords.length,
    photoCount: weekRecords.reduce((total, record) => total + record.attachments.length, 0),
    topMood,
    moodPercent,
    dayCounts: Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return records.filter((record) => toDateKey(record.createdAt) === toDateKey(day)).length;
    })
  };
}

function renderWeekReview() {
  const stats = weekStats(state.allRecords);
  const mood = moodById(stats.topMood);
  const max = Math.max(1, ...stats.dayCounts);
  return `
    <section class="week-card design-card">
      <div class="section-title">
        <h2>本周回顾</h2>
        <button class="text-button" data-nav-view="memories" type="button">更多 ›</button>
      </div>
      <dl>
        <div><dt>记录天数</dt><dd>${stats.dayCounts.filter(Boolean).length} 天</dd></div>
        <div><dt>记录次数</dt><dd>${stats.weekCount} 次</dd></div>
        <div><dt>最常出现心情</dt><dd>${mood.label}</dd></div>
        <div><dt>照片数量</dt><dd>${stats.photoCount} 张</dd></div>
      </dl>
      <div class="bar-chart">
        ${stats.dayCounts.map((count, index) => `<span style="height:${Math.max(8, (count / max) * 86)}%"><i>${["一", "二", "三", "四", "五", "六", "日"][index]}</i></span>`).join("")}
      </div>
    </section>
  `;
}

function renderCalendar() {
  const monthRecords = recordsForMonth();
  const start = monthStart(state.month);
  const firstWeekday = start.getDay();
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(start.getFullYear(), start.getMonth(), day));
  while (cells.length % 7 !== 0) cells.push(null);
  const selectedRecords = recordsForDay(state.selectedDay);

  return `
    ${renderMonthToolbar()}
    <section class="calendar-card">
      <div class="weekdays">${["日", "一", "二", "三", "四", "五", "六"].map((day) => `<span>${day}</span>`).join("")}</div>
      <div class="calendar-grid">
        ${cells.map((date) => {
          if (!date) return '<div class="calendar-cell muted-cell"></div>';
          const dayKey = toDateKey(date);
          const dayRecords = monthRecords.filter((record) => toDateKey(record.createdAt) === dayKey);
          return `
            <button class="calendar-cell ${dayKey === state.selectedDay ? "selected" : ""}" data-day="${dayKey}" type="button">
              <span class="day-number">${date.getDate()}</span>
              ${dayRecords.length ? `<strong>${dayRecords.length}</strong>` : ""}
            </button>
          `;
        }).join("")}
      </div>
    </section>
    ${selectedRecords.length ? renderTimeline(selectedRecords) : renderEmpty("这一天没有记录", "空白也算一种状态，日历会替你留着它。")}
  `;
}

function renderMonthToolbar() {
  return `
    <div class="month-toolbar">
      <button class="ghost icon-button" data-month-step="-1" type="button">‹</button>
      <select id="month-picker">
        ${monthOptions().map((month) => `<option value="${month}" ${month === state.month ? "selected" : ""}>${monthLabel(month)}</option>`).join("")}
      </select>
      <button class="ghost icon-button" data-month-step="1" type="button">›</button>
    </div>
  `;
}

function renderMonthReview() {
  const records = recordsForMonth(state.month);
  const photoCount = records.reduce((total, record) => total + record.attachments.length, 0);
  const tagCount = new Set(records.flatMap((record) => record.tags)).size;
  const activeDays = new Set(records.map((record) => toDateKey(record.createdAt))).size;
  return `
    ${renderMonthToolbar()}
    <section class="review-hero">
      <div><p class="eyebrow">${monthLabel(state.month)}</p><h3>这个月，自己陪自己出现了 ${activeDays} 天</h3></div>
      <div class="stat-grid">
        <div><strong>${records.length}</strong><span>条动态</span></div>
        <div><strong>${photoCount}</strong><span>张图片</span></div>
        <div><strong>${tagCount}</strong><span>个标签</span></div>
      </div>
    </section>
    ${renderTimeline(records)}
  `;
}

function renderMemories() {
  const today = new Date();
  const sameDay = state.allRecords.filter((record) => {
    const date = toDate(record.createdAt);
    return date.getMonth() === today.getMonth() && date.getDate() === today.getDate() && date.getFullYear() !== today.getFullYear();
  });
  const memories = sameDay.length ? sameDay : state.allRecords.slice(0, 5);
  if (!memories.length) return renderEmpty("还没有可回看的内容", "多写几条后，这里会替你把旧日子捡回来。");
  return `<section class="memories-head"><p class="eyebrow">${sameDay.length ? "那年今日" : "最近回忆"}</p><h3>${sameDay.length ? "同一个日期，过去的自己也来坐了一会儿" : "今天先看看最近留下的片刻"}</h3></section>${renderTimeline(memories)}`;
}

function renderEmpty(title, text) {
  return `<div class="empty"><h3>${title}</h3><p>${text}</p></div>`;
}

function bindAppEvents() {
  const bindAppearanceChoice = (selector, key, datasetKey) => {
    document.querySelectorAll(selector).forEach((button) => {
      button.addEventListener("click", () => {
        updateAppearance({ [key]: button.dataset[datasetKey] });
        applyAppearance();
        renderApp();
      });
    });
  };

  document.querySelectorAll("[data-export]").forEach((button) => {
    button.addEventListener("click", async () => {
      const result = await run(() => api.exportJson());
      if (result && result.ok) toast("JSON 已导出", "success");
    });
  });

  document.querySelector("#lock-app").addEventListener("click", async () => {
    await run(() => api.lock());
    lockToAuth();
  });
  document.querySelector("#settings-button").addEventListener("click", () => {
    syncActiveInputs();
    state.sidePanel = "appearance";
    renderApp();
  });

  document.querySelectorAll("[data-nav-view]").forEach((button) => {
    button.addEventListener("click", async () => {
      syncActiveInputs();
      state.view = button.dataset.navView;
      await loadRecords();
      renderApp();
    });
  });
  document.querySelectorAll("[data-side-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      syncActiveInputs();
      state.sidePanel = button.dataset.sidePanel;
      renderApp();
    });
  });
  document.querySelectorAll("[data-appearance-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      syncActiveInputs();
      Object.assign(state, appearanceModel.applyAppearancePreset(appearanceState(), button.dataset.appearancePreset));
      applyAppearance();
      renderApp();
    });
  });
  bindAppearanceChoice("[data-appearance-mode]", "appearanceMode", "appearanceMode");
  bindAppearanceChoice("[data-appearance-accent]", "accent", "appearanceAccent");
  bindAppearanceChoice("[data-appearance-theme]", "theme", "appearanceTheme");
  bindAppearanceChoice("[data-appearance-feed-style]", "feedStyle", "appearanceFeedStyle");
  bindAppearanceChoice("[data-appearance-feed-density]", "feedDensity", "appearanceFeedDensity");
  bindAppearanceChoice("[data-appearance-content-size]", "contentTextSize", "appearanceContentSize");
  bindAppearanceChoice("[data-appearance-content-line-height]", "contentLineHeight", "appearanceContentLineHeight");
  bindAppearanceChoice("[data-appearance-background-type]", "backgroundType", "appearanceBackgroundType");
  bindAppearanceChoice("[data-appearance-backdrop]", "backdrop", "appearanceBackdrop");
  bindAppearanceChoice("[data-appearance-font]", "font", "appearanceFont");

  const backgroundStrength = document.querySelector("[data-background-strength]");
  const backgroundStrengthValue = document.querySelector("[data-background-strength-value]");
  if (backgroundStrength) {
    backgroundStrength.addEventListener("input", () => {
      state.backgroundStrength = Math.max(0, Math.min(100, Math.round(Number(backgroundStrength.value) || 0)));
      backgroundStrength.value = String(state.backgroundStrength);
      if (backgroundStrengthValue) backgroundStrengthValue.textContent = `${state.backgroundStrength}%`;
      applyAppearance();
    });
  }
  const appearanceReset = document.querySelector("[data-appearance-reset]");
  if (appearanceReset) {
    appearanceReset.addEventListener("click", () => {
      Object.assign(state, appearanceModel.applyAppearancePreset(DEFAULT_APPEARANCE, "calm"));
      applyAppearance();
      renderApp();
    });
  }
  const interfaceScale = document.querySelector("[data-interface-scale]");
  const interfaceScaleValue = document.querySelector("[data-interface-scale-value]");
  if (interfaceScale) {
    interfaceScale.addEventListener("input", () => {
      state.interfaceScale = appearanceModel.clampInterfaceScale(interfaceScale.value);
      interfaceScale.value = String(state.interfaceScale);
      if (interfaceScaleValue) interfaceScaleValue.textContent = `${state.interfaceScale}%`;
      applyAppearance();
    });
  }
  const interfaceScaleReset = document.querySelector("[data-interface-scale-reset]");
  if (interfaceScaleReset) {
    interfaceScaleReset.addEventListener("click", () => {
      syncActiveInputs();
      state.interfaceScale = INTERFACE_SCALE.default;
      applyAppearance();
      renderApp();
    });
  }

  bindComposerEvents();
  bindFilterEvents();
  bindContentEvents();
  bindGalleryImageEvents();
  bindSwipeNavigation();
}

function bindComposerEvents() {
  const text = document.querySelector("#record-text");
  if (!text) return;
  const charCount = document.querySelector("#char-count");
  const mood = document.querySelector("#record-mood");
  const tags = document.querySelector("#record-tags");
  const location = document.querySelector("#record-location");
  text.addEventListener("input", () => {
    charCount.textContent = `${text.value.length}/500`;
    syncComposerState();
  });
  mood.addEventListener("change", () => {
    syncComposerState();
  });
  tags.addEventListener("input", () => {
    syncComposerState();
  });
  location.addEventListener("input", () => {
    syncComposerState();
  });

  document.querySelector("#choose-images").addEventListener("click", async () => {
    const paths = await run(() => api.chooseImages());
    addPendingImages(paths);
  });
  const composer = document.querySelector(".composer");
  composer.addEventListener("paste", handlePasteImages);
  composer.addEventListener("dragover", handleDragOverImages);
  composer.addEventListener("drop", handleDropImages);

  document.querySelector("#save-record").addEventListener("click", saveRecord);
  const cancel = document.querySelector("#cancel-edit");
  if (cancel) cancel.addEventListener("click", () => {
    state.editing = null;
    state.keepAttachments = [];
    state.pendingImages = [];
    renderApp();
  });

  document.querySelector("#image-chips").addEventListener("click", (event) => {
    const open = event.target.closest("[data-open-composer-image]");
    const kept = event.target.closest("[data-remove-kept]");
    const pending = event.target.closest("[data-remove-pending]");
    if (open) {
      openImageViewer(composerImageItems(), Number(open.dataset.openComposerImage));
      return;
    }
    if (kept) state.keepAttachments = state.keepAttachments.filter((name) => name !== kept.dataset.removeKept);
    if (pending) state.pendingImages = state.pendingImages.filter((filePath) => filePath !== pending.dataset.removePending);
    if (kept || pending) {
      syncComposerState();
      renderApp();
    }
  });
}

function bindGalleryImageEvents() {
  document.querySelectorAll("[data-open-image]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const record = state.allRecords.find((item) => item.id === button.dataset.openRecord);
      openImageViewer(recordImageItems(record), Number(button.dataset.openImage));
    });
  });
}

function ensureComposerForImages() {
  if (document.body.classList.contains("auth-mode")) return false;
  if (state.sidePanel !== "compose" || !document.querySelector("#record-text")) {
    state.sidePanel = "compose";
    renderApp();
  }
  return Boolean(document.querySelector("#record-text"));
}

function imagePathsFromFiles(files) {
  return Array.from(files || [])
    .filter(isImageFile)
    .map(filePathFor)
    .filter(Boolean);
}

async function addImagePaths(paths, message) {
  if (!paths.length) return false;
  if (!ensureComposerForImages()) return false;
  const added = addPendingImages(paths);
  if (added && message) toast(message, "success");
  return added;
}

async function handlePasteImages(event) {
  if (isTextEntryTarget(event.target)) return;
  const files = imagePathsFromFiles(event.clipboardData?.files);
  const items = Array.from(event.clipboardData?.items || []);
  const hasImage = files.length || items.some((item) => String(item.type || "").startsWith("image/"));
  if (!hasImage) return;
  event.preventDefault();
  event.stopPropagation();
  if (await addImagePaths(files, "已粘贴图片")) return;
  const paths = await run(() => api.pasteImages());
  await addImagePaths(paths || [], "已粘贴图片");
}

function handleDragOverImages(event) {
  if (isTextEntryTarget(event.target)) return;
  const files = Array.from(event.dataTransfer?.items || []);
  if (!files.some((item) => item.kind === "file")) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
}

async function handleDropImages(event) {
  if (isTextEntryTarget(event.target)) return;
  const paths = imagePathsFromFiles(event.dataTransfer?.files);
  if (!paths.length) return;
  event.preventDefault();
  event.stopPropagation();
  await addImagePaths(paths, "已添加拖入图片");
}

async function handleGlobalPaste(event) {
  if (document.body.classList.contains("auth-mode")) return;
  if (state.imageViewer) return;
  if (event.defaultPrevented) return;
  await handlePasteImages(event);
}

function handleGlobalDragOver(event) {
  if (document.body.classList.contains("auth-mode")) return;
  if (state.imageViewer) return;
  handleDragOverImages(event);
}

async function handleGlobalDrop(event) {
  if (document.body.classList.contains("auth-mode")) return;
  if (state.imageViewer) return;
  await handleDropImages(event);
}

function syncComposerState() {
  const text = document.querySelector("#record-text");
  if (!text) return;
  const mood = document.querySelector("#record-mood");
  const tags = document.querySelector("#record-tags");
  const location = document.querySelector("#record-location");
  if (state.editing) {
    state.editing = {
      ...state.editing,
      text: text.value,
      mood: mood?.value ?? state.editing.mood,
      tags: normalizeDraftTags(tags?.value ?? state.editing.tags.join(" ")),
      location: location?.value ?? state.editing.location
    };
    return;
  }
  state.draftText = text.value;
  state.draftMood = mood?.value ?? state.draftMood;
  state.draftTags = tags?.value ?? state.draftTags;
  state.draftLocation = location?.value ?? state.draftLocation;
}

function syncSearchState() {
  const search = document.querySelector("#search");
  if (search) state.query = search.value;
}

function syncActiveInputs() {
  syncComposerState();
  syncSearchState();
}

function normalizeDraftTags(value) {
  return String(value || "")
    .split(/[#,，\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function addPendingImages(paths) {
  if (!paths || !paths.length) return false;
  syncComposerState();
  const room = 9 - state.pendingImages.length - state.keepAttachments.length;
  if (room <= 0) {
    toast("最多添加 9 张图片", "error");
    return false;
  }
  state.pendingImages.push(...paths.slice(0, room));
  renderApp();
  return true;
}

function bindFilterEvents() {
  const search = document.querySelector("#search");
  if (!search) return;
  let timer;
  search.addEventListener("input", (event) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(async () => {
      state.query = event.target.value;
      await loadRecords();
      renderApp();
    }, 160);
  });
  document.querySelectorAll("[data-filter-mood]").forEach((button) => {
    button.addEventListener("click", async () => {
      syncActiveInputs();
      state.mood = button.dataset.filterMood;
      await loadRecords();
      renderApp();
    });
  });
  document.querySelectorAll("[data-tag-filter]").forEach((button) => {
    button.addEventListener("click", async () => {
      syncActiveInputs();
      state.tag = button.dataset.tagFilter;
      await loadRecords();
      renderApp();
    });
  });
  document.querySelector("#date-from")?.addEventListener("change", async (event) => {
    state.dateFrom = event.target.value;
    await loadRecords();
    renderApp();
  });
  document.querySelector("#date-to")?.addEventListener("change", async (event) => {
    state.dateTo = event.target.value;
    await loadRecords();
    renderApp();
  });
}

function bindContentEvents() {
  document.querySelector(".main-column").addEventListener("click", async (event) => {
    const openImage = event.target.closest("[data-open-image]");
    const edit = event.target.closest("[data-edit]");
    const del = event.target.closest("[data-delete]");
    const favorite = event.target.closest("[data-favorite]");
    const like = event.target.closest("[data-like]");
    const tag = event.target.closest("[data-tag]");
    if (openImage) {
      const record = state.allRecords.find((item) => item.id === openImage.dataset.openRecord);
      openImageViewer(recordImageItems(record), Number(openImage.dataset.openImage));
      return;
    }
    if (tag) {
      syncActiveInputs();
      state.tag = tag.dataset.tag;
      await loadRecords();
      renderApp();
    }
    if (like) {
      const result = await run(() => api.toggleLike(like.dataset.like));
      if (result) toast(result.liked ? "已收进喜欢的片刻" : "已取消喜欢");
      await loadRecords();
      renderApp();
    }
    if (favorite) {
      await run(() => api.toggleFavorite(favorite.dataset.favorite));
      await loadRecords();
      renderApp();
    }
    if (edit) {
      syncActiveInputs();
      const record = state.allRecords.find((item) => item.id === edit.dataset.edit);
      if (!record) return;
      state.editing = record;
      state.keepAttachments = [...record.attachments];
      state.pendingImages = [];
      state.sidePanel = "compose";
      renderApp();
    }
    if (del && window.confirm("确定删除这条记录吗？")) {
      const result = await run(() => api.deleteRecord(del.dataset.delete), "已删除");
      if (result) {
        await loadRecords();
        renderApp();
      }
    }
  });

  const monthPicker = document.querySelector("#month-picker");
  if (monthPicker) monthPicker.addEventListener("change", () => {
    state.month = monthPicker.value;
    state.selectedDay = `${state.month}-01`;
    renderApp();
  });
  document.querySelectorAll("[data-month-step]").forEach((button) => {
    button.addEventListener("click", () => {
      state.month = shiftMonth(state.month, Number(button.dataset.monthStep));
      state.selectedDay = `${state.month}-01`;
      renderApp();
    });
  });
  document.querySelectorAll("[data-day]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDay = button.dataset.day;
      renderApp();
    });
  });
}

function bindSwipeNavigation() {
  const stage = document.querySelector("[data-swipe-stage]");
  if (!stage) return;
  let startX = 0;
  let startY = 0;
  let active = false;
  let wheelLocked = false;
  stage.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button, input, select, textarea, a")) return;
    active = true;
    startX = event.clientX;
    startY = event.clientY;
    stage.classList.add("is-dragging");
  });
  stage.addEventListener("pointerup", async (event) => {
    if (!active) return;
    active = false;
    stage.classList.remove("is-dragging");
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.35) return;
    await switchTopView(dx < 0 ? 1 : -1);
  });
  stage.addEventListener("wheel", async (event) => {
    if (wheelLocked || Math.abs(event.deltaX) < 45 || Math.abs(event.deltaX) < Math.abs(event.deltaY) * 1.2) return;
    wheelLocked = true;
    await switchTopView(event.deltaX > 0 ? 1 : -1);
    window.setTimeout(() => { wheelLocked = false; }, 520);
  }, { passive: true });
}

async function switchTopView(step) {
  const current = TOP_VIEWS.includes(state.view) ? state.view : "timeline";
  const index = SWIPE_VIEWS.indexOf(current);
  state.view = SWIPE_VIEWS[(index + step + SWIPE_VIEWS.length) % SWIPE_VIEWS.length];
  await loadRecords();
  renderApp();
}

async function saveRecord() {
  const input = {
    text: document.querySelector("#record-text").value,
    mood: document.querySelector("#record-mood").value,
    tags: document.querySelector("#record-tags").value,
    location: document.querySelector("#record-location").value,
    imagePaths: [...state.pendingImages]
  };
  const result = state.editing
    ? await run(() => api.updateRecord(state.editing.id, { ...input, favorite: state.editing.favorite, keepAttachments: state.keepAttachments }), "修改已保存")
    : await run(() => api.createRecord(input), "已保存");
  if (!result) return;
  state.editing = null;
  state.pendingImages = [];
  state.keepAttachments = [];
  state.draftText = "";
  state.draftTags = "";
  state.draftMood = "calm";
  state.draftLocation = "";
  state.month = toMonthKey(result.createdAt || new Date());
  state.selectedDay = toDateKey(result.createdAt || new Date());
  await loadRecords();
  renderApp();
}

function lockToAuth() {
  state.records = [];
  state.allRecords = [];
  state.query = "";
  state.mood = "";
  state.tag = "";
  state.dateFrom = "";
  state.dateTo = "";
  state.view = "timeline";
  state.pendingImages = [];
  state.editing = null;
  state.keepAttachments = [];
  state.draftText = "";
  state.draftTags = "";
  state.draftMood = "calm";
  state.draftLocation = "";
  state.imageViewer = null;
  closeImageViewer();
  renderAuth();
}

function focusLocatedPost() {
  if (!state.pendingLocate) return;
  const node = document.querySelector(`[data-post-id="${CSS.escape(state.pendingLocate)}"]`);
  state.pendingLocate = "";
  if (!node) return;
  node.scrollIntoView({ behavior: "smooth", block: "center" });
  node.classList.add("located");
  window.setTimeout(() => node.classList.remove("located"), 1800);
}

boot();
