"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, PlayCircle, Target, CheckCircle2, ChevronDown, Lock, Star, SplitSquareHorizontal, Briefcase, Trophy, Code2, FlaskConical, Award } from "lucide-react";
import Link from "next/link";
import { prewarmAssessment } from "@/lib/api";

// ─── Main Roadmap Canvas ──────────────────────────────────────────────────
export default function RoadmapCanvas({ roadmapData: rawRoadmapData }: { roadmapData: any }) {
  const [devMode, setDevMode] = useState(false);

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
    const flatNodes = roadmapData?.nodes || [];
    if (flatNodes.length === 0) {
      return (
        <div className="w-full max-w-4xl mx-auto py-12 text-center bg-white rounded-xl border border-stone-200">
          <div className="text-stone-500 text-sm font-medium">No roadmap milestones found.</div>
        </div>
      );
    }
    stages = [{
      stage_id: 1,
      stage_name: "Curriculum Milestones",
      nodes: flatNodes.map((n: any) => ({ ...n, classification: n.level || "core" }))
    }];
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-2 md:px-4">
      {/* Header stats */}
      <div className="flex flex-wrap gap-2.5 mb-10 items-center">
        {roadmapData?.total_nodes && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg text-xs font-medium text-stone-700 border border-stone-200 shadow-sm">
            <span className="font-bold text-stone-900">{roadmapData.total_nodes}</span> skills sequenced
          </div>
        )}
        {roadmapData?.estimated_months && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg text-xs font-medium text-stone-700 border border-stone-200 shadow-sm">
            <span className="font-bold text-stone-900">~{roadmapData.estimated_months} months</span> to target mastery
          </div>
        )}
        {roadmapData?.confidence && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 shadow-sm">
            <span className="font-bold">{roadmapData.confidence}%</span> market alignment
          </div>
        )}
        
        {/* Dev Mode Toggle */}
        <button 
          onClick={() => setDevMode(!devMode)}
          className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            devMode 
              ? "bg-emerald-50 border-emerald-300 text-emerald-800" 
              : "bg-white border-stone-200 text-stone-500 hover:text-stone-700 hover:bg-stone-50"
          }`}
        >
          <Lock className={`w-3.5 h-3.5 ${devMode ? "hidden" : "block"}`} />
          <Award className={`w-3.5 h-3.5 ${devMode ? "block" : "hidden"}`} />
          {devMode ? "Preview: All Unlocked" : "Preview Mode"}
        </button>
      </div>

      <div className="relative">
        {/* Continuous vertical timeline line */}
        <div className="absolute top-2 bottom-4 left-[15px] md:left-[23px] w-0.5 bg-stone-300" />
        
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
  
  let coreNodes = nodes.filter((n: any) => n.classification === "core" || !n.classification);
  const specializations = nodes.filter((n: any) => n.classification === "specialization");
  const optionals = nodes.filter((n: any) => n.classification === "optional");
  let futures = nodes.filter((n: any) => n.classification === "future");

  if (devMode) {
    coreNodes = [...coreNodes, ...futures];
    futures = [];
  }

  return (
    <div className="relative mb-14 pl-10 md:pl-14">
      {/* Stage Node Marker */}
      <div className="absolute left-[8px] md:left-[16px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-emerald-800 shadow-sm z-10 flex items-center justify-center">
        <div className="w-1.5 h-1.5 bg-emerald-800 rounded-full" />
      </div>

      {/* Stage Header */}
      <div className="mb-5">
        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1">Stage {index + 1}</span>
        <h2 className="text-xl md:text-2xl font-serif font-bold text-stone-900 tracking-tight">
          {stage.stage_name}
        </h2>
      </div>

      <div className="flex flex-col gap-4">
        {/* 1. Core Requirements */}
        {coreNodes.map((node: any, idx: number) => (
          <NodeCard key={`core-${idx}`} node={node} type="core" />
        ))}

        {/* 2. Specialization Choice Branch */}
        {specializations.length > 0 && (
          <SpecializationBranch options={specializations} />
        )}

        {/* 3. Optionals & Recommended */}
        {optionals.length > 0 && (
          <div className="mt-3 pt-3 border-t border-stone-200">
            <h3 className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-3">Elective / Recommended Enhancements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {optionals.map((node: any, idx: number) => (
                <NodeCard key={`opt-${idx}`} node={node} type="optional" compact />
              ))}
            </div>
          </div>
        )}

        {/* 4. Future / Locked */}
        {futures.length > 0 && (
          <div className="mt-2">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Upcoming Progression</h3>
            <div className="flex flex-wrap gap-2">
              {futures.map((node: any, idx: number) => (
                <div key={`fut-${idx}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 border border-stone-200 rounded-md text-stone-500 text-xs">
                  <Lock className="w-3 h-3 text-stone-400" />
                  {node.name || node.skill}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. Stage Milestone */}
      <div className="mt-6">
        <StageMilestoneCard stageName={stage.stage_name} />
      </div>

      {isLast && (
        <div className="mt-12">
          <CapstoneProjectCard roadmapData={stage} />
        </div>
      )}
    </div>
  );
}

// ─── Specialization Choice Branch Component ──────────────────────────────────
function SpecializationBranch({ options }: { options: any[] }) {
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);

  return (
    <div className="bg-stone-50 border border-stone-300 rounded-xl p-5 my-2 relative">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800">
          <SplitSquareHorizontal className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-stone-900">Select Specialization Track</h3>
          <p className="text-xs text-stone-500">Pick a dedicated pathway to branch into your curriculum.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-2">
        {options.map((opt: any, i: number) => {
          const isSelected = selectedOpt === (opt.name || opt.skill);
          const isRecommended = i === 0;
          
          return (
            <button
              key={i}
              onClick={() => setSelectedOpt(opt.name || opt.skill)}
              className={`text-left relative p-3.5 rounded-lg border transition-all ${
                isSelected 
                  ? "bg-white border-emerald-800 shadow-sm ring-1 ring-emerald-800" 
                  : "bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50"
              }`}
            >
              {isRecommended && (
                <div className="absolute -top-2 right-2 px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-bold uppercase tracking-wider rounded">
                  Recommended
                </div>
              )}
              
              <h4 className={`font-bold text-sm mb-1 ${isSelected ? "text-emerald-900" : "text-stone-800"}`}>
                {opt.name || opt.skill}
              </h4>
              
              <p className="text-xs text-stone-500 leading-normal line-clamp-2">
                {isRecommended 
                  ? "High current employment demand across core hiring specifications." 
                  : "Alternative specialization aligned with specific industry requirements."}
              </p>
              
              <div className="mt-3 flex items-center justify-between text-[10px]">
                <span className="font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                  {opt.demand_score ? `${opt.demand_score}% Demand` : "High Demand"}
                </span>
                
                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                  isSelected ? "border-emerald-800" : "border-stone-300"
                }`}>
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-emerald-800" />}
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
            animate={{ opacity: 1, height: "auto", marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 border-t border-stone-200">
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

  let borderStyle = "border-stone-200";
  let bgStyle = "bg-white";
  let tagColor = "text-emerald-800 bg-emerald-50 border-emerald-200";
  
  if (type === "optional") {
    borderStyle = "border-stone-200 border-dashed";
    bgStyle = "bg-stone-50/70";
    tagColor = "text-stone-700 bg-stone-100 border-stone-200";
  }

  return (
    <div className={`border rounded-xl transition-all overflow-hidden ${borderStyle} ${bgStyle} shadow-sm`}>
      {/* Card Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-stone-50/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${tagColor}`}>
              {type === "core" ? "Core Competency" : "Elective"}
            </span>
            {node.estimated_days && (
              <span className="text-[10px] font-semibold text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded">
                {node.estimated_days} days
              </span>
            )}
            {node.demand_score && (
              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {node.demand_score}% demand
              </span>
            )}
          </div>
          
          <h3 className={`font-bold leading-snug ${compact ? "text-sm" : "text-base"} text-stone-900`}>
            {title}
          </h3>
          
          {!expanded && node.why && (
            <p className="text-stone-500 text-xs mt-1 line-clamp-1">{node.why}</p>
          )}
        </div>
        
        <ChevronDown className={`w-4 h-4 text-stone-400 shrink-0 mt-1 transition-transform duration-200 ${expanded ? "rotate-180 text-emerald-800" : ""}`} />
      </button>

      {/* Expanded Details Body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-t border-stone-100"
          >
            <div className="p-4 flex flex-col gap-4 bg-stone-50/50">
              
              {(node.why || node.description) ? (
                <p className="text-xs text-stone-700 leading-relaxed">
                  {node.why || node.description}
                </p>
              ) : (
                <p className="text-xs text-stone-500 italic">
                  Identified as a critical prerequisite skill in target career specifications.
                </p>
              )}

              {/* Sub-skills & Concepts */}
              {node.subskills && node.subskills.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-600 mb-2">Key Competencies</p>
                  <div className="flex flex-wrap gap-1.5">
                    {node.subskills.map((s: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-white border border-stone-200 rounded text-xs text-stone-700 shadow-2xs">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Labs */}
              {node.labs && node.labs.length > 0 && (
                <div className="bg-white p-3.5 rounded-lg border border-stone-200">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-700 mb-2 flex items-center gap-1.5">
                    <Target className="w-3 h-3 text-emerald-800" /> Practical Exercises
                  </p>
                  <ul className="space-y-1.5">
                    {node.labs.map((lab: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-stone-600">
                        <span className="w-1 h-1 rounded-full bg-emerald-800 mt-1.5 shrink-0" />
                        <span className="leading-relaxed">{lab}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-stone-200">
                <Link
                  href={`/dashboard/workspace/${encodeURIComponent(node.skill_id || title)}`}
                  className="flex items-center justify-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors text-xs shadow-sm"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Study Workspace
                </Link>
                
                {node.docs && (
                  <a href={node.docs} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 text-xs font-medium text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-50 border border-stone-300 px-3 py-1.5 rounded-lg transition-colors">
                    Documentation
                  </a>
                )}
                
                {node.video && (
                  <a href={node.video} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 text-xs font-medium text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-50 border border-stone-300 px-3 py-1.5 rounded-lg transition-colors">
                    <PlayCircle className="w-3.5 h-3.5 text-stone-500" /> Tutorial
                  </a>
                )}
                
                <Link 
                  href={`/assessment/${encodeURIComponent(title)}`}
                  onMouseEnter={() => {
                    const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
                    prewarmAssessment({ skill_name: title, student_id: studentId });
                  }}
                  onClick={() => {
                    const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
                    prewarmAssessment({ skill_name: title, student_id: studentId });
                  }}
                  className="flex items-center justify-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-1.5 rounded-lg transition-colors ml-auto shadow-2xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Assess & Verify
                </Link>
              </div>
              
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Stage Milestone Card ──────────────────────────────────────────────────
function StageMilestoneCard({ stageName }: { stageName: string }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="p-1.5 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800">
          <Award className="w-4 h-4" />
        </div>
        <h3 className="text-base font-bold text-stone-900">
          {stageName} Milestone Evaluation
        </h3>
      </div>
      
      <p className="text-xs text-stone-600 mb-4 max-w-xl">
        Complete the comprehensive milestone assessment and practical verification to solidify competency in {stageName}.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Link 
          href={`/assessment/${encodeURIComponent(stageName + " Cumulative")}`} 
          onMouseEnter={() => {
            const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
            prewarmAssessment({ skill_name: stageName + " Cumulative", student_id: studentId });
          }}
          onClick={() => {
            const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
            prewarmAssessment({ skill_name: stageName + " Cumulative", student_id: studentId });
          }}
          className="flex flex-col items-start gap-1 p-3.5 bg-stone-50 border border-stone-200 rounded-lg hover:border-emerald-700 hover:bg-white transition-all shadow-2xs"
        >
          <div className="flex items-center gap-1.5 text-stone-900 font-bold text-xs">
            <Target className="w-3.5 h-3.5 text-emerald-800" /> Stage Assessment
          </div>
          <p className="text-[11px] text-stone-500 text-left">Adaptive theoretical and scenario-based examination.</p>
        </Link>
        
        <Link href={`/project/${encodeURIComponent(stageName)}`} className="flex flex-col items-start gap-1 p-3.5 bg-stone-50 border border-stone-200 rounded-lg hover:border-emerald-700 hover:bg-white transition-all shadow-2xs">
          <div className="flex items-center gap-1.5 text-stone-900 font-bold text-xs">
            <Code2 className="w-3.5 h-3.5 text-emerald-800" /> Project Verification
          </div>
          <p className="text-[11px] text-stone-500 text-left">Submit an empirical implementation to verify Level 2 mastery.</p>
        </Link>
      </div>
    </div>
  );
}

// ─── Capstone Project Card ────────────────────────────────────────────────
function CapstoneProjectCard({ roadmapData }: { roadmapData: any }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-6 md:p-8 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Capstone Milestone
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-serif font-bold text-stone-900 tracking-tight mb-2">
            Production Capstone Portfolio
          </h3>
          <p className="text-stone-600 text-xs leading-relaxed mb-4">
            Synthesize all mastered competencies into a full-scale, verifiable system demonstrating end-to-end architectural rigor.
          </p>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-50 rounded text-xs font-medium text-stone-700 border border-stone-200">
              <FlaskConical className="w-3 h-3 text-stone-500" /> Architectural Audit
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-50 rounded text-xs font-medium text-stone-700 border border-stone-200">
              <Code2 className="w-3 h-3 text-stone-500" /> Production Repository Review
            </div>
          </div>
        </div>
        
        <div className="shrink-0 flex flex-col gap-2">
          <Link href="/project/capstone" className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold px-5 py-3 rounded-lg text-xs shadow-sm transition-all flex items-center justify-center gap-2">
            <Trophy className="w-4 h-4" /> Begin Capstone Submission
          </Link>
          <p className="text-center text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
            Required for Final Certification
          </p>
        </div>
      </div>
    </div>
  );
}
