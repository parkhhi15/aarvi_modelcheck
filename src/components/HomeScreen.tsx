'use client';

import React from 'react';
import { Language, PatientMemory, Appointment } from '@/lib/types';
import { DEMO_DOCTORS, DEMO_HOSPITAL_NAME } from '@/lib/mockData';
import {
  Mic,
  Calendar,
  Search,
  Clock,
  Info,
  ChevronRight,
  Sparkles,
  Building2,
  Stethoscope,
  Bone,
  CheckCircle,
} from 'lucide-react';

interface HomeScreenProps {
  language: Language;
  patientMemory: PatientMemory;
  activeAppointment?: Appointment;
  onOpenVoiceAssistant: (initialQuery?: string) => void;
  onOpenModal: (
    modalType: 'book' | 'reschedule' | 'records' | 'medicines' | 'doctors'
  ) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  language,
  activeAppointment,
  onOpenVoiceAssistant,
  onOpenModal,
}) => {
  const drAmit = DEMO_DOCTORS[0]; // Dr. Amit Sharma (Orthopedic)

  return (
    <div className="space-y-8 pb-20 animate-fade-in max-w-2xl mx-auto px-4 font-sans">
      {/* HOSPITAL BANNER */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#0D7C7B] flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            <span>{DEMO_HOSPITAL_NAME}</span>
          </span>
          <h1 className="text-3xl font-extrabold text-[#163A39] tracking-tight flex items-center gap-2 mt-1">
            <span>{language === 'hi' ? 'नमस्ते, रिया' : 'Hello, Riya'}</span>
            <span className="text-2xl">👋</span>
          </h1>
          <p className="text-xs font-medium text-[#527977] mt-0.5">
            {language === 'hi'
              ? 'आज मैं आपकी कैसे मदद कर सकती हूँ?'
              : 'How can Aarvi help you today?'}
          </p>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-[#EBF7F5] text-[#0D7C7B] border border-[#BFE8E2]">
            AI Voice Receptionist
          </span>
        </div>
      </div>

      {/* HERO VOICE ORB CARD */}
      <div className="bg-white p-8 rounded-3xl shadow-xs border border-[#E4F1EE] text-center space-y-5">
        <div className="relative inline-block my-2">
          <button
            onClick={() => onOpenVoiceAssistant()}
            className="w-28 h-28 rounded-full bg-linear-to-tr from-[#0D7C7B] to-[#22B8A5] text-white flex items-center justify-center shadow-lg shadow-[#0D7C7B]/20 hover:scale-105 active:scale-95 transition-all duration-300 relative z-10 mx-auto animate-orb-breath group"
          >
            <Mic className="w-13 h-13 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-2xl font-extrabold text-[#163A39]">Talk to Aarvi</h2>
          <p className="text-xs text-[#527977] font-medium max-w-xs mx-auto">
            {language === 'hi'
              ? 'स्वाभाविक रूप से बोलें — ठीक वैसे ही जैसे क्लीनिक रिसेप्शन पर बात करते हैं।'
              : 'Speak naturally, just like calling the clinic reception desk.'}
          </p>
        </div>

        <div>
          <button
            onClick={() => onOpenVoiceAssistant()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0D7C7B] hover:bg-[#095A59] text-white text-xs font-bold shadow-sm transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>{language === 'hi' ? 'बातचीत शुरू करें' : 'Start Conversation'}</span>
          </button>
        </div>
      </div>

      {/* TEXT-BASED DOCTOR CARD: DR. AMIT SHARMA (NO PHOTO!) */}
      <div className="bg-white p-5 rounded-3xl shadow-xs border border-[#E4F1EE] space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#527977]">
            {language === 'hi' ? 'विशेषज्ञ डॉक्टर' : 'Orthopedic Specialist'}
          </span>
          <span className="text-[10px] font-bold text-[#0D7C7B]">
            {DEMO_HOSPITAL_NAME}
          </span>
        </div>

        <div className="bg-[#F7FBFA] p-4 rounded-2xl border border-[#E4F1EE] space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0F9F8] text-[#0D7C7B] flex items-center justify-center border border-[#CBE5E1] shrink-0">
              <Bone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-[#163A39] text-sm">{drAmit.name}</h4>
              <p className="text-xs font-bold text-[#0D7C7B]">{drAmit.specialty} Specialist</p>
              <p className="text-[11px] text-[#527977] font-medium">12 Years Experience • Hindi • English</p>
            </div>
          </div>

          <div className="pt-2 border-t border-[#E4F1EE] flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#163A39]">
              Today: <span className="text-[#0D7C7B]">3:30 PM, 5:00 PM, 6:30 PM</span>
            </span>
            <button
              onClick={() =>
                onOpenVoiceAssistant(
                  "I've had knee pain for three days. Which doctor should I see?"
                )
              }
              className="text-xs font-bold text-[#0D7C7B] hover:underline"
            >
              Book via Aarvi →
            </button>
          </div>
        </div>
      </div>

      {/* UPCOMING APPOINTMENT UI CARD */}
      <div className="bg-white p-5 rounded-3xl shadow-xs border border-[#E4F1EE] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#527977]">
            {language === 'hi' ? 'आपकी अपॉइंटमेंट' : 'Upcoming Appointment'}
          </span>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#EBF7F5] text-[#0D7C7B] border border-[#BFE8E2]">
            {activeAppointment ? '✓ CONFIRMED' : 'Active'}
          </span>
        </div>

        {activeAppointment ? (
          <div className="bg-[#F0F9F8] p-4 rounded-2xl border border-[#CBE5E1] space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0D7C7B] mb-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>APPOINTMENT CONFIRMED</span>
                </div>
                <h4 className="font-extrabold text-[#163A39] text-base">
                  {activeAppointment.doctor_name}
                </h4>
                <p className="text-xs font-bold text-[#0D7C7B] mt-0.5">
                  {activeAppointment.specialty} • {activeAppointment.hospital}
                </p>
              </div>
              <div className="text-right bg-white p-2.5 rounded-xl border border-[#CBE5E1]">
                <span className="text-xs font-bold text-[#163A39] block">
                  {activeAppointment.date_text}
                </span>
                <span className="text-sm font-extrabold text-[#0D7C7B] block mt-0.5">
                  {activeAppointment.time_slot}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#F7FBFA] p-4 rounded-2xl border border-[#E4F1EE] text-center space-y-2">
            <p className="text-xs text-[#527977] font-medium">
              {language === 'hi'
                ? 'डॉ. अमित शर्मा (ऑर्थोपेडिक) के साथ नया अपॉइंटमेंट बुक करें।'
                : 'No upcoming appointment. Talk to Aarvi to book Dr. Amit Sharma.'}
            </p>
            <button
              onClick={() =>
                onOpenVoiceAssistant(
                  "I've had knee pain for three days. Which doctor should I see?"
                )
              }
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0D7C7B] hover:underline"
            >
              <span>{language === 'hi' ? 'अपॉइंटमेंट बुक करें' : 'Book Orthopedic Appointment'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
