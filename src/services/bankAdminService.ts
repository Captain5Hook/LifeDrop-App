import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { INDIA_STATES_AND_UTS } from '../data/indiaLocations';
import { SEED_BANKS, type BloodBank } from '../data/seedBanks';
import { SEED_GLOBAL_STATS, type BloodGroup, type GlobalStats } from '../data/seedStats';
import { auth, db } from './firebase';

export type BankApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface BankApplication {
  uid: string;
  facilityName: string;
  licenseNumber: string;
  eraktkoshId: string;
  type: 'government' | 'private';
  stateCode: string;
  stateName: string;
  city: string;
  district: string;
  phone: string;
  open24x7: boolean;
  lat: number;
  lng: number;
  status: BankApplicationStatus;
  assignedBankId?: string | null;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorUid: string;
  actorRole: 'bank' | 'admin';
  action: string;
  targetPath: string;
  summary: string;
  createdAt: string;
}

export interface AdminKpiSummary {
  globalStats: GlobalStats;
  pendingApplications: number;
  approvedBanksCount: number;
  openSosCount: number;
  generatedAt: string;
}

const LOCAL_APPS_KEY = 'lifedrop_bank_apps_v1';
const LOCAL_LOGS_KEY = 'lifedrop_audit_logs_v1';
const LOCAL_MANAGED_BANKS_KEY = 'lifedrop_managed_banks_v1';

class BankAdminService {
  private loadLocalApps(): BankApplication[] {
    try {
      const raw = localStorage.getItem(LOCAL_APPS_KEY);
      return raw ? (JSON.parse(raw) as BankApplication[]) : [];
    } catch {
      return [];
    }
  }

  private saveLocalApps(apps: BankApplication[]): void {
    try {
      localStorage.setItem(LOCAL_APPS_KEY, JSON.stringify(apps));
    } catch {
      // Ignore storage error
    }
  }

  private loadLocalLogs(): AuditLogEntry[] {
    try {
      const raw = localStorage.getItem(LOCAL_LOGS_KEY);
      return raw ? (JSON.parse(raw) as AuditLogEntry[]) : [];
    } catch {
      return [];
    }
  }

  private appendLocalLog(entry: AuditLogEntry): void {
    try {
      const next = [entry, ...this.loadLocalLogs()].slice(0, 40);
      localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage error
    }
  }

  private loadLocalManagedBanks(): BloodBank[] {
    try {
      const raw = localStorage.getItem(LOCAL_MANAGED_BANKS_KEY);
      return raw ? (JSON.parse(raw) as BloodBank[]) : [];
    } catch {
      return [];
    }
  }

  private upsertLocalManagedBank(bank: BloodBank): void {
    try {
      const existing = this.loadLocalManagedBanks().filter((b) => b.id !== bank.id);
      localStorage.setItem(LOCAL_MANAGED_BANKS_KEY, JSON.stringify([bank, ...existing]));
    } catch {
      // Ignore storage error
    }
  }

  async submitBankApplication(params: {
    uid: string;
    facilityName: string;
    licenseNumber: string;
    eraktkoshId: string;
    type: 'government' | 'private';
    stateCode: string;
    city: string;
    district: string;
    phone: string;
    open24x7: boolean;
  }): Promise<BankApplication> {
    const now = new Date().toISOString();
    const stateObj =
      INDIA_STATES_AND_UTS.find((s) => s.code === params.stateCode) ??
      INDIA_STATES_AND_UTS[0];
    const cityObj = stateObj.cities.find(
      (c) => c.name.toLowerCase() === params.city.trim().toLowerCase(),
    );

    const appDoc: BankApplication = {
      uid: params.uid,
      facilityName: params.facilityName.trim().slice(0, 140),
      licenseNumber: params.licenseNumber.trim().slice(0, 64),
      eraktkoshId: params.eraktkoshId.trim().slice(0, 64),
      type: params.type,
      stateCode: stateObj.code,
      stateName: stateObj.name,
      city: params.city.trim().slice(0, 80) || stateObj.cities[0]?.name || stateObj.name,
      district: params.district.trim().slice(0, 80) || params.city.trim().slice(0, 80) || stateObj.name,
      phone: params.phone.trim().slice(0, 24),
      open24x7: params.open24x7,
      lat: cityObj?.lat ?? stateObj.center.lat,
      lng: cityObj?.lng ?? stateObj.center.lng,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    const others = this.loadLocalApps().filter((a) => a.uid !== params.uid);
    this.saveLocalApps([appDoc, ...others]);

    if (auth.currentUser && auth.currentUser.uid === params.uid) {
      try {
        const ref = doc(db, 'bankApplications', params.uid);
        const existingSnap = await getDoc(ref);
        if (existingSnap.exists()) {
          await updateDoc(ref, {
            facilityName: appDoc.facilityName,
            licenseNumber: appDoc.licenseNumber,
            eraktkoshId: appDoc.eraktkoshId,
            type: appDoc.type,
            stateCode: appDoc.stateCode,
            stateName: appDoc.stateName,
            city: appDoc.city,
            district: appDoc.district,
            phone: appDoc.phone,
            open24x7: appDoc.open24x7,
            lat: appDoc.lat,
            lng: appDoc.lng,
            status: 'pending',
            updatedAt: now,
          });
        } else {
          await setDoc(ref, appDoc);
        }
      } catch {
        // Saved locally when offline
      }
    }

    return appDoc;
  }

  async fetchMyBankApplication(uid: string): Promise<BankApplication | null> {
    const local = this.loadLocalApps().find((a) => a.uid === uid) ?? null;
    try {
      const snap = await getDoc(doc(db, 'bankApplications', uid));
      if (snap.exists()) {
        return snap.data() as BankApplication;
      }
    } catch {
      // Fallback to local cache
    }
    return local;
  }

  async fetchMyManagedBank(
    uid: string,
    isDevPreviewBank = false,
  ): Promise<BloodBank | null> {
    try {
      const q = query(
        collection(db, 'banks'),
        where('ownerUid', '==', uid),
        limit(1),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data() as BloodBank;
      }
    } catch {
      // Fallback to local/preview if offline
    }

    if (isDevPreviewBank) {
      const localPreview = this.loadLocalManagedBanks().find(
        (b) => b.ownerUid === uid || b.id === SEED_BANKS[0].id,
      );
      if (localPreview) {
        return localPreview;
      }
      return {
        ...SEED_BANKS[0],
        name: `${SEED_BANKS[0].name} (Preview Manager)`,
      };
    }

    const localOwned = this.loadLocalManagedBanks().find((b) => b.ownerUid === uid);
    return localOwned ?? null;
  }

  async updateBankStock(
    bank: BloodBank,
    actorUid: string,
    nextStock: Record<BloodGroup, number>,
    open24x7: boolean,
    phone: string,
  ): Promise<BloodBank> {
    const now = new Date().toISOString();
    const updated: BloodBank = {
      ...bank,
      stock: nextStock,
      open24x7,
      phone: phone.trim().slice(0, 24) || bank.phone,
      updatedAt: now,
    };

    this.upsertLocalManagedBank(updated);
    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const logEntry: AuditLogEntry = {
      id: logId,
      actorUid,
      actorRole: 'bank',
      action: 'STOCK_UPDATE',
      targetPath: `banks/${bank.id}`,
      summary: `Updated stock for ${bank.name} (${bank.stateCode}): O+ ${nextStock['O+']}u, O- ${nextStock['O-']}u`,
      createdAt: now,
    };
    this.appendLocalLog(logEntry);

    if (auth.currentUser && auth.currentUser.uid === actorUid) {
      try {
        await updateDoc(doc(db, 'banks', bank.id), {
          stock: nextStock,
          open24x7,
          phone: updated.phone,
          updatedAt: now,
        });
        await setDoc(doc(db, 'auditLogs', logId), logEntry);
      } catch {
        // Saved in local preview log
      }
    }

    return updated;
  }

  async adminListBankApplications(): Promise<BankApplication[]> {
    const local = this.loadLocalApps();
    try {
      const q = query(collection(db, 'bankApplications'), limit(30));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const remote = snap.docs.map((d) => d.data() as BankApplication);
        const ids = new Set(remote.map((r) => r.uid));
        return [...remote, ...local.filter((l) => !ids.has(l.uid))].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        );
      }
    } catch {
      // Fallback to local
    }
    return local;
  }

  async adminApproveApplication(
    appDoc: BankApplication,
    adminUid: string,
  ): Promise<BankApplication> {
    const now = new Date().toISOString();
    const bankId = `bank_ver_${appDoc.uid.slice(0, 12)}`;
    const newBank: BloodBank & {
      ownerUid: string;
      verified: boolean;
      licenseNumber: string;
    } = {
      id: bankId,
      name: appDoc.facilityName,
      stateCode: appDoc.stateCode,
      stateName: appDoc.stateName,
      city: appDoc.city,
      district: appDoc.district,
      lat: appDoc.lat,
      lng: appDoc.lng,
      type: appDoc.type,
      open24x7: appDoc.open24x7,
      phone: appDoc.phone,
      stock: {
        'O+': 10,
        'A+': 8,
        'B+': 10,
        'AB+': 4,
        'O-': 3,
        'A-': 2,
        'B-': 2,
        'AB-': 1,
      },
      ownerUid: appDoc.uid,
      verified: true,
      licenseNumber: appDoc.licenseNumber,
      updatedAt: now,
      isDemo: false,
    };

    const updatedApp: BankApplication = {
      ...appDoc,
      status: 'approved',
      assignedBankId: bankId,
      reviewedBy: adminUid,
      reviewedAt: now,
      reviewNotes: 'Approved by Platform Admin',
      updatedAt: now,
    };

    this.upsertLocalManagedBank(newBank);
    const others = this.loadLocalApps().filter((a) => a.uid !== appDoc.uid);
    this.saveLocalApps([updatedApp, ...others]);

    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const logEntry: AuditLogEntry = {
      id: logId,
      actorUid: adminUid,
      actorRole: 'admin',
      action: 'APPROVE_BANK',
      targetPath: `banks/${bankId}`,
      summary: `Approved ${appDoc.facilityName} (${appDoc.licenseNumber}, ${appDoc.stateCode})`,
      createdAt: now,
    };
    this.appendLocalLog(logEntry);

    if (auth.currentUser?.email === 'punithreddy9010@gmail.com') {
      const batch = writeBatch(db);
      batch.set(doc(db, 'banks', bankId), newBank);
      batch.set(doc(db, 'bankApplications', appDoc.uid), updatedApp);
      batch.set(doc(db, 'auditLogs', logId), logEntry);
      await batch.commit();
    }

    return updatedApp;
  }

  async adminRejectApplication(
    appDoc: BankApplication,
    adminUid: string,
    reason: string,
  ): Promise<BankApplication> {
    const now = new Date().toISOString();
    const updatedApp: BankApplication = {
      ...appDoc,
      status: 'rejected',
      reviewedBy: adminUid,
      reviewedAt: now,
      reviewNotes: reason.trim().slice(0, 240) || 'Verification documents incomplete',
      updatedAt: now,
    };

    const others = this.loadLocalApps().filter((a) => a.uid !== appDoc.uid);
    this.saveLocalApps([updatedApp, ...others]);

    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const logEntry: AuditLogEntry = {
      id: logId,
      actorUid: adminUid,
      actorRole: 'admin',
      action: 'REJECT_BANK',
      targetPath: `bankApplications/${appDoc.uid}`,
      summary: `Rejected ${appDoc.facilityName}: ${updatedApp.reviewNotes}`,
      createdAt: now,
    };
    this.appendLocalLog(logEntry);

    if (auth.currentUser?.email === 'punithreddy9010@gmail.com') {
      const batch = writeBatch(db);
      batch.set(doc(db, 'bankApplications', appDoc.uid), updatedApp);
      batch.set(doc(db, 'auditLogs', logId), logEntry);
      await batch.commit();
    }

    return updatedApp;
  }

  async adminFetchAuditLogs(): Promise<AuditLogEntry[]> {
    const local = this.loadLocalLogs();
    try {
      const q = query(
        collection(db, 'auditLogs'),
        orderBy('createdAt', 'desc'),
        limit(30),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as AuditLogEntry);
      }
    } catch {
      // Fallback to local
    }
    return local;
  }

  async adminComputeKpis(apps: BankApplication[]): Promise<AdminKpiSummary> {
    let globalStats = SEED_GLOBAL_STATS;
    let openSosCount = 0;

    try {
      const [gSnap, sosSnap] = await Promise.all([
        getDoc(doc(db, 'stats', 'global')),
        getDocs(
          query(
            collection(db, 'requests'),
            where('status', 'in', ['open', 'matched']),
            limit(30),
          ),
        ),
      ]);
      if (gSnap.exists()) {
        globalStats = gSnap.data() as GlobalStats;
      }
      openSosCount = sosSnap.size;
    } catch {
      // Fallback safely
    }

    return {
      globalStats,
      pendingApplications: apps.filter((a) => a.status === 'pending').length,
      approvedBanksCount: apps.filter((a) => a.status === 'approved').length,
      openSosCount,
      generatedAt: new Date().toISOString(),
    };
  }

  downloadKpisCsv(kpi: AdminKpiSummary, apps: BankApplication[]): void {
    const lines = [
      'Metric,Value',
      `Total Users,${kpi.globalStats.totalUsers}`,
      `Joined Today,${kpi.globalStats.joinedToday}`,
      `Active Donors (30d),${kpi.globalStats.activeDonorsMonth}`,
      `Requests Fulfilled,${kpi.globalStats.requestsFulfilled}`,
      `Banks Onboarded,${kpi.globalStats.banksOnboarded}`,
      `States Covered,${kpi.globalStats.statesCovered}`,
      `Pending Bank Applications,${kpi.pendingApplications}`,
      `Approved Applications,${kpi.approvedBanksCount}`,
      `Open SOS Requests,${kpi.openSosCount}`,
      `Exported At,${kpi.generatedAt}`,
      '',
      'Bank Applications,License,State,City,Status',
      ...apps.map(
        (a) =>
          `"${a.facilityName.replace(/"/g, '""')}","${a.licenseNumber}",${a.stateCode},"${a.city}",${a.status}`,
      ),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lifedrop-admin-kpis-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

export const bankAdminService = new BankAdminService();
