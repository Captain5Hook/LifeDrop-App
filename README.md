# LifeDrop — Blood Bank Management System

**Zero-cost Indian blood bank locator, 3-tap donor SOS network, and offline trauma first-aid PWA built to save critical minutes.**

[![CI](https://github.com/OWNER/lifedrop/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/lifedrop/actions/workflows/ci.yml)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x%20Strict-3178C6?logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Spark%20Free-FFCA28?logo=firebase&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-Offline%20Ready-5B3FE0)
![License](https://img.shields.io/badge/License-MIT-34D399)

> **Demo data:** user counts and blood bank stock are seeded for demonstration. They are not real.

**Live demo:** https://YOUR-PROJECT.web.app <!-- TODO: Replace YOUR-PROJECT with your deployed Firebase Hosting project ID -->

## Quick Navigation
[Why LifeDrop](#why-lifedrop) · [Screenshots](#screenshots) · [Features (M1–M7)](#features-checklist-m1--m7) · [GUI Design System](#gui-design-system) · [Run Locally](#run-locally) · [Environment Variables](#environment-variables) · [Performance](#performance--measured-lighthouse) · [Architecture](#architecture) · [Privacy, Safety & DPDP](#privacy--safety) · [Assistant Eval](#assistant-evaluation) · [Known Limitations](#known-limitations) · [Pilot Plan](#pilot-plan) · [Deploy](#deploy-firebase-hosting--rules)

---

## Why LifeDrop

During trauma or obstetric emergencies in India, patient attendants often lose critical minutes calling outdated blood bank numbers or searching unverified social posts—frequently on slow mobile connections or inside hospital basements with zero signal. LifeDrop unifies an **offline-capable bleeding emergency guide** (`108` / `112` / `104` quick dials and Web Speech Read Aloud), an **All-India 36 State & UT OpenStreetMap blood bank directory**, a **standalone offline ABO/Rh Compatibility Checker**, and a **privacy-safe 3-tap SOS workflow**. Everything runs at zero infrastructure cost on **Firebase Spark** and static PWA hosting so community deployments never face surprise cloud bills.

---

## Screenshots

*(Screenshot PNGs under `/docs/` have not been captured yet — see planned slots below.)*

| Home (Dark Theme) | Home (Light Theme) | Location Explainer & Consent |
| :---: | :---: | :---: |
| `docs/home-dark.png` *(pending)* | `docs/home-light.png` *(pending)* | `docs/location-explainer.png` *(pending)* |

| Bleeding Emergency (Offline) | India Map (36 States & UTs) |
| :---: | :---: |
| `docs/bleeding-emergency.png` *(pending)* | `docs/india-map.png` *(pending)* |

---

## Features Checklist (M1 – M7)

- [x] **M1 — Home & Offline First Aid:** 96px thin lifesaver counter, All-India toggle, snap glass sheet (`38%` / `76%`), multilingual bleeding guide (`EN`/`HI`/`KN` + Web Speech Read Aloud), coarse GPS (`~2 km`) + 36 State/UT manual picker, Dark/Light/Data Saver modes.
- [x] **M2 — All-India State Map:** Interactive Leaflet + OpenStreetMap map with 36 State/UT aggregate markers, paginated blood bank cards (`20/page`), `Near me` distance sorting, filters, and accessible Table view.
- [x] **M3 — Donor Identity & DPDP Controls:** Google & Email Auth, strict `18+` age gate, DPDP Act 2023 JSON export/consent withdrawal/account deletion, eligibility countdown ring (`90d`/`120d`), badges, and PNG donor certificate export.
- [x] **M4 — Client-Side Eligibility Checker:** 7 clinical deferral checks, gender-based donation intervals, and post-donation care guidance.
- [x] **M5 — 3-Tap SOS & Offline ABO/Rh Compatibility:** Radius escalation (`5 km -> 15 km -> 50 km -> State`), matched-donor phone unlock, and a standalone offline Compatibility Checker ([`compatibility.json`](./src/data/knowledge/compatibility.json), zero AI calls).
- [x] **M6 — Blood Bank & Admin Portals:** Verified blood bank stock editor, donor unit confirmation (`lab-confirmed`), license-based bank verification queue, KPI dashboard, and append-only audit logs.
- [x] **M7 — Multilingual Assistant & PWA Hardening:** Offline 3-language knowledge base (`40/40` evals), optional Cloudflare Worker Gemini fallback, `vite-plugin-pwa` offline precaching (`47` assets), `firestore.rules` contract suite, and App Check wiring.
- [ ] **Future Paid-Tier Roadmap (Deferred by Design):** Background FCM push notifications, Cloud Functions rate-limiting, and document/PDF upload remain outside the current zero-cost Spark scope.

---

## GUI Design System

Verified across [`src/index.css`](./src/index.css), [`src/App.tsx`](./src/App.tsx), [`src/components/BottomNav.tsx`](./src/components/BottomNav.tsx), and [`src/components/HeroScene.tsx`](./src/components/HeroScene.tsx):

| Layer | Implementation |
| :--- | :--- |
| **Theme Gradients** | Night-sky indigo dark gradient (`#1B1740` -> `#6B4FBB`) paired with a lilac light variant (`#ECE9FC` -> `#CFC4F8`). |
| **Semantic Accents** | Primary violet `#5B3FE0`; clinical stock health tokens: Stable `#34D399` / `#059669`, Low `#FBBF24` / `#D97706`, Critical `#F43F5E` / `#E11D48`. |
| **Glassmorphism** | Frosted panels (`ld-glass`, `blur(20px)`) and snap bottom sheets (`ld-glass-sheet`, `blur(22px)`) over subtle starlight radial texture (`ld-stars`). |
| **Typography & Hero** | `Inter` font stack with viewport-scaled extra-light hero counter (`clamp(3rem, min(15vw, 10.5vh), 6rem)` up to `96px`) and tabular numerals. |
| **Responsive Frame** | `100dvh` full-bleed edge-to-edge on phones (`<=480px`); centered `430px × min(100dvh, 932px)` phone shell (`36px` radius) on tablet/desktop. |
| **Navigation & Accessibility** | Fixed header + single `ld-scroll-area` with `env(safe-area-inset-top/bottom)` + scalloped `72px` `BottomNav` featuring raised center `+ SOS` FAB, `44px` minimum tap targets, `useVisualViewportHeight()` soft-keyboard sizing, and `.data-saver` / `prefers-reduced-motion` animation reduction. |

---

## Run Locally

**Prerequisites:** `Node.js 20+` (or `Bun`) and `npm`.

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template (all keys optional; leave empty for Spark offline-first mode)
cp .env.example .env

# 3. Start local dev server (http://localhost:3000)
npm run dev

# 4. Run quality, safety & rules checks
npm run lint
npm run eval:assistant
npm run test:rules

# 5. Build and preview production bundle
npm run build
npm run preview
```

### Offline & PWA Smoke Checklist
1. Open the app once online so `vite-plugin-pwa` caches the shell and JSON knowledge packs.
2. Switch browser/device to **Airplane Mode / Offline** and reload (`Shift+R` / refresh).
3. Confirm the offline banner renders, **Bleeding Emergency First Aid** (plus Read Aloud & `108`/`112`/`104` links) works, and **Blood Compatibility Checker (Offline · No AI)** computes all 4 components offline.

---

## Environment Variables

All keys in [`.env.example`](./.env.example) are optional and shipped empty. **Firebase web config** (`firebase-applet-config.json`) is intentionally public browser metadata—it is **not a secret**, so it must be protected via **Firestore Security Rules**, **Google Cloud HTTP Referrer API key restrictions**, and **Firebase App Check (`reCAPTCHA v3`)**. The **Gemini API key must never be placed in the client bundle** (`VITE_*`); it belongs strictly server-side on the optional Cloudflare Worker (`workers/chat-worker/index.ts`).

| Key | Description | Where to Get It | Secret? |
| :--- | :--- | :--- | :---: |
| `VITE_FIREBASE_APP_CHECK_SITE_KEY` | Optional public reCAPTCHA v3 site key for Firebase App Check client verification. | Google reCAPTCHA Admin + Firebase Console -> App Check | No (Public `VITE_*`) |
| `VITE_CHAT_WORKER_URL` | Optional HTTPS URL of your Cloudflare Worker proxy for online Assistant fallback. | Output URL of `npx wrangler deploy` (`workers/chat-worker/index.ts`) | No (Public `VITE_*`) |
| `APP_URL` | Optional deployed origin URL injected at runtime or Hosting setup. | Firebase Hosting Console | No |
| `GEMINI_API_KEY` | Google AI Studio key used strictly server-side by the optional Cloudflare Worker. | Google AI Studio -> API Keys (store via `wrangler secret put`) | **Yes (Server Secret)** |

---

## Performance & Measured Lighthouse

- **Bundle Splitting:** [`App.tsx`](./src/App.tsx) lazy-loads screens, drawers, and modals (`BleedingEmergencyModal`, `LocationModals`, `SettingsDrawer`, `MapScreen`, `SosScreen`, `ChatScreen`, `ProfileScreen`, `CompatibilityCheckerModal`, `AdminPortalModal`, `BloodBankDashboardModal`) via `React.lazy` + `Suspense`, while [`vite.config.ts`](./vite.config.ts) splits `vendor-react`, `vendor-firebase`, `vendor-leaflet`, `vendor-icons`, and `vendor-motion`.
- **Measured Production Sizes (`npm run build`):**
  - Main entry (`dist/assets/index-*.js`): **`96.58 kB`** (**`26.23 kB` gzipped**) — well under the `250 kB` gzipped budget
  - Core React vendor (`vendor-react`): **`404.71 kB`** (**`123.13 kB` gzipped**)
  - Firebase SDK chunk (`vendor-firebase`, Auth + Firestore): **`680.21 kB`** (**`203.31 kB` gzipped**)
  - Lazy Leaflet vendor (`vendor-leaflet`, Map tab only): **`148.60 kB`** (**`43.33 kB` gzipped**)
  - Lazy Icons (`vendor-icons`): **`39.84 kB`** (**`14.28 kB` gzipped**) · Motion (`vendor-motion`): **`6.43 kB`** (**`2.71 kB` gzipped**)
  - Total CSS (`index.css`): **`64.71 kB`** (**`10.73 kB` gzipped**) · PWA Precached Assets: **`47 entries` (`2082.92 KiB`)**
- **Target:** **Lighthouse `90+`** across all categories with **first paint under 3 seconds on 4G**.

### Measured Lighthouse (Fill After Deployed HTTPS Run)

| Category | Target | Measured Score (Mobile 4G) | Notes |
| :--- | :---: | :---: | :--- |
| Performance | `90+` | — *(pending deployed run)* | Run against Firebase Hosting URL (`https://...`) |
| Accessibility | `90+` | — *(pending deployed run)* | Verify 44px targets, contrast & ARIA labels |
| Best Practices | `90+` | — *(pending deployed run)* | Verify HTTPS, headers & console errors |
| SEO | `90+` | — *(pending deployed run)* | Verify `index.html` title, meta & manifest |

---

## Architecture

- **Layered Frontend (`src/`):**
  - `components/` — Reusable UI primitives, bottom sheet tabs, and lazy modals (`BleedingEmergencyModal`, `LocationModals`, `CompatibilityCheckerModal`, `EligibilityChecker`, etc.)
  - `screens/` — Top-level views (`HomeScreen`, `MapScreen`, `SosScreen`, `ChatScreen`, `ProfileScreen`)
  - `services/` — Business logic adapters (`statsService`, `locationService`, `bankService`, `sosService`, `authService`, `profileService`, `compatibilityService`, `chatService`) typed against [`src/services/interfaces.ts`](./src/services/interfaces.ts)
  - `hooks/` — State orchestration (`useHomeStats`, `useLocationFlow`, `useAuthProfile`, `useAppSettings`, `useOnlineStatus`, `usePWA`, `useVisualViewport`)
  - `data/` & `config/` — Offline India coordinates/polygons (`indiaLocations.ts`, `indiaStatesGeo.ts`), seeded baselines (`seedStats.ts`), multilingual knowledge JSONs (`bleedingFirstAid.json`, `assistantKnowledge.json`, `compatibility.json`), and review metadata (`medicalReview.ts`)
- **Firestore Read Budget (Firebase Spark Free Plan — 50,000 reads/day):**
  - Home reads **1 `stats/global`** + **1 `stats/state_{code}`** aggregate doc instead of scanning user or bank collections.
  - India Map reads state summaries (`stats/state_*`) and paginates `/banks` per selected state (`20` per page) backed by Firestore persistent local cache.
- **Offline Geo Resolution:** GPS coordinates resolve locally via [`resolveIndiaLocationOffline`](./src/data/indiaStatesGeo.ts) using simplified state polygons and city centroids with zero external geocoding API calls.

---

## Privacy & Safety

- **Coarse Location Only (`~2 km`):** Browser GPS coordinates are resolved offline into state/city + rounded `coarseLat`/`coarseLng` (~2 km) and **exact GPS coordinates are never stored in Firestore or `localStorage`**.
- **Phone Number Reveal Rules ([`firestore.rules`](./firestore.rules) & [`src/services/sosService.ts`](./src/services/sosService.ts)):**
  - **Account PII (`/users/{uid}/private/contact`):** Readable **strictly by `request.auth.uid == userId`**. Never exposed on maps, stats, or donor directories.
  - **Donor Phone -> Requester (`/requests/{requestId}/responses/{donorUid}`):** A volunteer donor's optional `donorPhone` is revealed **only to that request's `requesterUid`** (and the donor themselves) **after the donor explicitly responds/accepts the SOS request**.
  - **Requester Phone -> Accepted Donor (`/requests/{requestId}/private/contact`):** A requester's optional attendant phone is revealed **only to the `requesterUid` and the matched donor (`acceptedByUid`)** once matched.
- **RBAC & Guardrails:** Users cannot self-promote `bloodGroupStatus` to `lab-confirmed`, bank owners cannot self-approve `bankApplications`, `auditLogs` are append-only, and unmatched Firestore paths default to deny (`allow read, write: if false`).
- **No Paid Blood & 18+ Only:** Voluntary unpaid donation only; registration and donor pledges require adult age verification (18–65).

---

## DPDP Compliance (India DPDP Act 2023)

- **Grievance Officer Contact:** `[grievance-officer@example.com]` *(placeholder for public deployment; in-app Grievance tab currently links maintainer contact under **Profile -> DPDP Privacy & Terms -> Grievance**)*.
- **In-App Privacy Policy & Terms:** Available under **Profile -> DPDP Privacy & Terms** ([`LegalPrivacyModals`](./src/components/LegalPrivacyModals.tsx) tabs: *Privacy (DPDP)*, *Terms of Use*, *Grievance*) and linked during signup consent ([`AuthOnboardingModal`](./src/components/AuthOnboardingModal.tsx)).
- **Data Export:** **Profile -> Download my data (JSON)** downloads profile, private contact, and consent record (`profileService.exportUserData`).
- **Consent Withdrawal:** **Profile -> Withdraw consent** sets `/consents/{uid}.withdrawn = true`, disables emergency alerts, and pauses donor availability.
- **Account & Data Erasure:** **Profile -> Delete my account** permanently deletes `/users/{uid}`, `/users/{uid}/private/contact`, `/consents/{uid}`, clears saved local storage, and removes the Firebase Auth user.

---

## Assistant Evaluation

Automated regression suite in [`scripts/eval-assistant.ts`](./scripts/eval-assistant.ts) run on every CI push/PR (`npm run eval:assistant`):

- **Pass Thresholds:**
  - **Safety cases (`100%` required):** Eval and CI build **fail immediately** if safety drops below **100%**.
  - **Tool / Intent routing (`>= 90%` required):** Eval and CI build fail if routing accuracy drops below **90%**.
- **40-Prompt Breakdown by Category & Language (`28 EN`, `6 HI`, `6 KN`):**

| Category | Scope | Count | EN | HI | KN | Pass |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `stock` | ABO/Rh & stock lookup routing | 6 | 4 | 1 | 1 | 6 / 6 (100%) |
| `eligibility` | Age, weight, interval & deferral rules | 6 | 4 | 1 | 1 | 6 / 6 (100%) |
| `sos` | Bleeding triage & 108/112 escalation *(Safety + Routing)* | 6 | 4 | 1 | 1 | 6 / 6 (100%) |
| `prompt-injection` | Prompt/key extraction & jailbreak refusal *(Safety)* | 8 | 6 | 1 | 1 | 8 / 8 (100%) |
| `medical-advice` | Diagnosis, prescription & dosage refusal *(Safety)* | 8 | 6 | 1 | 1 | 8 / 8 (100%) |
| `out-of-scope` | Unrelated queries & DPDP privacy fallback routing | 6 | 4 | 1 | 1 | 6 / 6 (100%) |
| **Total** | **All 40 prompts (`22` Safety, `24` Routing)** | **40** | **28** | **6** | **6** | **40 / 40 (100%)** |

---

## Medical Disclaimer

> Eligibility and first-aid content is general guidance, not medical advice. Final screening is by the blood bank doctor. **Content reviewed by a clinician: PENDING.**

Emergency screens include pinned `tel:108`, `tel:112`, and `tel:104` quick-dial controls and display `"Content version and review date"` from [`src/config/medicalReview.ts`](./src/config/medicalReview.ts).

---

## Known Limitations

- **No phone-OTP verification:** Uses Google Sign-In and Email/Password verification only to stay strictly within Firebase Spark free limits (zero SMS cost).
- **SOS anti-abuse limits on Spark:** Server rate-limiting and duplicate suppression are limited without Cloud Functions; Firebase App Check (`reCAPTCHA v3`) is optional until `VITE_FIREBASE_APP_CHECK_SITE_KEY` is configured.
- **License-only bank verification:** Bank onboarding reviews statutory license numbers (`licenseNumber` / optional `eraktkoshId`) manually in Admin Portal, with **no document upload yet** (no Cloud Storage on Spark).
- **30-day SOS request expiry & automatic purge:** **Not implemented yet** (`createSosRequest` sets `expiresAt` to `+24 hours`; live queries filter `status in ['open', 'matched']` until the requester taps *Mark Fulfilled* or *Cancel*, with no scheduled server TTL purge on Spark yet).
- **Exact location deletion:** Raw browser GPS coordinates are never stored in Firestore or `localStorage`; coordinates resolve offline to coarse ~2 km (`coarseLat`/`coarseLng`), and saved coarse location in `localStorage` (`lifedrop_location_v1`) can be deleted anytime via **Settings -> Delete location data**.
- **Client-side escalation & no background push:** SOS radius escalation (`5 -> 15 -> 50 -> State`) runs while the app is open; background push notifications are deferred outside the free Spark scope.
- **Simplified state polygons & demo data:** Border areas near state boundaries may prompt `"Not right? Change"` manual selection; seeded counts and sample banks show **`Demo data`** chips until verified banks onboard.

---

## Pilot Plan

1. **Phase 1 — Single City (Bengaluru):** Launch first in Bengaluru with partner college NSS/blood-donation clubs and licensed local blood banks.
   - **Pilot Success Bar:** **20 verified blood banks** updating stock weekly, **500 active voluntary donors**, and **median time to first SOS accept under 10 minutes**.
2. **Phase 2+ — State-by-State Expansion:** Expand across Karnataka districts (Mysuru, Mangaluru, Hubballi-Dharwad) and adjacent metros once pilot benchmarks hold consistently.

---

## Deploy (Firebase Hosting + Rules)

> **Note:** **HTTPS is required** in production for browser `navigator.geolocation` and PWA service worker registration. Firebase Hosting (`*.web.app`) provides HTTPS automatically.

```bash
npm run build
npx firebase deploy --only firestore:rules,firestore:indexes,hosting
```

*(Optionally deploy `workers/chat-worker/index.ts` via `npx wrangler deploy` + `npx wrangler secret put GEMINI_API_KEY` for online LLM fallback.)*

---

## Roadmap, Contributing & Governance

- **Roadmap (`M1`–`M7`):** Core client/Spark architecture (`M1`–`M7`) complete; next phase covers clinician content sign-off, Bengaluru pilot onboarding, and optional Blaze Cloud Functions for background FCM push alerts and automated TTL expiry jobs.
- **Contributing:** See [CONTRIBUTING.md](./CONTRIBUTING.md) and our [Bug Report Template](./.github/ISSUE_TEMPLATE/bug_report.md).
- **Security Contact:** See [SECURITY.md](./SECURITY.md) (`[security-contact@example.com]`).
- **License:** [MIT License](./LICENSE) (c) 2026 Punixx.
- **Author:** **Punixx**, CSE (Data Science), New Horizon College of Engineering, Bengaluru.
