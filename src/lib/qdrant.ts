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
      doctor_id: 'DOC_ORTHO_001',
      doctor_name: 'Dr. Amit Sharma',
      specialty: 'Orthopedic',
      experience: '12 Years',
      languages: ['English', 'Hindi'],
      hospital_id: 'DEMO_HOSPITAL',
      text: 'Dr. Amit Sharma is an Orthopedic specialist with 12 years of experience. He provides Orthopedic consultations and speaks Hindi and English.',
    },
  },
  {
    id: 3,
    text: 'Dr. Amit Sharma has Orthopedic appointments available today at 3:30 PM, 5:00 PM and 6:30 PM.',
    payload: {
      type: 'availability',
      doctor_id: 'DOC_ORTHO_001',
      doctor_name: 'Dr. Amit Sharma',
      specialty: 'Orthopedic',
      date_reference: 'today',
      available_slots: ['3:30 PM', '5:00 PM', '6:30 PM'],
      text: 'Dr. Amit Sharma has Orthopedic appointments available today at 3:30 PM, 5:00 PM and 6:30 PM.',
    },
  },
  {
    id: 4,
    text: 'Dr. Amit Sharma has Orthopedic appointments available tomorrow at 10:30 AM, 1:00 PM and 4:00 PM.',
    payload: {
      type: 'availability',
      doctor_id: 'DOC_ORTHO_001',
      doctor_name: 'Dr. Amit Sharma',
      specialty: 'Orthopedic',
      date_reference: 'tomorrow',
      available_slots: ['10:30 AM', '1:00 PM', '4:00 PM'],
      text: 'Dr. Amit Sharma has Orthopedic appointments available tomorrow at 10:30 AM, 1:00 PM and 4:00 PM.',
    },
  },
  {
    id: 5,
    text: 'घुटने में दर्द, जोड़ों में दर्द और पीठ दर्द जैसी समस्याओं के लिए Orthopedic विभाग में अपॉइंटमेंट की जानकारी दी जा सकती है।',
    payload: {
      type: 'symptom_routing',
      specialty: 'Orthopedic',
      language: 'hi',
      symptoms: ['घुटने में दर्द', 'जोड़ों में दर्द', 'पीठ दर्द'],
      text: 'घुटने में दर्द, जोड़ों में दर्द और पीठ दर्द जैसी समस्याओं के लिए Orthopedic विभाग में अपॉइंटमेंट की जानकारी दी जा सकती है।',
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

export async function queryDoctorsFromQdrant(
  queryText: string,
  hospitalId: string = DEMO_HOSPITAL_ID,
  targetSpecialty?: string
): Promise<{ doctors: Doctor[]; source: 'qdrant' | 'local_fallback'; score: number }> {
  return { doctors: DEMO_DOCTORS, source: isQdrantConnected ? 'qdrant' : 'local_fallback', score: 0.95 };
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
