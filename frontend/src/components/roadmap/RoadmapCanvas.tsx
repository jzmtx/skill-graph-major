"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, PlayCircle, Target, CheckCircle2, ChevronDown, ChevronRight, Lock } from "lucide-react";
import Link from "next/link";

function NodeCardContent({ node, index }: { node: any; index?: number }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="relative z-10 w-full flex flex-col h-full text-slate-200">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
            Node {index !== undefined ? index + 1 : "X"}
          </div>
          {node.estimated_days && (
            <div className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {node.estimated_days} Days
            </div>
          )}
        </div>
        {node.demand_score !== undefined && (
          <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
            {node.demand_score}% Demand
          </div>
        )}
      </div>

      <h2 className="font-bold text-lg md:text-xl text-white mb-2 tracking-tight">
        {node.skill}
      </h2>
      
      <p className="text-sm text-slate-400 mb-4 leading-relaxed">
        {node.why}
      </p>

      {/* Accordion Expand Trigger */}
      {((node.subskills && node.subskills.length > 0) || (node.labs && node.labs.length > 0) || node.mini_project) && (
        <button 
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-bold text-indigo-400 hover:text-indigo-300 mb-4 flex items-center gap-1 self-start transition-colors"
        >
          {expanded ? "Hide Details" : "Show Labs & Details"}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}

      {/* Expanded Enriched Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-800 pt-4 mb-4 flex flex-col gap-4 text-left"
          >
            {/* Subskills list */}
            {node.subskills && node.subskills.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Detailed Subskills:</h4>
                <div className="flex flex-wrap gap-1.5">
                  {node.subskills.map((sub: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-slate-800 border border-slate-700/60 rounded-md text-xs text-slate-300">
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Labs checklist */}
            {node.labs && node.labs.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">Hands-on Labs:</h4>
                <ul className="space-y-1.5">
                  {node.labs.map((lab: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      {lab}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Mini Project block */}
            {node.mini_project && (
              <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20 mb-2 inline-block">
                  Mini Project Challenge
                </span>
                <h5 className="font-bold text-sm text-white mb-1">{node.mini_project.title}</h5>
                <p className="text-xs text-slate-400 leading-relaxed">{node.mini_project.description}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-2">
        <Link
          href={`/dashboard/workspace/${encodeURIComponent(node.skill)}`}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded transition-colors text-sm"
        >
          <BookOpen className="w-4 h-4" />
          Enter Workspace
        </Link>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Link
            href={`/assessment/${encodeURIComponent(node.skill)}`}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium py-2 rounded transition-colors text-sm"
          >
            Assess <Target className="w-3.5 h-3.5" />
          </Link>
          <Link
            href={`/project-verify/${encodeURIComponent(node.skill)}`}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium py-2 rounded transition-colors text-sm"
          >
            Verify <CheckCircle2 className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RoadmapCanvas({ roadmapData }: { roadmapData: any }) {
  // Backwards compatibility: Wrap flat nodes in a single phase if necessary
  const rawPhases = roadmapData?.phases || (roadmapData?.nodes ? [{ phase_title: "Core Path", description: "Your main learning journey.", nodes: roadmapData.nodes }] : []);
  
  // Track which phase is expanded (Accordion state). Default to first phase.
  const [expandedPhaseIndex, setExpandedPhaseIndex] = useState<number>(0);
  const [activeChoices, setActiveChoices] = useState<Record<string, number>>({});

  const handleChoiceSelect = (nodeId: string, altIndex: number) => {
    setActiveChoices(prev => ({ ...prev, [nodeId]: altIndex }));
  };

  if (!rawPhases || rawPhases.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto py-8">
      <div className="flex flex-col gap-6">
        {rawPhases.map((phase: any, pIndex: number) => {
          const isExpanded = expandedPhaseIndex === pIndex;
          const isLocked = pIndex > expandedPhaseIndex; // Visual lock for future phases

          return (
            <div key={pIndex} className="w-full flex flex-col">
              
              {/* Phase Header (Accordion Toggle) */}
              <button 
                onClick={() => setExpandedPhaseIndex(pIndex)}
                className={`w-full flex items-center justify-between p-4 md:p-6 text-left border rounded-lg transition-all ${
                  isExpanded 
                    ? "bg-indigo-950/30 border-indigo-500/50 shadow-sm" 
                    : "bg-slate-900 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xl md:text-2xl font-bold text-white tracking-tight">
                      {phase.phase_title}
                    </span>
                    {isLocked && <Lock className="w-4 h-4 text-slate-500" />}
                  </div>
                  {phase.description && (
                    <span className="text-sm text-slate-400">{phase.description}</span>
                  )}
                </div>
                <div className={`text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                  <ChevronDown className="w-6 h-6" />
                </div>
              </button>

              {/* Phase Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-8 pb-4 pl-4 md:pl-12 flex flex-col relative">
                      {/* Vertical Connection Line */}
                      <div className="absolute top-0 bottom-0 left-8 md:left-16 w-0.5 bg-slate-800" />

                      {/* Phase Nodes */}
                      {phase.nodes?.map((node: any, nIndex: number) => {
                        let effectiveNode = node;
                        let isGroup = false;
                        let groupType = "CHOICE";
                        
                        if (node.type === "CHOICE" || node.type === "PARALLEL" || (node.alternatives && node.alternatives.length > 0)) {
                          if (!node.alternatives || node.alternatives.length === 0) {
                            effectiveNode = { ...node, type: "SINGLE" };
                          } else if (node.alternatives.length === 1) {
                            effectiveNode = { ...node, ...node.alternatives[0], type: "SINGLE" };
                          } else {
                            isGroup = true;
                            groupType = node.type === "PARALLEL" ? "PARALLEL" : "CHOICE";
                          }
                        }

                        const nodeId = effectiveNode.id || `p${pIndex}-n${nIndex}`;

                        return (
                          <div key={nodeId} className="relative flex items-start mb-12 w-full">
                            {/* Node Dot */}
                            <div className="absolute left-[-16px] md:left-[-16px] w-4 h-4 rounded-full bg-slate-900 border-2 border-indigo-500 z-10 mt-6" />
                            
                            <div className="w-full pl-8 pr-4">
                              {isGroup ? (
                                <div className="flex flex-col w-full">
                                  <div className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-3">
                                    {groupType === "PARALLEL" ? "LEARN IN PARALLEL" : "CHOOSE ONE PATH"}
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(effectiveNode.alternatives || []).map((alt: any, aIndex: number) => {
                                      const isActive = activeChoices[nodeId] === aIndex;
                                      return (
                                        <div 
                                          key={aIndex}
                                          onClick={() => handleChoiceSelect(nodeId, aIndex)}
                                          className={`cursor-pointer rounded-lg border p-5 transition-all ${
                                            isActive 
                                              ? "bg-slate-800/80 border-orange-500 shadow-sm" 
                                              : "bg-slate-900 border-slate-800 hover:border-slate-700"
                                          }`}
                                        >
                                          <NodeCardContent node={alt} index={nIndex} />
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full md:w-2/3 bg-slate-900 border border-slate-800 p-5 rounded-lg shadow-sm">
                                  <NodeCardContent node={effectiveNode} index={nIndex} />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Milestone Project for Phase (Repositioned to the END of the Phase) */}
                      {phase.milestone_project && (
                        <div className="relative mb-8 pl-8 pr-4">
                          <div className="absolute left-[-16px] md:left-[-16px] w-4 h-4 rounded-full bg-slate-900 border-2 border-emerald-500 z-10 mt-6" />
                          <div className="w-full md:w-2/3 bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-2xl shadow-lg relative overflow-hidden backdrop-blur-sm">
                            <div className="absolute -top-12 -right-12 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl"></div>
                            <div className="flex items-center gap-2 mb-3">
                              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950">
                                Phase Capstone Graduation Project
                              </span>
                            </div>
                            <h4 className="font-extrabold text-white text-lg mb-2 tracking-tight">{phase.milestone_project.title}</h4>
                            <p className="text-sm text-slate-400 mb-4 leading-relaxed">{phase.milestone_project.description}</p>
                            {phase.milestone_project.requirements && phase.milestone_project.requirements.length > 0 && (
                              <div className="border-t border-slate-800 pt-3">
                                <h5 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2">Build Requirements:</h5>
                                <ul className="space-y-1.5">
                                  {phase.milestone_project.requirements.map((req: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-400">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                      {req}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* 
================================================================================
LEGACY CODE BACKUP (The old heavy 3D Roadmap Canvas)
================================================================================

// Preserved old code in case we need to rollback to the heavy 3D gaming theme.
// The old structure expected { nodes: any[] } and had a continuous curvy SVG.

*/
