const fs = require('fs');
const path = require('path');
const { QdrantClient } = require('@qdrant/js-client-rest');

// Load environment variables from .env.local if available
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const parts = trimmed.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const DOCTORS_COLLECTION_NAME = 'doctors';

const DOCTORS_DATA = [
  {
    id: 'doc-1',
    pointId: 1,
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
    image: '',
  },
  {
    id: 'doc-2',
    pointId: 2,
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
    image: '',
  },
  {
    id: 'doc-3',
    pointId: 3,
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
    image: '',
  },
  {
    id: 'doc-4',
    pointId: 4,
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
    image: '',
  },
  {
    id: 'doc-5',
    pointId: 5,
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
    image: '',
  },
  {
    id: 'doc-6',
    pointId: 6,
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
    image: '',
  },
  {
    id: 'doc-7',
    pointId: 7,
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
    image: '',
  },
  {
    id: 'doc-8',
    pointId: 8,
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
    image: '',
  },
  {
    id: 'doc-9',
    pointId: 9,
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
    image: '',
  },
  {
    id: 'doc-10',
    pointId: 10,
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
    image: '',
  },
];

// Preserves exact 4D deterministic vector generation matching existing points 1..4
function get4DVectorForIndex(idx) {
  const raw = [idx, 2, 3, 4];
  const norm = Math.sqrt(raw.reduce((sum, v) => sum + v * v, 0));
  return raw.map((v) => v / norm);
}

async function seedDoctorsCollection() {
  console.log('==================================================');
  console.log('AARVI QDRANT DOCTOR SEEDING SCRIPT');
  console.log('==================================================');

  if (!QDRANT_URL || !QDRANT_API_KEY) {
    console.error('❌ FAILURE: QDRANT_URL or QDRANT_API_KEY missing in environment / .env.local');
    process.exit(1);
  }

  const client = new QdrantClient({
    url: QDRANT_URL,
    apiKey: QDRANT_API_KEY,
  });

  try {
    // 1. Verify Qdrant connection
    const collectionsResult = await client.getCollections();
    console.log('Qdrant connection: ✓');

    // 2. Verify collection exists
    const collectionExists = collectionsResult.collections.some(
      (c) => c.name === DOCTORS_COLLECTION_NAME
    );

    if (!collectionExists) {
      console.error(`❌ FAILURE: Collection "${DOCTORS_COLLECTION_NAME}" not found on Qdrant cluster.`);
      process.exit(1);
    }
    console.log(`Collection found: ${DOCTORS_COLLECTION_NAME}`);

    // 3. Read vector configuration
    const collectionInfo = await client.getCollection(DOCTORS_COLLECTION_NAME);
    const vectorConfig = collectionInfo.config?.params?.vectors;
    const vectorSize = vectorConfig?.size || 4;
    const distanceMetric = vectorConfig?.distance || 'Cosine';
    console.log(`Vector dimension: ${vectorSize}`);
    console.log(`Distance metric: ${distanceMetric}`);

    // Inspect existing points
    const scrollResult = await client.scroll(DOCTORS_COLLECTION_NAME, {
      limit: 100,
      with_payload: true,
    });

    const existingPoints = scrollResult.points || [];
    const existingPointMap = new Map();
    existingPoints.forEach((p) => existingPointMap.set(p.id, p));

    let updatedCount = 0;
    let insertedCount = 0;

    const pointsToUpsert = [];

    for (const doc of DOCTORS_DATA) {
      const vector = get4DVectorForIndex(doc.pointId);
      const isUpdate = existingPointMap.has(doc.pointId);

      if (isUpdate) {
        updatedCount++;
      } else {
        insertedCount++;
      }

      const { pointId, ...payload } = doc;

      pointsToUpsert.push({
        id: pointId,
        vector,
        payload,
      });
    }

    // 4. Upsert points (Idempotent)
    await client.upsert(DOCTORS_COLLECTION_NAME, {
      points: pointsToUpsert,
    });

    // 5. Verification after insertion
    const verifyScroll = await client.scroll(DOCTORS_COLLECTION_NAME, {
      limit: 100,
      with_payload: true,
    });

    const verifiedPoints = verifyScroll.points || [];
    console.log(`\nExisting doctors updated: ${updatedCount}`);
    console.log(`New doctors inserted: ${insertedCount}`);
    console.log(`Total doctors in collection: ${verifiedPoints.length}`);

    let availabilityPopulated = true;
    console.log('\n--- Doctor Records Verification ---');
    verifiedPoints.sort((a, b) => Number(a.id) - Number(b.id));

    verifiedPoints.forEach((p) => {
      const payload = p.payload || {};
      const hasTodaySlots = Array.isArray(payload.available_slots?.today) && payload.available_slots.today.length > 0;
      const hasTomorrowSlots = Array.isArray(payload.available_slots?.tomorrow) && payload.available_slots.tomorrow.length > 0;
      if (!hasTodaySlots && !hasTomorrowSlots) {
        availabilityPopulated = false;
      }
      console.log(`✓ Point ${p.id}: ${payload.name} — ${payload.specialty} (${payload.hospital}, ${payload.location})`);
    });

    console.log(`\nAvailability populated: ${availabilityPopulated ? '✓' : '✗'}`);

    return {
      connected: true,
      collection: DOCTORS_COLLECTION_NAME,
      vectorDimension: vectorSize,
      updatedCount,
      insertedCount,
      totalCount: verifiedPoints.length,
      availabilityPopulated,
    };
  } catch (err) {
    console.error('❌ Qdrant Seeding Error:', err?.message || err);
    process.exit(1);
  }
}

seedDoctorsCollection();
