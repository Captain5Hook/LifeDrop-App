import { useCallback, useEffect, useState } from 'react';
import {
  SEED_ALL_INDIA_STATE_STATS,
  SEED_DRIVES,
  SEED_GLOBAL_STATS,
  SEED_GOALS,
  type DonationDrive,
  type GlobalStats,
  type MissionGoal,
  type StateStats,
} from '../data/seedStats';
import { statsService } from '../services/statsService';

export function useHomeStats(stateCode: string) {
  const [globalStats, setGlobalStats] = useState<GlobalStats>(SEED_GLOBAL_STATS);
  const [stateStats, setStateStats] = useState<StateStats>(SEED_ALL_INDIA_STATE_STATS);
  const [goals, setGoals] = useState<MissionGoal[]>(SEED_GOALS);
  const [drives, setDrives] = useState<DonationDrive[]>(SEED_DRIVES);
  const [attendedDriveIds, setAttendedDriveIds] = useState<string[]>(() =>
    statsService.getAttendedDriveIds(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    let gotGlobal = false;
    let gotState = false;
    const checkDone = () => {
      if (gotGlobal && gotState) {
        setIsLoading(false);
      }
    };

    const unsubGlobal = statsService.subscribeGlobalStats(
      (data) => {
        setGlobalStats(data);
        gotGlobal = true;
        checkDone();
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      },
    );

    const unsubState = statsService.subscribeStateStats(
      stateCode,
      (data) => {
        setStateStats(data);
        gotState = true;
        checkDone();
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      },
    );

    const unsubGoals = statsService.subscribeGoals(
      (data) => setGoals(data),
      () => {},
    );

    const unsubDrives = statsService.subscribeDrives(
      stateCode,
      (data) => setDrives(data),
      () => {},
    );

    return () => {
      unsubGlobal();
      unsubState();
      unsubGoals();
      unsubDrives();
    };
  }, [stateCode, retryToken]);

  const toggleAttendDrive = useCallback((driveId: string) => {
    const next = statsService.toggleDriveAttendance(driveId);
    setAttendedDriveIds(next);
  }, []);

  const retry = useCallback(() => {
    setRetryToken((n) => n + 1);
  }, []);

  return {
    globalStats,
    stateStats,
    goals,
    drives,
    attendedDriveIds,
    isLoading,
    error,
    retry,
    toggleAttendDrive,
  };
}
