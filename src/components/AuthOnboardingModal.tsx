import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertCircle,
  CheckCircle2,
  Droplets,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { INDIA_STATES_AND_UTS } from '../data/indiaLocations';
import type { BloodGroup } from '../data/seedStats';
import { useVisualViewportHeight } from '../hooks/useVisualViewport';
import { authService, type UserRole } from '../services/authService';
import type { BiologicalSex } from '../services/eligibilityService';
import type { SavedLocation } from '../services/interfaces';
import {
  profileService,
  type UserProfileData,
} from '../services/profileService';
import type { LegalTab } from './LegalPrivacyModals';

interface AuthOnboardingModalProps {
  isOpen: boolean;
  user: User | null;
  savedLocation: SavedLocation | null;
  existingProfile: UserProfileData | null;
  onClose: () => void;
  onCompleted: (profile: UserProfileData, shouldPromptLocation: boolean) => void;
  onOpenLegal: (tab: LegalTab) => void;
}

const BLOOD_GROUPS: BloodGroup[] = [
  'O+',
  'A+',
  'B+',
  'AB+',
  'O-',
  'A-',
  'B-',
  'AB-',
];

export const AuthOnboardingModal: React.FC<AuthOnboardingModalProps> = ({
  isOpen,
  user,
  savedLocation,
  existingProfile,
  onClose,
  onCompleted,
  onOpenLegal,
}) => {
  const vvHeight = useVisualViewportHeight();
  const currentYear = new Date().getFullYear();

  // Auth form state
  const [authTab, setAuthTab] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authName, setAuthName] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);

  // Onboarding steps state (when user is signed in)
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [displayName, setDisplayName] = useState('');
  const [dobYear, setDobYear] = useState<string>('2000');
  const [role, setRole] = useState<Exclude<UserRole, 'admin'>>('donor');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O+');
  const [sex, setSex] = useState<BiologicalSex>('male');
  const [stateCode, setStateCode] = useState<string>(
    savedLocation?.stateCode && savedLocation.stateCode !== 'ALL'
      ? savedLocation.stateCode
      : 'KA',
  );
  const [city, setCity] = useState<string>(savedLocation?.city || 'Bengaluru');
  const [phone, setPhone] = useState<string>('');
  const [acceptedAge, setAcceptedAge] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedAlerts, setAcceptedAlerts] = useState(true);
  const [savingOnboarding, setSavingOnboarding] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setAuthError(null);
    setAuthInfo(null);
    setOnboardingError(null);
    setStep(1);
    if (user) {
      setDisplayName(
        existingProfile?.displayName ||
          user.displayName ||
          user.email?.split('@')[0] ||
          '',
      );
      if (existingProfile) {
        setRole(
          existingProfile.role === 'admin' ? 'donor' : existingProfile.role,
        );
        setBloodGroup(existingProfile.bloodGroup);
        setSex(existingProfile.sex);
        setStateCode(existingProfile.stateCode);
        setCity(existingProfile.city);
      } else if (savedLocation && savedLocation.stateCode !== 'ALL') {
        setStateCode(savedLocation.stateCode);
        setCity(savedLocation.city);
      }
    }
  }, [isOpen, user, existingProfile, savedLocation]);

  if (!isOpen) return null;

  const selectedStateObj =
    INDIA_STATES_AND_UTS.find((s) => s.code === stateCode) ??
    INDIA_STATES_AND_UTS[0];

  const parsedDobYear = Number.parseInt(dobYear, 10);
  const computedAge =
    Number.isFinite(parsedDobYear) && parsedDobYear >= 1920
      ? currentYear - parsedDobYear
      : 0;
  const isUnder18 = Boolean(dobYear.length === 4 && computedAge < 18);

  const handleGoogleSignIn = async () => {
    setAuthBusy(true);
    setAuthError(null);
    setAuthInfo(null);
    try {
      await authService.signInWithGoogle();
    } catch (err) {
      setAuthError(authService.formatAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError(null);
    setAuthInfo(null);
    try {
      if (authTab === 'reset') {
        await authService.sendPasswordReset(email);
        setAuthInfo('Password reset link sent! Check your inbox or spam folder.');
        setAuthBusy(false);
        return;
      }
      if (authTab === 'signin') {
        await authService.signInWithEmail(email, password);
      } else {
        if (password.length < 6) {
          setAuthError('Password must be at least 6 characters.');
          setAuthBusy(false);
          return;
        }
        await authService.signUpWithEmail(email, password, authName);
      }
    } catch (err) {
      setAuthError(authService.formatAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleNextStep1 = () => {
    setOnboardingError(null);
    if (!displayName.trim()) {
      setOnboardingError('Please enter your display name.');
      return;
    }
    if (!Number.isFinite(parsedDobYear) || parsedDobYear < 1920 || parsedDobYear > currentYear) {
      setOnboardingError('Please enter a valid 4-digit birth year.');
      return;
    }
    if (computedAge < 18) {
      // Reject and store zero PII
      setOnboardingError(
        'LifeDrop accounts require age 18+. Voluntary blood donation in India begins at 18. You can still use First Aid and Learning resources without registering.',
      );
      return;
    }
    setStep(2);
  };

  const handleFinishOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setOnboardingError(null);

    if (!acceptedAge || !acceptedPrivacy) {
      setOnboardingError(
        'Please confirm you are 18+ and accept the Privacy Policy & Terms to save your profile.',
      );
      return;
    }

    setSavingOnboarding(true);
    try {
      const saved = await profileService.completeOnboarding({
        uid: user.uid,
        email: user.email ?? '',
        displayName,
        role,
        bloodGroup,
        stateCode: selectedStateObj.code,
        stateName: selectedStateObj.name,
        city: city.trim() || selectedStateObj.cities[0]?.name || selectedStateObj.name,
        sex,
        phone: phone.trim(),
        dobYear: parsedDobYear,
        acceptedEmergencyAlerts: acceptedAlerts,
      });

      const shouldPromptLocation =
        !savedLocation || savedLocation.source === 'none';
      onCompleted(saved, shouldPromptLocation);
    } catch (err) {
      setOnboardingError(
        err instanceof Error
          ? err.message
          : 'Could not save profile right now. Please try again.',
      );
    } finally {
      setSavingOnboarding(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-onboarding-title"
    >
      <div
        style={vvHeight ? { maxHeight: `${vvHeight}px` } : undefined}
        className="ld-glass-sheet flex max-h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[32px] border border-white/20 text-slate-900 shadow-2xl sm:max-h-[90dvh] sm:rounded-[32px] dark:text-white"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/10 px-5 pt-4 pb-3 dark:border-white/15">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-[#F43F5E]" aria-hidden="true" />
            <h2 id="auth-onboarding-title" className="text-[19px] font-light">
              {!user
                ? 'Sign in to LifeDrop'
                : existingProfile
                  ? 'Update Profile & Consent'
                  : `Complete Setup (Step ${step}/3)`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign in dialog"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="ld-scroll-area flex-1 min-h-0 space-y-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {!user ? (
            <>
              <button
                type="button"
                disabled={authBusy}
                onClick={() => void handleGoogleSignIn()}
                className="flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-full bg-white px-5 text-[14px] font-semibold text-slate-900 shadow-md transition active:scale-[0.99] disabled:opacity-60"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#5B3FE0] text-[12px] font-bold text-white">
                  G
                </span>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 text-[12px] text-slate-500 dark:text-white/55">
                <span className="h-px flex-1 bg-black/10 dark:bg-white/15" />
                <span>or use email &amp; password</span>
                <span className="h-px flex-1 bg-black/10 dark:bg-white/15" />
              </div>

              <div className="flex rounded-full bg-black/10 p-1 dark:bg-white/10">
                {(
                  [
                    { id: 'signin', label: 'Sign In' },
                    { id: 'signup', label: 'Create Account' },
                    { id: 'reset', label: 'Reset' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setAuthTab(t.id);
                      setAuthError(null);
                      setAuthInfo(null);
                    }}
                    className={`min-h-[38px] flex-1 rounded-full text-[12px] font-medium transition ${
                      authTab === t.id
                        ? 'bg-[#5B3FE0] text-white'
                        : 'text-slate-700 dark:text-white/75'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {authError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-2xl border border-[#F43F5E]/40 bg-[#F43F5E]/15 p-3 text-[12px] text-[#BE123C] dark:text-[#FDA4AF]"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{authError}</span>
                </div>
              )}

              {authInfo && (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-2xl border border-[#34D399]/40 bg-[#34D399]/15 p-3 text-[12px] text-[#047857] dark:text-[#6EE7B7]"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{authInfo}</span>
                </div>
              )}

              <form onSubmit={(e) => void handleEmailAuth(e)} className="space-y-3">
                {authTab === 'signup' && (
                  <label className="block space-y-1">
                    <span className="text-[12px] font-medium text-slate-700 dark:text-white/80">
                      Full Name
                    </span>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      placeholder="e.g. Aarav Sharma"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="min-h-[44px] w-full rounded-2xl border border-black/15 bg-white/75 px-3.5 text-[14px] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                    />
                  </label>
                )}

                <label className="block space-y-1">
                  <span className="text-[12px] font-medium text-slate-700 dark:text-white/80">
                    Email Address
                  </span>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute top-3.5 left-3.5 h-4 w-4 text-slate-500 dark:text-white/60"
                      aria-hidden="true"
                    />
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="min-h-[44px] w-full rounded-2xl border border-black/15 bg-white/75 pr-3.5 pl-10 text-[14px] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                    />
                  </div>
                </label>

                {authTab !== 'reset' && (
                  <label className="block space-y-1">
                    <span className="text-[12px] font-medium text-slate-700 dark:text-white/80">
                      Password
                    </span>
                    <div className="relative">
                      <Lock
                        className="pointer-events-none absolute top-3.5 left-3.5 h-4 w-4 text-slate-500 dark:text-white/60"
                        aria-hidden="true"
                      />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="Min 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="min-h-[44px] w-full rounded-2xl border border-black/15 bg-white/75 pr-11 pl-10 text-[14px] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute top-0 right-0 flex min-h-[44px] min-w-[44px] items-center justify-center text-slate-500 dark:text-white/65"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={authBusy}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#5B3FE0] px-5 text-[14px] font-semibold text-white shadow-lg disabled:opacity-60"
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  {authBusy
                    ? 'Please wait...'
                    : authTab === 'signin'
                      ? 'Sign In'
                      : authTab === 'signup'
                        ? 'Create Account'
                        : 'Send Reset Email'}
                </button>
              </form>

              <p className="text-center text-[11px] text-slate-600 dark:text-white/65">
                Zero SMS OTP charges · Protected under{' '}
                <button
                  type="button"
                  onClick={() => onOpenLegal('privacy')}
                  className="underline"
                >
                  DPDP Act 2023
                </button>
              </p>
            </>
          ) : (
            <form onSubmit={(e) => void handleFinishOnboarding(e)} className="space-y-4">
              {/* Step progress bar */}
              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 rounded-full transition ${
                      s <= step ? 'bg-[#34D399]' : 'bg-black/15 dark:bg-white/15'
                    }`}
                  />
                ))}
              </div>

              {onboardingError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-2xl border border-[#F43F5E]/40 bg-[#F43F5E]/15 p-3 text-[12px] text-[#BE123C] dark:text-[#FDA4AF]"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{onboardingError}</span>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-3.5">
                  <label className="block space-y-1">
                    <span className="text-[12px] font-medium text-slate-700 dark:text-white/80">
                      Display Name
                    </span>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                      className="min-h-[44px] w-full rounded-2xl border border-black/15 bg-white/75 px-3.5 text-[14px] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                    />
                  </label>

                  <div className="rounded-2xl border border-black/10 bg-white/60 p-3.5 dark:border-white/15 dark:bg-white/[0.08]">
                    <label className="block space-y-1">
                      <span className="text-[12px] font-semibold text-slate-800 dark:text-white">
                        18+ Age Gate · Birth Year (Required)
                      </span>
                      <input
                        type="number"
                        min={1920}
                        max={currentYear}
                        value={dobYear}
                        onChange={(e) => setDobYear(e.target.value)}
                        className="min-h-[44px] w-full rounded-2xl border border-black/15 bg-white/80 px-3.5 text-[14px] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                      />
                    </label>
                    <p
                      className={`mt-1.5 text-[11px] ${
                        isUnder18
                          ? 'font-semibold text-[#BE123C] dark:text-[#FDA4AF]'
                          : 'text-slate-600 dark:text-white/70'
                      }`}
                    >
                      {isUnder18
                        ? `Age ${computedAge}: Under 18 accounts cannot register or store PII.`
                        : Number.isFinite(parsedDobYear) && dobYear.length === 4
                          ? `Verified age bracket: ${computedAge} years (eligible 18+)`
                          : 'Enter 4-digit birth year (must be 18 or older).'}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[12px] font-medium text-slate-700 dark:text-white/80">
                      Account Role
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'donor', label: 'Donor' },
                          { id: 'recipient', label: 'Recipient' },
                          { id: 'bank', label: 'Blood Bank' },
                        ] as const
                      ).map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRole(r.id)}
                          className={`min-h-[44px] rounded-2xl border px-2 text-[12px] font-medium transition ${
                            role === r.id
                              ? 'border-[#5B3FE0] bg-[#5B3FE0] text-white'
                              : 'border-black/15 bg-white/70 text-slate-800 dark:border-white/20 dark:bg-white/10 dark:text-white/80'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                    {role === 'bank' && (
                      <p className="text-[11px] text-[#B45309] dark:text-[#FCD34D]">
                        Blood Bank accounts remain pending until SBTC license verification by a Platform Admin.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-medium text-slate-700 dark:text-white/80">
                        Blood Group
                      </span>
                      <span className="text-[11px] text-slate-600 dark:text-white/65">
                        Saved as Self-reported
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {BLOOD_GROUPS.map((bg) => (
                        <button
                          key={bg}
                          type="button"
                          onClick={() => setBloodGroup(bg)}
                          className={`min-h-[42px] rounded-full border text-[13px] font-semibold transition ${
                            bloodGroup === bg
                              ? 'border-[#5B3FE0] bg-[#5B3FE0] text-white'
                              : 'border-black/15 bg-white/70 text-slate-800 dark:border-white/20 dark:bg-white/10 dark:text-white/80'
                          }`}
                        >
                          {bg}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[12px] font-medium text-slate-700 dark:text-white/80">
                      Biological Sex (donation interval rule)
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'male', label: 'Male (90d)' },
                          { id: 'female', label: 'Female (120d)' },
                          { id: 'other', label: 'Other (120d)' },
                        ] as const
                      ).map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSex(s.id)}
                          className={`min-h-[44px] rounded-2xl border px-2 text-[12px] font-medium ${
                            sex === s.id
                              ? 'border-[#5B3FE0] bg-[#5B3FE0] text-white'
                              : 'border-black/15 bg-white/70 text-slate-800 dark:border-white/20 dark:bg-white/10 dark:text-white/80'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isUnder18}
                    onClick={handleNextStep1}
                    className="min-h-[48px] w-full rounded-full bg-[#5B3FE0] px-5 text-[14px] font-semibold text-white disabled:opacity-50"
                  >
                    Continue to Location &amp; Contact
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3.5">
                  <label className="block space-y-1">
                    <span className="text-[12px] font-medium text-slate-700 dark:text-white/80">
                      State / Union Territory (36 covered)
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
                      className="min-h-[44px] w-full rounded-2xl border border-black/15 bg-white/75 px-3.5 text-[14px] text-slate-900 dark:border-white/20 dark:bg-[#231C52] dark:text-white"
                    >
                      {INDIA_STATES_AND_UTS.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[12px] font-medium text-slate-700 dark:text-white/80">
                      City / District
                    </span>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City name"
                      className="min-h-[44px] w-full rounded-2xl border border-black/15 bg-white/75 px-3.5 text-[14px] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedStateObj.cities.slice(0, 4).map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setCity(c.name)}
                          className="min-h-[34px] rounded-full border border-black/15 bg-white/60 px-3 text-[11px] font-medium dark:border-white/20 dark:bg-white/10"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[12px] font-medium text-slate-700 dark:text-white/80">
                      Phone Number (Optional)
                    </span>
                    <input
                      type="tel"
                      maxLength={20}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98XXXXXXXX"
                      className="min-h-[44px] w-full rounded-2xl border border-black/15 bg-white/75 px-3.5 text-[14px] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                    />
                    <p className="text-[11px] text-slate-600 dark:text-white/70">
                      Stored privately in your encrypted Firestore contact vault. Shared with a requester <strong>only</strong> when you accept a blood request.
                    </p>
                  </label>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="min-h-[48px] flex-1 rounded-full border border-black/15 bg-white/70 text-[13px] font-medium dark:border-white/20 dark:bg-white/10"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="min-h-[48px] flex-[2] rounded-full bg-[#5B3FE0] text-[14px] font-semibold text-white"
                    >
                      Review DPDP Consent
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3.5">
                  <div className="rounded-2xl border border-[#34D399]/35 bg-[#34D399]/10 p-3.5">
                    <div className="flex items-center gap-2 font-semibold text-[#047857] dark:text-[#34D399]">
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      <span className="text-[13px]">DPDP Act 2023 Consent Notice</span>
                    </div>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-slate-700 dark:text-white/80">
                      Purpose: Voluntary blood donor/recipient matching, emergency blood bank coordination, and eligibility tracking in India. Zero ad trackers.
                    </p>
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/10 bg-white/60 p-3 dark:border-white/15 dark:bg-white/[0.08]">
                    <input
                      type="checkbox"
                      checked={acceptedAge}
                      onChange={(e) => setAcceptedAge(e.target.checked)}
                      className="mt-1 h-5 w-5 accent-[#5B3FE0]"
                    />
                    <span className="text-[12px] leading-snug">
                      <strong>Required:</strong> I confirm that I am <strong>18 years or older</strong> (born {dobYear}) and legally eligible to create a voluntary LifeDrop account.
                    </span>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/10 bg-white/60 p-3 dark:border-white/15 dark:bg-white/[0.08]">
                    <input
                      type="checkbox"
                      checked={acceptedPrivacy}
                      onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                      className="mt-1 h-5 w-5 accent-[#5B3FE0]"
                    />
                    <span className="text-[12px] leading-snug">
                      <strong>Required:</strong> I agree to the{' '}
                      <button
                        type="button"
                        onClick={() => onOpenLegal('privacy')}
                        className="font-semibold underline"
                      >
                        Privacy Policy
                      </button>{' '}
                      and{' '}
                      <button
                        type="button"
                        onClick={() => onOpenLegal('terms')}
                        className="font-semibold underline"
                      >
                        Terms of Use
                      </button>
                      , and consent to storing my profile for blood coordination.
                    </span>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/10 bg-white/60 p-3 dark:border-white/15 dark:bg-white/[0.08]">
                    <input
                      type="checkbox"
                      checked={acceptedAlerts}
                      onChange={(e) => setAcceptedAlerts(e.target.checked)}
                      className="mt-1 h-5 w-5 accent-[#5B3FE0]"
                    />
                    <span className="text-[12px] leading-snug">
                      <strong>Optional:</strong> Allow matching with nearby urgent blood requests in {selectedStateObj.name}.
                    </span>
                  </label>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="min-h-[48px] flex-1 rounded-full border border-black/15 bg-white/70 text-[13px] font-medium dark:border-white/20 dark:bg-white/10"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={savingOnboarding || !acceptedAge || !acceptedPrivacy}
                      className="min-h-[48px] flex-[2] rounded-full bg-[#34D399] px-4 text-[14px] font-semibold text-[#09291E] disabled:opacity-50"
                    >
                      {savingOnboarding ? 'Saving Profile...' : 'Accept & Save Profile'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
