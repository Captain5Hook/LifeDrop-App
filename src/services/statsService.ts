import {
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { ALL_INDIA_CODE } from '../data/indiaLocations';
import {
  SEED_ALL_INDIA_STATE_STATS,
  SEED_DRIVES,
  SEED_GLOBAL_STATS,
  SEED_GOALS,
  SEED_STATE_STATS,
  type DonationDrive,
  type GlobalStats,
  type MissionGoal,
  type StateStats,
} from '../data/seedStats';
import { db, testConnection } from './firebase';
import type { StatsService } from './interfaces';

const ATTENDED_DRIVES_KEY = 'lifedrop_attended_drives_v1';

class FirestoreStatsService implements StatsService {
  subscribeGlobalStats(
    onData: (stats: GlobalStats) => void,
    onError: (err: Error) => void,
  ): () => void {
    void testConnection();
    // Emit seeded baseline immediately for zero-latency first paint (< 3s)
    onData(SEED_GLOBAL_STATS);

    const ref = doc(db, 'stats', 'global');
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<GlobalStats>;
          onData({
            ...SEED_GLOBAL_STATS,
            ...data,
          });
        } else {
          onData(SEED_GLOBAL_STATS);
        }
      },
      (error) => {
        // If offline or rules restrict unauthenticated reads before seed, keep demo fallback gracefully
        if (error.message.includes('offline') || error.code === 'unavailable') {
          onData(SEED_GLOBAL_STATS);
          return;
        }
        console.warn('Global stats listener fallback active:', error.message);
        onError(new Error(error.message));
      },
    );

    return unsubscribe;
  }

  subscribeStateStats(
    stateCode: string,
    onData: (stats: StateStats) => void,
    onError: (err: Error) => void,
  ): () => void {
    const isAllIndia = !stateCode || stateCode === ALL_INDIA_CODE;
    const fallback = isAllIndia
      ? SEED_ALL_INDIA_STATE_STATS
      : (SEED_STATE_STATS[stateCode] ?? SEED_STATE_STATS['KA']);

    onData(fallback);

    const docId = isAllIndia ? 'all_india' : `state_${stateCode}`;
    const ref = doc(db, 'stats', docId);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<StateStats>;
          onData({
            ...fallback,
            ...data,
          });
        } else {
          onData(fallback);
        }
      },
      (error) => {
        if (error.message.includes('offline') || error.code === 'unavailable') {
          onData(fallback);
          return;
        }
        console.warn('State stats listener fallback active:', error.message);
        onError(new Error(error.message));
      },
    );

    return unsubscribe;
  }

  subscribeGoals(
    onData: (goals: MissionGoal[]) => void,
    onError: (err: Error) => void,
  ): () => void {
    onData(SEED_GOALS);

    const q = query(collection(db, 'goals'), limit(8));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<MissionGoal, 'id'>),
          }));
          onData(list);
        } else {
          onData(SEED_GOALS);
        }
      },
      (error) => {
        if (error.message.includes('offline') || error.code === 'unavailable') {
          onData(SEED_GOALS);
          return;
        }
        console.warn('Goals listener fallback active:', error.message);
        onError(new Error(error.message));
      },
    );

    return unsubscribe;
  }

  subscribeDrives(
    stateCode: string,
    onData: (drives: DonationDrive[]) => void,
    onError: (err: Error) => void,
  ): () => void {
    const getSeededForState = () => {
      if (!stateCode || stateCode === ALL_INDIA_CODE) return SEED_DRIVES;
      const matching = SEED_DRIVES.filter((d) => d.stateCode === stateCode);
      return matching.length > 0 ? matching : SEED_DRIVES;
    };

    onData(getSeededForState());

    const baseCol = collection(db, 'drives');
    const q =
      stateCode && stateCode !== ALL_INDIA_CODE
        ? query(baseCol, where('stateCode', '==', stateCode), limit(10))
        : query(baseCol, limit(10));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<DonationDrive, 'id'>),
          }));
          onData(list);
        } else {
          onData(getSeededForState());
        }
      },
      (error) => {
        if (error.message.includes('offline') || error.code === 'unavailable') {
          onData(getSeededForState());
          return;
        }
        console.warn('Drives listener fallback active:', error.message);
        onError(new Error(error.message));
      },
    );

    return unsubscribe;
  }

  getAttendedDriveIds(): string[] {
    try {
      const raw = localStorage.getItem(ATTENDED_DRIVES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  toggleDriveAttendance(driveId: string): string[] {
    const current = this.getAttendedDriveIds();
    const exists = current.includes(driveId);
    const next = exists
      ? current.filter((id) => id !== driveId)
      : [...current, driveId];
    try {
      localStorage.setItem(ATTENDED_DRIVES_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage failure
    }
    return next;
  }
}

export const statsService: StatsService = new FirestoreStatsService();
