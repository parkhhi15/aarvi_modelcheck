import Groq from 'groq-sdk';
import { ExplicitConversationState, Language, UrgencyLevel, Doctor } from './types';

const GROQ_MODEL = 'llama-3.1-8b-instant';

export type UnifiedQueryIntent =
  | 'FIND_SPECIALIST'
  | 'CHECK_AVAILABILITY'
  | 'FIND_EARLIEST_SLOT'
  | 'BOOK_APPOINTMENT'
  | 'SELECT_SLOT'
  | 'CHECK_ALTERNATIVE_SLOTS'
  | 'CONFIRM_BOOKING'
  | 'CHECK_APPOINTMENT'
  | 'RESCHEDULE_APPOINTMENT'
  | 'CANCEL_APPOINTMENT'
  | 'DOCTOR_INFO'
  | 'CLINIC_INFO'
  | 'URGENT_REQUEST'
  | 'GREETING'
  | 'EMERGENCY'
  | 'UNKNOWN';

export interface GroqStructuredIntent {
  intent: UnifiedQueryIntent;
  patientType?: 'adult' | 'child' | null;
  symptoms: string[];
  specialty: string | null;
  doctorName: string | null;
  date: string | null;
  timePreference: string | null;
  location: string | null;
  language: Language;
  slot?: string | null;
  urgency: UrgencyLevel;
  engineUsed: string;
  intentSource: 'Groq' | 'Local Fallback';
  error?: string | null;
}

export function normalizeTime(raw: string): string | null {
  if (!raw) return null;
  const q = raw.toLowerCase().trim();

  if (q.includes('evening')) return '6:00 PM';
  if (q.includes('10:30') || q.includes('10.30')) return '10:30 AM';
  if (q.includes('1:00') || q.includes('1.00') || q.includes('1 pm') || q.includes('1pm') || (/\b1\b/.test(q) && (q.includes('pm') || q.includes('p.m.')))) return '1:00 PM';
  if (q.includes('3:30') || q.includes('3.30')) return '3:30 PM';
  if (q.includes('5:00') || q.includes('5.00') || q.includes('5 pm') || q.includes('5pm') || (/\b5\b/.test(q) && (q.includes('pm') || q.includes('p.m.')))) return '5:00 PM';
  if (q.includes('6:00') || q.includes('6.00') || q.includes('6 pm') || q.includes('6pm') || q.includes('6 p.m.') || q.includes('6 baje') || (/\b6\b/.test(q) && (q.includes('pm') || q.includes('p.m.') || q.includes('baje')))) return '6:00 PM';

  // Standalone numbers when context implies time
  if (/\b10:30\b/.test(q)) return '10:30 AM';
  if (/\b1\b/.test(q) && !q.includes('10') && !q.includes('11') && !q.includes('12')) return '1:00 PM';
  if (/\b3:30\b/.test(q)) return '3:30 PM';
  if (/\b5\b/.test(q)) return '5:00 PM';
  if (/\b6\b/.test(q)) return '6:00 PM';

  return null;
}

const GROQ_SYSTEM_INSTRUCTION = `You are the intent-understanding engine for Aarvi, an AI clinic receptionist.

Your job is to understand what a patient wants.

You do not diagnose diseases.

Identify the user's intent and extract relevant fields such as symptoms, specialty, date, time preference, doctor name, patient type, urgency and language.

Use supplied conversation state to resolve words such as 'it', 'that one', 'he', 'earliest', and 'yes'.

Never invent doctor names, appointment availability, prices, clinic timings or medical records. These are retrieved separately from Qdrant.

Return valid JSON only.

SUPPORTED INTENTS:
- FIND_SPECIALIST: Patient mentions a symptom or asks which doctor/specialty to see.
- CHECK_AVAILABILITY: Patient asks about doctor availability, slots, or who can see them.
- FIND_EARLIEST_SLOT: Patient asks for the earliest, first, or soonest appointment slot.
- SELECT_SLOT: Patient picks a specific time slot (e.g. "3:30 PM", "6:00 PM").
- CHECK_ALTERNATIVE_SLOTS: Patient asks if there is any other time or other slots available.
- BOOK_APPOINTMENT: Patient asks to book an appointment or says "Book that".
- CONFIRM_BOOKING: Patient confirms booking (e.g. "Yes", "Yes, confirm it").
- CHECK_APPOINTMENT: Patient asks when/what time their appointment is.
- RESCHEDULE_APPOINTMENT: Patient asks to move or reschedule their appointment.
- CANCEL_APPOINTMENT: Patient asks to cancel their appointment.
- DOCTOR_INFO: Patient asks about a doctor's experience, fee, or profile.
- CLINIC_INFO: Patient asks about clinic hours or facility location.
- URGENT_REQUEST: Patient reports urgent symptoms needing priority or emergency assistance.
- GREETING: Patient says hello, hi, or good morning.
- UNKNOWN: Cannot determine intent.

SPECIALTY MAPPINGS (ROUTING ONLY, NEVER DIAGNOSE):
- Knee pain / Joint pain / Back pain -> Orthopedic
- Fever / Fatigue / Weakness / General headache -> General Physician
- Skin rash / Itching / Skin irritation -> Dermatologist
- Child fever / Child cough -> Pediatrician
- Ear pain / Throat complaint -> ENT Specialist
- Eye irritation / Eye pain -> Ophthalmologist
- Tooth pain -> Dentist
- Stomach pain / Vomiting / Digestive complaint -> Gastroenterologist
- Pregnancy check-up -> Gynecologist

REQUIRED JSON OUTPUT FORMAT:
{
  "intent": "FIND_SPECIALIST" | "CHECK_AVAILABILITY" | "FIND_EARLIEST_SLOT" | "BOOK_APPOINTMENT" | "SELECT_SLOT" | "CHECK_ALTERNATIVE_SLOTS" | "CONFIRM_BOOKING" | "CHECK_APPOINTMENT" | "RESCHEDULE_APPOINTMENT" | "CANCEL_APPOINTMENT" | "DOCTOR_INFO" | "CLINIC_INFO" | "URGENT_REQUEST" | "GREETING" | "UNKNOWN",
  "patient_type": "adult" | "child" | null,
  "symptoms": ["knee pain"],
  "specialty": "Orthopedic" | null,
  "doctor_name": null,
  "date": null,
  "time_preference": null,
  "urgency": "routine" | "urgent" | "emergency",
  "language": "en" | "hi"
}`;

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

export function parseLocalRuleIntent(
  message: string,
  currentState?: Partial<ExplicitConversationState>
): GroqStructuredIntent {
  const q = message.toLowerCase().trim();
  const urgency = classifyUrgency(q);

  if (urgency === 'EMERGENCY') {
    return {
      intent: 'EMERGENCY',
      patientType: 'adult',
      symptoms: ['emergency symptoms'],
      specialty: null,
      doctorName: null,
      date: null,
      timePreference: null,
      location: null,
      language: currentState?.language || 'en',
      urgency,
      engineUsed: 'Local Rule Engine',
      intentSource: 'Local Fallback',
    };
  }

  const expected = currentState?.expectedNextAction;
  let intent: UnifiedQueryIntent = 'UNKNOWN';
  let specialty: string | null = currentState?.specialty || null;
  let symptoms: string[] = currentState?.symptoms || (currentState?.symptom ? [currentState.symptom] : []);
  let timePreference: string | null = null;
  let slot: string | null = normalizeTime(message);

  // PRIORITY 1: Alternative Time / Alternative Slot Check (MUST override expectedNextAction!)
  if (
    q.includes('other time') ||
    q.includes('another time') ||
    q.includes('other slot') ||
    q.includes('another slot') ||
    q.includes('something later') ||
    q.includes('something earlier') ||
    q.includes('anything else available') ||
    q.includes('what other times') ||
    q.includes('another appointment') ||
    q.includes('aur koi time') ||
    q.includes('aur koi slot') ||
    q.includes('doosra time') ||
    q.includes('baad ka slot')
  ) {
    intent = 'CHECK_ALTERNATIVE_SLOTS';
  } else if (slot) {
    intent = 'SELECT_SLOT';
    timePreference = slot;
  } else if (
    q.includes('when is my appointment') ||
    q.includes('what time is my appointment') ||
    q.includes('my appointment')
  ) {
    intent = 'CHECK_APPOINTMENT';
  } else if (
    q.includes('earliest') ||
    q.includes('earliest one') ||
    q.includes('first available') ||
    q.includes('soonest') ||
    q.includes('which one is earliest')
  ) {
    intent = 'FIND_EARLIEST_SLOT';
  } else if (
    q.includes('book') ||
    q.includes('appointment') ||
    q.includes('schedule') ||
    q.includes('fix an appointment') ||
    q.includes('take an appointment') ||
    q.includes('get an appointment') ||
    q.includes('want an appointment') ||
    q.includes('need an appointment')
  ) {
    if (expected === 'SELECT_SLOT' || expected === 'CHECK_AVAILABILITY' || currentState?.doctor) {
      intent = 'CHECK_AVAILABILITY';
    } else {
      intent = 'BOOK_APPOINTMENT';
    }
  } else if (
    q.includes('evening') ||
    q.includes('evening slot')
  ) {
    intent = 'SELECT_SLOT';
    slot = '6:00 PM';
    timePreference = 'evening';
  } else if (
    q.includes('available today') ||
    q.includes('see me today') ||
    q.includes('who can see me') ||
    q.includes('check availability') ||
    q.includes('appointments available') ||
    q.includes('available slots') ||
    q.includes('slots')
  ) {
    intent = 'CHECK_AVAILABILITY';
  } else if (
    q.includes('move it') ||
    q.includes('reschedule')
  ) {
    intent = 'RESCHEDULE_APPOINTMENT';
  }

  // PRIORITY 2: Medical Specialty Rule Mapping (if intent not yet set or for symptom extraction)
  let extractedSpecialty: string | null = null;
  if (q.includes('knee') || q.includes('joint pain') || q.includes('back pain') || q.includes('orthopedic') || q.includes('घुटने')) {
    extractedSpecialty = 'Orthopedic';
    symptoms = ['knee pain'];
  } else if (q.includes('rash') || q.includes('itching') || q.includes('skin') || q.includes('dermatologist')) {
    extractedSpecialty = 'Dermatologist';
    symptoms = ['skin rash'];
  } else if ((q.includes('fever') || q.includes('weakness') || q.includes('headache') || q.includes('fatigue')) && !q.includes('child')) {
    extractedSpecialty = 'General Physician';
    symptoms = ['fever and weakness'];
  } else if (q.includes('child') || /\bkid\b/.test(q) || /\bkids\b/.test(q) || q.includes('baby')) {
    extractedSpecialty = 'Pediatrician';
    symptoms = ['child fever'];
  } else if (q.includes('ear pain') || q.includes('ear hurt') || q.includes('earache') || q.includes('throat') || /\bent\b/.test(q)) {
    extractedSpecialty = 'ENT Specialist';
    symptoms = ['ear pain'];
  } else if (/\beye\b/.test(q) || /\beyes\b/.test(q) || q.includes('ophthalmologist')) {
    extractedSpecialty = 'Ophthalmologist';
    symptoms = ['eye irritation'];
  } else if (q.includes('tooth') || q.includes('dental') || q.includes('dentist')) {
    extractedSpecialty = 'Dentist';
    symptoms = ['tooth pain'];
  } else if (q.includes('stomach') || q.includes('vomiting') || q.includes('digestive') || q.includes('gastroenterologist')) {
    extractedSpecialty = 'Gastroenterologist';
    symptoms = ['stomach pain'];
  } else if (q.includes('pregnancy') || q.includes('women') || q.includes('gynecologist')) {
    extractedSpecialty = 'Gynecologist';
    symptoms = ['pregnancy check-up'];
  } else if (q.includes('heart') || q.includes('cardiac') || q.includes('cardiologist')) {
    extractedSpecialty = 'Cardiologist';
    symptoms = ['cardiac checkup'];
  } else if (q.includes('hi') || q.includes('hello') || q.includes('namaste')) {
    if (intent === 'UNKNOWN') intent = 'GREETING';
  }

  if (extractedSpecialty) {
    specialty = extractedSpecialty;
    // If the user mentions appointment/booking along with a symptom (e.g. "I want an appointment for knee pain")
    // or if they already have an expected next action, switch directly to checking availability!
    if (
      q.includes('appointment') ||
      q.includes('book') ||
      q.includes('schedule') ||
      q.includes('available') ||
      q.includes('slot') ||
      expected === 'CHECK_AVAILABILITY'
    ) {
      intent = 'CHECK_AVAILABILITY';
    } else if (intent === 'UNKNOWN') {
      intent = 'FIND_SPECIALIST';
    }
  }

  // PRIORITY 3: Affirmative Responses & Context Disambiguation against expectedNextAction
  const isAffirmative =
    q === 'yes' ||
    q === 'yes.' ||
    q === 'yeah' ||
    q === 'yep' ||
    q === 'sure' ||
    q === 'okay' ||
    q === 'ok' ||
    q === 'please' ||
    q === 'yes please' ||
    q === 'please check' ||
    q === 'check' ||
    q === 'book' ||
    q === 'book it' ||
    q.includes('confirm') ||
    q.includes('go ahead') ||
    q.includes('i want an appointment') ||
    q.includes('appointment') ||
    q.includes('show slots') ||
    q.includes('check slots');

  if (isAffirmative && expected) {
    if (expected === 'CHECK_AVAILABILITY') intent = 'CHECK_AVAILABILITY';
    else if (expected === 'FIND_EARLIEST_SLOT') intent = 'FIND_EARLIEST_SLOT';
    else if (expected === 'SELECT_SLOT') intent = 'CHECK_AVAILABILITY';
    else if (expected === 'BOOK_APPOINTMENT' || expected === 'BOOK_SLOT') intent = 'BOOK_APPOINTMENT';
    else if (expected === 'CONFIRM_BOOKING' || expected === 'CONFIRM_RESCHEDULE') intent = 'CONFIRM_BOOKING';
  }


  return {
    intent,
    patientType: q.includes('child') ? 'child' : 'adult',
    symptoms,
    specialty,
    doctorName: null,
    date: null,
    timePreference,
    location: null,
    language: currentState?.language || 'en',
    urgency,
    engineUsed: 'Local Rule Engine',
    intentSource: 'Local Fallback',
  };
}

export async function parseStructuredIntentWithGroq(
  query: string,
  currentState?: Partial<ExplicitConversationState>
): Promise<GroqStructuredIntent> {
  const apiKey = process.env.GROQ_API_KEY || '';

  if (!apiKey || apiKey.includes('placeholder')) {
    const errorMsg = 'GROQ_API_KEY is not configured in .env.local';
    console.error('Groq Error:', errorMsg);
    const fallback = parseLocalRuleIntent(query, currentState);
    fallback.error = errorMsg;
    fallback.engineUsed = `Groq API Error: ${errorMsg}`;
    fallback.intentSource = 'Local Fallback';
    return fallback;
  }

  try {
    console.log('Groq request started');
    console.log(`Groq model: ${GROQ_MODEL}`);

    const groq = new Groq({ apiKey });

    const promptContext = {
      patientQuery: query,
      currentApplicationState: {
        patientName: currentState?.patientName || 'Riya',
        patientType: currentState?.patientType || null,
        symptoms: currentState?.symptoms || (currentState?.symptom ? [currentState.symptom] : []),
        specialty: currentState?.specialty || null,
        doctor: currentState?.doctor?.name || currentState?.availableDoctor?.name || null,
        availableSlots: currentState?.availableSlots || [],
        selectedSlot: currentState?.selectedSlot || null,
        pendingAppointment: currentState?.pendingAppointment || null,
        confirmedAppointment: currentState?.confirmedAppointment || null,
        expectedNextAction: currentState?.expectedNextAction || null,
        language: currentState?.language || 'en',
      },
    };

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: GROQ_SYSTEM_INSTRUCTION,
        },
        {
          role: 'user',
          content: JSON.stringify(promptContext),
        },
      ],
      temperature: 0.1,
    });

    console.log('Groq response received');

    const content = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    let rawIntent = parsed.intent;
    if (rawIntent === 'BOOK_SLOT') rawIntent = 'BOOK_APPOINTMENT';
    if (rawIntent === 'EARLIEST_SLOT') rawIntent = 'FIND_EARLIEST_SLOT';
    if (rawIntent === 'RESCHEDULE') rawIntent = 'RESCHEDULE_APPOINTMENT';
    if (rawIntent === 'EMERGENCY') rawIntent = 'URGENT_REQUEST';

    const intent: UnifiedQueryIntent = rawIntent || 'UNKNOWN';
    const patientType: 'adult' | 'child' | null = parsed.patient_type || (query.toLowerCase().includes('child') ? 'child' : 'adult');
    const symptoms: string[] = Array.isArray(parsed.symptoms) && parsed.symptoms.length > 0
      ? parsed.symptoms
      : currentState?.symptoms || (currentState?.symptom ? [currentState.symptom] : []);
    const specialty: string | null = parsed.specialty || currentState?.specialty || null;
    const doctorName: string | null = parsed.doctor_name || parsed.doctorName || currentState?.doctor?.name || null;
    const date: string | null = parsed.date || null;
    const timePreference: string | null = parsed.time_preference || parsed.timePreference || null;
    const location: string | null = parsed.location || null;
    const urgency: UrgencyLevel = (parsed.urgency === 'emergency' || intent === 'URGENT_REQUEST') ? 'EMERGENCY' : classifyUrgency(query);

    return {
      intent,
      patientType,
      symptoms,
      specialty,
      doctorName,
      date,
      timePreference,
      location,
      language: parsed.language || currentState?.language || 'en',
      urgency,
      engineUsed: `Groq API (${GROQ_MODEL}) ✓`,
      intentSource: 'Groq',
    };
  } catch (err: any) {
    const apiError = err?.message || String(err);
    console.error('Groq API Error during intent parsing:', apiError);

    const fallback = parseLocalRuleIntent(query, currentState);
    fallback.error = apiError;
    fallback.engineUsed = `Groq API Error: ${apiError}`;
    fallback.intentSource = 'Local Fallback';
    return fallback;
  }
}

export function generateGroqAarviResponse({
  userQuery,
  language,
  structuredIntent,
  retrievedDoctor,
  currentState,
}: {
  userQuery: string;
  language: Language;
  structuredIntent: GroqStructuredIntent;
  retrievedDoctor?: Doctor | null;
  currentState?: Partial<ExplicitConversationState>;
}): { responseText: string; source: 'groq' | 'workflow' } {
  const { intent, urgency, specialty: intentSpecialty } = structuredIntent;

  if (urgency === 'EMERGENCY') {
    const emergencyText =
      language === 'hi'
        ? 'इसमें तुरंत चिकित्सीय सहायता की आवश्यकता हो सकती है। कृपया आपातकालीन सेवा (108 / 112) पर संपर्क करें।'
        : 'This may require urgent medical attention. Please contact emergency services (108 / 112) immediately.';
    return { responseText: emergencyText, source: 'workflow' };
  }

  const doc = retrievedDoctor || currentState?.doctor || currentState?.availableDoctor;
  const docName = doc?.name || 'Dr. Amit Sharma';
  const docSpecialty = doc?.specialty || intentSpecialty || 'Orthopedic';
  const docHospital = doc?.hospital || 'Hospital';
  const docLocation = doc?.location || '';
  const slots = doc?.available_slots?.today || currentState?.availableSlots || ['3:30 PM', '5:00 PM', '6:30 PM'];
  const formattedSlots = slots.join(', ');
  const earliestSlot = slots[0] || '3:30 PM';
  const activeSlot = currentState?.confirmedAppointment?.time_slot || currentState?.selectedSlot || earliestSlot;

  if (language === 'hi') {
    if (intent === 'FIND_SPECIALIST') {
      return {
        responseText: `एक ${docSpecialty} विशेषज्ञ उपयुक्त हो सकते हैं। ${docName} (${docHospital}) उपलब्ध हैं। क्या मैं आज के अपॉइंटमेंट की जांच करूँ?`,
        source: 'workflow',
      };
    }
    if (intent === 'CHECK_AVAILABILITY') {
      return {
        responseText: `${docName} आज ${formattedSlots} बजे उपलब्ध हैं। कौन सा समय पसंद करेंगी?`,
        source: 'workflow',
      };
    }
    if (intent === 'FIND_EARLIEST_SLOT') {
      return {
        responseText: `सबसे जल्दी उपलब्ध स्लॉट आज ${earliestSlot} बजे है। क्या मैं इसे बुक करूँ?`,
        source: 'workflow',
      };
    }
    if (intent === 'BOOK_APPOINTMENT') {
      return {
        responseText: `क्या आप ${docName} के साथ आज दोपहर ${activeSlot} बजे की अपॉइंटमेंट पक्की करना चाहती हैं?`,
        source: 'workflow',
      };
    }
    if (intent === 'CONFIRM_BOOKING') {
      return {
        responseText: `हो गया। आपकी अपॉइंटमेंट आज दोपहर ${activeSlot} बजे पक्की कर दी गई है।`,
        source: 'workflow',
      };
    }
    if (intent === 'CHECK_APPOINTMENT') {
      return {
        responseText: `आपकी ${docName} के साथ अपॉइंटमेंट आज दोपहर ${activeSlot} बजे है।`,
        source: 'workflow',
      };
    }
    if (intent === 'RESCHEDULE_APPOINTMENT') {
      return {
        responseText: 'हाँ। शाम 5 बजे और 6:30 बजे उपलब्ध हैं। आप कौन सा समय पसंद करेंगी?',
        source: 'workflow',
      };
    }
    if (intent === 'SELECT_SLOT') {
      return {
        responseText: 'क्या आप अपनी अपॉइंटमेंट बदलकर शाम 5 बजे करना चाहती हैं?',
        source: 'workflow',
      };
    }
  }

  // English Responses using retrieved Qdrant doctor details
  if (intent === 'FIND_SPECIALIST') {
    const locText = docLocation ? ` in ${docLocation}` : '';
    return {
      responseText: `A ${docSpecialty} specialist may be suitable. ${docName} is available at ${docHospital}${locText}. Would you like me to check available appointments?`,
      source: 'workflow',
    };
  }

  if (intent === 'CHECK_AVAILABILITY') {
    return {
      responseText: `${docName} is available today at ${formattedSlots}. Which time would you prefer?`,
      source: 'workflow',
    };
  }

  if (intent === 'FIND_EARLIEST_SLOT') {
    return {
      responseText: `The earliest available appointment is ${earliestSlot}. Would you like me to book it?`,
      source: 'workflow',
    };
  }

  if (intent === 'BOOK_APPOINTMENT') {
    return {
      responseText: `Would you like me to confirm your appointment with ${docName} at ${activeSlot}?`,
      source: 'workflow',
    };
  }

  if (intent === 'CONFIRM_BOOKING') {
    return {
      responseText: `Done. Your appointment is confirmed for today at ${activeSlot}.`,
      source: 'workflow',
    };
  }

  if (intent === 'CHECK_APPOINTMENT') {
    return {
      responseText: `Your appointment with ${docName} is today at ${activeSlot}.`,
      source: 'workflow',
    };
  }

  if (intent === 'RESCHEDULE_APPOINTMENT') {
    return {
      responseText: 'Yes. 5 PM and 6:30 PM are available. Which would you prefer?',
      source: 'workflow',
    };
  }

  if (intent === 'SELECT_SLOT') {
    return {
      responseText: 'Would you like me to reschedule your appointment to 5 PM?',
      source: 'workflow',
    };
  }

  if (intent === 'DOCTOR_INFO') {
    return {
      responseText: `${docName} is a ${docSpecialty} with ${doc?.experience || '10 years'} experience at ${docHospital}. Consultation fee is ${doc?.consultation_fee || '₹500'}.`,
      source: 'workflow',
    };
  }

  if (intent === 'CLINIC_INFO') {
    return {
      responseText: `${docHospital} is open today from 9 AM to 8 PM. Emergency and outpatient consultations are active.`,
      source: 'workflow',
    };
  }

  // Graceful handling for UNKNOWN (Step 13) without dropping context or repeating greeting
  const expected = currentState?.expectedNextAction;
  if (expected === 'CHECK_AVAILABILITY') {
    return {
      responseText: `I didn't catch whether you'd like me to check today's appointments with ${docName}. Should I check them?`,
      source: 'workflow',
    };
  }
  if (expected === 'FIND_EARLIEST_SLOT' || expected === 'BOOK_APPOINTMENT' || expected === 'BOOK_SLOT') {
    return {
      responseText: `Would you like me to go ahead and book the ${earliestSlot} slot with ${docName}?`,
      source: 'workflow',
    };
  }
  if (expected === 'CONFIRM_BOOKING') {
    return {
      responseText: `Should I confirm your appointment with ${docName} for ${activeSlot}?`,
      source: 'workflow',
    };
  }

  return {
    responseText: "I didn't quite catch that. Could you tell me your symptom or which doctor specialty you need?",
    source: 'workflow',
  };
}

