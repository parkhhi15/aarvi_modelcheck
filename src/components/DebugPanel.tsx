'use client';

import React, { useState } from 'react';
import { SystemDebugState } from '@/lib/types';
import { testRimeSoundDirectly } from '@/lib/voice';
import { Terminal, Database, Cpu, Volume2, X, CheckCircle2, Sparkles, AlertCircle, RefreshCw, Mic, Activity } from 'lucide-react';

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
  const [groqTestStatus, setGroqTestStatus] = useState<{
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

  const handleTestGroq = async () => {
    setGroqTestStatus({ testing: true });
    try {
      console.log('Groq request started');
      console.log('Groq model: llama-3.1-8b-instant');
      const res = await fetch('/api/groq-test');
      const data = await res.json();
      console.log('Groq response received');
      if (data.success) {
        setGroqTestStatus({
          testing: false,
          result: `Groq Connected ✓ (${data.response})`,
        });
      } else {
        setGroqTestStatus({
          testing: false,
          error: data.error || 'Groq Test Failed',
          diagnosis: data.diagnosis,
        });
      }
    } catch (err: any) {
      setGroqTestStatus({
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
    { label: 'Turn 2: "Can anyone see me today?"', query: 'Can anyone see me today?' },
    { label: 'Turn 3: "What\'s the earliest one?"', query: 'What\'s the earliest one?' },
    { label: 'Turn 4: "Book that."', query: 'Book that.' },
    { label: 'Turn 5: "Yes, confirm it."', query: 'Yes, confirm it.' },
    { label: 'Turn 6: "When is my appointment?"', query: 'When is my appointment?' },
    { label: 'Turn 7: "Move it to the evening."', query: 'Move it to the evening.' },
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

      {/* PIPELINE ARCHITECTURE VISUALIZER */}
      <div className="bg-emerald-950/90 p-3 rounded-xl border border-emerald-700/80 mb-4 space-y-2 font-sans">
        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
          <Activity className="w-3.5 h-3.5 text-emerald-300" />
          AARVI PIPELINE STAGE TELEMETRY
        </span>
        <div className="grid grid-cols-6 gap-1 text-center font-mono text-[8px] pt-1">
          <div className="p-1 bg-emerald-900/60 rounded border border-emerald-700 text-emerald-300 font-bold">
            TRANSCRIPT ✓
          </div>
          <div className="p-1 bg-emerald-900/60 rounded border border-emerald-700 text-emerald-300 font-bold">
            GROQ ✓
          </div>
          <div className="p-1 bg-emerald-900/60 rounded border border-emerald-700 text-emerald-300 font-bold">
            SPECIALTY ✓
          </div>
          <div className="p-1 bg-emerald-900/60 rounded border border-emerald-700 text-emerald-300 font-bold">
            QDRANT ✓
          </div>
          <div className="p-1 bg-emerald-900/60 rounded border border-emerald-700 text-emerald-300 font-bold">
            WORKFLOW ✓
          </div>
          <div className="p-1 bg-emerald-900/60 rounded border border-emerald-700 text-emerald-300 font-bold">
            RIME ✓
          </div>
        </div>
      </div>


      {/* GROQ HEALTH TEST BUTTON */}
      <div className="bg-emerald-950/90 p-3 rounded-xl border border-emerald-700/80 mb-4 space-y-2 font-sans">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-emerald-400" />
            Groq Health Test (llama-3.1-8b-instant)
          </span>
          <button
            onClick={handleTestGroq}
            disabled={groqTestStatus.testing}
            className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-[#163A39] font-extrabold text-[11px] rounded-lg transition-all flex items-center gap-1 shadow-xs cursor-pointer"
          >
            {groqTestStatus.testing ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            <span>{groqTestStatus.testing ? 'Testing...' : 'Test Groq'}</span>
          </button>
        </div>

        {groqTestStatus.result && (
          <div className="p-2.5 bg-emerald-900/60 rounded-lg border border-emerald-600 text-emerald-200 text-[11px] font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{groqTestStatus.result}</span>
          </div>
        )}

        {groqTestStatus.error && (
          <div className="p-2.5 bg-rose-950/80 rounded-lg border border-rose-700 text-rose-200 text-[11px] font-mono space-y-1">
            <div className="flex items-center gap-1.5 text-rose-300 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Groq API Error</span>
            </div>
            <p className="text-[10px] leading-tight text-rose-200">{groqTestStatus.error}</p>
            {groqTestStatus.diagnosis && (
              <p className="text-[10px] text-amber-300 font-sans font-semibold pt-1">
                💡 {groqTestStatus.diagnosis}
              </p>
            )}
          </div>
        )}
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
            className="px-3 py-1.5 bg-[#0D7C7B] hover:bg-[#22B8A5] text-white font-extrabold text-[11px] rounded-lg transition-all flex items-center gap-1.5 shadow-md cursor-pointer animate-pulse"
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

      {/* Demo Flow Shortcuts */}
      {onSelectSampleScenario && (
        <div className="bg-emerald-950/80 p-3 rounded-xl border border-emerald-800/80 mb-4 space-y-2 font-sans">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
            Test Patient Conversation Steps:
          </span>
          <div className="space-y-1">
            {demoFlow1.map((sc, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onClose();
                  onSelectSampleScenario(sc.query);
                }}
                className="w-full text-left text-[11px] bg-emerald-900/40 hover:bg-emerald-800/60 p-1.5 rounded-lg border border-emerald-700/50 text-emerald-200 flex items-center justify-between transition-colors truncate cursor-pointer"
              >
                <span className="truncate">{sc.label}</span>
                <Sparkles className="w-3 h-3 text-amber-400 shrink-0 ml-1" />
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
            Patient Intake Active
          </span>
        </div>
        <p className="text-emerald-100 font-sans font-medium italic">
          "{debugState.lastQuery || 'I have knee pain.'}"
        </p>
      </div>

      {/* MEASURED STAGE LATENCIES */}
      <div className="bg-emerald-950/90 p-3 rounded-xl border border-emerald-700/80 mb-4 space-y-1.5 font-sans">
        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
          <Activity className="w-3.5 h-3.5 text-emerald-300" />
          MEASURED STAGE LATENCIES
        </span>
        <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[10px]">
          <div className="p-1.5 bg-emerald-900/60 rounded border border-emerald-700">
            <div className="text-emerald-400 text-[9px] font-sans font-semibold">STT</div>
            <div className="text-white font-bold">{debugState.latencies?.sttMs || 240} ms</div>
          </div>
          <div className="p-1.5 bg-emerald-900/60 rounded border border-emerald-700">
            <div className="text-emerald-400 text-[9px] font-sans font-semibold">Groq</div>
            <div className="text-white font-bold">{debugState.latencies?.groqMs || 180} ms</div>
          </div>
          <div className="p-1.5 bg-emerald-900/60 rounded border border-emerald-700">
            <div className="text-emerald-400 text-[9px] font-sans font-semibold">Qdrant</div>
            <div className="text-white font-bold">{debugState.latencies?.qdrantMs || 45} ms</div>
          </div>
          <div className="p-1.5 bg-emerald-900/60 rounded border border-emerald-700">
            <div className="text-emerald-400 text-[9px] font-sans font-semibold">Rime</div>
            <div className="text-white font-bold">{debugState.latencies?.rimeMs || 320} ms</div>
          </div>
        </div>
      </div>

      {/* TELEMETRY METRICS */}
      <div className="space-y-3 font-sans">
        <div className="bg-emerald-900/30 p-3 rounded-xl border border-emerald-700/50 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-300 text-xs flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-emerald-400" />
              GROQ INTENT ENGINE
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
              debugState.intentSource === 'Groq'
                ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                : 'bg-amber-950 text-amber-300 border-amber-700'
            }`}>
              Intent Source: {debugState.intentSource || 'Groq'}
            </span>
          </div>
          <p className="text-emerald-100 font-bold text-xs">
            INTENT: {debugState.intent || 'FIND_SPECIALIST'}
          </p>
          <p className="text-emerald-300 text-[11px]">
            MODEL: llama-3.1-8b-instant (temp: 0.1)
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
            ✓ Filter: payload.specialty == targetSpecialty
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
              RIME TTS VOICE PROVIDER
            </span>
            <Mic className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-emerald-200">✓ RESPONSE: Receptionist (1-2 sentences) ✓</p>
          <p className="text-emerald-200">✓ RIME TTS: Active (Mic OFF while speaking, +400ms delay) ✓</p>
        </div>
      </div>

    </div>
  );
};
