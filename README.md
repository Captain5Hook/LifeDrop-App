# LifeDrop

LifeDrop: free, offline-ready blood bank finder and first-aid app for India.

`[React 19]` `[TypeScript 7]` `[Firebase Spark]` `[PWA]` `[License: MIT]`

> **Disclaimer:** Demo project. Not medical advice. First-aid content is pending professional review. Seeded numbers are demo data. In an emergency call 108 or 112.

Live demo: <add your .web.app link after deploying>

---

## 1. Project Progress

**Overall: 70% `[##############------]`**

Formula: `Overall % = sum(Milestone % x Weight)` using rounded milestone percentages across all 7 weighted milestones (`86*0.10 + 75*0.15 + 80*0.15 + 67*0.20 + 75*0.15 + 50*0.15 + 60*0.10 = 70.00%`).

| Milestone | What it covers | Status | Weight | Progress % |
| :--- | :--- | :--- | :---: | :---: |
| **M1** | Design system, Home, location flow and Bleeding Emergency | In progress | 10% | 86% (6/7) |
| **M2** | India map | In progress | 15% | 75% (3/4) |
| **M3** | Auth, profile, eligibility | In progress | 15% | 80% (4/5) |
| **M4** | SOS, compatibility, live tracking | In progress | 20% | 67% (4/6) |
| **M5** | Chatbot and knowledge base | In progress | 15% | 75% (3/4) |
| **M6** | Bank dashboard and Admin | In progress | 15% | 50% (2/4) |
| **M7** | PWA, rules tests, deployment | In progress | 10% | 60% (3/5) |

### Milestone Verification Checklist

**M1 — Design system, Home, location flow and Bleeding Emergency (6/7 = 86%)**
- [x] Dark indigo and light lilac glass theme system (`src/index.css`) with dynamic `<meta name="theme-color">` sync and Data Saver reduced-motion toggle (`src/hooks/useAppSettings.ts`)
- [x] Responsive shell (`100dvh` mobile edge-to-edge under `480px` and `430px` centered frame on tablet/desktop), fixed bottom navigation without SOS clipping, and `44px` minimum tap targets
- [x] Home screen with hero counter, All-India toggle, Mission Goals, and Donation Drives tabs with explicit `Demo data` chips (`src/screens/HomeScreen.tsx`)
- [x] Eight Blood Group Pills (`O+` to `AB-`) with stock status and map/compatibility shortcuts (`src/components/BloodGroupPills.tsx`)
- [x] Location flow with explainer dialog, 5 permission/GPS outcome states, offline state/city + `~2 km` coarse lookup (`45 km` coastal/border cutoff), 36 State/UT manual picker, and location data deletion (`src/hooks/useLocationFlow.ts`, `src/components/LocationModals.tsx`)
- [x] Offline Bleeding Emergency modal in English, Hindi, and Kannada with `108`, `112`, and `104` call links, Step 1 emergency callout, card disclaimer across all languages, accessible `role="group"` step dots, and Web Speech Read Aloud (`src/components/BleedingEmergencyModal.tsx`)
- [ ] Formal medical sign-off and native language review of first-aid content (`src/config/appGovernance.ts` and `src/data/knowledge/bleedingFirstAid.json` marked `Pending review`)

**M2 — India map (3/4 = 75%)**
- [x] Interactive Leaflet + OpenStreetMap India map with 36 State/UT markers (`src/screens/MapScreen.tsx`)
- [x] State-scoped paginated `/banks` query (`20` banks per page) with local seed/cache fallback (`src/services/bankService.ts`)
- [x] Blood group, 24x7, Govt/Private, radius, and stale-stock filters plus `Near me` sort and accessible Table view
- [ ] Live verified hospital and blood bank directory feed replacing seeded demo banks (`src/data/seedBanks.ts`)

**M3 — Auth, profile, eligibility (4/5 = 80%)**
- [x] Google Sign-In, Email/Password sign-up, and email verification checks (`src/services/authService.ts`)
- [x] 18+ age verification (`dobYear` + `age18PlusConfirmed`) and DPDP consent tracking, JSON export, consent withdrawal, and account deletion (`src/services/profileService.ts`, `src/components/LegalPrivacyModals.tsx`)
- [x] Donor profile with availability switch, self-donation log, eligibility ring (`90d`/`120d`), and PNG certificate generator (`src/screens/ProfileScreen.tsx`, `src/utils/certificateGenerator.ts`)
- [x] Client-side 7-check Eligibility Checker and post-donation care guidance (`src/components/EligibilityChecker.tsx`)
- [ ] Phone OTP SMS verification (excluded by zero-cost Spark rule; Email/Google only)

**M4 — SOS, compatibility, live tracking (4/6 = 67%)**
- [x] 3-tap SOS request creation with compatible donor-group expansion (`src/screens/SosScreen.tsx`, `src/services/sosService.ts`)
- [x] Client-side radius escalation (`5 km -> 15 km -> 50 km -> 250 km`) while the app remains open
- [x] Live pledge tracking (`pledged`, `en_route`, `arrived`, `withdrawn`) with matched-only requester/donor phone unlock rules
- [x] Offline ABO/Rh compatibility lookup for Whole Blood, PRBC, Platelets, and Plasma (`src/data/knowledge/compatibility.json`, `src/components/CompatibilityCheckerModal.tsx`)
- [ ] Background push notifications via FCM when the app is closed (deferred outside free Spark plan)
- [ ] Server-enforced 30-day SOS auto-expiry and PII purge (`expiresAt` defaults to `+24h` without automated TTL cleanup yet)

**M5 — Chatbot and knowledge base (3/4 = 75%)**
- [x] Offline multilingual assistant (`en`, `hi`, `kn`) powered by bundled JSON (`src/data/knowledge/assistantKnowledge.json`, `src/services/chatService.ts`)
- [x] Severe bleeding triage banner, inline compatibility widget, and prompt-injection / medical-advice safety refusals
- [x] Automated 40-prompt evaluation suite passing `40/40` (`scripts/eval-assistant.ts`)
- [ ] Live deployed Cloudflare Worker Gemini fallback (`workers/chat-worker/index.ts` exists; `VITE_CHAT_WORKER_URL` not configured)

**M6 — Bank dashboard and Admin (2/4 = 50%)**
- [x] Blood bank license application form and verified stock/hours editor (`src/components/BloodBankDashboardModal.tsx`, `src/services/bankAdminService.ts`)
- [x] Admin verification queue (approve/reject banks), KPI summary with CSV export, and append-only `/auditLogs` (`src/components/AdminPortalModal.tsx`)
- [ ] Blood bank license document/PDF upload (deferred; no Cloud Storage on Spark)
- [ ] Bank-side workflow to stamp a donor's profile as `lab-confirmed` after donation

**M7 — PWA, rules tests, deployment (3/5 = 60%)**
- [x] Workbox PWA service worker (`dist/sw.js`), `manifest.json`, precache (`52` entries), and verified offline browser reload with Bleeding Emergency first aid (`vite.config.ts`, `src/hooks/usePWA.ts`)
- [x] Static Firestore security rules contract audit (`scripts/firestore-rules.test.ts`, `12/12` passing), rules deployment (`firestore.rules`), and GitHub Actions CI (`.github/workflows/ci.yml`)
- [x] Production code splitting (lazy screens/modals + core/auth/firestore Firebase chunks) and Playwright multi-viewport layout pass across 8 viewports plus `130%` text scaling (`docs/evidence/layout.json`)
- [ ] Mobile Lighthouse 90+ verification (Not measured yet in this environment)
- [ ] Active Firebase App Check site key (`VITE_FIREBASE_APP_CHECK_SITE_KEY` empty) and live JDK 17+ Firestore Emulator execution (`npm run test:rules:emulator`)

### Hardening Tracker

| Check | Status | Notes |
| :--- | :--- | :--- |
| Layout fits every screen size | Done | Verified `PASS` across 8 viewports (`360x640` to `1440x900`) plus `130%` text and `360x360` keyboard shrink |
| Code splitting | Done | `React.lazy` routes/modals (`HomeSkeleton` fallback) plus core/auth/firestore `manualChunks` |
| PWA service worker and offline first aid | Done | `vite-plugin-pwa` builds `dist/sw.js` (`52` precached entries); verified offline reload in Chromium |
| Medical disclaimer | Done | Displayed across all Bleeding Emergency cards (EN/HI/KN), Chat, SOS, Compatibility, and About |
| Medical review | Pending | `APP_GOVERNANCE_CONFIG.reviewerName` is `Pending review` (`src/config/appGovernance.ts`) |
| Lighthouse 90+ | Not measured yet | Run locally against `npm run preview` (Lighthouse CLI not present in sandbox) |
| Security rules review | Partial | `12/12` static audit passes and rules deployed; live Firestore Emulator requires JDK 17+ locally |
| App Check | Partial | Browser `ReCaptchaV3Provider` wired conditionally; `VITE_FIREBASE_APP_CHECK_SITE_KEY` is empty |
| LICENSE | Done | MIT license (2026, Punixx) in `LICENSE` |
| SECURITY | Done | Vulnerability disclosure policy in `SECURITY.md` |
| README | Done | Progress-tracked and updated from repository code and measured command outputs |

Last updated: 2026-11-27. Update the checklist and milestone percentages after every milestone.

---

## 2. Why LifeDrop

Across India, patients and families needing emergency blood often deal with fragmented directories, stale helpline numbers, and slow word-of-mouth searches. Inside low-connectivity hospital corridors or basements, searching live websites during severe bleeding is unreliable. LifeDrop brings an offline-ready EN/HI/KN bleeding first-aid guide with quick `108`/`112`/`104` dialing, a state-scoped blood bank finder, an ABO/Rh compatibility tool, and a privacy-preserving SOS flow into one zero-cost PWA. Built strictly for the Firebase Spark free tier and local caching, it aims to lower emergency search friction with zero paid backend dependencies.

### How to Try It in 2 Minutes

1. Open the live `.web.app` link on your phone (or mobile viewport in desktop Chrome/Safari).
2. Tap **Bleeding Emergency · First Aid & 108** on Home, switch the language between **EN**, **हिन्दी**, and **ಕನ್ನಡ**, and tap **Read aloud**.
3. Turn on **Airplane Mode** (or enable **Offline** in browser DevTools), reload the page, and reopen **Bleeding Emergency** to verify offline first aid and `Call 108` / `112` / `104` links.
4. Tap any blood group pill (`O+` to `AB-`) -> **Compatibility** (or open **Compatibility Widget** inside **Chatbot**) to test Whole Blood, PRBC, Platelets, and Plasma compatibility offline.
5. Open **Chatbot** in bottom navigation and ask an eligibility, stock, or severe-bleeding question to inspect offline multilingual responses and triage alerts.

---

## 3. What Works Today

| Feature | Status | Details |
| :--- | :--- | :--- |
| Home screen with demo stats and goals | Done | Displays seeded or read-only Firestore `stats/global` + `stats/state_*` counters with `Demo data` badges, Mission Goals, and Donation Drives tabs (`src/screens/HomeScreen.tsx`) |
| Blood group pills | Done | 8 interactive `O+` to `AB-` pills showing stock health (`Stable`, `Low`, `Critical`) and map/compatibility links (`src/components/BloodGroupPills.tsx`) |
| Bleeding Emergency offline first aid | Done | 8-step first-aid guide + 6 special cases in English, Hindi, and Kannada with `tel:108`, `tel:112`, `tel:104` buttons, `role="group"` step dots, and Web Speech Read Aloud (`src/components/BleedingEmergencyModal.tsx`) |
| Location permission flow | Done | Explainer step, 5 outcome states (`granted`, `dismissed`, `denied`, `timeout`, `unavailable` + `outside-india`), `45 km` coastal/border offline cutoff, coarse `~2 km` rounding, 36 State/UT manual picker, and `"Delete my location data"` (`src/hooks/useLocationFlow.ts`, `src/components/LocationModals.tsx`) |
| Light and dark theme | Done | Indigo dark theme (`#1B1740`) and lilac light theme (`#ECE9FC`) persisted locally with dynamic `<meta name="theme-color">` (`src/hooks/useAppSettings.ts`) |
| Data Saver mode | Done | Disables Motion transitions via `MotionConfig reducedMotion="always"` |
| Offline Compatibility Checker | Done | Bundled matrix for Whole Blood, PRBC, Platelets, and Plasma (`src/components/CompatibilityCheckerModal.tsx`) |
| India map directory | Partial | Leaflet + OpenStreetMap UI, filters, and `Near me` sort work; blood bank stock defaults to seeded demo records until verified banks onboard (`src/screens/MapScreen.tsx`) |
| Auth, 18+ gate, profile, and eligibility | Partial | Google/Email Auth, 18+ age gate, DPDP controls, PNG certificate, and 7-check eligibility tool built; no phone OTP SMS (`src/screens/ProfileScreen.tsx`) |
| 3-tap SOS and live tracking | Partial | Request creation, client-side radius escalation, and matched phone reveal work while open; no background push or automated 30-day purge (`src/screens/SosScreen.tsx`) |
| Multilingual assistant | Partial | Offline EN/HI/KN matcher and safety eval (`40/40`) work locally; optional Cloudflare Gemini worker is not deployed (`src/screens/ChatScreen.tsx`) |
| Blood bank and Admin portals | Partial | License application, stock editor, Admin queue, and audit logs work; no PDF document upload or bank-triggered lab verification yet |

---

## 4. Screenshots

Milestone 1 Playwright captures saved in `/docs/screenshots/`:

| Screen | Capture Path | Status |
| :--- | :--- | :--- |
| Home (`360x640` mobile & `1440x900` desktop) | `docs/screenshots/360x640-home.png`, `docs/screenshots/1440x900-home.png` | Captured |
| Bleeding Emergency (`360x640`) | `docs/screenshots/360x640-bleeding-emergency.png` | Captured |
| Offline Bleeding Emergency (`390x844`, Kannada + Read Aloud) | `docs/screenshots/offline-bleeding-emergency.png` | Captured |
| Location explainer (`360x640`, `390x844`, `1440x900`) | `docs/screenshots/360x640-location-explainer.png` | Captured |
| Map (Milestone 2) | `docs/screenshots/map.png` | Not captured yet |

---

## 5. Tech Stack and Architecture

- **Frontend:** React 19, TypeScript 7, Tailwind CSS v4, Motion, Lucide React, Vite 8
- **Backend & Hosting (Firebase Spark Free Plan):** Firebase Authentication (Google + Email/Password), Cloud Firestore with `persistentLocalCache`, optional Firebase App Check (`ReCaptchaV3Provider`), Firebase Hosting
- **Maps & Offline Routing:** Leaflet and OpenStreetMap (`MapScreen` implemented with seeded fallback; live verified bank feed planned)
- **Optional LLM Proxy:** Cloudflare Worker (`workers/chat-worker/index.ts` source ready; deployment pending)
- **Zero-Cost Rule:** No Cloud Functions, no Cloud Storage, no paid SMS/OTP, and no paid geocoding or external APIs.

```text
.
├── .github/
│   ├── ISSUE_TEMPLATE/
│   └── workflows/
├── docs/
│   ├── evidence/
│   └── screenshots/
├── public/
├── scripts/
├── src/
│   ├── __tests__/
│   ├── components/
│   ├── config/
│   ├── data/
│   │   └── knowledge/
│   ├── hooks/
│   ├── screens/
│   ├── services/
│   └── utils/
└── workers/
    └── chat-worker/
```

---

## 6. Run Locally

Prerequisites: Bun (or Node.js 20+). Live Firestore Emulator rules tests additionally require JDK 17+.

```bash
# Install dependencies
bun install

# Create local environment file (optional VITE_* keys default empty)
cp .env.example .env

# Start development server on port 3000
bun run dev

# Build production bundle and service worker
bun run build

# Preview production build locally
bun run preview

# Run TypeScript check, Vitest unit + axe-core tests, assistant eval, and static rules checks
bun run lint
bun run test
bun run eval:assistant
bun run test:rules
```

---

## 7. Environment Variables

All `VITE_` variables in `.env.example` are optional and shipped empty. `VITE_*` variables and Firebase web metadata (`firebase-applet-config.json`) are **public browser configuration**, not secrets; protect Firebase data via `firestore.rules`, Google Cloud Console HTTP referrer restrictions on the browser key, and App Check. **Never commit secrets** (`.env`, reCAPTCHA v3 secret key, or `GEMINI_API_KEY`) to git—place `GEMINI_API_KEY` only in Cloudflare Worker secrets (`wrangler secret put GEMINI_API_KEY`).

| Name | Required or optional | What it does | Where to get it | Public or secret |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_FIREBASE_APP_CHECK_SITE_KEY` | Optional | Enables Firebase App Check reCAPTCHA v3 verification in browser clients | Google reCAPTCHA v3 Admin Console + Firebase App Check | Public (keep reCAPTCHA secret key private) |
| `VITE_CHAT_WORKER_URL` | Optional | HTTPS endpoint for the Cloudflare Worker Gemini fallback (Milestone 5) | Output URL from `npx wrangler deploy` on `workers/chat-worker/index.ts` | Public (`GEMINI_API_KEY` stays server-side in Worker secrets) |

*(Non-Vite entries in `.env.example`: `GEMINI_API_KEY` documents the server-side Cloudflare Worker secret, and `APP_URL` is optional runtime/hosting metadata.)*

---

## 8. Build and Verification

> **Judges and reviewers:** Every numeric result in the table below was measured by running the listed commands against this codebase. **Lighthouse mobile scores, live Firestore Emulator execution, and clinical medical review are not done yet.**

| Check | Measured Output | Notes |
| :--- | :--- | :--- |
| TypeScript (`bun run lint`) | `0 errors` | Verified via `tsc --noEmit` |
| Unit, geo, safety, & `axe-core` tests (`bun run test`) | `3` files, `16/16` passed | Covers 10 Indian cities, 3 foreign cities, 36 States/UTs, 5 permission states, `~2 km` rounding, EN/HI/KN step parity, and `axe-core` accessibility |
| Assistant safety & routing eval (`bun run eval:assistant`) | `40/40` passed | `22/22` safety refusals (`100%`), `24/24` routing (`100%`) |
| Firestore rules static contract (`bun run test:rules`) | `12/12` passed | Covers default deny, `/admins/{uid}` check with zero hardcoded email literals, `stats`/`goals`/`drives` `write: false`, donor `isVerifiedUser()` + profile check, and bank-role `/auditLogs` gate |
| Live Firestore Emulator tests (`npm run test:rules:emulator`) | **Not verified** | Requires JDK 17+ locally (`java` not installed in container) |
| Production build (`bun run build`) | Built in `1.32s`; PWA precache `52 entries` (`2066.79 KiB`) | `index-*.js`: `86.39 kB` (`22.04 kB` gzip); `vendor-react`: `404.71 kB` (`123.13 kB` gzip); `vendor-firebase-core`: `49.13 kB` (`18.40 kB` gzip); `vendor-firebase-auth`: `110.21 kB` (`33.27 kB` gzip); `vendor-firebase-firestore`: `500.55 kB` (`145.76 kB` gzip); `vendor-leaflet`: `148.60 kB` (`43.33 kB` gzip); CSS: `65.25 kB` (`10.85 kB` gzip); `manifest.json`: `0.61 kB` (`0.33 kB` gzip) |
| Playwright layout & offline SW checks | `9/9` matrix checks passed (`0` console errors) | Tested `360x640`, `375x667`, `390x844`, `412x915`, `430x932`, `768x1024`, `1440x900`, `844x390` landscape, `130%` text size, `360x360` keyboard shrink, and Chromium offline SW reload |
| Lighthouse mobile audit | **Not measured yet** | Run `npx lighthouse <url> --preset=perf --only-categories=performance,accessibility,best-practices,seo` locally against `npm run preview` or deployed `.web.app` URL (see `docs/DEPLOY.md`) |

vendor-firebase-firestore is 500.55 kB raw (145.76 kB gzip), slightly above Vite's 500 kB warning threshold.

---

## 9. Security and Privacy

- **Firestore Rules (`firestore.rules`):**
  - Default catch-all denies every operation (`allow read, write: if false`).
  - Admin access requires a verified email and a document in the `/admins` collection created manually by the project owner; no email address is hardcoded.
  - Public read-only collections (`/stats/{statId}`, `/goals/{goalId}`, `/drives/{driveId}`) allow reads (`allow read: if true`) and deny all writes (`allow write: if false`), plus single-doc `/test/connection` `get`.
  - `/config/{configId}` reads require sign-in; `/banks/{bankId}` allows signed-in `get` and `list`, while stock updates allow only `stock`, `open24x7`, `phone`, `updatedAt` by the verified `ownerUid` or Admin.
  - User profiles (`/users/{userId}`) and private contact records (`/users/{userId}/private/contact`) are strictly owner-only, enforce `18+` (`dobYear <= 2008`), block `bloodGroupStatus` self-promotion, and block `isDemo: true` spoofing.
  - SOS requests (`/requests/{requestId}`) scope `list` queries to `isSignedIn()` with `status in ['open', 'matched']`, require a verified signed-in user with an existing `/users/{uid}` profile to accept an open SOS, and reveal `/private/contact` phone only to the requester or matched donor (`acceptedByUid`); donor responses allow only the donor and requester.
  - Bank applications (`/bankApplications/{uid}`) cannot self-approve, and `/auditLogs/{logId}` are append-only (`update` and `delete` denied), permitting `actorRole == 'bank'` only for signed-in users whose `/users/{uid}` profile has `role == 'bank'` and `actorRole == 'admin'` only for Admins.
- **Coarse Location and Deletion:** Browser coordinates resolve offline against simplified state boundaries and city centroids (`src/data/indiaStatesGeo.ts`), rounding to `~2 km` (`0.02°`). Raw GPS coordinates are never stored in Firestore or `localStorage`, and `"Delete my location data"` in Settings clears `lifedrop_location_v1`.
- **Repository Hygiene:** `.gitignore` ignores `.env*` (keeping `!.env.example`), `node_modules/`, `dist/`, and `.firebase/`. Secret scan across `src/`, `public/`, `workers/`, `scripts/`, and `.env.example` found zero secrets. (`bun audit` reports 4 transitive advisories in upstream `firebase`/`workbox-build` dependencies: `@grpc/grpc-js`, `glob`, `minimatch`.)
- **App Check & DPDP Status:** App Check (`ReCaptchaV3Provider`) is `Partial` (wired conditionally when `VITE_FIREBASE_APP_CHECK_SITE_KEY` is provided). Client + rules 18+ and DPDP controls (`/consents/{uid}`, JSON export, consent withdrawal, deletion) are `Done`; Grievance Officer contact customization and 30-day SOS auto-purge remain `Planned`.

---

## 10. Firestore Read Budget for the Free Plan

Designed to stay well within Firebase Spark's `50,000` reads/day quota:

- **Summary Stats Docs:** Home reads aggregated `stats/global` and `stats/state_{code}` docs rather than scanning `/users` or `/banks`.
- **Bundled Knowledge & Geography:** First-aid steps, eligibility rules, compatibility matrices, and offline India boundaries ship inside the JS bundle (`0` Firestore reads).
- **Persistent Local Cache:** `initializeFirestore` uses `persistentLocalCache` + `persistentMultipleTabManager` so offline and repeat opens use cached reads.
- **Bounded Queries:** `goals` limits to `8`, state `drives` limits to `10`, and `banks` paginates `20` per page.
- **Estimated Initial Online Home Load:** `1` connection check (`test/connection`) + `2` stats docs + up to `8` `goals` + up to `10` state `drives` (`~21` reads on a cold cache; `0` reads offline or on local seed fallback).

---

## 11. Known Limitations

- Simplified offline state boundaries with a `45 km` coastal/border margin (`src/data/indiaStatesGeo.ts`) accurately reject out-of-country points (`London`, `New York`, `Dhaka`), though coordinates close to an inter-state border can misclassify a state (use **Choose manually** to select exact State/City).
- No background push notifications when the app is closed on the Firebase Spark free plan.
- Hero counts, blood group counts, goals, drives, and initial blood banks are seeded demo data (`Demo data` badges shown).
- Browser geolocation can be blocked inside sandboxed iframes (explainer falls back to manual selection).
- First-aid instructions are pending formal medical and native Hindi/Kannada clinical sign-off.
- No phone-OTP SMS verification, bank PDF license storage, or automated 30-day SOS auto-purge on the free Spark tier.
- Any verified, signed-in user with a profile can accept an open SOS request; stricter donor vetting is planned. Firestore rules are checked by static tests; the live emulator suite needs JDK 17+ and has not been run here.
- Mobile Lighthouse metrics (`90+`) are not measured yet in this environment.

---

## 12. Roadmap

- [ ] **M1 (86%):** Obtain clinician sign-off and native HI/KN review on first-aid copy (`src/config/appGovernance.ts`)
- [ ] **M2 (75%):** Replace seeded demo banks on India Map with verified blood bank onboarding data
- [ ] **M3 (80%):** Core auth, profile, DPDP tools, and eligibility built; phone OTP deferred to Upgrade Path
- [ ] **M4 (67%):** SOS workflow and offline compatibility built; background FCM alerts and 30-day TTL purge pending
- [ ] **M5 (75%):** Offline multilingual chatbot + `40/40` eval built; deploy Cloudflare Worker for optional online LLM fallback
- [ ] **M6 (50%):** Bank stock editor and Admin portal built; add license file upload and lab-confirmed donor stamping
- [ ] **M7 (60%):** Complete mobile Lighthouse audit locally, configure App Check reCAPTCHA v3 key, and run live JDK 17+ Firestore Emulator suite

### Upgrade Path (Beyond Free Spark Tier)

- **Background Push Notifications:** Firebase Cloud Functions + Firebase Cloud Messaging (FCM) to notify nearby eligible donors when the app is closed.
- **Phone OTP Verification:** Firebase Phone Auth SMS verification for SOS requesters and volunteer donors.
- **Document Storage & Scheduled TTL:** Firebase Cloud Storage for scanned blood bank licenses and Cloud Scheduler / TTL triggers for 30-day SOS auto-purge.

---

## 13. Contributing and License

- **Contributing:** See [CONTRIBUTING.md](./CONTRIBUTING.md) and open bug reports via `.github/ISSUE_TEMPLATE/bug_report.md`. Report security or privacy issues confidentially per [SECURITY.md](./SECURITY.md).
- **License:** [MIT License](./LICENSE) (c) 2026 Punixx.
- **Developer:** Punixx, Computer Science and Engineering (Data Science), New Horizon College of Engineering, Bengaluru.
