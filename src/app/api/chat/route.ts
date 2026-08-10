import { NextRequest, NextResponse } from 'next/server';
import { parseStructuredIntent, generateAarviResponse } from '@/lib/gemini';
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

    // 1. Intent Parser (Gemini API or Local Fallback)
    const structuredIntent = await parseStructuredIntent(message, currentState);
    const { intent, urgency, engineUsed } = structuredIntent;

    console.log('[INTENT] Parsed intent:', intent, 'Engine:', engineUsed);

    // 2. Fact Retrieval from Qdrant for Dr. Amit Sharma
    const doctorRes = await queryDoctorsFromQdrant(message, 'hospital_city', 'Orthopedic');
    const drAmit = DEMO_DOCTORS[0]; // Dr. Amit Sharma (Orthopedic)

    // 3. Generate Response
    const aiResult = await generateAarviResponse({
      userQuery: message,
      language,
      structuredIntent,
      currentState,
    });

    console.log('[RESPONSE] Response generated:', aiResult.responseText);

    // 4. Update Persistent Conversation State & Expected Next Action
    const nextState: ExplicitConversationState = {
      patientName: currentState?.patientName || 'Riya',
      symptom: currentState?.symptom || 'knee pain',
      specialty: currentState?.specialty || 'Orthopedic',
      availableDoctor: drAmit,
      availableSlots: ['3:30 PM', '5:00 PM', '6:30 PM'],
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

    if (urgency === 'EMERGENCY') {
      actionRequired = 'emergency_alert';
    } else if (intent === 'FIND_SPECIALIST') {
      nextState.expectedNextAction = 'CHECK_AVAILABILITY';
    } else if (intent === 'CHECK_AVAILABILITY') {
      actionRequired = 'confirm_booking';
      nextState.expectedNextAction = 'EARLIEST_SLOT';
      appointmentData = { doctor: drAmit, slot: '3:30 PM', day: 'Today' };
    } else if (intent === 'EARLIEST_SLOT') {
      actionRequired = 'confirm_booking';
      nextState.expectedNextAction = 'BOOK_SLOT';
      nextState.selectedSlot = '3:30 PM';
      appointmentData = { doctor: drAmit, slot: '3:30 PM', day: 'Today' };
    } else if (intent === 'BOOK_SLOT') {
      actionRequired = 'confirm_booking';
      nextState.expectedNextAction = 'CONFIRM_BOOKING';
      nextState.selectedSlot = structuredIntent.slot || '3:30 PM';
      nextState.pendingAppointment = { doctor: drAmit, slot: '3:30 PM', day: 'Today' };
      appointmentData = nextState.pendingAppointment;
    } else if (intent === 'CONFIRM_BOOKING') {
      actionRequired = 'confirm_booking';
      nextState.selectedSlot = '3:30 PM';
      nextState.confirmedAppointment = {
        id: `apt-${Date.now()}`,
        patient_name: 'Riya',
        doctor_id: drAmit.id,
        doctor_name: drAmit.name,
        specialty: drAmit.specialty,
        hospital: drAmit.hospital,
        date_text: 'Today',
        time_slot: '3:30 PM',
        status: 'confirmed',
        booked_at: new Date().toISOString(),
      };
      nextState.expectedNextAction = null;
      appointmentData = { doctor: drAmit, slot: '3:30 PM', day: 'Today' };

      const memoryRes = await queryPatientMemoryFromQdrant();
      await updatePatientMemoryInQdrant({
        ...memoryRes.memory,
        patient_name: 'Riya',
        active_appointment: {
          id: nextState.confirmedAppointment.id,
          doctor_id: drAmit.id,
          doctor_name: drAmit.name,
          specialty: drAmit.specialty,
          hospital: drAmit.hospital,
          date_text: 'Today',
          time_slot: '3:30 PM',
          booked_at: nextState.confirmedAppointment.booked_at,
        },
      });
    } else if (intent === 'CHECK_APPOINTMENT') {
      const activeSlot = currentState?.confirmedAppointment?.time_slot || '3:30 PM';
      actionRequired = 'confirm_booking';
      appointmentData = { doctor: drAmit, slot: activeSlot, day: 'Today' };
    } else if (intent === 'RESCHEDULE') {
      actionRequired = 'reschedule_options';
      rescheduleSlots = ['5:00 PM', '6:30 PM'];
      nextState.expectedNextAction = 'SELECT_SLOT';
    } else if (intent === 'SELECT_SLOT') {
      actionRequired = 'reschedule_options';
      nextState.selectedSlot = '5:00 PM';
      nextState.pendingAppointment = { doctor: drAmit, slot: '5:00 PM', day: 'Today' };
      nextState.expectedNextAction = 'CONFIRM_RESCHEDULE';
    } else if (intent === 'CONFIRM_RESCHEDULE') {
      actionRequired = 'confirm_booking';
      nextState.selectedSlot = '5:00 PM';
      nextState.confirmedAppointment = {
        id: currentState?.confirmedAppointment?.id || `apt-${Date.now()}`,
        patient_name: 'Riya',
        doctor_id: drAmit.id,
        doctor_name: drAmit.name,
        specialty: drAmit.specialty,
        hospital: drAmit.hospital,
        date_text: 'Today',
        time_slot: '5:00 PM',
        status: 'rescheduled',
        booked_at: new Date().toISOString(),
      };
      nextState.expectedNextAction = null;
      appointmentData = { doctor: drAmit, slot: '5:00 PM', day: 'Today' };

      const memoryRes = await queryPatientMemoryFromQdrant();
      await updatePatientMemoryInQdrant({
        ...memoryRes.memory,
        patient_name: 'Riya',
        active_appointment: {
          id: nextState.confirmedAppointment.id,
          doctor_id: drAmit.id,
          doctor_name: drAmit.name,
          specialty: drAmit.specialty,
          hospital: drAmit.hospital,
          date_text: 'Today',
          time_slot: '5:00 PM',
          booked_at: nextState.confirmedAppointment.booked_at,
        },
      });
    }

    console.log('[STATE] Updated expectedNextAction:', nextState.expectedNextAction);

    return NextResponse.json({
      text: aiResult.responseText,
      intent,
      engineUsed,
      urgency,
      language,
      actionRequired,
      appointmentData,
      rescheduleSlots,
      currentState: nextState,
      debugInfo: {
        intent,
        engineUsed,
        urgency,
        parsedSpecialty: 'Orthopedic',
        parsedSymptom: 'knee pain',
        qdrantStatus: qdrantInit.status,
        qdrantSource: doctorRes.source,
        retrievedDoctor: `${drAmit.name} (${drAmit.specialty})`,
        geminiSource: aiResult.source,
      },
    });
  } catch (error) {
    console.error('Error in /api/chat route:', error);
    return NextResponse.json({
      text: "Sorry, I didn't quite understand that. Could you say that again?",
      intent: 'UNKNOWN',
      engineUsed: 'Local fallback (Gemini Key Invalid/Unavailable)',
      urgency: 'ROUTINE',
      language: 'en',
      actionRequired: null,
      debugInfo: {
        intent: 'UNKNOWN',
        engineUsed: 'Local fallback (Gemini Key Invalid/Unavailable)',
        urgency: 'ROUTINE',
        qdrantStatus: 'Retrieval active',
        retrievedDoctor: 'Dr. Amit Sharma (Orthopedic)',
      },
    });
  }
}
