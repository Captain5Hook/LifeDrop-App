import React from 'react';
import { Code2, GraduationCap, HeartHandshake, ShieldCheck, X } from 'lucide-react';
import { MEDICAL_REVIEW_CONFIG } from '../config/medicalReview';
import { useVisualViewportHeight } from '../hooks/useVisualViewport';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const vvHeight = useVisualViewportHeight();
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-lifedrop-title"
    >
      <div
        style={vvHeight ? { maxHeight: `${vvHeight}px` } : undefined}
        className="ld-glass-sheet flex max-h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[32px] border border-white/20 text-slate-900 shadow-2xl sm:rounded-[32px] dark:text-white"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/10 px-5 pt-4 pb-3 dark:border-white/15">
          <h2 id="about-lifedrop-title" className="text-[20px] font-light tracking-tight">
            About LifeDrop
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close About dialog"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="ld-scroll-area flex-1 space-y-4 p-5">
          <div className="rounded-[24px] border border-black/10 bg-white/60 p-4 dark:border-white/15 dark:bg-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#5B3FE0] text-white font-semibold text-[18px]">
                P
              </div>
              <div>
                <h3 className="text-[16px] font-semibold">Punixx</h3>
                <p className="inline-flex items-center gap-1.5 text-[13px] text-slate-700 dark:text-white/78">
                  <GraduationCap className="h-4 w-4 shrink-0" aria-hidden="true" />
                  CSE (Data Science), New Horizon College of Engineering, Bengaluru
                </p>
              </div>
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-slate-700 dark:text-white/80">
              Built as a zero-cost Indian student startup PWA to connect blood recipients, voluntary donors, and verified blood banks within 3 taps.
            </p>
          </div>

          <div className="rounded-[24px] border border-black/10 bg-white/60 p-4 dark:border-white/15 dark:bg-white/[0.08]">
            <div className="flex items-center gap-2 font-semibold text-[14px]">
              <HeartHandshake className="h-4 w-4 text-[#34D399]" aria-hidden="true" />
              <span>Zero-Cost Architecture</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[12px]">
              {['React 19', 'TypeScript', 'Tailwind v4', 'Firebase Spark', 'Leaflet + OSM', 'Vite PWA'].map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-black/10 bg-white/70 px-2.5 py-1 dark:border-white/15 dark:bg-white/10"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Mandatory Medical Content Review Line (A3) */}
          <div className="rounded-[24px] border border-[#F43F5E]/35 bg-[#F43F5E]/10 p-4 text-[13px]">
            <div className="flex items-center gap-2 font-semibold text-[#E11D48] dark:text-[#FDA4AF]">
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Medical Content &amp; Safety Notice</span>
            </div>
            <p className="mt-2 leading-relaxed text-slate-800 dark:text-white/90">
              {MEDICAL_REVIEW_CONFIG.getReviewLine()}
            </p>
            <p className="mt-1.5 font-medium text-slate-900 dark:text-white">
              {MEDICAL_REVIEW_CONFIG.disclaimer}
            </p>
            <p className="mt-1 text-[12px] text-slate-600 dark:text-white/65">
              Review status: {MEDICAL_REVIEW_CONFIG.reviewedDate}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-[20px] border border-black/10 bg-white/50 px-4 py-3 text-[13px] dark:border-white/15 dark:bg-white/[0.06]">
            <span className="inline-flex items-center gap-2">
              <Code2 className="h-4 w-4 text-[#A78BFA]" aria-hidden="true" />
              LifeDrop PWA
            </span>
            <span className="text-slate-600 dark:text-white/70">v1.0 · MIT License</span>
          </div>
        </div>
      </div>
    </div>
  );
};
