export type Language = 'en' | 'hi';

export type UrgencyLevel = 'ROUTINE' | 'URGENT' | 'EMERGENCY';

export interface Doctor {
  id: string;
  hospital_id: string;
  name: string;
  specialty: string;
  hospital: string;
  experience: string;
  languages: string[];
  location: string;
  rating: number;
  available_slots: {
    today?: string[];
    tomorrow?: string[];
  };
  consultation_fee: string;
}

export interface HospitalKnowledgeItem {
  id: string;
  hospital_id: string;
  category:
    | 'opd'
    | 'department'
    | 'location'
    | 'policy'
    | 'reports'
    | 'billing'
    | 'emergency'
    | 'instructions'
    | 'specialty_map'
    | 'hours';
  title: string;
  content: string;
  content_hi?: string;
  keywords?: string[];
}

export interface PatientMemory {
  id: string;
  patient_name: string;
  preferred_language: Language;
  previous_visit?: {
    doctor: string;
    specialty: string;
    date: string;
  };
  recent_prescription?: {
    medicine: string;
    dosage: string;
    instructions: string;
    instructions_hi: string;
  };
  active_appointment?: {
    id: string;
    doctor_id: string;
    doctor_name: string;
    specialty: string;
    hospital: string;
    date_text: string;
    time_slot: string;
    booked_at: string;
  };
  history_logs: string[];
}

export interface Appointment {
  id: string;
  patient_name: string;
  doctor_id: string;
  doctor_name: string;
  specialty: string;
  hospital: string;
  date_text: string;
  time_slot: string;
  status: 'confirmed' | 'rescheduled' | 'cancelled' | 'urgent_pending';
  booked_at: string;
  urgency?: UrgencyLevel;
}

export interface MedicalRecord {
  id: string;
  title: string;
  title_hi: string;
  date: string;
  type: 'Lab Test' | 'Prescription' | 'Visit Summary';
  doctor: string;
  hospital: string;
  summary: string;
  summary_hi: string;
  details: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'aarvi';
  text: string;
  timestamp: string;
  audioUrl?: string;
  fallbackVoice?: boolean;
  intent?: string;
  urgency?: UrgencyLevel;
  qdrantRetrieved?: boolean;
  actionRequired?:
    | 'confirm_booking'
    | 'reschedule_options'
    | 'show_medicine'
    | 'show_records'
    | 'emergency_alert'
    | 'urgent_request_created'
    | null;
  appointmentData?: {
    doctor: Doctor;
    slot: string;
    day: string;
  };
  rescheduleSlots?: string[];
}

export interface ExplicitConversationState {
  patientName: string;
  symptom: string | null;
  specialty: string | null;
  availableDoctor: Doctor | null;
  availableSlots: string[];
  selectedSlot: string | null;
  pendingAppointment: {
    doctor: Doctor;
    slot: string;
    day: string;
  } | null;
  confirmedAppointment: Appointment | null;
  awaitingConfirmation: boolean;
  expectedNextAction: 'CHECK_AVAILABILITY' | 'EARLIEST_SLOT' | 'BOOK_SLOT' | 'CONFIRM_BOOKING' | 'SELECT_SLOT' | 'CONFIRM_RESCHEDULE' | null;
  conversationStarted: boolean;
  lastIntent: string | null;
  language: Language;
}

export interface SystemDebugState {
  lastQuery: string;
  intent: string;
  intentEngine: 'Gemini API ✓' | 'Local fallback (Gemini Key Invalid/Unavailable)';
  urgency: UrgencyLevel;
  qdrantHits: {
    collection: string;
    matches: string[];
    score: number;
  }[];
  geminiStatus: 'idle' | 'processing' | 'success' | 'fallback';
  rimeStatus: 'idle' | 'processing' | 'success' | 'fallback';
  rimeAudioBytes?: number;
  language: Language;
  retrievalFallbackActive: boolean;
  hospitalId: string;
}
