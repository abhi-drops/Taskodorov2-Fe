# Taskodoro — Project Reference

Consolidated spec combining the frontend repo (`Taskodoro-Fe`), backend repo (`Taskodoro-Be`), the original project/product doc, and the Penpot visual designs. Generated 2026-08-26. This is meant to be the single source of truth for planning Phase 2+ (task/note CRUD, groups, search/filter, Power Tools) with Claude Code across both repos.

> **Status flag:** Two items below (marked ⚠️) are inferred from mockup labels only and need your confirmation before being treated as locked spec — see [Open Questions](#open-questions--needs-confirmation).

---

## 1. Product Concept

A personal task manager designed to feel like a physical corkboard with sticky notes — tactile and human rather than a flat, minimal, control-panel-style productivity app.

- **Tagline direction:** "Build for humans" — positioned against generic todo apps.
- **Home screen** shows only essential features, kept deliberately simple for first-time users.
- **Power Tools** area holds advanced/opt-in customization so complexity never clutters the default experience.
- **Portfolio purpose:** built to demonstrate "engineering + UX" positioning for a job search (target roles: Product Engineer / UX Engineer / Design Systems Engineer). Value depends on finishing it and being able to articulate the *reasoning* behind decisions — see [Decision Log](#decision-log).

---

## 2. Tech Stack

### Frontend (`Taskodoro-Fe`)
| Concern | Choice |
|---|---|
| UI framework | React 19.2 |
| Language | TypeScript ~6.0 (strict) |
| Build tool | Vite 8 (`@vitejs/plugin-react`) |
| Styling | Tailwind CSS 4 (CSS-based `@theme`, no `tailwind.config.js`) |
| Routing | `react-router` 8 (`createBrowserRouter`) |
| Native shell | Capacitor 8 (Android) |
| Native storage | `@capacitor/preferences` (falls back to `localStorage` on web) |
| Google Sign-In (web) | `@react-oauth/google` |
| Google Sign-In (native) | `@southdevs/capacitor-google-auth` |
| Design tool | Penpot |
| Tests | None configured |

### Backend (`Taskodoro-Be`)
| Layer | Choice |
|---|---|
| Runtime | Cloudflare Workers |
| Framework | Hono ^4.13.4 |
| Database | Neon (serverless Postgres), HTTP driver `@neondatabase/serverless` ^1.1.0 |
| ORM | Drizzle ORM ^0.45.2 / drizzle-kit ^0.31.10 |
| Validation | Zod (planned — for JSONB payload validation, not yet in repo) |
| Auth | `hono/jwt` (HS256, 7-day expiry), `bcryptjs` ^3.0.3, `jose` ^6.2.10 (Google JWKS) |
| Language | TypeScript ^7.0.2, strict, ESNext, bundler resolution |
| Dev/deploy | Wrangler ^4.125.0 |

### Why this stack
- **Hono + Cloudflare Workers:** cheap/free tier, fast cold starts, edge-deployed.
- **Neon:** serverless Postgres; HTTP-based connection pooling suits edge/serverless better than persistent TCP connections (which Workers don't support — a normal `pg` driver won't work here).
- **Capacitor + React:** one codebase for web and native mobile, matches existing React skillset.
- **Drizzle:** pairs well with Hono + Neon; chosen over other ORMs coming from a Sequelize/TypeORM background.

---

## 3. Repo Layout

### `Taskodoro-Fe/`
```
src/
├── App.tsx                        # AuthProvider + RouterProvider, root component
├── main.tsx
├── index.css                      # Tailwind import + @theme design tokens
│
├── router/routes.tsx               # createBrowserRouter — only file that imports from pages/
│
├── pages/                          # Web UI + platform switch (isNative ? Mobile : Web)
│   ├── LoginPage.tsx
│   ├── SignupPage.tsx
│   └── HomePage.tsx
│
├── mobile/screens/                 # Native-specific UI variants
│   ├── LoginScreen.tsx
│   └── SignupScreen.tsx
│
├── common_logics/                  # Platform-agnostic hooks, no JSX
│   ├── useLoginForm.ts
│   ├── useSignupForm.ts
│   └── useGoogleSignIn.ts
│
├── components/
│   ├── PlaceholderHome.tsx
│   └── ui/                         # Dumb presentational components
│       ├── AppNameHeading.tsx
│       ├── AuthCard.tsx
│       ├── Button.tsx
│       ├── FormError.tsx
│       ├── GoogleSignInButton.tsx
│       ├── Spinner.tsx
│       └── TextField.tsx
│
├── lib/
│   ├── api/
│   │   ├── client.ts                # fetch wrapper, normalizes errors to ApiError
│   │   └── auth.ts                  # authApi.signup/login/google
│   ├── auth/
│   │   ├── authContext.ts
│   │   ├── AuthContext.tsx
│   │   ├── useAuth.ts
│   │   └── ProtectedRoute.tsx
│   ├── google/
│   │   ├── googleAuthWeb.ts
│   │   └── googleAuthNative.ts
│   ├── platform/
│   │   ├── isNative.ts              # Capacitor.isNativePlatform()
│   │   └── usePlatform.ts
│   └── storage/preferences.ts       # saveAuth/loadAuth/clearAuth
│
└── types/
    ├── auth.ts
    └── api.ts
```
Repo-root: `capacitor.config.ts`, `vite.config.ts`, `eslint.config.js`, `tsconfig*.json`, `GOOGLE_SIGNIN_TESTING.md`, `Taskodoro-Frontend-Plan.md`, `android/` (generated, gitignored).

### `Taskodoro-Be/`
```
src/
  index.ts                # entrypoint — mounts CORS + routes
  types/env.ts             # Bindings type (env vars/secrets on c.env)
  routes/
    health.ts               # GET /health
    auth.ts                  # /auth/* — signup, login, google, me
  middleware/auth.ts         # authMiddleware — verifies Bearer JWT
  lib/
    auth.ts                  # password hashing, JWT issue/verify, Google verify
    db.ts                     # getDb(databaseUrl) — per-request Drizzle client
  db/schema.ts                # Drizzle schema: users, notes
wrangler.jsonc              # name: taskodoro-be, compat date 2026-08-25
drizzle.config.ts
worker-configuration.d.ts   # generated via cf-typegen — don't hand-edit
Taskodoro-Backend-Plan.md
CLAUDE.md
.dev.vars                   # gitignored
```

---

## 4. Commands

**Frontend:**
```bash
npm run dev       # Vite dev server, http://localhost:5173
npm run build     # tsc -b && vite build
npm run lint      # eslint .
npm run preview
npm run android   # build + cap sync android + adb reverse tcp:8787 + install & launch
```
Android builds require JDK 21+, `adb`/Android SDK on `PATH`, `ANDROID_HOME`/`ANDROID_SDK_ROOT` set.

**Backend:**
```bash
npm run dev                     # wrangler dev, http://localhost:8787
npm run dev -- --ip 0.0.0.0     # bind all interfaces (test from phone on LAN)
npm run deploy                  # wrangler deploy --minify
npm run db:generate             # drizzle-kit generate — migration from schema changes
npm run db:migrate              # drizzle-kit migrate
npm run db:push                 # drizzle-kit push — direct, no migration file
npm run db:studio               # browse DB
npm run cf-typegen              # regenerate CloudflareBindings types
```
No `drizzle/` migrations directory exists yet — schema changes have gone through `db:push` directly so far.

---

## 5. Environment Variables

**Frontend** (`.env.local`, gitignored):
| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend base URL, defaults to `http://localhost:8787` |
| `VITE_GOOGLE_CLIENT_ID_WEB` | Google OAuth Web client ID — used at runtime on **both** platforms. Blank = Google button visible but disabled. |
| `VITE_GOOGLE_CLIENT_ID_ANDROID` | Documentation only — never read by any code path. Android client is matched via package name + debug SHA-1 in Google Cloud Console. |

**Backend** (`.dev.vars`, gitignored, auto-loaded by Wrangler + `drizzle.config.ts`):
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `JWT_SECRET` | HMAC secret for JWT signing/verifying |
| `GOOGLE_CLIENT_ID` | Web OAuth client ID |
| `GOOGLE_CLIENT_ID_ANDROID` | Android OAuth client ID |

Backend env vars map 1:1 to `src/types/env.ts`'s `Bindings` type — any new secret must be added there or the project won't typecheck. In production these become Wrangler secrets (`wrangler secret put ...`) — not yet done as of last snapshot.

For real-device Android testing against local backend: `adb reverse tcp:8787 tcp:8787` (automatic via `npm run android`) forwards phone's `localhost:8787` to the dev machine over USB.

---

## 6. Architecture: Web/Mobile Split (Frontend)

Every screen follows the same three-way split:

1. **`common_logics/`** — form state, validation, submit logic as platform-agnostic hooks (no JSX). `useLoginForm`/`useSignupForm` validate client-side (email regex, required fields, password ≥8 chars, confirm-password match), call `useAuth()`'s `login`/`signup`, navigate to `/` on success. `useGoogleSignIn` branches on `usePlatform().isNative`.
2. **`pages/`** — actual web JSX as an unexported component (e.g. `WebLoginContent` inside `LoginPage.tsx`) plus a default-exported switch: `isNative ? <MobileScreen /> : <WebContent />`. Only layer `router/routes.tsx` imports from.
3. **`mobile/screens/`** — native-specific UI (layout/touch targets/safe-area), rendered by `pages/*` when native.
4. **`components/ui/*`** — dumb, presentational, shared verbatim by web and mobile.

**Platform detection is always `Capacitor.isNativePlatform()`** via `usePlatform()` — never a viewport-width breakpoint. A native Android WebView and a narrow browser window must stay distinguishable, and a resizable browser window shouldn't flip into "mobile" layout.

### Routing
- `/login` → `LoginPage`
- `/signup` → `SignupPage`
- `/` → wrapped in `ProtectedRoute`, renders `HomePage` (currently `PlaceholderHome`)
- `*` → redirects to `/`

`ProtectedRoute` shows full-screen `Spinner` while `status === 'hydrating'` (avoids login-page flash on reload), redirects to `/login` if not authenticated, else renders nested `Outlet`.

---

## 7. Auth System (Implemented — Phase 1)

### State machine
`AuthState = { user, token, status, error }`, `status: 'hydrating' | 'authenticated' | 'unauthenticated'`.

### `AuthProvider`
- On mount: `loadAuth()` from Capacitor Preferences → sets status accordingly.
- `login`, `signup`, `loginWithGoogle` — call matching `authApi` method, persist via `saveAuth`, set `authenticated`; on failure set `state.error` and re-throw.
- `logout()` — clears Preferences, resets to `unauthenticated`.

### API layer
- `client.ts`: `api.post<T>(path, data, token?)` — only HTTP verb currently used. Reads `VITE_API_BASE_URL`, attaches `Authorization: Bearer <token>`, throws `ApiError` (status/code) on non-OK.
- `auth.ts`: `authApi.signup/login/google` → `/auth/signup`, `/auth/login`, `/auth/google`.

### ⚠️ Backend response quirk
`/auth/signup` and `/auth/login` responses only include `{id, email}` on `user` — **never `name`**, even though signup accepts `name` in the payload. `User.name` is optional in `types/auth.ts`; `PlaceholderHome` falls back to displaying email when `name` is absent. Keep this in mind if Phase 2 UI assumes a display name exists.

### Session persistence
`lib/storage/preferences.ts` wraps `@capacitor/preferences`, storing `taskodoro.auth.token` / `taskodoro.auth.user` (JSON-stringified). Transparently uses `localStorage` on web — no platform branching needed in calling code.

### Google Sign-In
- **Web:** `@react-oauth/google`'s `GoogleOAuthProvider` + `GoogleLogin`. `credentialResponse.credential` is the raw ID token JWT, sent as-is.
- **Native:** `@southdevs/capacitor-google-auth` — chosen over `@capacitor-community/google-signin` (doesn't exist on npm) and `@codetrix-studio/capacitor-google-auth` (stale, capped at Capacitor 6).
- Both platforms must produce an ID token whose `aud` claim is the **Web** client ID — the backend verifies against `GOOGLE_CLIENT_ID` (the Web client) regardless of sending platform.
- **Critical gotcha:** `@southdevs/capacitor-google-auth`'s `signIn()` *ignores* any `clientId`/`serverClientId` passed directly — only uses whatever was set during `GoogleAuth.initialize()`. `googleAuthNative.ts` passes `GOOGLE_CLIENT_ID_WEB` to `initialize()` for this reason. Omitting it → plugin falls back to a bundled placeholder Android string resource → fails with `DEVELOPER_ERROR (10)` (no account picker, no network request — easy to misdiagnose as a Console config issue).
- `capacitor.config.ts` sets `plugins.GoogleAuth.scopes: ['profile', 'email']` only — no `serverClientId` in the config file (handled instead via `initialize({ clientId })`).
- `isGoogleWebConfigured()` / `isGoogleNativeConfigured()` both just check `Boolean(VITE_GOOGLE_CLIENT_ID_WEB)`. Unset → `GoogleSignInButton` renders disabled instead of crashing.
- Full Google Cloud Console setup + test checklist + failure-signature table: `GOOGLE_SIGNIN_TESTING.md` in the frontend repo.

### Backend auth details
- **JWT:** HS256 via `hono/jwt`, 7-day expiry, payload `{ sub: userId, iat, exp }`.
- **Password hashing:** bcryptjs, cost factor 10 (chosen for Workers runtime compatibility — native bcrypt/argon2 won't run there).
- **Google verification:** `jose`'s `createRemoteJWKSet` (cached module-level per isolate) + `jwtVerify`, checking audience (accepts either `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_ID_ANDROID`) and issuer (`accounts.google.com`, with or without scheme).
- **Middleware** (`src/middleware/auth.ts`): reads `Authorization` header, strips `Bearer `, verifies JWT, sets `userId` via `c.set('userId', ...)`. Applied per-route (currently only `/auth/me`), not globally.
- Frontend's native Android Google Sign-In requests a token audienced to the **web** client ID, not Android's — so dual-audience acceptance server-side is defensive, not currently load-bearing.

### Backend auth routes (implemented)
| Route | Body | Behavior |
|---|---|---|
| `POST /auth/signup` | `{ email, password }` | Normalizes email (trim+lowercase), requires password ≥8 chars, 409 if exists, bcrypt hash (cost 10), `provider: 'manual'`. Returns `201` `{ token, user: {id, email} }`. |
| `POST /auth/login` | `{ email, password }` | 401 on missing user / no password hash (Google-only account) / wrong password. Returns `{ token, user: {id, email} }`. |
| `POST /auth/google` | `{ idToken }` | Verifies against Google JWKS, dual audience accepted. 401 if invalid. Finds-or-creates user by email; if manual-provider user exists without `google_id`, backfills it (account linking). Returns `{ token, user: {id, email} }`. |
| `GET /auth/me` | — (Bearer JWT) | Protected. Returns `{ user: {id, email, provider} }`, or 404 if user deleted after token issued. |

### CORS
Applied globally, `origin: '*'`, allows `Content-Type`/`Authorization`, `GET/POST/PUT/PATCH/DELETE/OPTIONS`. **Intentionally permissive for local dev** (Android on LAN IP + web on `localhost:5173` both need to reach `wrangler dev`). **Needs tightening before any non-local deployment** — called out explicitly in backend `CLAUDE.md`. Note: `Taskodoro-Backend-Plan.md` says CORS was originally scoped to `localhost:5173`; the code (`*`) is broader — code is source of truth.

---

## 8. Database Schema (Current — Phase 1)

**`users`**
| column | type | notes |
|---|---|---|
| `id` | uuid, PK | `defaultRandom()` |
| `email` | text | not null, unique |
| `password_hash` | text | nullable — null for Google-only accounts |
| `provider` | text | not null — `'manual' \| 'google'` |
| `google_id` | text | nullable |
| `created_at` | timestamptz | not null, `defaultNow()` |
| `updated_at` | timestamptz | not null, `defaultNow()` |

**`notes`** (scaffolded, **no routes wired up yet** — needs revision, see §10)
| column | type | notes |
|---|---|---|
| `id` | uuid, PK | `defaultRandom()` |
| `user_id` | uuid | not null, FK → `users.id`, `onDelete: 'cascade'` |
| `title` | text | not null |
| `content` | text | nullable |
| `created_at` | timestamptz | not null, `defaultNow()` |
| `updated_at` | timestamptz | not null, `defaultNow()` |

This shape predates the visual design work and **does not yet reflect** groups, note types, priority, or color — see §10 for the schema changes needed before Phase 2 CRUD is implemented.

### Planned but unimplemented: offline-first sync
- **Conflict resolution:** last-write-wins per note (acceptable — single-user app, conflicts rare). Timestamp/version-based merge considered but rejected as unnecessary complexity at this scale.
- **Change tracking:** every row needs `updated_at` + `synced_at` (or `is_dirty` flag) so the client knows what to push on reconnect.
- **Local storage:** `@capacitor-community/sqlite` planned. ⚠️ Web fallback uses a different underlying engine than native — needs explicit testing, not guaranteed 1:1 behavior.

### Type-specific note data — decision
- **Chosen (Option A):** `JSONB` column on `notes` for type-specific payload (counter value, subtask list, etc.) — pragmatic, avoids join explosion across variable note types. Validate strictly at the API layer with **Zod** even though storage is loose.
- **Rejected (Option B):** separate related tables (`note_counters`, `note_subtasks`) — more rigid, more joins, more DB-level type safety, but more overhead for this scale.

---

## 9. Type Contracts (Frontend, current)

```ts
// types/auth.ts
interface User { id: string; email: string; name?: string; avatarUrl?: string }
interface AuthResponse { token: string; user: User }
interface LoginPayload { email: string; password: string }
interface SignupPayload { email: string; password: string; name: string }
interface GoogleAuthPayload { idToken: string }

// types/api.ts
interface ApiErrorBody { message: string; code?: string }
class ApiError extends Error { status?: number; code?: string }
```

---

## 10. Visual Design (Penpot) — Phase 2 Scope

Designs iterated across multiple mockup revisions in Penpot. This section documents what the mockups specify that **is not yet reflected** in the Phase 1 schema/API above — this is the actual Phase 2 planning input.

### Aesthetic
- Corkboard + sticky notes, playful/tactile rather than clean-minimal.
- Handwritten/marker-style typography.
- Color-coded sticky note columns: default groups are **Todo** (yellow), **In Progress** (red/pink), **Completed** (green); a blue note style used for counter-type notes.

### Board screen
- Workspace header with search icon, board title ("workspace 1").
- Tab-based filtering across groups (Todo / In Progress / Completed by default) with clear active/inactive tab contrast.
- Group progress indicator: a percentage bar (e.g. "60%") under the tabs, showing completion within the active group.
- Bottom nav: Home, quick-add (+), Power Tools — each with icon + label.

### Note types
1. **Plain task note** — title + optional truncated body text, checkmark-circle icon top-right to mark complete.
2. **Counter widget note** — title + numeric value with `+`/`−` controls, for trackable/repeatable tasks (e.g. "23").
3. **Checklist note** — title + sub-tasks list, each with its own circle/checkmark, strikethrough styling on completed sub-items.

All note types share: a color (yellow/coral/blue/green — user- or type-associated), a checkmark-circle affordance, and card-style rounded corners (`--radius-card: 1rem` already defined in `index.css`).

### Note create/edit screen ("notes with content" / "new notes" mockups)
Fields:
- **Title** (text)
- **Description** (multi-line text, sample placeholder shown as "sample description...")
- **Note Type** (dropdown — Task shown, implies Counter/Checklist as other options)
- **Color** (swatch picker — yellow/coral/blue/green)
- **Priority** (dropdown — "normal" shown as default; see Search below for the fuller high/medium/low set)

This is the actual create/edit UI and implies a corresponding API surface (`POST/PATCH /notes`) that doesn't exist yet.

### Search & filter screen
Two states shown:
- **Plain search** — search input + icon, filter dropdown collapsed.
- **Search with filter expanded** — filters by:
  - **Status:** All / Todo / In Progress / Completed
  - **Priority:** High / Medium / Low
  - **Color:** All four sticky colors as filter chips
  - A secondary status tab row (All / Todo / In Progress / Completed) beneath the filter panel.

**Implication:** `priority` is a real field on notes (`'high' | 'medium' | 'low' | 'normal'`?) that does not exist anywhere in the current `notes` table or JSONB discussion. Needs to be added to schema before Phase 2 CRUD.

### Power Tools screen
- **Addon Tools:** "Pomodoro" listed as an available addon.
- **Groups:** list of current groups (Todo, In Progress, Completed shown, each with a settings gear + delete icon), plus **"+ New Group"** — confirms **groups are user-configurable, not a fixed enum**. This means the backend's `notes.column_state` concept (implied by the product doc's original `column_state -- todo / in_progress / completed` field) needs to become a **`group_id` FK into a new `groups` table**, not a fixed string union. See §11.
- **Account:** "Sync with Google" (distinct action from Google Sign-In auth — likely a Google Tasks/Calendar sync, not yet specified) and "Reset to Default" (destructive account action, needs confirmation flow).

### Group settings screen (per-group config, reached from Power Tools)
- **Sorted By:** dropdown, "A To Z" shown (implies other sort options — likely date, priority, manual/position).
- **On Check Move To:** dropdown, "none" shown — auto-move a note to a different group when checked complete (e.g. Todo → Completed on check). This is a per-group behavior rule, not currently modeled anywhere.
- **Note Colors:** dropdown, "Random" shown — implies a per-group color assignment mode (random vs. fixed/manual).
- **Delete This Group** — destructive action, presumably requires reassigning or cascading its notes.

### Power Tools — opt-in features (off by default)
Per your confirmation, these are real planned features, off by default, toggleable from Power Tools:
- **Total % on groups without a next-group check** — a group-level completion percentage that is calculated *without* factoring in notes that have a "move to next group on check" rule applied (i.e. excludes notes whose completion would otherwise auto-migrate them out of the group). Exact display/calculation behavior still needs to be nailed down with you before implementation — see [Open Questions](#open-questions--needs-confirmation).
- **Turnication** — (name as given in mockup; likely intended as "truncation" toggle) controls whether long note text is truncated with "..." on the board view. This directly relates to the **unresolved UX question** below (no visual affordance currently shown for truncated/expandable text). Exact scope (just body text? title too? what expands it — tap, chevron?) needs confirmation.

### Open UX questions (unresolved as of last design review)
- [ ] **Checkmark-icon ambiguity** — unclear whether the top-right checkmark-circle signals "mark complete" or is a note-type badge, since it appears identically across Todo and In Progress notes.
- [ ] **Text truncation affordance** — long notes show "..." with no visual cue (chevron, "show more") that they're expandable. Directly relevant to the "Turnication" Power Tools toggle above.
- [ ] **Handwritten font legibility** at small mobile sizes — needs real-device testing, not just mockup viewing.

### Design tokens (`src/index.css`, Tailwind 4 `@theme`, already implemented)
```css
--color-sticky-yellow: #f5c842
--color-sticky-coral:  #f2777a
--color-sticky-blue:   #8fbfe8
--color-sticky-green:  #b8e19c
--color-accent-purple: #8b5cf6
--color-nav-dark:      #1e1e2a
--color-surface:       #f4f5f7
--radius-card:         1rem
```

---

## 11. Schema Changes Needed for Phase 2 (derived from designs, not yet implemented)

This is the delta between the current Phase 1 schema (§8) and what the visual designs (§10) require. Flagging explicitly since this is planning input, not existing code:

1. **New `groups` table** — replaces the implied fixed `column_state` enum. Needs at minimum: `id`, `user_id` (or `workspace_id`), `name`, `sort_order`/`position`, `sorted_by` setting, `on_check_move_to` (nullable FK to another group), `note_color_mode` (`'random' | 'fixed'`), `color` (if fixed mode), `created_at`, `updated_at`.
2. **`notes.group_id`** — FK → `groups.id`, replacing the flat `column_state` string.
3. **`notes.type`** — `'task' | 'counter' | 'checklist'` (already anticipated in the product doc's original schema sketch, not yet in the actual Drizzle schema).
4. **`notes.priority`** — new field, not previously modeled anywhere. Values implied by the filter UI: likely `'high' | 'medium' | 'low'` plus a `'normal'` default shown on the edit screen — needs reconciling (is "normal" the same as "low", or a fourth value?).
5. **`notes.color`** — new field (or derived from group's `note_color_mode`) — needs deciding whether color is per-note or inherited from group.
6. **`notes.payload`** (JSONB) — type-specific data per the Option A decision in §8 (counter value; checklist sub-items with their own `id`/`text`/`completed`/`order`).
7. **`notes.position`** — for manual ordering within a group (implied by "Sorted By" options beyond alphabetical).
8. **Workspace concept** — mockups show "workspace 1" as a labeled container above the board; unclear whether this is a real multi-workspace feature (user can have several boards) or just a placeholder label for the single implicit workspace. Needs confirmation — affects whether `groups`/`notes` are scoped to `user_id` directly or to a `workspace_id` that itself belongs to a user.

None of this is implemented in either repo yet. Recommend deciding priority semantics and the workspace question (see below) before writing Zod schemas or Drizzle migrations, since both cut across the whole notes/groups data model.

---

## 12. Monetization (Exploratory — Not Implemented)

**Tier structure (Plan 2 — chosen direction):**
- **Free plan** — base features; UI shows user as already enrolled ("on Free plan"), never "no plan" — chosen deliberately for loss-aversion framing (upgrading feels like *extending* something owned, not *starting to pay*; also avoids falsely implying zero access).
- **Gold plan** — ₹89
- **Purple Star plan** — ₹259
- Two-tier paid ladder (~3x step) preferred over three tiers with uneven pricing gaps.

**Undefined:** exact feature gating per tier. Needs deciding before pricing is finalized — pricing without clear value differentiation is an arbitrary number to users. Reasonable candidates given the design (not yet decided): Pomodoro addon, Google Sync, multiple workspaces, and/or the two off-by-default Power Tools features could plausibly be paid-tier gates, but nothing in the source material confirms this — treat as a brainstorm, not a decision.

---

## 13. Decision Log

> *Problem → Options considered → Choice made → Rationale.* Kept as source material for portfolio/interview narration — don't collapse this into just the outcome.

- **Home vs. Power Tools split** — Options: single settings-heavy screen vs. split simple/advanced. Chose split. Rationale: keeps first-time UX simple while still serving power users; avoids overwhelming new users with configuration on day one.
- **Subscription framing (loss-aversion)** — Compared "not yet on any plan" vs. "already on Free plan" framing. Chose the latter. Rationale: loss aversion makes upgrading feel like keeping/extending rather than starting to pay; avoids the false-premise trust issue of implying zero access when free features already exist.
- **Type-specific note data: JSONB vs. separate tables** — Chose JSONB column with Zod validation at the API layer. Rationale: avoids join explosion for variable note shapes (task/counter/checklist); storage is loose but the API boundary stays strictly typed.
- **Conflict resolution: last-write-wins vs. timestamp/version merge** — Chose last-write-wins. Rationale: single-user app, conflicts are rare; version-merge complexity isn't justified at this scale.
- **Local mobile/web storage: `@capacitor-community/sqlite`** — chosen for offline-first sync, with the caveat that web fallback uses a different underlying engine than native and needs explicit cross-platform testing.
- **Native Google Sign-In library** — `@southdevs/capacitor-google-auth` chosen over `@capacitor-community/google-signin` (doesn't exist on npm — dead reference in the original plan doc) and `@codetrix-studio/capacitor-google-auth` (stale, capped at Capacitor 6).
- **Session storage: Capacitor Preferences vs. localStorage** — chosen Preferences API for cross-platform consistency (localStorage alone isn't reliably consistent across native/web).
- **Backend hosting: Cloudflare Workers vs. Netlify Functions** (for the potential future Grok API integration) — chose to stay on the existing Cloudflare Worker rather than introduce a second platform. Rationale: Workers' Free tier 10ms CPU limit is *active-compute-only* (waiting on the AI response itself doesn't count against it — only surrounding auth/Zod/parsing logic does), whereas Netlify's 10-second limit is wall-clock inclusive of the AI wait, a worse fit for LLM calls. Real risk should be measured via Workers Analytics rather than assumed; Cloudflare's $5/month tier raises the CPU limit to 50ms if it does become a constraint. Avoids maintaining a second hosting platform for one optional feature.
- **Desktop wrapper: Electrobun** — evaluated (TypeScript-first, Bun-based, ~12MB vs. Electron's ~200MB, fast startup) but **dropped/deferred**. Rationale: framework is new/small (adoption risk for a portfolio-critical project), would add a second native wrapper layer not actually shared with Capacitor beyond the UI, and doesn't meaningfully advance the primary goal (job search in 5–7 months). Could be revisited post-interview-prep as a stretch addition.

---

## 14. Current State vs. What's Not Built

### Done (Phase 1)
- ✅ Frontend: signup/login/Google Sign-In, session persistence, protected routing, placeholder authenticated home.
- ✅ Backend: Hono + Wrangler local dev, Neon connection verified via `/health`, `users` + `notes` (bare) schema pushed, manual signup/login with JWT, `/auth/me` session-restore, Google sign-in implemented (see caveat below).
- ✅ Visual design: home screen, note types, nav, Power Tools, group settings — mostly complete in Penpot, iterated across revisions.
- ✅ Tech stack decisions made and documented for both repos.

### Not done
- ⬜ **Notes/groups CRUD** — no routes exist on the backend beyond the bare `notes` table; no task UI exists on the frontend beyond `PlaceholderHome`. This is the actual Phase 2 scope, and per §11 the schema needs revision (groups table, note type, priority, color, JSONB payload) before CRUD routes are written.
- ⬜ **Google Sign-In success path** — implemented and error paths verified, but needed a real `GOOGLE_CLIENT_ID` to test the success path end-to-end as of the last plan-doc update. Commits landed after (`sso web`, `sso android`) — worth explicitly re-confirming this works before building anything downstream that assumes auth is solid.
- ⬜ `wrangler dev --ip 0.0.0.0` LAN-accessible run — deferred, explicitly meant to be triggered manually (exposes live DB + JWT secret to LAN).
- ⬜ CORS tightening — currently `origin: '*'`, needs scoping before any non-local deploy.
- ⬜ Search/filter implementation (status, priority, color).
- ⬜ Power Tools: Pomodoro addon, Google Sync (distinct from Google Sign-In auth), Reset to Default flow.
- ⬜ The two off-by-default features (group % without next-group-check, "Turnication"/truncation) — behavior confirmed as real+planned, but exact mechanics still need nailing down (§10).
- ⬜ Test suite — none configured in either repo.
- ⬜ Feature-to-monetization-tier mapping — undefined.
- ⬜ Desktop (Electrobun) — deferred.
- ⬜ Production deployment — no evidence either repo has been deployed; no Wrangler secrets set beyond local `.dev.vars`.

---

## 15. Open Questions / Needs Confirmation

Before Phase 2 implementation starts, these should be locked down — they affect schema design directly:

1. **Priority values** — is the edit-screen default "normal" a fourth value alongside High/Medium/Low, or does it map onto "Low"? Affects the Zod enum and the filter UI's option list consistency.
2. **Workspace scope** — is "workspace 1" a real multi-workspace feature (user can own several boards) or just a label on the single implicit workspace? Affects whether `groups` FKs to `user_id` or to a new `workspace_id`.
3. **Note color** — is color set per-note (as the edit screen implies, with a swatch picker) or inherited from the group's `note_color_mode` setting (random/fixed, per Group Settings)? These two screens currently imply conflicting ownership of the same value.
4. **"On Check Move To"** — confirm the exact trigger: does checking a note complete immediately move it to the target group, or only after some delay/confirmation? Does it apply to all note types (counter notes don't have an obvious "checked" state)?
5. **"Total % on groups without a next-group check"** — confirm the calculation: percentage of notes complete within a group, excluding notes that have an active "on check move to" rule? Or something else — the label alone doesn't fully specify the arithmetic.
6. **"Turnication"** — confirm scope: title, body, or both? What's the expand affordance (tap the note, a chevron, a "show more" link)? This also resolves the open UX question about missing truncation affordance in §10.
7. **"Sync with Google"** in Power Tools — distinct from Google Sign-In auth. Sync with what Google product (Calendar? Tasks? Keep?) and in which direction (one-way import, two-way sync)?
8. **Counter note "checked" semantics** — the note-type mockups don't show a checkmark-circle on the counter note the way task/checklist notes have one. Confirm whether counter notes support "mark complete" at all, or are inherently ongoing/uncompletable.

---

## Related Docs (source material for this file)

- `Taskodoro-Fe/CLAUDE.md` — condensed frontend architectural rules.
- `Taskodoro-Fe/GOOGLE_SIGNIN_TESTING.md` — Google Cloud Console setup + test checklist.
- `Taskodoro-Fe/Taskodoro-Frontend-Plan.md` — original Phase 1 frontend checklist.
- `Taskodoro-Be/CLAUDE.md` — backend instructions/rules for Claude Code.
- `Taskodoro-Be/Taskodoro-Backend-Plan.md` — Phase 1 backend build plan.
- Penpot mockups (3 screenshots, 2026-08-26): board/note views, search/filter, note create/edit, Power Tools, group settings.
