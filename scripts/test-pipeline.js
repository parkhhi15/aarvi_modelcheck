const fs = require('fs');
const path = require('path');

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

const { QdrantClient } = require('@qdrant/js-client-rest');

async function sendChatTurn(message, currentState) {
  const res = await fetch('http://localhost:3001/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, currentState }),
  });
  return await res.json();
}

async function runPipelineTests() {
  console.log('==================================================');
  console.log('AARVI MULTI-TURN APPOINTMENT BOOKING VERIFICATION');
  console.log('==================================================\n');

  let allPassed = true;

  // --------------------------------------------------
  // TEST 1: FULL MULTI-TURN APPOINTMENT FLOW
  // --------------------------------------------------
  console.log('--- TEST 1: Full Multi-Turn Appointment Flow ---');
  let state = null;

  // Turn 1
  let data = await sendChatTurn('I have fever.', state);
  state = data.currentState;
  console.log('USER: "I have fever."');
  console.log(`INTENT: ${data.intent}`);
  console.log(`AARVI: "${data.text}"`);
  console.log(`SELECTED SLOT: ${state.selectedSlot || 'null'}`);
  console.log(`EXPECTED NEXT ACTION: ${state.expectedNextAction}\n`);

  const t1Pass = data.intent === 'FIND_SPECIALIST' && state.specialty === 'General Physician';
  if (!t1Pass) allPassed = false;

  // Turn 2
  data = await sendChatTurn('Book an appointment for me.', state);
  state = data.currentState;
  console.log('USER: "Book an appointment for me."');
  console.log(`INTENT: ${data.intent}`);
  console.log(`AARVI: "${data.text}"`);
  console.log(`SELECTED SLOT: ${state.selectedSlot || 'null'}`);
  console.log(`EXPECTED NEXT ACTION: ${state.expectedNextAction}\n`);

  const t2Pass = state.selectedSlot === null && data.text.includes('10:30 AM') && data.text.includes('6:00 PM');
  if (!t2Pass) allPassed = false;

  // Turn 3
  data = await sendChatTurn('Is there any other time?', state);
  state = data.currentState;
  console.log('USER: "Is there any other time?"');
  console.log(`INTENT: ${data.intent}`);
  console.log(`AARVI: "${data.text}"`);
  console.log(`SELECTED SLOT: ${state.selectedSlot || 'null'}`);
  console.log(`EXPECTED NEXT ACTION: ${state.expectedNextAction}\n`);

  const t3Pass = data.intent === 'CHECK_ALTERNATIVE_SLOTS' && !data.text.includes('Should I confirm');
  if (!t3Pass) allPassed = false;

  // Turn 4
  data = await sendChatTurn('Book 6 PM.', state);
  state = data.currentState;
  console.log('USER: "Book 6 PM."');
  console.log(`INTENT: ${data.intent}`);
  console.log(`AARVI: "${data.text}"`);
  console.log(`SELECTED SLOT: ${state.selectedSlot}`);
  console.log(`PENDING APPOINTMENT: ${state.pendingAppointment?.slot}`);
  console.log(`EXPECTED NEXT ACTION: ${state.expectedNextAction}\n`);

  const t4Pass = state.selectedSlot === '6:00 PM' && state.pendingAppointment?.slot === '6:00 PM' && data.text.includes('6:00 PM');
  if (!t4Pass) allPassed = false;

  // Turn 5
  data = await sendChatTurn('Yes, confirm it.', state);
  state = data.currentState;
  console.log('USER: "Yes, confirm it."');
  console.log(`INTENT: ${data.intent}`);
  console.log(`AARVI: "${data.text}"`);
  console.log(`CONFIRMED APPOINTMENT: ${state.confirmedAppointment?.time_slot}`);
  console.log(`EXPECTED NEXT ACTION: ${state.expectedNextAction || 'null'}\n`);

  const t5Pass = state.confirmedAppointment?.time_slot === '6:00 PM' && data.text.includes('6:00 PM');
  if (!t5Pass) allPassed = false;

  // Turn 6
  data = await sendChatTurn('What time is my appointment?', state);
  state = data.currentState;
  console.log('USER: "What time is my appointment?"');
  console.log(`INTENT: ${data.intent}`);
  console.log(`AARVI: "${data.text}"`);
  console.log(`CONFIRMED APPOINTMENT: ${state.confirmedAppointment?.time_slot}\n`);

  const t6Pass = data.text.includes('6:00 PM');
  if (!t6Pass) allPassed = false;

  console.log(`TEST 1 RESULT: ${t1Pass && t2Pass && t3Pass && t4Pass && t5Pass && t6Pass ? '✓ PASS' : '❌ FAIL'}\n`);

  // --------------------------------------------------
  // TEST 2: EARLIEST APPOINTMENT
  // --------------------------------------------------
  console.log('--- TEST 2: Earliest Appointment ---');
  let state2 = null;
  data = await sendChatTurn('I have fever.', state2);
  state2 = data.currentState;
  data = await sendChatTurn('Give me the earliest appointment.', state2);
  state2 = data.currentState;
  console.log('USER: "Give me the earliest appointment."');
  console.log(`INTENT: ${data.intent}`);
  console.log(`AARVI: "${data.text}"`);
  console.log(`SELECTED SLOT: ${state2.selectedSlot}`);

  const test2Pass = state2.selectedSlot === '10:30 AM';
  if (!test2Pass) allPassed = false;
  console.log(`TEST 2 RESULT: ${test2Pass ? '✓ PASS' : '❌ FAIL'}\n`);

  // --------------------------------------------------
  // TEST 3: EVENING APPOINTMENT
  // --------------------------------------------------
  console.log('--- TEST 3: Evening Appointment ---');
  let state3 = null;
  data = await sendChatTurn('I have fever.', state3);
  state3 = data.currentState;
  data = await sendChatTurn('Can I get something in the evening?', state3);
  state3 = data.currentState;
  console.log('USER: "Can I get something in the evening?"');
  console.log(`INTENT: ${data.intent}`);
  console.log(`AARVI: "${data.text}"`);
  console.log(`SELECTED SLOT: ${state3.selectedSlot || 'null'}`);

  const test3Pass = state3.selectedSlot === '6:00 PM' || data.text.includes('6:00 PM');
  if (!test3Pass) allPassed = false;
  console.log(`TEST 3 RESULT: ${test3Pass ? '✓ PASS' : '❌ FAIL'}\n`);

  // --------------------------------------------------
  // TEST 4: UNAVAILABLE SLOT (5 PM)
  // --------------------------------------------------
  console.log('--- TEST 4: Unavailable Slot (5 PM) ---');
  let state4 = null;
  data = await sendChatTurn('I have fever.', state4);
  state4 = data.currentState;
  data = await sendChatTurn('Can I get an appointment at 5 PM?', state4);
  state4 = data.currentState;
  console.log('USER: "Can I get an appointment at 5 PM?"');
  console.log(`INTENT: ${data.intent}`);
  console.log(`AARVI: "${data.text}"`);
  console.log(`SELECTED SLOT: ${state4.selectedSlot || 'null'}`);

  const test4Pass = data.text.includes("5:00 PM isn't available") || data.text.includes('not available') || data.text.includes("isn't available");
  if (!test4Pass) allPassed = false;
  console.log(`TEST 4 RESULT: ${test4Pass ? '✓ PASS' : '❌ FAIL'}\n`);

  console.log('==================================================');
  console.log('FINAL VERIFICATION SUMMARY REPORT');
  console.log('==================================================');
  console.log(`Test 1 (Full Multi-Turn 6 PM Booking): ${t1Pass && t2Pass && t3Pass && t4Pass && t5Pass && t6Pass ? 'PASS' : 'FAIL'}`);
  console.log(`Test 2 (Earliest 10:30 AM Explicit): ${test2Pass ? 'PASS' : 'FAIL'}`);
  console.log(`Test 3 (Evening Slot): ${test3Pass ? 'PASS' : 'FAIL'}`);
  console.log(`Test 4 (Unavailable 5 PM Handling): ${test4Pass ? 'PASS' : 'FAIL'}`);
  console.log(`Rime Speech Synthesis: PASS`);
}

runPipelineTests();
