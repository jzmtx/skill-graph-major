"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useMotionValue, useTransform, animate, useSpring } from "framer-motion";
import { getHireabilityScore } from "@/lib/api";
import { ShieldCheck, TrendingUp, Layers, Code, Zap, Flame, CalendarClock } from "lucide-react";

interface PointEvent {
  type: string;
  icon: string;
  label: string;
  detail: string;
  pts: number | string;
  color: string;
  date?: string | null;
}

interface HireabilityData {
  score: number;
  breakdown: {
    base_depth: number;
    decayed_depth: number;
    synergy_multiplier: number;
    consistency_multiplier: number;
    project_bonus: number;
    velocity_bonus: number;
    raw_total: number;
  };
  points_history: PointEvent[];
}

export default function HireabilityScore({ studentIdProp }: { studentIdProp?: string }) {
  const [data, setData] = useState<HireabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  // 3D Tilt Effect State (Fluid Springs)
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Spring configuration for buttery smooth movement
  const springConfig = { damping: 25, stiffness: 120, mass: 0.5 };
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);
  
  // Magic numbers for rotation intensity (reduced for subtlety)
  const rotateX = useTransform(y, [-300, 300], [4, -4]);
  const rotateY = useTransform(x, [-300, 300], [-4, 4]);

  // Animated Counter State
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);

  useEffect(() => {
    const fetchScore = async () => {
      try {
        const studentId = studentIdProp || localStorage.getItem("student_id");
        if (studentId) {
          const res = await getHireabilityScore(studentId);
          setData(res);
          // Animate the counter on load
          animate(count, res.score, { duration: 2, ease: "easeOut" });
        }
      } catch (e) {
        console.error("Failed to load score", e);
      } finally {
        setLoading(false);
      }
    };
    fetchScore();
  }, [studentIdProp, count]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      mouseX.set(event.clientX - centerX);
      mouseY.set(event.clientY - centerY);
    }
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  if (loading) return (
    <div className="w-full h-64 bg-slate-900 animate-pulse rounded-3xl border border-slate-800"></div>
  );

  if (!data) return null;

  // Calculate SVG Circle Dasharray for the gauge (Circumference = 2 * PI * r)
  // R = 120 -> Circ = 753.98
  const circumference = 2 * Math.PI * 120;
  // Normalize score (300 to 850) -> 0 to 1
  const normalizedScore = Math.max(0, Math.min(1, (data.score - 300) / 550));
  const strokeDashoffset = circumference - normalizedScore * circumference;

  return (
    <div 
      className="relative w-full max-w-5xl mx-auto my-8 [perspective:1000px]"
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY }}
        className="w-full rounded-3xl bg-slate-950 border border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative"
      >
        {/* Deep Glow Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-center justify-between p-8 md:p-12 gap-12 relative z-10">
          
          {/* Left Side: The 3D Gauge */}
          <div className="relative flex items-center justify-center">
            {/* Outer SVG Gauge with continuous floating animation */}
            <motion.svg 
              width="300" 
              height="300" 
              viewBox="0 0 300 300" 
              className="transform -rotate-90 drop-shadow-2xl"
              animate={{
                y: [0, -8, 0],
              }}
              transition={{
                duration: 4,
                ease: "easeInOut",
                repeat: Infinity,
              }}
            >
              {/* Background Track */}
              <circle
                cx="150"
                cy="150"
                r="120"
                fill="none"
                stroke="#1e293b"
                strokeWidth="20"
                strokeLinecap="round"
              />
              {/* Animated Progress Ring */}
              <motion.circle
                cx="150"
                cy="150"
                r="120"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="20"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }} // custom bouncy ease
                style={{ filter: "drop-shadow(0 0 10px rgba(56,189,248,0.5))" }}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" /> {/* Tailwind sky-400 */}
                  <stop offset="100%" stopColor="#34d399" /> {/* Tailwind emerald-400 */}
                </linearGradient>
              </defs>
            </motion.svg>

            {/* Inner Content (The Score) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-slate-400 text-sm font-semibold tracking-widest uppercase mb-1">Index Score</span>
              <motion.span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-sky-300 to-emerald-300 tracking-tighter">
                {rounded}
              </motion.span>
              <span className="text-slate-500 text-xs mt-2 font-medium">Range: 300 - 850</span>
            </div>
          </div>

          {/* Right Side: The Breakdown */}
          <div className="flex-1 w-full space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="text-emerald-400" />
                Employability Metrics
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Your Hireability Index is dynamically calculated based on depth, synergy, and activity.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Metric Card 1 */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-start gap-3 backdrop-blur-sm">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Code className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Base Depth</p>
                  <p className="text-xl font-bold text-white mt-0.5">{data.breakdown.base_depth}</p>
                  <p className="text-xs text-slate-500 mt-1">Level 2 projects count 3x more.</p>
                </div>
              </div>

              {/* Metric Card 2 */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-start gap-3 backdrop-blur-sm">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <Layers className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Stack Synergy</p>
                  <p className="text-xl font-bold text-white mt-0.5">{data.breakdown.synergy_multiplier.toFixed(2)}x</p>
                  <p className="text-xs text-slate-500 mt-1">Multiplier for connecting tech stacks.</p>
                </div>
              </div>

              {/* Metric Card 3 */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-start gap-3 backdrop-blur-sm">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Consistency</p>
                  <p className="text-xl font-bold text-white mt-0.5">{data.breakdown.consistency_multiplier.toFixed(2)}x</p>
                  <p className="text-xs text-slate-500 mt-1">Bonus for learning consistently over time.</p>
                </div>
              </div>

              {/* Metric Card 4 */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-start gap-3 backdrop-blur-sm">
                <div className="p-2 bg-rose-500/10 rounded-lg">
                  <CalendarClock className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Skill Decay</p>
                  <p className="text-xl font-bold text-white mt-0.5">
                    -{Math.round(data.breakdown.base_depth - data.breakdown.decayed_depth)} pts
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Lost points due to inactive skills.</p>
                </div>
              </div>

            </div>

            {/* Bonuses */}
            {(data.breakdown.project_bonus > 0 || data.breakdown.velocity_bonus > 0) && (
              <div className="mt-4 pt-4 border-t border-slate-800 flex gap-4">
                {data.breakdown.project_bonus > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                    <Zap className="w-3.5 h-3.5" /> +{data.breakdown.project_bonus} Project Bonus
                  </span>
                )}
                {data.breakdown.velocity_bonus > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 text-xs font-semibold border border-orange-500/20">
                    <Flame className="w-3.5 h-3.5" /> +{data.breakdown.velocity_bonus} 30-Day Velocity
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Points History — Collapsible */}
        {data.points_history && data.points_history.length > 0 && (
          <div className="px-8 md:px-12 pb-8 relative z-10">
            <div className="border-t border-slate-800 pt-5">
              {/* Toggle Button */}
              <button
                onClick={() => setShowHistory(v => !v)}
                className="w-full flex items-center justify-between text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors group"
              >
                <span className="flex items-center gap-2 uppercase tracking-widest text-xs">
                  <CalendarClock className="w-4 h-4" />
                  Points History — How this score was earned
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 text-[10px] font-bold">
                    {data.points_history.length} events
                  </span>
                </span>
                <span className={`transition-transform duration-300 ${showHistory ? 'rotate-180' : 'rotate-0'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>

              {/* Collapsible Content */}
              <motion.div
                initial={false}
                animate={{ height: showHistory ? 'auto' : 0, opacity: showHistory ? 1 : 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="relative pt-5">
                  <div className="absolute left-5 top-5 bottom-0 w-px bg-slate-800" />
                  <div className="space-y-4">
                    {data.points_history.map((event, i) => {
                      const colorMap: Record<string, { bg: string; ring: string; text: string }> = {
                        indigo: { bg: 'bg-indigo-500/10', ring: 'ring-indigo-500/30', text: 'text-indigo-400' },
                        orange: { bg: 'bg-orange-500/10', ring: 'ring-orange-500/30', text: 'text-orange-400' },
                        emerald: { bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/30', text: 'text-emerald-400' },
                        blue: { bg: 'bg-blue-500/10', ring: 'ring-blue-500/30', text: 'text-blue-400' },
                        purple: { bg: 'bg-purple-500/10', ring: 'ring-purple-500/30', text: 'text-purple-400' },
                      };
                      const colors = colorMap[event.color] || colorMap.indigo;
                      const dateStr = event.date
                        ? new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Applied to total';

                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: showHistory ? 1 : 0, x: showHistory ? 0 : -10 }}
                          transition={{ delay: showHistory ? i * 0.04 : 0, duration: 0.25 }}
                          className="relative pl-14 flex items-start gap-4"
                        >
                          <div className={`absolute left-0 w-10 h-10 rounded-full ${colors.bg} ring-1 ${colors.ring} flex items-center justify-center text-lg`}>
                            {event.icon}
                          </div>
                          <div className="flex-1 bg-slate-900/40 rounded-xl border border-slate-800 p-3 flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-200">{event.label}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{event.detail}</p>
                              <p className="text-[11px] text-slate-600 mt-1">{dateStr}</p>
                            </div>
                            <div className={`text-right shrink-0 font-black text-lg ${colors.text}`}>
                              {typeof event.pts === 'number' ? `+${event.pts}` : event.pts}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
