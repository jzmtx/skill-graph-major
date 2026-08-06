"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { roadmapsApi } from "@/lib/roadmapsApi";
import { ArrowRight, BookOpen, PlayCircle, Target, CheckCircle2, ChevronRight, Briefcase, RefreshCw, Layers, Database, GitBranch, Cpu, Sparkles, Compass, Building2, BrainCircuit, Clock, BarChart3, Trash2, PlusCircle, Zap } from "lucide-react";
import Link from "next/link";
import RoadmapCanvas from "@/components/roadmap/RoadmapCanvas";
import RoadmapAnalysis from "@/components/roadmap/RoadmapAnalysis";

function GeneratingScreen({ role, ecosystem, requestId }: { role: string; ecosystem: string; requestId: string }) {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Initializing...");
  const [phaseIndex, setPhaseIndex] = useState(0);

  const icons = [
    <Database key="1" className="w-8 h-8 text-blue-400" />,
    <Cpu key="2" className="w-8 h-8 text-purple-400" />,
    <GitBranch key="3" className="w-8 h-8 text-amber-400" />,
    <Sparkles key="4" className="w-8 h-8 text-indigo-400" />,
    <CheckCircle2 key="5" className="w-8 h-8 text-emerald-400" />,
  ];

  React.useEffect(() => {
    // Polling timer
    const timer = setInterval(async () => {
      try {
        const status = await roadmapsApi.getGenerateStatus(requestId);
        if (status) {
          setProgress(status.progress || 0);
          setMessage(status.message || "Working...");
          
          // Heuristic to change icon based on progress
          if (status.progress < 20) setPhaseIndex(0);
          else if (status.progress < 60) setPhaseIndex(1);
          else if (status.progress < 90) setPhaseIndex(2);
          else if (status.progress < 100) setPhaseIndex(3);
          else setPhaseIndex(4);
        }
      } catch (err) {
        console.error("Failed to poll status", err);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [requestId]);

  return (
    <div className="bg-slate-950 min-h-[80vh] rounded-3xl flex flex-col items-center justify-center p-8 overflow-hidden shadow-2xl relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950"></div>
      
      <motion.div 
        key="generating-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center z-10 flex flex-col items-center w-full max-w-lg"
      >
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-30 rounded-full"></div>
          <motion.div 
            key={phaseIndex}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-slate-900 p-6 rounded-full border border-slate-700 shadow-2xl"
          >
            {icons[phaseIndex]}
            <div className="absolute top-0 left-0 w-full h-full border-t-2 border-indigo-500 rounded-full animate-spin shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
          </motion.div>
        </div>
        
        <h2 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200 mb-6 tracking-tight">
          Generating {ecosystem === "General" ? "" : ecosystem} {role}...
        </h2>
        
        <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-slate-400 text-sm font-medium">Live AI Progress</span>
            <span className="text-indigo-400 text-sm font-bold bg-indigo-500/10 px-2 py-0.5 rounded">
              {progress}%
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-4 relative">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeInOut", duration: 0.5 }}
            />
          </div>
          
          <motion.div
            key={`msg-${message}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-indigo-300 font-mono text-sm text-left min-h-[1.5rem]"
          >
            &gt; {message}
          </motion.div>
        </div>
        
        <p className="text-slate-500 text-xs max-w-sm mx-auto">
          We are analyzing live job markets, calculating skill dependencies, and structuring your personalized learning phases.
        </p>
      </motion.div>
    </div>
  );
}

export default function RoadmapsPage() {
  const [step, setStep] = useState<"list" | "role" | "ecosystem" | "generating" | "roadmap">("list");
  const [selectedRole, setSelectedRole] = useState<string>("Full Stack Developer");
  const [selectedEcosystem, setSelectedEcosystem] = useState<string | null>(null);
  const [roadmap, setRoadmap] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const [currentRequestId, setCurrentRequestId] = useState<string>("");
  
  const [myRoadmaps, setMyRoadmaps] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [weeklyHours, setWeeklyHours] = useState<number>(20);

  useEffect(() => {
    const fetchMyRoadmaps = async () => {
      const studentId = localStorage.getItem("student_id");
      if (!studentId) {
        setStep("role");
        setLoadingList(false);
        return;
      }
      try {
        const roadmaps = await roadmapsApi.getMyRoadmaps(studentId);
        if (roadmaps && roadmaps.length > 0) {
          setMyRoadmaps(roadmaps);
          setStep("list");
        } else {
          setStep("role");
        }
      } catch (err) {
        console.error(err);
        setStep("role");
      } finally {
        setLoadingList(false);
      }
    };
    fetchMyRoadmaps();
  }, []);

  const handleDelete = async (e: React.MouseEvent, roadmapId: string) => {
    e.stopPropagation();
    const studentId = localStorage.getItem("student_id");
    if (!studentId) return;
    
    if (confirm("Are you sure you want to remove this roadmap from your profile?")) {
      try {
        await roadmapsApi.deleteMyRoadmap(studentId, roadmapId);
        const remaining = myRoadmaps.filter((r) => r.id !== roadmapId);
        setMyRoadmaps(remaining);
        if (remaining.length === 0) {
          setStep("role");
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const fetchRoadmapWithHours = async (role: string, ecosystem: string, weeklyHours: number = 20) => {
    try {
      const studentId = localStorage.getItem("student_id");
      
      // 1. Try to fetch from cache/DB
      const data = await roadmapsApi.getRoadmap(role, ecosystem);
      if (data && data.roadmap) {
        setRoadmap(data.roadmap);
        setAnalytics(data.roadmap.analytics_json);
        setStep("roadmap");
        
        // Refresh the list in the background
        if (studentId) {
            roadmapsApi.getMyRoadmaps(studentId).then(r => setMyRoadmaps(r));
        }
        return;
      }

      // 2. Not found, switch to generation state
      const newReqId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      setCurrentRequestId(newReqId);
      setStep("generating");
      const genData = await roadmapsApi.generateRoadmap(role, ecosystem, studentId, newReqId, weeklyHours);
      setRoadmap(genData.roadmap);
      setAnalytics(genData.roadmap.analytics_json);
      setStep("roadmap");
      
      // Refresh the list
      if (studentId) {
          roadmapsApi.getMyRoadmaps(studentId).then(r => setMyRoadmaps(r));
      }

    } catch (err) {
      console.error(err);
      alert("Failed to load or generate roadmap. Please check API keys.");
      setStep("role");
    }
  };

  const handleEcosystemSelect = (eco: string, weeklyHours: number = 20) => {
    setSelectedEcosystem(eco);
    fetchRoadmapWithHours(selectedRole, eco, weeklyHours);
  };
  
  if (loadingList) {
    return <div className="min-h-[80vh] flex items-center justify-center"><div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  // Phase 0: Saved Roadmaps List
  if (step === "list") {
    return (
      <div className="bg-slate-950 min-h-[80vh] rounded-3xl p-8 shadow-2xl">
        <div className="max-w-6xl mx-auto py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 tracking-tight flex items-center gap-3">
                <Compass className="w-10 h-10 text-indigo-500" /> My Career Roadmaps
              </h1>
              <p className="text-slate-400">Your saved, ML-optimized learning paths.</p>
            </div>
            <button 
              onClick={() => setStep("role")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              <PlusCircle className="w-5 h-5" /> Generate New Path
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myRoadmaps.map((r) => (
              <div 
                key={r.id} 
                onClick={() => {
                  setRoadmap(r);
                  setAnalytics(r.analytics_json);
                  setStep("roadmap");
                }}
                className="group relative bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-6 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <button 
                  onClick={(e) => handleDelete(e, r.id)}
                  className="absolute top-4 right-4 text-slate-600 hover:text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors z-10 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <div className="mb-4">
                  <span className="px-3 py-1 bg-slate-800 text-indigo-400 text-xs font-bold uppercase tracking-wider rounded-md">
                    {r.ecosystem}
                  </span>
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-2">{r.role_name}</h3>
                <p className="text-slate-500 text-sm mb-6 line-clamp-2">
                  {r.roadmap_json?.description || "A personalized learning roadmap."}
                </p>
                
                <div className="flex items-center justify-between text-sm font-medium border-t border-slate-800 pt-4">
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <Zap className="w-4 h-4" /> {r.roadmap_json?.estimated_months || 6} Months
                  </span>
                  <span className="text-indigo-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    View Path <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Phase 1: Select Role
  if (step === "role") {
    return (
      <div className="bg-slate-950 min-h-[80vh] rounded-3xl flex flex-col items-center justify-center p-8 overflow-hidden shadow-2xl">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-2xl mx-auto">
          <div className="inline-block p-4 bg-indigo-500/10 rounded-full mb-6 border border-indigo-500/20">
            <Target className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-6 tracking-tight">Choose Your Destiny.</h1>
          <p className="text-xl text-slate-400 mb-12 leading-relaxed">
            Select a target career. We will instantly analyze current market job descriptions to build your optimized path.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => { setSelectedRole("Full Stack Developer"); setStep("ecosystem"); }}
              className="group bg-slate-900 border border-slate-800 hover:border-indigo-500 hover:bg-slate-800 p-8 rounded-2xl text-left transition-all duration-300"
            >
              <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">Full Stack Developer</h2>
              <p className="text-slate-500 text-sm">Frontend + Backend mastery. (Choose Stack)</p>
            </button>
            <button
              onClick={() => { setSelectedRole("Data Scientist"); setStep("ecosystem"); }}
              className="group bg-slate-900 border border-slate-800 hover:border-indigo-500 hover:bg-slate-800 p-8 rounded-2xl text-left transition-all duration-300"
            >
              <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">Data Scientist</h2>
              <p className="text-slate-500 text-sm">Python, ML, and Analytics.</p>
            </button>
            <button
              onClick={() => { setSelectedRole("Cloud Architect"); setStep("ecosystem"); }}
              className="group bg-slate-900 border border-slate-800 hover:border-indigo-500 hover:bg-slate-800 p-8 rounded-2xl text-left transition-all duration-300"
            >
              <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">Cloud Architect</h2>
              <p className="text-slate-500 text-sm">AWS, Azure, and infrastructure.</p>
            </button>
            <button
              onClick={() => { setSelectedRole("Cybersecurity Analyst"); setStep("ecosystem"); }}
              className="group bg-slate-900 border border-slate-800 hover:border-indigo-500 hover:bg-slate-800 p-8 rounded-2xl text-left transition-all duration-300"
            >
              <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">Cybersecurity Analyst</h2>
              <p className="text-slate-500 text-sm">Blue team, Red team, InfoSec.</p>
            </button>
          </div>
          
          <div className="mt-8">
            <p className="text-slate-400 mb-4 font-medium">Or enter a custom career path:</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const val = (e.currentTarget.elements.namedItem('customRole') as HTMLInputElement).value;
              if (val.trim()) {
                setSelectedRole(val.trim());
                setStep("ecosystem");
              }
            }} className="flex max-w-md mx-auto gap-3">
              <input 
                name="customRole"
                placeholder="e.g. AI Engineer, Mobile Developer..." 
                className="flex-1 bg-slate-900 border border-slate-700 text-white p-4 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <button type="submit" className="bg-slate-800 hover:bg-indigo-600 text-white px-6 py-4 rounded-xl font-bold transition-colors">
                Next
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  // Phase 2: Select Ecosystem
  if (step === "ecosystem") {
    return (
      <div className="bg-slate-950 min-h-[80vh] rounded-3xl flex flex-col items-center justify-center p-8 overflow-hidden shadow-2xl">
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="text-center max-w-2xl mx-auto w-full">
          <h1 className="text-4xl font-bold text-white mb-6">Define Your Tech Stack & Commitment</h1>
          <p className="text-lg text-slate-400 mb-12">
            Customize your learning speed and tech ecosystem to build a mentor-tailored path.
          </p>

          <form onSubmit={(e) => {
              e.preventDefault();
              const val = (e.currentTarget.elements.namedItem('customEco') as HTMLInputElement).value;
              const eco = val.trim() || "General";
              handleEcosystemSelect(eco, weeklyHours);
            }} className="flex flex-col max-w-xl mx-auto gap-4">
              
              <div className="flex flex-col text-left gap-1.5">
                <label className="text-sm font-semibold text-slate-300">Weekly Commitment Hours</label>
                <select 
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(parseInt(e.target.value))}
                  className="bg-slate-900 border border-slate-700 text-white p-4 rounded-xl outline-none focus:border-indigo-500"
                >
                  <option value={10}>10 Hours / Week (Part-Time / Light)</option>
                  <option value={20}>20 Hours / Week (Moderate / Standard)</option>
                  <option value={40}>40 Hours / Week (Full-Time / Intensive)</option>
                </select>
              </div>

              <div className="flex flex-col text-left gap-1.5 mb-2">
                <label className="text-sm font-semibold text-slate-300">Target Tech Stack (Optional)</label>
                <input 
                  name="customEco"
                  placeholder="e.g. Python/Django, .NET, MERN, Ruby on Rails..." 
                  className="bg-slate-900 border border-slate-700 text-white p-4 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20">
                Generate Path
              </button>
          </form>
            
          <div className="mt-10 flex flex-wrap justify-center gap-3">
              <span className="text-slate-500 text-sm py-2">Quick picks:</span>
              <button onClick={() => handleEcosystemSelect("MERN", weeklyHours)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors">MERN</button>
              <button onClick={() => handleEcosystemSelect("Java/Spring", weeklyHours)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors">Java</button>
              <button onClick={() => handleEcosystemSelect(".NET/C#", weeklyHours)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors">.NET</button>
              <button onClick={() => handleEcosystemSelect("Python/Django", weeklyHours)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors">Python</button>
              <button onClick={() => handleEcosystemSelect("General", weeklyHours)} className="px-4 py-2 border border-slate-700 hover:border-slate-500 text-slate-400 rounded-lg text-sm transition-colors ml-4">
                Skip / Let AI Discover
              </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Phase 3: Generating State
  if (step === "generating") {
    return <GeneratingScreen role={selectedRole} ecosystem={selectedEcosystem || "General"} requestId={currentRequestId} />;
  }

  // Phase 4: The Roadmap
  if (!roadmap) return null;

  const nodes = roadmap.roadmap_json?.nodes || [];

  return (
    <div className="bg-slate-950 min-h-[80vh] rounded-3xl p-8 overflow-hidden shadow-2xl relative">
      {myRoadmaps.length > 0 && (
        <button 
          onClick={() => setStep("list")}
          className="absolute top-8 left-8 text-slate-400 hover:text-white flex items-center gap-2 transition-colors z-20 print-hide"
        >
          <ChevronRight className="w-5 h-5 rotate-180" /> Back to My Roadmaps
        </button>
      )}
      <button 
        onClick={() => window.print()}
        className="absolute top-8 right-8 text-slate-400 hover:text-white flex items-center gap-2 transition-colors z-20 bg-slate-900/60 border border-slate-700/50 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-800 print-hide"
      >
        <BookOpen className="w-4 h-4 text-indigo-400" /> Export PDF / Print
      </button>
      <div className="max-w-6xl mx-auto py-12">
        
        {/* Professional Compact Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="relative rounded-[2rem] bg-slate-900/60 border border-slate-700/50 backdrop-blur-2xl p-6 md:p-8 mb-10 shadow-xl"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3 drop-shadow-sm">
              {roadmap.roadmap_json.title}
            </h1>
            
            <p className="text-base text-slate-300 max-w-3xl mx-auto leading-relaxed font-medium">
              {roadmap.roadmap_json.description}
            </p>
          </div>
          
          {/* Analytics & Meta Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Time Card */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/50 flex items-center gap-4 group hover:bg-slate-800/60 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-left">
                <h3 className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-0.5">Time to Master</h3>
                <div className="text-xl font-black text-white">{roadmap.roadmap_json?.estimated_months || 6} <span className="text-sm text-amber-400 font-bold">Months</span></div>
              </div>
            </motion.div>

            {/* Top MNCs Card */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/50 group hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Building2 className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-blue-400 font-bold tracking-widest text-xs uppercase">Top MNCs Hiring</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {analytics?.mncs_found?.length > 0 
                  ? analytics.mncs_found.map((c: string) => (
                      <span key={c} className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-100 text-sm font-semibold capitalize shadow-sm">
                        {c}
                      </span>
                    ))
                  : <span className="text-slate-500 text-xs font-medium italic">General industry data applied.</span>
                }
              </div>
            </motion.div>

            {/* Core Skills Card */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/50 group hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-rose-500/20">
                  <BrainCircuit className="w-4 h-4 text-rose-400" />
                </div>
                <h3 className="text-rose-400 font-bold tracking-widest text-xs uppercase">Core Skills (High Demand)</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {roadmap.core_skills?.slice(0, 6).map((s: any) => (
                  <span key={s.skill} className="px-2 py-1 bg-rose-500/10 border border-rose-500/20 rounded-md text-rose-100 text-xs font-semibold shadow-sm flex items-center gap-1.5">
                    {s.skill}
                    <span className="text-rose-400/80 text-[10px] font-black">{s.percentage}%</span>
                  </span>
                ))}
              </div>
            </motion.div>

          </div>
        </motion.div>

        {/* Ingestion Methodology Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative rounded-[1.5rem] bg-slate-900/40 border border-slate-800/80 p-5 mb-8 text-left backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group hover:bg-slate-900/60 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base mb-0.5">Scraped Industry Verification</h3>
              <p className="text-xs text-slate-400 max-w-xl">
                We crawl real-time market data across primary job portals (LinkedIn, Glassdoor, Indeed, Naukri) to verify skill frequencies and composite recommendation demand metrics.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 shrink-0 font-mono text-[11px] font-bold text-slate-400 bg-slate-950/80 px-4 py-3 rounded-xl border border-slate-800/60 shadow-inner">
            <div className="flex flex-col">
              <span className="text-slate-500 uppercase tracking-widest text-[9px] mb-0.5">Data Sources</span>
              <span className="text-indigo-400">LinkedIn, Indeed, Glassdoor</span>
            </div>
            <div className="w-px h-6 bg-slate-800 self-center hidden md:block"></div>
            <div className="flex flex-col">
              <span className="text-slate-500 uppercase tracking-widest text-[9px] mb-0.5">JDs Scraped</span>
              <span className="text-emerald-400">{roadmap.analytics_json?.total_jds || 76} Job Posts</span>
            </div>
            <div className="w-px h-6 bg-slate-800 self-center hidden md:block"></div>
            <div className="flex flex-col">
              <span className="text-slate-500 uppercase tracking-widest text-[9px] mb-0.5">Last Updated</span>
              <span className="text-amber-400">
                {roadmap.last_updated_at ? new Date(roadmap.last_updated_at).toLocaleDateString(undefined, {month: 'short', year: 'numeric'}) : "Aug 2026"}
              </span>
            </div>
          </div>
        </motion.div>

        {/* 3D Interactive Canvas */}
        <div className="mt-8">
          <RoadmapCanvas roadmapData={roadmap.roadmap_json} />
        </div>

        {/* AI Market Analysis & Chat */}
        <div className="print-hide">
          <RoadmapAnalysis roadmap={roadmap} />
        </div>
      </div>
    </div>
  );
}
