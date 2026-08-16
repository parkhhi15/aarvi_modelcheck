# 🏥 AARVI — AI Healthcare Voice Receptionist

> **An intelligent, voice-first AI receptionist designed to integrate directly into hospital and clinic websites.**

AARVI helps patients find the right doctor, check availability, and manage appointments through natural voice conversations — without navigating complicated hospital websites or waiting for reception calls.

## 🚀 Try AARVI

🌐 **Live Demo:**  
[https://aarvi-modelcheck.onrender.com/](https://aarvi-modelcheck.onrender.com/)

## Product Demo

🚀 **Live Working Prototype**

👉 [Open AARVI Live Demo](https://aarvi-modelcheck.onrender.com/)

The prototype demonstrates how AARVI can operate as an AI voice receptionist inside a healthcare website.

---

## 🎬 See AARVI in Action

AARVI demonstrates a complete voice-first patient journey:

**Talk to AARVI → Describe your concern → Find the right specialist → Check doctor availability → Choose a slot → Confirm appointment**

[▶️ **Watch the Full Product Demo**](https://drive.google.com/file/d/1Sf_TcIEpDaXeV31ZdVGcIw6ohXIebVNi/view?usp=drivesdk)

---

## Project Description

### What is AARVI?

**AARVI** is an AI-powered healthcare voice receptionist designed to work as an **embeddable conversational assistant inside existing hospital and clinic websites**.

Instead of requiring patients to search through doctor directories, navigate multiple pages, fill out forms, or call reception, AARVI allows them to simply **speak naturally**.

For example, a patient can say:

> **"I have been having knee pain for the last three days."**

AARVI understands the patient's concern, identifies that an **Orthopedic specialist may be suitable**, retrieves relevant doctors, checks their available appointment slots, and helps the patient complete the booking through conversation.

The patient can also ask questions such as:

- "Which doctors are available today?"
- "Who has the earliest appointment?"
- "Is there another doctor available?"
- "Do you have any evening slots?"
- "Book the 6 PM appointment."
- "What time is my appointment?"
- "Can you reschedule my appointment?"

AARVI is designed to support conversations in both **English and Hindi**, making healthcare navigation more accessible for different types of patients.

### Why We Built It

A patient's healthcare journey often begins long before they meet a doctor.

Patients frequently need to:

- Identify which specialist they should visit
- Search for available doctors
- Call hospital reception desks
- Ask about appointment availability
- Compare different appointment times
- Book or reschedule appointments
- Ask repetitive administrative questions

At the same time, hospital reception staff have to manage incoming calls, walk-in patients, doctor schedules, cancellations, and general enquiries.

We built AARVI around a simple question:

> **What if accessing hospital services could be as simple as having a conversation?**

Instead of creating another standalone healthcare application that patients need to download or learn, AARVI is designed as an **AI layer that hospitals and clinics can integrate into their existing websites**.

### Why This Problem Matters

Healthcare accessibility is not only about receiving medical treatment. Patients also need simple and reliable ways to reach the appropriate healthcare professional.

Traditional reception workflows can become overloaded with repetitive enquiries and appointment coordination.

A voice-first AI receptionist can help automate routine administrative interactions while allowing human reception staff to focus on situations that genuinely require human attention.

### Technical Contribution

AARVI separates conversational intelligence from healthcare information retrieval and operational workflows.

```text
Patient Voice
      │
      ▼
Speech-to-Text
      │
      ▼
AI Intent Understanding
      │
      ▼
Qdrant Retrieval
      │
      ├── Doctor Information
      ├── Specialty
      ├── Availability
      └── Clinic Information
      │
      ▼
Appointment Workflow
      │
      ▼
Database / Session State
      │
      ▼
Rime Voice Generation
      │
      ▼
Patient
```

Each part of the system has a specific responsibility:

| Component | Responsibility |
|---|---|
| **AI / LLM** | Understand what the patient wants |
| **Qdrant** | Retrieve relevant doctor and healthcare information |
| **Workflow Engine** | Manage conversation and appointment actions |
| **Database** | Store relevant appointment information |
| **Rime** | Generate natural voice responses |
| **Web Interface** | Provide the patient-facing voice experience |

This separation helps reduce hallucinations because operational information such as doctor details and appointment availability can be retrieved from structured sources instead of being invented by the language model.

### Core Capabilities

AARVI currently focuses on:

- 🎙️ Natural voice-first conversations
- 👤 Conversational patient name and age intake
- 🩺 Patient concern to specialty routing
- 👨‍⚕️ Doctor discovery
- 🔄 Alternative doctor selection
- 📅 Doctor availability checking
- ⏰ Appointment slot selection
- ✅ Appointment confirmation
- 🔁 Rescheduling and cancellation workflows
- 🧠 Conversational context
- 🇮🇳 Hindi and English interaction
- 🔊 Continuous voice conversation
- 🌐 Embeddable healthcare website architecture

### Example Patient Journey

```text
AARVI:
Hello, I'm Aarvi. May I know your name?

PATIENT:
Riya.

AARVI:
Nice to meet you, Riya. May I know your age?

PATIENT:
I'm 24.

AARVI:
Thank you, Riya. How can I help you today?

PATIENT:
I've had knee pain for three days.

AARVI:
An Orthopedic specialist may be suitable.
Dr. Amit Sharma is available today.

PATIENT:
Is there another doctor available?

AARVI:
Another Orthopedic doctor is also available today.

PATIENT:
What slots are available?

AARVI:
4 PM and 6 PM are available.

PATIENT:
Book the 6 PM appointment.

AARVI:
Would you like me to confirm your appointment for 6 PM?

PATIENT:
Yes.

AARVI:
Done, Riya. Your appointment is confirmed for today at 6 PM.
```

### Embeddable Vision

AARVI is not intended to be limited to one hospital.

The architecture is designed so that the same voice receptionist can eventually be configured for multiple healthcare providers.

```text
Hospital Website A ───┐
                      │
Hospital Website B ───┼────► AARVI Voice Receptionist
                      │                 │
Clinic Website C ─────┘                 ▼
                               Hospital / Clinic ID
                                        │
                          ┌─────────────┼─────────────┐
                          ▼             ▼             ▼
                       Doctors       Services       Slots
                          │             │             │
                          └─────────────┼─────────────┘
                                        ▼
                                  Appointments
```

Each hospital could connect its own doctors, departments, schedules, services, and information while using the same AARVI conversational interface.

---

## Product Demo

### 🚀 Live Working Prototype

👉 **[https://aarvi-modelcheck.onrender.com/](https://aarvi-modelcheck.onrender.com/)**

The prototype demonstrates how AARVI can operate as an AI receptionist inside a healthcare website.

### 🎥 Product Demo Video

> Demo Video: [Watch AARVI Product Demo](https://drive.google.com/file/d/1Sf_TcIEpDaXeV31ZdVGcIw6ohXIebVNi/view?usp=drivesdk)

Once the final demo video is uploaded, it can also be embedded using a thumbnail:



### Demo Flow

The demonstration follows a complete patient journey:

```text
Hospital Website
      ↓
Open AARVI
      ↓
Voice Conversation Starts
      ↓
Patient Name & Age
      ↓
Patient Describes Concern
      ↓
Specialty Identification
      ↓
Doctor Retrieval
      ↓
Check Availability
      ↓
Choose / Change Doctor
      ↓
Select Appointment Slot
      ↓
Confirm Appointment
```

The goal of the demonstration is to show that AARVI behaves more like a **digital receptionist** than a traditional text chatbot.

---

## Reproducibility

The following steps can be used to set up and reproduce AARVI locally.

### Prerequisites

Make sure you have installed:

- **Node.js**
- **npm**
- **Git**

You will also need credentials for the external services enabled in the project.

---

## Performance Metrics

AARVI is evaluated using metrics that represent the reliability of the **complete AI receptionist workflow**, rather than evaluating only the language model.

| Metric | Result |
|---|---:|
| Intent Classification Accuracy | **To be measured** |
| Specialty Routing Accuracy | **To be measured** |
| Doctor Retrieval Success Rate | **To be measured** |
| Appointment Flow Completion Rate | **To be measured** |
| Average End-to-End Response Latency | **To be measured** |
| Hindi Query Success Rate | **To be measured** |

### Why These Metrics?

**Intent Classification Accuracy** measures whether AARVI correctly understands patient requests such as finding a doctor, checking availability, changing doctors, booking, or rescheduling.

**Specialty Routing Accuracy** measures whether supported patient concerns are mapped to the expected medical specialty.

**Doctor Retrieval Success Rate** measures whether the retrieval system successfully returns a relevant doctor for the required specialty.

**Appointment Flow Completion Rate** measures whether a patient can move from the initial conversation to a confirmed appointment without losing important conversational context.

**Average End-to-End Response Latency** measures how quickly AARVI responds after the patient finishes speaking. Response speed is important because large delays make voice conversations feel unnatural.

**Hindi Query Success Rate** measures whether Hindi patient requests are understood and processed correctly instead of assuming that performance in English automatically transfers to Hindi.

### Evaluation Method

A fixed set of test conversations can be used covering:

- Specialty identification
- Doctor discovery
- Doctor availability
- Alternative doctor requests
- Alternative appointment times
- Slot selection
- Appointment booking
- Appointment confirmation
- Appointment memory
- Rescheduling
- Cancellation
- Hindi conversations
- English conversations

Example evaluation format:

| Test Query | Expected Result | Actual Result | Status |
|---|---|---|---|
| I have knee pain | Orthopedic | Orthopedic | PASS |
| I have fever | General Physician | General Physician | PASS |
| Show another doctor | Alternative doctor | Test result | — |
| Book 6 PM | 6 PM selected | Test result | — |
| What time is my appointment? | Confirmed slot | Test result | — |

> **Important:** Final performance values should be calculated from actual test runs. No fabricated benchmark values are reported.

---

## Credits

Special thanks to the partners and technologies supporting the development of AARVI:

### 🤝 Pathway
For supporting intelligent data processing and AI infrastructure.

### 🤝 Rime
For enabling natural and responsive AI voice experiences.

### 🤝 Weya
For supporting the development and innovation ecosystem around the project.

### 🤝 Qdrant
For providing vector search and retrieval infrastructure for intelligent doctor and healthcare information retrieval.

We also acknowledge the open-source tools and developer communities that make rapid experimentation with conversational AI possible.

---

### 🛡️ Safety & Scope

AARVI is designed as a **healthcare navigation and administrative assistant**, not as a replacement for medical professionals.

AARVI can help with healthcare navigation, specialty routing, doctor information, availability, and appointment management.

It is **not intended to diagnose diseases, prescribe medication, replace doctors, or replace professional medical judgment.**

---

## 🎯 Our Vision

Healthcare access should not begin with complicated websites, long navigation flows, or unanswered reception calls.

> # **Just talk. AARVI handles the front desk.**

### 🌐 Try AARVI

**Live Demo:**  
**[https://aarvi-modelcheck.onrender.com/](https://aarvi-modelcheck.onrender.com/)**
