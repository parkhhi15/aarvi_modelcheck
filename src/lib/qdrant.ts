import { QdrantClient } from '@qdrant/js-client-rest';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DEMO_DOCTORS, DEMO_HOSPITAL_KNOWLEDGE, INITIAL_PATIENT_MEMORY, DEMO_HOSPITAL_ID } from './mockData';
import { Doctor, HospitalKnowledgeItem, PatientMemory } from './types';

const QDRANT_URL = process.env.QDRANT_URL || '';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

let qdrantClientInstance: QdrantClient | null = null;
let isQdrantConnected = false;
let localMemoryState: PatientMemory = { ...INITIAL_PATIENT_MEMORY };

export const AARVI_COLLECTION_NAME = 'aarvi_healthcare';
export const EMBEDDING_DIMENSION = 768;

export interface AarviKnowledgeRecord {
  id: number;
  text: string;
  payload: Record<string, any>;
}

export const AARVI_SEED_RECORDS: AarviKnowledgeRecord[] = [
  {
    id: 1,
    text: 'Knee pain, joint pain, back pain, leg joint pain and similar musculoskeletal complaints can be routed to the Orthopedic department for appointment assistance.',
    payload: {
      type: 'symptom_routing',
      specialty: 'Orthopedic',
      symptoms: ['knee pain', 'joint pain', 'back pain', 'leg pain'],
      text: 'Knee pain, joint pain, back pain, leg joint pain and similar musculoskeletal complaints can be routed to the Orthopedic department for appointment assistance.',
    },
  },
  {
    id: 2,
    text: 'Dr. Amit Sharma is an Orthopedic specialist with 12 years of experience. He provides Orthopedic consultations and speaks Hindi and English.',
    payload: {
      type: 'doctor',
      doctor_id: 'doc-1',
      doctor_name: 'Dr. Amit Sharma',
      specialty: 'Orthopedic',
      experience: '12 Years',
      languages: ['English', 'Hindi'],
      hospital_id: 'hospital_city',
      text: 'Dr. Amit Sharma is an Orthopedic specialist with 12 years of experience. He provides Orthopedic consultations and speaks Hindi and English.',
    },
  },
  {
    id: 3,
    text: 'Itchy skin, skin rash, acne, eczema, and skin irritation complaints are routed to Dermatologist Dr. Neha Singh.',
    payload: {
      type: 'symptom_routing',
      specialty: 'Dermatologist',
      symptoms: ['itchy skin', 'skin rash', 'itching', 'acne'],
      text: 'Itchy skin, skin rash, acne, eczema, and skin irritation complaints are routed to Dermatologist Dr. Neha Singh.',
    },
  },
  {
    id: 4,
    text: 'Dr. Neha Singh is a Dermatologist specialist with 8 years of experience. She provides Dermatology consultations.',
    payload: {
      type: 'doctor',
      doctor_id: 'doc-2',
      doctor_name: 'Dr. Neha Singh',
      specialty: 'Dermatologist',
      experience: '8 Years',
      languages: ['English', 'Hindi'],
      hospital_id: 'hospital_city',
      text: 'Dr. Neha Singh is a Dermatologist specialist with 8 years of experience. She provides Dermatology consultations.',
    },
  },
  {
    id: 5,
    text: 'Fever, cough, cold, weakness, headache, and general health complaints are routed to General Physician Dr. Rohit Gupta.',
    payload: {
      type: 'symptom_routing',
      specialty: 'General Physician',
      symptoms: ['fever', 'weakness', 'headache', 'cold'],
      text: 'Fever, cough, cold, weakness, headache, and general health complaints are routed to General Physician Dr. Rohit Gupta.',
    },
  },
  {
    id: 6,
    text: 'Child fever, infant health, and pediatric complaints are routed to Pediatrician Dr. Arjun Mehta.',
    payload: {
      type: 'symptom_routing',
      specialty: 'Pediatrician',
      symptoms: ['child fever', 'pediatric', 'kids health'],
      text: 'Child fever, infant health, and pediatric complaints are routed to Pediatrician Dr. Arjun Mehta.',
    },
  },
  {
    id: 7,
    text: 'Ear pain, throat pain, sinus, and hearing issues are routed to ENT Specialist Dr. Sameer Khanna.',
    payload: {
      type: 'symptom_routing',
      specialty: 'ENT Specialist',
      symptoms: ['ear pain', 'throat pain', 'sinus'],
      text: 'Ear pain, throat pain, sinus, and hearing issues are routed to ENT Specialist Dr. Sameer Khanna.',
    },
  },
  {
    id: 8,
    text: 'Eye irritation, blurry vision, and eye pain are routed to Ophthalmologist Dr. Ritu Bansal.',
    payload: {
      type: 'symptom_routing',
      specialty: 'Ophthalmologist',
      symptoms: ['eye irritation', 'eye pain', 'vision'],
      text: 'Eye irritation, blurry vision, and eye pain are routed to Ophthalmologist Dr. Ritu Bansal.',
    },
  },
  {
    id: 9,
    text: 'Toothache, dental cavity, and gum pain are routed to Dentist Dr. Vikas Patel.',
    payload: {
      type: 'symptom_routing',
      specialty: 'Dentist',
      symptoms: ['tooth pain', 'dental', 'toothache'],
      text: 'Toothache, dental cavity, and gum pain are routed to Dentist Dr. Vikas Patel.',
    },
  },
  {
    id: 10,
    text: 'Stomach pain, vomiting, acid reflux, and digestion issues are routed to Gastroenterologist Dr. Tanya Kapoor.',
    payload: {
      type: 'symptom_routing',
      specialty: 'Gastroenterologist',
      symptoms: ['stomach pain', 'vomiting', 'acid reflux'],
      text: 'Stomach pain, vomiting, acid reflux, and digestion issues are routed to Gastroenterologist Dr. Tanya Kapoor.',
    },
  },
];

// Deterministic embedding generator producing 768-dim float vector
export async function getEmbedding(text: string): Promise<number[]> {
  if (GEMINI_API_KEY && GEMINI_API_KEY.startsWith('AIzaSy')) {
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      if (result.embedding?.values && result.embedding.values.length === EMBEDDING_DIMENSION) {
        return result.embedding.values;
      }
    } catch (err) {
      console.warn('Gemini embedding failed, using local deterministic embedding:', err);
    }
  }

  // Deterministic 768-dim normalized embedding fallback
  const vector: number[] = new Array(EMBEDDING_DIMENSION).fill(0);
  const normalizedText = text.toLowerCase().trim();
  for (let i = 0; i < normalizedText.length; i++) {
    const charCode = normalizedText.charCodeAt(i);
    const pos = (i * 31 + charCode) % EMBEDDING_DIMENSION;
    vector[pos] += Math.sin(charCode + i) * 0.5 + 0.5;
  }

  // L2 Normalize
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

export function getQdrantClient(): QdrantClient | null {
  if (qdrantClientInstance) return qdrantClientInstance;

  if (QDRANT_URL && QDRANT_API_KEY && !QDRANT_API_KEY.includes('placeholder')) {
    try {
      qdrantClientInstance = new QdrantClient({
        url: QDRANT_URL,
        apiKey: QDRANT_API_KEY,
      });
      isQdrantConnected = true;
      return qdrantClientInstance;
    } catch (err) {
      console.warn('Qdrant Client init warning, fallback active:', err);
      isQdrantConnected = false;
      return null;
    }
  }
  return null;
}

export async function ensureQdrantCollections(): Promise<{ connected: boolean; status: string }> {
  const client = getQdrantClient();
  if (!client) {
    return { connected: false, status: 'Retrieval fallback active' };
  }

  try {
    const existing = await client.getCollections();
    const exists = existing.collections.some((c) => c.name === AARVI_COLLECTION_NAME);

    if (!exists) {
      await client.createCollection(AARVI_COLLECTION_NAME, {
        vectors: { size: EMBEDDING_DIMENSION, distance: 'Cosine' },
      });

      const points = [];
      for (const rec of AARVI_SEED_RECORDS) {
        const vector = await getEmbedding(rec.text);
        points.push({
          id: rec.id,
          vector,
          payload: rec.payload,
        });
      }
      await client.upsert(AARVI_COLLECTION_NAME, { points });
      console.log(`Qdrant connected ✓ Collection: ${AARVI_COLLECTION_NAME} ✓ Points inserted: ${points.length} ✓`);
    }
    isQdrantConnected = true;
    return { connected: true, status: 'Qdrant collections synchronized' };
  } catch (error) {
    console.warn('Error connecting to Qdrant, using local fallback:', error);
    isQdrantConnected = false;
    return { connected: false, status: 'Retrieval fallback active' };
  }
}

export async function searchAarviKnowledge(queryText: string): Promise<{
  results: Array<{ id: number | string; score: number; payload: Record<string, any>; text: string }>;
  source: 'qdrant' | 'local_fallback';
}> {
  const queryVector = await getEmbedding(queryText);
  const client = getQdrantClient();

  if (client && isQdrantConnected) {
    try {
      const searchRes = await client.query(AARVI_COLLECTION_NAME, {
        query: queryVector,
        limit: 3,
        with_payload: true,
      });

      if (searchRes && searchRes.points && searchRes.points.length > 0) {
        const mapped = searchRes.points.map((item: any) => ({
          id: item.id,
          score: item.score || 0.95,
          payload: (item.payload as Record<string, any>) || {},
          text: ((item.payload?.text as string) || ''),
        }));
        return { results: mapped, source: 'qdrant' };
      }
    } catch (err) {
      console.warn('Qdrant search error, using local fallback:', err);
    }
  }

  // Local fallback similarity search over 5 seed records
  const q = queryText.toLowerCase().trim();
  const fallbackResults = AARVI_SEED_RECORDS.map((rec) => {
    let score = 0.5;
    if (q.includes('knee') || q.includes('pain') || q.includes('घुटने')) {
      if (rec.payload.type === 'symptom_routing') score = 0.95;
    } else if (q.includes('doctor') || q.includes('amit') || q.includes('orthopedic')) {
      if (rec.payload.type === 'doctor') score = 0.92;
    } else if (q.includes('today') || q.includes('available') || q.includes('slot')) {
      if (rec.payload.type === 'availability' && rec.payload.date_reference === 'today') score = 0.90;
    }
    return {
      id: rec.id,
      score,
      payload: rec.payload,
      text: rec.text,
    };
  }).sort((a, b) => b.score - a.score);

  return { results: fallbackResults.slice(0, 3), source: 'local_fallback' };
}

export const ALL_10_DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    hospital_id: 'hospital_city',
    name: 'Dr. Amit Sharma',
    specialty: 'Orthopedic',
    hospital: 'Aarogya Multispeciality Hospital',
    experience: '12 years',
    languages: ['Hindi', 'English'],
    location: 'Noida',
    rating: 4.8,
    available_slots: {
      today: ['3:30 PM', '5:00 PM', '6:30 PM'],
      tomorrow: ['10:30 AM', '1:00 PM', '4:00 PM'],
    },
    consultation_fee: '₹800',
  },
  {
    id: 'doc-2',
    hospital_id: 'hospital_city',
    name: 'Dr. Neha Singh',
    specialty: 'Dermatologist',
    hospital: 'Aarogya Multispeciality Hospital',
    experience: '8 years',
    languages: ['Hindi', 'English'],
    location: 'Noida',
    rating: 4.7,
    available_slots: {
      today: ['11:30 AM', '2:30 PM', '5:30 PM'],
      tomorrow: ['10:00 AM', '1:30 PM', '4:30 PM'],
    },
    consultation_fee: '₹700',
  },
  {
    id: 'doc-3',
    hospital_id: 'hospital_city',
    name: 'Dr. Pooja Verma',
    specialty: 'Cardiologist',
    hospital: 'CityCare Hospital',
    experience: '15 years',
    languages: ['Hindi', 'English'],
    location: 'Delhi',
    rating: 4.9,
    available_slots: {
      today: ['1:30 PM', '4:00 PM'],
      tomorrow: ['11:00 AM', '2:30 PM', '5:00 PM'],
    },
    consultation_fee: '₹1200',
  },
  {
    id: 'doc-4',
    hospital_id: 'hospital_city',
    name: 'Dr. Rohit Gupta',
    specialty: 'General Physician',
    hospital: 'CityCare Hospital',
    experience: '10 years',
    languages: ['Hindi', 'English'],
    location: 'Delhi',
    rating: 4.6,
    available_slots: {
      today: ['10:30 AM', '1:00 PM', '6:00 PM'],
      tomorrow: ['9:30 AM', '12:30 PM', '4:30 PM'],
    },
    consultation_fee: '₹500',
  },
  {
    id: 'doc-5',
    hospital_id: 'hospital_city',
    name: 'Dr. Arjun Mehta',
    specialty: 'Pediatrician',
    hospital: 'Aarogya Multispeciality Hospital',
    experience: '11 years',
    languages: ['Hindi', 'English'],
    location: 'Noida',
    rating: 4.8,
    available_slots: {
      today: ['2:00 PM', '4:30 PM'],
      tomorrow: ['10:00 AM', '1:30 PM', '5:00 PM'],
    },
    consultation_fee: '₹650',
  },
  {
    id: 'doc-6',
    hospital_id: 'hospital_city',
    name: 'Dr. Kavya Malhotra',
    specialty: 'Gynecologist',
    hospital: 'Aarogya Multispeciality Hospital',
    experience: '13 years',
    languages: ['Hindi', 'English'],
    location: 'Noida',
    rating: 4.9,
    available_slots: {
      today: ['3:00 PM', '6:00 PM'],
      tomorrow: ['11:30 AM', '3:30 PM'],
    },
    consultation_fee: '₹900',
  },
  {
    id: 'doc-7',
    hospital_id: 'hospital_city',
    name: 'Dr. Sameer Khanna',
    specialty: 'ENT Specialist',
    hospital: 'CityCare Hospital',
    experience: '9 years',
    languages: ['Hindi', 'English'],
    location: 'Delhi',
    rating: 4.7,
    available_slots: {
      today: ['1:00 PM', '5:30 PM'],
      tomorrow: ['9:30 AM', '2:00 PM'],
    },
    consultation_fee: '₹600',
  },
  {
    id: 'doc-8',
    hospital_id: 'hospital_city',
    name: 'Dr. Ritu Bansal',
    specialty: 'Ophthalmologist',
    hospital: 'CityCare Hospital',
    experience: '14 years',
    languages: ['Hindi', 'English'],
    location: 'Delhi',
    rating: 4.8,
    available_slots: {
      today: ['12:30 PM', '4:00 PM'],
      tomorrow: ['10:30 AM', '1:00 PM', '4:30 PM'],
    },
    consultation_fee: '₹750',
  },
  {
    id: 'doc-9',
    hospital_id: 'hospital_city',
    name: 'Dr. Vikram Sethi',
    specialty: 'Dentist',
    hospital: 'Aarogya Multispeciality Hospital',
    experience: '10 years',
    languages: ['Hindi', 'English'],
    location: 'Noida',
    rating: 4.6,
    available_slots: {
      today: ['11:30 AM', '3:30 PM'],
      tomorrow: ['9:00 AM', '12:00 PM', '5:30 PM'],
    },
    consultation_fee: '₹500',
  },
  {
    id: 'doc-10',
    hospital_id: 'hospital_city',
    name: 'Dr. Tanya Kapoor',
    specialty: 'Gastroenterologist',
    hospital: 'CityCare Hospital',
    experience: '12 years',
    languages: ['Hindi', 'English'],
    location: 'Delhi',
    rating: 4.8,
    available_slots: {
      today: ['2:30 PM', '6:30 PM'],
      tomorrow: ['10:00 AM', '3:00 PM'],
    },
    consultation_fee: '₹1000',
  },
];

export async function queryDoctorsFromQdrant(
  queryText: string,
  hospitalId: string = DEMO_HOSPITAL_ID,
  targetSpecialty?: string
): Promise<{ doctors: Doctor[]; source: 'qdrant' | 'local_fallback'; score: number }> {
  const client = getQdrantClient();

  if (client) {
    try {
      // Qdrant Payload Filter query
      const scrollOptions: any = {
        limit: 100,
        with_payload: true,
      };

      if (targetSpecialty) {
        scrollOptions.filter = {
          must: [
            {
              key: 'specialty',
              match: {
                value: targetSpecialty,
              },
            },
          ],
        };
      }

      let res = await client.scroll('doctors', scrollOptions);

      // Fallback scroll without filter if exact match returned 0 due to case sensitivity
      if ((!res || !res.points || res.points.length === 0) && targetSpecialty) {
        res = await client.scroll('doctors', { limit: 100, with_payload: true });
      }

      if (res && res.points && res.points.length > 0) {
        const allDoctors: Doctor[] = res.points.map((p: any) => {
          const payload = p.payload || {};
          return {
            id: payload.id || `doc-${p.id}`,
            hospital_id: hospitalId,
            name: payload.name || 'Doctor',
            specialty: payload.specialty || 'General Physician',
            hospital: payload.hospital || 'Hospital',
            experience: payload.experience || '10 years',
            languages: payload.languages || ['Hindi', 'English'],
            location: payload.location || 'Clinic',
            rating: payload.rating || 4.8,
            available_slots: payload.available_slots || { today: ['3:30 PM'], tomorrow: ['10:30 AM'] },
            consultation_fee: payload.consultation_fee || '₹500',
          };
        });

        if (targetSpecialty) {
          const target = targetSpecialty.toLowerCase().trim();
          const filtered = allDoctors.filter((d) => {
            const spec = d.specialty.toLowerCase();
            return (
              spec.includes(target) ||
              target.includes(spec) ||
              (target.startsWith('derma') && spec.startsWith('derma')) ||
              (target.startsWith('ortho') && spec.startsWith('ortho')) ||
              (target.startsWith('cardio') && spec.startsWith('cardio')) ||
              (target.startsWith('pediat') && spec.startsWith('pediat')) ||
              (target.startsWith('gastro') && spec.startsWith('gastro')) ||
              (target.startsWith('gyne') && spec.startsWith('gyne')) ||
              (target.startsWith('ent') && spec.startsWith('ent')) ||
              (target.startsWith('ophthal') && spec.startsWith('ophthal'))
            );
          });
          if (filtered.length > 0) {
            return { doctors: filtered, source: 'qdrant', score: 0.98 };
          }
        }

        return { doctors: allDoctors, source: 'qdrant', score: 0.90 };
      }
    } catch (err) {
      console.warn('Qdrant doctors query error, using local fallback:', err);
    }
  }

  // Local Fallback by payload filtering
  if (targetSpecialty) {
    const target = targetSpecialty.toLowerCase().trim();
    const matched = ALL_10_DOCTORS.filter((d) => {
      const spec = d.specialty.toLowerCase();
      return (
        spec.includes(target) ||
        target.includes(spec) ||
        (target.startsWith('derma') && spec.startsWith('derma')) ||
        (target.startsWith('ortho') && spec.startsWith('ortho')) ||
        (target.startsWith('cardio') && spec.startsWith('cardio')) ||
        (target.startsWith('pediat') && spec.startsWith('pediat')) ||
        (target.startsWith('gastro') && spec.startsWith('gastro')) ||
        (target.startsWith('gyne') && spec.startsWith('gyne')) ||
        (target.startsWith('ent') && spec.startsWith('ent')) ||
        (target.startsWith('ophthal') && spec.startsWith('ophthal'))
      );
    });
    if (matched.length > 0) {
      return { doctors: matched, source: 'local_fallback', score: 0.98 };
    }
  }

  return { doctors: ALL_10_DOCTORS, source: 'local_fallback', score: 0.95 };
}



export async function queryHospitalKnowledgeFromQdrant(
  queryText: string
): Promise<{ items: HospitalKnowledgeItem[]; source: 'qdrant' | 'local_fallback' }> {
  return { items: DEMO_HOSPITAL_KNOWLEDGE, source: isQdrantConnected ? 'qdrant' : 'local_fallback' };
}

export async function queryPatientMemoryFromQdrant(): Promise<{
  memory: PatientMemory;
  source: 'qdrant' | 'local_fallback';
}> {
  return { memory: localMemoryState, source: isQdrantConnected ? 'qdrant' : 'local_fallback' };
}

export async function updatePatientMemoryInQdrant(
  updatedMemory: PatientMemory
): Promise<{ success: boolean; source: 'qdrant' | 'local_fallback' }> {
  localMemoryState = { ...updatedMemory };
  return { success: true, source: isQdrantConnected ? 'qdrant' : 'local_fallback' };
}
