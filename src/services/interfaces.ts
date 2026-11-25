import type {
  BloodGroup,
  DonationDrive,
  GlobalStats,
  MissionGoal,
  StateStats,
} from '../data/seedStats';

export type LocationOutcomeStatus =
  | 'granted'
  | 'denied'
  | 'dismissed'
  | 'unavailable'
  | 'timeout'
  | 'outside-india';

export type BrowserPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

export interface SavedLocation {
  stateCode: string;
  stateName: string;
  city: string;
  coarseLat?: number;
  coarseLng?: number;
  source: 'gps' | 'manual' | 'none';
  sharingEnabled: boolean;
  updatedAt: string;
}

export interface GeolocationAttemptResult {
  status: LocationOutcomeStatus;
  location: SavedLocation | null;
  message: string;
}

export interface LocationService {
  getSavedLocation(): SavedLocation | null;
  watchBrowserPermission(cb: (state: BrowserPermissionState) => void): () => void;
  requestCurrentLocation(timeoutMs?: number): Promise<GeolocationAttemptResult>;
  setManualLocation(stateCode: string, city: string): SavedLocation;
  turnOffSharing(): SavedLocation | null;
  deleteLocationData(): void;
}

export interface StatsService {
  subscribeGlobalStats(
    onData: (stats: GlobalStats) => void,
    onError: (err: Error) => void,
  ): () => void;
  subscribeStateStats(
    stateCode: string,
    onData: (stats: StateStats) => void,
    onError: (err: Error) => void,
  ): () => void;
  subscribeGoals(
    onData: (goals: MissionGoal[]) => void,
    onError: (err: Error) => void,
  ): () => void;
  subscribeDrives(
    stateCode: string,
    onData: (drives: DonationDrive[]) => void,
    onError: (err: Error) => void,
  ): () => void;
  getAttendedDriveIds(): string[];
  toggleDriveAttendance(driveId: string): string[];
}

// Forward-compatible service interfaces for M2–M6
export interface AuthService {
  getCurrentUserId(): string | null;
}

export interface StockService {
  filterByBloodGroup(stateCode: string, group: BloodGroup): Promise<unknown[]>;
}

export interface RequestService {
  getOpenCount(stateCode: string): Promise<number>;
}

export interface ChatService {
  askLocalKnowledge(query: string, lang: 'en' | 'hi' | 'kn'): string;
}
