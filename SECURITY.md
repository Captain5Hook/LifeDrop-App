# Security Policy

## Reporting a Vulnerability

If you discover a security, privacy (DPDP Act 2023), or Firestore security rule vulnerability in LifeDrop, please report it responsibly instead of opening a public issue:

- **Security Contact**: `[security-contact@example.com]` *(replace with active maintainer security email before public launch)*
- **Response Target**: Acknowledgement within 48 hours; triage and remediation plan within 7 business days.

Please include:
1. Affected file path, collection rule, or user flow.
2. Steps to reproduce cleanly (please test against the local Firestore Emulator rather than production data).
3. Impact assessment (for example, unintended PII exposure or unauthorized write access).

## Architecture Security Guarantees

- **Zero Client Secrets**: Never commit `.env` files, Gemini API keys, or service account JSON files. Public browser environment variables in `.env.example` use the `VITE_` prefix only.
- **PII Isolation**: User email, phone number, and birth year reside in `/users/{uid}/private/contact` (owner-only). SOS requester phone numbers reside in `/requests/{requestId}/private/contact` and unlock only for the requester or the matched donor (`acceptedByUid`).
- **Role-Based Access Control (RBAC)**:
  - Donors cannot self-promote `bloodGroupStatus` to `lab-confirmed`.
  - Blood bank owners cannot self-approve `/bankApplications/{uid}` and may update only stock/hours/helpline fields on verified `/banks/{bankId}` documents they own.
  - `/auditLogs/{logId}` records are immutable append-only (`update` and `delete` denied).

## Verifying Security Rules Locally

```bash
npm run test:rules           # Static rules & blueprint contract audit
npm run test:rules:emulator  # Live Firestore Emulator allow/deny suite (requires JDK 17+)
```
