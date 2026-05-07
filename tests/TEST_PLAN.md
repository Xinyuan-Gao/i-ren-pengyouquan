# Test Plan

## Scope

Local private desktop journal app, similar to a personal-only QQ Zone / WeChat Moments feed. Tests should prefer pure logic and storage modules first, with Electron UI checks kept manual unless a stable automation surface exists.

## Automated Priority

1. First-run local entry
   - Fresh profile creates storage without an auth file.
   - Launch shows a single "进入朋友圈" entry button.
   - Clicking the entry button opens the feed without password setup or validation.
   - Existing records remain available after app/storage reloads.

2. Entry CRUD
   - Creates an entry with text, mood, timestamp, and optional images.
   - Reads entries newest-first or in the app's documented order.
   - Updates text, mood, and image list without changing the entry id.
   - Deletes only the selected entry.
   - Handles empty content according to product rules.

3. Search and mood filtering
   - Searches entry text case-insensitively where applicable.
   - Returns no results for unmatched queries.
   - Filters by mood.
   - Combines search and mood filters predictably.

4. Image attachment storage
   - Stores stable local attachment paths with an entry.
   - Copies/imports images into the app-owned data folder when required.
   - Does not mutate or delete original source images.
   - Updating/deleting one entry does not break image paths referenced by other entries.
   - Missing image files do not corrupt the entry list.

5. JSON export
   - Exports valid JSON.
   - Includes entries, moods, timestamps, and attachment references.
   - Does not include auth files or secrets unless explicitly intended.
   - Export is readable after app/storage reload.

6. Local privacy / offline behavior
   - Core storage and business logic do not require network access.
   - No test depends on an external service.
   - Network calls are absent or mocked in automated tests.

7. Current round storage/export regression
   - Records with text-only, image-only, and mixed content remain readable after a storage reload.
   - JSON export keeps all records, moods, tags, timestamps, and attachment references after reload.
   - Exported attachment references are app-owned filenames, not source image absolute paths.
   - Export remains free of auth files and entry state.

## Manual Smoke Checks

1. Launch packaged or dev Electron app with a fresh local profile.
2. Click "进入朋友圈", quit, relaunch, and verify the same single-click entry flow.
3. Create several entries with different moods and images.
4. Edit one entry, delete another, relaunch, and verify persistence.
5. Search text and filter by mood from the visible feed.
6. Export JSON and inspect that it contains entries but no auth data or secrets.
7. Disconnect network and repeat create/search/export basics.

## Current Round UI / Feature Checks

1. Moments-style cards
   - Feed records render as distinct cards with timestamp, mood, text, tags, and edit/delete actions.
   - Text-only, image-only, and mixed records have stable spacing and no overlapping controls.
   - Editing a card keeps existing saved images unless the user removes them.
   - Deleting a card removes only that record and survives relaunch.

2. Media wall
   - Records with one, several, and nine images show a scannable media wall/grid.
   - Images load through the app attachment URL and do not expose the original source path in the UI.
   - Broken/missing local attachment files do not crash the feed; the rest of the record remains usable.
   - Adding images to an existing record preserves previous images up to the documented limit.

3. Memories / month review
   - Month review shows the selected month summary: record count, image count, tag count, active days, and mood distribution.
   - Switching months updates the summary and day groups without losing the current search/filter state unexpectedly.
   - Empty months show an empty state instead of stale records from another month.
   - Clicking a memory/review item opens the expected edit flow or detail behavior.

4. Combined filters
   - Text/tag search, mood filter, month selector, and "has image" filter combine predictably.
   - Clearing one filter leaves the remaining filters active.
   - "Has image" returns only records with attachments, including image-only records.
   - No-result states are clear and do not hide the filter controls needed to recover.

5. Entry screen and local privacy hint
   - Fresh profile shows the single entry screen and local-only privacy hint.
   - Existing profile opens on the entry screen after app relaunch.
   - Clicking "进入朋友圈" restores the feed without password prompts or errors.
   - After returning to the entry screen or relaunching, media thumbnails and record text are not visible behind it.
   - Export, image picker, and record IPC actions reject before entering.

## Notes

- Use temporary app data directories in tests so local user data is never touched.
- Keep tests close to storage/search modules; avoid broad Electron rewrites.
- If implementation uses IPC, test handler functions directly when possible before adding renderer automation.
