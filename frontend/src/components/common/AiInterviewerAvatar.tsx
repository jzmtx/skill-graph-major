"use client";

import React from 'react';
import { Volume2, VolumeX, Mic, RotateCcw, Radio } from 'lucide-react';

interface AiInterviewerAvatarProps {
  isAiSpeaking: boolean;
  isListening: boolean;
  currentQuestionText: string;
  onReplayAudio: () => void;
  voiceMode: boolean;
  onToggleVoiceMode: () => void;
}

export const AiInterviewerAvatar: React.FC<AiInterviewerAvatarProps> = ({
  isAiSpeaking,
  isListening,
  currentQuestionText,
  onReplayAudio,
  voiceMode,
  onToggleVoiceMode
}) => {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-radial from-stone-900 via-neutral-950 to-black border border-stone-800 shadow-xl mb-6">
      {/* Studio Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 py-3 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-900/80 border border-stone-700/60 backdrop-blur-md">
            <span className={`w-2 h-2 rounded-full ${isAiSpeaking ? 'bg-emerald-400 animate-ping' : isListening ? 'bg-rose-500 animate-pulse' : 'bg-stone-500'}`} />
            <span className="text-[11px] font-mono tracking-wider font-semibold uppercase text-stone-300">
              {isAiSpeaking ? 'ASSESSOR SPEAKING' : isListening ? 'CANDIDATE SPEAKING' : 'STUDIO READY'}
            </span>
          </div>
          <span className="text-[11px] font-mono text-stone-500 hidden sm:inline">1080P 60FPS</span>
        </div>

        {/* Studio Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onReplayAudio}
            title="Replay Assessor Audio"
            className="p-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white transition-all border border-stone-700/50 backdrop-blur-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleVoiceMode}
            title={voiceMode ? "Mute Voice Assessor" : "Unmute Voice Assessor"}
            className={`p-1.5 rounded-lg transition-all border backdrop-blur-xs cursor-pointer ${
              voiceMode 
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900' 
                : 'bg-stone-800/80 text-stone-400 border-stone-700/50 hover:bg-stone-700'
            }`}
          >
            {voiceMode ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Avatar Stage */}
      <div className="relative h-64 sm:h-72 flex items-center justify-center pt-4 overflow-hidden">
        {/* Subtle Ambient Backlight Glow */}
        <div 
          className={`absolute w-72 h-72 rounded-full blur-3xl transition-all duration-700 pointer-events-none opacity-40 ${
            isAiSpeaking 
              ? 'bg-emerald-500 scale-110' 
              : isListening 
              ? 'bg-rose-600 scale-105' 
              : 'bg-indigo-600/40 scale-95'
          }`}
        />

        {/* Audio Wave Ring (expands when speaking or listening) */}
        {(isAiSpeaking || isListening) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-60 h-60 rounded-full border border-dashed transition-all animate-spin [animation-duration:12s] ${
              isAiSpeaking ? 'border-emerald-500/30' : 'border-rose-500/30'
            }`} />
            <div className={`w-72 h-72 rounded-full border transition-all animate-ping opacity-20 [animation-duration:3s] ${
              isAiSpeaking ? 'border-emerald-400' : 'border-rose-400'
            }`} />
          </div>
        )}

        {/* Animated Avatar Character (SVG) */}
        <div className={`relative z-10 transition-transform duration-500 ${
          isListening 
            ? 'animate-avatar-head-listen' 
            : 'animate-avatar-head-idle'
        }`}>
          <svg
            viewBox="0 0 200 220"
            className="w-48 h-56 sm:w-52 sm:h-60 drop-shadow-2xl"
          >
            <defs>
              {/* Shading Gradients */}
              <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f8d5b8" />
                <stop offset="100%" stopColor="#e5b28d" />
              </linearGradient>
              <linearGradient id="suitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#292524" />
                <stop offset="100%" stopColor="#1c1917" />
              </linearGradient>
              <linearGradient id="glowGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#065f46" />
              </linearGradient>
            </defs>

            {/* Torso & Professional Blazer */}
            <path
              d="M30 220 C35 170, 70 160, 100 160 C130 160, 165 170, 170 220 Z"
              fill="url(#suitGrad)"
            />
            {/* White Collar / Shirt */}
            <polygon points="90,160 100,185 110,160 105,152 95,152" fill="#f8fafc" />
            <polygon points="100,168 96,200 104,200" fill="#0284c7" />

            {/* Neck */}
            <rect x="88" y="132" width="24" height="26" rx="4" fill="url(#skinGrad)" />
            <path d="M88 136 Q100 144 112 136" stroke="#d49b77" strokeWidth="1.5" fill="none" opacity="0.6" />

            {/* Head Contour */}
            <path
              d="M60 85 C60 42, 140 42, 140 85 C140 125, 122 145, 100 145 C78 145, 60 125, 60 85 Z"
              fill="url(#skinGrad)"
            />

            {/* Hair Style */}
            <path
              d="M56 75 C56 34, 85 24, 100 24 C125 24, 144 38, 144 75 C144 65, 138 48, 128 42 C115 36, 85 36, 72 44 C62 52, 56 65, 56 75 Z"
              fill="url(#hairGrad)"
            />
            {/* Hair sideburns */}
            <path d="M58 72 L61 95 L65 85 Z" fill="url(#hairGrad)" />
            <path d="M142 72 L139 95 L135 85 Z" fill="url(#hairGrad)" />

            {/* Eyebrows (reactive expression) */}
            <path 
              d={isAiSpeaking ? "M72 71 Q82 66 92 70" : isListening ? "M72 69 Q82 65 92 68" : "M72 72 Q82 69 92 71"} 
              stroke="#292524" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              fill="none" 
            />
            <path 
              d={isAiSpeaking ? "M108 70 Q118 66 128 71" : isListening ? "M108 68 Q118 65 128 69" : "M108 71 Q118 69 128 72"} 
              stroke="#292524" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              fill="none" 
            />

            {/* Left Eye with Blinking Animation & Gaze */}
            <g className="animate-avatar-blink">
              <ellipse cx="82" cy="84" rx="7" ry="5.5" fill="#ffffff" />
              <g className="animate-avatar-gaze">
                <circle cx="82" cy="84" r="3.6" fill="#1e293b" />
                <circle cx="83.2" cy="82.8" r="1.2" fill="#ffffff" />
              </g>
              {/* Eyelid shadow */}
              <path d="M75 81 Q82 78 89 81" stroke="#334155" strokeWidth="1" fill="none" opacity="0.6" />
            </g>

            {/* Right Eye with Blinking Animation & Gaze */}
            <g className="animate-avatar-blink">
              <ellipse cx="118" cy="84" rx="7" ry="5.5" fill="#ffffff" />
              <g className="animate-avatar-gaze">
                <circle cx="118" cy="84" r="3.6" fill="#1e293b" />
                <circle cx="119.2" cy="82.8" r="1.2" fill="#ffffff" />
              </g>
              <path d="M111 81 Q118 78 125 81" stroke="#334155" strokeWidth="1" fill="none" opacity="0.6" />
            </g>

            {/* Nose */}
            <path d="M98 86 Q100 98 103 100 Q98 102 96 101" stroke="#d49b77" strokeWidth="1.8" fill="none" strokeLinecap="round" />

            {/* Animated Mouth (Lip-Sync when AI is speaking) */}
            {isAiSpeaking ? (
              <g className="animate-avatar-speak">
                {/* Speaking mouth with inner shadow & teeth */}
                <ellipse cx="100" cy="118" rx="8" ry="5" fill="#450a0a" />
                {/* Upper teeth */}
                <path d="M94 116 Q100 118 106 116" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                {/* Lip outline */}
                <ellipse cx="100" cy="118" rx="9" ry="6" stroke="#b91c1c" strokeWidth="1.5" fill="none" opacity="0.8" />
              </g>
            ) : isListening ? (
              /* Attentive gentle listening smile */
              <path d="M92 116 Q100 122 108 116" stroke="#b91c1c" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            ) : (
              /* Idle neutral mouth */
              <path d="M93 117 Q100 119 107 117" stroke="#991b1b" strokeWidth="2" strokeLinecap="round" fill="none" />
            )}

            {/* Assessor Audio Headset with Microphone */}
            <path d="M57 85 C52 50, 148 50, 143 85" stroke="#475569" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            {/* Ear Cushions */}
            <rect x="54" y="80" width="7" height="18" rx="3.5" fill="#0f172a" />
            <rect x="139" y="80" width="7" height="18" rx="3.5" fill="#0f172a" />
            {/* Mic boom */}
            <path d="M141 93 Q132 118 112 120" stroke="#334155" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            {/* Mic tip indicator light */}
            <circle cx="111" cy="120" r="3" fill={isAiSpeaking ? "#10b981" : isListening ? "#ef4444" : "#64748b"} />
          </svg>
        </div>

        {/* Lower Soundwave Audio Equalizer Bar */}
        <div className="absolute bottom-2 left-6 right-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold tracking-wider text-stone-400">
              AI ASSESSOR: SENIOR ARCHITECT
            </span>
          </div>

          <div className="flex items-center gap-1 h-5">
            {isAiSpeaking ? (
              <>
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-2"></span>
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-5 [animation-delay:0.1s]"></span>
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-3 [animation-delay:0.2s]"></span>
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-6 [animation-delay:0.15s]"></span>
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-4 [animation-delay:0.25s]"></span>
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-5 [animation-delay:0.05s]"></span>
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-2 [animation-delay:0.3s]"></span>
              </>
            ) : isListening ? (
              <>
                <span className="w-1 bg-rose-500 rounded-full animate-bounce h-3"></span>
                <span className="w-1 bg-rose-500 rounded-full animate-bounce h-5 [animation-delay:0.12s]"></span>
                <span className="w-1 bg-rose-500 rounded-full animate-bounce h-4 [animation-delay:0.2s]"></span>
                <span className="w-1 bg-rose-500 rounded-full animate-bounce h-2 [animation-delay:0.08s]"></span>
                <span className="w-1 bg-rose-500 rounded-full animate-bounce h-5 [animation-delay:0.24s]"></span>
              </>
            ) : (
              <span className="text-[10px] font-mono text-stone-600">IDLE • AWAITING INPUT</span>
            )}
          </div>
        </div>
      </div>

      {/* Real-Time Assessor Closed-Caption Teleprompter Banner */}
      <div className="bg-stone-950/90 border-t border-stone-800/80 px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-emerald-500 flex items-center gap-1 text-[11px] font-bold shrink-0">
            <Radio className={`w-3.5 h-3.5 ${isAiSpeaking ? 'animate-pulse text-emerald-400' : 'text-stone-600'}`} />
            PROMPT:
          </span>
          <p className="text-xs text-stone-300 truncate font-sans">
            {currentQuestionText || "Preparing next technical defense question..."}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            isAiSpeaking 
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
              : isListening 
              ? 'bg-rose-950 text-rose-400 border border-rose-800' 
              : 'bg-stone-900 text-stone-400 border border-stone-800'
          }`}>
            {isAiSpeaking ? 'Speaking' : isListening ? 'Listening' : 'Standby'}
          </span>
        </div>
      </div>
    </div>
  );
};
