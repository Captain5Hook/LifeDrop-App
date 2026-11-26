import { INDIA_STATES_AND_UTS, type IndiaState } from './indiaLocations';

/**
 * Simplified GeoJSON-style polygons ([lng, lat]) for all 28 states and 8 UTs of India
 * so state resolution works 100% offline with zero external geocoding API calls.
 */
interface StatePolygonFeature {
  stateCode: string;
  polygon: Array<[number, number]>; // [lng, lat]
}

export const INDIA_STATE_POLYGONS: StatePolygonFeature[] = [
  { stateCode: 'JK', polygon: [[73.3, 32.3], [75.8, 32.3], [76.5, 33.4], [75.9, 34.7], [73.6, 34.7], [73.3, 33.4]] },
  { stateCode: 'LA', polygon: [[75.9, 32.8], [79.5, 32.5], [79.8, 35.8], [75.8, 35.6]] },
  { stateCode: 'HP', polygon: [[75.6, 30.4], [79.0, 30.8], [78.6, 33.0], [75.8, 32.8]] },
  { stateCode: 'PB', polygon: [[73.8, 29.5], [76.6, 29.8], [76.4, 32.4], [74.5, 32.2]] },
  { stateCode: 'CH', polygon: [[76.68, 30.65], [76.86, 30.65], [76.86, 30.82], [76.68, 30.82]] },
  { stateCode: 'UK', polygon: [[77.5, 28.7], [81.0, 29.0], [80.8, 31.3], [77.8, 31.4]] },
  { stateCode: 'HR', polygon: [[74.4, 27.6], [77.6, 27.8], [77.5, 30.6], [75.2, 29.9]] },
  { stateCode: 'DL', polygon: [[76.83, 28.40], [77.35, 28.40], [77.35, 28.89], [76.83, 28.89]] },
  { stateCode: 'RJ', polygon: [[69.4, 23.0], [77.8, 23.8], [77.6, 28.3], [73.8, 30.1], [69.5, 27.2]] },
  { stateCode: 'UP', polygon: [[77.1, 23.8], [84.6, 24.1], [84.2, 27.8], [79.8, 29.4], [77.3, 30.2]] },
  { stateCode: 'BR', polygon: [[83.3, 24.3], [88.3, 24.5], [88.1, 27.5], [83.8, 27.4]] },
  { stateCode: 'SK', polygon: [[88.0, 27.0], [88.95, 27.1], [88.9, 28.15], [88.05, 28.1]] },
  { stateCode: 'AR', polygon: [[91.5, 26.8], [97.4, 27.0], [97.3, 29.5], [91.6, 28.2]] },
  { stateCode: 'AS', polygon: [[89.7, 24.1], [95.9, 25.8], [95.8, 27.9], [89.8, 26.8]] },
  { stateCode: 'NL', polygon: [[93.3, 25.1], [95.3, 25.3], [95.2, 27.1], [93.6, 26.9]] },
  { stateCode: 'MN', polygon: [[93.0, 23.8], [94.8, 23.9], [94.7, 25.7], [93.1, 25.5]] },
  { stateCode: 'MZ', polygon: [[92.2, 21.9], [93.5, 22.0], [93.4, 24.5], [92.3, 24.3]] },
  { stateCode: 'TR', polygon: [[91.1, 22.9], [92.4, 23.0], [92.3, 24.55], [91.2, 24.4]] },
  { stateCode: 'ML', polygon: [[89.8, 25.0], [92.8, 25.1], [92.7, 26.15], [89.9, 26.0]] },
  { stateCode: 'WB', polygon: [[85.8, 21.5], [89.8, 21.8], [89.6, 27.2], [87.8, 27.1], [86.0, 24.2]] },
  { stateCode: 'JH', polygon: [[83.3, 22.0], [87.8, 22.1], [87.7, 25.3], [83.5, 24.8]] },
  { stateCode: 'OD', polygon: [[81.3, 17.8], [87.4, 19.2], [87.2, 22.5], [83.2, 22.3], [81.4, 19.6]] },
  { stateCode: 'CG', polygon: [[80.2, 17.8], [84.3, 19.5], [83.9, 24.1], [80.8, 23.8], [80.3, 20.5]] },
  { stateCode: 'MP', polygon: [[74.0, 21.1], [82.8, 21.6], [82.6, 26.8], [76.5, 26.6], [74.2, 24.1]] },
  { stateCode: 'GJ', polygon: [[68.1, 20.1], [74.4, 20.3], [74.2, 24.7], [68.4, 24.3]] },
  { stateCode: 'DN', polygon: [[72.7, 20.0], [73.3, 20.0], [73.3, 20.5], [72.7, 20.5]] },
  { stateCode: 'MH', polygon: [[72.6, 15.6], [80.9, 18.8], [80.6, 22.0], [73.1, 21.6], [72.7, 19.0]] },
  { stateCode: 'TG', polygon: [[77.2, 15.8], [81.3, 16.9], [80.9, 19.9], [77.5, 19.7]] },
  { stateCode: 'AP', polygon: [[76.7, 12.6], [84.8, 17.8], [83.9, 19.2], [79.8, 17.4], [76.9, 15.9]] },
  { stateCode: 'GA', polygon: [[73.65, 14.88], [74.35, 14.88], [74.35, 15.82], [73.65, 15.82]] },
  { stateCode: 'KA', polygon: [[74.0, 11.6], [78.6, 12.6], [78.3, 18.4], [74.1, 17.9]] },
  { stateCode: 'KL', polygon: [[74.8, 8.2], [77.5, 8.3], [77.2, 12.8], [74.9, 12.6]] },
  { stateCode: 'TN', polygon: [[76.2, 8.05], [80.4, 10.2], [80.35, 13.6], [77.4, 13.3], [76.3, 11.4]] },
  { stateCode: 'PY', polygon: [[79.6, 10.8], [80.0, 10.8], [80.0, 12.1], [79.6, 12.1]] },
  { stateCode: 'LD', polygon: [[71.6, 8.0], [73.8, 8.0], [73.8, 12.4], [71.6, 12.4]] },
  { stateCode: 'AN', polygon: [[92.0, 6.6], [94.3, 6.6], [94.3, 13.8], [92.0, 13.8]] },
];

/** Standard ray-casting point-in-polygon check */
export function isPointInPolygon(
  lng: number,
  lat: number,
  polygon: Array<[number, number]>,
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Haversine distance in kilometers */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Coarse ~2 km rounding for user privacy */
export function roundCoarseCoordinate(value: number): number {
  return Math.round(value * 50) / 50;
}

/** Rough bounding check for India (mainland + Andaman/Nicobar + Lakshadweep) */
export function isWithinIndiaBounds(lat: number, lng: number): boolean {
  return lat >= 6.4 && lat <= 37.6 && lng >= 67.8 && lng <= 97.6;
}

export interface OfflineGeoResult {
  inIndia: boolean;
  state: IndiaState | null;
  city: string | null;
  coarseLat: number;
  coarseLng: number;
}

/**
 * Resolves coordinates completely offline to an Indian state/UT and nearest major city.
 * Checks city proximity inside matching state polygon(s) and falls back to nearest state center
 * if on a border/coast within India bounds.
 */
export function resolveIndiaLocationOffline(lat: number, lng: number): OfflineGeoResult {
  const coarseLat = roundCoarseCoordinate(lat);
  const coarseLng = roundCoarseCoordinate(lng);

  if (!isWithinIndiaBounds(lat, lng)) {
    return {
      inIndia: false,
      state: null,
      city: null,
      coarseLat,
      coarseLng,
    };
  }

  // Find all polygons containing this point (overlapping bounding polygons are resolved by nearest city)
  const matchingCodes = INDIA_STATE_POLYGONS.filter((feat) =>
    isPointInPolygon(lng, lat, feat.polygon),
  ).map((feat) => feat.stateCode);

  const candidateStates =
    matchingCodes.length > 0
      ? INDIA_STATES_AND_UTS.filter((s) => matchingCodes.includes(s.code))
      : INDIA_STATES_AND_UTS;

  // Pick the state whose nearest major city is closest to (lat, lng)
  let bestState: IndiaState = candidateStates[0];
  let bestCity = bestState.cities[0].name;
  let minDistance = Number.POSITIVE_INFINITY;

  for (const st of candidateStates) {
    for (const c of st.cities) {
      const dist = haversineKm(lat, lng, c.lat, c.lng);
      if (dist < minDistance) {
        minDistance = dist;
        bestState = st;
        bestCity = c.name;
      }
    }
  }

  // If not inside any state polygon and not within coastal/border margin (< 45 km from an Indian city)
  if (matchingCodes.length === 0 && minDistance > 45) {
    return {
      inIndia: false,
      state: null,
      city: null,
      coarseLat,
      coarseLng,
    };
  }

  return {
    inIndia: true,
    state: bestState,
    city: bestCity,
    coarseLat,
    coarseLng,
  };
}
