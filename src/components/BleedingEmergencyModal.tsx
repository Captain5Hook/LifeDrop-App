import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Hand,
  HeartPulse,
  Layers,
  PhoneCall,
  ShieldAlert,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import { MEDICAL_REVIEW_CONFIG } from '../config/medicalReview';
import bleedingData from '../data/knowledge/bleedingFirstAid.json';
import type { AppLanguage } from '../hooks/useAppSettings';
import { useVisualViewportHeight } from '../hooks/useVisualViewport';

interface BleedingEmergencyModalProps {
  isOpen: boolean;
  language: AppLanguage;
  onChangeLanguage: (lang: AppLanguage) => void;
  onClose: () => void;
}

const STEP_ICONS: Record<string, React.ReactNode> = {
  shield: <ShieldAlert className="h-8 w-8 text-[#F43F5E]" aria-hidden="true" />,
  hand: <Hand className="h-8 w-8 text-[#F43F5E]" aria-hidden="true" />,
  layers: <Layers className="h-8 w-8 text-[#F43F5E]" aria-hidden="true" />,
  user: <HeartPulse className="h-8 w-8 text-[#F43F5E]" aria-hidden="true" />,
  alert: <AlertTriangle className="h-8 w-8 text-[#FBBF24]" aria-hidden="true" />,
  band: <ShieldAlert className="h-8 w-8 text-[#F43F5E]" aria-hidden="true" />,
  heart: <HeartPulse className="h-8 w-8 text-[#F43F5E]" aria-hidden="true" />,
  ban: <AlertTriangle className="h-8 w-8 text-[#FBBF24]" aria-hidden="true" />,
};

export const BleedingEmergencyModal: React.FC<BleedingEmergencyModalProps> = ({
  isOpen,
  language,
  onChangeLanguage,
  onClose,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [showSpecialCases, setShowSpecialCases] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const vvHeight = useVisualViewportHeight();

  const stopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  useEffect(() => {
    if (!isOpen) stopSpeech();
    return () => stopSpeech();
  }, [isOpen, stepIndex, language]);

  if (!isOpen) return null;

  const steps = bleedingData.steps;
  const currentStep = steps[stepIndex];

  const handleReadAloud = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      stopSpeech();
      return;
    }

    const text = `${currentStep.title[language]}. ${currentStep.body[language]}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang =
      language === 'hi' ? 'hi-IN' : language === 'kn' ? 'kn-IN' : 'en-IN';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-md sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bleeding-emergency-title"
    >
      <div
        style={vvHeight ? { maxHeight: `${vvHeight}px` } : undefined}
        className="flex h-full max-h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-[#1B1330] text-white shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:rounded-[32px] sm:border sm:border-[#F43F5E]/40"
      >
        {/* Top emergency header */}
        <div className="shrink-0 bg-gradient-to-r from-[#BE123C] to-[#E11D48] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="h-5 w-5 shrink-0 text-white" aria-hidden="true" />
              <h2 id="bleeding-emergency-title" className="truncate text-[17px] font-semibold">
                Bleeding Emergency First Aid
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Bleeding Emergency guide"
              className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/35"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-1 text-[13px] font-medium leading-snug text-white/95">
            {bleedingData.openingLine[language]}
          </p>
        </div>

        {/* Language & Mode Switcher */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-2">
          <div className="flex items-center gap-1 rounded-full bg-white/10 p-1" role="group" aria-label="Language">
            {(
              [
                { code: 'en', label: 'EN' },
                { code: 'hi', label: 'हिन्दी' },
                { code: 'kn', label: 'ಕನ್ನಡ' },
              ] as const
            ).map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => onChangeLanguage(lang.code)}
                className={`min-h-[36px] rounded-full px-3 text-[12px] font-medium transition ${
                  language === lang.code
                    ? 'bg-[#5B3FE0] text-white'
                    : 'text-white/75 hover:text-white'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowSpecialCases((v) => !v)}
            className="min-h-[40px] rounded-full border border-white/20 px-3 text-[12px] font-medium text-white/90 hover:bg-white/10 whitespace-nowrap"
          >
            {showSpecialCases ? 'Back to Step Cards' : 'Special Cases (6)'}
          </button>
        </div>

        {/* Internal scrollable body */}
        <div className="ld-scroll-area flex-1 min-h-0 p-4">
          {!showSpecialCases ? (
            <div className="space-y-4">
              <div className="rounded-[28px] border border-white/15 bg-white/[0.08] p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-[#FB7185]">
                    Step {stepIndex + 1} of {steps.length}
                  </span>

                  <button
                    type="button"
                    onClick={handleReadAloud}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-white/25"
                  >
                    {isSpeaking ? (
                      <>
                        <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-4 w-4" aria-hidden="true" />
                        Read aloud
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F43F5E]/15">
                  {STEP_ICONS[currentStep.icon] ?? STEP_ICONS.shield}
                </div>

                <h3 className="mt-3 text-[20px] font-medium leading-snug text-white">
                  {currentStep.title[language]}
                </h3>

                <p className="mt-2 text-[15px] leading-relaxed text-white/90">
                  {currentStep.body[language]}
                </p>

                <p className="mt-3 border-t border-white/10 pt-2.5 text-[12px] font-medium text-white/75">
                  {language === 'en'
                    ? MEDICAL_REVIEW_CONFIG.disclaimer
                    : bleedingData.medicalDisclaimer[language]}
                </p>
              </div>

              {/* Progress dots */}
              <div className="flex items-center justify-center gap-1.5" aria-label="Step progress">
                {steps.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={`Go to step ${idx + 1}`}
                    onClick={() => setStepIndex(idx)}
                    className={`h-2.5 rounded-full transition-all ${
                      idx === stepIndex
                        ? 'w-7 bg-[#F43F5E]'
                        : 'w-2.5 bg-white/25 hover:bg-white/45'
                    }`}
                  />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                  disabled={stepIndex === 0}
                  className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-[14px] font-medium text-white disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setStepIndex((i) => Math.min(steps.length - 1, i + 1))
                  }
                  disabled={stepIndex === steps.length - 1}
                  className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-full bg-[#5B3FE0] px-4 py-2.5 text-[14px] font-medium text-white disabled:opacity-40"
                >
                  Next step
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {bleedingData.specialCases.map((sc) => (
                <div
                  key={sc.id}
                  className="rounded-[24px] border border-white/15 bg-white/[0.08] p-4"
                >
                  <h3 className="text-[16px] font-semibold text-white">
                    {sc.title[language]}
                  </h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-white/85">
                    {sc.body[language]}
                  </p>
                  <p className="mt-2 text-[12px] font-medium text-white/70">
                    {language === 'en'
                      ? MEDICAL_REVIEW_CONFIG.disclaimer
                      : bleedingData.medicalDisclaimer[language]}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Review attribution & single-config version/review date (A3 / M7) */}
          <div className="mt-4 space-y-1 rounded-2xl border border-white/10 bg-black/25 p-3 text-[12px] text-white/75">
            <p>
              {language === 'en'
                ? MEDICAL_REVIEW_CONFIG.getReviewLine()
                : bleedingData.reviewNotice[language]}
            </p>
            <p className="text-[11px] font-medium text-white/65">
              {MEDICAL_REVIEW_CONFIG.getVersionAndReviewLine()}
            </p>
          </div>
        </div>

        {/* Permanent Call 108 & 112 (+ 104) pinned at the bottom (A0) */}
        <div className="shrink-0 border-t border-white/15 bg-[#160F29] px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="grid grid-cols-3 gap-2">
            {bleedingData.emergencyNumbers.map((item) => (
              <a
                key={item.number}
                href={`tel:${item.number}`}
                className="flex min-h-[48px] items-center justify-center gap-1 rounded-full bg-[#F43F5E] px-2 py-2 text-[13px] font-semibold text-white shadow-sm transition active:scale-95"
              >
                <PhoneCall className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">Call {item.number}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
