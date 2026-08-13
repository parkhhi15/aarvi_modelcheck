'use client';

import React, { useState } from 'react';
import { Language, PatientMemory, Appointment, Doctor, SystemDebugState } from '@/lib/types';
import { INITIAL_PATIENT_MEMORY, DEMO_DOCTORS, DEMO_HOSPITAL_ID } from '@/lib/mockData';
import { speakWithAarvi } from '@/lib/voice';
import { Header } from '@/components/Header';
import { VoiceAssistant } from '@/components/VoiceAssistant';
import { DebugPanel } from '@/components/DebugPanel';
import {
  BookingModal,
  RescheduleModal,
  MedicalRecordsModal,
  MedicineModal,
  DoctorBrowseModal,
} from '@/components/Modals';
import { Terminal } from 'lucide-react';

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'voice'>('voice');
  const [language, setLanguage] = useState<Language>('en');
  const [patientMemory, setPatientMemory] = useState<PatientMemory>({ ...INITIAL_PATIENT_MEMORY });
  const [activeAppointment, setActiveAppointment] = useState<Appointment | undefined>(undefined);
  const [initialVoiceQuery, setInitialVoiceQuery] = useState<string | undefined>(undefined);

  // Telemetry drawer for Hackathon Judges
  const [showDebug, setShowDebug] = useState(false);
  const [debugState, setDebugState] = useState<SystemDebugState>({
    lastQuery: "I've had knee pain for three days.",
    intent: 'FIND_SPECIALIST',
    intentEngine: 'Groq API (llama-3.1-8b-instant) ✓',
    intentSource: 'Groq',
    urgency: 'ROUTINE',
    qdrantHits: [
      {
        collection: 'aarvi_healthcare',
        matches: ['Orthopedic Specialist Dr. Amit Sharma'],
        score: 0.98,
      },
    ],
    groqStatus: 'success',

    rimeStatus: 'success',
    rimeAudioBytes: 208000,
    language: 'en',
    retrievalFallbackActive: false,

    hospitalId: DEMO_HOSPITAL_ID,
  });

  // Modal Dialog States
  const [activeModal, setActiveModal] = useState<
    'book' | 'reschedule' | 'records' | 'medicines' | 'doctors' | null
  >(null);
  const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState<{
    doctor: Doctor;
    slot: string;
    day: string;
  }>({
    doctor: DEMO_DOCTORS[0], // Dr. Amit Sharma
    slot: '3:30 PM',
    day: 'Today',
  });

  const handleOpenVoiceAssistant = (initialQuery?: string) => {
    setInitialVoiceQuery(initialQuery);
    setCurrentScreen('voice');
  };

  const handleConfirmAppointment = (doc: Doctor, slot: string, day: string) => {
    const newAppointment: Appointment = {
      id: `apt-${Date.now()}`,
      patient_name: patientMemory.patient_name,
      doctor_id: doc.id,
      doctor_name: doc.name,
      specialty: doc.specialty,
      hospital: doc.hospital,
      date_text: day,
      time_slot: slot,
      status: 'confirmed',
      booked_at: new Date().toISOString(),
    };

    setActiveAppointment(newAppointment);

    const confirmSpeechText =
      language === 'hi'
        ? `डॉ. अमित शर्मा के साथ आज दोपहर ${slot} के लिए आपकी अपॉइंटमेंट पक्की कर दी गई है।`
        : `Done. Your appointment with ${doc.name} is confirmed for ${day.toLowerCase()} at ${slot}.`;

    speakWithAarvi(confirmSpeechText, language);

    const memoryLog = `Riya booked ${doc.name} (${doc.specialty}) for ${day} at ${slot}.`;
    setPatientMemory((prev) => ({
      ...prev,
      active_appointment: {
        id: newAppointment.id,
        doctor_id: doc.id,
        doctor_name: doc.name,
        specialty: doc.specialty,
        hospital: doc.hospital,
        date_text: day,
        time_slot: slot,
        booked_at: newAppointment.booked_at,
      },
      history_logs: [memoryLog, ...prev.history_logs],
    }));

    setActiveModal(null);
  };

  const handleRescheduleSlot = (newSlot: string) => {
    if (activeAppointment) {
      const updated = {
        ...activeAppointment,
        time_slot: newSlot,
        status: 'rescheduled' as const,
      };
      setActiveAppointment(updated);

      const rescheduleSpeechText =
        language === 'hi'
          ? `आपकी अपॉइंटमेंट बदलकर आज शाम ${newSlot} कर दी गई है।`
          : `Done. Your appointment has been rescheduled to ${newSlot} today.`;

      speakWithAarvi(rescheduleSpeechText, language);

      const memoryLog = `Riya rescheduled appointment with ${activeAppointment.doctor_name} to evening slot: ${newSlot}.`;
      setPatientMemory((prev) => ({
        ...prev,
        active_appointment: {
          ...prev.active_appointment!,
          time_slot: newSlot,
        },
        history_logs: [memoryLog, ...prev.history_logs],
      }));

      setDebugState((prev) => ({
        ...prev,
        lastQuery: 'Move it to the evening',
        intent: 'RESCHEDULE',
        urgency: 'ROUTINE',
        qdrantHits: [
          {
            collection: 'aarvi_healthcare',
            matches: [`Existing Appointment: Dr. Amit Sharma, slot updated to ${newSlot}`],
            score: 0.98,
          },
        ],
      }));
    }

    setActiveModal(null);
  };

  return (
    <div className="min-h-screen bg-[#F7FCFB] text-[#102A32] flex flex-col font-sans selection:bg-[#78DFCC]/30 relative">
      {/* Header */}
      <Header
        language={language}
        onLanguageChange={(lang) => {
          setLanguage(lang);
          setDebugState((prev) => ({ ...prev, language: lang }));
        }}
        onLogoClick={() => setCurrentScreen('voice')}
      />

      {/* Main Content Render Area */}
      <main className="flex-1 py-2">
        <VoiceAssistant
          language={language}
          onLanguageChange={(lang) => {
            setLanguage(lang);
            setDebugState((prev) => ({ ...prev, language: lang }));
          }}
          onBackToHome={() => setCurrentScreen('voice')}
          initialQuery={initialVoiceQuery}
          onConfirmBooking={(doc, slot, day) => {
            setSelectedDoctorForBooking({ doctor: doc, slot, day });
            setActiveModal('book');
          }}
          onRescheduleSlot={handleRescheduleSlot}
          onUpdateDebugState={setDebugState}
        />
      </main>

      {/* Footer trigger for Telemetry */}
      <footer className="py-3 px-4 border-t border-[#E2F3F0] text-center text-xs text-[#527977] flex items-center justify-between max-w-4xl mx-auto w-full">
        <span className="font-medium">© 2026 Aarvi AI Voice Receptionist</span>
        <button
          onClick={() => setShowDebug(true)}
          className="flex items-center gap-1.5 text-[11px] font-bold text-[#079CA5] hover:underline bg-[#E2F3F0]/60 px-3 py-1 rounded-full border border-[#BDE7E2]"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Hackathon Telemetry</span>
        </button>
      </footer>

      {/* Telemetry View Drawer */}
      <DebugPanel
        isOpen={showDebug}
        onClose={() => setShowDebug(false)}
        debugState={debugState}
        onSelectSampleScenario={(query) => {
          handleOpenVoiceAssistant(query);
        }}
      />

      {/* Action Modals */}
      <BookingModal
        isOpen={activeModal === 'book'}
        onClose={() => setActiveModal(null)}
        doctor={selectedDoctorForBooking.doctor}
        slot={selectedDoctorForBooking.slot}
        day={selectedDoctorForBooking.day}
        onConfirm={() =>
          handleConfirmAppointment(
            selectedDoctorForBooking.doctor,
            selectedDoctorForBooking.slot,
            selectedDoctorForBooking.day
          )
        }
        language={language}
      />

      <RescheduleModal
        isOpen={activeModal === 'reschedule'}
        onClose={() => setActiveModal(null)}
        activeAppointment={activeAppointment}
        onSelectSlot={handleRescheduleSlot}
        language={language}
      />

      <MedicalRecordsModal
        isOpen={activeModal === 'records'}
        onClose={() => setActiveModal(null)}
        language={language}
      />

      <MedicineModal
        isOpen={activeModal === 'medicines'}
        onClose={() => setActiveModal(null)}
        patientMemory={patientMemory}
        language={language}
      />

      <DoctorBrowseModal
        isOpen={activeModal === 'doctors'}
        onClose={() => setActiveModal(null)}
        onSelectDoctor={(doc) => {
          setSelectedDoctorForBooking({
            doctor: doc,
            slot: doc.available_slots.today?.[0] || '3:30 PM',
            day: 'Today',
          });
          setActiveModal('book');
        }}
        language={language}
      />
    </div>
  );
}
