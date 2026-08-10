'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, AlertCircle, Sparkles } from 'lucide-react';
import { Language } from '@/lib/types';

interface AudioPlayerProps {
  audioUrl?: string;
  audioBuffer?: ArrayBuffer;
  fallbackVoice?: boolean;
  language: Language;
  autoPlay?: boolean;
  onEnded?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  fallbackVoice = false,
  language,
  autoPlay = true,
  onEnded,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (audioRef.current && audioUrl && !fallbackVoice) {
      if (autoPlay) {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => console.warn('Audio auto-play prevented:', err));
      }
    }
  }, [audioUrl, autoPlay, fallbackVoice]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => console.error(e));
    }
  };

  const handleReplay = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch((e) => console.error(e));
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    if (onEnded) onEnded();
  };

  if (fallbackVoice) {
    return (
      <div className="flex items-center justify-between bg-[#FFF8F0] border border-[#FEE3C6] px-4 py-2.5 rounded-2xl text-xs text-[#9A5208] mt-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#D97706]" />
          <span className="font-semibold">
            {language === 'hi'
              ? 'आवाज अस्थायी रूप से अनुपलब्ध है।'
              : 'Voice temporarily unavailable.'}
          </span>
        </div>
        <span className="text-[10px] bg-[#FEF3C7] text-[#B45309] font-bold px-2 py-0.5 rounded-md uppercase">
          Text Mode
        </span>
      </div>
    );
  }

  return (
    <div className="bg-linear-to-r from-[#EBF7F5] to-[#F7FBFA] border border-[#BFE8E2] p-3.5 rounded-2xl shadow-xs mt-3">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleAudioEnded}
        />
      )}

      {/* Header Status & Waveform */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#0D7C7B] animate-ping" />
          <span className="text-xs font-bold text-[#0D7C7B] tracking-wide flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            {isPlaying
              ? language === 'hi'
                ? 'आरवी बोल रही है...'
                : 'Aarvi is speaking...'
              : language === 'hi'
              ? 'आरवी वाइस रिस्पॉन्स (Rime TTS)'
              : 'Aarvi Voice Response (Rime TTS)'}
          </span>
        </div>

        {/* Animated Waveform Bars */}
        <div className="flex items-center gap-1 h-5 px-2">
          <div
            className={`w-1 bg-[#0D7C7B] rounded-full transition-all duration-300 ${
              isPlaying ? 'animate-wave-bar' : 'h-2'
            }`}
            style={{ animationDelay: '0ms' }}
          />
          <div
            className={`w-1 bg-[#22B8A5] rounded-full transition-all duration-300 ${
              isPlaying ? 'animate-wave-bar' : 'h-3'
            }`}
            style={{ animationDelay: '200ms' }}
          />
          <div
            className={`w-1 bg-[#0D7C7B] rounded-full transition-all duration-300 ${
              isPlaying ? 'animate-wave-bar' : 'h-4'
            }`}
            style={{ animationDelay: '400ms' }}
          />
          <div
            className={`w-1 bg-[#22B8A5] rounded-full transition-all duration-300 ${
              isPlaying ? 'animate-wave-bar' : 'h-2'
            }`}
            style={{ animationDelay: '150ms' }}
          />
          <div
            className={`w-1 bg-[#0D7C7B] rounded-full transition-all duration-300 ${
              isPlaying ? 'animate-wave-bar' : 'h-3'
            }`}
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between gap-3 bg-white/80 p-2 rounded-xl border border-[#D1EAE6]">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          className="flex items-center gap-2 bg-[#0D7C7B] hover:bg-[#095A59] text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-transform active:scale-95"
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4" />
              <span>{language === 'hi' ? 'रोकें' : 'Pause'}</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>{language === 'hi' ? 'सुनें' : 'Play'}</span>
            </>
          )}
        </button>

        {/* Replay Button */}
        <button
          onClick={handleReplay}
          className="flex items-center gap-1.5 text-[#4C7270] hover:text-[#0D7C7B] hover:bg-[#EBF7F5] px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors"
          title="Replay Audio"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{language === 'hi' ? 'पुनः सुनें' : 'Replay'}</span>
        </button>

        {/* Audio Speaker Tag */}
        <div className="flex items-center gap-1 text-[11px] font-semibold text-[#0D7C7B] bg-[#EBF7F5] px-2.5 py-1 rounded-lg">
          <Volume2 className="w-3.5 h-3.5" />
          <span>Rime TTS</span>
        </div>
      </div>
    </div>
  );
};
