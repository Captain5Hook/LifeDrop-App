# LifeDrop

LifeDrop: free, offline-ready blood bank finder and first-aid app for India.

`[React 19]` `[TypeScript 7]` `[Firebase Spark]` `[PWA]` `[License: MIT]`

> **Disclaimer:** Demo project. Not medical advice. First-aid content is pending professional review. Seeded numbers are demo data. In an emergency call 108 or 112.

---

## 1. Project Progress

**Overall: 68% `[##############------]`**

Formula: `Overall % = sum(Milestone % x Weight)` using rounded milestone percentages across all 7 weighted milestones (`86x0.10 + 75x0.15 + 80x0.15 + 67x0.20 + 75x0.15 + 50x0.15 + 40x0.10 = 68.00%`).

| Milestone | What it covers | Status | Weight | Progress % |
| :--- | :--- | :--- | :---: | :---: |
| **M1** | Design system, Home, location flow and Bleeding Emergency | In progress | 10% | 86% (6/7) |
| **M2** | India map | In progress | 15% | 75% (3/4) |
| **M3** | Auth, profile, eligibility | In progress | 15% | 80% (4/5) |
| **M4** | SOS, compatibility, live tracking | In progress | 20% | 67% (4/6) |
| **M5** | Chatbot and knowledge base | In progress | 15% | 75% (3/4) |
| **M6** | Bank dashboard and Admin | In progress | 15% | 50% (2/4) |
| **M7** | PWA, rules tests, deployment | In progress | 10% | 40% (2/5) |

### Milestone Verification Checklist

**M1 — Design system, Home, location flow and Bleeding Emergency (6/7 = 86%)**
- [x] Dark indigo and light lilac glass theme system (`src/index.css`) with Data Saver reduced-motion toggle
- [x] Responsive shell (`100dvh` mobile and `430px` desktop frame), bottom navigation, and `44px` minimum tap targets
- [x] Home screen with global/state counter, All-India toggle, Mission Goals, and Donation Drives tabs (`src/screens/HomeScreen.tsx`)
- [x] Eight Blood Group Pills (`O+` to `AB-`) with stock health status and map/compatibility shortcuts (`src/components/BloodGroupPills.tsx`)
- [x] Location flow with explainer dialog, 5 GPS/permission outcome states, coarse lookup, manual 36 State/UT picker, and delete option (`src/hooks/useLocationFlow.ts`, `src/components/LocationModals.tsx`)
- [x] Offline Bleeding Emergency modal in English, Hindi, and Kannada with `108`, `112`, and `104` call links and Web Speech Read Aloud (`src/components/BleedingEmergencyModal.tsx`)
- [ ] Professional clinician review and sign-off of first-aid text (`src/config/medicalReview.ts` currently marked `pending`)

**M2 — India map (3/4 = 75%)**
- [x] Interactive Leaflet + OpenStreetMap India map with 36 State/UT markers (`src/screens/MapScreen.tsx`)
- [x] State-scoped paginated `/banks` query (`20` banks per page) with local seed/cache fallback (`src/services/bankService.ts`)
- [x] Blood group, 24x7, Govt/Private, distance radius, and stale-stock filters plus `Near me` sorting and accessible Table view
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
- [ ] Server-enforced 30-day SOS auto-expiry and PII purge (`expiresAt` defaults to `+24h` without TTL cleanup yet)

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

**M7 — PWA, rules tests, deployment (2/5 = 40%)**
- [x] Workbox PWA service worker, offline precache (`47` entries), `manifest.webmanifest`, and install/update UI banners (`vite.config.ts`, `src/hooks/usePWA.ts`)
- [x] Static Firestore security rules contract suite (`scripts/firestore-rules.test.ts`, `12/12` passing) and GitHub Actions CI (`.github/workflows/ci.yml`)
- [ ] Deployed Firebase Hosting HTTPS URL and measured Lighthouse `90+` audit
- [ ] Active Firebase App Check reCAPTCHA v3 site key (`VITE_FIREBASE_APP_CHECK_SITE_KEY` currently empty)
- [ ] Live Firestore Emulator allow/deny test run (`npm run test:rules:emulator`, requires JDK 17+)

### Hardening Tracker

| Check | Status | Notes |
| :--- | :--- | :--- |
| Layout fits every screen size | Partial | `100dvh` + `430px` shell built; viewport test matrix not measured yet |
| Code splitting | Done | `React.lazy` screens/modals plus Vite `manualChunks` |
| PWA service worker and offline first aid | Done | `vite-plugin-pwa` generates `dist/sw.js`; first-aid JSON precached |
| Medical disclaimer | Done | Displayed in Emergency modal, Chat, SOS, Compatibility, and About |
| Medical review | Pending | `MEDICAL_REVIEW_CONFIG.reviewerName` is `pending` |
| Lighthouse 90+ | Not measured yet | Requires deployed HTTPS build |
| Security rules review | Partial | Static contract audit (`12/12`) passes; live emulator suite not run here |
| App Check | Partial | Client `initializeAppCheck` wired; site key env var empty |
| LICENSE | Done | MIT license (2026, Punixx) in `LICENSE` |
| README | Done | Progress-tracked documentation in `README.md` |

Last updated: 2026-11-26. Update the checklist and milestone percentages after every milestone.

---

## 2. Why LifeDrop

Across India, patients and families needing emergency blood frequently deal with fragmented directories, out-of-date helpline numbers, and slow word-of-mouth coordination. In severe trauma or obstetric bleeding, delays inside low-connectivity wards or hospital basements make real-time web searches unreliable. LifeDrop brings an offline-ready bleeding emergency guide, a state-scoped blood bank directory, ABO/Rh compatibility lookup, and a privacy-preserving donor SOS flow into one lightweight web app. Designed strictly around zero-cost Spark infrastructure and offline caching, it aims to cut search friction without creating recurring cloud expenses.

---

## 3. What Works Today

| Feature | Status | Details |
| :--- | :--- | :--- |
| Home screen with demo stats and goals | Done | Displays seeded or Firestore `stats/global` + `stats/state_*` counters with `Demo data` chips, Mission Goals, and Donation Drives tabs (`src/screens/HomeScreen.tsx`) |
| Blood group pills | Done | 8 interactive `O+` to `AB-` pills showing stock status (`Stable`, `Low`, `Critical`) with map filter and compatibility shortcuts (`src/components/BloodGroupPills.tsx`) |
| Bleeding Emergency offline first aid | Done | Step-by-step bleeding guide in English, Hindi, and Kannada with `tel:108`, `tel:112`, `tel:104` quick dials and Web Speech Read Aloud (`src/components/BleedingEmergencyModal.tsx`) |
| Location permission flow | Done | Explainer step, 5 outcome states (`granted`, `dismissed`, `denied`, `timeout`, `unavailable` + `outside-india`), coarse `~2 km` lookup, 36 State/UT manual picker, and delete option (`src/hooks/useLocationFlow.ts`) |
| Light and dark theme | Done | Indigo dark gradient (`#1B1740`–`#6B4FBB`) and lilac light theme toggle persisted locally (`src/hooks/useAppSettings.ts`) |
| Data Saver mode | Done | Disables Motion animations via `MotionConfig reducedMotion="always"` and reduces visual overhead |
| Offline Compatibility Checker | Done | Standalone offline matrix for Whole Blood, PRBC, Platelets, and Plasma (`src/components/CompatibilityCheckerModal.tsx`) |
| India map directory | Partial | Leaflet + OpenStreetMap state/bank UI, filters, and `Near me` sort work; blood bank stock defaults to seeded demo records until verified banks onboard (`src/screens/MapScreen.tsx`) |
| Auth, 18+ gate, profile, and eligibility | Partial | Google/Email Auth, 18+ age gate, DPDP controls, PNG certificate, and 7-check eligibility tool built; no phone OTP SMS (`src/screens/ProfileScreen.tsx`) |
| 3-tap SOS and live tracking | Partial | Request creation, client-side radius escalation, and matched phone reveal work while open; no background push or 30-day auto-purge (`src/screens/SosScreen.tsx`) |
| Multilingual assistant | Partial | Offline EN/HI/KN matcher and safety eval (`40/40`) work locally; optional Cloudflare Gemini worker is not deployed (`src/screens/ChatScreen.tsx`) |
| Blood bank and Admin portals | Partial | License application, stock editor, Admin queue, and audit logs work; no PDF document upload or bank-triggered lab verification yet |

---

## 4. Screenshots

Add images to `/docs/screenshots`.

| Screen | Placeholder Path | Status |
| :--- | :--- | :--- |
| Home | `docs/screenshots/home.png` | Pending capture |
| Bleeding Emergency | `docs/screenshots/bleeding-emergency.png` | Pending capture |
| Location explainer | `docs/screenshots/location-explainer.png` | Pending capture |
| Map | `docs/screenshots/map.png` | Pending capture |

---

## 5. Tech Stack and Architecture

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Motion, Lucide React
- **Backend & Hosting (Firebase Spark Free Plan):** Firebase Authentication (Google + Email/Password), Cloud Firestore with `persistentLocalCache`, Firebase App Check (optional reCAPTCHA v3), Firebase Hosting
- **Maps & Offline Routing:** Leaflet and OpenStreetMap (`MapScreen` implemented with seeded bank fallback; live verified directory planned)
- **Optional LLM Proxy:** Cloudflare Worker (`workers/chat-worker/index.ts` source ready for Gemini fallback; live deployment planned)
- **Zero-Cost Rule:** No Cloud Functions, no Cloud Storage, no paid SMS/OTP, and no paid geocoding or external APIs.

```text
.
├── .github/
│   ├── ISSUE_TEMPLATE/
│   └── workflows/
├── public/
├── scripts/
├── src/
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

Prerequisites: Bun (or Node.js 20+).

```bash
# Install dependencies
bun install

# Create local environment file (optional keys default empty)
cp .env.example .env

# Start development server on port 3000
bun run dev

# Build production bundle
bun run build

# Preview production build locally
bun run preview
```

---

## 7. Environment Variables

All `VITE_` variables in `.env.example` are optional and shipped empty. `VITE_*` variables and Firebase web metadata (`firebase-applet-config.json`) are **public browser configuration**, not secrets; protect Firebase resources with Firestore Security Rules, Google Cloud HTTP referrer restrictions, and App Check. **Never commit secrets** (such as your Google reCAPTCHA v3 **secret key**, `.env` files, or server-side `GEMINI_API_KEY`) to git or place them in client `VITE_` variables—`GEMINI_API_KEY` belongs only in Cloudflare Worker secrets (`wrangler secret put GEMINI_API_KEY`).

| Name | Required or optional | What it does | Where to get it | Public or secret |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_FIREBASE_APP_CHECK_SITE_KEY` | Optional | Enables Firebase App Check reCAPTCHA v3 verification in browser clients | Google reCAPTCHA v3 Admin Console + Firebase App Check | Public (keep reCAPTCHA secret key private) |
| `VITE_CHAT_WORKER_URL` | Optional | HTTPS endpoint for the Cloudflare Worker used for online Gemini assistant fallback (Milestone 5) | Output URL from `npx wrangler deploy` on `workers/chat-worker/index.ts` | Public (`GEMINI_API_KEY` stays server-side in Worker secrets) |

*(Note: `.env.example` also lists non-Vite `GEMINI_API_KEY` as a reminder for Cloudflare Worker secret setup and optional `APP_URL` for hosting.)*

---

## 8. Build and Performance

Measured directly from the production build (`vite build`):

| Asset / Chunk | Raw Size | Gzip Size | Notes |
| :--- | :---: | :---: | :--- |
| Main JS entry (`index-*.js`) | `96.58 kB` | `26.23 kB` | Initial app shell |
| React vendor (`vendor-react-*.js`) | `404.71 kB` | `123.13 kB` | Core React & DOM |
| Firebase vendor (`vendor-firebase-*.js`) | `680.21 kB` | `203.31 kB` | Auth + Firestore SDK (triggers Vite >500 kB raw warning) |
| Leaflet vendor (`vendor-leaflet-*.js`) | `148.60 kB` | `43.33 kB` | Lazy-loaded on Map tab |
| Icons (`vendor-icons-*.js`) | `39.84 kB` | `14.28 kB` | Lucide React icons |
| Motion (`vendor-motion-*.js`) | `6.43 kB` | `2.71 kB` | Animation library |
| App CSS (`index-*.css`) | `64.71 kB` | `10.73 kB` | Tailwind CSS v4 styles |
| Leaflet CSS (`vendor-leaflet-*.css`) | `15.09 kB` | `6.36 kB` | Lazy-loaded Map styles |
| Largest lazy screen (`SosScreen-*.js`) | `41.76 kB` | `7.91 kB` | Remaining screens/modals range `0.41 kB`–`41.27 kB` raw |

- **PWA Precache:** `47 entries` (`2082.92 KiB`) generated into `dist/sw.js`.
- **Lighthouse Scores (Performance, Accessibility, Best Practices, SEO):** `Not measured yet` (target: `90+` across all four categories on a deployed HTTPS build).
- **Layout Test Matrix:**

| Viewport | Status |
| :--- | :--- |
| `360x640` | Not measured yet |
| `390x844` | Not measured yet |
| `412x915` | Not measured yet |
| `768x1024` | Not measured yet |
| `1440x900` | Not measured yet |

---

## 9. Security and Privacy

- **Firestore Rules (`firestore.rules`):**
  - Default catch-all denies all reads and writes (`allow read, write: if false`).
  - Public reads cover `/config/{id}`, `/stats/{id}`, `/goals/{id}`, `/drives/{id}`, and state-scoped `/banks/{id}` queries; writes to global config/goals/drives are restricted to verified admins. Signed-in onboarding may only increment `totalUsers` and `joinedToday` by `+1` atomically on `/stats/{id}` when a user profile is created.
  - User profiles (`/users/{userId}`) and private contact records (`/users/{userId}/private/contact` holding email, phone, and `dobYear`) are readable and writable only by that signed-in owner. Users cannot self-promote `bloodGroupStatus` to `lab-confirmed`.
  - SOS requests (`/requests/{requestId}`) require sign-in, enforce `status == 'open'` and `radiusKm == 5` on creation, allow claims only from other signed-in users when open, reveal requester phone (`/requests/{requestId}/private/contact`) only to the requester or matched donor (`acceptedByUid`), and reveal volunteer donor responses (`/requests/{requestId}/responses/{donorUid}`) only to that donor and the requester.
  - Bank applications (`/bankApplications/{uid}`) cannot be self-approved by applicants; verified bank owners may update only `stock`, `open24x7`, `phone`, and `updatedAt` on their own `/banks/{bankId}` doc; `/auditLogs/{logId}` records are append-only (`update` and `delete` denied).
- **Coarse Location and Deletion:** Browser coordinates are resolved offline into state/city and coarse `~2 km` values (`coarseLat`, `coarseLng`). Raw GPS coordinates are never saved to Firestore or `localStorage`, and saved local location (`lifedrop_location_v1`) can be erased anytime under **Settings -> Delete location data**.
- **Repository Hygiene:** No secrets exist in the repository; `.gitignore` ignores `.env*` (except `.env.example`), `node_modules/`, `dist/`, and `.firebase/`.
- **App Check Status:** `Partial` — client initialization (`ReCaptchaV3Provider`) is wired in `src/services/firebase.ts`, awaiting a configured `VITE_FIREBASE_APP_CHECK_SITE_KEY`.
- **18+ and DPDP Status:**
  - `Done` (client + rules): Adult age check (`dobYear <= 2008` and `age18PlusConfirmed == true`) and DPDP Act 2023 controls (Consent record `/consents/{uid}`, Privacy/Terms/Grievance tabs in `LegalPrivacyModals`, JSON export, consent withdrawal, and account deletion).
  - `Planned`: Active public Grievance Officer email (currently placeholder in UI) and automated 30-day SOS data purge.

---

## 10. Firestore Read Budget for the Free Plan

Designed to stay well within Firebase Spark's `50,000` reads/day quota:

- **Aggregated Stats Documents:** Home reads single summary docs (`stats/global` and `stats/state_{code}`) instead of scanning `/users` or `/banks`.
- **Bundled Knowledge & Geography:** First-aid steps, eligibility rules, compatibility tables, and simplified state/city boundaries ship inside the client bundle (0 Firestore reads).
- **Persistent Local Cache:** `initializeFirestore` uses `persistentLocalCache` + `persistentMultipleTabManager` so repeat views reuse cached documents offline or on weak networks.
- **Narrow Queries:** Lists enforce strict bounds (`goals` `limit(8)`, `drives` `limit(10)` scoped by `stateCode`, `banks` paginated `20` per page).
- **Estimated Reads per Initial Online Home Load:** `1` connection check (`test/connection`) + `2` stats doc reads (`stats/global`, `stats/state_*`) + up to `8` `goals` reads + up to `10` state `drives` reads (max ~`21` reads on a cold cache with live docs; `0` Firestore reads when offline or using local seeds).

---

## 11. Known Limitations

- Simplified offline state borders can misclassify users near state boundaries (use **Choose manually** to select your exact state and city).
- No background push notifications when the app is closed on the Firebase Spark free plan.
- Seeded user counts and blood bank inventory are demo data (`Demo data` chips shown in UI).
- Browser geolocation can be blocked inside sandboxed preview iframes (manual state/city selection remains available).
- First-aid and clinical eligibility copy is pending professional medical review.
- No phone-OTP SMS verification, no bank license document upload, and no automated 30-day SOS request purge on the free Spark tier.

---

## 12. Roadmap

- [ ] **M1 (86%):** Complete clinician medical sign-off on first-aid and eligibility copy (6/7 items done)
- [ ] **M2 (75%):** Replace seeded demo banks on India Map with live verified blood bank onboarding (3/4 items done)
- [ ] **M3 (80%):** Core auth, profile, DPDP tools, and eligibility built; phone OTP deferred to Upgrade Path (4/5 items done)
- [ ] **M4 (67%):** SOS workflow and offline compatibility built; background alerts and 30-day TTL purge pending (4/6 items done)
- [ ] **M5 (75%):** Offline multilingual chatbot + 40-prompt eval built; deploy Cloudflare Worker for online LLM fallback (3/4 items done)
- [ ] **M6 (50%):** Bank stock editor and Admin portal built; add license file upload and lab-confirmed donor stamping (2/4 items done)
- [ ] **M7 (40%):** PWA precache and static rules tests built; deploy Firebase Hosting, enable App Check, run Emulator suite, and measure Lighthouse 90+ (2/5 items done)

### Upgrade Path (Beyond Free Spark Tier)

- **Background Push Notifications:** Firebase Cloud Functions + Firebase Cloud Messaging (FCM) to wake nearby donors when an SOS is created or escalated.
- **Phone OTP Verification:** Firebase Phone Auth SMS verification for SOS requesters and volunteer donors.
- **Document Storage:** Firebase Cloud Storage for uploading and archiving scanned blood bank statutory licenses.

---

## 13. Contributing and License

- **Contributing:** See [CONTRIBUTING.md](./CONTRIBUTING.md) and open bug reports using `.github/ISSUE_TEMPLATE/bug_report.md`. Please report security or privacy bugs confidentially per [SECURITY.md](./SECURITY.md). Run `npm run lint`, `npm run eval:assistant`, `npm run test:rules`, and `bun run build` before submitting changes.
- **License:** [MIT License](./LICENSE) (c) 2026 Punixx.
- **Developer:** Punixx, Computer Science and Engineering (Data Science), New Horizon College of Engineering, Bengaluru.
