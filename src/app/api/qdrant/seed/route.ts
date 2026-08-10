import { NextRequest, NextResponse } from 'next/server';
import {
  getQdrantClient,
  getEmbedding,
  AARVI_COLLECTION_NAME,
  AARVI_SEED_RECORDS,
  EMBEDDING_DIMENSION,
  searchAarviKnowledge,
} from '@/lib/qdrant';

export async function GET(req: NextRequest) {
  try {
    const client = getQdrantClient();

    if (!client) {
      return NextResponse.json({
        success: false,
        message: 'Qdrant client unavailable (check QDRANT_URL and QDRANT_API_KEY)',
        pointsInserted: 0,
      });
    }

    // 1. Check or Create collection
    const existing = await client.getCollections();
    const exists = existing.collections.some((c) => c.name === AARVI_COLLECTION_NAME);

    if (exists) {
      await client.deleteCollection(AARVI_COLLECTION_NAME);
    }

    await client.createCollection(AARVI_COLLECTION_NAME, {
      vectors: { size: EMBEDDING_DIMENSION, distance: 'Cosine' },
    });

    // 2. Insert records with actual embeddings
    const points = [];
    for (const record of AARVI_SEED_RECORDS) {
      const vector = await getEmbedding(record.text);
      points.push({
        id: record.id,
        vector,
        payload: record.payload,
      });
    }

    await client.upsert(AARVI_COLLECTION_NAME, { points });

    console.log(`Qdrant connected ✓`);
    console.log(`Collection: ${AARVI_COLLECTION_NAME} ✓`);
    console.log(`Points inserted: ${points.length} ✓`);

    // 3. Perform 4 test searches for verification
    const test1 = await searchAarviKnowledge('knee pain');
    const test2 = await searchAarviKnowledge('Orthopedic doctor');
    const test3 = await searchAarviKnowledge('doctor available today');
    const test4 = await searchAarviKnowledge('घुटने में दर्द');

    const testResults = {
      test1_knee_pain: {
        query: 'knee pain',
        expected: 'symptom_routing',
        retrievedType: test1.results[0]?.payload?.type,
        retrievedSpecialty: test1.results[0]?.payload?.specialty,
        score: test1.results[0]?.score,
        matched: test1.results[0]?.payload?.type === 'symptom_routing',
      },
      test2_ortho_doctor: {
        query: 'Orthopedic doctor',
        expected: 'doctor',
        retrievedType: test2.results[0]?.payload?.type,
        retrievedDoctorName: test2.results[0]?.payload?.doctor_name,
        score: test2.results[0]?.score,
        matched: test2.results[0]?.payload?.doctor_name === 'Dr. Amit Sharma',
      },
      test3_today_availability: {
        query: 'doctor available today',
        expected: 'availability',
        retrievedType: test3.results[0]?.payload?.type,
        availableSlots: test3.results[0]?.payload?.available_slots,
        score: test3.results[0]?.score,
        matched: test3.results[0]?.payload?.type === 'availability',
      },
      test4_hindi_knee_pain: {
        query: 'घुटने में दर्द',
        expected: 'symptom_routing (hi)',
        retrievedType: test4.results[0]?.payload?.type,
        retrievedLanguage: test4.results[0]?.payload?.language,
        score: test4.results[0]?.score,
        matched: test4.results[0]?.payload?.type === 'symptom_routing',
      },
    };

    return NextResponse.json({
      success: true,
      qdrantConnected: true,
      collection: AARVI_COLLECTION_NAME,
      vectorDimension: EMBEDDING_DIMENSION,
      pointsInserted: points.length,
      testVerification: testResults,
    });
  } catch (error: any) {
    console.error('Error seeding Qdrant collection:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to seed Qdrant collection',
    }, { status: 500 });
  }
}
