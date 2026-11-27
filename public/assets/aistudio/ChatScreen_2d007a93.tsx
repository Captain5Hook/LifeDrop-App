import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Droplets,
  Languages,
  Phone,
  Send,
  ShieldAlert,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import { MEDICAL_REVIEW_CONFIG } from '../config/medicalReview';
import { ORDERED_BLOOD_GROUPS, type BloodGroup } from '../data/seedStats';
import type { AppLanguage } from '../hooks/useAppSettings';
import {
  chatService,
  type AssistantReply,
} from '../services/chatService';
import {
  getCompatibleDonorGroups,
  getCompatibleRecipientGroups,
  type BloodComponent,
} from '../services/compatibilityService';

interface ChatScreenProps {
  language: AppLanguage;
  onChangeLanguage: (lang: AppLanguage) => void;
  isOnline: boolean;
  onOpenBleedingEmergency: () => void;
  onOpenSosWithGroup?: () => void;
  onFindGroupOnMap: (group: BloodGroup) => void;
  onOpenCompatibilityChecker?: (group?: BloodGroup) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  meta?: AssistantReply;
}

const QUICK_PROMPTS: Record<AppLanguage, string[]> = {
  en: [
    'Who can donate blood?',
    'Who can donate to AB-?',
    'Wait time after tattoo?',
    'Heavy bleeding won\'t stop',
    'Plasma compatibility for O+',
    'How protected is my phone?',
  ],
  hi: [
    'रक्तदान कौन कर सकता है?',
    'दोबारा रक्तदान में कितना अंतर?',
    'तेज खून बह रहा है क्या करें?',
    'प्लेटलेट्स और प्लाज्मा में अंतर',
  ],
  kn: [
    'ರಕ್ತದಾನ ಮಾಡಲು ಅರ್ಹತೆ ಏನು?',
    'ಮತ್ತೆ ರಕ್ತದಾನ ಮಾಡಲು ಎಷ್ಟು ದಿನ?',
    'ತೀವ್ರ ರಕ್ತಸ್ರಾವ ನಿಲ್ಲದಿದ್ದರೆ ಏನು ಮಾಡಬೇಕು?',
    'ಗೌಪ್ಯತೆ ಮತ್ತು ಫೋನ್ ಸುರಕ್ಷತೆ ಹೇಗೆ?',
  ],
};

const ChatScreen: React.FC<ChatScreenProps> = ({
  language,
  onChangeLanguage,
  isOnline,
  onOpenBleedingEmergency,
  onFindGroupOnMap,
  onOpenCompatibilityChecker,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Namaste! I am the LifeDrop Assistant. I work completely offline for blood eligibility, deferrals, ABO/Rh compatibility, DPDP privacy, and severe bleeding triage in English, हिन्दी, and ಕನ್ನಡ.',
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [showCompatWidget, setShowCompatWidget] = useState(false);
  const [widgetGroup, setWidgetGroup] = useState<BloodGroup>('O-');
  const [widgetComponent, setWidgetComponent] =
    useState<BloodComponent>('Whole Blood');
  const [activeBleedingBanner, setActiveBleedingBanner] = useState(false);

  const listEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showCompatWidget]);

  const sendQuery = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || thinking) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    try {
      const reply = await chatService.ask(trimmed, language, isOnline);
      if (reply.bleedingEmergency) {
        setActiveBleedingBanner(true);
      }
      if (reply.compatibilityFocus) {
        setWidgetGroup(reply.compatibilityFocus.group);
        setWidgetComponent(reply.compatibilityFocus.component);
        setShowCompatWidget(true);
      }
      setMessages((prev) => [
        ...prev,
        {
          id: reply.id,
          sender: 'assistant',
          text: reply.text,
          meta: reply,
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const widgetDonors = getCompatibleDonorGroups(widgetGroup, widgetComponent);
  const widgetRecipients = getCompatibleRecipientGroups(
    widgetGroup,
    widgetComponent,
  );

  return (
    <div className="flex flex-1 min-h-0 flex-col pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-[calc(76px+env(safe-area-inset-bottom,0px))]">
      {/* Fixed Header */}
      <header className="shrink-0 space-y-2 border-b border-black/10 px-4 pb-3 dark:border-white/15">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#5B3FE0] text-white shadow-md">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-[19px] font-light text-slate-900 dark:text-white">
                LifeDrop Assistant
              </h1>
              <p className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-white/70">
                {!isOnline ? (
                  <>
                    <WifiOff className="h-3 w-3 text-[#FBBF24]" /> Offline KB Ready
                  </>
                ) : chatService.isGeminiWorkerConfigured() ? (
                  <>
                    <Sparkles className="h-3 w-3 text-[#34D399]" /> Offline KB + Gemini Flash
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 text-[#34D399]" /> Offline Multilingual KB Active
                  </>
                )}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-white/60">
                {MEDICAL_REVIEW_CONFIG.getVersionAndReviewLine()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-full bg-black/10 p-1 dark:bg-white/10">
            <Languages className="ml-1.5 h-3.5 w-3.5 text-slate-600 dark:text-white/70" />
            {(
              [
                { code: 'en', label: 'EN' },
                { code: 'hi', label: 'हिं' },
                { code: 'kn', label: 'ಕನ್' },
              ] as const
            ).map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => onChangeLanguage(l.code)}
                className={`min-h-[32px] rounded-full px-2.5 text-[11px] font-semibold ${
                  language === l.code
                    ? 'bg-[#5B3FE0] text-white'
                    : 'text-slate-700 dark:text-white/75'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sticky Bleeding Emergency Alert Banner when trauma detected */}
        {activeBleedingBanner && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#F43F5E]/50 bg-[#F43F5E] p-2.5 text-white shadow-lg"
          >
            <div className="flex items-center gap-2 text-[12px] font-semibold">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>Bleeding detected — call 108/112 now</span>
            </div>
            <div className="flex items-center gap-1.5">
              <a
                href="tel:108"
                className="inline-flex min-h-[34px] items-center gap-1 rounded-full bg-white px-3 text-[11px] font-bold text-[#9F1239]"
              >
                <Phone className="h-3 w-3" /> 108
              </a>
              <button
                type="button"
                onClick={onOpenBleedingEmergency}
                className="min-h-[34px] rounded-full bg-black/25 px-3 text-[11px] font-semibold text-white"
              >
                First-Aid Steps
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Scrollable Chat History + Compatibility Quick-Checker */}
      <div className="ld-scroll-area flex-1 min-h-0 space-y-3 px-4 py-3">
        {/* Quick Prompts + Compatibility Toggle */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setShowCompatWidget((v) => !v)}
            className={`inline-flex min-h-[36px] items-center gap-1 rounded-full border px-3 text-[11px] font-semibold transition ${
              showCompatWidget
                ? 'border-[#34D399] bg-[#34D399] text-[#09291E]'
                : 'border-black/15 bg-white/70 text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white'
            }`}
          >
            <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
            Compatibility Widget
          </button>

          {QUICK_PROMPTS[language].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => void sendQuery(q)}
              className="min-h-[36px] rounded-full border border-black/10 bg-white/60 px-3 text-[11px] font-medium text-slate-800 hover:bg-white/90 dark:border-white/15 dark:bg-white/[0.08] dark:text-white/90"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Inline Compatibility Quick-Checker Widget */}
        {showCompatWidget && (
          <div className="ld-glass space-y-3 rounded-[24px] p-4 text-slate-900 dark:text-white">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-semibold">
                Quick Compatibility Checker
              </p>
              <div className="flex items-center gap-2.5">
                {onOpenCompatibilityChecker && (
                  <button
                    type="button"
                    onClick={() => onOpenCompatibilityChecker(widgetGroup)}
                    className="text-[11px] font-semibold text-[#059669] underline dark:text-[#34D399]"
                  >
                    Full Offline Screen
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onFindGroupOnMap(widgetGroup)}
                  className="text-[11px] font-semibold text-[#5B3FE0] underline dark:text-[#C4B5FD]"
                >
                  Find {widgetGroup} on Map
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {ORDERED_BLOOD_GROUPS.map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setWidgetGroup(bg)}
                  className={`min-h-[36px] rounded-full text-[12px] font-semibold ${
                    widgetGroup === bg
                      ? 'bg-[#5B3FE0] text-white'
                      : 'bg-black/10 dark:bg-white/10'
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {(
                ['Whole Blood', 'PRBC', 'Platelets', 'Plasma'] as const
              ).map((comp) => (
                <button
                  key={comp}
                  type="button"
                  onClick={() => setWidgetComponent(comp)}
                  className={`min-h-[34px] rounded-xl text-[11px] font-medium ${
                    widgetComponent === comp
                      ? 'bg-[#34D399] font-semibold text-[#09291E]'
                      : 'bg-black/10 dark:bg-white/10'
                  }`}
                >
                  {comp}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-xl bg-white/65 p-2.5 dark:bg-white/[0.08]">
                <p className="font-semibold text-[#047857] dark:text-[#34D399]">
                  Receives from:
                </p>
                <p className="mt-0.5 font-medium">{widgetDonors.join(', ')}</p>
              </div>
              <div className="rounded-xl bg-white/65 p-2.5 dark:bg-white/[0.08]">
                <p className="font-semibold text-[#5B3FE0] dark:text-[#C4B5FD]">
                  Donates to:
                </p>
                <p className="mt-0.5 font-medium">{widgetRecipients.join(', ')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[88%] rounded-[22px] px-4 py-3 text-[13px] leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#5B3FE0] text-white shadow-md'
                    : msg.meta?.bleedingEmergency
                      ? 'border border-[#F43F5E]/50 bg-[#F43F5E]/20 text-slate-900 dark:text-white'
                      : msg.meta?.medicalGuardrailTriggered
                        ? 'border border-[#FBBF24]/50 bg-[#FBBF24]/15 text-slate-900 dark:text-white'
                        : 'ld-glass text-slate-900 dark:text-white'
                }`}
              >
                {msg.meta?.matchedTopicTitle && (
                  <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider opacity-80">
                    <span>{msg.meta.matchedTopicTitle}</span>
                    <span>
                      {msg.meta.source === 'gemini-worker'
                        ? 'Gemini'
                        : msg.meta.source === 'triage'
                          ? 'Life-Safety'
                          : 'Offline KB'}
                    </span>
                  </div>
                )}

                <p className="whitespace-pre-line">{msg.text}</p>

                {msg.meta?.bleedingEmergency && (
                  <button
                    type="button"
                    onClick={onOpenBleedingEmergency}
                    className="mt-2.5 flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-full bg-[#F43F5E] px-3 text-[12px] font-semibold text-white"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Open Offline Bleeding Guide
                  </button>
                )}

                {msg.meta?.medicalGuardrailTriggered && (
                  <a
                    href="tel:108"
                    className="mt-2.5 flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-full bg-[#FBBF24] px-3 text-[12px] font-semibold text-[#291D04]"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Call 108 Ambulance
                  </a>
                )}

                {msg.meta && (
                  <p className="mt-2 border-t border-black/10 pt-1.5 text-[10px] opacity-75 dark:border-white/15">
                    {msg.meta.disclaimer}
                  </p>
                )}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex justify-start">
              <div className="ld-glass rounded-[22px] px-4 py-2.5 text-[12px] text-slate-700 dark:text-white/75">
                Checking LifeDrop knowledge base...
              </div>
            </div>
          )}
          <div ref={listEndRef} />
        </div>
      </div>

      {/* Composer Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendQuery(input);
        }}
        className="shrink-0 border-t border-black/10 px-4 py-2.5 dark:border-white/15"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              language === 'hi'
                ? 'रक्तदान, पात्रता या मदद पूछें...'
                : language === 'kn'
                  ? 'ರಕ್ತದಾನ ಅಥವಾ ತುರ್ತು ಸಹಾಯ ಕೇಳಿ...'
                  : 'Ask about eligibility, ABO/Rh, or first aid...'
            }
            aria-label="Ask LifeDrop Assistant"
            className="min-h-[44px] flex-1 rounded-full border border-black/15 bg-white/80 px-4 text-[13px] text-slate-900 placeholder:text-slate-500 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/55"
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            aria-label="Send message"
            className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-[#5B3FE0] text-white shadow-md disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatScreen;
