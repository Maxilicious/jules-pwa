# CLAUDE.md — Jules PWA Codebase Guide

This file provides essential context for AI assistants working on this repository.

---

## Project Overview

**Jules PWA** is a Progressive Web Application that serves as a session manager for [Google's Jules AI coding assistant](https://jules.google.com). It enables authenticated users to create, monitor, and manage Jules coding sessions, view associated GitHub pull requests, and receive push notifications about session status changes.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend framework | React 19 + TypeScript 5.9 (strict mode) |
| Build tool | Vite 7 |
| UI library | Material-UI (MUI) 7 with Material Design 3 theme |
| Routing | React Router DOM 7 |
| Backend / Auth | Firebase (Authentication + Firestore) |
| AI integrations | Jules API (v1alpha), Gemini API |
| GitHub integration | GitHub REST API via Personal Access Token |
| PWA | vite-plugin-pwa + Workbox |
| Offline storage | idb-keyval (IndexedDB) |
| Deployment | Firebase Hosting (via GitHub Actions) |

---

## Repository Structure

```
jules-pwa/
├── src/
│   ├── views/                # Page-level components (one per route)
│   │   ├── HomeView.tsx      # Main dashboard — session list, polling, actions
│   │   ├── LoginView.tsx     # Firebase Google OAuth login
│   │   ├── CreateSessionView.tsx  # Form to create a new Jules session
│   │   └── SessionDetailView.tsx  # Individual session detail + activity log
│   ├── layouts/
│   │   └── MainLayout.tsx    # App shell with header and navigation
│   ├── api/
│   │   └── client.ts         # All API functions (Jules, Firestore, GitHub)
│   ├── hooks/
│   │   └── useNotifications.ts  # PWA push notification hook
│   ├── theme/
│   │   └── (theme files)     # Material Design 3 color/typography configuration
│   ├── utils/
│   │   └── (Gemini helpers)  # AI-powered session title / prompt generation
│   ├── App.tsx               # Root component — route definitions
│   ├── main.tsx              # Entry point — service worker registration
│   ├── firebase.ts           # Firebase app + Firestore + Auth initialization
│   ├── index.css             # Global CSS resets and custom properties
│   └── App.css               # App-level styles
├── public/                   # Static PWA assets (manifest icons, logos)
├── .github/workflows/
│   └── deploy.yml            # CI/CD: build + deploy to Firebase Hosting on push to main
├── vite.config.ts            # Vite + VitePWA + Workbox configuration
├── firebase.json             # Firebase Hosting + Firestore config
├── firestore.rules           # Firestore security rules
├── tsconfig.json             # TypeScript project references root
├── tsconfig.app.json         # App TypeScript config (ES2022, strict)
├── tsconfig.node.json        # Build-tool TypeScript config (ES2023)
└── eslint.config.js          # ESLint flat config (ESLint 9+)
```

---

## Development Commands

```bash
# Start the dev server with Hot Module Replacement
npm run dev

# Type-check + build for production (outputs to dist/)
npm run build

# Preview the production build locally
npm run preview

# Run ESLint on all files
npm run lint
```

> **Note:** There is no test runner configured. If adding tests, Vitest (which integrates with Vite natively) is the recommended choice.

### Installing Dependencies

The CI pipeline uses `npm ci --legacy-peer-deps`. Use the same flag locally if peer dependency conflicts arise:

```bash
npm ci --legacy-peer-deps
```

---

## Environment Variables

All environment variables use the `VITE_` prefix (required for Vite to expose them to the browser). They are stored in `.env` locally (not committed) and as GitHub Actions secrets in CI.

| Variable | Purpose |
|----------|---------|
| `VITE_JULES_API_KEY` | Jules API authentication key |
| `VITE_GITHUB_PAT` | GitHub Personal Access Token for PR operations |
| `VITE_GEMINI_API_KEY` | Google Gemini API key for title/prompt generation |
| `VITE_FIREBASE_API_KEY` | Firebase web app API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firestore project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Cloud Messaging sender |
| `VITE_FIREBASE_APP_ID` | Firebase app identifier |

Access via `import.meta.env.VITE_*` in source code.

---

## Key Architectural Patterns

### API Layer (`src/api/client.ts`)
All external calls are centralized here — Jules API, Firestore CRUD, and GitHub API. Functions use native `fetch()` with manual error handling. API keys are injected from environment variables at call time.

- `API_BASE` constant holds the Jules API base URL (`https://jules.googleapis.com/v1alpha`)
- Firestore calls go directly through the Firebase SDK (not via client.ts)
- GitHub calls use a hardcoded PAT — gracefully degrade if the variable is absent

### Authentication
- Google OAuth via Firebase Authentication
- The authenticated user's email is checked against a hardcoded constant (`AUTHORIZED_EMAIL` in `HomeView.tsx`)
- Firebase `onAuthStateChanged` drives auth state across components — no context/store abstraction

### State Management
- No global state library (no Redux, Zustand, etc.)
- State lives in component-local `useState`/`useEffect` hooks
- Sessions are refreshed on a **10-second polling interval** in `HomeView`
- Notification deduplication is handled by key in `useNotifications`

### Styling
- MUI `sx` prop for component-level styles
- Material Design 3 custom theme (dark mode by default) in `src/theme/`
- Global resets and CSS variables in `index.css`
- Avoid creating new CSS files; use `sx` or MUI `styled()` for new styles

### PWA / Service Worker
- Configured in `vite.config.ts` via `vite-plugin-pwa`
- Workbox `StaleWhileRevalidate` caching strategy for Jules API routes
- API responses cached for 7 days with a max of 50 entries
- Service worker registered in `main.tsx`

### Routing
React Router v7 with these routes (defined in `App.tsx`):
- `/` — `HomeView` (session list, requires auth)
- `/login` — `LoginView`
- `/create` — `CreateSessionView`
- `/session/:id` — `SessionDetailView`

---

## Code Conventions

### Naming
- **Components / Views:** `PascalCase` with a descriptive suffix (`HomeView`, `MainLayout`)
- **Hooks:** `camelCase` with `use` prefix (`useNotifications`)
- **Constants:** `UPPER_SNAKE_CASE` for module-level constants
- **Files:** Match the exported component/hook name exactly

### TypeScript
- Strict mode is **on** — no implicit `any`, no unused variables
- Prefer explicit types over inference for function signatures
- Some `any` types exist in the codebase (technical debt); avoid adding more
- Use the `bundler` module resolution — do not add `.js` extensions to imports

### React
- Functional components with hooks only — no class components
- Co-locate logic with the view that owns it; extract to `hooks/` only if reused
- Keep `useEffect` dependencies explicit — do not disable the exhaustive-deps ESLint rule without a comment explaining why

### Imports
- Use absolute path aliases if added via `vite.config.ts`; otherwise use relative paths
- Group: external libraries first, then internal modules, then types

---

## Firebase / Firestore

**Security rules** (`firestore.rules`): Users can only read/write documents under their own `userId` path:
```
/users/{userId}/...
```

Never write code that accesses another user's Firestore data. Always scope queries to the authenticated user's UID.

**Firestore document structure** (current):
- `/users/{userId}/sessions/{sessionId}` — Jules session metadata

---

## CI/CD Pipeline (`.github/workflows/deploy.yml`)

Triggered on: `push` to the `main` branch.

Steps:
1. Checkout code
2. Setup Node 20 with npm cache
3. `npm ci --legacy-peer-deps`
4. `npm run build` (environment variables injected from GitHub Secrets)
5. Authenticate to Google Cloud via service account
6. `firebase-tools deploy --only hosting`

**Do not push breaking changes to `main` without verifying `npm run build` succeeds locally.**

---

## Common Gotchas

- **Hardcoded authorized email:** `AUTHORIZED_EMAIL` in `HomeView.tsx` restricts app access. Update this constant if the authorized user changes.
- **Legacy peer deps:** MUI 7 + React 19 may require `--legacy-peer-deps` for npm operations.
- **No test suite:** There are no automated tests. Manually test UI flows when making changes to views.
- **API key exposure risk:** All `VITE_*` variables are bundled into the client-side JS. They are intentionally browser-side keys, but treat them with care — do not log them.
- **10-second polling:** `HomeView` polls the Jules API every 10 seconds. Consider this when debugging network requests or adding new data-fetching logic.
- **PWA service worker caching:** During development with `npm run dev`, the service worker is typically not active. Test caching behavior with `npm run preview` against a production build.
