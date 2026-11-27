import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { INDIA_STATES_AND_UTS } from '../data/indiaLocations';
import { haversineKm } from '../data/indiaStatesGeo';
import type { BloodBank } from '../data/seedBanks';
import type { BloodGroup } from '../data/seedStats';
import { bankService } from './bankService';
import {
  getCompatibleDonorGroups,
  type BloodComponent,
} from './compatibilityService';
import { OperationType, handleFirestoreError } from './errors';
import { auth, db } from './firebase';

export type SosUrgency = 'critical' | 'urgent' | 'scheduled';
export type SosStatus =
  | 'open'
  | 'matched'
  | 'fulfilled'
  | 'cancelled'
  | 'expired';
export type EscalationStage = 1 | 2 | 3 | 4;

export interface SosRequest {
  id: string;
  requesterUid: string;
  requesterName: string;
  bloodGroup: BloodGroup;
  compatibleDonorGroups: BloodGroup[];
  component: BloodComponent;
  unitsNeeded: number;
  urgency: SosUrgency;
  hospitalName: string;
  stateCode: string;
  stateName: string;
  city: string;
  coarseLat: number;
  coarseLng: number;
  radiusKm: number;
  escalationStage: EscalationStage;
  status: SosStatus;
  acceptedByUid: string | null;
  acceptedByName: string | null;
  matchedCount: number;
  notes: string;
  isDemo?: boolean;
  purgedAt?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface SosPrivateContact {
  requesterUid: string;
  phone: string;
  updatedAt: string;
}

export interface SosResponseItem {
  donorUid: string;
  donorName: string;
  bloodGroup: BloodGroup;
  city: string;
  etaMinutes: number;
  status: 'pledged' | 'en_route' | 'arrived' | 'withdrawn';
  donorPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchedBankResult {
  bank: BloodBank;
  distanceKm: number;
  compatibleUnits: number;
  matchingGroups: { group: BloodGroup; units: number }[];
}

export const ESCALATION_RADII: Record<
  EscalationStage,
  { radiusKm: number; label: string; description: string }
> = {
  1: {
    radiusKm: 5,
    label: '5 km Local',
    description: 'Scanning immediate neighbourhood blood banks & donors',
  },
  2: {
    radiusKm: 15,
    label: '15 km City',
    description: 'Expanding across nearby city blood centres & volunteers',
  },
  3: {
    radiusKm: 50,
    label: '50 km District',
    description: 'District-wide compatible donor & bank escalation',
  },
  4: {
    radiusKm: 250,
    label: 'State-wide',
    description: 'All verified compatible banks across the state/UT',
  },
};

const LOCAL_SOS_KEY = 'lifedrop_sos_requests_v1';
export const SOS_PII_RETENTION_DAYS = 30;
export const SOS_PII_RETENTION_MS = SOS_PII_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function isSosExpired(
  req: Pick<SosRequest, 'status' | 'expiresAt'>,
  nowMs = Date.now(),
): boolean {
  if (req.status === 'expired') return true;
  if (req.status !== 'open' && req.status !== 'matched') return false;
  const expiresMs = Date.parse(req.expiresAt);
  return Number.isFinite(expiresMs) && nowMs > expiresMs;
}

class FirestoreSosService {
  private loadLocalRequests(): SosRequest[] {
    try {
      const raw = localStorage.getItem(LOCAL_SOS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as SosRequest[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveLocalRequests(items: SosRequest[]): void {
    try {
      localStorage.setItem(LOCAL_SOS_KEY, JSON.stringify(items.slice(0, 30)));
    } catch {
      // Ignore quota issues
    }
  }

  private upsertLocalRequest(req: SosRequest): SosRequest[] {
    const existing = this.loadLocalRequests().filter((r) => r.id !== req.id);
    const next = [req, ...existing].slice(0, 30);
    this.saveLocalRequests(next);
    return next;
  }

  private normalizeExpiredRequest(
    req: SosRequest,
    nowMs = Date.now(),
  ): SosRequest {
    if (!isSosExpired(req, nowMs) || req.status === 'expired') {
      return req;
    }
    const updatedAt = new Date(nowMs).toISOString();
    const expiredReq: SosRequest = {
      ...req,
      status: 'expired',
      updatedAt,
    };
    this.upsertLocalRequest(expiredReq);

    if (auth.currentUser && auth.currentUser.uid === req.requesterUid) {
      void updateDoc(doc(db, 'requests', req.id), {
        status: 'expired',
        updatedAt,
      }).catch(() => {
        // Saved locally; Firestore update retried on next sync
      });
    }

    return expiredReq;
  }

  async expireOverdueRequests(nowMs = Date.now()): Promise<SosRequest[]> {
    const local = this.loadLocalRequests();
    const normalized = local.map((r) => this.normalizeExpiredRequest(r, nowMs));
    this.saveLocalRequests(normalized);
    return normalized;
  }

  /**
   * DPDP Act 2023 data minimization: strips sensitive requester/donor phone numbers
   * and case notes from completed or expired SOS requests older than 30 days.
   */
  async purgeExpiredSosPii(nowMs = Date.now()): Promise<{
    purgedRequestIds: string[];
    purgedResponsesCount: number;
  }> {
    const nowIso = new Date(nowMs).toISOString();
    const byId = new Map<string, SosRequest>();
    for (const r of this.loadLocalRequests()) {
      byId.set(r.id, this.normalizeExpiredRequest(r, nowMs));
    }

    if (auth.currentUser) {
      try {
        const snap = await getDocs(
          query(
            collection(db, 'requests'),
            where('requesterUid', '==', auth.currentUser.uid),
            limit(30),
          ),
        );
        snap.docs.forEach((d) => {
          const data = d.data() as SosRequest;
          byId.set(data.id, this.normalizeExpiredRequest(data, nowMs));
        });
      } catch {
        // Offline or emulator fallback uses local cached requests
      }
    }

    const purgedRequestIds: string[] = [];
    let purgedResponsesCount = 0;

    for (const req of byId.values()) {
      if (req.purgedAt) continue;
      const effectiveStatus: SosStatus = isSosExpired(req, nowMs)
        ? 'expired'
        : req.status;
      if (
        effectiveStatus !== 'fulfilled' &&
        effectiveStatus !== 'cancelled' &&
        effectiveStatus !== 'expired'
      ) {
        continue;
      }

      const refMs = Date.parse(req.expiresAt || req.updatedAt || req.createdAt);
      if (!Number.isFinite(refMs) || nowMs - refMs < SOS_PII_RETENTION_MS) {
        continue;
      }

      const cleaned: SosRequest = {
        ...req,
        status: effectiveStatus,
        notes: '',
        purgedAt: nowIso,
        updatedAt: nowIso,
      };
      byId.set(req.id, cleaned);
      purgedRequestIds.push(req.id);

      if (auth.currentUser && auth.currentUser.uid === req.requesterUid) {
        try {
          await deleteDoc(doc(db, 'requests', req.id, 'private', 'contact')).catch(
            () => undefined,
          );
          const respSnap = await getDocs(
            collection(db, 'requests', req.id, 'responses'),
          );
          for (const respDoc of respSnap.docs) {
            const respData = respDoc.data() as SosResponseItem;
            if (respData.donorPhone) {
              await updateDoc(respDoc.ref, {
                donorPhone: '',
                updatedAt: nowIso,
              }).catch(() => undefined);
              purgedResponsesCount += 1;
            }
          }
          await updateDoc(doc(db, 'requests', req.id), {
            status: effectiveStatus,
            notes: '',
            purgedAt: nowIso,
            updatedAt: nowIso,
          }).catch(() => undefined);
        } catch {
          // Local minimization persisted regardless of network state
        }
      }
    }

    if (purgedRequestIds.length > 0) {
      const updatedList = Array.from(byId.values()).sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
      this.saveLocalRequests(updatedList);
    }

    return { purgedRequestIds, purgedResponsesCount };
  }

  async createSosRequest(params: {
    requesterUid: string;
    requesterName: string;
    bloodGroup: BloodGroup;
    component: BloodComponent;
    unitsNeeded: number;
    urgency: SosUrgency;
    hospitalName: string;
    stateCode: string;
    stateName: string;
    city: string;
    coarseLat: number;
    coarseLng: number;
    requesterPhone?: string;
    notes?: string;
  }): Promise<SosRequest> {
    const now = new Date();
    const nowIso = now.toISOString();
    const expiresIso = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const id = `sos_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const compatibleDonorGroups = getCompatibleDonorGroups(
      params.bloodGroup,
      params.component,
    );

    const requestDoc: SosRequest = {
      id,
      requesterUid: params.requesterUid,
      requesterName: params.requesterName.trim().slice(0, 80) || 'Patient Family',
      bloodGroup: params.bloodGroup,
      compatibleDonorGroups,
      component: params.component,
      unitsNeeded: Math.min(10, Math.max(1, params.unitsNeeded)),
      urgency: params.urgency,
      hospitalName: params.hospitalName.trim().slice(0, 120) || 'Nearby Hospital',
      stateCode: params.stateCode,
      stateName: params.stateName.slice(0, 80),
      city: params.city.trim().slice(0, 80),
      coarseLat: params.coarseLat,
      coarseLng: params.coarseLng,
      radiusKm: 5,
      escalationStage: 1,
      status: 'open',
      acceptedByUid: null,
      acceptedByName: null,
      matchedCount: 0,
      notes: (params.notes ?? '').trim().slice(0, 240),
      isDemo: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      expiresAt: expiresIso,
    };

    this.upsertLocalRequest(requestDoc);

    if (auth.currentUser && auth.currentUser.uid === params.requesterUid) {
      try {
        await setDoc(doc(db, 'requests', id), requestDoc);
        if (params.requesterPhone?.trim()) {
          const contact: SosPrivateContact = {
            requesterUid: params.requesterUid,
            phone: params.requesterPhone.trim().slice(0, 20),
            updatedAt: nowIso,
          };
          await setDoc(doc(db, 'requests', id, 'private', 'contact'), contact);
        }
      } catch (err) {
        if (navigator.onLine) {
          handleFirestoreError(err, OperationType.CREATE, `requests/${id}`);
        }
      }
    }

    return requestDoc;
  }

  subscribeStateRequests(
    stateCode: string,
    onData: (requests: SosRequest[], fromCache: boolean) => void,
    onError?: (err: Error) => void,
  ): () => void {
    const nowMs = Date.now();
    const localMatching = this.loadLocalRequests()
      .map((r) => this.normalizeExpiredRequest(r, nowMs))
      .filter(
        (r) =>
          r.status !== 'cancelled' &&
          !r.purgedAt &&
          (stateCode === 'ALL' || r.stateCode === stateCode),
      );
    if (localMatching.length > 0) {
      onData(localMatching, true);
    }

    const col = collection(db, 'requests');
    const q =
      stateCode === 'ALL'
        ? query(
            col,
            where('status', 'in', ['open', 'matched']),
            orderBy('createdAt', 'desc'),
            limit(20),
          )
        : query(
            col,
            where('stateCode', '==', stateCode),
            where('status', 'in', ['open', 'matched']),
            orderBy('createdAt', 'desc'),
            limit(20),
          );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const snapNowMs = Date.now();
        const remote = snap.docs
          .map((d) =>
            this.normalizeExpiredRequest(d.data() as SosRequest, snapNowMs),
          )
          .filter((r) => !r.purgedAt);
        // Merge any unsynced local requests so UI stays responsive
        const remoteIds = new Set(remote.map((r) => r.id));
        const merged = [
          ...remote,
          ...this.loadLocalRequests()
            .map((r) => this.normalizeExpiredRequest(r, snapNowMs))
            .filter(
              (r) =>
                !remoteIds.has(r.id) &&
                r.status !== 'cancelled' &&
                !r.purgedAt &&
                (stateCode === 'ALL' || r.stateCode === stateCode),
            ),
        ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        onData(merged, snap.metadata.fromCache);
      },
      (err) => {
        console.warn('SOS listener fallback to local cache:', err);
        onData(localMatching, true);
        if (onError) onError(err);
      },
    );

    return unsub;
  }

  subscribeRequestResponses(
    requestId: string,
    onData: (responses: SosResponseItem[]) => void,
  ): () => void {
    const col = collection(db, 'requests', requestId, 'responses');
    const q = query(col, limit(15));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as SosResponseItem)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        onData(list);
      },
      () => {
        onData([]);
      },
    );
  }

  async escalateRadius(req: SosRequest): Promise<SosRequest> {
    if (isSosExpired(req)) {
      return this.normalizeExpiredRequest(req);
    }
    if (req.escalationStage >= 4) return req;
    const nextStage = (req.escalationStage + 1) as EscalationStage;
    const nextRadius = ESCALATION_RADII[nextStage].radiusKm;
    const updated: SosRequest = {
      ...req,
      escalationStage: nextStage,
      radiusKm: nextRadius,
      updatedAt: new Date().toISOString(),
    };
    this.upsertLocalRequest(updated);

    if (auth.currentUser && auth.currentUser.uid === req.requesterUid) {
      try {
        await updateDoc(doc(db, 'requests', req.id), {
          escalationStage: nextStage,
          radiusKm: nextRadius,
          updatedAt: updated.updatedAt,
        });
      } catch {
        // Saved locally
      }
    }

    return updated;
  }

  async updateRequestStatus(
    req: SosRequest,
    nextStatus: SosStatus,
  ): Promise<SosRequest> {
    const updated: SosRequest = {
      ...req,
      status: nextStatus,
      acceptedByUid: nextStatus === 'open' ? null : req.acceptedByUid,
      acceptedByName: nextStatus === 'open' ? null : req.acceptedByName,
      updatedAt: new Date().toISOString(),
    };
    this.upsertLocalRequest(updated);

    if (auth.currentUser && auth.currentUser.uid === req.requesterUid) {
      try {
        await updateDoc(doc(db, 'requests', req.id), {
          status: nextStatus,
          acceptedByUid: updated.acceptedByUid,
          acceptedByName: updated.acceptedByName,
          updatedAt: updated.updatedAt,
        });
      } catch {
        // Saved locally
      }
    }

    return updated;
  }

  async respondToSos(
    req: SosRequest,
    donor: {
      uid: string;
      name: string;
      bloodGroup: BloodGroup;
      city: string;
      etaMinutes: number;
      donorPhone?: string;
    },
  ): Promise<SosRequest> {
    if (isSosExpired(req) || req.status !== 'open') {
      throw new Error('This SOS request has expired or is no longer open.');
    }
    const nowIso = new Date().toISOString();
    const responseDoc: SosResponseItem = {
      donorUid: donor.uid,
      donorName: donor.name.slice(0, 80),
      bloodGroup: donor.bloodGroup,
      city: donor.city.slice(0, 80),
      etaMinutes: donor.etaMinutes,
      status: 'en_route',
      donorPhone: donor.donorPhone?.trim().slice(0, 20) || '',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const updated: SosRequest = {
      ...req,
      status: 'matched',
      acceptedByUid: donor.uid,
      acceptedByName: donor.name.slice(0, 80),
      matchedCount: req.matchedCount + 1,
      updatedAt: nowIso,
    };
    this.upsertLocalRequest(updated);

    if (auth.currentUser && auth.currentUser.uid === donor.uid) {
      try {
        await setDoc(
          doc(db, 'requests', req.id, 'responses', donor.uid),
          responseDoc,
        );
        if (req.status === 'open') {
          await updateDoc(doc(db, 'requests', req.id), {
            status: 'matched',
            acceptedByUid: donor.uid,
            acceptedByName: updated.acceptedByName,
            matchedCount: updated.matchedCount,
            updatedAt: nowIso,
          });
        }
      } catch (err) {
        if (navigator.onLine) {
          handleFirestoreError(
            err,
            OperationType.WRITE,
            `requests/${req.id}/responses/${donor.uid}`,
          );
        }
      }
    }

    return updated;
  }

  async getPrivateRequesterContact(
    requestId: string,
    requestMeta?: Pick<SosRequest, 'status' | 'expiresAt' | 'purgedAt'>,
  ): Promise<SosPrivateContact | null> {
    if (
      requestMeta &&
      ((requestMeta.status !== 'open' && requestMeta.status !== 'matched') ||
        isSosExpired(requestMeta) ||
        Boolean(requestMeta.purgedAt))
    ) {
      return null;
    }
    try {
      const snap = await getDoc(
        doc(db, 'requests', requestId, 'private', 'contact'),
      );
      return snap.exists() ? (snap.data() as SosPrivateContact) : null;
    } catch {
      return null;
    }
  }

  /**
   * Client-side compatible blood bank matching within active escalation radius.
   * Uses state-scoped bank query (<= 20 reads) + Haversine distance (zero Cloud Functions).
   */
  async findCompatibleBanksNearby(params: {
    stateCode: string;
    lat: number;
    lng: number;
    recipientGroup: BloodGroup;
    component: BloodComponent;
    radiusKm: number;
    isOnline: boolean;
  }): Promise<{
    withinRadius: MatchedBankResult[];
    allStateMatches: MatchedBankResult[];
  }> {
    const compatibleGroups = getCompatibleDonorGroups(
      params.recipientGroup,
      params.component,
    );

    const page = await bankService.fetchStateBanksPage(
      params.stateCode,
      null,
      params.isOnline,
    );

    const ranked: MatchedBankResult[] = page.banks
      .map((bank) => {
        const matchingGroups = compatibleGroups
          .map((g) => ({ group: g, units: bank.stock[g] ?? 0 }))
          .filter((item) => item.units > 0);
        const compatibleUnits = matchingGroups.reduce(
          (sum, item) => sum + item.units,
          0,
        );
        const distanceKm = Math.round(
          haversineKm(params.lat, params.lng, bank.lat, bank.lng),
        );
        return {
          bank,
          distanceKm,
          compatibleUnits,
          matchingGroups,
        };
      })
      .filter((m) => m.compatibleUnits > 0)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const withinRadius = ranked.filter(
      (m) => params.radiusKm >= 250 || m.distanceKm <= params.radiusKm,
    );

    return {
      withinRadius,
      allStateMatches: ranked,
    };
  }

  getFallbackCoordsForState(stateCode: string, cityName?: string): {
    lat: number;
    lng: number;
    stateName: string;
  } {
    const st =
      INDIA_STATES_AND_UTS.find((s) => s.code === stateCode) ??
      INDIA_STATES_AND_UTS[0];
    if (cityName) {
      const city = st.cities.find(
        (c) => c.name.toLowerCase() === cityName.toLowerCase(),
      );
      if (city) {
        return { lat: city.lat, lng: city.lng, stateName: st.name };
      }
    }
    return { lat: st.center.lat, lng: st.center.lng, stateName: st.name };
  }
}

export const sosService = new FirestoreSosService();
