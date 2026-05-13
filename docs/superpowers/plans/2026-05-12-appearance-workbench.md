# Appearance Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current simple appearance panel into a richer appearance workbench with presets, card style, reading controls, background strength, and preview.

**Architecture:** Keep the Electron main process untouched. Add a small renderer appearance model for testable option defaults and preset behavior, then wire those settings into `renderer.js` through `body.dataset` and CSS variables.

**Tech Stack:** Electron renderer, plain JavaScript, CSS custom properties, Node test runner.

---

### Task 1: Testable Appearance Model

**Files:**
- Create: `src/renderer/appearance-model.js`
- Create: `tests/appearance-model.test.js`
- Modify: `src/renderer/index.html`

- [ ] Write Node tests for default settings, preset application, range clamping, and storage normalization.
- [ ] Implement a small UMD-style appearance model usable from both Node tests and the browser.
- [ ] Load the model before `renderer.js`.
- [ ] Run `npm test`.

### Task 2: Renderer State And Controls

**Files:**
- Modify: `src/renderer/renderer.js`

- [ ] Replace scattered option constants with the shared model.
- [ ] Add state fields for appearance preset, mode, accent, feed style, feed density, content size, line height, background type, and background strength.
- [ ] Render grouped controls and a static preview card in the appearance panel.
- [ ] Bind new controls to localStorage-backed state.

### Task 3: Visual System CSS

**Files:**
- Modify: `src/renderer/styles.css`

- [ ] Add CSS variables for accent, content text, line height, feed spacing, card padding, radius, and backdrop strength.
- [ ] Style the new appearance workbench groups and preview card.
- [ ] Add `journal` and `moments` feed styles.
- [ ] Add density, reading, solid background, and background strength behavior.

### Task 4: Verification

**Files:**
- Modify: `README.md` only if screenshots or feature descriptions need updating.

- [ ] Run `npm test`.
- [ ] Run `npm run smoke`.
- [ ] Start the app and visually verify the appearance flow.
- [ ] Check console/runtime health where possible.
