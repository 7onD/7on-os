# 7on OS — Personal OS for Семён Дементьев

A single-page personal productivity app: CRM, tasks, calendar, finance, notes/files storage. Built as a static HTML file — no bundler, no Node server, no build step. Opens directly in the browser.

---

## Stack

| Layer | What |
|---|---|
| UI | React 18 (loaded from `vendor/`) + Babel in-browser transpilation |
| Styling | Single `styles.css` with CSS variables for theming |
| Data | Yandex Cloud Function (REST) + Yandex Object Storage (JSON tables + file blobs) |
| Auth | Password checked server-side via Cloud Function; token stored in `sessionStorage` |
| Deploy | Static files on GitHub → served however (no CI, just push to `main`) |

There is **no npm, no webpack, no TypeScript, no JSX compilation step**. Babel runs in the browser at page load. Every `.jsx` file is a `<script type="text/babel">` tag in `index.html`.

---

## File Map

```
index.html          — Entry point. Loads vendor scripts, then all .jsx files in order.
styles.css          — All CSS (~1600 lines). CSS vars for theme. Two @media breakpoints (768px, 500px).

data.jsx            — API layer. loadAllData(), all CRUD functions, exposed on window.*
yandex-function.js  — Backend (deploy to Yandex Cloud). Node 18. REST over JSON files in Object Storage.
cloudflare-worker.js— (Legacy/unused) earlier attempt at a Cloudflare-based backend.

app.jsx             — Root App component, LockScreen, SearchOverlay, MobileNav, routing.
sidebar.jsx         — Desktop left sidebar with nav links and counts.
shared.jsx          — Reusable: Modal, Field, FInput, FSelect, FTextarea, StatusTag, MiniCal, Icon wrappers, fmtDate.
icons.jsx           — All SVG icons as a single Icon component: <Icon name="..." size={n} />.
tweaks-panel.jsx    — Floating appearance panel (accent color, dark tone, density, font). State in localStorage.

dashboard.jsx       — Dashboard page: stats cards, mini calendar, deal pipeline, upcoming tasks.
tasks.jsx           — Tasks page: personal / work / study tabs, priority, due dates, tags.
calendar.jsx        — Calendar: week view (desktop), mobile week strip + day list + month toggle.
finance.jsx         — Finance: income/expense breakdown, deal pipeline, savings goals.
contacts.jsx        — CRM: owner contacts table + detail panel.
reminders.jsx       — Reminders/notes page (separate from storage notes).

storage.jsx         — Storage page: notes editor + files manager. ~700 lines. See section below.
storage-blocks.jsx  — NoteBlock renderer (paragraph/h2/list/checklist/file-link/note-link), SlashMenu.
storage-data.jsx    — Demo files fallback (shown when API returns empty FILES array).
```

---

## Architecture: No-Build React

Because there is **no bundler**, a few rules are critical:

### 1. Script load order matters
`index.html` loads scripts sequentially. Each file can use globals defined by earlier files. The order is:
```
tweaks-panel.jsx → data.jsx → icons.jsx → sidebar.jsx → shared.jsx →
dashboard.jsx → tasks.jsx → calendar.jsx → finance.jsx → contacts.jsx →
reminders.jsx → storage-blocks.jsx → storage-data.jsx → storage.jsx → app.jsx
```
`app.jsx` is last and calls `ReactDOM.createRoot(...).render(<App />)`.

### 2. Components defined inside other components = remount on every render
**This is the single most common bug.** If you write:
```jsx
const ParentPage = () => {
  const ChildForm = () => <input ... />;  // ← NEW function ref each render
  return <ChildForm />;                   // ← React remounts it = focus lost every keystroke
};
```
React sees a new component type each render and fully unmounts/remounts it.

**The fix:** convert to a render-function called inline:
```jsx
const ParentPage = () => {
  const renderChildForm = () => <input ... />;  // render-function, not a component
  return <>{renderChildForm()}</>;               // called, not rendered as JSX element
};
```
All multi-pane pages (StoragePage, ContactsPage) use this pattern. Comments at the top of those files explain why.

### 3. All CRUD functions are global
`data.jsx` exposes everything via `Object.assign(window, { ... })`. You can call `createNote()`, `updateFileRecord()`, `deleteContact()` etc. from anywhere without imports.

---

## Backend: Yandex Cloud Function

**URL:** `https://functions.yandexcloud.net/d4eck1v8o203hh4lr9ov`

**File:** `yandex-function.js` → deploy to Yandex Cloud Console, runtime Node 18, entry point `index.handler`.

**Env vars needed:**
- `BUCKET` = `7on-os-data` (Yandex Object Storage bucket name)
- `APP_PASSWORD` = the login password (default `0510` if not set)

**How it works:** Each "table" is a JSON array stored as `{table}.json` in Object Storage. The function reads the whole file, mutates the array (push / map / filter), writes it back. Simple but sufficient for single-user use.

**Supported actions via query string:**

| Method | `?table=X` | `?id=Y` | Effect |
|---|---|---|---|
| GET | required | — | Return full table array |
| POST | required | — | Append new row (auto-generates `id` if missing) |
| PATCH | required | required | Merge body into matching row |
| DELETE | required | required | Remove matching row |
| POST | — | — | `?action=upload` — proxy file upload (base64 body, stores in `files/` prefix) |
| GET | — | — | `?action=download&key=…` — proxy file download |
| POST | — | — | `?action=check-password` — verify `{ password }` against env var |

**Tables:** `tasks`, `contacts`, `deals`, `fin_income`, `fin_expenses`, `goals`, `monthly`, `events`, `notes`, `files`, `folders`

> **If you add a new table**, you must add it to the `TABLES` Set in `yandex-function.js` **and redeploy** — otherwise the function returns 403.

---

## Data Model: Key Tables

### `tasks`
```json
{ "id": "p1234", "title": "...", "type": "personal|work|study", "priority": "high|medium|low",
  "done": 0, "due": "18.05", "tag": "...", "description": "..." }
```

### `contacts` (CRM)
```json
{ "id": "c1234", "name": "...", "phone": "...", "addr": "...", "params": "78м²·3к·6/12·32млн",
  "last_contact": "17 мая", "days_since": 3, "status": "hot|work|warm|cold",
  "next": "Подписать договор", "next_when": "Сегодня 17:30", "notes": "..." }
```
In `data.jsx`, `loadAllData` maps `last_contact → lastContact`, `days_since → daysSince`, `next_when → nextWhen` for camelCase access in components.

### `events`
```json
{ "day": 1, "start_time": "10:00", "end_time": "11:00", "title": "...", "kind": "work|personal|...",
  "description": "...", "reminder": -1, "event_date": "2026-05-18" }
```
`event_date` (ISO string `YYYY-MM-DD`) is the canonical date field. `day` (1–7, day of week) is legacy and used as fallback. **Always set `event_date` when creating events.**

In components, events are accessed as `e.start` / `e.end` (mapped from `start_time`/`end_time` in `loadAllData`).

### `notes`
```json
{ "id": "n1234", "title": "...", "folder": "f-personal", "pinned": 0,
  "modified": "18.05, 14:32", "preview": "first 80 chars...", "blocks": "[...]" }
```
`blocks` is a JSON string of block objects:
```json
[
  { "kind": "p",     "text": "paragraph text" },
  { "kind": "h2",    "text": "heading" },
  { "kind": "list",  "items": ["item1", "item2"] },
  { "kind": "check", "text": "todo item", "checked": false },
  { "kind": "file",  "fileId": "file-123" },
  { "kind": "note",  "noteId": "n456", "title": "note title" }
]
```

### `files`
```json
{ "id": "file-1234", "name": "doc.pdf", "type": "pdf|image|doc|sheet|zip|md|file",
  "size": "1.2 МБ", "folder": "f-docs", "modified": "18.05",
  "key": "files/file-1234.pdf", "quick_access": 0 }
```
`key` is the Object Storage path used to construct download URLs via `getDownloadUrl(key)`.
`quick_access: 1` → file appears on the lock screen before login.

### `folders`
```json
{ "id": "f-personal", "name": "Личное", "icon": "star", "color": "#ffb45e" }
```
Default folders (created if table is empty): `f-deals`, `f-objects`, `f-docs`, `f-personal`.
These 4 are protected from deletion in the UI.

---

## Theming System

CSS variables set on `:root` by `app.jsx` based on the tweaks panel state:

| Variable | Default | Meaning |
|---|---|---|
| `--accent` | `#d4ff4d` | Primary accent (lime-yellow) |
| `--accent-soft` | accent at 12% opacity | Soft highlight |
| `--bg` | `#0f0f11` | Page background |
| `--surface` | bg + 4% white | Card background |
| `--surface-2` | bg + 7% white | Elevated card |
| `--surface-3` | bg + 10% white | Most elevated |
| `--font-ui` | `'Inter', system-ui` | UI font |
| `--font-mono` | `'JetBrains Mono', monospace` | Mono font |

`data-density` attribute on `<html>` controls spacing: `compact` / `comfort` / `spacious`.

---

## Routing

No router library. `App` component holds `route` state (string). `setRoute(routeName)` triggers re-render with the correct page component. Routes: `dashboard`, `tasks`, `calendar`, `finance`, `contacts`, `storage`.

Cross-page navigation (e.g., task → file in storage) uses a global:
```js
window.SEVEN_NAV('storage', { kind: 'note', id: 'n123' });
```
`App` listens to this and passes `navTarget` to `StoragePage` which scrolls/opens the right item.

---

## Storage Page Deep-Dive

`storage.jsx` is the most complex file (~700 lines). Key architecture points:

- **Three panes:** folder sidebar, notes list / files grid, editor
- **Mobile:** controlled by `mobileScreen` state: `'folders' | 'list' | 'editor'` — CSS `data-mobile-screen` attribute shows/hides panes
- **All sub-panes are render-functions** (`renderFolderPane`, `renderNotesPane`, `renderEditorPane`, `renderFilesPane`) called as `{renderX()}` — NOT React components — to prevent remount on state change
- **Note editor blocks:** Each block is a plain JS object in the `blocks` array. Saved to DB as JSON string. `NoteBlock` (in `storage-blocks.jsx`) renders each type
- **File upload:** Base64-encoded, sent to Cloud Function `?action=upload`, proxied to Object Storage. Max 4 MB
- **File menu (3-dot):** Uses `position:fixed` dropdown with `getBoundingClientRect()` to escape `overflow:hidden` parents. State: `fileMenuPos: { id, top, left }`
- **Slash commands** in editor: type `/` in the new-line input → `SlashMenu` appears with file/note picker

---

## Mobile Layout

- Breakpoint: `@media (max-width: 768px)` in `styles.css`
- Desktop sidebar hidden → `MobileNav` bottom tab bar shown
- Calendar: `.cal-desktop { display:none }`, `.cal-mobile { display:block }` in mobile @media
- Storage: single column, `data-mobile-screen` attribute drives which pane is visible
- Contacts: `contact-detail-panel` gets `.mobile-open` class when a contact is tapped
- Notification bell: `.notif-mobile-btn { display:none }` on desktop, shown on mobile
- **No zoom on input focus:** `viewport` meta has `maximum-scale=1, user-scalable=no`

---

## Auth Flow

1. On load, `App` checks `sessionStorage.getItem('7on_auth') === '1'`
2. If not set → render `LockScreen`
3. `LockScreen` POST `{ password }` to `?action=check-password`
4. Server compares to `APP_PASSWORD` env var, returns `{ ok: true/false }`
5. On success → `sessionStorage.setItem('7on_auth', '1')` → `setUnlocked(true)`
6. `LockScreen` also fetches `?table=files` **before auth** and shows `quick_access: 1` files at the bottom as download links — no auth needed for the Cloud Function itself

---

## Common Patterns

### Creating a new page
1. Create `mypage.jsx` with `const MyPage = ({ D, refresh }) => { ... }; window.MyPage = MyPage;`
2. Add `<script type="text/babel" src="mypage.jsx"></script>` to `index.html` (before `app.jsx`)
3. Add route in `app.jsx`: add to `PAGE_LABEL`, render in the routes switch
4. Add to `MobileNav` items and `Sidebar` items

### Modifying a table schema
1. Update the CRUD functions in `data.jsx` (the spread into `apiPost`/`apiPatch`)
2. No migration needed — Object Storage JSON files are schema-less; old rows just won't have the new field (treat as falsy/empty)
3. If it's a **new table**: add to `TABLES` set in `yandex-function.js` and redeploy

### Adding a modal
Use the `Modal` component from `shared.jsx`:
```jsx
<Modal title="..." onClose={...} onConfirm={...} confirmLabel="..." confirmDisabled={...}>
  <Field label="Поле"><FInput ... /></Field>
</Modal>
```

### Date formatting
`fmtDate(str)` from `shared.jsx` — accepts `"DD.MM"`, `"DD.MM.YYYY"`, ISO strings. Returns a human-readable string or empty string for falsy input.

---

## Known Gotchas

1. **Yandex Cloud Function cold starts** take 1–3 s on first request. The loading screen has a timeout-aware message.
2. **Supabase is NOT used** despite the `vendor/supabase.js` being loaded. It was used in an earlier version. The `offline` state / reconnect logic in `app.jsx` checks `window.SUPABASE_OK` which `data.jsx` always sets to `true` after a successful load.
3. **`storage-data.jsx` runs before `loadAllData()`** — it initializes `window.SEVEN_DATA` with demo fallback if the real data hasn't loaded yet.
4. **Calendar events use `event_date` (ISO) as primary, `day` (1–7) as legacy fallback.** When creating events, always provide `event_date`.
5. **File size limit for upload: 4 MB** (Cloud Function body size constraint). Larger files must be uploaded directly via Yandex Cloud Console.
6. **`window.SEVEN_DATA`** is the global data store. All pages receive it as prop `D`. After any mutation, call `await refresh()` to reload from API and re-render.
