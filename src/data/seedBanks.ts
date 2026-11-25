import { INDIA_STATES_AND_UTS } from './indiaLocations';
import { ORDERED_BLOOD_GROUPS, type BloodGroup } from './seedStats';

export interface BloodBank {
  id: string;
  name: string;
  stateCode: string;
  stateName: string;
  city: string;
  district: string;
  lat: number;
  lng: number;
  type: 'government' | 'private';
  open24x7: boolean;
  phone: string;
  stock: Record<BloodGroup, number>;
  ownerUid?: string | null;
  verified?: boolean;
  licenseNumber?: string;
  updatedAt: string;
  isDemo: boolean;
}

const MAJOR_STATE_COUNTS: Record<string, number> = {
  MH: 7,
  KA: 7,
  DL: 6,
  TN: 6,
  UP: 6,
  TG: 5,
  GJ: 5,
  WB: 5,
  KL: 4,
  RJ: 4,
  AP: 4,
  MP: 4,
};

const GOVT_PREFIXES = [
  'District Hospital Blood Centre',
  'Government Medical College Blood Bank',
  'State Civil Hospital Blood Bank',
  'Indian Red Cross Society Blood Bank',
];

const PRIVATE_PREFIXES = [
  'Sanjeevani Charitable Blood Centre',
  'Arogya Lifeline Blood Bank',
  'Sahyadri Voluntary Blood Centre',
  'Navjeevan Medical Blood Bank',
];

function buildBankStock(seedIndex: number, criticalSet: Set<BloodGroup>): Record<BloodGroup, number> {
  const stock = {} as Record<BloodGroup, number>;
  ORDERED_BLOOD_GROUPS.forEach((group, idx) => {
    const hash = (seedIndex * 17 + idx * 31) % 24;
    if (criticalSet.has(group) && hash % 3 !== 0) {
      stock[group] = hash % 2; // 0 or 1 unit
    } else if (group.endsWith('-')) {
      stock[group] = (hash % 6) + 1;
    } else {
      stock[group] = (hash % 18) + 4;
    }
  });
  return stock;
}

function generateSeedBanks(): BloodBank[] {
  const list: BloodBank[] = [];
  const nowMs = Date.now();
  let counter = 1;

  for (const state of INDIA_STATES_AND_UTS) {
    const count = MAJOR_STATE_COUNTS[state.code] ?? 3; // At least 3 per state/UT -> ~135 total
    const criticalSet = new Set<BloodGroup>(
      counter % 2 === 0 ? ['O-', 'B-'] : ['O-', 'AB-'],
    );

    for (let i = 0; i < count; i++) {
      const cityObj = state.cities[i % state.cities.length];
      const isGovt = i % 2 === 0;
      const prefix = isGovt
        ? GOVT_PREFIXES[i % GOVT_PREFIXES.length]
        : PRIVATE_PREFIXES[i % PRIVATE_PREFIXES.length];

      // Small deterministic offset around city coordinates (~1–6 km)
      const angle = ((counter * 73) % 360) * (Math.PI / 180);
      const radiusDeg = 0.012 + ((counter % 5) * 0.008);
      const lat = Number((cityObj.lat + Math.sin(angle) * radiusDeg).toFixed(4));
      const lng = Number((cityObj.lng + Math.cos(angle) * radiusDeg).toFixed(4));

      // ~18% older than 24h to demonstrate Stale badge & Stale data filter
      const hoursAgo =
        counter % 6 === 0 ? 28 + (counter % 24) : 1 + (counter % 14);
      const updatedAt = new Date(nowMs - hoursAgo * 3600 * 1000).toISOString();

      const phoneTail = String(100000 + ((counter * 7919) % 899999)).padStart(6, '0');

      list.push({
        id: `bank_${state.code.toLowerCase()}_${String(i + 1).padStart(2, '0')}`,
        name: `${cityObj.name} ${prefix}`,
        stateCode: state.code,
        stateName: state.name,
        city: cityObj.name,
        district: `${cityObj.name} District`,
        lat,
        lng,
        type: isGovt ? 'government' : 'private',
        open24x7: isGovt || i % 3 !== 1,
        phone: `+91-80${phoneTail}`,
        stock: buildBankStock(counter, criticalSet),
        updatedAt,
        isDemo: true,
      });

      counter++;
    }
  }

  return list;
}

export const SEED_BANKS: BloodBank[] = generateSeedBanks();
