"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, PlayCircle, Target, CheckCircle2, ChevronDown, Sparkles, PowerOff, Star } from "lucide-react";
import Link from "next/link";

function NodeCardContent({ node, isCompact = false, index }: { node: any; isCompact?: boolean; index?: number }) {
  const phaseDisplay = node.tier || (index !== undefined ? index + 1 : "X");
  return (
    <div className="relative z-10 w-full flex flex-col h-full">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[10px] font-black tracking-widest uppercase shadow-md shadow-orange-500/30">
          Phase {phaseDisplay}
        </div>
        {node.demand_score !== undefined && (
          <div className="flex items-center gap-1 bg-amber-500/20 text-amber-300 px-2 py-1 rounded-full text-[10px] font-bold border border-amber-500/30 shadow-sm">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            {node.demand_score}% Demand
          </div>
        )}
      </div>

      <h2 className={`font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white to-amber-200 tracking-tight mb-2 group-hover:text-orange-50 transition-colors ${isCompact ? 'text-lg md:text-xl' : 'text-xl md:text-2xl'}`}>
        {node.skill}
      </h2>
      
      {node.topics && node.topics.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {node.topics.map((topic: any, i: number) => {
            const isObj = typeof topic === 'object' && topic !== null;
            const name = isObj ? topic.name : topic;
            const url = isObj ? topic.resource_url : null;
            
            if (url) {
              return (
                <a key={i} href={url} target="_blank" rel="noreferrer" className="px-2 py-0.5 bg-slate-800/80 border border-slate-700/80 rounded-md text-[10px] text-amber-200/80 font-bold tracking-wide uppercase shadow-sm hover:bg-slate-700 hover:text-amber-100 transition-colors">
                  {name}
                </a>
              );
            }
            return (
              <span key={i} className="px-2 py-0.5 bg-slate-800/80 border border-slate-700/80 rounded-md text-[10px] text-amber-200/80 font-bold tracking-wide uppercase shadow-sm">
                {name}
              </span>
            );
          })}
        </div>
      )}
      
      <p className={`text-slate-300/90 font-medium ${isCompact ? 'text-[11px] md:text-xs line-clamp-3 mb-4 flex-grow' : 'text-xs md:text-sm leading-relaxed mb-6'}`}>
        {node.why}
      </p>

      <div className={`grid grid-cols-2 gap-2 mb-4 ${isCompact ? 'mt-auto' : ''}`}>
        <a
          href={node.docs}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all shadow-sm group/btn hover:border-amber-500/30"
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-400 group-hover/btn:scale-110 transition-transform" />
          <span className="text-white text-xs font-semibold">Docs</span>
        </a>

        <a
          href={node.video}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all shadow-sm group/btn hover:border-rose-500/30"
        >
          <PlayCircle className="w-3.5 h-3.5 text-rose-400 group-hover/btn:scale-110 transition-transform" />
          <span className="text-white text-xs font-semibold">Video</span>
        </a>
      </div>

      <div className="flex flex-col gap-2 pt-4 border-t border-slate-800">
        <Link
          href={`/assessment/${encodeURIComponent(node.skill)}`}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-md hover:shadow-orange-500/25 active:scale-95 text-xs md:text-sm"
        >
          Take Assessment <Target className="w-3.5 h-3.5" />
        </Link>
        <Link
          href={`/project-verify/${encodeURIComponent(node.skill)}`}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl transition-all border border-slate-700 active:scale-95 hover:border-orange-500/30 text-xs md:text-sm"
        >
          Verify Project <CheckCircle2 className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default function RoadmapCanvas({ nodes }: { nodes: any[] }) {
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [activeChoices, setActiveChoices] = useState<Record<string, number>>({});

  const handleChoiceSelect = (nodeId: string, altIndex: number) => {
    setActiveChoices(prev => {
      // Toggle off if already selected, else set
      if (prev[nodeId] === altIndex) {
        const next = { ...prev };
        delete next[nodeId];
        return next;
      }
      return { ...prev, [nodeId]: altIndex };
    });
  };

  const getRenderableNodes = () => {
    let renderable: any[] = [];
    const traverse = (nodeList: any[], depth = 0) => {
      if (!nodeList) return;
      for (let i = 0; i < nodeList.length; i++) {
        const node = nodeList[i];
        renderable.push(node);
        
        if (node.type === "CHOICE" || (node.alternatives && node.alternatives.length > 0)) {
          const nodeId = node.id || `choice-${depth}-${i}`;
          // Also set the id on the node if it doesn't have one so we can reference it in rendering
          if (!node.id) node.id = nodeId; 
          
          const activeIndex = activeChoices[nodeId];
          if (activeIndex !== undefined) {
            const activeAlt = node.alternatives[activeIndex];
            if (activeAlt.children && activeAlt.children.length > 0) {
              traverse(activeAlt.children, depth + 1);
            }
          }
        }
      }
    };
    traverse(nodes);
    return renderable;
  };

  if (!nodes || nodes.length === 0) return null;
  
  const displayNodes = getRenderableNodes();

  return (
    <div className="relative w-full max-w-5xl mx-auto py-12 perspective-1000">
      
      {/* Animation Toggle */}
      <div className="flex justify-center mb-12">
        <button
          onClick={() => setAnimationsEnabled(!animationsEnabled)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold tracking-widest uppercase transition-all duration-300 ${
            animationsEnabled 
              ? "bg-orange-500/10 border-orange-500/30 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.15)]" 
              : "bg-slate-800/50 border-slate-700 text-slate-400"
          }`}
        >
          {animationsEnabled ? <Sparkles className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
          3D Travel: {animationsEnabled ? "ON" : "OFF"}
        </button>
      </div>

      {/* Scroll indicator */}
      {animationsEnabled && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 1, repeat: Infinity, repeatType: "reverse" }}
          className="flex flex-col items-center justify-center text-orange-400 mb-16"
        >
          <span className="text-sm font-bold uppercase tracking-widest mb-2">Scroll to Travel</span>
          <ChevronDown className="w-6 h-6" />
        </motion.div>
      )}

      {/* SVG Gradient Definitions */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="orangeGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" /> {/* amber-500 */}
            <stop offset="50%" stopColor="#f97316" /> {/* orange-500 */}
            <stop offset="100%" stopColor="#e11d48" /> {/* rose-600 */}
          </linearGradient>
        </defs>
      </svg>

      <div className="space-y-0">
        
        {/* START NODE */}
        <div className="relative flex items-center justify-center w-full pb-24 pt-12">
          {/* Connector down to the first real node */}
          <svg 
            viewBox="0 0 100 100" 
            preserveAspectRatio="none" 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 w-32 md:w-64 pointer-events-none z-0"
            style={{ height: "100%" }}
          >
            <path 
              d="M 50 0 C 100 30, 100 70, 50 100" 
              stroke="url(#orangeGlow)" 
              strokeWidth="6" 
              fill="none" 
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              style={{ filter: "drop-shadow(0 0 8px rgba(249,115,22,0.6))" }}
            />
          </svg>
          
          <motion.div 
            initial={animationsEnabled ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={animationsEnabled ? { type: "spring", stiffness: 300, damping: 20 } : { duration: 0 }}
            className="relative z-10 w-24 h-24 rounded-full bg-slate-900 border-[3px] border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.6)] flex items-center justify-center flex-col gap-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-rose-600/20 rounded-full animate-pulse" />
            <Target className="w-6 h-6 text-orange-400" />
            <span className="text-white font-black tracking-widest text-[10px] uppercase">Start</span>
          </motion.div>
        </div>

        {displayNodes.map((node, index) => {
          const isEven = index % 2 === 0;
          const isLast = index === displayNodes.length - 1;
          
          let effectiveNode = node;
          let isGroup = false;
          let groupType = "CHOICE";
          
          if (node.type === "CHOICE" || node.type === "PARALLEL" || (node.alternatives && node.alternatives.length > 0)) {
            if (node.alternatives && node.alternatives.length === 1) {
              effectiveNode = { ...node, ...node.alternatives[0], type: "SINGLE" };
            } else {
              isGroup = true;
              groupType = node.type === "PARALLEL" ? "PARALLEL" : "CHOICE";
            }
          }
          
          const nodeId = effectiveNode.id || `node-${index}`;

          return (
            <div key={effectiveNode.id || index} className="relative flex items-center justify-center w-full py-24">
              
              {/* Curvy Path Segment connecting to the NEXT node */}
              {!isLast && (
                <svg 
                  viewBox="0 0 100 100" 
                  preserveAspectRatio="none" 
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 w-32 md:w-64 pointer-events-none z-0"
                  style={{ height: "100%" }} 
                >
                  <motion.path 
                    initial={animationsEnabled ? { pathLength: 0, opacity: 0 } : { pathLength: 1, opacity: 1 }}
                    animate={!animationsEnabled ? { pathLength: 1, opacity: 1 } : undefined}
                    whileInView={animationsEnabled ? { pathLength: 1, opacity: 1 } : undefined}
                    viewport={animationsEnabled ? { once: false, amount: 0.1 } : undefined}
                    transition={animationsEnabled ? { duration: 1.5, ease: "easeInOut" } : { duration: 0 }}
                    d={`M 50 0 C ${isEven ? 100 : 0} 30, ${isEven ? 100 : 0} 70, 50 100`} 
                    stroke="url(#orangeGlow)" 
                    strokeWidth="6" 
                    fill="none" 
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    style={{ filter: "drop-shadow(0 0 8px rgba(249,115,22,0.6))" }}
                  />
                </svg>
              )}

              {/* Central connector dot */}
              <motion.div 
                initial={animationsEnabled ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
                animate={!animationsEnabled ? { scale: 1, opacity: 1 } : undefined}
                whileInView={animationsEnabled ? { scale: 1, opacity: 1 } : undefined}
                viewport={animationsEnabled ? { once: false, amount: 0.5 } : undefined}
                transition={animationsEnabled ? { type: "spring", stiffness: 300, damping: 20 } : { duration: 0 }}
                className="absolute left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-slate-900 border-4 border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.8)] z-20"
              />

              {isGroup ? (
                // GROUP NODE RENDER (CHOICE OR PARALLEL)
                <motion.div
                  initial={index === 0 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: 50 }}
                  animate={(!animationsEnabled || index === 0) ? { opacity: 1, scale: 1, y: 0 } : undefined}
                  whileInView={(animationsEnabled && index !== 0) ? { opacity: 1, scale: 1, y: 0 } : undefined}
                  viewport={(animationsEnabled && index !== 0) ? { once: false, margin: "-100px" } : undefined}
                  transition={animationsEnabled ? { type: "spring", stiffness: 80, damping: 15 } : { duration: 0 }}
                  className="relative w-full px-4 md:px-12 flex flex-col items-center z-10"
                >
                  <div className="text-orange-400 font-bold mb-6 bg-orange-950/50 px-6 py-2 rounded-full border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.2)] uppercase tracking-widest text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {groupType === "PARALLEL" ? "LEARN IN PARALLEL:" : "CHOOSE ONE:"} {effectiveNode.group_name || "Alternative Path"}
                  </div>
                  
                  <div className="flex flex-row flex-nowrap md:flex-wrap gap-4 md:gap-6 w-full overflow-x-auto md:overflow-visible snap-x snap-mandatory justify-start md:justify-center pb-8 md:pb-0 hide-scrollbar">
                    {effectiveNode.alternatives.map((alt: any, altIndex: number) => {
                      const isActive = activeChoices[nodeId] === altIndex;
                      const hasChildren = alt.children && alt.children.length > 0;
                      return (
                        <div 
                          key={altIndex} 
                          onClick={() => hasChildren && handleChoiceSelect(nodeId, altIndex)}
                          className={`w-[80vw] md:w-[280px] shrink-0 snap-center flex flex-col backdrop-blur-xl border rounded-2xl p-4 md:p-5 shadow-xl transition-all duration-500 group relative overflow-hidden ${hasChildren ? 'cursor-pointer hover:scale-105' : ''} ${
                            isActive 
                              ? 'bg-orange-950/80 border-orange-500 shadow-[0_0_25px_rgba(249,115,22,0.4)]' 
                              : 'bg-slate-900/80 border-slate-700 hover:border-orange-500/50'
                          }`}
                        >
                          <div className={`absolute inset-0 bg-gradient-to-br from-amber-500/10 to-rose-500/10 transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                          <NodeCardContent node={alt} isCompact={true} index={index} />
                          
                          {hasChildren && (
                            <div className="w-full text-center mt-2 text-xs text-orange-400/80 font-bold uppercase tracking-widest group-hover:text-orange-400 transition-colors">
                              {isActive ? '▼ Hide Paths' : '▶ Expand Paths'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ) : (
                // SINGLE NODE RENDER
                <motion.div
                  initial={index === 0 ? { opacity: 1, scale: 1, y: 0, z: 0, rotateX: 0 } : { opacity: 0, scale: 0.3, y: 150, z: -300, rotateX: 20 }}
                  animate={(!animationsEnabled || index === 0) ? { opacity: 1, scale: 1, y: 0, z: 0, rotateX: 0 } : undefined}
                  whileInView={(animationsEnabled && index !== 0) ? { opacity: 1, scale: 1, y: 0, z: 0, rotateX: 0 } : undefined}
                  viewport={(animationsEnabled && index !== 0) ? { once: false, margin: "-100px" } : undefined}
                  transition={animationsEnabled ? { type: "spring", stiffness: 80, damping: 15, mass: 1.2 } : { duration: 0 }}
                  className={`relative w-[85%] md:w-[45%] flex flex-col z-10 ${
                    isEven ? "mr-auto pr-8 md:pr-12" : "ml-auto pl-8 md:pl-12"
                  }`}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* Horizontal connection line to trunk */}
                  <div className={`hidden md:block absolute top-1/2 -translate-y-1/2 w-12 h-1 bg-gradient-to-r ${
                    isEven ? "right-0 from-transparent to-orange-400" : "left-0 from-orange-400 to-transparent"
                  } shadow-[0_0_10px_rgba(249,115,22,0.4)]`} />

                  <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 hover:border-orange-500/50 rounded-2xl p-6 shadow-xl transition-colors duration-500 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <NodeCardContent node={effectiveNode} index={index} />
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
      
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
