"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useMotionValue, useTransform, animate, useSpring } from "framer-motion";
import { getHireabilityScore } from "@/lib/api";
import { 
  ShieldCheck, 
  ShieldAlert,
  TrendingUp, 
  Layers, 
  Zap, 
  Award, 
  Clock, 
  ChevronDown, 
  GitBranch, 
  CheckCircle2,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Smartphone,
  Users,
  MicOff
} from "lucide-react";

import { getCachedData, setCachedData } from "@/lib/cache";
import GLIExplanationModal from "./GLIExplanationModal";

interface PointEvent {
  type: string;
  icon?: string;
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
    integrity_deduction?: number;
    raw_total: number;
  };
  points_history: PointEvent[];
}

export default function HireabilityScore({ studentIdProp }: { studentIdProp?: string }) {
  const [data, setData] = useState<HireabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'gained' | 'deductions'>('all');
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // Subtle interactive hover state
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springConfig = { damping: 30, stiffness: 140, mass: 0.6 };
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);
  
  const rotateX = useTransform(y, [-200, 200], [1.5, -1.5]);
  const rotateY = useTransform(x, [-200, 200], [-1.5, 1.5]);

  // Animated Counter
  const count = useMotionValue(300);
  const rounded = useTransform(count, Math.round);

  useEffect(() => {
    const cachedInitial = getCachedData<HireabilityData>('student_hireability');
    if (cachedInitial) {
      setData(cachedInitial);
      setLoading(false);
      count.set(cachedInitial.score || 300);
    }

    const fetchScore = async () => {
      try {
        const studentId = studentIdProp || (typeof window !== 'undefined' ? localStorage.getItem("student_id") : null);
        if (studentId) {
          const res = await getHireabilityScore(studentId);
          setData(res);
          setCachedData('student_hireability', res);
          animate(count, res.score || 300, { duration: 1.6, ease: "easeOut" });
        }
      } catch (e) {
        console.error("Failed to load hireability score", e);
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

  if (loading) {
    return (
      <div className="w-full h-80 bg-white rounded-2xl border border-stone-200 shadow-2xs animate-pulse p-8">
        <div className="h-6 w-48 bg-stone-200 rounded mb-4"></div>
        <div className="h-4 w-96 bg-stone-100 rounded mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-28 bg-stone-100 rounded-xl"></div>
          <div className="h-28 bg-stone-100 rounded-xl"></div>
          <div className="h-28 bg-stone-100 rounded-xl"></div>
          <div className="h-28 bg-stone-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const score = data.score || 300;
  const normalized = Math.max(0, Math.min(1, (score - 300) / 550));
  const circumference = 2 * Math.PI * 92;
  const strokeDashoffset = circumference - normalized * circumference;

  const getTierInfo = (s: number) => {
    if (s >= 750) return { label: "Top-Tier Candidate", color: "text-emerald-800 bg-emerald-50 border-emerald-300", stroke: "#166534" };
    if (s >= 650) return { label: "Industry Ready", color: "text-emerald-800 bg-stone-100 border-stone-300", stroke: "#15803D" };
    if (s >= 520) return { label: "Competitive", color: "text-stone-800 bg-amber-50 border-amber-300", stroke: "#B45309" };
    if (s >= 400) return { label: "Developing", color: "text-stone-700 bg-stone-100 border-stone-200", stroke: "#78716C" };
    return { label: "Foundational Baseline", color: "text-stone-600 bg-stone-100 border-stone-200", stroke: "#A8A29E" };
  };

  const tier = getTierInfo(score);
  const decayAmount = Math.max(0, Math.round(data.breakdown.base_depth - data.breakdown.decayed_depth));

  const renderEventIcon = (type: string, icon?: string) => {
    if (icon === "smartphone") return <Smartphone className="w-4 h-4 text-rose-600" />;
    if (icon === "users") return <Users className="w-4 h-4 text-rose-600" />;
    if (icon === "mic-off") return <MicOff className="w-4 h-4 text-rose-600" />;

    switch (type) {
      case "project_bonus":
        return <Award className="w-4 h-4 text-emerald-800" />;
      case "velocity_bonus":
        return <Zap className="w-4 h-4 text-amber-700" />;
      case "skill_assessed":
      case "base_skill":
        return <Target className="w-4 h-4 text-stone-700" />;
      case "integrity_penalty":
      case "proctoring_deduction":
        return <ShieldAlert className="w-4 h-4 text-rose-600" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-stone-600" />;
    }
  };

  return (
    <div className="w-full [perspective:1000px]">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY }}
        className="w-full rounded-2xl bg-white border border-stone-200 shadow-2xs hover:shadow-xs transition-shadow relative overflow-hidden"
      >
        {/* Classical Top Trim */}
        <div className="h-1.5 w-full bg-stone-200" />

        <div className="p-6 md:p-8">
          
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-stone-200 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Global Learner Index</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tier.color}`}>
                  {tier.label}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-stone-900 mt-1 font-serif">
                Hireability Index Rating
              </h2>
              <p className="text-sm text-stone-600 mt-0.5">
                Standardized employability rating computed from verified code depth, cross-stack synergy, and consistency.
              </p>
            </div>
            
            <button
              onClick={() => setIsInfoModalOpen(true)}
              className="flex items-center gap-2 self-start sm:self-auto text-xs font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 hover:border-emerald-700/50 px-3 py-1.5 rounded-lg transition-all shadow-2xs group cursor-pointer"
              title="Click to view mathematical breakdown and ATS ranking model"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-800" />
              <span>Model: 300 to 850</span>
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-900 flex items-center justify-center text-[10px] font-bold group-hover:bg-emerald-800 group-hover:text-white transition-colors">
                i
              </span>
            </button>
          </div>

          {/* Main Visual & Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-6 items-center">
            
            {/* Left Gauge */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center p-4">
              <div className="relative w-56 h-56 flex items-center justify-center">
                <svg width="220" height="220" viewBox="0 0 220 220" className="transform -rotate-90">
                  {/* Track */}
                  <circle
                    cx="110"
                    cy="110"
                    r="92"
                    fill="none"
                    stroke="#F5F5F4"
                    strokeWidth="16"
                    strokeLinecap="round"
                  />
                  {/* Progress Indicator */}
                  <motion.circle
                    cx="110"
                    cy="110"
                    r="92"
                    fill="none"
                    stroke={tier.stroke}
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
                  <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-widest">Index Score</span>
                  <motion.span className="text-5xl font-black text-stone-900 tracking-tight my-0.5 font-serif">
                    {rounded}
                  </motion.span>
                  <span className="text-xs font-semibold text-stone-500">Scale 300 – 850</span>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-2 text-xs text-stone-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-stone-300"></span> 300 Base
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-800"></span> 850 Benchmark
                </span>
              </div>
            </div>

            {/* Right Side: Key Factor Cards */}
            <div className="lg:col-span-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* Metric 1: Base Depth */}
                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 flex items-start gap-3.5">
                  <div className="p-2.5 rounded-lg bg-white border border-stone-200 text-stone-800 shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Skill Base Depth</div>
                    <div className="text-xl font-bold text-stone-900 mt-0.5">
                      {Math.round(data.breakdown.base_depth)} <span className="text-xs font-normal text-stone-500">pts</span>
                    </div>
                    <p className="text-xs text-stone-600 mt-0.5">Level 2 projects count 3× more than L1 assessments.</p>
                  </div>
                </div>

                {/* Metric 2: Stack Synergy */}
                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 flex items-start gap-3.5">
                  <div className="p-2.5 rounded-lg bg-white border border-stone-200 text-stone-800 shrink-0">
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Stack Synergy</div>
                    <div className="text-xl font-bold text-stone-900 mt-0.5">
                      {data.breakdown.synergy_multiplier.toFixed(2)}×
                    </div>
                    <p className="text-xs text-stone-600 mt-0.5">Reward multiplier for connecting complementary domains.</p>
                  </div>
                </div>

                {/* Metric 3: Consistency Factor */}
                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 flex items-start gap-3.5">
                  <div className="p-2.5 rounded-lg bg-white border border-stone-200 text-stone-800 shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Consistency Factor</div>
                    <div className="text-xl font-bold text-stone-900 mt-0.5">
                      {data.breakdown.consistency_multiplier.toFixed(2)}×
                    </div>
                    <p className="text-xs text-stone-600 mt-0.5">Stability multiplier for continuous learning and tests.</p>
                  </div>
                </div>

                {/* Metric 4: Recency Decay */}
                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 flex items-start gap-3.5">
                  <div className="p-2.5 rounded-lg bg-white border border-stone-200 text-stone-800 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Recency Decay</div>
                    <div className="text-xl font-bold text-stone-900 mt-0.5">
                      {decayAmount > 0 ? `-${decayAmount} pts` : `0 pts`}
                    </div>
                    <p className="text-xs text-stone-600 mt-0.5">Simulates tech stack half-life for unmaintained skills.</p>
                  </div>
                </div>

              </div>

              {/* Verified Modifiers Bar */}
              {(data.breakdown.project_bonus > 0 || data.breakdown.velocity_bonus > 0 || Boolean(data.breakdown.integrity_deduction && data.breakdown.integrity_deduction > 0)) && (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-xs font-semibold text-stone-600 mr-1">Earned Modifiers:</span>
                  {data.breakdown.project_bonus > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                      <Award className="w-3.5 h-3.5" /> +{data.breakdown.project_bonus} Project Milestone
                    </span>
                  )}
                  {data.breakdown.velocity_bonus > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
                      <Zap className="w-3.5 h-3.5" /> +{data.breakdown.velocity_bonus} 30-Day Activity Velocity
                    </span>
                  )}
                  {Boolean(data.breakdown.integrity_deduction && data.breakdown.integrity_deduction > 0) && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
                      <ShieldAlert className="w-3.5 h-3.5" /> -{data.breakdown.integrity_deduction} Integrity Deduction
                    </span>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Points Audit Trail (Collapsible) */}
          {data.points_history && data.points_history.length > 0 && (() => {
            const historyEvents = data.points_history || [];
            const totalPositivePts = historyEvents.reduce((acc, ev) => {
              if (typeof ev.pts === "number" && ev.pts > 0) return acc + ev.pts;
              return acc;
            }, 0);
            const totalNegativePts = historyEvents.reduce((acc, ev) => {
              if (typeof ev.pts === "number" && ev.pts < 0) return acc + Math.abs(ev.pts);
              return acc;
            }, 0);
            const positiveEventsCount = historyEvents.filter(ev => typeof ev.pts === "number" ? ev.pts > 0 : !String(ev.pts).startsWith("-")).length;
            const negativeEventsCount = historyEvents.filter(ev => typeof ev.pts === "number" ? ev.pts < 0 : String(ev.pts).startsWith("-")).length;

            const filteredHistory = historyEvents.filter(ev => {
              const isNeg = typeof ev.pts === "number" ? ev.pts < 0 : String(ev.pts).startsWith("-");
              if (historyFilter === 'gained') return !isNeg;
              if (historyFilter === 'deductions') return isNeg;
              return true;
            });

            return (
              <div className="mt-4 pt-4 border-t border-stone-200">
                <button
                  onClick={() => setShowHistory(v => !v)}
                  className="w-full flex items-center justify-between text-xs font-bold text-stone-600 hover:text-stone-900 transition-colors py-1 group cursor-pointer"
                >
                  <span className="flex items-center gap-2 uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-stone-500" />
                    Points Ledger & Audit History (+ve &amp; -ve)
                    <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-semibold text-[10px]">
                      {historyEvents.length} logged events
                    </span>
                  </span>
                  <span className={`p-1 rounded transition-transform duration-200 ${showHistory ? 'rotate-180' : 'rotate-0'}`}>
                    <ChevronDown className="w-4 h-4 text-stone-400 group-hover:text-stone-600" />
                  </span>
                </button>

                <motion.div
                  initial={false}
                  animate={{ height: showHistory ? 'auto' : 0, opacity: showHistory ? 1 : 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 space-y-3">
                    
                    {/* History Summary Bar & Filter Tabs */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-mono">
                          <ArrowUpRight className="w-3 h-3 text-emerald-600" /> +{totalPositivePts} pts Gained
                        </span>
                        {totalNegativePts > 0 ? (
                          <span className="flex items-center gap-1 font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px] font-mono">
                            <ArrowDownRight className="w-3 h-3 text-rose-600" /> -{totalNegativePts} pts Deducted
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[11px] font-medium px-2 py-0.5">
                            0 Deductions
                          </span>
                        )}
                      </div>

                      {/* Filter Switcher */}
                      <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-stone-200">
                        <button
                          onClick={() => setHistoryFilter('all')}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                            historyFilter === 'all' 
                              ? 'bg-stone-900 text-white shadow-2xs' 
                              : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          All ({historyEvents.length})
                        </button>
                        <button
                          onClick={() => setHistoryFilter('gained')}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                            historyFilter === 'gained' 
                              ? 'bg-emerald-800 text-white shadow-2xs' 
                              : 'text-stone-600 hover:text-emerald-800'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Gained ({positiveEventsCount})
                        </button>
                        <button
                          onClick={() => setHistoryFilter('deductions')}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                            historyFilter === 'deductions' 
                              ? 'bg-rose-700 text-white shadow-2xs' 
                              : 'text-stone-600 hover:text-rose-700'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Deductions ({negativeEventsCount})
                        </button>
                      </div>
                    </div>

                    {/* Filtered Events List */}
                    <div className="space-y-2">
                      {filteredHistory.map((event, idx) => {
                        const dateFormatted = event.date 
                          ? new Date(event.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                          : "Applied to baseline";
                        
                        const isNegative = typeof event.pts === "number" ? event.pts < 0 : String(event.pts).startsWith("-");

                        return (
                          <div 
                            key={idx}
                            className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-4 ${
                              isNegative 
                                ? 'border-rose-200 bg-rose-50/70 hover:bg-rose-100/70 shadow-2xs' 
                                : 'border-stone-200 bg-stone-50 hover:bg-stone-100/80'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 shadow-2xs ${
                                isNegative ? 'bg-rose-100 border-rose-300' : 'bg-white border-stone-200'
                              }`}>
                                {renderEventIcon(event.type, event.icon)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                                    isNegative 
                                      ? 'bg-rose-100 text-rose-800 border-rose-300' 
                                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  }`}>
                                    {isNegative ? 'PENALTY / CHEATING' : 'SCORE GAINED'}
                                  </span>
                                  <p className="text-xs sm:text-sm font-semibold text-stone-800 truncate">{event.label}</p>
                                </div>
                                <p className="text-xs text-stone-500 truncate mt-0.5">
                                  {event.detail} · <span className="text-stone-400 font-mono text-[11px]">{dateFormatted}</span>
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              {isNegative ? (
                                <span className="text-sm font-bold text-rose-700 bg-rose-50 border border-rose-300 px-2.5 py-1 rounded-md font-mono shadow-2xs">
                                  {typeof event.pts === "number" ? `${event.pts} pts` : event.pts}
                                </span>
                              ) : (
                                <span className="text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md font-mono shadow-2xs">
                                  {typeof event.pts === "number" ? `+${event.pts} pts` : event.pts}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                </motion.div>
              </div>
            );
          })()}

        </div>
      </motion.div>

      <GLIExplanationModal 
        isOpen={isInfoModalOpen} 
        onClose={() => setIsInfoModalOpen(false)} 
        currentScore={score} 
      />
    </div>
  );
}
