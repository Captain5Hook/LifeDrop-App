import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Droplets,
  MapPin,
  ShieldCheck,
  WifiOff,
  X,
  XCircle,
} from 'lucide-react';
import { MEDICAL_REVIEW_CONFIG } from '../config/medicalReview';
import { ORDERED_BLOOD_GROUPS, type BloodGroup } from '../data/seedStats';
import { useVisualViewportHeight } from '../hooks/useVisualViewport';
import {
  COMPATIBILITY_DISCLAIMER,
  getCompatibleDonorGroups,
  getCompatibleRecipientGroups,
  getComponentCompatibilitySpec,
  type BloodComponent,
} from '../services/compatibilityService';

interface CompatibilityCheckerModalProps {
  isOpen: boolean;
  initialGroup?: BloodGroup;
  onClose: () => void;
  onFindOnMap?: (group: BloodGroup) => void;
}

const COMPONENTS: BloodComponent[] = [
  'Whole Blood',
  'PRBC',
  'Platelets',
  'Plasma',
];

export const CompatibilityCheckerModal: React.FC<
  CompatibilityCheckerModalProps
> = ({ isOpen, initialGroup = 'O+', onClose, onFindOnMap }) => {
  const vvHeight = useVisualViewportHeight();
  const [selectedGroup, setSelectedGroup] = useState<BloodGroup>(initialGroup);
  const [selectedComponent, setSelectedComponent] =
    useState<BloodComponent>('Whole Blood');
  const [mode, setMode] = useState<'receive' | 'donate'>('receive');

  useEffect(() => {
    if (isOpen) {
      setSelectedGroup(initialGroup);
    }
  }, [isOpen, initialGroup]);

  if (!isOpen) return null;

  const spec = getComponentCompatibilitySpec(selectedComponent);
  const compatibleReceiveFrom = getCompatibleDonorGroups(
    selectedGroup,
    selectedComponent,
  );
  const compatibleDonateTo = getCompatibleRecipientGroups(
    selectedGroup,
    selectedComponent,
  );
  const activeMatches =
    mode === 'receive' ? compatibleReceiveFrom : compatibleDonateTo;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="compat-checker-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        style={vvHeight ? { maxHeight: `${vvHeight}px` } : undefined}
        className="ld-bg-sky flex h-[100dvh] max-h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden text-slate-900 shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:rounded-[32px] sm:border sm:border-white/20 dark:text-white"
      >
        {/* Fixed Header */}
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-black/10 px-4 pt-[max(0.85rem,env(safe-area-inset-top,0px))] pb-3 dark:border-white/15">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#059669] dark:text-[#34D399]">
              <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
              Works Offline · No AI Call
            </p>
            <h2
              id="compat-checker-title"
              className="truncate text-[18px] font-semibold"
            >
              ABO / Rh Compatibility Checker
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Compatibility Checker"
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/70 dark:border-white/20 dark:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="ld-scroll-area flex-1 min-h-0 space-y-4 px-4 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">
          {/* Mode Toggle */}
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-black/10 bg-white/50 p-1.5 dark:border-white/15 dark:bg-white/[0.06]">
            <button
              type="button"
              onClick={() => setMode('receive')}
              className={`min-h-[42px] rounded-xl px-2 text-[12px] font-semibold transition ${
                mode === 'receive'
                  ? 'bg-[#5B3FE0] text-white shadow'
                  : 'text-slate-700 dark:text-white/75'
              }`}
            >
              Patient Receives From
            </button>
            <button
              type="button"
              onClick={() => setMode('donate')}
              className={`min-h-[42px] rounded-xl px-2 text-[12px] font-semibold transition ${
                mode === 'donate'
                  ? 'bg-[#5B3FE0] text-white shadow'
                  : 'text-slate-700 dark:text-white/75'
              }`}
            >
              Donor Can Give To
            </button>
          </div>

          {/* Blood Group Selector */}
          <section className="ld-glass space-y-2.5 rounded-[24px] p-4">
            <p className="text-[12px] font-semibold text-slate-700 dark:text-white/80">
              {mode === 'receive'
                ? '1. Select Patient Blood Group'
                : '1. Select Donor Blood Group'}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {ORDERED_BLOOD_GROUPS.map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setSelectedGroup(bg)}
                  className={`min-h-[44px] rounded-2xl text-[14px] font-bold transition ${
                    selectedGroup === bg
                      ? 'bg-[#5B3FE0] text-white shadow-md'
                      : 'border border-black/10 bg-white/70 text-slate-900 dark:border-white/15 dark:bg-white/10 dark:text-white'
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>
          </section>

          {/* Component Selector */}
          <section className="ld-glass space-y-2.5 rounded-[24px] p-4">
            <p className="text-[12px] font-semibold text-slate-700 dark:text-white/80">
              2. Select Blood Component
            </p>
            <div className="grid grid-cols-2 gap-2">
              {COMPONENTS.map((comp) => (
                <button
                  key={comp}
                  type="button"
                  onClick={() => setSelectedComponent(comp)}
                  className={`min-h-[42px] rounded-2xl px-3 text-[12px] font-semibold transition ${
                    selectedComponent === comp
                      ? 'bg-[#34D399] text-[#09291E]'
                      : 'border border-black/10 bg-white/70 text-slate-900 dark:border-white/15 dark:bg-white/10 dark:text-white'
                  }`}
                >
                  {comp}
                </button>
              ))}
            </div>
            <p className="text-[12px] leading-relaxed text-slate-700 dark:text-white/80">
              <strong>{spec.label}:</strong> {spec.clinicalNote}
            </p>
          </section>

          {/* 8-Group Compatibility Matrix */}
          <section className="ld-glass space-y-3 rounded-[24px] p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-[#F43F5E]" aria-hidden="true" />
                <h3 className="text-[14px] font-semibold">
                  {mode === 'receive'
                    ? `${selectedGroup} (${selectedComponent}) receives from:`
                    : `${selectedGroup} (${selectedComponent}) donates to:`}
                </h3>
              </div>
              <span className="rounded-full bg-[#34D399]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#047857] dark:text-[#34D399]">
                {activeMatches.length} / 8 match
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {ORDERED_BLOOD_GROUPS.map((bg) => {
                const ok = activeMatches.includes(bg);
                return (
                  <div
                    key={bg}
                    className={`flex flex-col items-center justify-center rounded-2xl border px-2 py-2.5 text-center ${
                      ok
                        ? 'border-[#34D399]/60 bg-[#34D399]/20 text-[#047857] dark:text-[#34D399]'
                        : 'border-black/10 bg-white/40 text-slate-500 opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/50'
                    }`}
                  >
                    <span className="text-[14px] font-bold">{bg}</span>
                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold">
                      {ok ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          Match
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" aria-hidden="true" />
                          No
                        </>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            {onFindOnMap && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onFindOnMap(selectedGroup);
                }}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-[#5B3FE0] px-4 text-[13px] font-semibold text-white"
              >
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Find {selectedGroup} blood banks on Map
              </button>
            )}
          </section>

          {/* Disclaimer + Single-Config Version & Review Date */}
          <div className="rounded-2xl border border-black/10 bg-white/50 p-3.5 text-[12px] text-slate-700 dark:border-white/15 dark:bg-black/25 dark:text-white/80">
            <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
              <ShieldCheck className="h-4 w-4 text-[#34D399]" aria-hidden="true" />
              <span>Clinical Verification Note</span>
            </div>
            <p className="mt-1">{COMPATIBILITY_DISCLAIMER}</p>
            <p className="mt-1 text-[11px] opacity-80">
              {MEDICAL_REVIEW_CONFIG.getVersionAndReviewLine()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
