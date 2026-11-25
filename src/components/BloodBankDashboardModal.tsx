import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  FileBadge2,
  Minus,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { INDIA_STATES_AND_UTS } from '../data/indiaLocations';
import type { BloodBank } from '../data/seedBanks';
import { ORDERED_BLOOD_GROUPS, type BloodGroup } from '../data/seedStats';
import type { UserRole } from '../services/authService';
import {
  bankAdminService,
  type BankApplication,
} from '../services/bankAdminService';
import { sosService, type SosRequest } from '../services/sosService';

interface BloodBankDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userUid: string;
  userDisplayName: string;
  effectiveRole: UserRole | null;
  isDevPreviewBank: boolean;
  defaultStateCode: string;
  defaultCity: string;
  isOnline: boolean;
}

const DEFAULT_STOCK: Record<BloodGroup, number> = {
  'O+': 12,
  'A+': 9,
  'B+': 10,
  'AB+': 4,
  'O-': 3,
  'A-': 2,
  'B-': 2,
  'AB-': 1,
};

function getStockLevelBadge(units: number): {
  label: string;
  className: string;
} {
  if (units <= 1) {
    return {
      label: 'Critical',
      className: 'bg-[#F43F5E]/20 text-[#BE123C] dark:text-[#FDA4AF]',
    };
  }
  if (units <= 4) {
    return {
      label: 'Low',
      className: 'bg-[#FBBF24]/25 text-[#B45309] dark:text-[#FCD34D]',
    };
  }
  return {
    label: 'Stable',
    className: 'bg-[#34D399]/20 text-[#047857] dark:text-[#34D399]',
  };
}

export const BloodBankDashboardModal: React.FC<BloodBankDashboardModalProps> = ({
  isOpen,
  onClose,
  userUid,
  userDisplayName,
  effectiveRole,
  isDevPreviewBank,
  defaultStateCode,
  defaultCity,
  isOnline,
}) => {
  const [loading, setLoading] = useState(true);
  const [managedBank, setManagedBank] = useState<BloodBank | null>(null);
  const [application, setApplication] = useState<BankApplication | null>(null);
  const [viewMode, setViewMode] = useState<'stock' | 'onboarding'>('onboarding');

  // Stock editor state
  const [stockDraft, setStockDraft] =
    useState<Record<BloodGroup, number>>(DEFAULT_STOCK);
  const [bankOpen24x7, setBankOpen24x7] = useState(true);
  const [bankPhone, setBankPhone] = useState('');
  const [savingStock, setSavingStock] = useState(false);
  const [stockNotice, setStockNotice] = useState<string | null>(null);
  const [openSosList, setOpenSosList] = useState<SosRequest[]>([]);

  // License onboarding state
  const [facilityName, setFacilityName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [eraktkoshId, setEraktkoshId] = useState('');
  const [facilityType, setFacilityType] = useState<'government' | 'private'>(
    'government',
  );
  const [stateCode, setStateCode] = useState(
    defaultStateCode && defaultStateCode !== 'ALL' ? defaultStateCode : 'KA',
  );
  const [city, setCity] = useState(defaultCity || 'Bengaluru');
  const [district, setDistrict] = useState(defaultCity || 'Bengaluru Urban');
  const [phone, setPhone] = useState('+91 80 2222 0104');
  const [open24x7, setOpen24x7] = useState(true);
  const [submittingApp, setSubmittingApp] = useState(false);
  const [appNotice, setAppNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loadBankAndApplication = async () => {
    setLoading(true);
    try {
      const [bank, app] = await Promise.all([
        bankAdminService.fetchMyManagedBank(userUid, isDevPreviewBank),
        bankAdminService.fetchMyBankApplication(userUid),
      ]);
      setManagedBank(bank);
      setApplication(app);

      if (bank) {
        setStockDraft({ ...DEFAULT_STOCK, ...bank.stock });
        setBankOpen24x7(bank.open24x7);
        setBankPhone(bank.phone);
        setViewMode('stock');
      } else {
        setViewMode('onboarding');
      }

      if (app) {
        setFacilityName(app.facilityName);
        setLicenseNumber(app.licenseNumber);
        setEraktkoshId(app.eraktkoshId || '');
        setFacilityType(app.type);
        setStateCode(app.stateCode);
        setCity(app.city);
        setDistrict(app.district);
        setPhone(app.phone);
        setOpen24x7(app.open24x7);
      } else if (userDisplayName && !facilityName) {
        setFacilityName(`${userDisplayName} Blood Centre`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void loadBankAndApplication();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userUid, isDevPreviewBank]);

  useEffect(() => {
    if (!isOpen || !managedBank) return;
    const unsub = sosService.subscribeStateRequests(
      managedBank.stateCode,
      (reqs) => {
        setOpenSosList(reqs.slice(0, 5));
      },
    );
    return () => unsub();
  }, [isOpen, managedBank]);

  if (!isOpen) return null;

  const adjustUnits = (bg: BloodGroup, delta: number) => {
    setStockDraft((prev) => ({
      ...prev,
      [bg]: Math.max(0, Math.min(999, (prev[bg] ?? 0) + delta)),
    }));
  };

  const setExactUnits = (bg: BloodGroup, rawVal: string) => {
    const parsed = Number.parseInt(rawVal, 10);
    const clamped = Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(999, parsed));
    setStockDraft((prev) => ({ ...prev, [bg]: clamped }));
  };

  const handleSaveStock = async () => {
    if (!managedBank) return;
    setSavingStock(true);
    setStockNotice(null);
    try {
      const updated = await bankAdminService.updateBankStock(
        managedBank,
        userUid,
        stockDraft,
        bankOpen24x7,
        bankPhone,
      );
      setManagedBank(updated);
      setStockNotice(
        `Saved live stock at ${new Date(updated.updatedAt).toLocaleTimeString()} · Audit logged`,
      );
    } catch {
      setStockNotice('Saved locally. Will sync automatically when reconnected.');
    } finally {
      setSavingStock(false);
    }
  };

  const handleSubmitOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setAppNotice(null);

    if (facilityName.trim().length < 2) {
      setFormError('Enter your licensed blood centre name.');
      return;
    }
    if (licenseNumber.trim().length < 3) {
      setFormError('Enter a valid SBTC / Drug Controller License Number.');
      return;
    }
    if (phone.trim().length < 6) {
      setFormError('Enter an emergency helpline phone number.');
      return;
    }

    setSubmittingApp(true);
    try {
      const saved = await bankAdminService.submitBankApplication({
        uid: userUid,
        facilityName,
        licenseNumber,
        eraktkoshId,
        type: facilityType,
        stateCode,
        city,
        district,
        phone,
        open24x7,
      });
      setApplication(saved);
      setAppNotice(
        'Application submitted for Admin verification. Zero document uploads required.',
      );
    } catch {
      setFormError('Unable to submit application right now. Please retry.');
    } finally {
      setSubmittingApp(false);
    }
  };

  const selectedState =
    INDIA_STATES_AND_UTS.find((s) => s.code === stateCode) ??
    INDIA_STATES_AND_UTS[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Blood Bank Portal & Stock Manager"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#09061A]/80 p-0 backdrop-blur-sm min-[481px]:p-4"
    >
      <div className="ld-bg-sky relative flex h-[100dvh] w-full flex-col overflow-hidden text-slate-900 dark:text-white min-[481px]:h-[min(92dvh,860px)] min-[481px]:max-w-[430px] min-[481px]:rounded-[32px] min-[481px]:border min-[481px]:border-white/20 min-[481px]:shadow-2xl">
        {/* Sticky Header */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-black/10 px-4 py-3.5 pt-[max(0.9rem,env(safe-area-inset-top,0px))] dark:border-white/15">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5B3FE0] dark:text-[#C4B5FD]">
              {effectiveRole === 'bank'
                ? 'Blood Bank Operations'
                : 'Facility Onboarding'}
            </p>
            <h2 className="truncate text-[18px] font-semibold">
              Blood Bank Dashboard
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Blood Bank Dashboard"
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/70 dark:border-white/20 dark:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="ld-scroll-area flex-1 space-y-4 px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
          {!isOnline && (
            <div className="flex items-center gap-2 rounded-2xl border border-[#FBBF24]/50 bg-[#FBBF24]/15 px-3.5 py-2.5 text-[12px]">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#B45309] dark:text-[#FBBF24]" />
              <span>Offline mode: updates cache locally until connection returns.</span>
            </div>
          )}

          {managedBank && (
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-black/10 bg-white/50 p-1.5 dark:border-white/15 dark:bg-white/[0.06]">
              <button
                type="button"
                onClick={() => setViewMode('stock')}
                className={`min-h-[40px] rounded-xl text-[12px] font-semibold transition ${
                  viewMode === 'stock'
                    ? 'bg-[#5B3FE0] text-white shadow'
                    : 'text-slate-700 dark:text-white/75'
                }`}
              >
                Live Stock Editor
              </button>
              <button
                type="button"
                onClick={() => setViewMode('onboarding')}
                className={`min-h-[40px] rounded-xl text-[12px] font-semibold transition ${
                  viewMode === 'onboarding'
                    ? 'bg-[#5B3FE0] text-white shadow'
                    : 'text-slate-700 dark:text-white/75'
                }`}
              >
                License &amp; Profile
              </button>
            </div>
          )}

          {loading ? (
            <div className="ld-glass space-y-3 rounded-[26px] p-5">
              <div className="h-5 w-44 animate-pulse rounded-full bg-white/20" />
              <div className="h-24 w-full animate-pulse rounded-2xl bg-white/15" />
              <div className="h-11 w-full animate-pulse rounded-full bg-white/20" />
            </div>
          ) : viewMode === 'stock' && managedBank ? (
            <>
              {/* Verified Bank Header Card */}
              <section className="ld-glass rounded-[26px] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-[#34D399]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#047857] dark:text-[#34D399]">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      {isDevPreviewBank ? 'Preview Bank Manager' : 'Verified Bank Owner'}
                    </div>
                    <h3 className="mt-1.5 text-[17px] font-semibold leading-snug">
                      {managedBank.name}
                    </h3>
                    <p className="text-[12px] text-slate-700 dark:text-white/75">
                      {managedBank.city}, {managedBank.stateName} ·{' '}
                      <span className="capitalize">{managedBank.type}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadBankAndApplication()}
                    aria-label="Refresh stock"
                    className="flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/60 dark:border-white/15 dark:bg-white/10"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
                {managedBank.licenseNumber && (
                  <p className="mt-2 text-[11px] text-slate-600 dark:text-white/65">
                    License: <strong>{managedBank.licenseNumber}</strong>
                  </p>
                )}
              </section>

              {/* 8-Blood-Group Stock Editor */}
              <section className="ld-glass space-y-3 rounded-[26px] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[15px] font-semibold">
                      8 Blood Group Inventory (Units)
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-white/65">
                      Tap − / + or type exact unit count, then save live.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {ORDERED_BLOOD_GROUPS.map((bg) => {
                    const units = stockDraft[bg] ?? 0;
                    const badge = getStockLevelBadge(units);
                    return (
                      <div
                        key={bg}
                        className="rounded-2xl border border-black/10 bg-white/65 p-2.5 dark:border-white/15 dark:bg-white/[0.08]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[15px] font-bold text-[#5B3FE0] dark:text-[#C4B5FD]">
                            {bg}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-1">
                          <button
                            type="button"
                            aria-label={`Decrease ${bg} units`}
                            onClick={() => adjustUnits(bg, -1)}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/15 bg-white/80 text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                          >
                            <Minus className="h-4 w-4" />
                          </button>

                          <input
                            type="number"
                            min={0}
                            max={999}
                            aria-label={`${bg} units count`}
                            value={units}
                            onChange={(e) => setExactUnits(bg, e.target.value)}
                            className="h-10 w-14 rounded-xl border border-black/10 bg-white/90 text-center text-[15px] font-semibold text-slate-900 dark:border-white/15 dark:bg-black/30 dark:text-white"
                          />

                          <button
                            type="button"
                            aria-label={`Increase ${bg} units`}
                            onClick={() => adjustUnits(bg, 1)}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/15 bg-white/80 text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Operational Details */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-white/60 px-3.5 py-2.5 dark:border-white/15 dark:bg-white/[0.08]">
                    <span className="inline-flex items-center gap-2 text-[13px] font-medium">
                      <Clock className="h-4 w-4 text-[#34D399]" aria-hidden="true" />
                      Open 24x7 Emergency Counter
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={bankOpen24x7}
                      onClick={() => setBankOpen24x7((v) => !v)}
                      className={`min-h-[38px] min-w-[60px] rounded-full px-3 text-[12px] font-semibold ${
                        bankOpen24x7
                          ? 'bg-[#34D399] text-[#09291E]'
                          : 'bg-black/15 text-slate-800 dark:bg-white/15 dark:text-white'
                      }`}
                    >
                      {bankOpen24x7 ? '24x7' : 'Day'}
                    </button>
                  </div>

                  <label className="block space-y-1">
                    <span className="text-[11px] font-medium text-slate-700 dark:text-white/75">
                      Blood Bank Helpline Phone
                    </span>
                    <div className="relative">
                      <Phone
                        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-white/50"
                        aria-hidden="true"
                      />
                      <input
                        type="tel"
                        maxLength={24}
                        value={bankPhone}
                        onChange={(e) => setBankPhone(e.target.value)}
                        className="min-h-[44px] w-full rounded-xl border border-black/15 bg-white/80 pr-3 pl-9 text-[13px] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                      />
                    </div>
                  </label>
                </div>

                {stockNotice && (
                  <div
                    role="status"
                    className="flex items-start gap-2 rounded-2xl border border-[#34D399]/40 bg-[#34D399]/15 p-3 text-[12px]"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#059669] dark:text-[#34D399]" />
                    <span>{stockNotice}</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={savingStock}
                  onClick={() => void handleSaveStock()}
                  className="min-h-[48px] w-full rounded-full bg-[#34D399] px-5 text-[14px] font-semibold text-[#09291E] shadow-lg disabled:opacity-60"
                >
                  {savingStock ? 'Saving Live Stock...' : 'Save Live Stock'}
                </button>
              </section>

              {/* State Open SOS Requests Preview */}
              <section className="ld-glass space-y-2.5 rounded-[26px] p-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#F43F5E]" aria-hidden="true" />
                  <h4 className="text-[14px] font-semibold">
                    Active SOS Requests in {managedBank.stateCode} (
                    {openSosList.length})
                  </h4>
                </div>
                {openSosList.length === 0 ? (
                  <p className="text-[12px] text-slate-600 dark:text-white/65">
                    No active SOS alerts in {managedBank.stateName} right now.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {openSosList.map((req) => (
                      <li
                        key={req.id}
                        className="flex items-center justify-between gap-2 rounded-2xl border border-black/10 bg-white/60 px-3 py-2.5 text-[12px] dark:border-white/15 dark:bg-white/[0.06]"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {req.hospitalName} · {req.city}
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-white/65">
                            {req.component} · {req.unitsNeeded} unit(s) ·{' '}
                            {req.urgency.toUpperCase()}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-xl bg-[#F43F5E] px-2.5 py-1 text-[12px] font-bold text-white">
                          {req.bloodGroup}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : (
            /* License Onboarding View */
            <>
              {application && (
                <section
                  className={`rounded-[24px] border p-4 ${
                    application.status === 'approved'
                      ? 'border-[#34D399]/50 bg-[#34D399]/15'
                      : application.status === 'rejected'
                        ? 'border-[#F43F5E]/50 bg-[#F43F5E]/15'
                        : 'border-[#FBBF24]/50 bg-[#FBBF24]/15'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase">
                      <FileBadge2 className="h-4 w-4" aria-hidden="true" />
                      Application Status: {application.status}
                    </span>
                    <span className="text-[11px] opacity-80">
                      {application.updatedAt.slice(0, 10)}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] font-medium">
                    {application.facilityName} · Lic: {application.licenseNumber}
                  </p>
                  {application.reviewNotes && (
                    <p className="mt-1 text-[12px] opacity-90">
                      Review note: {application.reviewNotes}
                    </p>
                  )}
                </section>
              )}

              <section className="ld-glass rounded-[26px] p-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#5B3FE0]/25 text-[#5B3FE0] dark:text-[#C4B5FD]">
                    <Building2 className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-semibold">
                      Blood Bank License Onboarding
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-white/70">
                      Verified by LifeDrop Admin before stock publishing goes live (metadata only, no file upload).
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={(e) => void handleSubmitOnboarding(e)}
                  className="mt-4 space-y-3"
                >
                  <label className="block space-y-1">
                    <span className="text-[11px] font-medium">
                      Blood Centre / Hospital Name *
                    </span>
                    <input
                      type="text"
                      required
                      maxLength={140}
                      placeholder="e.g. Victoria Hospital Blood Centre"
                      value={facilityName}
                      onChange={(e) => setFacilityName(e.target.value)}
                      className="min-h-[44px] w-full rounded-xl border border-black/15 bg-white/80 px-3 text-[13px] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2.5">
                    <label className="block space-y-1">
                      <span className="text-[11px] font-medium">
                        SBTC / Drug License # *
                      </span>
                      <input
                        type="text"
                        required
                        maxLength={64}
                        placeholder="KA/BLD/2026/014"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        className="min-h-[44px] w-full rounded-xl border border-black/15 bg-white/80 px-3 text-[13px] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] font-medium">
                        e-RaktKosh ID (optional)
                      </span>
                      <input
                        type="text"
                        maxLength={64}
                        placeholder="ERK-KA-102"
                        value={eraktkoshId}
                        onChange={(e) => setEraktkoshId(e.target.value)}
                        className="min-h-[44px] w-full rounded-xl border border-black/15 bg-white/80 px-3 text-[13px] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                      />
                    </label>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-medium">Facility Type</span>
                    <div className="grid grid-cols-2 gap-2">
                      {(['government', 'private'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFacilityType(t)}
                          className={`min-h-[42px] rounded-xl text-[12px] font-semibold capitalize ${
                            facilityType === t
                              ? 'bg-[#5B3FE0] text-white'
                              : 'border border-black/15 bg-white/60 dark:border-white/15 dark:bg-white/10'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block space-y-1">
                    <span className="text-[11px] font-medium">State / UT *</span>
                    <select
                      value={stateCode}
                      onChange={(e) => {
                        const next = e.target.value;
                        setStateCode(next);
                        const obj = INDIA_STATES_AND_UTS.find(
                          (s) => s.code === next,
                        );
                        if (obj?.cities[0]) {
                          setCity(obj.cities[0].name);
                          setDistrict(obj.cities[0].name);
                        }
                      }}
                      className="min-h-[44px] w-full rounded-xl border border-black/15 bg-white/80 px-3 text-[13px] text-slate-900 dark:border-white/20 dark:bg-[#19143A] dark:text-white"
                    >
                      {INDIA_STATES_AND_UTS.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid grid-cols-2 gap-2.5">
                    <label className="block space-y-1">
                      <span className="text-[11px] font-medium">City *</span>
                      <input
                        type="text"
                        required
                        maxLength={80}
                        placeholder={selectedState.cities[0]?.name ?? 'City'}
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="min-h-[44px] w-full rounded-xl border border-black/15 bg-white/80 px-3 text-[13px] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] font-medium">District *</span>
                      <input
                        type="text"
                        required
                        maxLength={80}
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="min-h-[44px] w-full rounded-xl border border-black/15 bg-white/80 px-3 text-[13px] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                      />
                    </label>
                  </div>

                  <label className="block space-y-1">
                    <span className="text-[11px] font-medium">
                      24x7 Blood Bank Phone *
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={24}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="min-h-[44px] w-full rounded-xl border border-black/15 bg-white/80 px-3 text-[13px] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                    />
                  </label>

                  <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-white/60 px-3.5 py-2.5 dark:border-white/15 dark:bg-white/[0.08]">
                    <span className="text-[12px] font-medium">
                      Operates 24x7 Emergency Counter
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={open24x7}
                      onClick={() => setOpen24x7((v) => !v)}
                      className={`min-h-[38px] min-w-[56px] rounded-full px-3 text-[12px] font-semibold ${
                        open24x7
                          ? 'bg-[#34D399] text-[#09291E]'
                          : 'bg-black/15 text-slate-800 dark:bg-white/15 dark:text-white'
                      }`}
                    >
                      {open24x7 ? 'Yes' : 'No'}
                    </button>
                  </div>

                  {formError && (
                    <p className="rounded-xl bg-[#F43F5E]/15 px-3 py-2 text-[12px] font-medium text-[#BE123C] dark:text-[#FDA4AF]">
                      {formError}
                    </p>
                  )}

                  {appNotice && (
                    <div
                      role="status"
                      className="flex items-start gap-2 rounded-2xl border border-[#34D399]/40 bg-[#34D399]/15 p-3 text-[12px]"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#059669] dark:text-[#34D399]" />
                      <span>{appNotice}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submittingApp}
                    className="min-h-[48px] w-full rounded-full bg-[#5B3FE0] px-5 text-[14px] font-semibold text-white shadow-lg disabled:opacity-60"
                  >
                    {submittingApp
                      ? 'Submitting...'
                      : application
                        ? 'Update Onboarding Application'
                        : 'Submit for Admin Verification'}
                  </button>
                </form>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
