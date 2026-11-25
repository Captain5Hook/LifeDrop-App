# LifeDrop — Blood Bank Management System

A zero-cost, mobile-first Progressive Web App (PWA) for India that helps people find blood fast in an emergency, helps donors donate safely, and helps verified blood banks keep stock updated using shared live data on the Firebase Spark (free) plan.

---

## What Is Built So Far (Milestone 1 Complete)

### 1. Project & Bundle Sizes (Measured)
- **Source code (`src/`)**: **171 KB** across **25 files** (~4,162 lines including JSON data)
- **Public static assets (`public/`)**: **318 KB**
- **Installed dependencies (`node_modules/`)**: **364 MB** (dev + runtime packages)
- **Production build (`dist/`)**: **1.6 MB** total
  - `dist/index.html`: **1.36 kB** (gzip: **0.60 kB**)
  - `dist/assets/index-*.css`: **49.93 kB** (gzip: **8.59 kB**)
  - `dist/assets/index-*.js`: **1,209.00 kB** (gzip: **359.06 kB**) — includes React 19, Firebase SDK (Auth + Firestore persistent cache), Motion, and Lucide icons

### 2. Directory & File Inventory
```text
/
├── index.html                           # App entry, Inter font, dark theme class
├── metadata.json                        # App metadata & geolocation capability
├── package.json                         # Dependencies & scripts
├── firebase-applet-config.json          # Provisioned Firebase project config
├── firebase-blueprint.json              # Data model IR (StatsGlobal, StatsState, Goal, DonationDrive)
├── firestore.rules                      # Hardened Firestore security rules (Eight Pillars)
└── src/
    ├── App.tsx                    (8.6K) # Root layout, phone frame on desktop, navigation, modals
    ├── index.css                  (4.1K) # Design tokens, dark/light themes, glass surfaces, Data Saver
    ├── main.tsx                   (159B) # React mount
    ├── screens/
    │   └── HomeScreen.tsx         ( 16K) # Location header, 96px counter, HeroScene, Emergency CTA, Glass Sheet
    ├── components/
    │   ├── BleedingEmergencyModal ( 11K) # Offline step-by-step first aid + 108/112/104 + Read Aloud
    │   ├── LocationModals.tsx     ( 16K) # Pre-prompt explainer, 5-state handling, 36 states/UTs picker
    │   ├── SettingsDrawer.tsx     ( 11K) # Theme, Data Saver, Language, Location privacy, State previewer
    │   ├── BloodGroupPills.tsx    (6.0K) # Capsule pill scroller (O+, A+ first) with #5B3FE0 glow
    │   ├── HeroScene.tsx          (5.9K) # Lightweight SVG night-sky sanctuary with status aura
    │   ├── BottomNav.tsx          (4.6K) # Sculpted curved dock with raised center + SOS button
    │   ├── DrivesTabContent.tsx   (3.3K) # Donation drives & "I'll attend" toggle
    │   ├── GoalsTabContent.tsx    (2.5K) # Mission goals with SVG progress rings
    │   ├── ErrorBoundary.tsx      (1.6K) # Graceful crash recovery UI
    │   └── HomeSkeleton.tsx       (1.4K) # Glassmorphic loading skeleton
    ├── services/
    │   ├── firebase.ts            (1.3K) # Firebase App, Auth, Firestore + persistent local cache
    │   ├── errors.ts              (1.4K) # Structured FirestoreErrorInfo handler
    │   ├── interfaces.ts          (2.1K) # Swappable service contracts
    │   ├── locationService.ts     (6.4K) # 5-state geolocation, Permissions API, ~2km privacy rounding
    │   └── statsService.ts        (5.6K) # Narrow onSnapshot listeners + offline demo fallback
    ├── hooks/
    │   ├── useAppSettings.ts      (2.2K) # Theme (dark/light), Data Saver, Language, Preview states
    │   ├── useHomeStats.ts        (2.5K) # Subscribes to global/state stats, goals, drives
    │   ├── useLocationFlow.ts     (2.7K) # Explainer, manual picker, live permission tracking
    │   └── useOnlineStatus.ts     (627B) # Real-time online/offline detection
    └── data/
        ├── indiaLocations.ts      ( 14K) # All 28 states & 8 UTs + major cities with coordinates
        ├── indiaStatesGeo.ts      (7.1K) # Offline polygons, point-in-polygon & Haversine nearest city
        ├── seedStats.ts           (9.9K) # Realistic India blood split (~48,240 demo users, 4 goals, 8 drives)
        └── knowledge/
            └── bleedingFirstAid.json (19K) # Offline EN/HI/KN bleeding first-aid steps & special cases
```

---

## Features & Safety Architecture

### Design System
- **Dark-first purple sky theme** (`#1B1740` to `#6B4FBB`) with faint starfield, frosted glass (`rgba(255,255,255,0.10)`, `backdrop-filter: blur(20px)`), active pill glow (`#5B3FE0`), and status colors (`#34D399` stable, `#FBBF24` low, `#F43F5E` critical).
- **Light theme** toggle, **Data Saver mode** (disables animations), and `prefers-reduced-motion` support.
- **Screen states**: Live, Loading Skeleton, Empty, Error (with retry), and Offline banner.

### Location Permission & Privacy (Offline Geo Resolution)
- Shows a friendly **pre-prompt explainer** before calling `navigator.geolocation.getCurrentPosition`.
- Handles all **5 geolocation states**: `granted`, `denied`, `dismissed`, `unavailable`, and `timeout` (10s), plus an **outside-India** check (`LifeDrop currently serves India only`).
- Resolves state & nearest city **100% offline** using bundled polygons (`src/data/indiaStatesGeo.ts`) and Haversine distance across all **28 states & 8 union territories**.
- Rounds coordinates to ~2 km before storing locally; provides **Update location**, **Turn off location sharing**, and **Delete my location data** in Settings.
- **HTTPS Requirement**: Browser Geolocation requires **HTTPS** (provided automatically by Firebase Hosting). Inside embedded preview iframes, browsers may block geolocation unless the host iframe allows it—use **Choose manually** anytime if blocked in a preview frame.

### Firestore Read Budget (Firebase Spark Free Plan)
To stay comfortably inside Spark's **~50,000 reads/day** and **~20,000 writes/day** free quota:
1. **Aggregated stats documents**: Home counters read 2 single documents (`stats/global` and `stats/state_{code}`) instead of counting user collections on the client.
2. **Bundled static knowledge & geography**: Bleeding first-aid content (19 KB JSON) and India state/city polygons (21 KB TS) are bundled locally = **0 Firestore reads**.
3. **Offline persistence cache**: Firestore `persistentLocalCache` serves unchanged data from IndexedDB across reloads.
4. **Narrowly scoped queries**: Goals (`limit(8)`) and Drives (`where('stateCode', '==', ...)` + `limit(10)`) cap reads per session.
- **Estimated reads per Home load**: ~2–14 reads on a cold cache, ~0–2 reads on warm cache.

---

## Milestones Roadmap
- [x] **M1**: Design system, Home screen, Bleeding Emergency offline first-aid, 5-state location flow
- [ ] **M2**: India-only Leaflet + OpenStreetMap view, state clusters, filters, state-wise table
- [ ] **M3**: Auth (Google & email/password), 18+ age gate, donor profile & eligibility engine
- [ ] **M4**: Emergency SOS, ABO/Rh compatibility, client-side radius escalation, live tracking
- [ ] **M5**: Hybrid Chatbot (offline Knowledge Base + Cloudflare Worker Gemini proxy + 40-prompt eval)
- [ ] **M6**: Blood Bank dashboard, onboarding, Admin verification & KPI panel
- [ ] **M7**: PWA service worker, Firestore rules unit tests, free deploy guide

## Upgrade Path (When Budget Allows)
- Background push notifications via Firebase Cloud Functions + FCM
- Phone SMS OTP verification
- Cloud Storage for verified blood bank documents & certificates
