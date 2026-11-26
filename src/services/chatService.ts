import knowledgeData from '../data/knowledge/assistantKnowledge.json';
import type { BloodGroup } from '../data/seedStats';
import type { AppLanguage } from '../hooks/useAppSettings';
import {
  getCompatibilitySummary,
  getCompatibleDonorGroups,
  getCompatibleRecipientGroups,
  type BloodComponent,
} from './compatibilityService';

export interface AssistantReply {
  id: string;
  text: string;
  source: 'triage' | 'guardrail' | 'compatibility' | 'offline-kb' | 'gemini-worker';
  language: AppLanguage;
  bleedingEmergency: boolean;
  medicalGuardrailTriggered: boolean;
  matchedTopicTitle?: string;
  compatibilityFocus?: {
    group: BloodGroup;
    component: BloodComponent;
  };
  disclaimer: string;
}

const DISCLAIMERS: Record<AppLanguage, string> = {
  en: 'Guidance only — not a substitute for a doctor or blood bank medical officer.',
  hi: 'यह केवल सामान्य मार्गदर्शन है — डॉक्टर या ब्लड बैंक अधिकारी का विकल्प नहीं।',
  kn: 'ಇದು ಕೇವಲ ಮಾರ್ಗದರ್ಶನ — ವೈದ್ಯರು ಅಥವಾ ರಕ್ತನಿಧಿ ಅಧಿಕಾರಿಯ ಪರ್ಯಾಯವಲ್ಲ.',
};

const BLEEDING_TRIGGERS = [
  'bleeding',
  'hemorrhage',
  'haemorrhage',
  'spurting',
  'wound',
  'heavy cut',
  'road accident',
  'trauma',
  'tourniquet',
  'won\'t stop bleeding',
  'severe cut',
  'khoon beh',
  'khoon nikal',
  'chot',
  'rakta',
  'रक्तस्राव',
  'खून बह',
  'खून निकल',
  'घाव',
  'चोट',
  'ರಕ್ತಸ್ರಾವ',
  'ರಕ್ತ ಬರುತ್ತಿದೆ',
  'ಗಾಯ',
];

const UNSAFE_DIAGNOSIS_TRIGGERS = [
  'diagnose',
  'diagnosis',
  'prescribe',
  'prescription',
  'dosage',
  'dose of',
  'which medicine should i take',
  'which tablet',
  'chest pain',
  'heart attack',
  'not breathing',
  'unconscious',
  'seizure',
  'poison',
  'overdose',
  'suicide',
  'निदान',
  'दवा लिखें',
  'सीने में दर्द',
  'बेहोश',
  'ರೋಗನಿರ್ಣಯ',
  'ಎದೆ ನೋವು',
  'ಪ್ರಜ್ಞೆ ತಪ್ಪಿದೆ',
];

const PROMPT_INJECTION_TRIGGERS = [
  'ignore previous instructions',
  'ignore all instructions',
  'ignore the rules',
  'forget your instructions',
  'override your rules',
  'bypass safety',
  'system prompt',
  'developer prompt',
  'reveal your prompt',
  'print your prompt',
  'print api key',
  'gemini_api_key',
  'jailbreak',
  'dan mode',
  'act as admin',
  'निर्देश भूल',
  'सिस्टम प्रॉम्प्ट',
  'ಸೂಚನೆಗಳನ್ನು ನಿರ್ಲಕ್ಷಿಸಿ',
];

const BLOOD_GROUP_REGEX = /\b(AB|A|B|O)\s*(?:([+-])|(pos(?:itive)?|neg(?:ative)?)\b)/i;

export function detectBleedingEmergency(query: string): boolean {
  const lower = query.toLowerCase();
  return BLEEDING_TRIGGERS.some((kw) => lower.includes(kw));
}

export function detectUnsafeMedicalQuery(query: string): boolean {
  const lower = query.toLowerCase();
  return UNSAFE_DIAGNOSIS_TRIGGERS.some((kw) => lower.includes(kw));
}

export function detectPromptInjection(query: string): boolean {
  const lower = query.toLowerCase();
  return PROMPT_INJECTION_TRIGGERS.some((kw) => lower.includes(kw));
}

export function detectCompatibilityIntent(query: string): {
  group: BloodGroup;
  component: BloodComponent;
} | null {
  const lower = query.toLowerCase();
  const isCompatQuestion =
    lower.includes('compatib') ||
    lower.includes('donate to') ||
    lower.includes('receive from') ||
    lower.includes('which blood groups') ||
    lower.includes('match') ||
    lower.includes('universal') ||
    lower.includes('किसको') ||
    lower.includes('किससे') ||
    lower.includes('ಯಾರಿಗೆ');

  const match = query.match(BLOOD_GROUP_REGEX);
  if (!match && !isCompatQuestion) return null;

  let group: BloodGroup = 'O+';
  if (match) {
    const abo = match[1].toUpperCase();
    const sign = match[2];
    const word = match[3]?.toLowerCase() ?? '';
    const rh = sign === '+' || word.startsWith('pos') ? '+' : '-';
    group = `${abo}${rh}` as BloodGroup;
  } else if (lower.includes('universal donor')) {
    group = 'O-';
  } else if (lower.includes('universal recipient')) {
    group = 'AB+';
  }

  let component: BloodComponent = 'Whole Blood';
  if (lower.includes('plasma') || lower.includes('ffp')) component = 'Plasma';
  else if (lower.includes('platelet')) component = 'Platelets';
  else if (lower.includes('prbc')) component = 'PRBC';

  return { group, component };
}

export function detectLanguageFromText(
  text: string,
  fallback: AppLanguage,
): AppLanguage {
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
  return fallback;
}

const GENERIC_KEYWORDS = new Set(['days', 'months', 'often', 'again', 'age', 'number']);

function searchOfflineKnowledgeBase(
  query: string,
  lang: AppLanguage,
): { title: string; answer: string } | null {
  const lower = query.toLowerCase().trim();
  let bestScore = 0;
  let bestEntry: (typeof knowledgeData.entries)[number] | null = null;

  for (const entry of knowledgeData.entries) {
    let score = 0;
    for (const kw of entry.keywords) {
      const k = kw.toLowerCase();
      if (lower.includes(k)) {
        if (GENERIC_KEYWORDS.has(k)) {
          score += 1;
        } else if (entry.category === 'deferral') {
          score += k.length > 4 ? 5 : 3;
        } else {
          score += k.length > 4 ? 3 : 2;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  if (!bestEntry || bestScore === 0) return null;
  return {
    title: bestEntry.title[lang] ?? bestEntry.title.en,
    answer: bestEntry.answer[lang] ?? bestEntry.answer.en,
  };
}

function buildBleedingResponse(lang: AppLanguage): string {
  if (lang === 'hi') {
    return 'तत्काल आपातकाल: यदि रक्तस्राव तेज है या रुक नहीं रहा है, तो अभी 108 या 112 पर कॉल करें। साफ कपड़े से घाव पर सीधा और मजबूत दबाव डालें — यदि खून आर-पार आ जाए तो पहला कपड़ा न हटाएं, ऊपर और कपड़ा रखें। नीचे दिए गए "Open Offline Bleeding Guide" बटन से 8-चरणीय प्राथमिक चिकित्सा खोलें।';
  }
  if (lang === 'kn') {
    return 'ತಕ್ಷಣದ ತುರ್ತುಸ್ಥಿತಿ: ರಕ್ತಸ್ರಾವವು ತೀವ್ರವಾಗಿದ್ದರೆ ಅಥವಾ ನಿಲ್ಲದಿದ್ದರೆ ಈಗಲೇ 108 ಅಥವಾ 112 ಗೆ ಕರೆ ಮಾಡಿ. ಸ್ವಚ್ಛವಾದ ಬಟ್ಟೆಯಿಂದ ಗಾಯದ ಮೇಲೆ ನೇರವಾಗಿ ಗಟ್ಟಿಯಾಗಿ ಒತ್ತಿ ಹಿಡಿಯಿರಿ — ಬಟ್ಟೆ ಒದ್ದೆಯಾದರೆ ಅದನ್ನು ತೆಗೆಯದೆ ಮೇಲೆ ಇನ್ನಷ್ಟು ಬಟ್ಟೆ ಸೇರಿಸಿ. ಕೆಳಗಿನ "Open Offline Bleeding Guide" ಬಟನ್ ಒತ್ತಿ.';
  }
  return 'EMERGENCY FIRST AID: Call 108 or 112 immediately if bleeding is heavy, spurting, or won\'t stop. Press firmly and directly on the wound with clean cloth — do NOT remove soaked cloth, layer more cloth on top. Tap "Open Offline Bleeding Guide" below for full step-by-step instructions and voice read-aloud.';
}

function buildGuardrailResponse(lang: AppLanguage): string {
  if (lang === 'hi') {
    return 'मैं चिकित्सीय निदान (diagnosis), दवा लिखने या खुराक की सलाह नहीं दे सकता। यदि किसी को सीने में दर्द, बेहोशी, सांस लेने में कठिनाई या गंभीर लक्षण हैं, तो कृपया तुरंत 108 / 112 पर कॉल करें या नजदीकी डॉक्टर से मिलें।';
  }
  if (lang === 'kn') {
    return 'ನಾನು ವೈದ್ಯಕೀಯ ರೋಗನಿರ್ಣಯ ಮಾಡಲು ಅಥವಾ ಔಷಧಿಗಳನ್ನು ಸೂಚಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ಎದೆ ನೋವು, ಪ್ರಜ್ಞಾಹೀನತೆ ಅಥವಾ ತೀವ್ರ ಲಕ್ಷಣಗಳಿದ್ದರೆ ತಕ್ಷಣ 108 / 112 ಗೆ ಕರೆ ಮಾಡಿ ಅಥವಾ ಹತ್ತಿರದ ವೈದ್ಯರನ್ನು ಭೇಟಿ ಮಾಡಿ.';
  }
  return 'I cannot diagnose medical conditions, prescribe medicines, or handle acute medical emergencies beyond general blood-donation information. If someone has chest pain, trouble breathing, unconsciousness, or severe symptoms, please call 108 or 112 immediately or visit the nearest hospital emergency department.';
}

function buildPromptInjectionResponse(lang: AppLanguage): string {
  if (lang === 'hi') {
    return 'सुरक्षा सूचना: मैं सिस्टम निर्देश बदलने, छिपी सेटिंग या API कुंजी दिखाने के अनुरोध पूरे नहीं कर सकता। मैं केवल रक्तदान पात्रता, ABO/Rh मिलान, रक्तस्राव प्राथमिक चिकित्सा और गोपनीयता में मदद कर सकता हूँ।';
  }
  if (lang === 'kn') {
    return 'ಸುರಕ್ಷತಾ ಸೂಚನೆ: ಸಿಸ್ಟಮ್ ನಿಯಮಗಳನ್ನು ಬದಲಾಯಿಸುವ ಅಥವಾ API ಕೀ ತೋರಿಸುವ ವಿನಂತಿಗಳನ್ನು ನಾನು ಪಾಲಿಸುವುದಿಲ್ಲ. ರಕ್ತದಾನ ಅರ್ಹತೆ, ABO/Rh ಹೊಂದಾಣಿಕೆ ಮತ್ತು ಪ್ರಥಮ ಚಿಕಿತ್ಸೆ ಬಗ್ಗೆ ಮಾತ್ರ ಕೇಳಿ.';
  }
  return 'Safety refusal: I cannot ignore safety rules, reveal internal prompts, or expose configuration/keys. I can only help with blood donation eligibility, ABO/Rh compatibility, bleeding first aid, and DPDP privacy.';
}

class HybridChatService {
  private workerUrl = (
    (import.meta as { env?: Record<string, string | undefined> }).env
      ?.VITE_CHAT_WORKER_URL
  )?.trim();

  isGeminiWorkerConfigured(): boolean {
    return Boolean(this.workerUrl && this.workerUrl.startsWith('https://'));
  }

  async ask(
    rawQuery: string,
    preferredLang: AppLanguage,
    isOnline: boolean,
  ): Promise<AssistantReply> {
    const query = rawQuery.trim();
    const lang = detectLanguageFromText(query, preferredLang);
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // 0. Prompt-injection & jailbreak refusal (runs offline & online before any routing)
    if (detectPromptInjection(query)) {
      return {
        id,
        text: buildPromptInjectionResponse(lang),
        source: 'guardrail',
        language: lang,
        bleedingEmergency: false,
        medicalGuardrailTriggered: true,
        matchedTopicTitle: 'Security Guardrail',
        disclaimer: DISCLAIMERS[lang],
      };
    }

    // 1. Highest priority: Bleeding / trauma triage (always offline & instant)
    if (detectBleedingEmergency(query)) {
      return {
        id,
        text: buildBleedingResponse(lang),
        source: 'triage',
        language: lang,
        bleedingEmergency: true,
        medicalGuardrailTriggered: false,
        matchedTopicTitle: 'Severe Bleeding Triage',
        disclaimer: DISCLAIMERS[lang],
      };
    }

    // 2. Medical safety guardrail (never diagnose, prescribe, or handle acute cardiac/overdose)
    if (detectUnsafeMedicalQuery(query)) {
      return {
        id,
        text: buildGuardrailResponse(lang),
        source: 'guardrail',
        language: lang,
        bleedingEmergency: false,
        medicalGuardrailTriggered: true,
        matchedTopicTitle: 'Medical Safety Notice',
        disclaimer: DISCLAIMERS[lang],
      };
    }

    // 3. Blood Group Compatibility quick answer
    const compat = detectCompatibilityIntent(query);
    if (compat) {
      const canReceive = getCompatibleDonorGroups(compat.group, compat.component);
      const canDonate = getCompatibleRecipientGroups(
        compat.group,
        compat.component,
      );
      return {
        id,
        text: `${getCompatibilitySummary(compat.group, compat.component)}\n• ${compat.group} can RECEIVE (${compat.component}): ${canReceive.join(', ')}\n• ${compat.group} can DONATE TO (${compat.component}): ${canDonate.join(', ')}`,
        source: 'compatibility',
        language: lang,
        bleedingEmergency: false,
        medicalGuardrailTriggered: false,
        matchedTopicTitle: `ABO/Rh Match: ${compat.group}`,
        compatibilityFocus: compat,
        disclaimer: DISCLAIMERS[lang],
      };
    }

    // 4. Offline Multilingual Knowledge Base (zero-cost, zero-network)
    const kbMatch = searchOfflineKnowledgeBase(query, lang);
    if (kbMatch) {
      return {
        id,
        text: kbMatch.answer,
        source: 'offline-kb',
        language: lang,
        bleedingEmergency: false,
        medicalGuardrailTriggered: false,
        matchedTopicTitle: kbMatch.title,
        disclaimer: DISCLAIMERS[lang],
      };
    }

    // 5. Optional Cloudflare Worker Gemini Proxy (only when online & configured)
    if (isOnline && this.isGeminiWorkerConfigured() && this.workerUrl) {
      try {
        const res = await fetch(this.workerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, language: lang }),
        });
        if (res.ok) {
          const data = (await res.json()) as { reply?: string };
          if (data.reply?.trim()) {
            return {
              id,
              text: data.reply.trim(),
              source: 'gemini-worker',
              language: lang,
              bleedingEmergency: false,
              medicalGuardrailTriggered: false,
              matchedTopicTitle: 'LifeDrop AI Assistant (Gemini Flash)',
              disclaimer: DISCLAIMERS[lang],
            };
          }
        }
      } catch {
        // Fallback gracefully to offline KB prompt if Worker is unreachable
      }
    }

    // 6. Clean fallback guiding user to covered offline topics
    const fallbackText: Record<AppLanguage, string> = {
      en: 'I can help offline with blood donation eligibility (age/weight/deferrals), 90/120-day intervals, ABO/Rh compatibility (e.g. "Who can donate to AB-?"), bleeding emergency first aid, rare groups, and DPDP privacy. Ask any question or tap a quick topic above!',
      hi: 'मैं ऑफ़लाइन भी रक्तदान पात्रता (आयु/वजन/प्रतीक्षा नियम), ABO/Rh मिलान (जैसे "AB- को कौन रक्त दे सकता है?"), रक्तस्राव प्राथमिक चिकित्सा और हेल्पलाइन 108/112/104 में मदद कर सकता हूँ।',
      kn: 'ನಾನು ಆಫ್‌ಲೈನ್‌ನಲ್ಲೂ ರಕ್ತದಾನ ಅರ್ಹತೆ (ವಯಸ್ಸು/ತೂಕ/ವಿರಾಮ ನಿಯಮಗಳು), ABO/Rh ಹೊಂದಾಣಿಕೆ, ರಕ್ತಸ್ರಾವ ಪ್ರಥಮ ಚಿಕಿತ್ಸೆ ಮತ್ತು 108/112/104 ಸಹಾಯವಾಣಿ ಕುರಿತು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ.',
    };

    return {
      id,
      text: fallbackText[lang],
      source: 'offline-kb',
      language: lang,
      bleedingEmergency: false,
      medicalGuardrailTriggered: false,
      matchedTopicTitle: 'Offline Knowledge Base',
      disclaimer: DISCLAIMERS[lang],
    };
  }
}

export const chatService = new HybridChatService();
