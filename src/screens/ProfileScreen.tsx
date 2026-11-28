import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  Award,
  BarChart3,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Droplets,
  HeartHandshake,
  Info,
  LogIn,
  LogOut,
  MailWarning,
  MapPin,
  PlusCircle,
  RefreshCw,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { POST_DONATION_CARE_TIPS } from '../config/eligibilityRules';
import { authService, type UserRole } from '../services/authService';
import { computeNextEligibleDate } from '../services/eligibilityService';
import type { SavedLocation } from '../services/interfaces';
import {
  profileService,
  type ConsentRecord,
  type UserProfileData,
} from '../services/profileService';
import { downloadDonorCertificate } from '../utils/certificateGenerator';
import type { LegalTab } from '../components/LegalPrivacyModals';

interface ProfileScreenProps {
  user: User | null;
  authLoading: boolean;
  profileLoading: boolean;
  profile: UserProfileData | null;
  consent: ConsentRecord | null;
  effectiveRole: UserRole | null;
  devRoleOverride: UserRole | null;
  savedLocation: SavedLocation | null;
  onSetDevRoleOverride: (role: UserRole | null) => void;
  onOpenAuthOnboarding: () => void;
  onOpenEligibility: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  onOpenLegal: (tab: LegalTab) => void;
  onOpenBleedingEmergency: () => void;
  onOpenCompatibilityChecker: () => void;
  onOpenBankDashboard: () => void;
  onOpenAdminPortal: () => void;
  onToggleCanDonate: (val: boolean) => Promise<void>;
  onLogSelfDonation: (
    date: string,
    place: string,
  ) => Promise<UserProfileData | null>;
  onWithdrawConsent: () => Promise<void>;
  onRefreshUserAndProfile: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

const ROLE_LABELS: Record<UserRole, string> = {
  donor: 'Voluntary Donor',
  recipient: 'Recipient / Seeker',
  bank: 'Blood Bank (Pending Verification)',
  admin: 'Platform Admin',
};

const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  authLoading,
  profileLoading,
  profile,
  consent,
  effectiveRole,
  devRoleOverride,
  savedLocation,
  onSetDevRoleOverride,
  onOpenAuthOnboarding,
  onOpenEligibility,
  onOpenSettings,
  onOpenAbout,
  onOpenLegal,
  onOpenBleedingEmergency,
  onOpenCompatibilityChecker,
  onOpenBankDashboard,
  onOpenAdminPortal,
  onToggleCanDonate,
  onLogSelfDonation,
  onWithdrawConsent,
  onRefreshUserAndProfile,
  onSignOut,
  onDeleteAccount,
}) => {
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logDate, setLogDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [logPlace, setLogPlace] = useState('');
  const [showCareTips, setShowCareTips] = useState(false);
  const [privacyNotice, setPrivacyNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [versionTapCount, setVersionTapCount] = useState(0);
  const [showDevSwitcher, setShowDevSwitcher] = useState(false);

  const handleResendVerification = async () => {
    setResendMessage(null);
    try {
      await authService.resendVerificationEmail();
      setResendMessage('Verification link sent! Check your email inbox.');
    } catch (err) {
      setResendMessage(authService.formatAuthError(err));
    }
  };

  const handleLogDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await onLogSelfDonation(logDate, logPlace);
    if (updated) {
      setShowLogForm(false);
      setLogPlace('');
      setShowCareTips(true);
    }
  };

  const handleDownloadData = async () => {
    if (!user) return;
    const json = await profileService.exportUserData(user.uid);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifedrop-data-${user.uid.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setPrivacyNotice('Downloaded your JSON data export.');
  };

  const handleWithdrawConsentClick = async () => {
    await onWithdrawConsent();
    setPrivacyNotice(
      'Consent withdrawn. Emergency alerts and availability sharing have been turned off.',
    );
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    setPrivacyNotice(null);
    try {
      await onDeleteAccount();
      setConfirmDelete(false);
    } catch (err) {
      setPrivacyNotice(authService.formatAuthError(err));
    } finally {
      setDeleting(false);
    }
  };

  const handleVersionTap = () => {
    const next = versionTapCount + 1;
    setVersionTapCount(next);
    if (next >= 5) {
      setShowDevSwitcher(true);
    }
  };

  // Next eligible countdown calculation (moves strictly on bank-confirmed donation)
  const countdown = profile
    ? computeNextEligibleDate(profile.lastConfirmedDonation, profile.sex)
    : { nextDate: null, daysRemaining: 0 };
  const totalGapDays = profile?.sex === 'male' ? 90 : 120;
  const elapsedFraction =
    countdown.daysRemaining === 0
      ? 1
      : Math.max(0.05, 1 - countdown.daysRemaining / totalGapDays);
  const ringRadius = 26;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - elapsedFraction);

  const badges = [
    {
      id: 'first-drop',
      label: 'First Drop',
      req: '1 donation',
      unlocked: (profile?.donationsCount ?? 0) >= 1,
    },
    {
      id: 'life-saver',
      label: 'Life Saver',
      req: '3 donations',
      unlocked: (profile?.donationsCount ?? 0) >= 3,
    },
    {
      id: 'five-hero',
      label: '5x Hero',
      req: '5 donations',
      unlocked: (profile?.donationsCount ?? 0) >= 5,
    },
  ];

  return (
    <div className="ld-scroll-area flex-1 min-h-0 px-4 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-4">
      <div className="mx-auto w-full max-w-[400px] space-y-4 pb-2">
        {/* Header */}
        <header className="flex items-center justify-between pt-1">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5B3FE0] dark:text-[#C4B5FD]">
              Donor &amp; Account Hub
            </p>
            <h1 className="text-[24px] font-light tracking-tight text-slate-900 dark:text-white">
              Profile &amp; Eligibility
            </h1>
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open settings"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-black/10 bg-white/70 text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
          >
            <Settings className="h-5 w-5" />
          </button>
        </header>

        {/* Signed-out or Loading state */}
        {authLoading || profileLoading ? (
          <div className="ld-glass space-y-3 rounded-[28px] p-5">
            <div className="h-5 w-40 animate-pulse rounded-full bg-white/20" />
            <div className="h-4 w-64 animate-pulse rounded-full bg-white/15" />
            <div className="h-11 w-full animate-pulse rounded-full bg-white/20" />
          </div>
        ) : !user ? (
          <section className="ld-glass rounded-[28px] p-5 text-slate-900 dark:text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#5B3FE0]/25 text-[#5B3FE0] dark:text-white">
                <UserIcon className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-[18px] font-medium">Join LifeDrop India</h2>
                <p className="text-[12px] text-slate-700 dark:text-white/75">
                  Sign in free with Google or Email (18+ verified · DPDP Act 2023)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenAuthOnboarding}
              className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#5B3FE0] px-5 text-[14px] font-semibold text-white shadow-lg"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Sign In or Create Account
            </button>
          </section>
        ) : !profile ? (
          <section className="ld-glass rounded-[28px] p-5 text-slate-900 dark:text-white">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-[#FBBF24]">
              18+ Age Gate &amp; Consent Pending
            </p>
            <h2 className="mt-1 text-[18px] font-medium">
              Finish your LifeDrop setup
            </h2>
            <p className="mt-1 text-[13px] text-slate-700 dark:text-white/75">
              Signed in as <strong>{user.email}</strong>. Complete your birth year check, blood group, and DPDP Act 2023 consent to activate your profile.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={onOpenAuthOnboarding}
                className="min-h-[48px] w-full rounded-full bg-[#34D399] px-5 text-[14px] font-semibold text-[#09291E]"
              >
                Complete 18+ Setup &amp; Consent
              </button>
              <button
                type="button"
                onClick={() => void onSignOut()}
                className="min-h-[44px] w-full rounded-full border border-black/15 bg-white/70 px-5 text-[13px] font-medium dark:border-white/20 dark:bg-white/10"
              >
                Sign out
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* Email verification nudge for Email/Password signups */}
            {!user.emailVerified && (
              <section className="rounded-[24px] border border-[#FBBF24]/50 bg-[#FBBF24]/15 p-4 text-slate-900 dark:text-white">
                <div className="flex items-start gap-2.5">
                  <MailWarning
                    className="mt-0.5 h-5 w-5 shrink-0 text-[#B45309] dark:text-[#FBBF24]"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold">
                      Verify your email address
                    </p>
                    <p className="mt-0.5 text-[12px] text-slate-700 dark:text-white/80">
                      Check <strong>{user.email}</strong> for a verification link before making admin or verified requests.
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleResendVerification()}
                        className="min-h-[38px] rounded-full bg-[#FBBF24] px-3.5 text-[12px] font-semibold text-[#291D04]"
                      >
                        Resend link
                      </button>
                      <button
                        type="button"
                        onClick={() => void onRefreshUserAndProfile()}
                        className="inline-flex min-h-[38px] items-center gap-1 rounded-full border border-black/15 bg-white/70 px-3.5 text-[12px] font-medium dark:border-white/20 dark:bg-white/10"
                      >
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                        I verified
                      </button>
                    </div>
                    {resendMessage && (
                      <p className="mt-1.5 text-[11px] font-medium">
                        {resendMessage}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Profile Summary Card */}
            <section className="ld-glass rounded-[28px] p-5 text-slate-900 dark:text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[#5B3FE0] text-[20px] font-semibold text-white shadow-md">
                    {profile.bloodGroup}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-[18px] font-semibold">
                      {profile.displayName}
                    </h2>
                    <p className="text-[12px] text-slate-700 dark:text-white/75">
                      {effectiveRole ? ROLE_LABELS[effectiveRole] : ROLE_LABELS[profile.role]}
                      {devRoleOverride ? ' (Preview Override)' : ''}
                    </p>
                  </div>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    profile.bloodGroupStatus === 'lab-confirmed'
                      ? 'bg-[#34D399]/20 text-[#059669] dark:text-[#34D399]'
                      : 'bg-[#FBBF24]/20 text-[#B45309] dark:text-[#FCD34D]'
                  }`}
                >
                  {profile.bloodGroupStatus === 'lab-confirmed'
                    ? 'Lab-confirmed'
                    : 'Self-reported'}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-slate-700 dark:text-white/75">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#34D399]" aria-hidden="true" />
                  {profile.city}, {profile.stateName}
                </span>
                <button
                  type="button"
                  onClick={onOpenAuthOnboarding}
                  className="font-medium text-[#5B3FE0] underline dark:text-[#C4B5FD]"
                >
                  Edit details
                </button>
              </div>

              {/* I can donate now toggle */}
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/60 px-3.5 py-2.5 dark:border-white/15 dark:bg-white/[0.08]">
                <div>
                  <p className="text-[14px] font-medium">I can donate now</p>
                  <p className="text-[11px] text-slate-600 dark:text-white/65">
                    Shows you as available for nearby SOS alerts
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile.canDonateNow}
                  onClick={() => void onToggleCanDonate(!profile.canDonateNow)}
                  className={`min-h-[44px] min-w-[68px] rounded-full px-4 text-[13px] font-semibold transition ${
                    profile.canDonateNow
                      ? 'bg-[#34D399] text-[#09291E]'
                      : 'bg-black/15 text-slate-800 dark:bg-white/15 dark:text-white'
                  }`}
                >
                  {profile.canDonateNow ? 'Yes' : 'Paused'}
                </button>
              </div>
            </section>

            {/* Next Eligible Date + Countdown Ring */}
            <section className="ld-glass rounded-[28px] p-5 text-slate-900 dark:text-white">
              <div className="flex items-center gap-4">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
                  <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                    <circle
                      cx="32"
                      cy="32"
                      r={ringRadius}
                      fill="none"
                      stroke="currentColor"
                      strokeOpacity={0.15}
                      strokeWidth="6"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r={ringRadius}
                      fill="none"
                      stroke={countdown.daysRemaining === 0 ? '#34D399' : '#FBBF24'}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringOffset}
                    />
                  </svg>
                  <span className="absolute text-[13px] font-semibold">
                    {countdown.daysRemaining === 0
                      ? 'Ready'
                      : `${countdown.daysRemaining}d`}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-600 dark:text-white/70">
                    Whole-Blood Interval ({profile.sex === 'male' ? '90d' : '120d'})
                  </p>
                  <p className="mt-0.5 text-[16px] font-semibold">
                    {countdown.daysRemaining === 0
                      ? 'Eligible to donate today'
                      : `Next eligible: ${countdown.nextDate}`}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-600 dark:text-white/65">
                    Last bank-confirmed:{' '}
                    {profile.lastConfirmedDonation ?? 'None recorded yet'}. Next eligible date moves only after a blood bank confirms your donation.
                  </p>
                </div>
              </div>
            </section>

            {/* Badges & Downloadable Certificate */}
            <section className="ld-glass rounded-[28px] p-5 text-slate-900 dark:text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-[#FBBF24]" aria-hidden="true" />
                  <h3 className="text-[16px] font-medium">
                    Impact &amp; Badges ({profile.donationsCount})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => downloadDonorCertificate(profile)}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#5B3FE0] px-3.5 text-[12px] font-semibold text-white"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Certificate PNG
                </button>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {badges.map((b) => (
                  <div
                    key={b.id}
                    className={`rounded-2xl border p-2.5 text-center ${
                      b.unlocked
                        ? 'border-[#34D399]/50 bg-[#34D399]/15'
                        : 'border-black/10 bg-white/40 opacity-60 dark:border-white/15 dark:bg-white/[0.05]'
                    }`}
                  >
                    <p className="text-[12px] font-semibold">{b.label}</p>
                    <p className="text-[10px] text-slate-600 dark:text-white/70">
                      {b.req}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Log Self-Reported Donation + Care Tips */}
            <section className="ld-glass rounded-[28px] p-5 text-slate-900 dark:text-white">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CalendarCheck
                    className="h-5 w-5 text-[#34D399]"
                    aria-hidden="true"
                  />
                  <h3 className="text-[16px] font-medium">Donation Timeline</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLogForm((v) => !v)}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-black/15 bg-white/70 px-3.5 text-[12px] font-medium dark:border-white/20 dark:bg-white/10"
                >
                  <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Log donation
                </button>
              </div>

              {showLogForm && (
                <form
                  onSubmit={(e) => void handleLogDonationSubmit(e)}
                  className="mt-3 space-y-2.5 rounded-2xl border border-black/10 bg-white/60 p-3.5 dark:border-white/15 dark:bg-white/[0.08]"
                >
                  <label className="block space-y-1">
                    <span className="text-[11px] font-medium">Donation Date</span>
                    <input
                      type="date"
                      required
                      max={new Date().toISOString().slice(0, 10)}
                      value={logDate}
                      onChange={(e) => setLogDate(e.target.value)}
                      className="min-h-[44px] w-full rounded-xl border border-black/15 bg-white/80 px-3 text-[13px] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-medium">
                      Blood Bank / Camp Name
                    </span>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      placeholder="e.g. Red Cross Blood Centre"
                      value={logPlace}
                      onChange={(e) => setLogPlace(e.target.value)}
                      className="min-h-[44px] w-full rounded-xl border border-black/15 bg-white/80 px-3 text-[13px] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                    />
                  </label>
                  <p className="text-[11px] text-slate-600 dark:text-white/65">
                    Logged as self-reported. Next eligible countdown updates once the blood bank confirms.
                  </p>
                  <button
                    type="submit"
                    className="min-h-[44px] w-full rounded-full bg-[#34D399] text-[13px] font-semibold text-[#09291E]"
                  >
                    Save Self-Reported Entry
                  </button>
                </form>
              )}

              {showCareTips && (
                <div className="mt-3 rounded-2xl border border-[#34D399]/40 bg-[#34D399]/15 p-3.5">
                  <div className="flex items-center gap-2 font-semibold text-[#047857] dark:text-[#34D399]">
                    <HeartHandshake className="h-4 w-4" aria-hidden="true" />
                    <span className="text-[13px]">Thank you! Post-Donation Care Tips</span>
                  </div>
                  <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[12px] text-slate-800 dark:text-white/85">
                    {POST_DONATION_CARE_TIPS.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {profile.timeline.length === 0 ? (
                <p className="mt-3 text-[13px] text-slate-600 dark:text-white/65">
                  No donations logged yet. Tap &ldquo;Log donation&rdquo; after donating to track your history and unlock badges.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {profile.timeline.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-2 rounded-2xl border border-black/10 bg-white/55 px-3.5 py-2.5 text-[13px] dark:border-white/10 dark:bg-white/[0.06]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.place}</p>
                        <p className="text-[11px] text-slate-600 dark:text-white/65">
                          {item.date} · {item.units} unit
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          item.status === 'bank-confirmed'
                            ? 'bg-[#34D399]/20 text-[#059669] dark:text-[#34D399]'
                            : 'bg-black/10 text-slate-700 dark:bg-white/10 dark:text-white/80'
                        }`}
                      >
                        {item.status === 'bank-confirmed'
                          ? 'Bank-confirmed'
                          : 'Self-reported'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        {/* Operations & Portals (M6 Blood Bank & Admin) */}
        <section className="ld-glass space-y-2.5 rounded-[28px] p-5 text-slate-900 dark:text-white">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-white/65">
            Hospital &amp; Operations Portals
          </p>

          {effectiveRole === 'admin' && (
            <button
              type="button"
              onClick={onOpenAdminPortal}
              className="flex min-h-[48px] w-full items-center justify-between rounded-2xl bg-[#5B3FE0] px-4 text-[14px] font-semibold text-white shadow-md"
            >
              <span className="inline-flex items-center gap-2">
                <BarChart3 className="h-5 w-5" aria-hidden="true" />
                Admin Verification &amp; KPI Panel
              </span>
              <span className="text-[12px]">Open</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (!user && devRoleOverride !== 'bank') {
                onOpenAuthOnboarding();
              } else {
                onOpenBankDashboard();
              }
            }}
            className={`flex min-h-[48px] w-full items-center justify-between rounded-2xl px-4 text-[14px] font-semibold ${
              effectiveRole === 'bank'
                ? 'bg-[#5B3FE0] text-white shadow-md'
                : 'border border-black/10 bg-white/65 text-slate-900 dark:border-white/15 dark:bg-white/[0.08] dark:text-white'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Building2 className="h-5 w-5" aria-hidden="true" />
              {effectiveRole === 'bank'
                ? 'Blood Bank Live Stock Dashboard'
                : 'Register / Manage Blood Bank'}
            </span>
            <span className="text-[12px]">
              {effectiveRole === 'bank' ? 'Manage' : 'Apply'}
            </span>
          </button>
        </section>

        {/* Always-accessible Eligibility & Quick Actions */}
        <section className="ld-glass space-y-2.5 rounded-[28px] p-5 text-slate-900 dark:text-white">
          <button
            type="button"
            onClick={onOpenEligibility}
            className="flex min-h-[48px] w-full items-center justify-between rounded-2xl bg-[#34D399] px-4 text-[14px] font-semibold text-[#09291E]"
          >
            <span className="inline-flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
              Donor Eligibility Checker (7 Checks)
            </span>
            <span className="text-[12px]">Check</span>
          </button>

          <button
            type="button"
            onClick={onOpenBleedingEmergency}
            className="flex min-h-[48px] w-full items-center justify-between rounded-2xl bg-[#F43F5E] px-4 text-[14px] font-semibold text-white"
          >
            <span className="inline-flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
              Bleeding Emergency First Aid (Offline)
            </span>
            <span className="text-[12px]">108 / 112</span>
          </button>

          <button
            type="button"
            onClick={onOpenCompatibilityChecker}
            className="flex min-h-[46px] w-full items-center justify-between rounded-2xl border border-black/10 bg-white/65 px-4 text-[13px] font-semibold text-slate-900 dark:border-white/15 dark:bg-white/[0.08] dark:text-white"
          >
            <span className="inline-flex items-center gap-2">
              <Droplets className="h-4 w-4 text-[#F43F5E]" aria-hidden="true" />
              Blood Compatibility Checker (Offline · No AI)
            </span>
            <span className="text-[11px] text-slate-600 dark:text-white/65">
              ABO / Rh
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="flex min-h-[46px] w-full items-center justify-between rounded-2xl border border-black/10 bg-white/60 px-4 text-[13px] font-medium dark:border-white/15 dark:bg-white/[0.08]"
          >
            <span className="inline-flex items-center gap-2">
              <Settings className="h-4 w-4 text-[#C4B5FD]" aria-hidden="true" />
              Theme, Data Saver, Language &amp; Location
            </span>
            <span className="text-[11px] text-slate-600 dark:text-white/65">
              {savedLocation ? savedLocation.stateCode : 'Set'}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onOpenAbout}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border border-black/10 bg-white/60 px-3 text-[12px] font-medium dark:border-white/15 dark:bg-white/[0.08]"
            >
              <Info className="h-4 w-4" aria-hidden="true" />
              Medical Notice
            </button>
            <button
              type="button"
              onClick={() => onOpenLegal('privacy')}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border border-black/10 bg-white/60 px-3 text-[12px] font-medium dark:border-white/15 dark:bg-white/[0.08]"
            >
              <ShieldCheck className="h-4 w-4 text-[#34D399]" aria-hidden="true" />
              DPDP Privacy &amp; Terms
            </button>
          </div>
        </section>

        {/* DPDP Privacy Actions & Account Deletion */}
        {user && (
          <section className="ld-glass space-y-2.5 rounded-[28px] p-5 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-semibold">
                DPDP Data &amp; Account Controls
              </h3>
              {consent && (
                <span className="text-[11px] text-slate-600 dark:text-white/65">
                  {consent.withdrawn ? 'Consent withdrawn' : 'Consent active'}
                </span>
              )}
            </div>

            {privacyNotice && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-2xl border border-[#34D399]/40 bg-[#34D399]/15 p-3 text-[12px]"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#059669] dark:text-[#34D399]" />
                <span>{privacyNotice}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleDownloadData()}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-black/15 bg-white/70 px-4 text-[13px] font-medium dark:border-white/20 dark:bg-white/10"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download my data (JSON)
            </button>

            {consent && !consent.withdrawn && (
              <button
                type="button"
                onClick={() => void handleWithdrawConsentClick()}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-[#FBBF24]/50 bg-[#FBBF24]/15 px-4 text-[13px] font-medium text-[#B45309] dark:text-[#FCD34D]"
              >
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                Withdraw consent
              </button>
            )}

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-[#F43F5E]/40 bg-[#F43F5E]/15 px-4 text-[13px] font-medium text-[#BE123C] dark:text-[#FDA4AF]"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete my account
              </button>
            ) : (
              <div className="space-y-2 rounded-2xl border border-[#F43F5E]/50 bg-[#F43F5E]/15 p-3">
                <p className="text-[12px] font-semibold text-[#BE123C] dark:text-[#FDA4AF]">
                  Permanently delete profile, private phone/email, consents, and Auth account?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="min-h-[40px] flex-1 rounded-full bg-white/80 text-[12px] font-medium text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => void handleDeleteConfirm()}
                    className="min-h-[40px] flex-1 rounded-full bg-[#F43F5E] text-[12px] font-semibold text-white disabled:opacity-60"
                  >
                    {deleting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => void onSignOut()}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-black/15 bg-black/5 px-4 text-[13px] font-medium dark:border-white/20 dark:bg-white/5"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </section>
        )}

        {/* Hidden Demo Role Switcher (Section 11) unlocked via 5 taps on version */}
        {showDevSwitcher && (
          <section className="ld-glass space-y-2 rounded-[24px] p-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold text-[#C4B5FD]">
                Dev Preview: Role Switcher
              </p>
              <button
                type="button"
                onClick={() => onSetDevRoleOverride(null)}
                className="text-[11px] underline"
              >
                Reset
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(['donor', 'recipient', 'bank', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onSetDevRoleOverride(r)}
                  className={`min-h-[38px] rounded-full text-[11px] font-medium capitalize ${
                    devRoleOverride === r
                      ? 'bg-[#5B3FE0] text-white'
                      : 'bg-black/10 dark:bg-white/10'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="pb-2 text-center">
          <button
            type="button"
            onClick={handleVersionTap}
            className="text-[11px] text-slate-600/80 dark:text-white/50"
          >
            LifeDrop India · v1.0 {devRoleOverride ? `(Demo: ${devRoleOverride})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;
