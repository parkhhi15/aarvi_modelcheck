import { NextRequest, NextResponse } from 'next/server';
import { parseStructuredIntentWithGroq, generateGroqAarviResponse, normalizeTime } from '@/lib/groq';

import {
  queryDoctorsFromQdrant,
  queryHospitalKnowledgeFromQdrant,
  queryPatientMemoryFromQdrant,
  updatePatientMemoryInQdrant,
  ensureQdrantCollections,
} from '@/lib/qdrant';
import { Language, ExplicitConversationState } from '@/lib/types';
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

    // 2. Fact Retrieval from Qdrant using payload filtering (payload.specialty == targetSpecialty)
    const targetSpecialty = structuredIntent.specialty || currentState?.specialty || 'Orthopedic';
    let qdrantMs = 45;
    let doctorSource: 'qdrant' | 'local_fallback' | 'state' = 'state';

    let selectedDoctor: Doctor;

    // REUSE existing doctor if already set in conversation state and specialty has not explicitly changed
    if (
      currentState?.availableDoctor &&
      (!structuredIntent.specialty || structuredIntent.specialty.toLowerCase() === currentState.specialty?.toLowerCase())
    ) {
      selectedDoctor = currentState.availableDoctor;
      doctorSource = 'state';
    } else if (
      currentState?.doctor &&
      (!structuredIntent.specialty || structuredIntent.specialty.toLowerCase() === currentState.specialty?.toLowerCase())
    ) {
      selectedDoctor = currentState.doctor;
      doctorSource = 'state';
    } else {
      const tQdrantStart = performance.now();
      const doctorRes = await queryDoctorsFromQdrant(message, 'hospital_city', targetSpecialty);
      const tQdrantEnd = performance.now();
      qdrantMs = Math.max(1, Math.round(tQdrantEnd - tQdrantStart));
      selectedDoctor = doctorRes.doctors[0] || DEMO_DOCTORS[0];
      doctorSource = doctorRes.source;
    }

    // 3. Extract time if present in user message or intent
    const timeExtracted = structuredIntent.slot || structuredIntent.timePreference || normalizeTime(message);
    const slots = selectedDoctor.available_slots?.today || ['10:30 AM', '1:00 PM', '6:00 PM'];
    const earliestSlot = slots[0] || '10:30 AM';

    // 4. Update Persistent Conversation State & Expected Next Action
    const nextState: ExplicitConversationState = {
      patientName: currentState?.patientName || 'Riya',
      patientType: structuredIntent.patientType || currentState?.patientType || 'adult',
      symptom: structuredIntent.symptoms?.[0] || currentState?.symptom || 'fever',
      symptoms: structuredIntent.symptoms || currentState?.symptoms || ['fever'],
      specialty: targetSpecialty,
      doctor: selectedDoctor,
      availableDoctor: selectedDoctor,
      availableSlots: slots,
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
    } else if (intent === 'FIND_SPECIALIST') {
      nextState.expectedNextAction = 'CHECK_AVAILABILITY';
      nextState.selectedSlot = null;
      nextState.pendingAppointment = null;
      responseText = `A ${targetSpecialty} specialist may be suitable. ${selectedDoctor.name} is available at ${selectedDoctor.hospital}. Would you like me to check available appointments?`;
    } else if (intent === 'CHECK_AVAILABILITY') {
      nextState.expectedNextAction = 'SELECT_SLOT';
      nextState.selectedSlot = null;
      nextState.pendingAppointment = null;
      responseText = `Sure. ${selectedDoctor.name} is available today at ${slots.join(', ')}. Which time would you prefer?`;
    } else if (intent === 'CHECK_ALTERNATIVE_SLOTS') {
      nextState.expectedNextAction = 'SELECT_SLOT';
      const curSel = currentState?.selectedSlot;
      const remainingSlots = curSel ? slots.filter((s) => s !== curSel) : slots;
      if (curSel && remainingSlots.length > 0) {
        responseText = `Yes. Other available times are ${remainingSlots.join(', ')}. Which time would you prefer?`;
      } else {
        responseText = `Yes. ${selectedDoctor.name} is available at ${slots.join(', ')} today. Which time would you prefer?`;
      }
    } else if (intent === 'FIND_EARLIEST_SLOT') {
      // User EXPLICITLY requested earliest slot
      nextState.selectedSlot = earliestSlot;
      nextState.pendingAppointment = { doctor: selectedDoctor, slot: earliestSlot, day: 'Today' };
      nextState.expectedNextAction = 'CONFIRM_BOOKING';
      actionRequired = 'confirm_booking';
      appointmentData = nextState.pendingAppointment;
      responseText = `The earliest available appointment with ${selectedDoctor.name} is ${earliestSlot}. Would you like me to book it?`;
    } else if (timeExtracted || intent === 'SELECT_SLOT') {
      if (timeExtracted) {
        if (slots.includes(timeExtracted)) {
          // Explicit user time ALWAYS overrides any old selectedSlot!
          nextState.selectedSlot = timeExtracted;
          nextState.pendingAppointment = { doctor: selectedDoctor, slot: timeExtracted, day: 'Today' };
          nextState.expectedNextAction = 'CONFIRM_BOOKING';
          actionRequired = 'confirm_booking';
          appointmentData = nextState.pendingAppointment;
          responseText = `${selectedDoctor.name} is available at ${timeExtracted}. Would you like me to confirm your appointment?`;
        } else {
          // Requested time is unavailable (e.g. 5 PM)
          nextState.expectedNextAction = 'SELECT_SLOT';
          const suggested = slots[slots.length - 1] || '6:00 PM';
          responseText = `${timeExtracted} isn't available. ${selectedDoctor.name} has appointments at ${slots.join(', ')} today. Would ${suggested} work for you?`;
        }
      } else if (nextState.selectedSlot) {
        nextState.pendingAppointment = { doctor: selectedDoctor, slot: nextState.selectedSlot, day: 'Today' };
        nextState.expectedNextAction = 'CONFIRM_BOOKING';
        actionRequired = 'confirm_booking';
        appointmentData = nextState.pendingAppointment;
        responseText = `Would you like me to confirm your appointment with ${selectedDoctor.name} at ${nextState.selectedSlot}?`;
      } else {
        nextState.expectedNextAction = 'SELECT_SLOT';
        responseText = `Sure. ${selectedDoctor.name} is available today at ${slots.join(', ')}. Which time would you prefer?`;
      }
    } else if (intent === 'BOOK_APPOINTMENT') {
      if (timeExtracted) {
        if (slots.includes(timeExtracted)) {
          nextState.selectedSlot = timeExtracted;
          nextState.pendingAppointment = { doctor: selectedDoctor, slot: timeExtracted, day: 'Today' };
          nextState.expectedNextAction = 'CONFIRM_BOOKING';
          actionRequired = 'confirm_booking';
          appointmentData = nextState.pendingAppointment;
          responseText = `${selectedDoctor.name} is available at ${timeExtracted}. Would you like me to confirm your appointment?`;
        } else {
          nextState.expectedNextAction = 'SELECT_SLOT';
          const suggested = slots[slots.length - 1] || '6:00 PM';
          responseText = `${timeExtracted} isn't available. ${selectedDoctor.name} has appointments at ${slots.join(', ')} today. Would ${suggested} work for you?`;
        }
      } else if (nextState.selectedSlot) {
        nextState.pendingAppointment = { doctor: selectedDoctor, slot: nextState.selectedSlot, day: 'Today' };
        nextState.expectedNextAction = 'CONFIRM_BOOKING';
        actionRequired = 'confirm_booking';
        appointmentData = nextState.pendingAppointment;
        responseText = `Would you like me to confirm your appointment with ${selectedDoctor.name} at ${nextState.selectedSlot}?`;
      } else {
        // User asked to book without choosing a slot yet
        nextState.expectedNextAction = 'SELECT_SLOT';
        responseText = `Sure. ${selectedDoctor.name} is available today at ${slots.join(', ')}. Which time would you prefer?`;
      }
    } else if (intent === 'CONFIRM_BOOKING') {
      const activeSlot = nextState.pendingAppointment?.slot || nextState.selectedSlot || earliestSlot;
      nextState.selectedSlot = activeSlot;
      nextState.confirmedAppointment = {
        id: `apt-${Date.now()}`,
        patient_name: 'Riya',
        doctor_id: selectedDoctor.id,
        doctor_name: selectedDoctor.name,
        specialty: selectedDoctor.specialty,
        hospital: selectedDoctor.hospital,
        date_text: 'Today',
        time_slot: activeSlot,
        status: 'confirmed',
        booked_at: new Date().toISOString(),
      };
      nextState.pendingAppointment = null;
      nextState.expectedNextAction = null;
      actionRequired = 'confirm_booking';
      appointmentData = { doctor: selectedDoctor, slot: activeSlot, day: 'Today' };

      const memoryRes = await queryPatientMemoryFromQdrant();
      await updatePatientMemoryInQdrant({
        ...memoryRes.memory,
        patient_name: 'Riya',
        active_appointment: {
          id: nextState.confirmedAppointment.id,
          doctor_id: selectedDoctor.id,
          doctor_name: selectedDoctor.name,
          specialty: selectedDoctor.specialty,
          hospital: selectedDoctor.hospital,
          date_text: 'Today',
          time_slot: activeSlot,
          booked_at: nextState.confirmedAppointment.booked_at,
        },
      });
      responseText = `Done. Your appointment with ${selectedDoctor.name} is confirmed for today at ${activeSlot}.`;
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
      rescheduleSlots = slots.slice(1);
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
    console.log('AVAILABLE SLOTS:', slots);
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
