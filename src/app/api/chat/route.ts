import { NextRequest, NextResponse } from 'next/server';

import { parseStructuredIntentWithGroq, generateGroqAarviResponse, normalizeTime } from '@/lib/groq';

import {
  queryDoctorsFromQdrant,
  queryHospitalKnowledgeFromQdrant,
  queryPatientMemoryFromQdrant,
  updatePatientMemoryInQdrant,
  ensureQdrantCollections,
  ALL_10_DOCTORS,
} from '@/lib/qdrant';
import { Language, ExplicitConversationState, Doctor } from '@/lib/types';
import { DEMO_DOCTORS } from '@/lib/mockData';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, language = 'en', currentState, turnId } = body as {
      message: string;
      language: Language;
      currentState?: ExplicitConversationState;
      turnId?: string;
    };

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    console.log('[PROCESS] Processing patient message:', message, 'turnId:', turnId);
    console.log('[STATE] Incoming expectedNextAction:', currentState?.expectedNextAction);

    const qdrantInit = await ensureQdrantCollections();

    // 1. Intent Parser via Groq API (llama-3.1-8b-instant)
    const tGroqStart = performance.now();
    const structuredIntent = await parseStructuredIntentWithGroq(message, currentState);
    const tGroqEnd = performance.now();
    const groqMs = Math.max(1, Math.round(tGroqEnd - tGroqStart));

    const { intent, urgency, engineUsed, intentSource } = structuredIntent;

    console.log('[INTENT] Parsed Groq intent:', intent, 'Engine:', engineUsed, 'Source:', intentSource);

    // 2. Fact Retrieval from Qdrant using explicit Doctor Name or Specialty matching
    const msgLower = message.toLowerCase();
    let doctorByName: Doctor | undefined;
    if (msgLower.includes('kavya') || msgLower.includes('malhotra')) {
      doctorByName = ALL_10_DOCTORS.find((d) => d.name.includes('Kavya'));
    } else if (msgLower.includes('neha') || msgLower.includes('singh')) {
      doctorByName = ALL_10_DOCTORS.find((d) => d.name.includes('Neha'));
    } else if (msgLower.includes('rajesh') || msgLower.includes('srivastava')) {
      doctorByName = ALL_10_DOCTORS.find((d) => d.name.includes('Rajesh'));
    } else if (msgLower.includes('ananya') || msgLower.includes('verma')) {
      doctorByName = ALL_10_DOCTORS.find((d) => d.name.includes('Ananya'));
    } else if (msgLower.includes('sameer') || msgLower.includes('khanna')) {
      doctorByName = ALL_10_DOCTORS.find((d) => d.name.includes('Sameer'));
    } else if (msgLower.includes('ritu') || msgLower.includes('bansal')) {
      doctorByName = ALL_10_DOCTORS.find((d) => d.name.includes('Ritu'));
    } else if (msgLower.includes('vikram') || msgLower.includes('sethi')) {
      doctorByName = ALL_10_DOCTORS.find((d) => d.name.includes('Vikram'));
    } else if (msgLower.includes('tanya') || msgLower.includes('kapoor')) {
      doctorByName = ALL_10_DOCTORS.find((d) => d.name.includes('Tanya'));
    } else if (msgLower.includes('amit') || msgLower.includes('sharma')) {
      doctorByName = ALL_10_DOCTORS.find((d) => d.name.includes('Amit'));
    } else if (msgLower.includes('rohan') || msgLower.includes('mehta')) {
      doctorByName = ALL_10_DOCTORS.find((d) => d.name.includes('Rohan'));
    }

    const specialtyChanged = structuredIntent.specialty && currentState?.specialty && structuredIntent.specialty.toLowerCase() !== currentState.specialty.toLowerCase();
    const targetDoctor = doctorByName || (!specialtyChanged ? (currentState?.availableDoctor || currentState?.doctor) : null);
    const targetSpecialty =
      doctorByName?.specialty ||
      structuredIntent.specialty ||
      currentState?.specialty ||
      'General Physician';

    let qdrantMs = 45;
    let doctorSource: 'qdrant' | 'local_fallback' | 'state' = 'state';
    let selectedDoctor: Doctor;

    if (targetDoctor) {
      selectedDoctor = targetDoctor;
      doctorSource = 'state';
    } else if (structuredIntent.specialty) {
      const tQdrantStart = performance.now();
      const doctorRes = await queryDoctorsFromQdrant(message, 'hospital_city', targetSpecialty);
      const tQdrantEnd = performance.now();
      qdrantMs = Math.max(1, Math.round(tQdrantEnd - tQdrantStart));
      selectedDoctor = doctorRes.doctors[0] || ALL_10_DOCTORS.find((d) => d.specialty === targetSpecialty) || ALL_10_DOCTORS[0];
      doctorSource = doctorRes.source;
    } else {
      const tQdrantStart = performance.now();
      const doctorRes = await queryDoctorsFromQdrant(message, 'hospital_city', targetSpecialty);
      const tQdrantEnd = performance.now();
      qdrantMs = Math.max(1, Math.round(tQdrantEnd - tQdrantStart));
      selectedDoctor = doctorRes.doctors[0] || ALL_10_DOCTORS[0];
      doctorSource = doctorRes.source;
    }

    // 3. Extract requested date and available slots
    const timeExtracted = structuredIntent.slot || structuredIntent.timePreference || normalizeTime(message);
    const requestedTomorrow = message.toLowerCase().includes('tomorrow') || message.toLowerCase().includes('kal') || structuredIntent.date === 'tomorrow';
    const todaySlots = selectedDoctor.available_slots?.today || [];
    const tomorrowSlots = selectedDoctor.available_slots?.tomorrow || ['10:00 AM', '1:30 PM', '4:30 PM'];

    const isTodayUnavailable = todaySlots.length === 0;
    const activeDayText = (requestedTomorrow || isTodayUnavailable) ? 'Tomorrow' : 'Today';
    const activeSlots = (requestedTomorrow || isTodayUnavailable) ? tomorrowSlots : todaySlots;
    const earliestSlot = activeSlots[0] || '10:30 AM';

    // 4. Update Persistent Conversation State & Expected Next Action
    const activePatientName = structuredIntent.patientName || currentState?.patientName || '';
    const activePatientAge = structuredIntent.patientAge || currentState?.patientAge || '';
    const nameSuffix = activePatientName ? `, ${activePatientName}` : '';
    const nextState: ExplicitConversationState = {
      patientName: activePatientName,
      patientAge: activePatientAge,
      patientType: structuredIntent.patientType || currentState?.patientType || (activePatientAge && parseInt(activePatientAge, 10) < 18 ? 'child' : 'adult'),
      symptom: structuredIntent.symptoms?.[0] || currentState?.symptom || 'fever',
      symptoms: structuredIntent.symptoms || currentState?.symptoms || ['fever'],
      specialty: targetSpecialty,
      doctor: selectedDoctor,
      availableDoctor: selectedDoctor,
      availableSlots: activeSlots,
      selectedSlot: currentState?.selectedSlot || null,
      pendingAppointment: currentState?.pendingAppointment || null,
      confirmedAppointment: currentState?.confirmedAppointment || null,
      awaitingConfirmation: currentState?.awaitingConfirmation || false,
      expectedNextAction: currentState?.expectedNextAction || null,
      conversationStarted: true,
      lastIntent: intent,
      language,
    };

    let actionRequired:
      | 'confirm_booking'
      | 'reschedule_options'
      | 'show_medicine'
      | 'show_records'
      | 'emergency_alert'
      | 'urgent_request_created'
      | null = null;
    let appointmentData = undefined;
    let rescheduleSlots = undefined;
    let responseText = '';

    if (urgency === 'EMERGENCY' || intent === 'EMERGENCY' || intent === 'URGENT_REQUEST') {
      actionRequired = 'emergency_alert';
      responseText =
        language === 'hi'
          ? 'इसमें तुरंत चिकित्सीय सहायता की आवश्यकता हो सकती है। कृपया आपातकालीन सेवा (108 / 112) पर संपर्क करें।'
          : 'This may require urgent medical attention. Please contact emergency services (108 / 112) immediately.';
    } else if (!activePatientName) {
      if (intent === 'SET_NAME' || structuredIntent.patientName) {
        nextState.expectedNextAction = 'ASK_AGE';
        responseText =
          language === 'hi'
            ? `नमस्ते ${activePatientName}! क्या आप कृपया अपनी उम्र (आयु) भी बता सकते हैं?`
            : `Thank you, ${activePatientName}! What is your age?`;
      } else {
        nextState.expectedNextAction = 'ASK_NAME';
        responseText =
          language === 'hi'
            ? 'नमस्ते! सिटीकेयर अस्पताल में आपका स्वागत है। मैं आरवी हूँ, आपकी एआई रिसेप्शनिस्ट। क्या मैं पहले आपका पूरा नाम जान सकती हूँ?'
            : "Hello! Welcome to City Medical Center. I'm Aarvi, your AI receptionist. May I please have your full name first?";
      }
    } else if (intent === 'SET_AGE' || currentState?.expectedNextAction === 'ASK_AGE') {
      const explicitDoctorProvided = doctorByName || structuredIntent.doctorName;
      const explicitSymptomsProvided =
        structuredIntent.symptoms &&
        structuredIntent.symptoms.length > 0 &&
        structuredIntent.symptoms[0] !== 'fever' &&
        structuredIntent.symptoms[0] !== 'general consultation';

      if (explicitDoctorProvided || explicitSymptomsProvided) {
        nextState.expectedNextAction = 'CHECK_AVAILABILITY';
        if (isTodayUnavailable) {
          responseText = `Thank you, ${activePatientName} (${activePatientAge} years old). A ${targetSpecialty} specialist like ${selectedDoctor.name} is recommended. ${selectedDoctor.name} is fully booked today. Would you like me to check tomorrow's available appointments?`;
        } else {
          responseText = `Thank you, ${activePatientName} (${activePatientAge} years old). An ${targetSpecialty} specialist like ${selectedDoctor.name} is recommended. Would you like me to check available appointments?`;
        }
      } else {
        nextState.expectedNextAction = 'ASK_SYMPTOMS';
        responseText =
          language === 'hi'
            ? `धन्यवाद ${activePatientName} (${activePatientAge} वर्ष)। आज आपको क्या लक्षण या स्वास्थ्य संबंधी समस्या महसूस हो रही है?`
            : `Got it, ${activePatientName} (${activePatientAge} years old). What symptoms or health concerns are you experiencing today?`;
      }
    } else if (!activePatientAge) {
      nextState.expectedNextAction = 'ASK_AGE';
      responseText =
        language === 'hi'
          ? `नमस्ते ${activePatientName}! क्या आप कृपया अपनी उम्र (आयु) भी बता सकते हैं ताकि हम आपका विवरण दर्ज कर सकें?`
          : `Thank you, ${activePatientName}! Could you please tell me your age so we can record your details?`;
    } else if (intent === 'GREETING') {
      nextState.expectedNextAction = 'ASK_SYMPTOMS';
      responseText =
        language === 'hi'
          ? `नमस्ते ${activePatientName}! आज आपको क्या लक्षण या स्वास्थ्य संबंधी समस्या महसूस हो रही है?`
          : `Hello ${activePatientName}! What symptoms or health concerns are you experiencing today?`;
    } else if (intent === 'FIND_SPECIALIST') {
      nextState.expectedNextAction = 'CHECK_AVAILABILITY';
      nextState.selectedSlot = null;
      nextState.pendingAppointment = null;
      if (isTodayUnavailable) {
        responseText = `An ${targetSpecialty} specialist like ${selectedDoctor.name} is recommended. ${selectedDoctor.name} has no open slots today. Would you like me to check tomorrow's appointments?`;
      } else {
        responseText = `An ${targetSpecialty} specialist like ${selectedDoctor.name} is available at ${selectedDoctor.hospital}. Would you like me to check available appointments for you?`;
      }
    } else if (intent === 'CHECK_AVAILABILITY') {
      nextState.expectedNextAction = 'SELECT_SLOT';
      nextState.selectedSlot = null;
      nextState.pendingAppointment = null;
      if (isTodayUnavailable && !requestedTomorrow) {
        responseText = `${selectedDoctor.name} is fully booked today${nameSuffix}. However, slots are available tomorrow at ${tomorrowSlots.join(', ')}. Which time slot would work for you?`;
      } else {
        responseText = `Sure${nameSuffix}. ${selectedDoctor.name} is available ${activeDayText.toLowerCase()} at ${activeSlots.join(', ')}. Which time slot would you prefer?`;
      }
    } else if (intent === 'CHECK_ALTERNATIVE_SLOTS') {
      nextState.expectedNextAction = 'SELECT_SLOT';
      const curSel = currentState?.selectedSlot;
      const remainingSlots = curSel ? activeSlots.filter((s: string) => s !== curSel) : activeSlots;
      if (curSel && remainingSlots.length > 0) {
        responseText = `Yes${nameSuffix}. Other available times ${activeDayText.toLowerCase()} are ${remainingSlots.join(', ')}. Which time slot would you prefer?`;
      } else {
        responseText = `Yes${nameSuffix}. ${selectedDoctor.name} is available at ${activeSlots.join(', ')} ${activeDayText.toLowerCase()}. Which time slot would you prefer?`;
      }
    } else if (intent === 'FIND_EARLIEST_SLOT') {
      nextState.selectedSlot = earliestSlot;
      nextState.pendingAppointment = { doctor: selectedDoctor, slot: earliestSlot, day: activeDayText };
      nextState.expectedNextAction = 'CONFIRM_BOOKING';
      actionRequired = 'confirm_booking';
      appointmentData = nextState.pendingAppointment;
      responseText = `The earliest available appointment with ${selectedDoctor.name} is ${earliestSlot} (${activeDayText})${nameSuffix}. Would you like me to confirm this booking?`;
    } else if (timeExtracted || intent === 'SELECT_SLOT') {
      if (timeExtracted) {
        if (activeSlots.includes(timeExtracted)) {
          nextState.selectedSlot = timeExtracted;
          nextState.pendingAppointment = { doctor: selectedDoctor, slot: timeExtracted, day: activeDayText };
          nextState.expectedNextAction = 'CONFIRM_BOOKING';
          actionRequired = 'confirm_booking';
          appointmentData = nextState.pendingAppointment;
          responseText = `${selectedDoctor.name} is available at ${timeExtracted} (${activeDayText})${nameSuffix}. Would you like me to confirm your appointment?`;
        } else {
          nextState.expectedNextAction = 'SELECT_SLOT';
          const suggested = activeSlots[activeSlots.length - 1] || earliestSlot;
          responseText = `${timeExtracted} isn't available${nameSuffix}. ${selectedDoctor.name} has appointments at ${activeSlots.join(', ')} ${activeDayText.toLowerCase()}. Would ${suggested} work for you?`;
        }
      } else if (nextState.selectedSlot) {
        nextState.pendingAppointment = { doctor: selectedDoctor, slot: nextState.selectedSlot, day: activeDayText };
        nextState.expectedNextAction = 'CONFIRM_BOOKING';
        actionRequired = 'confirm_booking';
        appointmentData = nextState.pendingAppointment;
        responseText = `Would you like me to confirm your appointment with ${selectedDoctor.name} at ${nextState.selectedSlot} (${activeDayText})${nameSuffix}?`;
      } else if (isTodayUnavailable && !requestedTomorrow) {
        nextState.expectedNextAction = 'SELECT_SLOT';
        responseText = `${selectedDoctor.name} is not available today${nameSuffix}. Appointments are available tomorrow at ${tomorrowSlots.join(', ')}. Which time slot would you prefer?`;
      } else {
        nextState.expectedNextAction = 'SELECT_SLOT';
        responseText = `Sure${nameSuffix}. ${selectedDoctor.name} is available ${activeDayText.toLowerCase()} at ${activeSlots.join(', ')}. Which time slot would you prefer?`;
      }
    } else if (intent === 'BOOK_APPOINTMENT') {
      if (timeExtracted) {
        if (activeSlots.includes(timeExtracted)) {
          nextState.selectedSlot = timeExtracted;
          nextState.pendingAppointment = { doctor: selectedDoctor, slot: timeExtracted, day: activeDayText };
          nextState.expectedNextAction = 'CONFIRM_BOOKING';
          actionRequired = 'confirm_booking';
          appointmentData = nextState.pendingAppointment;
          responseText = `${selectedDoctor.name} is available at ${timeExtracted} (${activeDayText})${nameSuffix}. Would you like me to confirm your appointment?`;
        } else {
          nextState.expectedNextAction = 'SELECT_SLOT';
          const suggested = activeSlots[activeSlots.length - 1] || earliestSlot;
          responseText = `${timeExtracted} isn't available${nameSuffix}. ${selectedDoctor.name} has appointments at ${activeSlots.join(', ')} ${activeDayText.toLowerCase()}. Would ${suggested} work for you?`;
        }
      } else if (nextState.selectedSlot) {
        nextState.pendingAppointment = { doctor: selectedDoctor, slot: nextState.selectedSlot, day: activeDayText };
        nextState.expectedNextAction = 'CONFIRM_BOOKING';
        actionRequired = 'confirm_booking';
        appointmentData = nextState.pendingAppointment;
        responseText = `Would you like me to confirm your appointment with ${selectedDoctor.name} at ${nextState.selectedSlot} (${activeDayText})${nameSuffix}?`;
      } else if (isTodayUnavailable && !requestedTomorrow) {
        nextState.expectedNextAction = 'SELECT_SLOT';
        responseText = `${selectedDoctor.name} is not available today${nameSuffix}. Appointments are available tomorrow at ${tomorrowSlots.join(', ')}. Which time slot would you prefer?`;
      } else {
        nextState.expectedNextAction = 'SELECT_SLOT';
        responseText = `Sure${nameSuffix}. ${selectedDoctor.name} is available ${activeDayText.toLowerCase()} at ${activeSlots.join(', ')}. Which time slot would you prefer?`;
      }
    } else if (intent === 'CONFIRM_BOOKING') {
      const activeSlot = nextState.pendingAppointment?.slot || nextState.selectedSlot || earliestSlot;
      const bookedDay = nextState.pendingAppointment?.day || activeDayText;
      nextState.selectedSlot = activeSlot;
      nextState.confirmedAppointment = {
        id: `apt-${Date.now()}`,
        patient_name: activePatientName || 'Patient',
        doctor_id: selectedDoctor.id,
        doctor_name: selectedDoctor.name,
        specialty: selectedDoctor.specialty,
        hospital: selectedDoctor.hospital,
        date_text: bookedDay,
        time_slot: activeSlot,
        status: 'confirmed',
        booked_at: new Date().toISOString(),
      };
      nextState.pendingAppointment = null;
      nextState.expectedNextAction = null;
      actionRequired = 'confirm_booking';
      appointmentData = { doctor: selectedDoctor, slot: activeSlot, day: bookedDay };

      const memoryRes = await queryPatientMemoryFromQdrant();
      await updatePatientMemoryInQdrant({
        ...memoryRes.memory,
        patient_name: activePatientName || 'Patient',
        active_appointment: {
          id: nextState.confirmedAppointment.id,
          doctor_id: selectedDoctor.id,
          doctor_name: selectedDoctor.name,
          specialty: selectedDoctor.specialty,
          hospital: selectedDoctor.hospital,
          date_text: bookedDay,
          time_slot: activeSlot,
          booked_at: nextState.confirmedAppointment.booked_at,
        },
      });
      responseText = `Done${nameSuffix}! Your appointment with ${selectedDoctor.name} is confirmed for ${bookedDay.toLowerCase()} at ${activeSlot}. Thank you!`;
    } else if (intent === 'CHECK_PRESCRIPTION') {
      nextState.expectedNextAction = 'CHECK_AVAILABILITY';
      responseText =
        language === 'hi'
          ? `${selectedDoctor.name} के प्रिस्क्रिप्शन के अनुसार, आपकी अगली विज़िट 7 दिनों में (गुरुवार, 20 अगस्त 2026) तय है। क्या आप इसके लिए स्लॉट देखना चाहते हैं${nameSuffix}?`
          : `According to your prescription from ${selectedDoctor.name}, your recommended follow-up visit is in 7 days (Thursday, 20 August 2026). Would you like me to check available slots for your follow-up${nameSuffix}?`;
    } else if (intent === 'CHECK_APPOINTMENT') {
      // Read ONLY confirmedAppointment
      const confirmed = currentState?.confirmedAppointment || nextState.confirmedAppointment;
      if (confirmed) {
        actionRequired = 'confirm_booking';
        appointmentData = { doctor: selectedDoctor, slot: confirmed.time_slot, day: 'Today' };
        responseText = `Your appointment with ${confirmed.doctor_name || selectedDoctor.name} is today at ${confirmed.time_slot}.`;
      } else {
        responseText = `You don't have a confirmed appointment yet. Would you like me to check available slots for ${selectedDoctor.name}?`;
      }
    } else if (intent === 'RESCHEDULE_APPOINTMENT') {
      actionRequired = 'reschedule_options';
      rescheduleSlots = activeSlots.slice(1);
      nextState.expectedNextAction = 'SELECT_SLOT';
      responseText = `Yes. ${rescheduleSlots.join(', ')} are available. Which time would you prefer?`;
    } else {
      responseText = generateGroqAarviResponse({
        userQuery: message,
        language,
        structuredIntent,
        retrievedDoctor: selectedDoctor,
        currentState,
      }).responseText;
    }

    console.log('--------------------------------------------------');
    console.log('INTENT:', intent);
    console.log('TIME EXTRACTED:', timeExtracted || 'null');
    console.log('AVAILABLE SLOTS:', activeSlots);
    console.log('SELECTED SLOT:', nextState.selectedSlot || 'null');
    console.log('PENDING APPOINTMENT:', nextState.pendingAppointment?.slot || 'null');
    console.log('CONFIRMED APPOINTMENT:', nextState.confirmedAppointment?.time_slot || 'null');
    console.log('EXPECTED NEXT ACTION:', nextState.expectedNextAction || 'null');
    console.log('--------------------------------------------------');

    return NextResponse.json({
      text: responseText,
      intent,
      engineUsed,
      intentSource,
      urgency,
      language,
      actionRequired,
      appointmentData,
      rescheduleSlots,
      currentState: nextState,
      latencies: {
        groqMs,
        qdrantMs,
      },
      debugInfo: {
        intent,
        engineUsed,
        intentSource,
        urgency,
        parsedSpecialty: targetSpecialty,
        parsedSymptom: structuredIntent.symptoms?.[0] || 'fever',
        qdrantStatus: qdrantInit.status,
        qdrantSource: doctorSource,
        retrievedDoctor: `${selectedDoctor.name} (${selectedDoctor.specialty})`,
        groqSource: intentSource,
        groqError: structuredIntent.error || null,

        latencies: {
          groqMs,
          qdrantMs,
        },
      },
    });



  } catch (error: any) {
    console.error('Error in /api/chat route:', error);
    return NextResponse.json({
      text: "Sorry, I didn't quite understand that. Could you say that again?",
      intent: 'UNKNOWN',
      engineUsed: `Groq API Error: ${error?.message || String(error)}`,
      urgency: 'ROUTINE',
      language: 'en',
      actionRequired: null,
      debugInfo: {
        intent: 'UNKNOWN',
        engineUsed: `Groq API Error: ${error?.message || String(error)}`,
        urgency: 'ROUTINE',
        qdrantStatus: 'Retrieval active',
        retrievedDoctor: 'Dr. Amit Sharma (Orthopedic)',
      },
    });
  }
}
