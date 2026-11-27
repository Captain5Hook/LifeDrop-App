import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

const PROJECT_ID = 'lifedrop-rules-test';
const ADMIN_TEST_EMAIL = 'admin@example.com';
const RULES_PATH = path.resolve(process.cwd(), 'firestore.rules');
const BLUEPRINT_PATH = path.resolve(process.cwd(), 'firebase-blueprint.json');
const INDEXES_PATH = path.resolve(process.cwd(), 'firestore.indexes.json');

interface TestCaseResult {
  name: string;
  passed: boolean;
  detail?: string;
}

function nowIso() {
  return new Date().toISOString();
}

function futureIso() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

async function runStaticContractAudit(): Promise<void> {
  const rules = fs.readFileSync(RULES_PATH, 'utf8');
  const blueprint = JSON.parse(fs.readFileSync(BLUEPRINT_PATH, 'utf8')) as {
    entities: Record<string, unknown>;
    firestore: Record<string, unknown>;
  };
  const indexes = JSON.parse(fs.readFileSync(INDEXES_PATH, 'utf8')) as {
    indexes: Array<{ collectionGroup: string; fields: unknown[] }>;
  };

  const checks: Array<{ name: string; fn: () => void }> = [
    {
      name: 'Default-deny catch-all exists at root',
      fn: () => {
        assert.ok(
          /match \/{document=\*\*}\s*{\s*allow read, write: if false;/.test(rules),
          'Missing default deny catch-all',
        );
      },
    },
    {
      name: 'No root wildcard read/write allow and no blanket list on private collections',
      fn: () => {
        assert.equal(
          /match \/\{document=\*\*\}\s*\{[^}]*allow\s+(read|write)\s*:\s*if\s+true/.test(rules),
          false,
        );
        assert.equal(/allow\s+write\s*:\s*if\s+true\s*;/.test(rules), false);
        assert.equal(/match \/users\/[\s\S]*?allow\s+list\s*:\s*if\s+isSignedIn\(\)\s*;/.test(rules), false);
        assert.equal(/match \/consents\/[\s\S]*?allow\s+list\s*:\s*if\s+isSignedIn\(\)\s*;/.test(rules), false);
        assert.equal(/match \/requests\/\{requestId\}[\s\S]*?allow\s+list\s*:\s*if\s+isSignedIn\(\)\s*;/.test(rules), false);
      },
    },
    {
      name: 'Admin requires verified email and /admins/{uid} document with zero hardcoded email literals',
      fn: () => {
        assert.ok(/function isVerifiedUser\(\)/.test(rules));
        assert.ok(/request\.auth\.token\.email_verified == true/.test(rules));
        assert.ok(
          /function isAdmin\(\)\s*\{\s*return isVerifiedUser\(\) && exists\(\/databases\/\$\(database\)\/documents\/admins\/\$\(request\.auth\.uid\)\);\s*\}/.test(
            rules,
          ),
        );
        assert.ok(/match \/admins\/\{uid\}/.test(rules));
        assert.equal(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(rules),
          false,
          'firestore.rules must not contain any hardcoded email address literal',
        );
      },
    },
    {
      name: 'Users PII isolated in /users/{userId}/private/contact (owner-only)',
      fn: () => {
        assert.ok(/match \/users\/{userId}/.test(rules));
        assert.ok(/match \/private\/contact/.test(rules));
        assert.ok(/data\.dobYear is int && data\.dobYear >= 1920 && data\.dobYear <= 2008/.test(rules));
      },
    },
    {
      name: 'Users cannot self-promote bloodGroupStatus or set isDemo flag',
      fn: () => {
        assert.ok(/incoming\(\)\.bloodGroupStatus == 'self-reported'/.test(rules));
        assert.ok(rules.includes("!('isDemo' in data) || data.isDemo == false"));
        assert.ok(/hasAny\(\['bloodGroupStatus', 'lastConfirmedDonation', 'isDemo'\]\)/.test(rules));
      },
    },
    {
      name: 'Stats, Goals, and Drives allow public read only and deny create, update, and delete',
      fn: () => {
        for (const colPath of ['/stats/{statId}', '/goals/{goalId}', '/drives/{driveId}']) {
          const match = rules.match(
            new RegExp(`match ${colPath.replace(/[/{}]/g, '\\$&')}\\s*\\{([\\s\\S]*?)\\}`),
          );
          assert.ok(match, `Missing rule block for ${colPath}`);
          const block = match[1];
          assert.ok(/allow read:\s*if true;/.test(block), `${colPath} must allow public read`);
          assert.ok(/allow write:\s*if false;/.test(block), `${colPath} must deny all client writes (create, update, delete)`);
          assert.equal(/allow (create|update|delete):\s*if\s+true/.test(block), false);
        }
      },
    },
    {
      name: 'Banks list requires sign-in and stock updates require verified ownerUid or Admin',
      fn: () => {
        assert.ok(/match \/banks\/\{bankId\}[\s\S]*?allow get: if isSignedIn\(\) && isValidId\(bankId\);[\s\S]*?allow list: if isSignedIn\(\);/.test(rules));
        assert.ok(/existing\(\)\.verified == true/.test(rules));
        assert.ok(/existing\(\)\.ownerUid == request\.auth\.uid/.test(rules));
        assert.ok(/affectedKeys\(\)\.hasOnly\(\['stock', 'open24x7', 'phone', 'updatedAt'\]\)/.test(rules));
      },
    },
    {
      name: 'SOS list checks open/matched status, donor acceptance requires isVerifiedUser() and profile, and contact reveals post-match',
      fn: () => {
        assert.ok(/match \/requests\/\{requestId\}[\s\S]*?allow list: if isSignedIn\(\) && resource\.data\.status in \['open', 'matched'\];/.test(rules));
        assert.ok(
          /existing\(\)\.requesterUid != request\.auth\.uid[\s\S]*?existing\(\)\.status == 'open'[\s\S]*?&& isVerifiedUser\(\)[\s\S]*?&& exists\(\/databases\/\$\(database\)\/documents\/users\/\$\(request\.auth\.uid\)\)/.test(
            rules,
          ),
          'SOS donor update branch must require isVerifiedUser() and existing user profile',
        );
        assert.ok(rules.includes('.data.requesterUid == request.auth.uid ||'));
        assert.ok(rules.includes('.data.acceptedByUid == request.auth.uid'));
      },
    },
    {
      name: 'BankApplications restrict owner from self-approving status',
      fn: () => {
        assert.ok(/match \/bankApplications\/{applicantUid}/.test(rules));
        assert.ok(/incoming\(\)\.status == 'pending'/.test(rules));
      },
    },
    {
      name: 'AuditLogs require admin or bank-role user on create and forbid update/delete',
      fn: () => {
        assert.ok(/match \/auditLogs\/{logId}/.test(rules));
        assert.ok(/\(isAdmin\(\) && incoming\(\)\.actorRole == 'admin'\)/.test(rules));
        assert.ok(
          /incoming\(\)\.actorRole == 'bank'[\s\S]*?exists\(\/databases\/\$\(database\)\/documents\/users\/\$\(request\.auth\.uid\)\)[\s\S]*?get\(\/databases\/\$\(database\)\/documents\/users\/\$\(request\.auth\.uid\)\)\.data\.role == 'bank'/.test(
            rules,
          ),
        );
        assert.ok(/allow update, delete: if false;/.test(rules));
      },
    },
    {
      name: 'All 12+ Firestore blueprint collections & subcollections exist in rules',
      fn: () => {
        const expectedMatchers = [
          '/admins/{uid}',
          '/stats/{statId}',
          '/goals/{goalId}',
          '/drives/{driveId}',
          '/banks/{bankId}',
          '/users/{userId}',
          '/private/contact',
          '/consents/{userId}',
          '/config/{configId}',
          '/requests/{requestId}',
          '/responses/{donorUid}',
          '/bankApplications/{applicantUid}',
          '/auditLogs/{logId}',
        ];
        for (const m of expectedMatchers) {
          assert.ok(rules.includes(m), `Missing rule matcher: ${m}`);
        }
        assert.ok(Object.keys(blueprint.firestore).length >= 12);
      },
    },
    {
      name: 'Composite indexes cover state-scoped banks and SOS queries',
      fn: () => {
        assert.ok(indexes.indexes.some((idx) => idx.collectionGroup === 'banks'));
        assert.ok(indexes.indexes.filter((idx) => idx.collectionGroup === 'requests').length >= 2);
      },
    },
  ];

  const results: TestCaseResult[] = [];
  for (const c of checks) {
    try {
      c.fn();
      results.push({ name: c.name, passed: true });
    } catch (err) {
      results.push({
        name: c.name,
        passed: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const passedCount = results.filter((r) => r.passed).length;
  console.log(`\nLifeDrop Rules Static Contract Audit: ${passedCount}/${results.length} passed`);
  for (const r of results) {
    console.log(`  ${r.passed ? 'PASS' : 'FAIL'} - ${r.name}${r.detail ? `: ${r.detail}` : ''}`);
  }

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

async function runEmulatorSuite(): Promise<void> {
  const rules = fs.readFileSync(RULES_PATH, 'utf8');
  const hostPort = process.env.FIRESTORE_EMULATOR_HOST?.split(':');
  const host = hostPort?.[0] ?? '127.0.0.1';
  const port = Number(hostPort?.[1] ?? '8080');

  let testEnv: RulesTestEnvironment | null = null;
  try {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules,
        host,
        port,
      },
    });

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'stats', 'global'), {
        totalUsers: 100,
        joinedToday: 5,
        activeDonorsMonth: 40,
        requestsFulfilled: 20,
        banksOnboarded: 135,
        statesCovered: 36,
        isDemo: true,
        updatedAt: nowIso(),
      });
      await setDoc(doc(db, 'banks', 'bank_ka_1'), {
        id: 'bank_ka_1',
        name: 'Victoria Blood Centre',
        stateCode: 'KA',
        stateName: 'Karnataka',
        city: 'Bengaluru',
        district: 'Bengaluru Urban',
        lat: 12.97,
        lng: 77.59,
        type: 'government',
        open24x7: true,
        phone: '+91 80 2670 1150',
        stock: { 'O+': 10, 'A+': 8, 'B+': 7, 'AB+': 3, 'O-': 2, 'A-': 2, 'B-': 1, 'AB-': 1 },
        ownerUid: 'bank_owner_1',
        verified: true,
        licenseNumber: 'KA/BLD/2026/001',
        updatedAt: nowIso(),
        isDemo: false,
      });
      await setDoc(doc(db, 'admins', 'admin_1'), {
        role: 'admin',
        createdAt: nowIso(),
      });
    });

    const anonDb = testEnv.unauthenticatedContext().firestore();
    const donorDb = testEnv
      .authenticatedContext('donor_1', { email: 'donor1@example.com', email_verified: true })
      .firestore();
    const donor2Db = testEnv
      .authenticatedContext('donor_2', { email: 'donor2@example.com', email_verified: true })
      .firestore();
    const bankOwnerDb = testEnv
      .authenticatedContext('bank_owner_1', { email: 'bank1@example.com', email_verified: true })
      .firestore();
    const adminDb = testEnv
      .authenticatedContext('admin_1', { email: ADMIN_TEST_EMAIL, email_verified: true })
      .firestore();

    const tests: Array<{ name: string; run: () => Promise<void> }> = [
      {
        name: 'Default deny unknown collection read/write',
        run: async () => {
          await assertFails(getDoc(doc(donorDb, 'secretCollection', 'doc1')));
          await assertFails(setDoc(doc(donorDb, 'secretCollection', 'doc1'), { x: 1 }));
        },
      },
      {
        name: 'Public stats/goals/drives read allowed; all client writes (anon, donor, admin) denied',
        run: async () => {
          await assertSucceeds(getDoc(doc(anonDb, 'stats', 'global')));
          await assertFails(setDoc(doc(anonDb, 'stats', 'global'), { totalUsers: 9999 }));
          await assertFails(setDoc(doc(donorDb, 'stats', 'global'), { totalUsers: 9999 }));
          await assertFails(setDoc(doc(adminDb, 'stats', 'global'), { totalUsers: 9999 }));
          await assertFails(setDoc(doc(donorDb, 'goals', 'goal_fake'), { title: 'Fake', current: 1, target: 10 }));
          await assertFails(setDoc(doc(donorDb, 'drives', 'drive_fake'), { title: 'Fake', dateLabel: 'Now', place: 'X', city: 'Y', stateCode: 'KA', stateName: 'Karnataka', attendeesCount: 1 }));
        },
      },
      {
        name: 'Owner onboarding batch: user + private/contact + consent (isDemo false enforced)',
        run: async () => {
          const ts = nowIso();
          const batch = writeBatch(donorDb);
          batch.set(doc(donorDb, 'users', 'donor_1'), {
            uid: 'donor_1',
            displayName: 'Aarav',
            role: 'donor',
            bloodGroup: 'O+',
            bloodGroupStatus: 'self-reported',
            stateCode: 'KA',
            stateName: 'Karnataka',
            city: 'Bengaluru',
            sex: 'male',
            canDonateNow: true,
            donationsCount: 0,
            timeline: [],
            age18PlusConfirmed: true,
            consentTimestamp: ts,
            isDemo: false,
            createdAt: ts,
            updatedAt: ts,
          });
          batch.set(doc(donorDb, 'users', 'donor_1', 'private', 'contact'), {
            uid: 'donor_1',
            email: 'donor1@example.com',
            phone: '+91 98450 00001',
            dobYear: 1998,
            updatedAt: ts,
          });
          batch.set(doc(donorDb, 'consents', 'donor_1'), {
            uid: 'donor_1',
            purpose: 'LifeDrop voluntary blood donor matching under DPDP Act 2023',
            acceptedPrivacy: true,
            acceptedAge18Plus: true,
            acceptedEmergencyAlerts: true,
            withdrawn: false,
            createdAt: ts,
            updatedAt: ts,
          });
          await assertSucceeds(batch.commit());
          // Normal user cannot mark their profile isDemo: true
          await assertFails(
            updateDoc(doc(donorDb, 'users', 'donor_1'), {
              isDemo: true,
              updatedAt: nowIso(),
            }),
          );
        },
      },
      {
        name: 'Underage dobYear (>2008) rejected by private/contact rule',
        run: async () => {
          await assertFails(
            setDoc(doc(donorDb, 'users', 'donor_1', 'private', 'contact'), {
              uid: 'donor_1',
              email: 'donor1@example.com',
              phone: '+91 98450 00001',
              dobYear: 2012,
              updatedAt: nowIso(),
            }),
          );
        },
      },
      {
        name: 'Cross-user PII & profile read/write strictly denied',
        run: async () => {
          await assertFails(getDoc(doc(donor2Db, 'users', 'donor_1')));
          await assertFails(getDoc(doc(donor2Db, 'users', 'donor_1', 'private', 'contact')));
          await assertFails(getDoc(doc(donor2Db, 'consents', 'donor_1')));
        },
      },
      {
        name: 'Donor cannot self-escalate bloodGroupStatus to lab-confirmed',
        run: async () => {
          await assertFails(
            updateDoc(doc(donorDb, 'users', 'donor_1'), {
              bloodGroupStatus: 'lab-confirmed',
              updatedAt: nowIso(),
            }),
          );
        },
      },
      {
        name: 'SOS request creation + post-acceptance phone privacy handshake',
        run: async () => {
          const ts = nowIso();
          await assertSucceeds(
            setDoc(doc(donorDb, 'requests', 'sos_test_1'), {
              id: 'sos_test_1',
              requesterUid: 'donor_1',
              requesterName: 'Aarav',
              bloodGroup: 'O+',
              compatibleDonorGroups: ['O+', 'O-'],
              component: 'Whole Blood',
              unitsNeeded: 2,
              urgency: 'critical',
              hospitalName: 'St. John Hospital',
              stateCode: 'KA',
              stateName: 'Karnataka',
              city: 'Bengaluru',
              coarseLat: 12.93,
              coarseLng: 77.62,
              radiusKm: 5,
              escalationStage: 1,
              status: 'open',
              acceptedByUid: null,
              acceptedByName: null,
              matchedCount: 0,
              notes: 'Emergency surgery',
              isDemo: false,
              createdAt: ts,
              updatedAt: ts,
              expiresAt: futureIso(),
            }),
          );
          await assertSucceeds(
            setDoc(doc(donorDb, 'requests', 'sos_test_1', 'private', 'contact'), {
              requesterUid: 'donor_1',
              phone: '+91 98450 00001',
              updatedAt: ts,
            }),
          );

          // Before acceptance, donor_2 CANNOT read requester phone
          await assertFails(getDoc(doc(donor2Db, 'requests', 'sos_test_1', 'private', 'contact')));

          // Donor_2 accepts open SOS request
          await assertSucceeds(
            updateDoc(doc(donor2Db, 'requests', 'sos_test_1'), {
              status: 'matched',
              acceptedByUid: 'donor_2',
              acceptedByName: 'Diya',
              matchedCount: 1,
              updatedAt: nowIso(),
            }),
          );

          // After acceptance, donor_2 CAN read requester phone; third party bank_owner_1 CANNOT
          await assertSucceeds(getDoc(doc(donor2Db, 'requests', 'sos_test_1', 'private', 'contact')));
          await assertFails(getDoc(doc(bankOwnerDb, 'requests', 'sos_test_1', 'private', 'contact')));
        },
      },
      {
        name: 'Verified bank owner updates ONLY stock/open24x7/phone/updatedAt; stranger denied',
        run: async () => {
          await assertSucceeds(
            updateDoc(doc(bankOwnerDb, 'banks', 'bank_ka_1'), {
              stock: { 'O+': 14, 'A+': 8, 'B+': 7, 'AB+': 3, 'O-': 4, 'A-': 2, 'B-': 1, 'AB-': 1 },
              open24x7: true,
              phone: '+91 80 2670 9999',
              updatedAt: nowIso(),
            }),
          );
          await assertFails(
            updateDoc(doc(donorDb, 'banks', 'bank_ka_1'), {
              stock: { 'O+': 0, 'A+': 0, 'B+': 0, 'AB+': 0, 'O-': 0, 'A-': 0, 'B-': 0, 'AB-': 0 },
              updatedAt: nowIso(),
            }),
          );
          await assertFails(
            updateDoc(doc(bankOwnerDb, 'banks', 'bank_ka_1'), {
              verified: false,
              updatedAt: nowIso(),
            }),
          );
        },
      },
      {
        name: 'Bank application: owner submits pending (cannot self-approve); Admin approves',
        run: async () => {
          const ts = nowIso();
          await assertSucceeds(
            setDoc(doc(donor2Db, 'bankApplications', 'donor_2'), {
              uid: 'donor_2',
              facilityName: 'City Rotary Blood Centre',
              licenseNumber: 'KA/BLD/2026/099',
              eraktkoshId: 'ERK-KA-099',
              type: 'private',
              stateCode: 'KA',
              stateName: 'Karnataka',
              city: 'Mysuru',
              district: 'Mysuru',
              phone: '+91 821 242 0104',
              open24x7: true,
              lat: 12.29,
              lng: 76.63,
              status: 'pending',
              createdAt: ts,
              updatedAt: ts,
            }),
          );

          // Owner cannot self-approve
          await assertFails(
            updateDoc(doc(donor2Db, 'bankApplications', 'donor_2'), {
              status: 'approved',
              updatedAt: nowIso(),
            }),
          );

          // Admin lists and approves
          await assertSucceeds(getDocs(query(collection(adminDb, 'bankApplications'), limit(10))));
          await assertSucceeds(
            updateDoc(doc(adminDb, 'bankApplications', 'donor_2'), {
              status: 'approved',
              assignedBankId: 'bank_ver_donor_2',
              reviewedBy: 'admin_1',
              reviewedAt: nowIso(),
              reviewNotes: 'Approved by Platform Admin',
              updatedAt: nowIso(),
            }),
          );
        },
      },
      {
        name: 'Audit logs: Admin read + append allowed; update/delete strictly forbidden',
        run: async () => {
          const ts = nowIso();
          await assertSucceeds(
            setDoc(doc(adminDb, 'auditLogs', 'log_test_1'), {
              id: 'log_test_1',
              actorUid: 'admin_1',
              actorRole: 'admin',
              action: 'APPROVE_BANK',
              targetPath: 'banks/bank_ver_donor_2',
              summary: 'Approved City Rotary Blood Centre',
              createdAt: ts,
            }),
          );
          await assertSucceeds(getDocs(query(collection(adminDb, 'auditLogs'), where('actorRole', '==', 'admin'), limit(10))));
          await assertFails(getDocs(query(collection(donorDb, 'auditLogs'), limit(10))));
          await assertFails(updateDoc(doc(adminDb, 'auditLogs', 'log_test_1'), { summary: 'Tampered' }));
          await assertFails(deleteDoc(doc(adminDb, 'auditLogs', 'log_test_1')));
        },
      },
    ];

    let passed = 0;
    for (const t of tests) {
      await t.run();
      passed += 1;
      console.log(`  PASS - ${t.name}`);
    }
    console.log(`\nLifeDrop Firestore Emulator Rules Suite: ${passed}/${tests.length} passed`);
  } finally {
    if (testEnv) {
      await testEnv.cleanup();
    }
  }
}

async function main() {
  await runStaticContractAudit();

  if (process.env.FIRESTORE_EMULATOR_HOST) {
    await runEmulatorSuite();
  } else {
    console.log(
      '\nEmulator host (FIRESTORE_EMULATOR_HOST) not detected — static contract audit passed.\n' +
        'To execute live allow/deny emulator assertions (requires JDK 17+), run:\n' +
        '  npm run test:rules:emulator\n',
    );
  }
}

main().catch((err) => {
  console.error('Firestore rules verification failed:', err);
  process.exit(1);
});
