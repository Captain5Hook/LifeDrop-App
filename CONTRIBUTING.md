# Contributing to LifeDrop

Thank you for helping improve LifeDrop India!

## Zero-Cost Rules
Every contribution must preserve LifeDrop's zero-cost architecture:
- **Firebase Spark Plan only** — no Cloud Functions, no Cloud Storage, and no paid SMS OTP.
- **Free OpenStreetMap + Leaflet** tiles only (no paid map/places APIs).
- **No client secrets** — never commit `.env` files, Gemini keys, or service-account JSON.

## Development Workflow
1. Fork the repository and create a feature branch (`git checkout -b fix/short-summary`).
2. Install dependencies (`npm install` or `bun install`) and copy `.env.example` to `.env`.
3. Run checks before opening a Pull Request:
   ```bash
   npm run lint
   npm run eval:assistant
   npm run test:rules
   npm run build
   ```
4. For medical first-aid or eligibility edits, note sources clearly and keep the pending clinician review banner intact.
