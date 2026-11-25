import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  HeartHandshake,
  Info,
  X,
  XCircle,
} from 'lucide-react';
import {
  DEFAULT_ELIGIBILITY_RULES,
  POST_DONATION_CARE_TIPS,
  type EligibilityRulesConfig,
} from '../config/eligibilityRules';
import { useVisualViewportHeight } from '../hooks/useVisualViewport';
import {
  evaluateEligibility,
  type BiologicalSex,
  type EligibilityInput,
} from '../services/eligibilityService';
import { profileService } from '../services/profileService';

interface EligibilityCheckerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAge?: number;
  defaultSex?: BiologicalSex;
  lastConfirmedDonationDate?: string | null;
}

const DEFERRAL_QUESTIONS: {
  key: keyof EligibilityInput['deferrals'];
  label: string;
  hint: string;
}[] = [
  {
    key: 'feverOrIllness',
    label: 'Fever, cold, cough, or active infection today?',
    hint: 'Requires full recovery before donating',
  },
  {
    key: 'pregnantOrBreastfeeding',
    label: 'Currently pregnant or breastfeeding?',
    hint: 'Deferred for maternal iron recovery',
  },
  {
    key: 'recentTattooOrPiercing',
    label: 'Tattoo, piercing, or acupuncture in last 6 months?',
    hint: 'Standard 6-month safety waiting window',
  },
  {
    key: 'recentSurgery',
    label: 'Major surgery or blood transfusion in last 6–12 months?',
    hint: 'Requires clearance from blood bank doctor',
  },
  {
    key: 'restrictedMedication',
    label: 'Taking antibiotics, blood thinners, or insulin?',
    hint: 'Checked by on-site medical officer',
  },
  {
    key: 'recentVaccination',
    label: 'Received a vaccine in the last 14–28 days?',
    hint: 'Live vaccines carry short temporary deferral',
  },
  {
    key: 'alcoholLast24h',
    label: 'Consumed alcohol in the last 24 hours?',
    hint: 'Hydration & safety rule',
  },
];

export const EligibilityChecker: React.FC<EligibilityCheckerProps> = ({
  isOpen,
  onClose,
  defaultAge = 24,
  defaultSex = 'male',
  lastConfirmedDonationDate = null,
}) => {
  const vvHeight = useVisualViewportHeight();
  const [rules, setRules] = useState<EligibilityRulesConfig>(
    DEFAULT_ELIGIBILITY_RULES,
  );
  const [age, setAge] = useState<string>(String(defaultAge));
  const [weightKg, setWeightKg] = useState<string>('62');
  const [hbUnknown, setHbUnknown] = useState(true);
  const [haemoglobin, setHaemoglobin] = useState<string>('13.2');
  const [sex, setSex] = useState<BiologicalSex>(defaultSex);
  const [lastDonation, setLastDonation] = useState<string>(
    lastConfirmedDonationDate ?? '',
  );
  const [deferrals, setDeferrals] = useState<EligibilityInput['deferrals']>({
    feverOrIllness: false,
    pregnantOrBreastfeeding: false,
    recentTattooOrPiercing: false,
    recentSurgery: false,
    restrictedMedication: false,
    recentVaccination: false,
    alcoholLast24h: false,
  });
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setAge(String(defaultAge));
    setSex(defaultSex);
    setLastDonation(lastConfirmedDonationDate ?? '');
    void profileService.getEligibilityRules().then(setRules);
  }, [isOpen, defaultAge, defaultSex, lastConfirmedDonationDate]);

  if (!isOpen) return null;

  const parsedAge = Number.parseInt(age, 10) || 0;
  const parsedWeight = Number.parseFloat(weightKg) || 0;
  const parsedHb = hbUnknown ? null : Number.parseFloat(haemoglobin) || 0;

  const evaluation = evaluateEligibility(
    {
      age: parsedAge,
      weightKg: parsedWeight,
      haemoglobinGdL: parsedHb,
      sex,
      lastConfirmedDonationDate: lastDonation.trim() || null,
      deferrals,
    },
    rules,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="eligibility-checker-title"
    >
      <div
        style={vvHeight ? { maxHeight: `${vvHeight}px` } : undefined}
        className="ld-glass-sheet flex max-h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[32px] border border-white/20 text-slate-900 shadow-2xl sm:max-h-[90dvh] sm:rounded-[32px] dark:text-white"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/10 px-5 pt-4 pb-3 dark:border-white/15">
          <div className="flex items-center gap-2">
            <ClipboardCheck
              className="h-5 w-5 text-[#34D399]"
              aria-hidden="true"
            />
            <h2 id="eligibility-checker-title" className="text-[19px] font-light">
              Donor Eligibility Checker
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close eligibility checker"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="ld-scroll-area flex-1 min-h-0 space-y-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {/* Result Card */}
          <div
            role="status"
            className={`rounded-[24px] border p-4 ${
              evaluation.status === 'eligible'
                ? 'border-[#34D399]/40 bg-[#34D399]/15'
                : evaluation.status === 'deferred'
                  ? 'border-[#FBBF24]/45 bg-[#FBBF24]/15'
                  : 'border-[#F43F5E]/45 bg-[#F43F5E]/15'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {evaluation.status === 'eligible' ? (
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#059669] dark:text-[#34D399]"
                  aria-hidden="true"
                />
              ) : evaluation.status === 'deferred' ? (
                <AlertTriangle
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#B45309] dark:text-[#FBBF24]"
                  aria-hidden="true"
                />
              ) : (
                <XCircle
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#BE123C] dark:text-[#F43F5E]"
                  aria-hidden="true"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">{evaluation.headline}</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[12px] text-slate-800 dark:text-white/85">
                  {evaluation.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Core vitals */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-slate-700 dark:text-white/80">
                Age ({rules.minAge}–{rules.maxAge} yrs)
              </span>
              <input
                type="number"
                min={10}
                max={95}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="min-h-[44px] w-full rounded-2xl border border-black/15 bg-white/75 px-3 text-[14px] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-slate-700 dark:text-white/80">
                Weight (kg, min {rules.minWeightKg})
              </span>
              <input
                type="number"
                min={25}
                max={200}
                step="0.5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="min-h-[44px] w-full rounded-2xl border border-black/15 bg-white/75 px-3 text-[14px] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
              />
            </label>
          </div>

          {/* Biological Sex for gap rule */}
          <div className="space-y-1.5">
            <span className="text-[12px] font-medium text-slate-700 dark:text-white/80">
              Donation interval rule (Biological sex)
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'male', label: 'Male (3 mo)' },
                  { id: 'female', label: 'Female (4 mo)' },
                  { id: 'other', label: 'Other (4 mo)' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSex(opt.id)}
                  className={`min-h-[44px] rounded-2xl border px-2 text-[12px] font-medium transition ${
                    sex === opt.id
                      ? 'border-[#5B3FE0] bg-[#5B3FE0] text-white'
                      : 'border-black/15 bg-white/70 text-slate-800 dark:border-white/20 dark:bg-white/10 dark:text-white/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Haemoglobin */}
          <div className="space-y-2 rounded-[22px] border border-black/10 bg-white/60 p-3.5 dark:border-white/15 dark:bg-white/[0.08]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium">
                Haemoglobin (&gt;= {rules.minHaemoglobinGdL} g/dL)
              </span>
              <button
                type="button"
                onClick={() => setHbUnknown((v) => !v)}
                className={`min-h-[36px] rounded-full px-3 text-[12px] font-medium ${
                  hbUnknown
                    ? 'bg-[#5B3FE0] text-white'
                    : 'bg-black/10 text-slate-800 dark:bg-white/10 dark:text-white/80'
                }`}
              >
                {hbUnknown ? 'Check at bank' : 'Enter value'}
              </button>
            </div>
            {!hbUnknown && (
              <input
                type="number"
                step="0.1"
                min={5}
                max={20}
                value={haemoglobin}
                onChange={(e) => setHaemoglobin(e.target.value)}
                aria-label="Haemoglobin value in g/dL"
                className="min-h-[44px] w-full rounded-2xl border border-black/15 bg-white/80 px-3 text-[14px] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
              />
            )}
          </div>

          {/* Last confirmed donation date */}
          <label className="block space-y-1">
            <span className="text-[12px] font-medium text-slate-700 dark:text-white/80">
              Last bank-confirmed donation date (optional)
            </span>
            <input
              type="date"
              value={lastDonation}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setLastDonation(e.target.value)}
              className="min-h-[44px] w-full rounded-2xl border border-black/15 bg-white/75 px-3 text-[14px] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
            />
          </label>

          {/* 7 Deferral Questions */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-slate-700 dark:text-white/85">
              Quick Safety Screening (7 Deferral Checks)
            </h3>
            <div className="space-y-2">
              {DEFERRAL_QUESTIONS.map((q) => {
                const active = deferrals[q.key];
                return (
                  <button
                    key={q.key}
                    type="button"
                    role="switch"
                    aria-checked={active}
                    onClick={() =>
                      setDeferrals((prev) => ({
                        ...prev,
                        [q.key]: !prev[q.key],
                      }))
                    }
                    className={`flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition ${
                      active
                        ? 'border-[#FBBF24]/50 bg-[#FBBF24]/15'
                        : 'border-black/10 bg-white/60 dark:border-white/15 dark:bg-white/[0.06]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium leading-snug">
                        {q.label}
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-white/65">
                        {q.hint}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${
                        active
                          ? 'bg-[#FBBF24] text-[#291D04]'
                          : 'bg-black/10 text-slate-700 dark:bg-white/15 dark:text-white/80'
                      }`}
                    >
                      {active ? 'Yes' : 'No'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Post-Donation Care Tips */}
          <div className="rounded-[22px] border border-black/10 bg-white/60 p-3.5 dark:border-white/15 dark:bg-white/[0.08]">
            <button
              type="button"
              onClick={() => setShowTips((v) => !v)}
              className="flex min-h-[40px] w-full items-center justify-between text-left text-[13px] font-semibold"
            >
              <span className="inline-flex items-center gap-2">
                <HeartHandshake
                  className="h-4 w-4 text-[#34D399]"
                  aria-hidden="true"
                />
                Post-Donation Care Tips
              </span>
              <span className="text-[12px] text-[#5B3FE0] dark:text-[#C4B5FD]">
                {showTips ? 'Hide' : 'View'}
              </span>
            </button>
            {showTips && (
              <ul className="mt-2 list-disc space-y-1.5 pl-4 text-[12px] text-slate-700 dark:text-white/80">
                {POST_DONATION_CARE_TIPS.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Guideline & Medical Notices */}
          <div className="rounded-2xl border border-black/10 bg-black/5 p-3 text-[11px] leading-relaxed text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/75">
            <p className="flex items-start gap-1.5 font-medium">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{evaluation.guidelineNotice}</span>
            </p>
            <p className="mt-1">{evaluation.disclaimer}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
