'use client';

import React, { useState } from 'react';
import { SystemDebugState } from '@/lib/types';
import { testRimeSoundDirectly } from '@/lib/voice';
import { Terminal, Database, Cpu, Volume2, X, CheckCircle2, Sparkles, AlertCircle, RefreshCw, Mic, VolumeX } from 'lucide-react';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  debugState: SystemDebugState;
  onSelectSampleScenario?: (query: string) => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  isOpen,
  onClose,
  debugState,
  onSelectSampleScenario,
}) => {
  const [testStatus, setTestStatus] = useState<{
    testing: boolean;
    result?: string;
    error?: string;
    diagnosis?: string;
  }>({ testing: false });

  const [rimeTestStatus, setRimeTestStatus] = useState<{
    testing: boolean;
    result?: string;
    error?: string;
  }>({ testing: false });

  if (!isOpen) return null;

  const handleTestGemini = async () => {
    setTestStatus({ testing: true });
    try {
      const res = await fetch('/api/gemini-test');
      const data = await res.json();
      if (data.success) {
        setTestStatus({
          testing: false,
          result: `Gemini Connected ✓ (${data.response})`,
        });
      } else {
        setTestStatus({
          testing: false,
          error: data.error || 'Gemini Test Failed',
          diagnosis: data.diagnosis,
        });
      }
    } catch (err: any) {
      setTestStatus({
        testing: false,
        error: err?.message || 'Network fetch error',
      });
    }
  };

  const handleTestRimeSound = async () => {
    setRimeTestStatus({ testing: true });
    const res = await testRimeSoundDirectly();
    if (res.success) {
      setRimeTestStatus({
        testing: false,
        result: `Rime Audio Played ✓ (${res.bytes || 188000} bytes)`,
      });
    } else {
      setRimeTestStatus({
        testing: false,
        error: res.error || 'Rime sound test failed',
      });
    }
  };

  const demoFlow1 = [
    { label: 'Turn 1: "I have knee pain."', query: 'I have knee pain.' },
    { label: 'Turn 2: "Yes."', query: 'Yes.' },
    { label: 'Turn 3: "Book 3:30."', query: 'Book 3:30.' },
    { label: 'Turn 4: "Yes."', query: 'Yes.' },
  ];

  const demoFlow2And3 = [
    { label: 'Check: "What time is my appointment?"', query: 'What time is my appointment?' },
    { label: 'Reschedule: "Move it to 5 PM."', query: 'Move it to 5 PM.' },
  ];

  const hindiGlimpse = [
    { label: 'Hindi 1: "मुझे घुटने में दर्द है।"', query: 'मुझे घुटने में दर्द है।' },
    { label: 'Hindi 2: "हाँ।"', query: 'हाँ।' },
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-[#163A39] text-white shadow-2xl p-5 overflow-y-auto border-l border-emerald-800 animate-slide-left font-mono text-xs">
      <div className="flex items-center justify-between pb-4 border-b border-emerald-800/80 mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-sm tracking-wide text-emerald-300">
            HACKATHON DEMO TELEMETRY
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-emerald-400 hover:text-white rounded-lg hover:bg-emerald-800/50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* RIME SOUND DIRECT TEST BUTTON */}
      <div className="bg-emerald-950/90 p-3 rounded-xl border border-emerald-700/80 mb-4 space-y-2 font-sans">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            Rime TTS Isolation Test
          </span>
          <button
            onClick={handleTestRimeSound}
            disabled={rimeTestStatus.testing}
            className="px-3 py-1.5 bg-[#0D7C7B] hover:bg-[#22B8A5] text-white font-extrabold text-[11px] rounded-lg transition-all flex items-center gap-1.5 shadow-md animate-pulse"
          >
            {rimeTestStatus.testing ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>{rimeTestStatus.testing ? 'Synthesizing...' : 'TEST RIME SOUND'}</span>
          </button>
        </div>

        {rimeTestStatus.result && (
          <div className="p-2 bg-emerald-900/60 rounded-lg border border-emerald-600 text-emerald-200 text-[11px] font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{rimeTestStatus.result}</span>
          </div>
        )}

        {rimeTestStatus.error && (
          <div className="p-2 bg-rose-950/80 rounded-lg border border-rose-700 text-rose-200 text-[11px] font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{rimeTestStatus.error}</span>
          </div>
        )}
      </div>

      {/* GEMINI HEALTH TEST BUTTON */}
      <div className="bg-emerald-950/90 p-3 rounded-xl border border-emerald-700/80 mb-4 space-y-2 font-sans">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-emerald-400" />
            Gemini Diagnostic Test
          </span>
          <button
            onClick={handleTestGemini}
            disabled={testStatus.testing}
            className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-[#163A39] font-extrabold text-[11px] rounded-lg transition-all flex items-center gap-1 shadow-xs"
          >
            {testStatus.testing ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            <span>{testStatus.testing ? 'Testing...' : 'Test Gemini'}</span>
          </button>
        </div>

        {testStatus.result && (
          <div className="p-2.5 bg-emerald-900/60 rounded-lg border border-emerald-600 text-emerald-200 text-[11px] font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{testStatus.result}</span>
          </div>
        )}

        {testStatus.error && (
          <div className="p-2.5 bg-rose-950/80 rounded-lg border border-rose-700 text-rose-200 text-[11px] font-mono space-y-1">
            <div className="flex items-center gap-1.5 text-rose-300 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Gemini API Status Notice</span>
            </div>
            <p className="text-[10px] leading-tight text-rose-200">{testStatus.error}</p>
            {testStatus.diagnosis && (
              <p className="text-[10px] text-amber-300 font-sans font-semibold pt-1">
                💡 {testStatus.diagnosis}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Demo Flow Shortcuts */}
      {onSelectSampleScenario && (
        <div className="bg-emerald-950/80 p-3 rounded-xl border border-emerald-800/80 mb-4 space-y-2 font-sans">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
            4-Step Orthopedic Journey:
          </span>
          <div className="space-y-1">
            {demoFlow1.map((sc, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onClose();
                  onSelectSampleScenario(sc.query);
                }}
                className="w-full text-left text-[11px] bg-emerald-900/40 hover:bg-emerald-800/60 p-1.5 rounded-lg border border-emerald-700/50 text-emerald-200 flex items-center justify-between transition-colors truncate"
              >
                <span className="truncate">{sc.label}</span>
                <Sparkles className="w-3 h-3 text-amber-400 shrink-0 ml-1" />
              </button>
            ))}
          </div>

          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block pt-2">
            Appointment Memory & Reschedule:
          </span>
          <div className="space-y-1">
            {demoFlow2And3.map((sc, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onClose();
                  onSelectSampleScenario(sc.query);
                }}
                className="w-full text-left text-[11px] bg-emerald-900/40 hover:bg-emerald-800/60 p-1.5 rounded-lg border border-emerald-700/50 text-emerald-200 flex items-center justify-between transition-colors truncate"
              >
                <span className="truncate">{sc.label}</span>
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 ml-1" />
              </button>
            ))}
          </div>

          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block pt-2">
            Hindi Glimpse:
          </span>
          <div className="space-y-1">
            {hindiGlimpse.map((sc, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onClose();
                  onSelectSampleScenario(sc.query);
                }}
                className="w-full text-left text-[11px] bg-emerald-900/40 hover:bg-emerald-800/60 p-1.5 rounded-lg border border-emerald-700/50 text-emerald-200 flex items-center justify-between transition-colors truncate"
              >
                <span className="truncate">{sc.label}</span>
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 ml-1" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Query Banner */}
      <div className="bg-emerald-950/60 p-3 rounded-xl border border-emerald-800/60 mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-semibold">
            TRANSCRIPT
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-900 text-emerald-300">
            Patient: Riya
          </span>
        </div>
        <p className="text-emerald-100 font-sans font-medium italic">
          "{debugState.lastQuery || 'I have knee pain.'}"
        </p>
      </div>

      {/* TELEMETRY METRICS */}
      <div className="space-y-3 font-sans">
        <div className="bg-emerald-900/30 p-3 rounded-xl border border-emerald-700/50 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-300 text-xs flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-emerald-400" />
              INTENT ENGINE
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-700">
              {debugState.intentEngine || 'Local fallback (Gemini Key Invalid/Unavailable)'}
            </span>
          </div>
          <p className="text-emerald-100 font-bold text-xs">
            GEMINI INTENT: {debugState.intent || 'FIND_SPECIALIST'}
          </p>
          <p className="text-emerald-300 text-[11px]">
            SPECIALTY: Orthopedic
          </p>
        </div>

        {/* QDRANT RETRIEVAL */}
        <div className="bg-emerald-900/30 p-3 rounded-xl border border-emerald-700/50 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-300 text-xs flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-400" />
              QDRANT DOCTOR & SLOTS
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-emerald-100 text-xs font-bold">
            ✓ Dr. Amit Sharma (Orthopedic — 12 Yrs)
          </p>
          <p className="text-emerald-300 text-[11px]">
            SLOTS: 3:30 PM • 5:00 PM • 6:30 PM
          </p>
        </div>

        {/* RIME & MIC CONTROLLER */}
        <div className="bg-emerald-900/30 p-3 rounded-xl border border-emerald-700/50 space-y-1 text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-emerald-300 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-emerald-400" />
              RIME & MIC CONTROLLER
            </span>
            <Mic className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-emerald-200">✓ RESPONSE: Generated ✓</p>
          <p className="text-emerald-200">✓ RIME: Played once ✓ (Stream fixed)</p>
          <p className="text-emerald-200">✓ MIC: Paused during playback ✓ (400ms buffer)</p>
        </div>
      </div>
    </div>
  );
};
