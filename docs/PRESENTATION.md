# LifeDrop Presentation Cheat Sheet

Reference guide grounded strictly in the implemented LifeDrop codebase (`React 19 + TypeScript + Vite PWA + Firebase Spark`).

---

## 1. 30-Second Pitch

- **Problem:** During road trauma, obstetric bleeding, or urgent surgeries in India, families waste critical minutes hunting through fragmented websites and stale directories—often inside hospital corridors or basements with weak mobile data.
- **Solution:** LifeDrop is a **free, offline-first PWA** that puts multilingual bleeding first-aid (`EN`, `हिन्दी`, `ಕನ್ನಡ`) with instant `108` / `112` / `104` dialing, ABO/Rh component compatibility, a state-scoped India blood bank directory, and a 3-tap SOS flow into one installable app.
- **Who It Helps:** Emergency bystanders and families needing immediate first aid or blood, voluntary blood donors tracking eligibility, and licensed Indian blood banks updating stock—with zero cloud hosting fees on Firebase Spark.

---

## 2. 5-Minute Live Demo Script

1. **Home Screen & Demo Transparency (`0:00 – 0:45`):**
   - Open LifeDrop (`Home` tab). Point out the top location pill (`Bengaluru, Karnataka`), hero donor counter with explicit `Demo data` badges, `All India` toggle, and **Our Goals** / **Donation Drives** tabs in the bottom glass sheet.
   - Open the top-right **Settings** button to show Dark Indigo / Light Lilac theme switching, **Data Saver** reduced motion, and `"Delete my location data"`.
2. **Bleeding Emergency & Offline Proof (`0:45 – 2:00`):**
   - Tap the red **Bleeding Emergency · First Aid & 108** button on Home.
   - Point out the top `108 / 112` emergency banner, sticky **Call 108 / Call 112 / Call 104** buttons, and the **Reviewed by: Pending review** medical disclaimer footer.
   - Switch languages (`EN` -> `हिन्दी` -> `ಕನ್ನಡ`), tap **Read aloud**, step through **Next step**, and open **Special Cases (6)**.
   - *(If presenting on mobile/Chromium DevTools)* toggle **Offline** and reload to show the `"Offline mode · First aid & cached stats ready"` status banner and working Bleeding Emergency modal.
3. **Blood Group Pills & Offline Compatibility Checker (`2:00 – 2:45`):**
   - Close Bleeding Emergency. Tap **O-** or **O+** pill -> tap **Compatibility** to open `CompatibilityCheckerModal`.
   - Switch blood components (**Whole Blood**, **PRBC**, **Platelets**, **Plasma**) to demonstrate red-cell vs. plasma compatibility reversal offline.
4. **India Blood Bank Map (`2:45 – 3:30`):**
   - Tap **Map** in bottom navigation. Show Leaflet + OpenStreetMap view with 36 State/UT markers, blood group/24x7/Govt-Private filters, **Near me** sorting, and accessible Table view fallback. Note stock starts with seeded demo data.
5. **Multilingual Assistant (`3:30 – 4:15`):**
   - Tap **Chatbot**. Type a heavy-bleeding query to trigger the trauma triage alert banner, toggle **Compatibility Widget**, switch reply language (`EN / HI / KN`), and try a medical-diagnosis prompt to show safety refusals (`40/40` eval).
6. **SOS, Profile & Portals (`4:15 – 5:00`):**
   - Tap the center **`+ SOS`** button to show 3-tap request creation with client-side radius escalation (`5 -> 15 -> 50 -> 250 km`) and compatible group expansion.
   - Tap **Profile** to show Google / Email Sign-In, `18+` age gate, DPDP export/consent controls, 7-check **Eligibility Checker**, PNG certificate generator, and role previews for **Bank Dashboard** and **Admin Portal**.

---

## 3. Feature Status Matrix

| Feature | Status | Code Evidence |
| :--- | :--- | :--- |
| Responsive shell, Dark/Light themes & Data Saver | **Done** | `src/index.css`, `src/hooks/useAppSettings.ts`, Playwright `9/9` matrix |
| Home stats, Goals, Drives & explicit Demo badges | **Done** | `src/screens/HomeScreen.tsx`, `src/components/BloodGroupPills.tsx` |
| Location explainer, 5 GPS outcomes, offline ~2 km lookup & delete | **Done** | `src/hooks/useLocationFlow.ts`, `src/data/indiaStatesGeo.ts`, `src/components/LocationModals.tsx` |
| Offline Bleeding Emergency (`EN/HI/KN`, `108/112/104`, Read Aloud) | **Done** | `src/components/BleedingEmergencyModal.tsx`, `src/data/knowledge/bleedingFirstAid.json` |
| Offline ABO/Rh Compatibility Checker (Whole/PRBC/Platelets/Plasma) | **Done** | `src/components/CompatibilityCheckerModal.tsx`, `src/data/knowledge/compatibility.json` |
| PWA precache (`52` entries) & offline Chromium reload proof | **Done** | `vite.config.ts`, `dist/sw.js`, `docs/evidence/offline-proof.json` |
| India Blood Bank Map & Filters | **Partial** | Leaflet UI & state-scoped `/banks` queries work (`src/screens/MapScreen.tsx`); uses seeded demo stock until verified banks onboard |
| Auth, 18+ DPDP controls, Eligibility Checker & PNG Certificate | **Partial** | Google & Email auth, `/consents/{uid}`, JSON export, certificate (`src/screens/ProfileScreen.tsx`); no paid Phone OTP SMS |
| 3-Tap SOS, Radius Escalation & Matched Contact Reveal | **Partial** | Works while app is open (`src/screens/SosScreen.tsx`, `src/services/sosService.ts`); no closed-app push or 30-day TTL auto-purge |
| Multilingual Offline Assistant | **Partial** | Bundled `EN/HI/KN` triage + `40/40` safety eval (`src/screens/ChatScreen.tsx`); Cloudflare Gemini worker optional/undeployed |
| Bank Dashboard & Admin Verification Portal | **Partial** | Stock updates, Admin approve/reject & append-only `/auditLogs` work; no PDF document upload or bank `lab-confirmed` donor stamp |
| Formal clinical sign-off, Lighthouse 90+ & Live Emulator Run | **Planned** | Pending clinician review (`src/config/appGovernance.ts`), local Lighthouse measurement, and JDK 17+ emulator test |

---

## 4. Honest Limitations

- Seeded donor counts, mission goals, drives, and initial blood bank stocks are **demo data** (`Demo data` chips shown across the UI).
- **No background push notifications** when the app is closed (excluded by Firebase Spark free-tier constraint without Cloud Functions).
- **No phone-OTP SMS verification** (Email/Password and Google Auth only on free Spark tier).
- **Clinical medical review and native HI/KN copy sign-off are pending** (`Reviewed by: Pending review`).
- **Any verified, signed-in user with a profile can accept an open SOS request** (`firestore.rules`); stricter donor vetting and `lab-confirmed` blood-bank stamping are planned.
- **Mobile Lighthouse scores and live JDK 17+ Firestore Emulator execution are Not measured yet / Not verified** in this container (verified statically via `12/12` rules audit, `16/16` Vitest + `axe-core`, `40/40` assistant eval, and Playwright Chromium layout/offline checks).

---

## 5. Top 10 Evaluator Questions & Honest Answers

1. **Why restrict to the Firebase Spark free tier only?**
   To prove emergency blood-coordination tooling for Indian communities can run with zero monthly cloud burn—avoiding paid Cloud Functions, Cloud Storage, paid SMS gateways, and paid map/geocoding APIs.
2. **How is user privacy handled?**
   User email, phone, and birth year (`dobYear` 18+ check) sit in `/users/{uid}/private/contact` (strictly owner-only in `firestore.rules`). SOS phone numbers in `/requests/{id}/private/contact` unlock only for the requester or the matched donor (`acceptedByUid`). DPDP controls let users export JSON, withdraw consent, or delete their account.
3. **How are fake or abusive SOS requests limited?**
   Creating `/requests/{id}` requires authentication, forces initial `status == 'open'`, `radiusKm == 5`, `escalationStage == 1`, strict field lengths, India bounding-box coordinates, and `isDemo == false`. Accepting an open SOS requires a verified email (`isVerifiedUser()`) and an existing `/users/{uid}` profile.
4. **How accurate is the offline state/location detection?**
   Browser coordinates resolve locally in `src/data/indiaStatesGeo.ts` against state polygon boxes and city centroids with a `45 km` coastal/border cutoff (verified `10/10` Indian cities accepted and `3/3` foreign cities rejected in Vitest), rounding stored coordinates to `~2 km` (`0.02°`). Users near an inter-state border can pick their exact state/city via **Choose manually**.
5. **What still works completely offline?**
   After first load, Workbox precaches `52` assets (`2065.99 KiB`) in `dist/sw.js`: Bleeding Emergency first aid in EN/HI/KN with `108/112/104` `tel:` links and Read Aloud, Compatibility Matrix, 7-check Eligibility tool, offline Assistant knowledge base, location picker, and Firestore `persistentLocalCache` reads.
6. **Who reviews the medical and first-aid content?**
   First-aid guidance adapts standard Red Cross and WHO public principles and compatibility tables, but **formal clinician sign-off and native Hindi/Kannada clinical verification are still Pending review** (`src/config/appGovernance.ts`). Disclaimers clearly state it is not medical advice.
7. **How would LifeDrop scale under high traffic?**
   Home aggregates reads into summary docs (`stats/global`, `stats/state_{code}` ~21 reads per cold load vs. scanning users), bundles geography/knowledge locally (`0` reads), caches via IndexedDB persistence, and paginates `/banks` (`20` per page).
8. **What is the long-term sustainability model?**
   The core web client and first-aid guide stay free with no user fees. Optional institutional integrations (e.g., partner hospital onboarding or verified SMS alerts via Blaze upgrade) can be funded later via institutional/CSR grants while keeping public first-aid and search free.
9. **What personal data is actually stored?**
   Raw GPS latitude/longitude are never persisted to Firestore or `localStorage`. Saved local state (`lifedrop_location_v1`) stores state/city and `~2 km` coarse coordinates only. Account profiles store blood group, donor availability, donation count, isolated contact PII, and DPDP consent timestamps.
10. **What comes next after Milestone 1 & this submission?**
    Deploying `.web.app` hosting, obtaining formal clinical sign-off, onboarding verified real blood banks to replace demo stocks, deploying the optional Cloudflare Worker for online assistant fallback, and running live JDK 17+ emulator + mobile Lighthouse audits.

---

## 6. What I Would Improve Next (From Roadmap)

1. Complete clinical first-aid review (`src/config/appGovernance.ts`) and native Hindi/Kannada translation verification.
2. Replace seeded demo blood banks with verified licensed blood bank feeds (`M2`) and implement bank-side `lab-confirmed` donor stamping (`M6`).
3. Measure mobile Lighthouse `90+`, run live `npm run test:rules:emulator` with JDK 17+, and enable Firebase App Check reCAPTCHA v3 (`M7`).
4. Deploy the Cloudflare Worker (`workers/chat-worker/index.ts`) for optional online Gemini fallback (`M5`).
5. Under a funded Upgrade Path (Blaze), add FCM background push notifications, Phone OTP verification, and automated 30-day SOS PII auto-purge (`M4`).
