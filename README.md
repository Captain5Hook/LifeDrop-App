# LifeDrop — Blood Bank Management System

A mobile-first, zero-cost Progressive Web App (PWA) for India connecting patients, voluntary blood donors, verified blood banks, and offline emergency first-aid guidance.

**Live Demo:** `[https://your-lifedrop-app.web.app](https://your-lifedrop-app.web.app)` *(replace after Firebase Hosting deploy)*  
**License:** [MIT](./LICENSE) · **Security Policy:** [SECURITY.md](./SECURITY.md)

---

## Why LifeDrop

During trauma, obstetric hemorrhage, or sudden surgical emergencies in India, families frequently lose critical minutes searching scattered directories for compatible blood units or contacting unverified numbers—often on slow 4G connections or without network coverage inside hospital basements. LifeDrop combines:

1. **Instant offline life-safety guidance** (one-tap `108` / `112` / `104` dialing, Read Aloud speech synthesis, pressure/tourniquet bleeding guide, and an offline ABO/Rh compatibility checker) that opens even in airplane mode after a single visit.
2. **All-India 36 State & UT stock visibility** backed by pre-aggregated Firestore documents and OpenStreetMap + Leaflet (`leaflet`) at **zero API cost**.
3. **3-Tap SOS & Verified Blood Bank coordination** running strictly on **Firebase Spark (Free Tier)** with DPDP Act 2023 privacy protections (coarse geohashed public pins, private phone numbers unlocked only after a donor match).

> **Disclaimer:** Demo project. Not medical advice. First-aid content is pending professional review. In an emergency call **108** or **112**.

---

## Screenshots

| Home Screen | Bleeding Emergency (Offline) |
| :---: | :---: |
| ![Home Screen Placeholder](./docs/screenshots/home-placeholder.png) | ![Bleeding Emergency Placeholder](./docs/screenshots/bleeding-emergency-placeholder.png) |
| *96px thin counter, state stock summary, Hero scene & snap glass sheet* | *Offline first-aid cards, Read Aloud & pinned 108 / 112 dials* |

| Location Privacy & Picker | India Map (State-Wise) |
| :---: | :---: |
| ![Location Flow Placeholder](./docs/screenshots/location-placeholder.png) | ![India Map Placeholder](./docs/screenshots/map-placeholder.png) |
| *Coarse location consent, simplified boundary check & 36 State/UT picker* | *36 state clusters, paginated blood banks & Near Me sorting* |

*(Add captured PNGs under `docs/screenshots/` before publishing.)*

---

## Environment Variables

Every browser-exposed Vite variable in [`.env.example`](./.env.example) is **optional** and kept empty by default so the app runs cleanly out of the box on Firebase Spark:

| Variable | Purpose | Where to Get It | Required / Optional |
| :--- | :--- | :--- | :--- |
| `VITE_FIREBASE_APP_CHECK_SITE_KEY` | Enables Firebase App Check (`reCAPTCHA v3`) token verification on web clients to help curb bot abuse against Firestore reads/writes. | Google reCAPTCHA Admin Console (register a reCAPTCHA v3 site key for your Hosting domain) + Firebase Console -> App Check. | Optional |
| `VITE_CHAT_WORKER_URL` | HTTPS endpoint for the optional Cloudflare Worker (`workers/chat-worker.ts`) proxy used when online Assistant queries fall outside the offline bilingual knowledge base. | Output URL from running `npx wrangler deploy` on `workers/chat-worker.ts` (keep `GEMINI_API_KEY` inside `wrangler secret put`, never in `VITE_*`). | Optional |

> **Server / Tooling vars in `.env.example`:** `GEMINI_API_KEY` (Cloudflare Worker secret only—leave empty locally) and `APP_URL` (optional runtime Hosting URL).  
> **Web Config & API Key Hygiene:** `firebase-applet-config.json` contains only public Firebase web identifiers (safe for browser bundles). Always restrict the Google Cloud browser API key via HTTP Referrer rules to your deployed domain and enable Firebase App Check before production launch.

---

## Security Design Principles

LifeDrop applies **8 Security Design Principles** tailored for Firebase Spark without Cloud Functions:

1. **Strict PII Isolation:** Public donor documents (`users/{uid}`) expose only non-PII summary fields; emails, birth year, and phone numbers live inside owner-only `users/{uid}/private/contact`.
2. **Verified Admin Claims:** Admin actions require a verified Google/Email token matching the configured administrator account or explicit `admins/{email}` document.
3. **Lab-Confirmed Guardrails:** Users cannot self-promote `bloodGroupStatus` to `lab-confirmed` or increment `confirmedDonationsCount`—only verified blood banks or admins can confirm donations.
4. **Atomic Stats Guard:** Public registration counter increments (`+1`) are validated in `firestore.rules` with `existsAfter(/users/{uid})`.
5. **Dual-Gated SOS Phone Privacy:** Requester attendant phone numbers live in `sosPrivate/{sosId}` and are readable strictly by the requester or the matched `acceptedByUid` donor.
6. **Verified Bank Ownership:** `banks/{bankId}` allows stock writes strictly by the assigned `ownerUid` or Admin, while new applications (`bankApplications`) block owner self-approval.
7. **Append-Only Audit Trail:** `auditLogs` entries are immutable once written (updates and deletes denied in `firestore.rules`).
8. **Default-Deny Catch-All:** Unmatched paths default to `allow read, write: if false;`, paired with client `isDemo` protection and DPDP Act 2023 JSON export, consent withdrawal, and account deletion.

---

## Known Limitations

- **Simplified state boundaries near borders:** Offline GPS-to-state detection uses simplified bounding polygons; users close to state borders should verify `"Detected: <State>. Not right? Change"` and pick manually if needed.
- **No background push notifications on Spark free plan:** Firebase Cloud Messaging / Cloud Functions background triggers are excluded to uphold zero-cost Spark hosting. Active SOS escalations rely on foreground timers (`5 km -> 15 km -> 30 km -> State`), real-time listeners, and manual sharing.
- **Demo data:** Seeded national stats, blood group counts, goals, donation drives, and initial blood banks are clearly labeled with **`Demo data`** chips whenever `isDemo` is `true` until live verified centers onboard.
- **First-aid content pending formal clinical review:** Guidance cards, Assistant triage topics, and ABO/Rh compatibility notes display `"Content version and review date"` from [`src/config/medicalReview.ts`](./src/config/medicalReview.ts) until signed off by a medical reviewer.

---

## Offline Capabilities & Compatibility Checker

- **PWA Precaching:** Configured via `vite-plugin-pwa` (`47` precached entries, `~2.08 MiB`), covering the app shell, Bleeding Emergency first-aid modal, Emergency/SOS screens, bilingual first-aid JSON, and `/src/data/knowledge/compatibility.json`.
- **Standalone ABO/Rh Compatibility Checker:** [`CompatibilityCheckerModal`](./src/components/CompatibilityCheckerModal.tsx) reads [`src/data/knowledge/compatibility.json`](./src/data/knowledge/compatibility.json) completely offline with **zero AI calls**, supporting `Whole Blood`, `PRBC`, `Platelets`, and `Plasma` in both **Patient Receives From** and **Donor Can Give To** modes, plus direct **"Find on Map"** navigation.
- **Content Attribution Config:** Single config file [`src/config/medicalReview.ts`](./src/config/medicalReview.ts) drives `contentVersion`, `reviewerName`, `reviewedDate`, and `disclaimer` across Bleeding Emergency, About, Compatibility Checker, Chat Assistant, and SOS ABO/Rh tabs.

---

## Production Bundle Breakdown (`npm run build`)

| Chunk | Size (Minified) | Gzipped | Notes |
| :--- | :---: | :---: | :--- |
| `dist/assets/index-*.js` | `96.58 kB` | `26.23 kB` | Lean app entry shell (`HomeScreen` + navigation) |
| `dist/assets/vendor-firebase-*.js` | `680.21 kB` | `203.31 kB` | Firebase Auth + Firestore SDK split chunk |
| `dist/assets/vendor-react-*.js` | `404.71 kB` | `123.13 kB` | React 19 + React DOM vendor chunk |
| `dist/assets/vendor-leaflet-*.js` | `148.60 kB` | `43.33 kB` | Lazy-loaded with `MapScreen` only |
| `dist/assets/vendor-icons-*.js` | `39.84 kB` | `14.28 kB` | Tree-shaken Lucide icons |
| `dist/assets/vendor-motion-*.js` | `6.43 kB` | `2.71 kB` | Lazy/shared Motion runtime |
| `dist/assets/CompatibilityCheckerModal-*.js` | `9.56 kB` | `2.36 kB` | Offline ABO/Rh compatibility modal |
| `dist/assets/BleedingEmergencyModal-*.js` | `28.29 kB` | `8.28 kB` | Pre-cached offline first-aid & 108/112 modal |
| `dist/assets/MapScreen-*.js` | `37.06 kB` | `8.38 kB` | India 36 State/UT map & table screen |
| `dist/assets/SosScreen-*.js` | `41.76 kB` | `7.90 kB` | 3-Tap SOS, escalation & bank matching |
| `dist/assets/ChatScreen-*.js` | `39.38 kB` | `12.01 kB` | Multilingual offline KB & trauma triage |
| `dist/assets/ProfileScreen-*.js` | `37.43 kB` | `7.60 kB` | Eligibility ring, badges & DPDP controls |

---

## Responsive Layout Test Matrix

Verified viewport discipline using `100dvh`, `env(safe-area-inset-top / bottom)`, `viewport-fit=cover`, clamp typography, and centered `430px` tablet/desktop frame:

- `360x640` (Compact Android): Full-bleed edge-to-edge, 96px counter scaled via `clamp()`, Bleeding button & peek glass sheet reachable above 72px bottom nav.
- `375x667` (iPhone SE): Fits without clipping raised center SOS tab button.
- `390x844` (iPhone 14) & `412x915` (Pixel): Safe-area home bar clearance and clean peek/expanded snap sheet.
- `430x932` (Pro Max): Crisp full-bleed viewport without outer border.
- `768x1024` (Tablet) & `1440x900` (Desktop): Centered `430px × min(100dvh, 932px)` glass phone frame (`36px` radius) over the night-sky gradient.
- **Phone Landscape & Soft Keyboard:** Internal scroll container (`ld-scroll-area`) + `useVisualViewportHeight()` prevent clipped buttons or hidden inputs when mobile keyboards open.

---

## Verification Checklists

### Offline & PWA Smoke Checklist
1. Open the app once online and verify assets precache cleanly.
2. Enable **Airplane Mode / Offline** in DevTools.
3. Reload the page -> confirm app shell + `Offline mode · First aid & cached stats ready` banner appear.
4. Open **Bleeding Emergency First Aid** -> confirm all steps, Read Aloud speech synthesis, and `108` / `112` / `104` dial links render without errors.
5. Open **Blood Compatibility Checker (Offline · No AI)** -> confirm `Whole Blood`, `PRBC`, `Platelets`, and `Plasma` matrices work offline with zero network calls.

### Automated Checks (`package.json`)
- `npm run lint` — TypeScript strict check (`tsc --noEmit`).
- `npm run eval:assistant` — 40-prompt multilingual trauma, eligibility, deferral & privacy evaluation (`40/40 passed`).
- `npm run test:rules` — 12 static security contract checks against `firestore.rules` and `firestore.indexes.json` (`12/12 passed`).
- `npm run test:rules:emulator` — Runs full live allow/deny assertions inside the Firebase Firestore Emulator *(requires Java JDK 17+ locally)*.

*(Lighthouse CLI and Firebase Java Emulator were not available inside the build container; run `npm run preview` + Chrome Lighthouse locally before final release to record live environment scores.)*

---

## Run Locally & Zero-Cost Deploy

```bash
# 1. Install dependencies (npm, pnpm, or bun)
npm install

# 2. Copy environment template (all values optional; leave keys empty for Spark offline-first mode)
cp .env.example .env

# 3. Start local dev server (http://localhost:3000)
npm run dev

# 4. Run validation & production build
npm run lint
npm run eval:assistant
npm run test:rules
npm run build
```

### Deploy on Firebase Spark (Free)
```bash
npm run build
npx firebase deploy --only firestore:rules,firestore:indexes,hosting
```
*(Optional Assistant AI Worker: deploy `workers/chat-worker.ts` with `npx wrangler deploy`, set `GEMINI_API_KEY` via `npx wrangler secret put GEMINI_API_KEY`, and paste the worker HTTPS URL into `VITE_CHAT_WORKER_URL`.)*

---

## Files Added & Updated (Latest Safety & Repo Hygiene Pass)

- `LICENSE` — Added MIT License file.
- `SECURITY.md` — Added security disclosure policy, `[security-contact@example.com]` contact placeholder, RBAC/DPDP invariants, and verification commands.
- `.env.example` — Synced all optional `VITE_` and worker variables with empty defaults.
- `README.md` — Added Why LifeDrop, safety disclaimer, Screenshots section, `VITE_` Environment Variables table, Known Limitations, Security Design Principles, clean bundle breakdown, and updated checklists.
- `src/config/medicalReview.ts` — Added `contentVersion` and `getVersionAndReviewLine()` helper.
- `src/data/knowledge/compatibility.json` — Added structured offline ABO/Rh compatibility dataset for `Whole Blood`, `PRBC`, `Platelets`, and `Plasma`.
- `src/services/compatibilityService.ts` — Updated to read matrices directly from `compatibility.json`.
- `src/components/CompatibilityCheckerModal.tsx` — Created lazy-loaded standalone offline Compatibility Checker modal (zero AI calls).
- `src/components/BleedingEmergencyModal.tsx` & `src/components/AboutModal.tsx` — Added `"Content version and review date"` line from `MEDICAL_REVIEW_CONFIG`.
- `src/components/AdminPortalModal.tsx`, `src/components/BloodBankDashboardModal.tsx`, `src/components/BloodGroupPills.tsx`, `src/screens/HomeScreen.tsx`, `src/screens/SosScreen.tsx` — Ensured `"Demo data"` chips appear on seeded stats and bank lists across screens.
- `src/screens/ChatScreen.tsx`, `src/screens/ProfileScreen.tsx`, `src/App.tsx` — Wired clinical review version line and standalone offline Compatibility Checker launcher.

---

## Milestone Checklist

- [x] **M1** — Home Shell, 96px Live Counter, Snap Bottom Sheet, Offline Bleeding First Aid (EN/HI/KN + Speech), Privacy-Safe Coarse Location Flow & Responsive 100dvh Layout (A0–A7)
- [x] **M2** — All-India 36 State & UT Leaflet Map, Paginated Blood Banks Cache, Filters & Table Toggle (B1–B4)
- [x] **M3** — Firebase Auth (Google + Email), 18+ Age Gate, DPDP Consent, Next Eligible Ring, Badges & PNG Certificate Export
- [x] **M4** — Offline Client-Side Donor Eligibility Checker (7 Deferral Checks + Configurable Intervals) & Post-Donation Care
- [x] **M5** — 3-Tap Emergency SOS Engine, Client-Side 4-Stage Escalation Radar, Private Phone Unlock & Standalone Offline ABO/Rh Compatibility Checker (`compatibility.json`)
- [x] **M6** — Verified Blood Bank Dashboard (Stock Updates & Donation Confirmation), Applications & Admin KPI/Audit Portal
- [x] **M7** — Multilingual LifeDrop Assistant (40/40 Eval), Optional Worker AI Fallback, App Check Wiring, Firestore Rules Contract & Live Emulator Test Suite (`scripts/firestore-rules.test.ts`), `firebase.json` & `firestore.indexes.json`
- [x] **Repo & Clinical Safety Pass** — `LICENSE`, `SECURITY.md`, `README.md` overhaul, `.env.example` sync, single-config version/review line & uniform `Demo data` chips
