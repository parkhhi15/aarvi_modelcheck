'use client';

import React from 'react';
import { Language } from '@/lib/types';
import { Sparkles, Volume2, CheckCircle2, ArrowRight } from 'lucide-react';

interface LanguageSelectorProps {
  currentLanguage: Language;
  onSelectLanguage: (lang: Language) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  onSelectLanguage,
}) => {
  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-8 text-center max-w-md mx-auto animate-fade-in">
      {/* Visual Avatar / Icon */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-linear-to-tr from-[#0D7C7B] to-[#22B8A5] p-1 shadow-xl shadow-[#0D7C7B]/25 flex items-center justify-center animate-orb-glow">
          <div className="w-full h-full rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
            <Volume2 className="w-12 h-12 animate-pulse" />
          </div>
        </div>
        <div className="absolute -bottom-2 -right-2 bg-[#BFE8E2] text-[#0D7C7B] p-2 rounded-full shadow-md border-2 border-white">
          <Sparkles className="w-5 h-5" />
        </div>
      </div>

      {/* Header Titles */}
      <h1 className="text-3xl font-extrabold text-[#163A39] tracking-tight mb-2">
        Choose your language
      </h1>
      <p className="text-lg font-medium text-[#0D7C7B] mb-1">
        अपनी भाषा चुनें
      </p>
      <p className="text-sm text-[#4C7270] mb-8 font-normal">
        Aarvi speaks your language. / आरवी आपकी भाषा बोलती है।
      </p>

      {/* Options Cards */}
      <div className="w-full space-y-4 mb-8">
        {/* English Button */}
        <button
          onClick={() => onSelectLanguage('en')}
          className={`w-full p-5 rounded-2xl border-2 text-left flex items-center justify-between transition-all group shadow-sm ${
            currentLanguage === 'en'
              ? 'border-[#0D7C7B] bg-[#EBF7F5] shadow-md shadow-[#0D7C7B]/10'
              : 'border-[#E1F0ED] bg-white hover:border-[#22B8A5] hover:bg-[#F7FBFA]'
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg transition-colors ${
                currentLanguage === 'en'
                  ? 'bg-[#0D7C7B] text-white'
                  : 'bg-[#F0F7F6] text-[#163A39] group-hover:bg-[#BFE8E2]'
              }`}
            >
              EN
            </div>
            <div>
              <h3 className="font-bold text-lg text-[#163A39]">English</h3>
              <p className="text-xs text-[#4C7270]">Continue in English</p>
            </div>
          </div>
          {currentLanguage === 'en' ? (
            <CheckCircle2 className="w-6 h-6 text-[#0D7C7B]" />
          ) : (
            <ArrowRight className="w-5 h-5 text-[#9CBAB6] group-hover:text-[#0D7C7B] group-hover:translate-x-1 transition-all" />
          )}
        </button>

        {/* Hindi Button */}
        <button
          onClick={() => onSelectLanguage('hi')}
          className={`w-full p-5 rounded-2xl border-2 text-left flex items-center justify-between transition-all group shadow-sm ${
            currentLanguage === 'hi'
              ? 'border-[#0D7C7B] bg-[#EBF7F5] shadow-md shadow-[#0D7C7B]/10'
              : 'border-[#E1F0ED] bg-white hover:border-[#22B8A5] hover:bg-[#F7FBFA]'
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg transition-colors ${
                currentLanguage === 'hi'
                  ? 'bg-[#0D7C7B] text-white'
                  : 'bg-[#F0F7F6] text-[#163A39] group-hover:bg-[#BFE8E2]'
              }`}
            >
              हिं
            </div>
            <div>
              <h3 className="font-bold text-lg text-[#163A39]">हिन्दी</h3>
              <p className="text-xs text-[#4C7270]">हिन्दी में बातचीत करें</p>
            </div>
          </div>
          {currentLanguage === 'hi' ? (
            <CheckCircle2 className="w-6 h-6 text-[#0D7C7B]" />
          ) : (
            <ArrowRight className="w-5 h-5 text-[#9CBAB6] group-hover:text-[#0D7C7B] group-hover:translate-x-1 transition-all" />
          )}
        </button>
      </div>

      {/* Security & Hospital Badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-[#4C7270] bg-white px-4 py-2 rounded-full border border-[#E1F0ED]">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
        <span>Aarogya Hospital AI Voice Care Engine</span>
      </div>
    </div>
  );
};
