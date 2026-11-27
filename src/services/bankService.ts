import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  writeBatch,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { INDIA_STATES_AND_UTS } from '../data/indiaLocations';
import { SEED_BANKS, type BloodBank } from '../data/seedBanks';
import {
  ORDERED_BLOOD_GROUPS,
  SEED_DRIVES,
  SEED_GLOBAL_STATS,
  SEED_GOALS,
  SEED_STATE_STATS,
  type BloodGroup,
  type StateStats,
} from '../data/seedStats';
import { auth, db } from './firebase';

export interface StateBanksPage {
  banks: BloodBank[];
  hasMore: boolean;
  cursor: QueryDocumentSnapshot | null;
  fromDemoSeed: boolean;
  fromOfflineCache: boolean;
}

export interface StateSummaryRow extends StateStats {}

const PAGE_SIZE = 20;

export function isBankStale(updatedAtIso: string): boolean {
  const ageMs = Date.now() - new Date(updatedAtIso).getTime();
  return ageMs > 24 * 60 * 60 * 1000;
}

class FirestoreBankService {
  /**
   * Loads ONLY the selected state's banks from Firestore, paginated (20/page).
   * Falls back cleanly to seeded demo banks for that state when Firestore is empty or offline.
   */
  async fetchStateBanksPage(
    stateCode: string,
    cursor: QueryDocumentSnapshot | null = null,
    isOnline = true,
  ): Promise<StateBanksPage> {
    const seedForState = SEED_BANKS.filter((b) => b.stateCode === stateCode).sort(
      (a, b) => a.name.localeCompare(b.name),
    );

    try {
      const baseCol = collection(db, 'banks');
      const q = cursor
        ? query(
            baseCol,
            where('stateCode', '==', stateCode),
            orderBy('name'),
            startAfter(cursor),
            limit(PAGE_SIZE),
          )
        : query(
            baseCol,
            where('stateCode', '==', stateCode),
            orderBy('name'),
            limit(PAGE_SIZE),
          );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const banks = snapshot.docs.map((d) => d.data() as BloodBank);
        const lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null;
        return {
          banks,
          hasMore: snapshot.docs.length === PAGE_SIZE,
          cursor: lastDoc,
          fromDemoSeed: banks.some((b) => b.isDemo),
          fromOfflineCache: snapshot.metadata.fromCache || !isOnline,
        };
      }
    } catch (err) {
      console.warn('Using local/offline banks for state:', stateCode, err);
    }

    // Fallback to local seeded banks for this state (paginated locally at 20/page)
    return {
      banks: cursor ? [] : seedForState.slice(0, PAGE_SIZE),
      hasMore: false,
      cursor: null,
      fromDemoSeed: true,
      fromOfflineCache: !isOnline,
    };
  }

  /**
   * Reads per-state bank counts and stock health from aggregated stats documents
   * (never by counting banks on the client).
   */
  async fetchAllIndiaStateSummaries(): Promise<{
    rows: StateSummaryRow[];
    isDemo: boolean;
    fromOfflineCache: boolean;
  }> {
    const fallbackRows = INDIA_STATES_AND_UTS.map((s) => SEED_STATE_STATS[s.code]);
    try {
      const q = query(
        collection(db, 'stats'),
        where('banksCount', '>=', 0),
        limit(40),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const byCode = new Map<string, StateStats>();
        snap.docs.forEach((d) => {
          const data = d.data() as StateStats;
          if (data.stateCode && data.stateCode !== 'ALL') {
            byCode.set(data.stateCode, data);
          }
        });
        if (byCode.size > 0) {
          const merged = INDIA_STATES_AND_UTS.map(
            (s) => byCode.get(s.code) ?? SEED_STATE_STATS[s.code],
          );
          return {
            rows: merged,
            isDemo: merged.some((r) => r.isDemo),
            fromOfflineCache: snap.metadata.fromCache,
          };
        }
      }
    } catch {
      // Fallback gracefully to bundled stats
    }

    return {
      rows: fallbackRows,
      isDemo: true,
      fromOfflineCache: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    };
  }

  /**
   * Admin-only batched seeder: writes ~135 demo banks across all 36 states/UTs
   * plus aggregated stats/state_{code} and stats/global documents within Spark quota.
   */
  async seedDemoBanksAsAdmin(): Promise<{ banksWritten: number; statsWritten: number }> {
    let user = auth.currentUser;
    if (!user) {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      user = cred.user;
    }

    if (!user?.emailVerified) {
      throw new Error(
        'Verified email sign-in is required to write demo seed data to Firestore.',
      );
    }

    const adminSnap = await getDoc(doc(db, 'admins', user.uid));
    if (!adminSnap.exists()) {
      throw new Error(
        'Only verified LifeDrop Admins (registered in /admins) can write demo seed data to Firestore.',
      );
    }

    // Group banks by state to keep stats/state_{code} in sync
    const countsByState = new Map<string, { total: number; critical: BloodGroup[] }>();
    for (const bank of SEED_BANKS) {
      const entry = countsByState.get(bank.stateCode) ?? {
        total: 0,
        critical: [],
      };
      entry.total += 1;
      for (const bg of ORDERED_BLOOD_GROUPS) {
        if ((bank.stock[bg] ?? 0) <= 1 && !entry.critical.includes(bg)) {
          entry.critical.push(bg);
        }
      }
      countsByState.set(bank.stateCode, entry);
    }

    // Chunk batched writes (<= 350 ops per batch, well under Firestore 500 limit)
    const operations: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

    for (const bank of SEED_BANKS) {
      operations.push((batch) => {
        batch.set(doc(db, 'banks', bank.id), bank);
      });
    }

    for (const st of INDIA_STATES_AND_UTS) {
      const base = SEED_STATE_STATS[st.code];
      const bankCount = countsByState.get(st.code)?.total ?? base.banksCount;
      operations.push((batch) => {
        batch.set(doc(db, 'stats', `state_${st.code}`), {
          ...base,
          banksCount: bankCount,
          updatedAt: new Date().toISOString(),
        });
      });
    }

    operations.push((batch) => {
      batch.set(doc(db, 'stats', 'global'), {
        ...SEED_GLOBAL_STATS,
        banksOnboarded: SEED_BANKS.length,
        updatedAt: new Date().toISOString(),
      });
    });

    for (const goal of SEED_GOALS) {
      operations.push((batch) => {
        batch.set(doc(db, 'goals', goal.id), goal);
      });
    }

    for (const drive of SEED_DRIVES) {
      operations.push((batch) => {
        batch.set(doc(db, 'drives', drive.id), drive);
      });
    }

    const CHUNK = 350;
    for (let i = 0; i < operations.length; i += CHUNK) {
      const batch = writeBatch(db);
      operations.slice(i, i + CHUNK).forEach((fn) => fn(batch));
      await batch.commit();
    }

    return {
      banksWritten: SEED_BANKS.length,
      statsWritten: INDIA_STATES_AND_UTS.length + 1,
    };
  }
}

export const bankService = new FirestoreBankService();
