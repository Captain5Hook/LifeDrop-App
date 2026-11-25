import { INDIA_STATES_AND_UTS } from './indiaLocations';

export type BloodGroup = 'O+' | 'A+' | 'B+' | 'AB+' | 'O-' | 'A-' | 'B-' | 'AB-';
export type StockHealth = 'stable' | 'low' | 'critical';

export interface BloodGroupStat {
  group: BloodGroup;
  users: number;
  sharePercent: number;
  unitsInStock: number;
  status: StockHealth;
  isMostCommon?: boolean;
}

export interface GlobalStats {
  totalUsers: number;
  joinedToday: number;
  activeDonorsMonth: number;
  requestsFulfilled: number;
  banksOnboarded: number;
  statesCovered: number;
  isDemo: boolean;
  updatedAt: string;
}

export interface StateStats {
  stateCode: string;
  stateName: string;
  totalUsers: number;
  joinedToday: number;
  banksCount: number;
  criticalGroups: BloodGroup[];
  stableGroups: BloodGroup[];
  bloodGroups: BloodGroupStat[];
  isDemo: boolean;
  updatedAt: string;
}

export interface MissionGoal {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  deadline: string;
}

export interface DonationDrive {
  id: string;
  title: string;
  dateLabel: string;
  place: string;
  city: string;
  stateCode: string;
  stateName: string;
  attendeesCount: number;
}

// Display order puts O+ and A+ first with "Most common" tag as required
export const ORDERED_BLOOD_GROUPS: BloodGroup[] = [
  'O+',
  'A+',
  'B+',
  'AB+',
  'O-',
  'A-',
  'B-',
  'AB-',
];

// Realistic India blood group distribution: O+ 36%, B+ 30%, A+ 21%, AB+ 7%, negatives ~6% combined
const GROUP_SHARES: Record<BloodGroup, number> = {
  'O+': 36.0,
  'A+': 21.0,
  'B+': 30.0,
  'AB+': 7.0,
  'O-': 2.2,
  'A-': 1.5,
  'B-': 1.7,
  'AB-': 0.6,
};

// Deterministic state weight distribution summing to ~48,240 demo users across all 36 states/UTs
const STATE_WEIGHTS: Record<string, { users: number; joinedToday: number; banks: number; critical: BloodGroup[] }> = {
  MH: { users: 6420, joinedToday: 38, banks: 14, critical: ['O-', 'AB-'] },
  KA: { users: 5840, joinedToday: 44, banks: 12, critical: ['O-', 'B-'] },
  DL: { users: 4320, joinedToday: 29, banks: 9, critical: ['O-', 'A-'] },
  TN: { users: 4180, joinedToday: 27, banks: 10, critical: ['B-', 'AB-'] },
  UP: { users: 3890, joinedToday: 24, banks: 8, critical: ['O-', 'B-'] },
  TG: { users: 3210, joinedToday: 22, banks: 7, critical: ['O-', 'A-'] },
  GJ: { users: 2940, joinedToday: 19, banks: 6, critical: ['B-', 'AB-'] },
  WB: { users: 2760, joinedToday: 16, banks: 6, critical: ['O-', 'B-'] },
  KL: { users: 2150, joinedToday: 14, banks: 5, critical: ['AB-', 'O-'] },
  RJ: { users: 1980, joinedToday: 12, banks: 5, critical: ['O-', 'B-'] },
  AP: { users: 1740, joinedToday: 11, banks: 4, critical: ['O-', 'AB-'] },
  MP: { users: 1460, joinedToday: 9, banks: 4, critical: ['B-', 'A-'] },
  HR: { users: 1240, joinedToday: 8, banks: 3, critical: ['O-', 'B-'] },
  PB: { users: 1120, joinedToday: 7, banks: 3, critical: ['O-', 'AB-'] },
  BR: { users: 980, joinedToday: 6, banks: 3, critical: ['O-', 'B-'] },
  OD: { users: 790, joinedToday: 5, banks: 3, critical: ['B-', 'AB-'] },
  AS: { users: 640, joinedToday: 4, banks: 3, critical: ['O-', 'A-'] },
  JH: { users: 520, joinedToday: 3, banks: 3, critical: ['O-', 'B-'] },
  CG: { users: 460, joinedToday: 3, banks: 3, critical: ['B-', 'AB-'] },
  UK: { users: 390, joinedToday: 3, banks: 3, critical: ['O-', 'A-'] },
  CH: { users: 290, joinedToday: 2, banks: 3, critical: ['O-', 'B-'] },
  GA: { users: 210, joinedToday: 2, banks: 3, critical: ['AB-', 'O-'] },
  JK: { users: 190, joinedToday: 2, banks: 3, critical: ['O-', 'B-'] },
  HP: { users: 170, joinedToday: 2, banks: 3, critical: ['O-', 'A-'] },
  PY: { users: 120, joinedToday: 1, banks: 3, critical: ['AB-', 'O-'] },
  TR: { users: 80, joinedToday: 1, banks: 3, critical: ['O-', 'B-'] },
  MN: { users: 65, joinedToday: 1, banks: 3, critical: ['O-', 'AB-'] },
  ML: { users: 60, joinedToday: 1, banks: 3, critical: ['B-', 'A-'] },
  NL: { users: 48, joinedToday: 1, banks: 3, critical: ['O-', 'B-'] },
  AR: { users: 42, joinedToday: 1, banks: 3, critical: ['O-', 'AB-'] },
  MZ: { users: 38, joinedToday: 1, banks: 3, critical: ['B-', 'O-'] },
  SK: { users: 34, joinedToday: 1, banks: 3, critical: ['O-', 'A-'] },
  DN: { users: 28, joinedToday: 1, banks: 3, critical: ['O-', 'AB-'] },
  AN: { users: 22, joinedToday: 0, banks: 3, critical: ['O-', 'B-'] },
  LA: { users: 14, joinedToday: 0, banks: 3, critical: ['O-', 'AB-'] },
  LD: { users: 9, joinedToday: 0, banks: 3, critical: ['O-', 'B-'] },
};

function buildBloodGroupStats(
  totalUsers: number,
  banksCount: number,
  criticalGroups: BloodGroup[],
): BloodGroupStat[] {
  return ORDERED_BLOOD_GROUPS.map((group) => {
    const sharePercent = GROUP_SHARES[group];
    const users = Math.max(1, Math.round((totalUsers * sharePercent) / 100));
    const isCritical = criticalGroups.includes(group);
    const isLow = !isCritical && (group === 'A-' || group === 'B-' || group === 'AB-');
    const baseUnits = Math.max(
      2,
      Math.round((banksCount * sharePercent * (isCritical ? 0.25 : isLow ? 0.55 : 1.15))),
    );
    const status: StockHealth = isCritical ? 'critical' : isLow ? 'low' : 'stable';

    return {
      group,
      users,
      sharePercent,
      unitsInStock: baseUnits,
      status,
      isMostCommon: group === 'O+' || group === 'A+',
    };
  });
}

const nowIso = new Date().toISOString();

export const SEED_STATE_STATS: Record<string, StateStats> = Object.fromEntries(
  INDIA_STATES_AND_UTS.map((state) => {
    const w = STATE_WEIGHTS[state.code] ?? {
      users: 100,
      joinedToday: 1,
      banks: 3,
      critical: ['O-', 'B-'] as BloodGroup[],
    };
    const bloodGroups = buildBloodGroupStats(w.users, w.banks, w.critical);
    const stableGroups = bloodGroups
      .filter((bg) => bg.status === 'stable')
      .map((bg) => bg.group)
      .slice(0, 3);

    return [
      state.code,
      {
        stateCode: state.code,
        stateName: state.name,
        totalUsers: w.users,
        joinedToday: w.joinedToday,
        banksCount: w.banks,
        criticalGroups: w.critical,
        stableGroups,
        bloodGroups,
        isDemo: true,
        updatedAt: nowIso,
      },
    ];
  }),
);

const totalDemoUsers = Object.values(SEED_STATE_STATS).reduce((acc, s) => acc + s.totalUsers, 0);
const totalDemoJoinedToday = Object.values(SEED_STATE_STATS).reduce((acc, s) => acc + s.joinedToday, 0);
const totalDemoBanks = Object.values(SEED_STATE_STATS).reduce((acc, s) => acc + s.banksCount, 0);

export const SEED_GLOBAL_STATS: GlobalStats = {
  totalUsers: totalDemoUsers,
  joinedToday: totalDemoJoinedToday,
  activeDonorsMonth: 11480,
  requestsFulfilled: 3842,
  banksOnboarded: totalDemoBanks,
  statesCovered: 36,
  isDemo: true,
  updatedAt: nowIso,
};

export const SEED_ALL_INDIA_STATE_STATS: StateStats = {
  stateCode: 'ALL',
  stateName: 'All India',
  totalUsers: totalDemoUsers,
  joinedToday: totalDemoJoinedToday,
  banksCount: totalDemoBanks,
  criticalGroups: ['O-', 'B-'],
  stableGroups: ['O+', 'A+', 'B+'],
  bloodGroups: buildBloodGroupStats(totalDemoUsers, totalDemoBanks, ['O-', 'B-']),
  isDemo: true,
  updatedAt: nowIso,
};

export const SEED_GOALS: MissionGoal[] = [
  {
    id: 'goal-donors-2027',
    title: '100,000 registered donors by Dec 2027',
    current: totalDemoUsers,
    target: 100000,
    unit: 'donors',
    deadline: 'Dec 2027',
  },
  {
    id: 'goal-banks-india',
    title: '500 verified blood banks across India',
    current: totalDemoBanks,
    target: 500,
    unit: 'banks',
    deadline: '2027',
  },
  {
    id: 'goal-sos-fulfilled',
    title: '10,000 emergency requests fulfilled',
    current: 3842,
    target: 10000,
    unit: 'requests',
    deadline: '2027',
  },
  {
    id: 'goal-states-covered',
    title: 'All 28 states and 8 UTs covered',
    current: 36,
    target: 36,
    unit: 'regions',
    deadline: 'Active',
  },
];

export const SEED_DRIVES: DonationDrive[] = [
  {
    id: 'drive-nhce-blr',
    title: 'NHCE Campus Blood Donation Camp',
    dateLabel: 'Sat, 28 Nov · 9:30 AM',
    place: 'New Horizon College of Engineering',
    city: 'Bengaluru',
    stateCode: 'KA',
    stateName: 'Karnataka',
    attendeesCount: 142,
  },
  {
    id: 'drive-kem-mum',
    title: 'Youth Red Cross Mega Drive',
    dateLabel: 'Sun, 29 Nov · 10:00 AM',
    place: 'KEM Hospital Blood Centre',
    city: 'Mumbai',
    stateCode: 'MH',
    stateName: 'Maharashtra',
    attendeesCount: 218,
  },
  {
    id: 'drive-aiims-del',
    title: 'Winter Voluntary Donor Rally',
    dateLabel: 'Wed, 2 Dec · 9:00 AM',
    place: 'AIIMS Main Blood Bank Hall',
    city: 'New Delhi',
    stateCode: 'DL',
    stateName: 'Delhi',
    attendeesCount: 186,
  },
  {
    id: 'drive-apollo-chn',
    title: 'Rare Blood Group Awareness Camp',
    dateLabel: 'Sat, 5 Dec · 8:30 AM',
    place: 'Egmore Government Blood Centre',
    city: 'Chennai',
    stateCode: 'TN',
    stateName: 'Tamil Nadu',
    attendeesCount: 115,
  },
  {
    id: 'drive-osmania-hyd',
    title: 'Tech Park Lifesavers Drive',
    dateLabel: 'Sun, 6 Dec · 10:00 AM',
    place: 'HITEC City Community Hall',
    city: 'Hyderabad',
    stateCode: 'TG',
    stateName: 'Telangana',
    attendeesCount: 164,
  },
  {
    id: 'drive-kgmu-lko',
    title: 'KGMU Voluntary Blood Camp',
    dateLabel: 'Tue, 8 Dec · 9:30 AM',
    place: 'King George Medical University',
    city: 'Lucknow',
    stateCode: 'UP',
    stateName: 'Uttar Pradesh',
    attendeesCount: 97,
  },
  {
    id: 'drive-sskm-kol',
    title: 'Kolkata Student Donor Conclave',
    dateLabel: 'Sat, 12 Dec · 10:00 AM',
    place: 'SSKM Central Blood Bank',
    city: 'Kolkata',
    stateCode: 'WB',
    stateName: 'West Bengal',
    attendeesCount: 129,
  },
  {
    id: 'drive-civil-ahm',
    title: 'Sabarmati Youth LifeDrop Camp',
    dateLabel: 'Sun, 13 Dec · 9:00 AM',
    place: 'Civil Hospital Blood Centre',
    city: 'Ahmedabad',
    stateCode: 'GJ',
    stateName: 'Gujarat',
    attendeesCount: 108,
  },
];
