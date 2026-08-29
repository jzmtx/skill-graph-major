"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Database, Server, Code2, Terminal, Cpu, Braces, Globe, Cloud, Layout, 
  Settings, Lock, Activity, Binary, Layers 
} from "lucide-react";

import { roadmapsApi } from "@/lib/roadmapsApi";

interface LoadingSpectacleProps {
  role: string;
  requestId: string;
  onComplete: (data: any) => void;
  onError: (msg: string) => void;
}

const ALL_ICONS = [
  Database, Server, Code2, Terminal, Cpu, Braces, Globe, Cloud, Layout, 
  Settings, Lock, Activity, Binary, Layers
];

const TRIVIA_FACTS = [
  "Did you know? The industry demand for this role has grown by 42% in the last two years.",
  "We are currently scraping hundreds of live job descriptions to find exactly what employers want.",
  "AI is analyzing skill dependencies so you don't learn advanced topics before the fundamentals.",
  "Top MNCs update their tech stacks frequently—we are fetching real-time data to keep you ahead.",
  "Over 1,000 resumes and job postings are being processed by the backend right now.",
  "The roadmap is being structured as a Directed Acyclic Graph (DAG) for optimal learning order."
];

const FAKE_LOGS = [
  "Extracting semantic tokens...",
  "Running NLP entity recognition...",
  "Fetching Adzuna market stats...",
  "Calculating O*NET demand coefficients...",
  "Resolving cyclic dependencies...",
  "Structuring conceptual nodes...",
  "Validating against ESCO taxonomy..."
];

export default function LoadingSpectacle({ role, requestId, onComplete, onError }: LoadingSpectacleProps) {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Initializing...");
  
  const [particles, setParticles] = useState<{ id: number, Icon: any, x: number, y: number, delay: number }[]>([]);
  const [triviaIndex, setTriviaIndex] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  // Polling Loop
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const status = await roadmapsApi.getGenerateStatus(requestId);
        if (status) {
          setProgress(status.progress || 0);
          setMessage(status.message || "Working...");
          
          if (status.status === "completed" && status.data) {
            clearInterval(timer);
            onComplete(status.data);
          } else if (status.status === "error") {
            clearInterval(timer);
            onError(status.message);
          }
        }
      } catch (err) {
        console.error("Failed to poll status", err);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [requestId, onComplete, onError]);

  // 1. Particle Spawner
  useEffect(() => {
    // Spawn a new particle every 400ms
    const interval = setInterval(() => {
      const id = Date.now();
      const Icon = ALL_ICONS[Math.floor(Math.random() * ALL_ICONS.length)];
      
      // Spawn on a circle outside the center
      const angle = Math.random() * Math.PI * 2;
      const radius = 250 + Math.random() * 100;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      setParticles(prev => [...prev, { id, Icon, x, y, delay: 0 }].slice(-15)); // Keep max 15 particles
    }, 400);
    
    return () => clearInterval(interval);
  }, []);

  // 2. Trivia Rotator
  useEffect(() => {
    const interval = setInterval(() => {
      setTriviaIndex(prev => (prev + 1) % TRIVIA_FACTS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // 3. Terminal Log Manager
  useEffect(() => {
    // Add real message
    setLogs(prev => [...prev, `[SYSTEM] ${message}`].slice(-8));
    
    // Periodically add fake rapid logs if progress < 100
    const fakeLogInterval = setInterval(() => {
      if (progress < 100 && Math.random() > 0.3) {
        const fakeLog = FAKE_LOGS[Math.floor(Math.random() * FAKE_LOGS.length)];
        setLogs(prev => [...prev, `> ${fakeLog}`].slice(-8));
      }
    }, 1200);

    return () => clearInterval(fakeLogInterval);
  }, [message, progress]);

  return (
    <div className="bg-slate-950 min-h-[85vh] rounded-3xl flex flex-col items-center justify-between p-8 overflow-hidden shadow-2xl relative">
      
      {/* Background Grid & Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950"></div>
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.1 }}></div>

      {/* Header */}
      <div className="z-10 text-center mt-4">
        <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200 mb-2 tracking-tight">
          Generating {role}
        </h2>
        <p className="text-indigo-300 text-sm font-medium">Building real-time industry intelligence graph...</p>
      </div>

      {/* Central Animation Area */}
      <div className="relative w-full flex-1 flex items-center justify-center min-h-[300px] z-10">
        
        {/* The Core Reactor */}
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 180, 270, 360] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="relative w-32 h-32 rounded-full border-4 border-indigo-500/30 flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.4)]"
        >
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-20 h-20 rounded-full bg-indigo-500 blur-md opacity-80"
          />
          <Cpu className="w-10 h-10 text-white absolute" />
        </motion.div>

        {/* Orbiting Rings */}
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute w-64 h-64 rounded-full border border-slate-700/50 border-dashed"
        />
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute w-96 h-96 rounded-full border border-slate-800/50"
        />

        {/* Absorbing Particles */}
        <AnimatePresence>
          {particles.map(p => (
            <motion.div
              key={p.id}
              initial={{ x: p.x, y: p.y, scale: 0, opacity: 0 }}
              animate={{ x: 0, y: 0, scale: 1.2, opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, ease: "easeIn" }}
              className="absolute text-indigo-400"
            >
              <p.Icon className="w-6 h-6" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Bottom Interface */}
      <div className="w-full max-w-3xl z-10 space-y-6 mb-4">
        
        {/* Trivia Carousel */}
        <div className="h-10 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={triviaIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-slate-400 text-sm italic text-center"
            >
              {TRIVIA_FACTS[triviaIndex]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex justify-between items-center mb-3">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">AI Synthesis Progress</span>
            <span className="text-indigo-400 text-sm font-bold bg-indigo-500/10 px-2 py-0.5 rounded">
              {progress}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden relative">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeInOut", duration: 0.5 }}
            />
          </div>
        </div>

        {/* Hacker Terminal Log */}
        <div className="w-full bg-black/60 border border-slate-800 rounded-xl p-4 h-40 overflow-hidden relative font-mono text-xs flex flex-col justify-end shadow-inner">
          <div className="absolute top-2 right-4 flex space-x-1">
            <div className="w-2 h-2 rounded-full bg-slate-600"></div>
            <div className="w-2 h-2 rounded-full bg-slate-600"></div>
            <div className="w-2 h-2 rounded-full bg-slate-600"></div>
          </div>
          
          <AnimatePresence>
            {logs.map((log, i) => (
              <motion.div
                key={`${i}-${log}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`truncate py-0.5 ${log.startsWith('[SYSTEM]') ? 'text-indigo-400 font-bold' : 'text-emerald-500/70'}`}
              >
                {log}
              </motion.div>
            ))}
          </AnimatePresence>
          {progress < 100 && (
            <motion.div 
              animate={{ opacity: [1, 0] }} 
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="text-emerald-500 mt-1"
            >
              _
            </motion.div>
          )}
        </div>

      </div>
    </div>
  );
}
