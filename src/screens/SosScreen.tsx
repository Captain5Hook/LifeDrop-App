import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  Droplets,
  HeartHandshake,
  LogIn,
  MapPin,
  Navigation,
  Phone,
  Radar,
  ShieldAlert,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react';
import { MEDICAL_REVIEW_CONFIG } from '../config/medicalReview';
import { INDIA_STATES_AND_UTS } from '../data/indiaLocations';
import { ORDERED_BLOOD_GROUPS, type BloodGroup } from '../data/seedStats';
import type { SavedLocation } from '../services/interfaces';
import type { UserProfileData } from '../services/profileService';
import {
  getCompatibilitySummary,
  getCompatibleDonorGroups,
  getCompatibleRecipientGroups,
  isDonorCompatible,
  type BloodComponent,
} from '../services/compatibilityService';
import {
  ESCALATION_RADII,
  isSosExpired,
  sosService,
  type MatchedBankResult,
  type SosPrivateContact,
  type SosRequest,
  type SosResponseItem,
  type SosUrgency,
} from '../services/sosService';

interface SosScreenProps {
  user: User | null;
  profile: UserProfileData | null;
  activeScopeCode: string;
  savedLocation: SavedLocation | null;
  isOnline: boolean;
  dataSaver: boolean;
  onOpenAuthOnboarding: () => void;
  onOpenBleedingEmergency: () => void;
  onOpenMapWithGroup: (group: BloodGroup) => void;
}

const COMPONENTS: BloodComponent[] = [
  'Whole Blood',
  'PRBC',
  'Platelets',
  'Plasma',
];

const URGENCY_OPTIONS: { id: SosUrgency; label: string; sub: string }[] = [
  { id: 'critical', label: 'Critical', sub: '< 2 hours' },
  { id: 'urgent', label: 'Urgent', sub: 'Today' },
  { id: 'scheduled', label: 'Scheduled', sub: '48+ hrs' },
];

const SosScreen: React.FC<SosScreenProps> = ({
  user,
  profile,
  activeScopeCode,
  savedLocation,
  isOnline,
  dataSaver,
  onOpenAuthOnboarding,
  onOpenBleedingEmergency,
  onOpenMapWithGroup,
}) => {
  const [subTab, setSubTab] = useState<'create' | 'live' | 'matrix'>('create');

  // 3-Tap SOS Creation State
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O+');
  const [component, setComponent] = useState<BloodComponent>('Whole Blood');
  const [urgency, setUrgency] = useState<SosUrgency>('critical');
  const [unitsNeeded, setUnitsNeeded] = useState<number>(2);
  const [hospitalName, setHospitalName] = useState<string>('');
  const [stateCode, setStateCode] = useState<string>(
    activeScopeCode !== 'ALL' ? activeScopeCode : 'KA',
  );
  const [city, setCity] = useState<string>(
    savedLocation?.city || profile?.city || 'Bengaluru',
  );
  const [requesterPhone, setRequesterPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Live Requests & Tracking State
  const [requests, setRequests] = useState<SosRequest[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [responses, setResponses] = useState<SosResponseItem[]>([]);
  const [revealedContact, setRevealedContact] =
    useState<SosPrivateContact | null>(null);
  const [matchedBanks, setMatchedBanks] = useState<{
    withinRadius: MatchedBankResult[];
    allStateMatches: MatchedBankResult[];
  }>({ withinRadius: [], allStateMatches: [] });
  const [banksLoading, setBanksLoading] = useState(false);
  const [escalationCountdown, setEscalationCountdown] = useState<number>(30);

  // Donor Respond State
  const [respondingToId, setRespondingToId] = useState<string | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number>(30);
  const [donorPhoneShare, setDonorPhoneShare] = useState<string>('');
  const [respondBusy, setRespondBusy] = useState(false);

  // Compatibility Matrix Explorer
  const [matrixGroup, setMatrixGroup] = useState<BloodGroup>('O-');
  const [matrixComponent, setMatrixComponent] =
    useState<BloodComponent>('Whole Blood');

  // Keep stateCode synced with user location if not customized
  useEffect(() => {
    if (activeScopeCode !== 'ALL') {
      setStateCode(activeScopeCode);
    }
    if (savedLocation?.city) {
      setCity(savedLocation.city);
    }
  }, [activeScopeCode, savedLocation]);

  // Subscribe to open/matched SOS requests in current state
  useEffect(() => {
    const scope = activeScopeCode || stateCode || 'KA';
    const unsub = sosService.subscribeStateRequests(
      scope,
      (list, cached) => {
        setRequests(list);
        setFromCache(cached);
        setSelectedRequestId((prev) => {
          if (prev && list.some((r) => r.id === prev)) return prev;
          return list[0]?.id ?? null;
        });
      },
      () => {
        setFromCache(true);
      },
    );
    return unsub;
  }, [activeScopeCode, stateCode]);

  const activeRequest = useMemo(
    () => requests.find((r) => r.id === selectedRequestId) ?? requests[0] ?? null,
    [requests, selectedRequestId],
  );

  // Auto-expire overdue SOS requests and purge 30+ day old PII on mount
  useEffect(() => {
    void sosService
      .expireOverdueRequests()
      .then(() => sosService.purgeExpiredSosPii());
  }, []);

  // Subscribe to responses & revealed contact when viewing active request
  useEffect(() => {
    if (!activeRequest || !user) {
      setResponses([]);
      setRevealedContact(null);
      return;
    }

    const unsub = sosService.subscribeRequestResponses(
      activeRequest.id,
      setResponses,
    );

    const canAccessContact =
      (activeRequest.status === 'open' || activeRequest.status === 'matched') &&
      !isSosExpired(activeRequest) &&
      !activeRequest.purgedAt &&
      (activeRequest.requesterUid === user.uid ||
        activeRequest.acceptedByUid === user.uid);

    if (canAccessContact) {
      void sosService
        .getPrivateRequesterContact(activeRequest.id, activeRequest)
        .then(setRevealedContact);
    } else {
      setRevealedContact(null);
    }

    return unsub;
  }, [activeRequest, user]);

  // Compute client-side compatible blood banks for either activeRequest or current form selection
  useEffect(() => {
    const targetGroup =
      subTab === 'live' && activeRequest ? activeRequest.bloodGroup : bloodGroup;
    const targetComponent =
      subTab === 'live' && activeRequest ? activeRequest.component : component;
    const targetState =
      subTab === 'live' && activeRequest ? activeRequest.stateCode : stateCode;
    const targetRadius =
      subTab === 'live' && activeRequest ? activeRequest.radiusKm : 25;
    const fallback = sosService.getFallbackCoordsForState(
      targetState,
      subTab === 'live' && activeRequest ? activeRequest.city : city,
    );
    const lat =
      subTab === 'live' && activeRequest
        ? activeRequest.coarseLat
        : savedLocation?.coarseLat ?? fallback.lat;
    const lng =
      subTab === 'live' && activeRequest
        ? activeRequest.coarseLng
        : savedLocation?.coarseLng ?? fallback.lng;

    let cancelled = false;
    setBanksLoading(true);
    void sosService
      .findCompatibleBanksNearby({
        stateCode: targetState,
        lat,
        lng,
        recipientGroup: targetGroup,
        component: targetComponent,
        radiusKm: targetRadius,
        isOnline,
      })
      .then((res) => {
        if (!cancelled) {
          setMatchedBanks(res);
          setBanksLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setBanksLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    subTab,
    activeRequest,
    bloodGroup,
    component,
    stateCode,
    city,
    savedLocation,
    isOnline,
  ]);

  // Client-side automatic radius escalation timer (zero Cloud Functions)
  useEffect(() => {
    if (
      subTab !== 'live' ||
      !activeRequest ||
      activeRequest.status !== 'open' ||
      activeRequest.escalationStage >= 4 ||
      !user ||
      activeRequest.requesterUid !== user.uid
    ) {
      return;
    }

    setEscalationCountdown(30);
    const interval = window.setInterval(() => {
      setEscalationCountdown((sec) => {
        if (sec <= 1) {
          void sosService.escalateRadius(activeRequest);
          return 30;
        }
        return sec - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [subTab, activeRequest, user]);

  const compatibleForSelection = useMemo(
    () => getCompatibleDonorGroups(bloodGroup, component),
    [bloodGroup, component],
  );

  const selectedStateMeta =
    INDIA_STATES_AND_UTS.find((s) => s.code === stateCode) ??
    INDIA_STATES_AND_UTS[0];

  const handleBroadcastSos = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!user) {
      onOpenAuthOnboarding();
      return;
    }
    if (!hospitalName.trim()) {
      setSubmitError('Please enter the hospital or emergency location name.');
      return;
    }

    setSubmitting(true);
    try {
      const coords = sosService.getFallbackCoordsForState(stateCode, city);
      const created = await sosService.createSosRequest({
        requesterUid: user.uid,
        requesterName:
          profile?.displayName || user.displayName || 'Patient Family',
        bloodGroup,
        component,
        unitsNeeded,
        urgency,
        hospitalName,
        stateCode,
        stateName: selectedStateMeta.name,
        city: city.trim() || selectedStateMeta.cities[0]?.name || selectedStateMeta.name,
        coarseLat: savedLocation?.coarseLat ?? coords.lat,
        coarseLng: savedLocation?.coarseLng ?? coords.lng,
        requesterPhone,
        notes,
      });

      setRequests((prev) => [
        created,
        ...prev.filter((item) => item.id !== created.id),
      ]);
      setSelectedRequestId(created.id);
      setSubTab('live');
      setHospitalName('');
      setNotes('');
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Unable to broadcast SOS.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespondSubmit = async (req: SosRequest) => {
    if (!user) {
      onOpenAuthOnboarding();
      return;
    }
    setRespondBusy(true);
    try {
      const updated = await sosService.respondToSos(req, {
        uid: user.uid,
        name: profile?.displayName || user.displayName || 'Voluntary Donor',
        bloodGroup: profile?.bloodGroup || 'O+',
        city: profile?.city || savedLocation?.city || req.city,
        etaMinutes,
        donorPhone: donorPhoneShare,
      });
      setRequests((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setRespondingToId(null);
      setDonorPhoneShare('');
      setSelectedRequestId(updated.id);
      setSubTab('live');
    } finally {
      setRespondBusy(false);
    }
  };

  return (
    <div className="ld-scroll-area flex-1 min-h-0 px-4 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-[calc(92px+env(safe-area-inset-bottom,0px))]">
      <div className="mx-auto w-full max-w-[400px] space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between pt-1">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#FDA4AF]">
              Emergency Matching Engine
            </p>
            <h1 className="text-[24px] font-light tracking-tight text-slate-900 dark:text-white">
              Emergency SOS
            </h1>
          </div>
          <button
            type="button"
            onClick={onOpenBleedingEmergency}
            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full bg-[#F43F5E] px-3.5 text-[12px] font-semibold text-white shadow-md"
          >
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            108 / First Aid
          </button>
        </header>

        {/* Sub-tab Switcher */}
        <div className="flex rounded-full border border-black/10 bg-white/60 p-1 dark:border-white/15 dark:bg-white/10">
          {(
            [
              { id: 'create', label: '3-Tap SOS' },
              {
                id: 'live',
                label: `Live (${requests.length})`,
              },
              { id: 'matrix', label: 'ABO/Rh Chart' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`min-h-[40px] flex-1 rounded-full text-[12px] font-semibold transition ${
                subTab === t.id
                  ? 'bg-[#5B3FE0] text-white shadow'
                  : 'text-slate-700 dark:text-white/80'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {subTab === 'create' && (
          <>
            <form
              onSubmit={(e) => void handleBroadcastSos(e)}
              className="ld-glass space-y-4 rounded-[28px] p-5 text-slate-900 dark:text-white"
            >
              {/* Step 1: Blood Group & Component */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold uppercase tracking-wider text-[#5B3FE0] dark:text-[#C4B5FD]">
                    1 · Patient Blood Group Needed
                  </span>
                  <span className="text-[11px] text-slate-600 dark:text-white/70">
                    Tap to match
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {ORDERED_BLOOD_GROUPS.map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => setBloodGroup(bg)}
                      className={`min-h-[44px] rounded-full border text-[13px] font-semibold transition ${
                        bloodGroup === bg
                          ? 'border-[#F43F5E] bg-[#F43F5E] text-white shadow-md'
                          : 'border-black/15 bg-white/70 text-slate-800 dark:border-white/20 dark:bg-white/10 dark:text-white'
                      }`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>

                {/* Instant ABO/Rh Compatibility Preview */}
                <div className="rounded-2xl border border-[#34D399]/35 bg-[#34D399]/10 p-3 text-[12px]">
                  <p className="font-semibold text-[#047857] dark:text-[#34D399]">
                    Compatible donor groups ({component}):{' '}
                    {compatibleForSelection.join(', ')}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-700 dark:text-white/75">
                    {getCompatibilitySummary(bloodGroup, component)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {COMPONENTS.map((comp) => (
                    <button
                      key={comp}
                      type="button"
                      onClick={() => setComponent(comp)}
                      className={`min-h-[38px] rounded-2xl border px-2 text-[11px] font-medium transition ${
                        component === comp
                          ? 'border-[#5B3FE0] bg-[#5B3FE0] text-white'
                          : 'border-black/10 bg-white/60 text-slate-700 dark:border-white/15 dark:bg-white/[0.08] dark:text-white/80'
                      }`}
                    >
                      {comp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Urgency & Units */}
              <div className="space-y-2 border-t border-black/10 pt-3 dark:border-white/10">
                <span className="block text-[12px] font-semibold uppercase tracking-wider text-[#5B3FE0] dark:text-[#C4B5FD]">
                  2 · Urgency &amp; Units
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {URGENCY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setUrgency(opt.id)}
                      className={`min-h-[48px] rounded-2xl border px-2 py-1.5 text-center transition ${
                        urgency === opt.id
                          ? opt.id === 'critical'
                            ? 'border-[#F43F5E] bg-[#F43F5E] text-white'
                            : 'border-[#5B3FE0] bg-[#5B3FE0] text-white'
                          : 'border-black/15 bg-white/60 text-slate-800 dark:border-white/15 dark:bg-white/[0.08] dark:text-white'
                      }`}
                    >
                      <p className="text-[12px] font-semibold">{opt.label}</p>
                      <p className="text-[10px] opacity-80">{opt.sub}</p>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-white/60 px-3.5 py-2 dark:border-white/15 dark:bg-white/[0.08]">
                  <span className="text-[13px] font-medium">Units required</span>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setUnitsNeeded(u)}
                        className={`h-9 w-9 rounded-full text-[13px] font-semibold ${
                          unitsNeeded === u
                            ? 'bg-[#5B3FE0] text-white'
                            : 'bg-black/10 text-slate-800 dark:bg-white/10 dark:text-white'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 3: Hospital, Location & Private Phone */}
              <div className="space-y-2.5 border-t border-black/10 pt-3 dark:border-white/10">
                <span className="block text-[12px] font-semibold uppercase tracking-wider text-[#5B3FE0] dark:text-[#C4B5FD]">
                  3 · Hospital &amp; Location
                </span>
                <label className="block space-y-1">
                  <span className="text-[11px] font-medium text-slate-700 dark:text-white/75">
                    Hospital / Emergency Ward
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    placeholder="e.g. Victoria Hospital Trauma Centre"
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    className="min-h-[44px] w-full rounded-2xl border border-black/15 bg-white/80 px-3.5 text-[14px] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1">
                    <span className="text-[11px] font-medium text-slate-700 dark:text-white/75">
                      State / UT
                    </span>
                    <select
                      value={stateCode}
                      onChange={(e) => {
                        const next = INDIA_STATES_AND_UTS.find(
                          (s) => s.code === e.target.value,
                        );
                        setStateCode(e.target.value);
                        if (next && next.cities[0]) {
                          setCity(next.cities[0].name);
                        }
                      }}
                      className="min-h-[44px] w-full rounded-2xl border border-black/15 bg-white/80 px-2.5 text-[13px] text-slate-900 dark:border-white/20 dark:bg-[#231C52] dark:text-white"
                    >
                      {INDIA_STATES_AND_UTS.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-medium text-slate-700 dark:text-white/75">
                      City
                    </span>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="min-h-[44px] w-full rounded-2xl border border-black/15 bg-white/80 px-3 text-[13px] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                    />
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="text-[11px] font-medium text-slate-700 dark:text-white/75">
                    Attendant Phone (Private · shown ONLY after donor accepts)
                  </span>
                  <input
                    type="tel"
                    maxLength={20}
                    placeholder="+91 98XXXXXXXX"
                    value={requesterPhone}
                    onChange={(e) => setRequesterPhone(e.target.value)}
                    className="min-h-[44px] w-full rounded-2xl border border-black/15 bg-white/80 px-3.5 text-[14px] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-[11px] font-medium text-slate-700 dark:text-white/75">
                    Ward / Case Note (Optional)
                  </span>
                  <input
                    type="text"
                    maxLength={240}
                    placeholder="e.g. Ward 3B, cross-match slip ready"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[44px] w-full rounded-2xl border border-black/15 bg-white/80 px-3.5 text-[13px] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                  />
                </label>
              </div>

              {submitError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-2xl border border-[#F43F5E]/40 bg-[#F43F5E]/15 p-3 text-[12px] text-[#BE123C] dark:text-[#FDA4AF]"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {user ? (
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full bg-[#F43F5E] px-5 text-[15px] font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:opacity-60"
                >
                  <Radar className="h-5 w-5" aria-hidden="true" />
                  {submitting
                    ? 'Broadcasting SOS...'
                    : `Broadcast ${bloodGroup} Emergency SOS (5 km)`}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuthOnboarding}
                  className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full bg-[#5B3FE0] px-5 text-[14px] font-semibold text-white shadow-lg"
                >
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Sign In to Broadcast SOS Request
                </button>
              )}
            </form>

            {/* Instant Compatible Blood Banks Preview (works even signed out or offline!) */}
            <section className="ld-glass space-y-3 rounded-[28px] p-5 text-slate-900 dark:text-white">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Building2
                    className="h-5 w-5 text-[#34D399]"
                    aria-hidden="true"
                  />
                  <h2 className="text-[15px] font-semibold">
                    Compatible Blood Banks in {selectedStateMeta.name}
                  </h2>
                  {matchedBanks.allStateMatches.some((m) => m.bank.isDemo) && (
                    <span className="rounded-full border border-black/15 bg-white/60 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:border-white/20 dark:bg-white/10 dark:text-white/85">
                      Demo data
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onOpenMapWithGroup(bloodGroup)}
                  className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-[#5B3FE0] dark:text-[#C4B5FD]"
                >
                  Map <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {banksLoading ? (
                <p className="text-[12px] text-slate-600 dark:text-white/70">
                  Scanning state blood banks...
                </p>
              ) : matchedBanks.allStateMatches.length === 0 ? (
                <p className="text-[12px] text-slate-600 dark:text-white/70">
                  No cached stock listed for {compatibleForSelection.join(', ')} in{' '}
                  {selectedStateMeta.name}. Try calling 104 / e-RaktKosh helpline or expanding to nearby states.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {matchedBanks.allStateMatches.slice(0, 4).map((m) => (
                    <li
                      key={m.bank.id}
                      className="rounded-2xl border border-black/10 bg-white/60 p-3 dark:border-white/15 dark:bg-white/[0.08]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold">
                            {m.bank.name}
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-white/70">
                            {m.bank.city} · ~{m.distanceKm} km ·{' '}
                            {m.compatibleUnits} compatible units
                          </p>
                        </div>
                        <a
                          href={`tel:${m.bank.phone}`}
                          className="inline-flex min-h-[38px] shrink-0 items-center gap-1 rounded-full bg-[#34D399] px-3 text-[12px] font-semibold text-[#09291E]"
                        >
                          <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                          Call
                        </a>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {m.matchingGroups.map((g) => (
                          <span
                            key={g.group}
                            className="rounded-full bg-[#5B3FE0]/20 px-2 py-0.5 text-[10px] font-semibold text-[#5B3FE0] dark:text-[#C4B5FD]"
                          >
                            {g.group}: {g.units}u
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        {subTab === 'live' && (
          <>
            {fromCache && (
              <div className="rounded-2xl border border-[#FBBF24]/40 bg-[#FBBF24]/15 px-3.5 py-2 text-[12px] text-slate-900 dark:text-white">
                Showing locally cached SOS requests{' '}
                {user
                  ? '(synced when online)'
                  : '(Sign in to sync live statewide SOS feeds)'}
              </div>
            )}

            {activeRequest ? (
              <section className="ld-glass space-y-4 rounded-[28px] p-5 text-slate-900 dark:text-white">
                {/* Active SOS Status & Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F43F5E] text-[18px] font-bold text-white shadow-md">
                      {activeRequest.bloodGroup}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            activeRequest.status === 'matched'
                              ? 'bg-[#34D399]/25 text-[#047857] dark:text-[#34D399]'
                              : activeRequest.status === 'fulfilled'
                                ? 'bg-[#5B3FE0]/25 text-[#5B3FE0] dark:text-[#C4B5FD]'
                                : activeRequest.status === 'expired'
                                  ? 'bg-slate-500/20 text-slate-700 dark:bg-white/15 dark:text-white/75'
                                  : 'bg-[#F43F5E]/25 text-[#BE123C] dark:text-[#FDA4AF]'
                          }`}
                        >
                          {activeRequest.status}
                        </span>
                        <span className="text-[11px] font-medium text-slate-600 dark:text-white/70">
                          {activeRequest.unitsNeeded}u · {activeRequest.component}
                        </span>
                      </div>
                      <h2 className="mt-0.5 text-[16px] font-semibold">
                        {activeRequest.hospitalName}
                      </h2>
                      <p className="text-[12px] text-slate-600 dark:text-white/75">
                        {activeRequest.city}, {activeRequest.stateName} · By{' '}
                        {activeRequest.requesterName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Client-Side 4-Stage Radius Escalation Radar */}
                <div className="rounded-2xl border border-black/10 bg-white/60 p-3.5 dark:border-white/15 dark:bg-white/[0.08]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Radar
                        className={`h-4 w-4 text-[#F43F5E] ${
                          !dataSaver && activeRequest.status === 'open'
                            ? 'animate-pulse'
                            : ''
                        }`}
                        aria-hidden="true"
                      />
                      <span className="text-[13px] font-semibold">
                        Active Radius: {ESCALATION_RADII[activeRequest.escalationStage].label}
                      </span>
                    </div>
                    {activeRequest.status === 'open' &&
                      activeRequest.escalationStage < 4 &&
                      user?.uid === activeRequest.requesterUid && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#B45309] dark:text-[#FCD34D]">
                          <Clock className="h-3 w-3" /> {escalationCountdown}s
                        </span>
                      )}
                  </div>

                  {/* 4 Stage Stepper */}
                  <div className="mt-2.5 grid grid-cols-4 gap-1.5">
                    {([1, 2, 3, 4] as const).map((stage) => (
                      <div key={stage} className="space-y-1">
                        <div
                          className={`h-2 rounded-full transition ${
                            stage <= activeRequest.escalationStage
                              ? 'bg-[#34D399]'
                              : 'bg-black/15 dark:bg-white/15'
                          }`}
                        />
                        <p className="text-center text-[10px] text-slate-600 dark:text-white/70">
                          {stage === 4
                            ? 'State'
                            : `${ESCALATION_RADII[stage].radiusKm}km`}
                        </p>
                      </div>
                    ))}
                  </div>

                  <p className="mt-2 text-[11px] text-slate-600 dark:text-white/75">
                    {ESCALATION_RADII[activeRequest.escalationStage].description}
                  </p>

                  {user?.uid === activeRequest.requesterUid &&
                    activeRequest.status === 'open' &&
                    activeRequest.escalationStage < 4 && (
                      <button
                        type="button"
                        onClick={() => {
                          void sosService
                            .escalateRadius(activeRequest)
                            .then((updated) =>
                              setRequests((prev) =>
                                prev.map((r) =>
                                  r.id === updated.id ? updated : r,
                                ),
                              ),
                            );
                        }}
                        className="mt-2.5 min-h-[40px] w-full rounded-full bg-[#5B3FE0] text-[12px] font-semibold text-white"
                      >
                        Escalate Radius Now (→{' '}
                        {
                          ESCALATION_RADII[
                            (activeRequest.escalationStage + 1) as 1 | 2 | 3 | 4
                          ].label
                        }
                        )
                      </button>
                    )}
                </div>

                {/* Matched Donor / Contact Handshake Panel */}
                {activeRequest.status === 'matched' && (
                  <div className="rounded-2xl border border-[#34D399]/50 bg-[#34D399]/15 p-3.5">
                    <div className="flex items-center gap-2 font-semibold text-[#047857] dark:text-[#34D399]">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      <span className="text-[13px]">
                        Donor Matched: {activeRequest.acceptedByName}
                      </span>
                    </div>
                    {revealedContact?.phone ? (
                      <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-white/70 px-3 py-2 text-[12px] text-slate-900 dark:bg-black/25 dark:text-white">
                        <span>Private Attendant Phone Unlocked</span>
                        <a
                          href={`tel:${revealedContact.phone}`}
                          className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-[#34D399] px-3 font-semibold text-[#09291E]"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {revealedContact.phone}
                        </a>
                      </div>
                    ) : (
                      <p className="mt-1 text-[11px] text-slate-700 dark:text-white/80">
                        Coordinate at {activeRequest.hospitalName}. Private phone is shown only to the matched donor and requester.
                      </p>
                    )}
                  </div>
                )}

                {/* Live Donor Responses List */}
                {responses.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[12px] font-semibold text-slate-700 dark:text-white/80">
                      Donor Pledges ({responses.length})
                    </p>
                    {responses.map((resp) => (
                      <div
                        key={resp.donorUid}
                        className="flex items-center justify-between rounded-2xl border border-black/10 bg-white/55 px-3 py-2 text-[12px] dark:border-white/10 dark:bg-white/[0.06]"
                      >
                        <div>
                          <p className="font-semibold">
                            {resp.donorName} ({resp.bloodGroup})
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-white/65">
                            {resp.city} · ETA ~{resp.etaMinutes} min · {resp.status}
                          </p>
                        </div>
                        {resp.donorPhone &&
                          (activeRequest.status === 'open' ||
                            activeRequest.status === 'matched') &&
                          !isSosExpired(activeRequest) &&
                          !activeRequest.purgedAt && (
                            <a
                              href={`tel:${resp.donorPhone}`}
                              className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-[#5B3FE0] px-3 text-[11px] font-semibold text-white"
                            >
                              <Phone className="h-3 w-3" /> Call
                            </a>
                          )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Compatible Blood Banks within Active Radius */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold text-slate-700 dark:text-white/80">
                      Compatible Blood Banks within{' '}
                      {activeRequest.radiusKm >= 250
                        ? 'State'
                        : `${activeRequest.radiusKm} km`}{' '}
                      ({matchedBanks.withinRadius.length})
                    </p>
                    {matchedBanks.withinRadius.some((m) => m.bank.isDemo) && (
                      <span className="rounded-full border border-black/15 bg-white/60 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:border-white/20 dark:bg-white/10 dark:text-white/85">
                        Demo data
                      </span>
                    )}
                  </div>
                  {matchedBanks.withinRadius.length === 0 ? (
                    <p className="text-[12px] text-slate-600 dark:text-white/70">
                      No matching bank inside {activeRequest.radiusKm} km yet — escalating radius expands to {matchedBanks.allStateMatches.length} statewide banks.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {matchedBanks.withinRadius.slice(0, 3).map((m) => (
                        <li
                          key={m.bank.id}
                          className="flex items-center justify-between gap-2 rounded-2xl border border-black/10 bg-white/60 px-3 py-2.5 text-[12px] dark:border-white/15 dark:bg-white/[0.08]"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{m.bank.name}</p>
                            <p className="text-[11px] text-slate-600 dark:text-white/70">
                              ~{m.distanceKm} km · {m.compatibleUnits}u (
                              {m.matchingGroups.map((g) => g.group).join(', ')})
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <a
                              href={`https://www.openstreetmap.org/directions?to=${m.bank.lat}%2C${m.bank.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Directions to ${m.bank.name}`}
                              className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-full border border-black/15 bg-white/80 text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                            >
                              <Navigation className="h-3.5 w-3.5" />
                            </a>
                            <a
                              href={`tel:${m.bank.phone}`}
                              className="inline-flex min-h-[38px] items-center gap-1 rounded-full bg-[#34D399] px-3 font-semibold text-[#09291E]"
                            >
                              <Phone className="h-3.5 w-3.5" /> Call
                            </a>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Requester Controls OR Donor Respond Button */}
                {user?.uid === activeRequest.requesterUid ? (
                  <div className="flex flex-wrap gap-2 border-t border-black/10 pt-3 dark:border-white/10">
                    {activeRequest.status !== 'fulfilled' &&
                      activeRequest.status !== 'expired' && (
                        <button
                          type="button"
                          onClick={() =>
                            void sosService
                              .updateRequestStatus(activeRequest, 'fulfilled')
                              .then((u) =>
                                setRequests((prev) =>
                                  prev.map((r) => (r.id === u.id ? u : r)),
                                ),
                              )
                          }
                          className="min-h-[44px] flex-1 rounded-full bg-[#34D399] px-4 text-[12px] font-semibold text-[#09291E]"
                        >
                          Mark Fulfilled
                        </button>
                      )}
                    {activeRequest.status === 'matched' &&
                      !isSosExpired(activeRequest) && (
                        <button
                          type="button"
                          onClick={() =>
                            void sosService
                              .updateRequestStatus(activeRequest, 'open')
                              .then((u) =>
                                setRequests((prev) =>
                                  prev.map((r) => (r.id === u.id ? u : r)),
                                ),
                              )
                          }
                          className="min-h-[44px] flex-1 rounded-full border border-black/15 bg-white/70 px-3 text-[12px] font-medium dark:border-white/20 dark:bg-white/10"
                        >
                          Reopen Search
                        </button>
                      )}
                    {activeRequest.status !== 'cancelled' &&
                      activeRequest.status !== 'fulfilled' &&
                      activeRequest.status !== 'expired' && (
                        <button
                          type="button"
                          onClick={() =>
                            void sosService
                              .updateRequestStatus(activeRequest, 'cancelled')
                              .then((u) =>
                                setRequests((prev) =>
                                  prev.filter((r) => r.id !== u.id),
                                ),
                              )
                          }
                          className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-full border border-[#F43F5E]/40 bg-[#F43F5E]/15 px-4 text-[12px] font-medium text-[#BE123C] dark:text-[#FDA4AF]"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Cancel
                        </button>
                      )}
                    {activeRequest.status === 'expired' && (
                      <p className="w-full text-[11px] text-slate-600 dark:text-white/70">
                        This SOS request expired after 24 hours. Private contact info is locked and all phone PII is purged after 30 days.
                      </p>
                    )}
                  </div>
                ) : (
                  activeRequest.status === 'open' &&
                  !isSosExpired(activeRequest) && (
                    <div className="border-t border-black/10 pt-3 dark:border-white/10">
                      {respondingToId === activeRequest.id ? (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between text-[12px]">
                            <span className="font-medium">Your ETA</span>
                            <div className="flex gap-1.5">
                              {[15, 30, 45, 60].map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setEtaMinutes(m)}
                                  className={`min-h-[34px] rounded-full px-3 text-[11px] font-semibold ${
                                    etaMinutes === m
                                      ? 'bg-[#34D399] text-[#09291E]'
                                      : 'bg-black/10 dark:bg-white/10'
                                  }`}
                                >
                                  {m}m
                                </button>
                              ))}
                            </div>
                          </div>
                          <input
                            type="tel"
                            maxLength={20}
                            placeholder="Share phone with requester (optional)"
                            value={donorPhoneShare}
                            onChange={(e) => setDonorPhoneShare(e.target.value)}
                            className="min-h-[44px] w-full rounded-2xl border border-black/15 bg-white/80 px-3 text-[13px] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setRespondingToId(null)}
                              className="min-h-[44px] flex-1 rounded-full border border-black/15 bg-white/70 text-[12px] font-medium dark:border-white/20 dark:bg-white/10"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={respondBusy}
                              onClick={() =>
                                void handleRespondSubmit(activeRequest)
                              }
                              className="min-h-[44px] flex-[2] rounded-full bg-[#34D399] text-[13px] font-semibold text-[#09291E] disabled:opacity-60"
                            >
                              {respondBusy
                                ? 'Confirming...'
                                : 'Confirm I Can Donate'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setRespondingToId(activeRequest.id)}
                          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#34D399] px-5 text-[14px] font-semibold text-[#09291E]"
                        >
                          <HeartHandshake className="h-4 w-4" />
                          I Can Donate · Respond Now
                        </button>
                      )}
                    </div>
                  )
                )}
              </section>
            ) : (
              <div className="ld-glass rounded-[28px] p-6 text-center text-slate-900 dark:text-white">
                <Activity
                  className="mx-auto h-10 w-10 text-[#C4B5FD]"
                  aria-hidden="true"
                />
                <h2 className="mt-2 text-[17px] font-medium">
                  No open SOS requests right now
                </h2>
                <p className="mt-1 text-[13px] text-slate-600 dark:text-white/75">
                  Create an emergency SOS in 3 taps or check compatible blood banks on the Map.
                </p>
                <button
                  type="button"
                  onClick={() => setSubTab('create')}
                  className="mt-4 min-h-[44px] rounded-full bg-[#F43F5E] px-5 text-[13px] font-semibold text-white"
                >
                  Create 3-Tap SOS
                </button>
              </div>
            )}

            {/* Nearby Requests Feed Selector */}
            {requests.length > 0 && (
              <section className="ld-glass space-y-2.5 rounded-[28px] p-5 text-slate-900 dark:text-white">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#C4B5FD]" aria-hidden="true" />
                  <h3 className="text-[14px] font-semibold">
                    Open &amp; Matched Requests ({requests.length})
                  </h3>
                </div>
                <ul className="space-y-2">
                  {requests.map((req) => {
                    const userMatches =
                      profile?.bloodGroup &&
                      isDonorCompatible(
                        profile.bloodGroup,
                        req.bloodGroup,
                        req.component,
                      );
                    return (
                      <li key={req.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedRequestId(req.id)}
                          className={`flex min-h-[54px] w-full items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-left transition ${
                            activeRequest?.id === req.id
                              ? 'border-[#5B3FE0] bg-[#5B3FE0]/20'
                              : 'border-black/10 bg-white/55 dark:border-white/10 dark:bg-white/[0.06]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F43F5E] text-[13px] font-bold text-white">
                              {req.bloodGroup}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-semibold">
                                {req.hospitalName}
                              </p>
                              <p className="text-[11px] text-slate-600 dark:text-white/70">
                                <MapPin className="mr-0.5 inline h-3 w-3" />
                                {req.city} · {req.unitsNeeded}u · {req.radiusKm}km
                              </p>
                            </div>
                          </div>
                          {userMatches && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#34D399]/20 px-2.5 py-1 text-[10px] font-semibold text-[#047857] dark:text-[#34D399]">
                              <Sparkles className="h-3 w-3" /> Match
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </>
        )}

        {subTab === 'matrix' && (
          <section className="ld-glass space-y-4 rounded-[28px] p-5 text-slate-900 dark:text-white">
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-[#F43F5E]" aria-hidden="true" />
              <h2 className="text-[17px] font-medium">
                ABO / Rh Compatibility Checker
              </h2>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {ORDERED_BLOOD_GROUPS.map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setMatrixGroup(bg)}
                  className={`min-h-[42px] rounded-full border text-[13px] font-semibold ${
                    matrixGroup === bg
                      ? 'border-[#5B3FE0] bg-[#5B3FE0] text-white'
                      : 'border-black/15 bg-white/70 dark:border-white/20 dark:bg-white/10'
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {COMPONENTS.map((comp) => (
                <button
                  key={comp}
                  type="button"
                  onClick={() => setMatrixComponent(comp)}
                  className={`min-h-[38px] rounded-2xl border px-2 text-[11px] font-medium ${
                    matrixComponent === comp
                      ? 'border-[#5B3FE0] bg-[#5B3FE0] text-white'
                      : 'border-black/10 bg-white/60 dark:border-white/15 dark:bg-white/[0.08]'
                  }`}
                >
                  {comp}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-[#34D399]/40 bg-[#34D399]/15 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#047857] dark:text-[#34D399]">
                  {matrixGroup} Patient Can Receive From ({matrixComponent})
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {getCompatibleDonorGroups(matrixGroup, matrixComponent).map(
                    (g) => (
                      <span
                        key={g}
                        className="rounded-full bg-white/80 px-3 py-1 text-[12px] font-bold text-slate-900 dark:bg-white/15 dark:text-white"
                      >
                        {g}
                      </span>
                    ),
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-[#5B3FE0]/40 bg-[#5B3FE0]/15 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5B3FE0] dark:text-[#C4B5FD]">
                  {matrixGroup} Donor Can Give To ({matrixComponent})
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {getCompatibleRecipientGroups(
                    matrixGroup,
                    matrixComponent,
                  ).map((g) => (
                    <span
                      key={g}
                      className="rounded-full bg-white/80 px-3 py-1 text-[12px] font-bold text-slate-900 dark:bg-white/15 dark:text-white"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>

              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-white/75">
                {getCompatibilitySummary(matrixGroup, matrixComponent)} Final transfusion compatibility is always confirmed by laboratory cross-matching at the blood centre.
              </p>
              <p className="text-[10px] text-slate-500 dark:text-white/60">
                {MEDICAL_REVIEW_CONFIG.getVersionAndReviewLine()}
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default SosScreen;
