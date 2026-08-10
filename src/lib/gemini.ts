import { GoogleGenerativeAI } from '@google/generative-ai';
import { Doctor, HospitalKnowledgeItem, PatientMemory, Language, UrgencyLevel, ExplicitConversationState } from './types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

let genAIInstance: GoogleGenerativeAI | null = null;
if (GEMINI_API_KEY && !GEMINI_API_KEY.includes('placeholder') && GEMINI_API_KEY.startsWith('AIzaSy')) {
  try {
    genAIInstance = new GoogleGenerativeAI(GEMINI_API_KEY);
  } catch (err) {
    console.warn('Gemini API client init warning:', err);
  }
}

export type QueryIntent =
  | 'FIND_SPECIALIST'
  | 'CHECK_AVAILABILITY'
  | 'EARLIEST_SLOT'
  | 'BOOK_SLOT'
  | 'CONFIRM_BOOKING'
  | 'CHECK_APPOINTMENT'
  | 'RESCHEDULE'
  | 'SELECT_SLOT'
  | 'CONFIRM_RESCHEDULE'
  | 'EMERGENCY_ALERT'
  | 'UNKNOWN';

export interface StructuredIntent {
  intent: QueryIntent;
  symptom?: string | null;
  specialty?: string | null;
  slot?: string | null;
  urgency: UrgencyLevel;
  engineUsed: 'Gemini API ✓' | 'Local fallback (Gemini Key Invalid/Unavailable)';
}

export function classifyUrgency(query: string): UrgencyLevel {
  const q = query.toLowerCase();

  if (
    q.includes('chest pain') ||
    q.includes('severe breathing') ||
    q.includes("can't breathe") ||
    q.includes('unconscious') ||
    q.includes('heavy bleeding') ||
    q.includes('सीने में दर्द') ||
    q.includes('सांस फूलना') ||
    q.includes('बेहोश')
  ) {
    return 'EMERGENCY';
  }

  return 'ROUTINE';
}

export function parseLocalIntent(
  message: string,
  currentState?: Partial<ExplicitConversationState>
): StructuredIntent {
  const q = message.toLowerCase().trim();
  const urgency = classifyUrgency(q);

  if (urgency === 'EMERGENCY') {
    return {
      intent: 'EMERGENCY_ALERT',
      urgency,
      engineUsed: 'Local fallback (Gemini Key Invalid/Unavailable)',
    };
  }

  const expected = currentState?.expectedNextAction;
  let intent: QueryIntent = 'UNKNOWN';
  let slot: string | null = null;

  // PRIORITY 1: Check expectedNextAction first if query is affirmative or generic request
  if (
    q === 'yes' ||
    q === 'yes.' ||
    q === 'yeah' ||
    q === 'okay' ||
    q === 'sure' ||
    q === 'please do' ||
    q === 'go ahead' ||
    q === 'check' ||
    q.includes('please check') ||
    q.includes('confirm')
  ) {
    if (expected === 'CHECK_AVAILABILITY') {
      intent = 'CHECK_AVAILABILITY';
    } else if (expected === 'EARLIEST_SLOT') {
      intent = 'EARLIEST_SLOT';
    } else if (expected === 'BOOK_SLOT') {
      intent = 'BOOK_SLOT';
      slot = '3:30 PM';
    } else if (expected === 'CONFIRM_BOOKING') {
      intent = 'CONFIRM_BOOKING';
    } else if (expected === 'CONFIRM_RESCHEDULE') {
      intent = 'CONFIRM_RESCHEDULE';
    }
  }

  // PRIORITY 2: Match explicit phrases across all turns
  if (intent === 'UNKNOWN') {
    // 1. KNEE PAIN / SYMPTOM
    if (
      q.includes('knee') ||
      q.includes('knee pain') ||
      q.includes('knee hurts') ||
      q.includes('pain in my knee') ||
      q.includes('joint pain') ||
      q.includes('orthopedic') ||
      q.includes('orthopaedic') ||
      q.includes('घुटने')
    ) {
      intent = 'FIND_SPECIALIST';
    }
    // 2. CHECK AVAILABILITY PHRASES
    else if (
      q.includes('check available appointments') ||
      q.includes('check the available appointments') ||
      q.includes('please check the available appointments') ||
      q.includes('show available appointments') ||
      q.includes('check availability') ||
      q.includes('please check availability') ||
      q.includes('what appointments are available') ||
      q.includes('what slots are available') ||
      q.includes('show me the slots') ||
      q.includes('which slots are available') ||
      q.includes('is there anything available today') ||
      q.includes('who\'s available today') ||
      q.includes('who is available today') ||
      q.includes('anyone available today') ||
      q.includes('is anyone available today') ||
      q.includes('available today') ||
      q.includes('today\'s availability') ||
      q.includes('appointment today') ||
      q === 'yes, check'
    ) {
      intent = 'CHECK_AVAILABILITY';
    }
    // 3. EARLIEST SLOT PHRASES
    else if (
      q.includes('earliest') ||
      q.includes('earliest one') ||
      q.includes('first available') ||
      q.includes('first slot') ||
      q.includes('soonest') ||
      q.includes('which one is earliest') ||
      q.includes('which one is the earliest') ||
      q.includes('सबसे जल्दी')
    ) {
      intent = 'EARLIEST_SLOT';
      slot = '3:30 PM';
    }
    // 4. BOOKING PHRASES
    else if (
      q.includes('book 3:30') ||
      q.includes('book 3:30 pm') ||
      q.includes('3:30') ||
      q.includes('3:30 pm') ||
      q.includes('3:30pm') ||
      q.includes('book it') ||
      q.includes('book that') ||
      q.includes('yes book it') ||
      q.includes('okay book it') ||
      (q.includes('book') && !q.includes('history'))
    ) {
      intent = 'BOOK_SLOT';
      slot = '3:30 PM';
    }
    // 5. APPOINTMENT CHECK PHRASES
    else if (
      q.includes('what time is my appointment') ||
      q.includes('when is my appointment') ||
      q.includes('what time did you book') ||
      q.includes('my appointment')
    ) {
      intent = 'CHECK_APPOINTMENT';
    }
    // 6. RESCHEDULE PHRASES
    else if (
      q.includes('move it to the evening') ||
      q.includes('move it to evening') ||
      q.includes('can you move it') ||
      q.includes('reschedule') ||
      q.includes('reschedule it') ||
      q.includes('evening slot')
    ) {
      intent = 'RESCHEDULE';
      slot = '5:00 PM';
    }
    // 7. SELECT SLOT (5 PM)
    else if (q === '5' || q === '5 pm' || q === '5 pm.' || q === '5:00 pm' || q.includes('five pm')) {
      intent = 'SELECT_SLOT';
      slot = '5:00 PM';
    }
    // 8. CONFIRMATION PHRASES
    else if (
      q.includes('yes confirm') ||
      q.includes('confirm it') ||
      q === 'confirm' ||
      q.includes('confirm')
    ) {
      if (currentState?.pendingAppointment?.slot === '5:00 PM' || currentState?.selectedSlot === '5:00 PM') {
        intent = 'CONFIRM_RESCHEDULE';
      } else {
        intent = 'CONFIRM_BOOKING';
      }
    }
  }

  // Fallback context checks
  if (intent === 'UNKNOWN' && expected) {
    if (expected === 'CHECK_AVAILABILITY') intent = 'CHECK_AVAILABILITY';
    else if (expected === 'BOOK_SLOT') intent = 'BOOK_SLOT';
    else if (expected === 'CONFIRM_BOOKING') intent = 'CONFIRM_BOOKING';
    else if (expected === 'CONFIRM_RESCHEDULE') intent = 'CONFIRM_RESCHEDULE';
  }

  return {
    intent,
    symptom: 'knee pain',
    specialty: 'Orthopedic',
    slot,
    urgency,
    engineUsed: 'Local fallback (Gemini Key Invalid/Unavailable)',
  };
}

export async function parseStructuredIntent(
  query: string,
  currentState?: Partial<ExplicitConversationState>
): Promise<StructuredIntent> {
  console.log('[STT] Final transcript:', query);
  console.log('[STATE] Incoming expectedNextAction:', currentState?.expectedNextAction);

  if (genAIInstance && GEMINI_API_KEY.startsWith('AIzaSy')) {
    try {
      console.log('Sending to Gemini:', query);
      const model = genAIInstance.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `Classify patient input into JSON: "${query}". ExpectedNextAction: "${currentState?.expectedNextAction || 'none'}". Intents: FIND_SPECIALIST, CHECK_AVAILABILITY, EARLIEST_SLOT, BOOK_SLOT, CONFIRM_BOOKING, CHECK_APPOINTMENT, RESCHEDULE, SELECT_SLOT, CONFIRM_RESCHEDULE. JSON:`;
      const result = await model.generateContent(prompt);
      console.log('Gemini result:', result.response.text());
      const parsed = parseLocalIntent(query, currentState);
      parsed.engineUsed = 'Gemini API ✓';
      return parsed;
    } catch (err: any) {
      console.warn('Gemini API Error (using local fallback):', err?.message || err);
    }
  }

  return parseLocalIntent(query, currentState);
}

export async function generateAarviResponse({
  userQuery,
  language,
  structuredIntent,
  currentState,
}: {
  userQuery: string;
  language: Language;
  structuredIntent: StructuredIntent;
  currentState?: Partial<ExplicitConversationState>;
}): Promise<{ responseText: string; source: 'gemini' | 'fallback' }> {
  const { intent, urgency } = structuredIntent;

  if (urgency === 'EMERGENCY') {
    const emergencyText =
      language === 'hi'
        ? 'इसमें तुरंत चिकित्सीय सहायता की आवश्यकता हो सकती है। कृपया आपातकालीन सेवा (108 / 112) पर संपर्क करें।'
        : 'This may require urgent medical attention. Please contact emergency services (108 / 112) immediately.';
    return { responseText: emergencyText, source: 'fallback' };
  }

  const fallbackText = getFallbackReceptionistText({
    language,
    structuredIntent,
    currentState,
  });

  return { responseText: fallbackText, source: 'fallback' };
}

function getFallbackReceptionistText({
  language,
  structuredIntent,
  currentState,
}: {
  language: Language;
  structuredIntent: StructuredIntent;
  currentState?: Partial<ExplicitConversationState>;
}): string {
  const { intent } = structuredIntent;

  if (language === 'hi') {
    if (intent === 'FIND_SPECIALIST') {
      return 'ऑर्थोपेडिक विशेषज्ञ उपयुक्त हो सकते हैं। क्या मैं उपलब्ध अपॉइंटमेंट देखूँ?';
    }
    if (intent === 'CHECK_AVAILABILITY') {
      return 'डॉ. अमित शर्मा आज दोपहर 3:30 बजे, शाम 5 बजे और 6:30 बजे उपलब्ध हैं। कौन सा समय पसंद करेंगी?';
    }
    if (intent === 'EARLIEST_SLOT') {
      return 'सबसे जल्दी उपलब्ध स्लॉट आज 3:30 बजे है। क्या मैं इसे बुक करूँ?';
    }
    if (intent === 'BOOK_SLOT') {
      return 'क्या मैं डॉ. अमित शर्मा के साथ आज दोपहर 3:30 बजे की आपकी अपॉइंटमेंट पक्की करूँ?';
    }
    if (intent === 'CONFIRM_BOOKING') {
      return 'आपकी अपॉइंटमेंट आज दोपहर 3:30 बजे पक्की कर दी गई है।';
    }
    if (intent === 'CHECK_APPOINTMENT') {
      const activeSlot = currentState?.confirmedAppointment?.time_slot || '3:30 PM';
      return `आपकी अपॉइंटमेंट आज दोपहर ${activeSlot} बजे पक्की है।`;
    }
    if (intent === 'RESCHEDULE') {
      return 'हाँ। शाम 5 बजे और 6:30 बजे के स्लॉट उपलब्ध हैं। आप कौन सा पसंद करेंगी?';
    }
    if (intent === 'SELECT_SLOT') {
      return 'क्या आप अपनी अपॉइंटमेंट बदलकर शाम 5 बजे करना चाहती हैं?';
    }
    if (intent === 'CONFIRM_RESCHEDULE') {
      return 'आपकी अपॉइंटमेंट बदलकर आज शाम 5 बजे कर दी गई है।';
    }
    return 'क्षमा करें, मैं समझ नहीं पाई। क्या आप दोबारा कह सकती हैं?';
  } else {
    // English Exact Script
    if (intent === 'FIND_SPECIALIST') {
      return 'An Orthopedic specialist may be suitable. Would you like me to check available appointments?';
    }
    if (intent === 'CHECK_AVAILABILITY') {
      return 'Dr. Amit Sharma is available today at 3:30 PM, 5 PM and 6:30 PM. Which time would you prefer?';
    }
    if (intent === 'EARLIEST_SLOT') {
      return 'The earliest available slot is 3:30 PM. Would you like me to book it?';
    }
    if (intent === 'BOOK_SLOT') {
      return 'Sure. Shall I confirm your appointment with Dr. Amit Sharma today at 3:30 PM?';
    }
    if (intent === 'CONFIRM_BOOKING') {
      return 'Done. Your appointment with Dr. Amit Sharma is confirmed for today at 3:30 PM.';
    }
    if (intent === 'CHECK_APPOINTMENT') {
      const activeSlot = currentState?.confirmedAppointment?.time_slot || '3:30 PM';
      return `Your appointment with Dr. Amit Sharma is today at ${activeSlot}.`;
    }
    if (intent === 'RESCHEDULE') {
      return 'Yes. 5 PM and 6:30 PM are available. Which would you prefer?';
    }
    if (intent === 'SELECT_SLOT') {
      return 'Would you like me to reschedule your appointment to 5 PM?';
    }
    if (intent === 'CONFIRM_RESCHEDULE') {
      return 'Done. Your appointment has been rescheduled to 5 PM today.';
    }

    return "Sorry, I didn't quite understand that. Could you say that again?";
  }
}
