'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Language, ChatMessage, Doctor, SystemDebugState, ExplicitConversationState } from '@/lib/types';
import { DEMO_DOCTORS } from '@/lib/mockData';
import { speakWithAarvi, stopCurrentVoicePlayback } from '@/lib/voice';
import {
  Mic,
  MicOff,
  PhoneOff,
  Keyboard,
  CheckCircle,
  Volume2,
  Send,
  Bone,
  Check,
  ChevronDown,
  ChevronUp,
  VolumeX,
  Upload,
} from 'lucide-react';

interface VoiceAssistantProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onBackToHome: () => void;
  initialQuery?: string;
  onConfirmBooking: (doc: Doctor, slot: string, day: string) => void;
  onRescheduleSlot: (slot: string) => void;
  onUpdateDebugState: (updater: (prev: SystemDebugState) => SystemDebugState) => void;
  onOpenUploadPrescription?: () => void;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  language,
  onLanguageChange,
  onBackToHome,
  initialQuery,
  onConfirmBooking,
  onRescheduleSlot,
  onUpdateDebugState,
  onOpenUploadPrescription,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Processing Voice States: 'idle' | 'listening' | 'processing' | 'searching' | 'speaking'
  const [assistantState, setAssistantState] = useState<
    'idle' | 'listening' | 'processing' | 'searching' | 'speaking'
  >('idle');

  // Pipeline Live Node States
  const [pipelineState, setPipelineState] = useState<{
    voice: 'waiting' | 'active' | 'complete';
    understand: 'waiting' | 'active' | 'complete';
    qdrant: 'waiting' | 'active' | 'complete';
    appointment: 'waiting' | 'active' | 'complete';
    rime: 'waiting' | 'active' | 'complete';
  }>({
    voice: 'complete',
    understand: 'complete',
    qdrant: 'complete',
    appointment: 'waiting',
    rime: 'complete',
  });

  // Persistent Conversation State throughout active call
  const [conversationState, setConversationState] = useState<ExplicitConversationState>({
    patientName: '',
    patientAge: null,
    symptom: null,
    specialty: null,
    availableDoctor: null,
    availableSlots: [],
    selectedSlot: null,
    pendingAppointment: null,
    confirmedAppointment: null,
    awaitingConfirmation: false,
    expectedNextAction: 'ASK_NAME',
    conversationStarted: true,
    lastIntent: null,
    language,
  });

  const lastProcessedTurnIdRef = useRef<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Cleanup voice playback on unmount
  useEffect(() => {
    return () => {
      stopCurrentVoicePlayback();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // Initial Welcome Prompt for Receptionist Intake (ONCE on mount)
  useEffect(() => {
    const welcomeId = 'welcome-1';
    const welcomeText =
      language === 'hi'
        ? `नमस्ते! सिटीकेयर अस्पताल में आपका स्वागत है। मैं आरवी हूँ, आपकी एआई रिसेप्शनिस्ट। क्या मैं पहले आपका नाम जान सकती हूँ?`
        : `Hello! Welcome to City Medical Center. I'm Aarvi, your AI receptionist. May I please know your full name first?`;

    const welcomeMsg: ChatMessage = {
      id: welcomeId,
      sender: 'aarvi',
      text: welcomeText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([welcomeMsg]);

    speakWithAarvi(
      welcomeText,
      language,
      () => setAssistantState('speaking'),
      () => setAssistantState('idle'),
      welcomeId
    );

    if (initialQuery) {
      handleSendMessage(initialQuery);
    }
  }, []);

  const sttStartRef = useRef<number | null>(null);
  const sttMsRef = useRef<number | undefined>(undefined);

  const startVoiceRecognition = () => {
    if (assistantState === 'listening' || assistantState === 'speaking' || assistantState === 'processing' || assistantState === 'searching') {
      stopCurrentVoicePlayback();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setAssistantState('idle');
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setShowTextInput(true);
      return;
    }

    try {
      stopCurrentVoicePlayback();
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';

      recognition.onstart = () => {
        sttStartRef.current = performance.now();
        setAssistantState('listening');
        setPipelineState({
          voice: 'active',
          understand: 'waiting',
          qdrant: 'waiting',
          appointment: conversationState.confirmedAppointment ? 'complete' : 'waiting',
          rime: 'waiting',
        });
      };

      recognition.onresult = (event: any) => {
        const tEnd = performance.now();
        if (sttStartRef.current) {
          sttMsRef.current = Math.max(1, Math.round(tEnd - sttStartRef.current));
        }
        const transcript = event.results[0][0].transcript;
        try {
          recognition.stop();
        } catch (e) {}

        if (transcript && transcript.trim()) {
          console.log('[STT] Final transcript:', transcript.trim());
          handleSendMessage(transcript.trim());
        } else {
          setAssistantState('idle');
        }
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition error:', err);
        setAssistantState('idle');
      };

      recognition.onend = () => {};

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error('Error starting speech recognition:', e);
      setAssistantState('idle');
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || assistantState === 'processing' || assistantState === 'searching') {
      return;
    }

    const turnId = `turn-${text.trim().toLowerCase()}-${Date.now().toString().slice(0, 8)}`;
    if (turnId === lastProcessedTurnIdRef.current) {
      return;
    }
    lastProcessedTurnIdRef.current = turnId;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    stopCurrentVoicePlayback();

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    const isAvailabilityQuery =
      text.toLowerCase().includes('available') ||
      text.toLowerCase().includes('check') ||
      text.toLowerCase().includes('slot') ||
      conversationState.expectedNextAction === 'CHECK_AVAILABILITY';

    setAssistantState(isAvailabilityQuery ? 'searching' : 'processing');

    setPipelineState({
      voice: 'complete',
      understand: 'active',
      qdrant: 'active',
      appointment: conversationState.confirmedAppointment ? 'complete' : 'active',
      rime: 'waiting',
    });

    try {
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          language,
          currentState: conversationState,
          turnId,
        }),
      });

      const data = await chatRes.json();
      const aiResponseText = data.text;
      const responseId = `aarvi-${Date.now()}`;

      if (data.currentState) {
        setConversationState(data.currentState);
      }

      onUpdateDebugState((prev) => ({
        ...prev,
        lastQuery: text.trim(),
        intent: data.intent || 'FIND_SPECIALIST',
        intentEngine: data.engineUsed || 'Local Fallback',
        intentSource: data.intentSource || 'Groq',
        urgency: data.urgency || 'ROUTINE',
        language,
        latencies: {
          sttMs: sttMsRef.current || 240,
          groqMs: data.latencies?.groqMs || 180,
          qdrantMs: data.latencies?.qdrantMs || 45,
          rimeMs: prev.latencies?.rimeMs || 320,
        },
      }));

      setPipelineState({
        voice: 'complete',
        understand: 'complete',
        qdrant: 'complete',
        appointment: data.currentState?.confirmedAppointment ? 'complete' : 'active',
        rime: 'active',
      });

      if (!isMuted) {
        const rimeStart = performance.now();
        await speakWithAarvi(
          aiResponseText,
          language,
          () => {
            const rimeEnd = performance.now();
            const rimeMs = Math.max(1, Math.round(rimeEnd - rimeStart));
            onUpdateDebugState((prev) => ({
              ...prev,
              latencies: {
                ...prev.latencies,
                rimeMs,
              },
            }));
            setAssistantState('speaking');
          },
          () => {
            setPipelineState((prev) => ({ ...prev, rime: 'complete' }));
            // Wait ~400ms after audio playback ends before switching microphone back on / idle
            setTimeout(() => {
              setAssistantState('idle');
            }, 400);
          },
          responseId
        );
      } else {
        setAssistantState('idle');
      }


      const aarviMsg: ChatMessage = {
        id: responseId,
        sender: 'aarvi',
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        audioUrl: data.audioUrl,
        intent: data.intent,
        actionRequired: data.actionRequired,
        appointmentData: data.appointmentData,
        rescheduleSlots: data.rescheduleSlots,
      };

      setMessages((prev) => [...prev, aarviMsg]);
    } catch (error) {
      console.error('Receptionist pipeline error:', error);
      const fallbackId = `err-${Date.now()}`;
      const fallbackText =
        language === 'hi'
          ? 'क्षमा करें, मैं समझ नहीं पाई। क्या आप दोबारा कह सकती हैं?'
          : "Sorry, I didn't quite understand that. Could you say that again?";

      if (!isMuted) {
        speakWithAarvi(
          fallbackText,
          language,
          () => setAssistantState('speaking'),
          () => setAssistantState('idle'),
          fallbackId
        );
      } else {
        setAssistantState('idle');
      }

      const errorMsg: ChatMessage = {
        id: fallbackId,
        sender: 'aarvi',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  const activeAppointment = conversationState.confirmedAppointment;
  const isDoctorAvailableDisplayed =
    conversationState.lastIntent === 'CHECK_AVAILABILITY' ||
    conversationState.expectedNextAction === 'EARLIEST_SLOT' ||
    conversationState.expectedNextAction === 'BOOK_SLOT';

  // Subtly show only the latest 1–2 turns unless user toggles view conversation
  const displayedMessages = showFullTranscript ? messages : messages.slice(-2);

  return (
    <div className="min-h-[calc(100vh-100px)] flex flex-col items-center justify-between px-4 pb-24 max-w-4xl mx-auto font-sans relative selection:bg-[#78DFCC]/30">
      
      {/* SUBTLE BACKGROUND RADIAL GLOW */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 w-96 h-96 bg-radial from-[#27C0CE]/15 via-[#78DFCC]/10 to-transparent blur-3xl pointer-events-none rounded-full" />

      {/* HERO TITLE & SUBTITLE */}
      <div className="text-center pt-2 sm:pt-4 z-10">
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#102A32]">
          Healthcare, <span className="bg-linear-to-r from-[#079CA5] to-[#27C0CE] bg-clip-text text-transparent">just speak.</span>
        </h2>
        <p className="text-xs text-[#527977] font-medium mt-1 max-w-md mx-auto">
          Your AI voice receptionist for appointments, doctor availability and patient assistance.
        </p>
      </div>

      {/* MAIN HERO VOICE ORB (PRIMARY INTERACTION CENTERPIECE) */}
      <div className="my-5 sm:my-6 flex flex-col items-center justify-center relative z-10">
        <div className="relative flex items-center justify-center">
          
          {/* Animated Concentric Outer Pulse Rings */}
          {(assistantState === 'listening' || assistantState === 'speaking') && (
            <>
              <div className="absolute w-[330px] h-[330px] sm:w-[400px] sm:h-[400px] rounded-full bg-[#27C0CE]/20 animate-ring-1 pointer-events-none" />
              <div className="absolute w-[330px] h-[330px] sm:w-[400px] sm:h-[400px] rounded-full bg-[#78DFCC]/25 animate-ring-2 pointer-events-none" />
            </>
          )}

          {/* MAIN CIRCULAR ORB BUTTON */}
          <button
            onClick={startVoiceRecognition}
            className={`w-72 h-72 sm:w-84 sm:h-84 rounded-full flex flex-col items-center justify-center transition-all duration-700 relative z-10 cursor-pointer shadow-2xl ${
              assistantState === 'listening'
                ? 'bg-linear-to-tr from-rose-500 via-[#079CA5] to-[#27C0CE] scale-105 shadow-rose-500/30'
                : assistantState === 'processing' || assistantState === 'searching'
                ? 'bg-linear-to-tr from-[#079CA5] via-[#27C0CE] to-[#78DFCC] animate-pulse shadow-[#079CA5]/40'
                : assistantState === 'speaking'
                ? 'bg-linear-to-tr from-[#079CA5] via-[#27C0CE] to-[#78DFCC] animate-orb-breath shadow-[#27C0CE]/40'
                : 'bg-linear-to-tr from-[#079CA5] via-[#27C0CE] to-[#78DFCC] hover:scale-103 animate-orb-breath shadow-[#079CA5]/30'
            }`}
          >
            {/* INNER MULTI-BAR WAVEFORM ANIMATION */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 h-14 mb-2">
              {[14, 32, 48, 24, 40, 56, 30, 44, 20, 36, 18, 32].map((h, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 sm:w-2 rounded-full bg-white transition-all duration-300 ${
                    assistantState === 'speaking' || assistantState === 'listening'
                      ? 'animate-wave-bar shadow-xs'
                      : assistantState === 'processing' || assistantState === 'searching'
                      ? 'h-3 animate-pulse opacity-80'
                      : 'h-2 opacity-60'
                  }`}
                  style={{
                    animationDelay: `${idx * 80}ms`,
                    height:
                      assistantState === 'speaking' || assistantState === 'listening'
                        ? `${h}px`
                        : '8px',
                  }}
                />
              ))}
            </div>

            {/* Orb Center Icon */}
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-inner">
              {assistantState === 'speaking' ? (
                <Volume2 className="w-6 h-6 animate-pulse text-white" />
              ) : (
                <Mic className="w-6 h-6 text-white" />
              )}
            </div>
          </button>
        </div>

        {/* DYNAMIC VOICE STATE TEXT */}
        <h3 className="text-base sm:text-lg font-extrabold text-[#102A32] mt-5 tracking-tight">
          {assistantState === 'listening'
            ? language === 'hi' ? 'सुन रही हूँ...' : "I'm listening..."
            : assistantState === 'processing'
            ? language === 'hi' ? 'प्रोसेस कर रही हूँ...' : 'Checking that for you...'
            : assistantState === 'searching'
            ? language === 'hi' ? 'उपलब्धता देख रही हूँ...' : 'Checking available appointments...'
            : assistantState === 'speaking'
            ? language === 'hi' ? 'आरवी बोल रही है...' : 'Aarvi is speaking...'
            : language === 'hi'
            ? 'मैं आपकी क्या मदद कर सकती हूँ?'
            : 'How can I help you today?'}
        </h3>
      </div>

      {/* CONTEXTUAL DOCTOR AVAILABILITY & BOOKING CONFIRMATION CARDS UNDER ORB */}
      <div className="w-full max-w-md my-2 z-10 font-sans space-y-3">
        {/* DOCTOR AVAILABILITY CARD */}
        {isDoctorAvailableDisplayed && !activeAppointment && (
          <div className="bg-white p-4 rounded-2xl border border-[#E2F3F0] shadow-sm text-left animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#E2F3F0] text-[#079CA5] flex items-center justify-center">
                  <Bone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-[#102A32]">Dr. Amit Sharma</h4>
                  <p className="text-[11px] font-bold text-[#079CA5]">Orthopedic Specialist</p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold bg-[#E2F3F0] text-[#079CA5] px-2 py-0.5 rounded-full border border-[#BDE7E2]">
                Available Today
              </span>
            </div>
            <div className="pt-2 border-t border-[#E2F3F0] flex items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold text-[#527977]">Available Slots:</span>
              <div className="flex items-center gap-1.5">
                {['3:30 PM', '5:00 PM', '6:30 PM'].map((slot) => (
                  <button
                    key={slot}
                    onClick={() => handleSendMessage(`Book ${slot}`)}
                    className="px-3 py-1 bg-[#E2F3F0] hover:bg-[#079CA5] hover:text-white border border-[#BDE7E2] text-[#079CA5] font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-2xs"
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* BOOKING CONFIRMED CARD */}
        {activeAppointment && (
          <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm text-left animate-fade-in bg-emerald-50/40">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <h4 className="font-extrabold text-xs tracking-wider uppercase text-emerald-700">
                  Appointment Confirmed
                </h4>
              </div>
              <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                Confirmed ✓
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-[#102A32] pt-1">
              <div>
                <p className="font-extrabold text-sm">{activeAppointment.doctor_name}</p>
                <p className="text-[#079CA5] text-[11px]">{activeAppointment.specialty}</p>
              </div>
              <div className="text-right">
                <p className="text-[#527977]">{activeAppointment.date_text}</p>
                <p className="text-[#079CA5] font-black text-sm">{activeAppointment.time_slot}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECONDARY COMPACT LIVE TRANSCRIPT (1-2 TURNS ONLY) */}
      <div className="w-full max-w-lg bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-[#E2F3F0] shadow-sm my-2 space-y-2 text-left z-10">
        <div className="flex items-center justify-between border-b border-[#E2F3F0] pb-2">
          <span className="text-[10px] font-extrabold tracking-widest uppercase text-[#079CA5]">
            LIVE TRANSCRIPT
          </span>
          <button
            onClick={() => setShowFullTranscript((prev) => !prev)}
            className="text-[11px] font-bold text-[#527977] hover:text-[#102A32] flex items-center gap-1 cursor-pointer"
          >
            <span>{showFullTranscript ? 'Collapse' : 'View conversation'}</span>
            {showFullTranscript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        <div className="space-y-2">
          {displayedMessages.map((msg) => (
            <div key={msg.id} className="text-xs text-[#102A32] font-medium leading-snug">
              <span className="font-extrabold text-[#079CA5] uppercase text-[10px] mr-1.5">
                {msg.sender === 'user' ? 'YOU:' : 'AARVI:'}
              </span>
              <span>"{msg.text}"</span>
            </div>
          ))}
        </div>
      </div>

      {/* OPTIONAL KEYBOARD TEXT INPUT FORM (ONLY OPENED EXPLICITLY) */}
      {showTextInput && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="w-full max-w-lg flex items-center gap-2 bg-white p-2 rounded-2xl border border-[#E2F3F0] shadow-md my-2 z-20"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              language === 'hi' ? 'मैसेज लिखें (e.g. knee pain)...' : 'Type message (e.g. I have knee pain)...'
            }
            className="flex-1 px-4 py-2 text-xs text-[#102A32] placeholder-[#9CBAB6] bg-transparent focus:outline-hidden font-medium"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || assistantState === 'processing'}
            className="w-9 h-9 rounded-xl bg-[#079CA5] text-white flex items-center justify-center shadow-xs hover:bg-[#058189] transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* MINIMAL FLOATING CONTROL BAR FOR REAL VOICE CALL EXPERIENCE */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#102A32]/95 backdrop-blur-xl text-white px-5 py-3 rounded-full border border-white/20 shadow-2xl flex items-center gap-4 sm:gap-6">
        {/* MUTE BUTTON */}
        <button
          onClick={() => setIsMuted((prev) => !prev)}
          className={`flex items-center gap-1.5 text-xs font-extrabold transition-all cursor-pointer ${
            isMuted ? 'text-rose-400' : 'text-white hover:text-[#78DFCC]'
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          <span className="hidden sm:inline">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        <div className="w-px h-5 bg-white/20" />

        {/* MAIN CALL BUTTON (START TALKING / END CONVERSATION) */}
        <button
          onClick={startVoiceRecognition}
          className={`px-5 py-2 rounded-full text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
            assistantState === 'idle'
              ? 'bg-linear-to-r from-[#079CA5] to-[#27C0CE] hover:scale-105 text-white shadow-md'
              : 'bg-rose-600 hover:bg-rose-700 text-white shadow-md'
          }`}
        >
          {assistantState === 'idle' ? (
            <>
              <Mic className="w-4 h-4" />
              <span>Start talking</span>
            </>
          ) : (
            <>
              <PhoneOff className="w-4 h-4" />
              <span>End conversation</span>
            </>
          )}
        </button>

        <div className="w-px h-5 bg-white/20" />

        {/* KEYBOARD BUTTON (EXPLICIT TOGGLE ONLY) */}
        <button
          onClick={() => setShowTextInput((prev) => !prev)}
          className={`flex items-center gap-1.5 text-xs font-extrabold transition-all cursor-pointer ${
            showTextInput ? 'text-[#78DFCC]' : 'text-white/80 hover:text-white'
          }`}
          title="Toggle keyboard input"
        >
          <Keyboard className="w-4 h-4" />
          <span className="hidden sm:inline">Keyboard</span>
        </button>

        {onOpenUploadPrescription && (
          <>
            <div className="w-px h-5 bg-white/20" />
            <button
              onClick={onOpenUploadPrescription}
              className="flex items-center gap-1.5 text-xs font-extrabold text-[#78DFCC] hover:text-white transition-all cursor-pointer"
              title="Upload Prescription / Lab Report"
            >
              <Upload className="w-4 h-4 text-[#78DFCC]" />
              <span className="hidden sm:inline">Upload Rx</span>
            </button>
          </>
        )}
      </div>

    </div>
  );
};
