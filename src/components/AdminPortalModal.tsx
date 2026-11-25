import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Database,
  Download,
  RefreshCw,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import {
  bankAdminService,
  type AdminKpiSummary,
  type AuditLogEntry,
  type BankApplication,
} from '../services/bankAdminService';
import { bankService } from '../services/bankService';

interface AdminPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  userUid: string;
  userEmail: string | null;
  isRealAdmin: boolean;
  isOnline: boolean;
}

type AdminTab = 'kpis' | 'verifications' | 'audit';

export const AdminPortalModal: React.FC<AdminPortalModalProps> = ({
  isOpen,
  onClose,
  userUid,
  userEmail,
  isRealAdmin,
  isOnline,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('kpis');
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<BankApplication[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [kpi, setKpi] = useState<AdminKpiSummary | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAdminData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [loadedApps, loadedLogs] = await Promise.all([
        bankAdminService.adminListBankApplications(),
        bankAdminService.adminFetchAuditLogs(),
      ]);
      const computedKpi = await bankAdminService.adminComputeKpis(loadedApps);
      setApps(loadedApps);
      setLogs(loadedLogs);
      setKpi(computedKpi);
    } catch {
      setErrorMessage('Could not load all remote admin records; showing cached view.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void loadAdminData();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApprove = async (appDoc: BankApplication) => {
    setActionBusyId(appDoc.uid);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await bankAdminService.adminApproveApplication(appDoc, userUid);
      setStatusMessage(
        `Approved ${appDoc.facilityName} (${appDoc.stateCode}) and logged to audit trail.`,
      );
      await loadAdminData();
    } catch {
      setErrorMessage('Failed to approve bank application.');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleReject = async (appDoc: BankApplication) => {
    setActionBusyId(appDoc.uid);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const reason =
        rejectReasons[appDoc.uid] ?? 'SBTC license details require clarification';
      await bankAdminService.adminRejectApplication(appDoc, userUid, reason);
      setStatusMessage(`Marked ${appDoc.facilityName} as rejected.`);
      await loadAdminData();
    } catch {
      setErrorMessage('Failed to reject bank application.');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleSeedDemoBanks = async () => {
    setSeeding(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await bankService.seedDemoBanksAsAdmin();
      setStatusMessage(
        `Seeded ${res.banksWritten} demo blood banks and ${res.statsWritten} aggregated state/global stats docs.`,
      );
      await loadAdminData();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Only verified Platform Admin can seed Firestore.',
      );
    } finally {
      setSeeding(false);
    }
  };

  const pendingCount = apps.filter((a) => a.status === 'pending').length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="LifeDrop Admin Verification and KPI Panel"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#09061A]/80 p-0 backdrop-blur-sm min-[481px]:p-4"
    >
      <div className="ld-bg-sky relative flex h-[100dvh] w-full flex-col overflow-hidden text-slate-900 dark:text-white min-[481px]:h-[min(92dvh,860px)] min-[481px]:max-w-[430px] min-[481px]:rounded-[32px] min-[481px]:border min-[481px]:border-white/20 min-[481px]:shadow-2xl">
        {/* Sticky Header */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-black/10 px-4 py-3.5 pt-[max(0.9rem,env(safe-area-inset-top,0px))] dark:border-white/15">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#34D399]">
              {isRealAdmin
                ? `Verified Admin · ${userEmail ?? ''}`
                : 'Admin Preview Mode'}
            </p>
            <h2 className="truncate text-[18px] font-semibold">
              Admin Verification &amp; KPIs
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Admin Panel"
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/70 dark:border-white/20 dark:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Sub-navigation Tabs */}
        <div className="grid shrink-0 grid-cols-3 gap-1.5 border-b border-black/10 px-4 py-2.5 dark:border-white/15">
          <button
            type="button"
            onClick={() => setActiveTab('kpis')}
            className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl text-[12px] font-semibold ${
              activeTab === 'kpis'
                ? 'bg-[#5B3FE0] text-white'
                : 'bg-black/5 text-slate-700 dark:bg-white/10 dark:text-white/80'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
            KPIs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('verifications')}
            className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl text-[12px] font-semibold ${
              activeTab === 'verifications'
                ? 'bg-[#5B3FE0] text-white'
                : 'bg-black/5 text-slate-700 dark:bg-white/10 dark:text-white/80'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Verify ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl text-[12px] font-semibold ${
              activeTab === 'audit'
                ? 'bg-[#5B3FE0] text-white'
                : 'bg-black/5 text-slate-700 dark:bg-white/10 dark:text-white/80'
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
            Audit ({logs.length})
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="ld-scroll-area flex-1 space-y-4 px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
          {!isRealAdmin && (
            <div className="rounded-2xl border border-[#FBBF24]/50 bg-[#FBBF24]/15 px-3.5 py-2.5 text-[12px]">
              Preview override active: approvals, rejections &amp; audit logs save to local storage unless signed in with the verified Admin account.
            </div>
          )}

          {statusMessage && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-2xl border border-[#34D399]/40 bg-[#34D399]/15 p-3 text-[12px]"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#059669] dark:text-[#34D399]" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-2xl border border-[#F43F5E]/40 bg-[#F43F5E]/15 p-3 text-[12px] font-medium text-[#BE123C] dark:text-[#FDA4AF]">
              {errorMessage}
            </div>
          )}

          {loading ? (
            <div className="ld-glass space-y-3 rounded-[26px] p-5">
              <div className="h-5 w-36 animate-pulse rounded-full bg-white/20" />
              <div className="h-24 w-full animate-pulse rounded-2xl bg-white/15" />
            </div>
          ) : (
            <>
              {/* TAB 1: KPIs */}
              {activeTab === 'kpis' && kpi && (
                <>
                  <section className="grid grid-cols-2 gap-2.5">
                    {[
                      {
                        label: 'Total Users',
                        value: kpi.globalStats.totalUsers.toLocaleString('en-IN'),
                        accent: 'text-[#5B3FE0] dark:text-[#C4B5FD]',
                      },
                      {
                        label: 'Joined Today',
                        value: `+${kpi.globalStats.joinedToday.toLocaleString('en-IN')}`,
                        accent: 'text-[#059669] dark:text-[#34D399]',
                      },
                      {
                        label: 'Active Donors (30d)',
                        value: kpi.globalStats.activeDonorsMonth.toLocaleString('en-IN'),
                        accent: 'text-slate-900 dark:text-white',
                      },
                      {
                        label: 'Requests Fulfilled',
                        value: kpi.globalStats.requestsFulfilled.toLocaleString('en-IN'),
                        accent: 'text-[#059669] dark:text-[#34D399]',
                      },
                      {
                        label: 'Banks Onboarded',
                        value: kpi.globalStats.banksOnboarded.toLocaleString('en-IN'),
                        accent: 'text-slate-900 dark:text-white',
                      },
                      {
                        label: 'States / UTs Covered',
                        value: `${kpi.globalStats.statesCovered} / 36`,
                        accent: 'text-[#5B3FE0] dark:text-[#C4B5FD]',
                      },
                      {
                        label: 'Pending Verifications',
                        value: String(kpi.pendingApplications),
                        accent: 'text-[#B45309] dark:text-[#FBBF24]',
                      },
                      {
                        label: 'Open SOS Requests',
                        value: String(kpi.openSosCount),
                        accent: 'text-[#BE123C] dark:text-[#FDA4AF]',
                      },
                    ].map((card) => (
                      <div
                        key={card.label}
                        className="ld-glass rounded-2xl p-3.5"
                      >
                        <p className="text-[11px] font-medium text-slate-600 dark:text-white/70">
                          {card.label}
                        </p>
                        <p className={`mt-1 text-[22px] font-semibold ${card.accent}`}>
                          {card.value}
                        </p>
                      </div>
                    ))}
                  </section>

                  <section className="ld-glass space-y-2.5 rounded-[26px] p-4">
                    <button
                      type="button"
                      onClick={() => bankAdminService.downloadKpisCsv(kpi, apps)}
                      className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#34D399] px-5 text-[14px] font-semibold text-[#09291E]"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Export KPIs &amp; Applications (CSV)
                    </button>

                    <button
                      type="button"
                      disabled={seeding || !isOnline}
                      onClick={() => void handleSeedDemoBanks()}
                      className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full border border-black/15 bg-white/70 px-4 text-[13px] font-semibold disabled:opacity-50 dark:border-white/20 dark:bg-white/10"
                    >
                      <Database className="h-4 w-4 text-[#C4B5FD]" aria-hidden="true" />
                      {seeding
                        ? 'Seeding 135 Demo Banks...'
                        : 'Seed 135 Demo Banks (36 States/UTs)'}
                    </button>

                    <button
                      type="button"
                      onClick={() => void loadAdminData()}
                      className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-black/10 bg-white/50 px-4 text-[12px] font-medium dark:border-white/15 dark:bg-white/[0.06]"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      Refresh Admin Snapshot
                    </button>
                  </section>
                </>
              )}

              {/* TAB 2: Verifications */}
              {activeTab === 'verifications' && (
                <section className="space-y-3">
                  {apps.length === 0 ? (
                    <div className="ld-glass rounded-[26px] p-5 text-center">
                      <p className="text-[14px] font-medium">
                        No Blood Bank applications submitted yet
                      </p>
                      <p className="mt-1 text-[12px] text-slate-600 dark:text-white/70">
                        Applications submitted from Blood Bank Onboarding appear here for 1-tap verification.
                      </p>
                    </div>
                  ) : (
                    apps.map((appDoc) => {
                      const isBusy = actionBusyId === appDoc.uid;
                      return (
                        <article
                          key={appDoc.uid}
                          className="ld-glass space-y-2.5 rounded-[24px] p-4"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="text-[15px] font-semibold leading-snug">
                                {appDoc.facilityName}
                              </h3>
                              <p className="text-[12px] text-slate-700 dark:text-white/75">
                                {appDoc.city}, {appDoc.district}, {appDoc.stateCode} ·{' '}
                                <span className="capitalize">{appDoc.type}</span>
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                                appDoc.status === 'approved'
                                  ? 'bg-[#34D399]/20 text-[#059669] dark:text-[#34D399]'
                                  : appDoc.status === 'rejected'
                                    ? 'bg-[#F43F5E]/20 text-[#BE123C] dark:text-[#FDA4AF]'
                                    : 'bg-[#FBBF24]/25 text-[#B45309] dark:text-[#FCD34D]'
                              }`}
                            >
                              {appDoc.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-black/10 bg-white/50 p-2.5 text-[11px] dark:border-white/10 dark:bg-white/[0.06]">
                            <span>
                              License: <strong>{appDoc.licenseNumber}</strong>
                            </span>
                            <span>
                              Phone: <strong>{appDoc.phone}</strong>
                            </span>
                            <span>
                              e-RaktKosh:{' '}
                              <strong>{appDoc.eraktkoshId || 'Not provided'}</strong>
                            </span>
                            <span>
                              24x7: <strong>{appDoc.open24x7 ? 'Yes' : 'No'}</strong>
                            </span>
                          </div>

                          {appDoc.reviewNotes && (
                            <p className="text-[11px] text-slate-700 dark:text-white/75">
                              Note: {appDoc.reviewNotes}
                            </p>
                          )}

                          {appDoc.status !== 'approved' && (
                            <div className="space-y-2 pt-1">
                              <input
                                type="text"
                                maxLength={240}
                                placeholder="Optional rejection note..."
                                value={rejectReasons[appDoc.uid] ?? ''}
                                onChange={(e) =>
                                  setRejectReasons((prev) => ({
                                    ...prev,
                                    [appDoc.uid]: e.target.value,
                                  }))
                                }
                                className="min-h-[40px] w-full rounded-xl border border-black/15 bg-white/80 px-3 text-[12px] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => void handleApprove(appDoc)}
                                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-[#34D399] px-3 text-[12px] font-semibold text-[#09291E] disabled:opacity-60"
                                >
                                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                  Approve &amp; Publish
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => void handleReject(appDoc)}
                                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-[#F43F5E]/50 bg-[#F43F5E]/15 px-3 text-[12px] font-semibold text-[#BE123C] dark:text-[#FDA4AF] disabled:opacity-60"
                                >
                                  <XCircle className="h-4 w-4" aria-hidden="true" />
                                  Reject
                                </button>
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    })
                  )}
                </section>
              )}

              {/* TAB 3: Immutable Audit Logs */}
              {activeTab === 'audit' && (
                <section className="space-y-2.5">
                  {logs.length === 0 ? (
                    <div className="ld-glass rounded-[26px] p-5 text-center">
                      <p className="text-[14px] font-medium">
                        No audit events recorded yet
                      </p>
                      <p className="mt-1 text-[12px] text-slate-600 dark:text-white/70">
                        Stock updates and Admin bank approvals create immutable entries here.
                      </p>
                    </div>
                  ) : (
                    logs.map((entry) => (
                      <article
                        key={entry.id}
                        className="ld-glass rounded-2xl p-3.5 text-[12px]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              entry.actorRole === 'admin'
                                ? 'bg-[#5B3FE0]/25 text-[#5B3FE0] dark:text-[#C4B5FD]'
                                : 'bg-[#34D399]/20 text-[#059669] dark:text-[#34D399]'
                            }`}
                          >
                            {entry.actorRole} · {entry.action}
                          </span>
                          <span className="text-[10px] text-slate-600 dark:text-white/60">
                            {new Date(entry.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1.5 font-medium">{entry.summary}</p>
                        <p className="mt-0.5 text-[10px] text-slate-600 dark:text-white/60">
                          Target: {entry.targetPath}
                        </p>
                      </article>
                    ))
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
