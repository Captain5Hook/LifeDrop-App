import React, { useEffect, useState } from 'react';
import { FileText, Mail, ShieldCheck, X } from 'lucide-react';
import { useVisualViewportHeight } from '../hooks/useVisualViewport';

export type LegalTab = 'privacy' | 'terms' | 'grievance';

interface LegalPrivacyModalsProps {
  isOpen: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
}

export const LegalPrivacyModals: React.FC<LegalPrivacyModalsProps> = ({
  isOpen,
  initialTab = 'privacy',
  onClose,
}) => {
  const vvHeight = useVisualViewportHeight();
  const [tab, setTab] = useState<LegalTab>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div
        style={vvHeight ? { maxHeight: `${vvHeight}px` } : undefined}
        className="ld-glass-sheet flex max-h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[32px] border border-white/20 text-slate-900 shadow-2xl sm:max-h-[90dvh] sm:rounded-[32px] dark:text-white"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/10 px-5 pt-4 pb-3 dark:border-white/15">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#34D399]" aria-hidden="true" />
            <h2 id="legal-modal-title" className="text-[19px] font-light">
              Privacy, Terms &amp; Grievance
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close legal information"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex shrink-0 gap-1.5 border-b border-black/10 px-5 py-2.5 dark:border-white/10">
          {(
            [
              { id: 'privacy', label: 'Privacy (DPDP)' },
              { id: 'terms', label: 'Terms of Use' },
              { id: 'grievance', label: 'Grievance' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`min-h-[38px] flex-1 rounded-full px-3 text-[12px] font-medium transition ${
                tab === item.id
                  ? 'bg-[#5B3FE0] text-white'
                  : 'bg-black/10 text-slate-800 dark:bg-white/10 dark:text-white/80'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="ld-scroll-area flex-1 min-h-0 space-y-3 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-[13px] leading-relaxed">
          {tab === 'privacy' && (
            <>
              <p className="font-semibold text-slate-900 dark:text-white">
                Digital Personal Data Protection (DPDP) Act 2023 Summary
              </p>
              <p className="text-slate-700 dark:text-white/80">
                LifeDrop collects only the minimum details needed for voluntary blood coordination in India: your chosen display name, role, blood group (self-reported until lab-confirmed), state/city, birth year (to verify 18+ eligibility), and optional phone number.
              </p>
              <div className="rounded-2xl border border-black/10 bg-white/60 p-3.5 dark:border-white/15 dark:bg-white/[0.08]">
                <p className="font-medium">How your contact &amp; location stay protected:</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-slate-700 dark:text-white/75">
                  <li>
                    Your email, phone number, and birth year are stored in a restricted private contact subcollection readable only by your signed-in account.
                  </li>
                  <li>
                    Phone numbers are never displayed publicly on maps or profiles and are shared with a requester only when you explicitly accept an SOS request.
                  </li>
                  <li>
                    GPS coordinates stay coarse (rounded to ~2 km) on your device unless you turn sharing off or delete them.
                  </li>
                  <li>
                    Zero third-party ad networks, analytics brokers, or tracking SDKs are used.
                  </li>
                </ul>
              </div>
              <p className="text-slate-700 dark:text-white/80">
                You may <strong>download a JSON copy</strong> of your data, <strong>withdraw consent</strong>, or <strong>permanently delete</strong> your account and all Firestore records at any time from your Profile screen.
              </p>
            </>
          )}

          {tab === 'terms' && (
            <>
              <div className="flex items-center gap-2 font-semibold">
                <FileText className="h-4 w-4 text-[#C4B5FD]" aria-hidden="true" />
                <span>Voluntary Community Terms of Use</span>
              </div>
              <ul className="list-disc space-y-2 pl-4 text-slate-700 dark:text-white/80">
                <li>
                  <strong>18+ Requirement:</strong> Registered accounts are strictly for adults aged 18 years or older in compliance with Indian NBTC blood donation rules.
                </li>
                <li>
                  <strong>Voluntary &amp; Unpaid Only:</strong> Buying, selling, or soliciting money for blood or blood components is illegal in India and strictly prohibited on LifeDrop.
                </li>
                <li>
                  <strong>Not a Medical Diagnosis:</strong> Eligibility checks and first-aid guides follow general public health references. Only an authorized blood bank medical officer confirms final fitness to donate.
                </li>
                <li>
                  <strong>Blood Bank Accounts:</strong> Self-registered Blood Bank roles remain unverified until SBTC license review and approval by a Platform Admin.
                </li>
              </ul>
            </>
          )}

          {tab === 'grievance' && (
            <>
              <p className="font-semibold text-slate-900 dark:text-white">
                Grievance Officer &amp; Data Protection Contact
              </p>
              <p className="text-slate-700 dark:text-white/80">
                For privacy complaints, consent withdrawal assistance, inaccurate blood bank reports, or data erasure requests under the DPDP Act 2023:
              </p>
              <div className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/15 dark:bg-white/[0.08]">
                <p className="font-semibold">LifeDrop Grievance Desk (India)</p>
                <p className="mt-1 text-slate-700 dark:text-white/80">
                  Designated Grievance Contact: Project Maintainer
                </p>
                <p className="mt-2 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#5B3FE0] px-4 text-[13px] font-medium text-white">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  <span>[grievance-contact@example.com]</span>
                </p>
                <p className="mt-2 text-[12px] text-slate-600 dark:text-white/65">
                  Configure an active maintainer contact email before public launch. Acknowledgement target: within 48 hours · Resolution target: within 15 working days.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
