# LifeDrop — Blood Bank Management System

**Zero-cost Indian blood bank locator, 3-tap donor SOS network, and offline trauma first-aid PWA built to save critical minutes.**

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x%20Strict-3178C6?logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Spark%20Free-FFCA28?logo=firebase&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-Offline%20Ready-5B3FE0)
![License](https://img.shields.io/badge/License-MIT-34D399)

> **Demo data:** user counts and blood bank stock are seeded for demonstration. They are not real.

**Live Demo:** `[https://your-lifedrop-app.web.app](https://your-lifedrop-app.web.app)` *(replace after Firebase Hosting deploy — HTTPS required)*

---

## Screenshots

| Home (Dark Theme) | Home (Light Theme) | Location Explainer & Consent |
| :---: | :---: | :---: |
| ![Home Dark](./docs/home-dark.png) | ![Home Light](./docs/home-light.png) | ![Location Explainer](./docs/location-explainer.png) |

| Bleeding Emergency (Offline) | India Map (36 States & UTs) |
| :---: | :---: |
| ![Bleeding Emergency](./docs/bleeding-emergency.png) | ![India Map](./docs/india-map.png) |

*(Add captured PNGs under `docs/` before sharing publicly.)*

---

## Problem & Solution

During trauma or obstetric emergencies in India, patient attendants often waste critical minutes calling outdated blood bank numbers or searching unverified social posts—frequently on weak mobile networks. LifeDrop unifies an offline-capable bleeding emergency guide (`108` / `112` one-tap dials and Read Aloud), an All-India 36 State & UT OpenStreetMap blood bank directory, and a privacy-safe 3-tap SOS matching flow. The entire platform runs at zero infrastructure cost on Firebase Spark and static PWA hosting so no community or student deployment incurs surprise cloud bills.

---

## Features Checklist (M1 – M7)

- [x] **M1 — Home & Offline First Aid:** 96px thin lifesaver counter, All-India toggle, snap glass sheet, multilingual bleeding guide (`EN`/`HI`/`KN` + Web Speech Read Aloud), coarse GPS (`~2 km`) + 36 State/UT manual picker, Dark/Light/Data Saver modes.
- [x] **M2 — All-India State Map:** Interactive Leaflet + OpenStreetMap map with 36 State/UT aggregate markers, paginated blood bank cards, `Near me` distance sorting, and accessible Table view.
- [x] **M3 — Donor Identity & DPDP Controls:** Google & Email Auth, strict `18+` age gate, DPDP Act 2023 JSON export/consent withdrawal/account deletion, eligibility countdown ring, badges, and downloadable PNG donor certificate.
- [x] **M4 — Client-Side Eligibility Checker:** 7 clinical deferral checks, gender-based donation intervals (`90d` / `120d`), and post-donation care guidance.
- [x] **M5 — 3-Tap SOS & Offline ABO/Rh Compatibility:** Radius escalation (`5 km -> 15 km -> 30 km -> State`), matched-donor phone unlock, and a standalone offline Compatibility Checker (`compatibility.json`, zero AI calls).
- [x] **M6 — Blood Bank & Admin Portals:** Verified blood bank stock editor, donor unit confirmation (`lab-confirmed`), bank verification queue, KPI dashboard, and append-only audit logs.
- [x] **M7 — Multilingual Assistant & PWA Hardening:** Offline 3-language knowledge base (`40/40` evals), optional Cloudflare Worker Gemini fallback, `vite-plugin-pwa` offline precaching, `firestore.rules` contract suite, and App Check wiring.
- [ ] **Future Paid-Tier Roadmap (Deferred by Design):** Background FCM push notifications and server-side Cloud Functions remain outside the current zero-cost Spark scope.

---

## Run Locally

**Prerequisites:** `Node.js 20+` (or `Bun`) and `npm`.

```bash
# 1. Install dependencies
npm install

# 2. Copy the environment template (all values optional; leave keys empty for Spark offline-first mode)
cp .env.example .env

# 3. Start development server (http://localhost:3000)
npm run dev

# 4. Run validation checks
npm run lint
npm run eval:assistant
npm run test:rules

# 5. Build and preview production bundle
npm run build
npm run preview
```

---

## Environment Variables

All keys in [`.env.example`](./.env.example) are optional and shipped empty. **Firebase web config** (`firebase-applet-config.json`) is intentionally public browser metadata—it is **not a secret**, so it must be protected via **Firestore Security Rules**, **Google Cloud HTTP Referrer API key restrictions**, and **Firebase App Check (`reCAPTCHA v3`)**. The **Gemini API key must never be placed in the client bundle** (`VITE_*`); it belongs only as a server-side secret on the optional Cloudflare Worker (`workers/chat-worker/index.ts`).

| Key | Description | Where to Get It | Secret? |
| :--- | :--- | :--- | :---: |
| `VITE_FIREBASE_APP_CHECK_SITE_KEY` | Optional public reCAPTCHA v3 site key for Firebase App Check client verification. | Google reCAPTCHA Admin + Firebase Console -> App Check | No (Public `VITE_*`) |
| `VITE_CHAT_WORKER_URL` | Optional HTTPS URL of your Cloudflare Worker proxy for online Assistant fallback. | Output URL of `npx wrangler deploy` (`workers/chat-worker/index.ts`) | No (Public `VITE_*`) |
| `APP_URL` | Optional deployed origin URL injected at runtime or Hosting setup. | Firebase Hosting Console | No |
| `GEMINI_API_KEY` | Google AI Studio key used strictly server-side by the optional Cloudflare Worker. | Google AI Studio -> API Keys (store via `wrangler secret put`) | **Yes (Server Secret)** |

---

## Performance

- **Bundle Splitting:** `App.tsx` lazy-loads screens, drawers, and modals (`BleedingEmergencyModal`, `LocationModals`, `SettingsDrawer`, `MapScreen`, `SosScreen`, `ChatScreen`, `ProfileScreen`, `CompatibilityCheckerModal`, `AdminPortalModal`, `BloodBankDashboardModal`) via `React.lazy` + `Suspense`, while `vite.config.ts` separates `vendor-react`, `vendor-firebase`, `vendor-leaflet`, `vendor-icons`, and `vendor-motion`.
- **Measured Production Sizes (`npm run build`):**
  - Main entry (`dist/assets/index-*.js`): **`96.58 kB`** (**`26.23 kB` gzipped**) — well under the `250 kB` gzipped budget
  - Core React vendor (`vendor-react`): **`404.71 kB`** (**`123.13 kB` gzipped**)
  - Firebase SDK chunk (`vendor-firebase`, Auth + Firestore): **`680.21 kB`** (**`203.31 kB` gzipped**)
  - Lazy Leaflet vendor (`vendor-leaflet`, Map tab only): **`148.60 kB`** (**`43.33 kB` gzipped**)
  - Lazy Icons (`vendor-icons`): **`39.84 kB`** (**`14.28 kB` gzipped**) · Motion (`vendor-motion`): **`6.43 kB`** (**`2.71 kB` gzipped**)
  - Total CSS (`index.css`): **`64.71 kB`** (**`10.73 kB` gzipped**) · PWA Precached Assets: **`47 entries` (`2081.07 KiB`)**
- **Target:** **Lighthouse `90+`** across Performance, Accessibility, Best Practices, and SEO, with **first paint under 3 seconds on 4G**. *(Run Lighthouse locally against `npm run preview` since headless Chromium CLI is unavailable in the build container.)*

---

## Architecture

- **Layered Frontend (`src/`):**
  - `components/` — Reusable UI primitives, bottom sheet tabs, and lazy modals (`BleedingEmergencyModal`, `LocationModals`, `CompatibilityCheckerModal`, `EligibilityChecker`, etc.)
  - `screens/` — Top-level views (`HomeScreen`, `MapScreen`, `SosScreen`, `ChatScreen`, `ProfileScreen`)
  - `services/` — Clean business logic adapters (`statsService`, `locationService`, `bankService`, `sosService`, `authService`, `profileService`, `compatibilityService`, `chatService`) bound to strict TypeScript interfaces in [`src/services/interfaces.ts`](./src/services/interfaces.ts)
  - `hooks/` — State orchestration (`useHomeStats`, `useLocationFlow`, `useAuthProfile`, `useAppSettings`, `useOnlineStatus`, `usePWA`, `useVisualViewport`)
  - `data/` & `config/` — Offline India coordinates/polygons (`indiaLocations.ts`, `indiaStatesGeo.ts`), seeded baselines (`seedStats.ts`), multilingual knowledge JSONs (`bleedingFirstAid.json`, `assistantKnowledge.json`, `compatibility.json`), and review metadata (`medicalReview.ts`)
- **Firestore Read Budget (Firebase Spark Free Plan — 50,000 reads/day):**
  - Home reads **1 `stats/global`** + **1 `stats/state_{code}`** aggregate doc rather than querying individual users or banks.
  - India Map shows all 36 states from aggregate docs (`stats/state_*`) and paginates `/banks` strictly per selected state (`20` per page) backed by Firestore persistent local cache.
- **Offline Geo Resolution:** GPS coordinates are mapped locally via [`resolveIndiaLocationOffline`](./src/data/indiaStatesGeo.ts) using simplified state polygons and nearest city centroids—zero external geocoding API calls.

---

## Privacy & Safety

- **Coarse Location Only (`~2 km`):** Raw GPS coordinates are rounded to ~2 km before saving; precise home addresses are never requested or stored.
- **Strict PII Isolation & Deletion (DPDP Act 2023):** Phone numbers, email, and birth year are isolated in `/users/{uid}/private/contact` (or `/requests/{id}/private/contact` revealed only to the matched donor). Users can export JSON data, withdraw consent, or permanently delete their account and Auth record anytime.
- **No Paid Blood:** Voluntary donation only; zero commerce or payment flows.
- **18+ Gate:** Registration and donor pledges require age 18–65 verification.

---

## Medical Disclaimer

> Eligibility and first-aid content is general guidance, not medical advice. Final screening is by the blood bank doctor. **Content reviewed by a clinician: PENDING.**

Emergency screens include pinned `tel:108`, `tel:112`, and `tel:104` quick-dial controls and display `"Content version and review date"` from [`src/config/medicalReview.ts`](./src/config/medicalReview.ts).

---

## Known Limitations

- Client-side SOS radius escalation runs only while the requester keeps the app open.
- Background push notifications are deferred / planned (excluded on Firebase Spark free tier without Cloud Functions).
- Simplified offline state polygons near state borders may require confirming `"Detected: <State>. Not right? Change"`.
- Seeded donor stats, goals, drives, and initial blood banks are demonstration records tagged with **`Demo data`** chips until verified regional blood banks onboard.

---

## Deploy (Firebase Hosting + Rules)

> **Note:** **HTTPS is required** in production for browser `navigator.geolocation` and PWA service worker registration. Firebase Hosting (`*.web.app`) provides HTTPS automatically.

```bash
npm run build
npx firebase deploy --only firestore:rules,firestore:indexes,hosting
```

*(Optionally deploy `workers/chat-worker/index.ts` via `npx wrangler deploy` + `npx wrangler secret put GEMINI_API_KEY` if you want online LLM fallback.)*

---

## Roadmap, Contributing & Governance

- **Roadmap:** `M1`–`M7` client/Spark architecture complete; next phase introduces formal clinician content sign-off, verified hospital onboarding in Bengaluru/Karnataka, and optional Blaze Cloud Functions for background FCM alerts once funded.
- **Contributing:** See [CONTRIBUTING.md](./CONTRIBUTING.md) and our [Bug Report Template](./.github/ISSUE_TEMPLATE/bug_report.md).
- **Security Contact:** See [SECURITY.md](./SECURITY.md) for responsible disclosure (`[security-contact@example.com]`).
- **License:** [MIT License](./LICENSE) (c) 2026 Punixx.
- **Author:** **Punixx**, CSE (Data Science), New Horizon College of Engineering, Bengaluru.
