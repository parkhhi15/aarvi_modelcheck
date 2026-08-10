'use client';

import React from 'react';
import { Language } from '@/lib/types';
import { Sparkles } from 'lucide-react';

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onLogoClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  onLogoClick,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#F7FCFB]/90 backdrop-blur-md border-b border-[#E2F3F0] px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* LEFT: AARVI Icon & Brand Title */}
        <button
          onClick={onLogoClick}
          className="flex items-center gap-3 focus:outline-hidden text-left group"
        >
          <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-[#079CA5] to-[#27C0CE] flex items-center justify-center text-white shadow-md shadow-[#079CA5]/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight text-[#102A32] leading-none">
              AARVI
            </h1>
            <p className="text-xs font-semibold text-[#079CA5] mt-0.5">
              AI Voice Receptionist
            </p>
          </div>
        </button>

        {/* RIGHT: Tech Badge & Language Selector */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E2F3F0]/60 text-[#079CA5] font-extrabold text-[11px] border border-[#BDE7E2]">
            <span>✦ Rime Voice • Qdrant RAG</span>
          </div>

          <div className="flex items-center bg-[#E2F3F0]/80 p-0.5 rounded-full border border-[#BDE7E2]">
            <button
              onClick={() => onLanguageChange('en')}
              className={`px-3 py-1 text-xs font-extrabold rounded-full transition-all ${
                language === 'en'
                  ? 'bg-[#079CA5] text-white shadow-xs'
                  : 'text-[#527977] hover:text-[#102A32]'
              }`}
            >
              English
            </button>
            <button
              onClick={() => onLanguageChange('hi')}
              className={`px-3 py-1 text-xs font-extrabold rounded-full transition-all ${
                language === 'hi'
                  ? 'bg-[#079CA5] text-white shadow-xs'
                  : 'text-[#527977] hover:text-[#102A32]'
              }`}
            >
              हिन्दी
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
