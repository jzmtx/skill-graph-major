"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, PlayCircle, Target, CheckCircle2, ChevronDown, Lock, Star, SplitSquareHorizontal, Briefcase, Trophy, Code2, FlaskConical, Award } from "lucide-react";
import Link from "next/link";

// ─── Main Roadmap Canvas ──────────────────────────────────────────────────
export default function RoadmapCanvas({ roadmapData: rawRoadmapData }: { roadmapData: any }) {
  const [devMode, setDevMode] = useState(false);

  // Support both new 'stages' format and legacy 'nodes' format
  console.log("Raw roadmapData received:", typeof rawRoadmapData, rawRoadmapData);
  let roadmapData = rawRoadmapData;
  if (typeof rawRoadmapData === 'string') {
    try {
      roadmapData = JSON.parse(rawRoadmapData);
    } catch (e) {
      console.error("Failed to parse roadmapData string", e);
    }
  }

  let stages = roadmapData?.stages ? [...roadmapData.stages] : [];
  
  if (!stages || stages.length === 0) {
    // Fallback if they are using V1 flat nodes without stages
    const flatNodes = roadmapData?.nodes || [];
    if (flatNodes.length === 0) {
      return (
        <div className="w-full max-w-4xl mx-auto py-16 text-center">
          <div className="text-slate-500 text-lg">No roadmap nodes found.</div>
        </div>
      );
    }
    // Convert V1 flat nodes into a single stage so it still renders
    stages = [{
      stage_id: 1,
      stage_name: "Learning Path",
      nodes: flatNodes.map((n: any) => ({ ...n, classification: n.level || "core" }))
    }];
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-2 md:px-4">
      {/* Header stats */}
      <div className="flex flex-wrap gap-3 mb-12">
        {roadmapData?.total_nodes && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 rounded-lg text-sm text-slate-300 border border-slate-700/50">
            <span className="font-bold text-white">{roadmapData.total_nodes}</span> skills in roadmap
          </div>
        )}
        {roadmapData?.estimated_months && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 rounded-lg text-sm text-slate-300 border border-slate-700/50">
            <span className="font-bold text-white">~{roadmapData.estimated_months} months</span> to job-ready
          </div>
        )}
        {roadmapData?.confidence && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400 shadow-sm shadow-emerald-500/10">
            <span className="font-bold">{roadmapData.confidence}%</span> market confidence
          </div>
        )}
        
        {/* Dev Mode Toggle */}
        <button 
          onClick={() => setDevMode(!devMode)}
          className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
            devMode 
              ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.2)]" 
              : "bg-slate-800/40 border-slate-700/50 text-slate-500 hover:text-slate-300"
          }`}
        >
          <Lock className={`w-3.5 h-3.5 ${devMode ? "hidden" : "block"}`} />
          <Award className={`w-3.5 h-3.5 ${devMode ? "block" : "hidden"}`} />
          {devMode ? "Dev Mode: Unlocked" : "Dev Mode"}
        </button>
      </div>

      <div className="relative">
        {/* Continuous vertical timeline line */}
        <div className="absolute top-2 bottom-4 left-[15px] md:left-[23px] w-1 bg-gradient-to-b from-indigo-500 via-purple-500 to-emerald-500 rounded-full opacity-30" />
        
        {stages.map((stage: any, index: number) => (
          <StageRow key={index} stage={stage} index={index} isLast={index === stages.length - 1} devMode={devMode} />
        ))}
      </div>
    </div>
  );
}

// ─── Stage Row Container ───────────────────────────────────────────────────
function StageRow({ stage, index, isLast, devMode }: { stage: any; index: number; isLast: boolean; devMode: boolean }) {
  const nodes = stage.nodes || [];
  
  // Categorize nodes by LLM classification
  let coreNodes = nodes.filter((n: any) => n.classification === "core" || !n.classification);
  const specializations = nodes.filter((n: any) => n.classification === "specialization");
  const optionals = nodes.filter((n: any) => n.classification === "optional");
  let futures = nodes.filter((n: any) => n.classification === "future");

  if (devMode) {
    // In Dev Mode, unlock all future nodes by converting them to core
    coreNodes = [...coreNodes, ...futures];
    futures = [];
  }

  return (
    <div className="relative mb-16 pl-10 md:pl-14">
      {/* Stage Node Marker */}
      <div className="absolute left-[7px] md:left-[15px] top-1.5 w-5 h-5 rounded-full bg-slate-950 border-[4px] border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.6)] z-10 flex items-center justify-center">
        <div className="w-1.5 h-1.5 bg-white rounded-full" />
      </div>

      {/* Stage Header */}
      <h2 className="text-2xl md:text-3xl font-black text-white mb-6 tracking-tight drop-shadow-md">
        {stage.stage_name}
      </h2>

      <div className="flex flex-col gap-5">
        {/* 1. Core Requirements (Solid Cards) */}
        {coreNodes.map((node: any, idx: number) => (
          <NodeCard key={`core-${idx}`} node={node} type="core" />
        ))}

        {/* 2. Specialization Choice Branch */}
        {specializations.length > 0 && (
          <SpecializationBranch options={specializations} />
        )}

        {/* 3. Optionals & Recommended (Dashed/Lighter) */}
        {optionals.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800/60">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Optional / Recommended Enhancements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {optionals.map((node: any, idx: number) => (
                <NodeCard key={`opt-${idx}`} node={node} type="optional" compact />
              ))}
            </div>
          </div>
        )}

        {/* 4. Future / Locked (Dimmed) */}
        {futures.length > 0 && (
          <div className="mt-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Future Pathways</h3>
            <div className="flex flex-wrap gap-3">
              {futures.map((node: any, idx: number) => (
                <div key={`fut-${idx}`} className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-lg text-slate-500 text-sm">
                  <Lock className="w-3.5 h-3.5" />
                  {node.name || node.skill}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

        {/* 5. Stage/Chunk Milestone (Assessment & Project) */}
        <div className="mt-8">
          <StageMilestoneCard stageName={stage.stage_name} />
        </div>

      {isLast && (
        <div className="mt-16">
          <CapstoneProjectCard roadmapData={stage} />
        </div>
      )}
    </div>
  );
}

// ─── Specialization Choice Branch Component ──────────────────────────────────
function SpecializationBranch({ options }: { options: any[] }) {
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);

  // We auto-recommend the first one assuming the LLM sorted by highest demand priority
  return (
    <div className="bg-slate-900/40 border-2 border-dashed border-indigo-500/30 rounded-2xl p-5 md:p-6 my-4 relative overflow-hidden group hover:border-indigo-500/50 transition-colors">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <SplitSquareHorizontal className="w-24 h-24 text-indigo-400" />
      </div>
      
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
          <SplitSquareHorizontal className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Choose Your Specialization</h3>
          <p className="text-xs text-slate-400 mt-0.5">Select a path to expand this branch into your main roadmap.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
        {options.map((opt: any, i: number) => {
          const isSelected = selectedOpt === (opt.name || opt.skill);
          const isRecommended = i === 0;
          
          return (
            <button
              key={i}
              onClick={() => setSelectedOpt(opt.name || opt.skill)}
              className={`text-left relative p-4 rounded-xl border transition-all duration-300 ${
                isSelected 
                  ? "bg-indigo-500/10 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.15)]" 
                  : "bg-slate-950/50 border-slate-800 hover:border-slate-600 hover:bg-slate-900"
              }`}
            >
              {isRecommended && (
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider rounded flex items-center gap-1 shadow-lg">
                  <Star className="w-3 h-3" /> Recommended
                </div>
              )}
              
              <h4 className={`font-bold text-base mb-2 pr-4 ${isSelected ? "text-indigo-400" : "text-slate-200"}`}>
                {opt.name || opt.skill}
              </h4>
              
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                {isRecommended 
                  ? "High industry demand for this specific path based on current market trends." 
                  : "Strong alternative if your company or target ecosystem requires it."}
              </p>
              
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 bg-slate-900 px-2 py-1 rounded">
                  {opt.demand_score ? `${opt.demand_score}% Demand` : "High Demand"}
                </span>
                
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? "border-indigo-500" : "border-slate-700"
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedOpt && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 24 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 border-t border-indigo-500/20">
              <NodeCard 
                node={options.find(o => (o.name || o.skill) === selectedOpt)} 
                type="core" 
                isExpandedOverride={true}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Individual Node Card ──────────────────────────────────────────────────
function NodeCard({ node, type = "core", compact = false, isExpandedOverride = false }: { node: any; type?: string; compact?: boolean; isExpandedOverride?: boolean }) {
  const [expanded, setExpanded] = useState(isExpandedOverride);
  const title = node.name || node.skill || "Unknown Skill";

  // Visual styles based on type
  let borderStyle = "border-slate-700";
  let bgStyle = "bg-slate-900";
  let tagColor = "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
  
  if (type === "optional") {
    borderStyle = "border-slate-800 border-dashed";
    bgStyle = "bg-slate-950";
    tagColor = "text-slate-400 bg-slate-800 border-slate-700";
  }

  return (
    <div className={`border rounded-xl transition-all duration-200 overflow-hidden ${borderStyle} ${expanded ? bgStyle : "hover:border-slate-600 bg-slate-900/80"}`}>
      
      {/* Card Header (Clickable) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between gap-3 p-4 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${tagColor}`}>
              {type === "core" ? "Required Core" : "Optional"}
            </span>
            {node.estimated_days && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                {node.estimated_days} days
              </span>
            )}
            {node.demand_score && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                {node.demand_score}% demand
              </span>
            )}
          </div>
          
          <h3 className={`font-bold leading-snug ${compact ? "text-base" : "text-lg"} text-white`}>
            {title}
          </h3>
          
          {!expanded && node.why && (
            <p className="text-slate-400 text-xs mt-1.5 line-clamp-1">{node.why}</p>
          )}
        </div>
        
        <ChevronDown className={`w-5 h-5 text-slate-500 shrink-0 mt-1 transition-transform duration-300 ${expanded ? "rotate-180 text-indigo-400" : ""}`} />
      </button>

      {/* Expanded Details Body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-slate-800"
          >
            <div className="p-4 md:p-5 flex flex-col gap-5 bg-slate-900/50">
              
              {/* Context / Why */}
              {(node.why || node.description) ? (
                <p className="text-sm text-slate-300 leading-relaxed">
                  {node.why || node.description || "Core competency required for this role based on market analysis."}
                </p>
              ) : (
                <p className="text-sm text-slate-300 leading-relaxed italic opacity-80">
                  This skill is extracted directly from high-frequency job descriptions.
                </p>
              )}

              {/* Sub-skills & Concepts */}
              {node.subskills && node.subskills.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2.5">What you'll learn</p>
                  <div className="flex flex-wrap gap-1.5">
                    {node.subskills.map((s: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-md text-xs text-slate-300 shadow-inner">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Labs */}
              {node.labs && node.labs.length > 0 && (
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-3 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" /> Hands-on Labs
                  </p>
                  <ul className="space-y-2">
                    {node.labs.map((lab: string, i: number) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                        <span className="leading-relaxed">{lab}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Link
                  href={`/dashboard/workspace/${encodeURIComponent(node.skill_id || title)}`}
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-lg transition-colors text-xs shadow-lg shadow-indigo-500/20"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Workspace
                </Link>
                
                {node.docs && (
                  <a href={node.docs} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-lg transition-colors">
                    Docs
                  </a>
                )}
                
                {node.video && (
                  <a href={node.video} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-lg transition-colors">
                    <PlayCircle className="w-3.5 h-3.5 text-red-400" /> Tutorial
                  </a>
                )}
                
                <Link href={`/assessment/${encodeURIComponent(title)}`}
                  className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-lg transition-colors ml-auto shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verify Skill
                </Link>
              </div>
              
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Stage Milestone Card (Chunk Assessment & Project) ────────────────────
function StageMilestoneCard({ stageName }: { stageName: string }) {
  return (
    <div className="relative bg-gradient-to-br from-slate-900 to-slate-950 border border-indigo-500/30 rounded-2xl p-6 shadow-xl shadow-indigo-500/5 overflow-hidden group hover:border-indigo-500/60 transition-colors">
      <div className="absolute -right-4 -top-4 opacity-10 pointer-events-none group-hover:scale-110 group-hover:opacity-20 transition-transform duration-500">
        <Award className="w-32 h-32 text-indigo-400" />
      </div>
      
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 shadow-inner">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-400">
            {stageName} Milestone
          </h3>
        </div>
      </div>
      
      <p className="text-sm text-slate-400 mb-6 max-w-lg">
        To unlock the next stage, you must pass the cumulative assessment and submit a practical project proving your skills in {stageName}.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Assessment Button */}
        <Link href={`/assessment/${encodeURIComponent(stageName + " Cumulative")}`} className="flex flex-col items-start gap-2 p-4 bg-slate-950/60 border border-slate-800 rounded-xl hover:border-indigo-500/50 hover:bg-slate-900 transition-colors">
          <div className="flex items-center gap-2 text-indigo-300 font-bold">
            <Target className="w-4 h-4" /> Stage Assessment
          </div>
          <p className="text-xs text-slate-500 text-left">A rigorous 20-question test covering all core concepts in this stage.</p>
        </Link>
        
        {/* Project Button */}
        <Link href={`/project/${encodeURIComponent(stageName)}`} className="flex flex-col items-start gap-2 p-4 bg-slate-950/60 border border-slate-800 rounded-xl hover:border-emerald-500/50 hover:bg-slate-900 transition-colors">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <Code2 className="w-4 h-4" /> Project Verification
          </div>
          <p className="text-xs text-slate-500 text-left">Submit a GitHub repo applying these skills to a real-world scenario.</p>
        </Link>
      </div>
    </div>
  );
}

// ─── Capstone Project Card ────────────────────────────────────────────────
function CapstoneProjectCard({ roadmapData }: { roadmapData: any }) {
  return (
    <div className="relative flex items-start gap-4 -ml-4">
      {/* Checkpoint Marker */}
      <div className="absolute -left-[5px] md:-left-[2px] top-6 w-6 h-6 rounded-full bg-slate-950 border-[4px] border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.8)] z-10 flex items-center justify-center">
        <Trophy className="w-3 h-3 text-emerald-400" />
      </div>
      
      {/* Main Card */}
      <div className="ml-8 w-full bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-emerald-500/30 rounded-2xl overflow-hidden shadow-2xl shadow-emerald-500/10 group">
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500" />
        
        <div className="p-6 md:p-8 relative">
          <div className="absolute right-0 bottom-0 opacity-[0.03] pointer-events-none transition-transform duration-700 group-hover:scale-105 group-hover:-translate-y-4">
            <Briefcase className="w-64 h-64" />
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  Final Requirement
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2">
                Industry Capstone Project
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                You've mastered the theoretical and practical skills. Now, it's time to build a comprehensive, production-grade application that simulates a real-world industry problem. This project will serve as the crown jewel of your portfolio.
              </p>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 rounded-lg text-xs font-bold text-slate-300 border border-slate-700">
                  <FlaskConical className="w-3.5 h-3.5 text-blue-400" /> Architecture Review
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 rounded-lg text-xs font-bold text-slate-300 border border-slate-700">
                  <Code2 className="w-3.5 h-3.5 text-purple-400" /> Code Quality Analysis
                </div>
              </div>
            </div>
            
            <div className="shrink-0 flex flex-col gap-3">
              <Link href="/project/capstone" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3.5 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all transform hover:-translate-y-0.5 w-full flex items-center justify-center gap-2">
                <Trophy className="w-5 h-5" /> Start Capstone
              </Link>
              <p className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Unlocks Certificate
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
