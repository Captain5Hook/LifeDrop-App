import { describe, expect, it } from 'vitest';
import { INDIA_STATES_AND_UTS, STATE_MAP } from '../data/indiaLocations';
import {
  INDIA_STATE_POLYGONS,
  haversineKm,
  resolveIndiaLocationOffline,
  roundCoarseCoordinate,
} from '../data/indiaStatesGeo';
import {
  ORDERED_BLOOD_GROUPS,
  SEED_ALL_INDIA_STATE_STATS,
  SEED_DRIVES,
  SEED_GLOBAL_STATS,
  SEED_GOALS,
  SEED_STATE_STATS,
} from '../data/seedStats';

describe('India Geography & Offline Geo Resolution', () => {
  it('contains all 28 Indian states and 8 union territories (36 total) with polygons', () => {
    const states = INDIA_STATES_AND_UTS.filter((r) => r.type === 'state');
    const uts = INDIA_STATES_AND_UTS.filter((r) => r.type === 'ut');

    expect(states).toHaveLength(28);
    expect(uts).toHaveLength(8);
    expect(INDIA_STATES_AND_UTS).toHaveLength(36);
    expect(STATE_MAP.size).toBe(36);

    const polygonCodes = new Set(INDIA_STATE_POLYGONS.map((p) => p.stateCode));
    for (const region of INDIA_STATES_AND_UTS) {
      expect(polygonCodes.has(region.code)).toBe(true);
      expect(region.cities.length).toBeGreaterThan(0);
    }
  });

  it('resolves 10 major Indian cities offline to their accurate state/UT and nearest city', () => {
    const testCities = [
      { lat: 12.9716, lng: 77.5946, expectedCode: 'KA', expectedCity: 'Bengaluru' },
      { lat: 19.076, lng: 72.8777, expectedCode: 'MH', expectedCity: 'Mumbai' },
      { lat: 13.0827, lng: 80.2707, expectedCode: 'TN', expectedCity: 'Chennai' },
      { lat: 22.5726, lng: 88.3639, expectedCode: 'WB', expectedCity: 'Kolkata' },
      { lat: 28.6139, lng: 77.209, expectedCode: 'DL', expectedCity: 'New Delhi' },
      { lat: 26.1445, lng: 91.7362, expectedCode: 'AS', expectedCity: 'Guwahati' },
      { lat: 34.0837, lng: 74.7973, expectedCode: 'JK', expectedCity: 'Srinagar' },
      { lat: 17.385, lng: 78.4867, expectedCode: 'TG', expectedCity: 'Hyderabad' },
      { lat: 9.9312, lng: 76.2673, expectedCode: 'KL', expectedCity: 'Kochi' },
      { lat: 26.9124, lng: 75.7873, expectedCode: 'RJ', expectedCity: 'Jaipur' },
    ];

    for (const sample of testCities) {
      const res = resolveIndiaLocationOffline(sample.lat, sample.lng);
      expect(res.inIndia).toBe(true);
      expect(res.state?.code).toBe(sample.expectedCode);
      expect(res.city).toBe(sample.expectedCity);
    }
  });

  it('rejects out-of-country coordinates (London, New York, Dhaka) as outside India', () => {
    const international = [
      { name: 'London', lat: 51.5072, lng: -0.1276 },
      { name: 'New York', lat: 40.7128, lng: -74.006 },
      { name: 'Dhaka', lat: 23.8103, lng: 90.4125 },
    ];

    for (const place of international) {
      const res = resolveIndiaLocationOffline(place.lat, place.lng);
      expect(res.inIndia, `${place.name} must resolve outside India`).toBe(false);
      expect(res.state).toBeNull();
      expect(res.city).toBeNull();
    }
  });

  it('rounds coarse coordinates to ~2 km precision (0.02 degree grid)', () => {
    const rawLat = 12.934567;
    const rawLng = 77.614321;
    const coarseLat = roundCoarseCoordinate(rawLat);
    const coarseLng = roundCoarseCoordinate(rawLng);

    expect(coarseLat).not.toBe(rawLat);
    expect(coarseLng).not.toBe(rawLng);
    expect(Math.abs(coarseLat - rawLat)).toBeLessThanOrEqual(0.01 + 1e-9);
    expect(Math.abs(coarseLng - rawLng)).toBeLessThanOrEqual(0.01 + 1e-9);

    const driftKm = haversineKm(rawLat, rawLng, coarseLat, coarseLng);
    expect(driftKm).toBeLessThanOrEqual(2.2);
  });
});

describe('Seeded Statistics Math Integrity', () => {
  it('ensures blood group share percentages sum to 100% and donor sums stay consistent', () => {
    const globalShareSum = SEED_ALL_INDIA_STATE_STATS.bloodGroups.reduce(
      (sum, bg) => sum + bg.sharePercent,
      0,
    );
    expect(globalShareSum).toBeCloseTo(100, 1);

    for (const region of INDIA_STATES_AND_UTS) {
      const stateStat = SEED_STATE_STATS[region.code];
      expect(stateStat).toBeDefined();
      expect(stateStat.isDemo).toBe(true);
      expect(stateStat.bloodGroups).toHaveLength(ORDERED_BLOOD_GROUPS.length);

      const shareSum = stateStat.bloodGroups.reduce((s, bg) => s + bg.sharePercent, 0);
      expect(shareSum).toBeCloseTo(100, 1);

      const userSum = stateStat.bloodGroups.reduce((s, bg) => s + bg.users, 0);
      // Small rounding delta allowed across 8 rounded buckets, but must stay close to state totalUsers
      expect(Math.abs(userSum - stateStat.totalUsers)).toBeLessThanOrEqual(10);
    }
  });

  it('matches SEED_GLOBAL_STATS totals across all 36 states/UTs and marks demo flags', () => {
    const allStates = Object.values(SEED_STATE_STATS);
    expect(allStates).toHaveLength(36);

    const sumUsers = allStates.reduce((acc, s) => acc + s.totalUsers, 0);
    const sumJoinedToday = allStates.reduce((acc, s) => acc + s.joinedToday, 0);
    const sumBanks = allStates.reduce((acc, s) => acc + s.banksCount, 0);

    expect(SEED_GLOBAL_STATS.isDemo).toBe(true);
    expect(SEED_ALL_INDIA_STATE_STATS.isDemo).toBe(true);
    expect(SEED_GLOBAL_STATS.statesCovered).toBe(36);
    expect(SEED_GLOBAL_STATS.totalUsers).toBe(sumUsers);
    expect(SEED_GLOBAL_STATS.joinedToday).toBe(sumJoinedToday);
    expect(SEED_GLOBAL_STATS.banksOnboarded).toBe(sumBanks);
    expect(SEED_ALL_INDIA_STATE_STATS.totalUsers).toBe(SEED_GLOBAL_STATS.totalUsers);
    expect(SEED_GOALS.length).toBeGreaterThanOrEqual(4);
    expect(SEED_DRIVES.length).toBeGreaterThanOrEqual(5);
  });
});
