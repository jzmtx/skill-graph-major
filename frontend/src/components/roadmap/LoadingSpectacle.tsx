"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Compass, BookOpen, Layers, CheckCircle2, Loader2 } from "lucide-react";
import { roadmapsApi } from "@/lib/roadmapsApi";

interface LoadingSpectacleProps {
  role: string;
  requestId: string;
  onComplete: (data: any) => void;
  onError: (msg: string) => void;
}

const TRIVIA_FACTS = [
  "Curriculum sequencing utilizes verified dependency graphs so fundamental concepts precede specialized frameworks.",
  "Market benchmarks analyze live technical postings to identify current competency standards.",
  "Skills verification levels evaluate both conceptual mastery and verified production implementations.",
  "Top corporate hiring programs actively benchmark candidate competencies against real job descriptors."
];

export default function LoadingSpectacle({ role, requestId, onComplete, onError }: LoadingSpectacleProps) {
  const [progress, setProgress] = useState(15);
  const [message, setMessage] = useState("Analyzing industry skill taxonomy...");
  const [triviaIndex, setTriviaIndex] = useState(0);

  // Polling Loop
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const status = await roadmapsApi.getGenerateStatus(requestId);
        if (status) {
          setProgress(Math.max(status.progress || 15, 20));
          setMessage(status.message || "Synthesizing milestones...");
          
          if (status.status === "completed" && status.data) {
            clearInterval(timer);
            onComplete(status.data);
          } else if (status.status === "failed") {
            clearInterval(timer);
            onError(status.error || "Generation process was interrupted.");
          }
        }
      } catch (e: any) {
        console.error("Polling status error:", e);
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [requestId, onComplete, onError]);

  // Trivia Rotator
  useEffect(() => {
    const interval = setInterval(() => {
      setTriviaIndex(prev => (prev + 1) % TRIVIA_FACTS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-stone-50 min-h-[70vh] rounded-2xl flex flex-col items-center justify-center p-8 md:p-12 border border-stone-200 shadow-sm relative overflow-hidden">
      <div className="max-w-md w-full text-center space-y-6">
        
        {/* Academic Seal / Spinner */}
        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
          <div className="w-16 h-16 border-3 border-stone-200 border-t-emerald-800 rounded-full animate-spin" />
          <Compass className="w-7 h-7 text-emerald-800 absolute" />
        </div>

        {/* Title */}
        <div>
          <h2 className="text-2xl font-serif font-bold text-stone-900 mb-1 tracking-tight">
            Configuring {role}
          </h2>
          <p className="text-stone-500 text-xs font-medium">
            Aligning competency nodes with industry standards...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full space-y-2">
          <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
            <motion.div 
              className="bg-emerald-800 h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-stone-500 font-medium">
            <span>{message}</span>
            <span className="font-mono">{progress}%</span>
          </div>
        </div>

        {/* Institutional Fact Box */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 text-left shadow-2xs mt-4">
          <div className="flex items-center gap-2 text-stone-800 text-xs font-bold uppercase tracking-wider mb-1">
            <BookOpen className="w-3.5 h-3.5 text-emerald-800" /> Curriculum Standard
          </div>
          <p className="text-stone-600 text-xs leading-relaxed transition-opacity duration-300">
            {TRIVIA_FACTS[triviaIndex]}
          </p>
        </div>

      </div>
    </div>
  );
}
