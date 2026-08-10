import { Doctor, HospitalKnowledgeItem, PatientMemory, MedicalRecord } from './types';

export const DEMO_HOSPITAL_NAME = 'City Medical Center';
export const DEMO_HOSPITAL_ID = 'hospital_city';

export const DEMO_DOCTORS: Doctor[] = [
  {
    id: 'doc-amit',
    hospital_id: 'hospital_city',
    name: 'Dr. Amit Sharma',
    specialty: 'Orthopedic',
    hospital: DEMO_HOSPITAL_NAME,
    experience: '12 Years',
    languages: ['Hindi', 'English'],
    location: 'Orthopedic Department • Wing B',
    rating: 4.9,
    available_slots: {
      today: ['03:30 PM', '05:00 PM', '06:30 PM'],
      tomorrow: ['10:30 AM', '01:00 PM', '04:00 PM'],
    },
    consultation_fee: '₹800',
  },
];

export const DEMO_HOSPITAL_KNOWLEDGE: HospitalKnowledgeItem[] = [
  {
    id: 'hk-1',
    hospital_id: 'hospital_city',
    category: 'specialty_map',
    title: 'Knee Pain, Joint Pain, Leg Joint Pain, Back Pain -> Orthopedic Specialist Dr. Amit Sharma',
    content: 'For knee pain, joint pain, leg joint pain, back pain, or orthopedic consultation, consult Orthopedic Specialist Dr. Amit Sharma.',
    content_hi: 'घुटने के दर्द, जोड़ों के दर्द या पीठ दर्द के लिए ऑर्थोपेडिक विशेषज्ञ डॉ. अमित शर्मा से परामर्श लें।',
    keywords: ['knee pain', 'joint pain', 'leg joint pain', 'back pain', 'orthopedic', 'घुटने', 'दर्द', 'हड्डी'],
  },
  {
    id: 'hk-2',
    hospital_id: 'hospital_city',
    category: 'hours',
    title: 'Clinic Operating Hours',
    content: 'The clinic is open today from 9 AM until 8 PM.',
    content_hi: 'क्लीनिक आज सुबह 9 बजे से रात 8 बजे तक खुला है।',
    keywords: ['close', 'timing', 'time', 'hours', 'open', 'समय', 'बंद'],
  },
];

export const INITIAL_PATIENT_MEMORY: PatientMemory = {
  id: 'pat-riya-01',
  patient_name: 'Riya',
  preferred_language: 'en',
  previous_visit: {
    doctor: 'Dr. Amit Sharma',
    specialty: 'Orthopedic',
    date: '02 August 2026',
  },
  recent_prescription: {
    medicine: 'Paracetamol 500mg',
    dosage: '1 tablet twice daily',
    instructions: 'After food for knee joint discomfort.',
    instructions_hi: 'खाने के बाद लें।',
  },
  active_appointment: undefined,
  history_logs: [
    'Patient Riya recorded knee discomfort on 02 August 2026.',
  ],
};

export const INITIAL_MEDICAL_RECORDS: MedicalRecord[] = [
  {
    id: 'rec-1',
    title: 'Orthopedic Consultation Summary',
    title_hi: 'ऑर्थोपेडिक परामर्श सारांश',
    date: '02 August 2026',
    type: 'Visit Summary',
    doctor: 'Dr. Amit Sharma',
    hospital: DEMO_HOSPITAL_NAME,
    summary: 'Diagnosis: Mild Knee Strain. Advised warm compression & mild rest.',
    summary_hi: 'निदान: घुटने में हल्की मोच। आराम की सलाह दी गई।',
    details: [
      'Warm Compression — Apply twice daily',
      'Avoid strenuous leg exercises',
    ],
  },
];
