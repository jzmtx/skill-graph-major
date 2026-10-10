"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { roadmapsApi } from "@/lib/roadmapsApi";
import { ArrowRight, BookOpen, Target, CheckCircle2, ChevronRight, Briefcase, RefreshCw, Layers, Database, GitBranch, Cpu, Compass, Building2, BrainCircuit, Clock, BarChart3, Trash2, PlusCircle, Zap } from "lucide-react";
import Link from "next/link";
import RoadmapCanvas from "@/components/roadmap/RoadmapCanvas";
import RoadmapAnalysis from "@/components/roadmap/RoadmapAnalysis";
import LoadingSpectacle from "@/components/roadmap/LoadingSpectacle";
import { getCachedData, setCachedData } from "@/lib/cache";
import { SmartTopBarLoader } from "@/components/common/SmartLoader";

export default function RoadmapsPage() {
  const cachedInitialRoadmaps = getCachedData<any[]>('my_roadmaps');
  const [step, setStep] = useState<"list" | "role" | "ecosystem" | "generating" | "roadmap">(() => {
    return cachedInitialRoadmaps && cachedInitialRoadmaps.length > 0 ? "list" : "role";
  });
  const [selectedRole, setSelectedRole] = useState<string>("Full Stack Developer");
  const [selectedEcosystem, setSelectedEcosystem] = useState<string | null>(null);
  const [roadmap, setRoadmap] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [currentRequestId, setCurrentRequestId] = useState<string>("");
  
  const [myRoadmaps, setMyRoadmaps] = useState<any[]>(() => cachedInitialRoadmaps || []);
  const [loadingList, setLoadingList] = useState(() => !cachedInitialRoadmaps?.length);
  const [syncing, setSyncing] = useState(false);
  const [weeklyHours, setWeeklyHours] = useState<number>(20);

  useEffect(() => {
    const fetchMyRoadmaps = async () => {
      const studentId = typeof window !== 'undefined' ? localStorage.getItem("student_id") : null;
      if (!studentId) {
        if (!cachedInitialRoadmaps || cachedInitialRoadmaps.length === 0) {
          setStep("role");
        }
        setLoadingList(false);
        return;
      }
      setSyncing(true);
      try {
        const roadmaps = await roadmapsApi.getMyRoadmaps(studentId);
        if (roadmaps && roadmaps.length > 0) {
          setMyRoadmaps(roadmaps);
          setCachedData('my_roadmaps', roadmaps);
          setStep("list");
        } else {
          setMyRoadmaps([]);
          setCachedData('my_roadmaps', []);
          setStep("role");
        }
      } catch (err) {
        console.error(err);
        if (!cachedInitialRoadmaps || cachedInitialRoadmaps.length === 0) {
          setStep("role");
        }
      } finally {
        setLoadingList(false);
        setSyncing(false);
      }
    };
    fetchMyRoadmaps();
  }, []);

  const handleDelete = async (e: React.MouseEvent, roadmapId: string) => {
    e.stopPropagation();
    const studentId = typeof window !== 'undefined' ? localStorage.getItem("student_id") : null;
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
      const studentId = typeof window !== 'undefined' ? localStorage.getItem("student_id") : null;
      
      // 1. Try to fetch from cache/DB
      const data = await roadmapsApi.getRoadmap(role, ecosystem, studentId || undefined);
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
      const genData = await roadmapsApi.generateRoadmap(role, ecosystem, studentId || undefined, newReqId, weeklyHours);
      
      if (genData?.status === "cached" && genData?.roadmap) {
          setRoadmap(genData.roadmap);
          setAnalytics(genData.roadmap.analytics_json);
          setStep("roadmap");
      }
      
      // Refresh the list
      if (studentId) {
          roadmapsApi.getMyRoadmaps(studentId).then(r => setMyRoadmaps(r)).catch(console.error);
      }

    } catch (err: any) {
      console.error(err);
      alert(`Failed to load or generate roadmap: ${err?.message || err}`);
      setStep("role");
    }
  };

  const handleEcosystemSelect = (eco: string, weeklyHours: number = 20) => {
    setSelectedEcosystem(eco);
    fetchRoadmapWithHours(selectedRole, eco, weeklyHours);
  };
  
  if (loadingList) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-emerald-800 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Phase 0: Saved Roadmaps List
  if (step === "list") {
    return (
      <div className="bg-stone-50 min-h-[80vh] rounded-2xl p-6 md:p-8 border border-stone-200 shadow-sm relative">
        <SmartTopBarLoader active={syncing} />
        <div className="max-w-6xl mx-auto py-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div>
              <h1 className="text-3xl font-serif font-bold text-stone-900 mb-1 tracking-tight flex items-center gap-3">
                <Compass className="w-8 h-8 text-emerald-800" /> Career Roadmaps
              </h1>
              <p className="text-stone-600 text-sm">Your verified, curriculum-aligned career paths.</p>
            </div>
            <button 
              onClick={() => setStep("role")}
              className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 shadow-sm"
            >
              <PlusCircle className="w-4 h-4" /> Generate New Path
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myRoadmaps.map((item) => {
              const r = item.career_paths ? item.career_paths : item;
              return (
              <div 
                key={item.id} 
                onClick={() => {
                  setRoadmap(r);
                  setAnalytics(r.analytics_json);
                  setStep("roadmap");
                }}
                className="group relative bg-white border border-stone-200 hover:border-emerald-700 p-6 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md"
              >
                <button 
                  onClick={(e) => handleDelete(e, item.id)}
                  className="absolute top-4 right-4 text-stone-400 hover:text-red-700 hover:bg-stone-100 p-1.5 rounded-md transition-colors z-10 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <div className="mb-4">
                  <span className="px-2.5 py-1 bg-stone-100 text-stone-700 text-xs font-semibold uppercase tracking-wider rounded border border-stone-200">
                    {r.ecosystem}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-stone-900 mb-2">{r.role_name}</h3>
                <p className="text-stone-600 text-sm mb-6 line-clamp-2">
                  {r.roadmap_json?.description || "A structured, competency-based roadmap."}
                </p>
                
                <div className="flex items-center justify-between text-xs font-medium border-t border-stone-100 pt-4">
                  <span className="text-stone-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-stone-500" /> {r.roadmap_json?.estimated_months || 6} Months
                  </span>
                  <span className="text-emerald-800 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    View Path <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            )})}
          </div>
        </div>
      </div>
    );
  }

  // Phase 1: Select Role
  if (step === "role") {
    return (
      <div className="bg-stone-50 min-h-[80vh] rounded-2xl flex flex-col items-center justify-center p-6 md:p-12 border border-stone-200 shadow-sm">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-2xl mx-auto w-full">
          <div className="inline-block p-3 bg-stone-100 rounded-full mb-4 border border-stone-200">
            <Target className="w-6 h-6 text-emerald-800" />
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 mb-3 tracking-tight">Select Career Objective</h1>
          <p className="text-base text-stone-600 mb-8 leading-relaxed">
            Select a target career track. Real-time industry competencies and market hiring standards will shape your curriculum.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Full Stack Developer", desc: "Client-side and server-side engineering." },
              { title: "Data Scientist", desc: "Statistical modeling, Python, and data analytics." },
              { title: "Cloud Architect", desc: "Infrastructure, reliability, and security." },
              { title: "Cybersecurity Analyst", desc: "Information security, compliance, and systems defense." }
            ].map((roleItem) => (
              <button
                key={roleItem.title}
                onClick={() => { setSelectedRole(roleItem.title); setStep("ecosystem"); }}
                className="group bg-white border border-stone-200 hover:border-emerald-700 hover:bg-stone-50/50 p-6 rounded-xl text-left transition-all duration-200 shadow-sm"
              >
                <h2 className="text-lg font-bold text-stone-900 mb-1 group-hover:text-emerald-800 transition-colors">{roleItem.title}</h2>
                <p className="text-stone-500 text-xs">{roleItem.desc}</p>
              </button>
            ))}
          </div>
          
          <div className="mt-8 pt-8 border-t border-stone-200">
            <p className="text-stone-600 mb-3 text-sm font-medium">Or enter a custom career track:</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const val = (e.currentTarget.elements.namedItem('customRole') as HTMLInputElement).value;
              if (val.trim()) {
                setSelectedRole(val.trim());
                setStep("ecosystem");
              }
            }} className="flex max-w-md mx-auto gap-2">
              <input 
                name="customRole"
                placeholder="e.g. Systems Engineer, Mobile Developer..." 
                className="flex-1 bg-white border border-stone-300 text-stone-900 p-3 rounded-lg text-sm focus:border-emerald-800 focus:ring-1 focus:ring-emerald-800 outline-none"
              />
              <button type="submit" className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-3 rounded-lg text-sm font-semibold transition-colors">
                Continue
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
      <div className="bg-stone-50 min-h-[80vh] rounded-2xl flex flex-col items-center justify-center p-6 md:p-12 border border-stone-200 shadow-sm">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="text-center max-w-xl mx-auto w-full">
          <h1 className="text-3xl font-serif font-bold text-stone-900 mb-2">Technical Focus & Pace</h1>
          <p className="text-sm text-stone-600 mb-8">
            Tailor the technology stack and weekly commitment to configure an optimal milestone plan.
          </p>

          <form onSubmit={(e) => {
              e.preventDefault();
              const val = (e.currentTarget.elements.namedItem('customEco') as HTMLInputElement).value;
              const eco = val.trim() || "General";
              handleEcosystemSelect(eco, weeklyHours);
            }} className="flex flex-col gap-4">
              
              <div className="flex flex-col text-left gap-1.5">
                <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">Weekly Commitment</label>
                <select 
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(parseInt(e.target.value))}
                  className="bg-white border border-stone-300 text-stone-900 p-3 rounded-lg text-sm outline-none focus:border-emerald-800"
                >
                  <option value={10}>10 Hours / Week (Part-Time / Standard)</option>
                  <option value={20}>20 Hours / Week (Moderate Academic)</option>
                  <option value={40}>40 Hours / Week (Intensive Immersion)</option>
                </select>
              </div>

              <div className="flex flex-col text-left gap-1.5 mb-2">
                <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">Target Stack / Ecosystem (Optional)</label>
                <input 
                  name="customEco"
                  placeholder="e.g. Python, Java/Spring, TypeScript/Node, .NET..." 
                  className="bg-white border border-stone-300 text-stone-900 p-3 rounded-lg text-sm focus:border-emerald-800 focus:ring-1 focus:ring-emerald-800 outline-none"
                />
              </div>

              <button type="submit" className="w-full bg-emerald-800 hover:bg-emerald-900 text-white py-3 rounded-lg text-sm font-semibold transition-all shadow-sm">
                Generate Roadmap
              </button>
          </form>
            
          <div className="mt-8 flex flex-wrap justify-center items-center gap-2">
              <span className="text-stone-500 text-xs">Suggested:</span>
              {["TypeScript", "Java/Spring", "Python", ".NET"].map((eco) => (
                <button 
                  key={eco}
                  onClick={() => handleEcosystemSelect(eco, weeklyHours)} 
                  className="px-3 py-1.5 bg-white border border-stone-200 hover:border-emerald-700 text-stone-700 rounded-md text-xs font-medium transition-colors"
                >
                  {eco}
                </button>
              ))}
              <button 
                onClick={() => handleEcosystemSelect("General", weeklyHours)} 
                className="px-3 py-1.5 text-stone-500 hover:text-stone-800 text-xs underline ml-2"
              >
                Comprehensive
              </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Phase 3: Generating State
  if (step === "generating") {
    return (
      <LoadingSpectacle 
        role={selectedRole}
        requestId={currentRequestId}
        onComplete={(data) => {
          setRoadmap(data);
          setAnalytics(data.analytics_json);
          setStep("roadmap");
        }}
        onError={(msg) => {
          alert("Generation failed: " + msg);
          setStep("role");
        }}
      />
    );
  }

  // Phase 4: The Roadmap
  if (!roadmap) return null;

  return (
    <div className="bg-stone-50 min-h-[80vh] rounded-2xl p-6 md:p-8 border border-stone-200 shadow-sm relative">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-200 print-hide">
        {myRoadmaps.length > 0 ? (
          <button 
            onClick={() => setStep("list")}
            className="text-stone-600 hover:text-stone-900 text-sm font-medium flex items-center gap-1.5 transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" /> Back to My Roadmaps
          </button>
        ) : <div />}
        <button 
          onClick={() => window.print()}
          className="text-stone-700 hover:text-stone-900 flex items-center gap-2 transition-colors bg-white border border-stone-300 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-stone-100 shadow-sm"
        >
          <BookOpen className="w-3.5 h-3.5 text-emerald-800" /> Export PDF / Print
        </button>
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Academic / Executive Hero */}
        <div className="bg-white rounded-xl border border-stone-200 p-6 md:p-8 mb-8 shadow-sm">
          <div className="mb-6">
            <span className="px-2.5 py-1 bg-stone-100 text-stone-700 text-xs font-semibold uppercase tracking-wider rounded border border-stone-200 inline-block mb-3">
              {roadmap.ecosystem || "Professional Path"}
            </span>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 tracking-tight mb-2">
              {roadmap.roadmap_json?.title || roadmap.role_name}
            </h1>
            <p className="text-stone-600 text-sm max-w-3xl leading-relaxed">
              {roadmap.roadmap_json?.description}
            </p>
          </div>
          
          {/* Metadata Tiles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-stone-50 rounded-lg p-4 border border-stone-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-stone-200/70 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-stone-700" />
              </div>
              <div>
                <div className="text-stone-500 text-[10px] font-bold uppercase tracking-wider">Estimated Timeline</div>
                <div className="text-base font-bold text-stone-900">{roadmap.roadmap_json?.estimated_months || 6} Months</div>
              </div>
            </div>

            <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
              <div className="flex items-center gap-1.5 text-stone-700 font-bold text-xs uppercase tracking-wider mb-2">
                <Building2 className="w-3.5 h-3.5 text-emerald-800" /> Key Hiring Organizations
              </div>
              <div className="flex flex-wrap gap-1">
                {analytics?.mncs_found?.length > 0 
                  ? analytics.mncs_found.slice(0, 4).map((c: string) => (
                      <span key={c} className="px-2 py-0.5 bg-white border border-stone-200 rounded text-stone-700 text-xs font-medium">
                        {c}
                      </span>
                    ))
                  : <span className="text-stone-500 text-xs italic">National industry standards</span>
                }
              </div>
            </div>

            <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
              <div className="flex items-center gap-1.5 text-stone-700 font-bold text-xs uppercase tracking-wider mb-2">
                <BrainCircuit className="w-3.5 h-3.5 text-emerald-800" /> High-Priority Competencies
              </div>
              <div className="flex flex-wrap gap-1">
                {roadmap.core_skills?.slice(0, 4).map((s: any) => (
                  <span key={s.skill} className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-900 text-xs font-semibold">
                    {s.skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Industry Verification Notice */}
        <div className="rounded-xl bg-white border border-stone-200 p-5 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-800" />
            </div>
            <div>
              <h3 className="text-stone-900 font-bold text-sm">Empirical Industry Benchmarking</h3>
              <p className="text-xs text-stone-500">
                Skills frequency and sequencing mapped directly against current hiring specifications.
              </p>
            </div>
          </div>
          <div className="flex gap-4 font-mono text-xs text-stone-600 bg-stone-50 px-3 py-2 rounded-lg border border-stone-200">
            <div><span className="text-stone-400">Postings Analyzed:</span> <strong className="text-stone-800">{roadmap.analytics_json?.total_jds || 76}</strong></div>
            <div className="w-px h-4 bg-stone-200 self-center"></div>
            <div><span className="text-stone-400">Taxonomy:</span> <strong className="text-stone-800">Verified</strong></div>
          </div>
        </div>

        {/* Roadmap Canvas */}
        <div className="mt-6">
          <RoadmapCanvas roadmapData={roadmap.roadmap_json} />
        </div>

        {/* Curriculum Analysis Report */}
        <div className="mt-8 print-hide">
          <RoadmapAnalysis roadmap={roadmap} />
        </div>
      </div>
    </div>
  );
}
