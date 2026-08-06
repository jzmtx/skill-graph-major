"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getWorkspaceResources } from "@/lib/api";
import { BookOpen, PlayCircle, Code2, ArrowLeft, Loader2, Target, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const rawSkill = params.skill as string;
  const skillName = decodeURIComponent(rawSkill || "");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<number>(-1); // -1 = Main skill, 0+ = Sub-topic

  useEffect(() => {
    if (!skillName) return;
    setLoading(true);
    getWorkspaceResources(skillName)
      .then((res) => {
        setData(res.resources);
      })
      .catch((err) => {
        console.error("Workspace error:", err);
        setError("Failed to load workspace resources. Please try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [skillName]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-300">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-6" />
        <h2 className="text-2xl font-bold tracking-tight mb-2">Building Concept Tree...</h2>
        <p className="text-slate-400">Curating the absolute best resources for {skillName}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-2xl max-w-md text-center">
          <p className="font-bold mb-4">{error || "No resources found."}</p>
          <button 
            onClick={() => router.back()}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-semibold transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Build the array of concepts starting with the Main Concept
  const concepts = [
    {
      name: `Core ${skillName}`,
      official_docs_url: data.official_docs_url,
      best_video_url: data.best_video_url,
      best_video_title: data.best_video_title || `${skillName} Full Course`,
      practice_project: data.practice_project
    },
    ...(data.sub_topics || [])
  ];

  const activeConcept = concepts[activeTab === -1 ? 0 : activeTab + 1];

  return (
    <div className="max-w-6xl mx-auto py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => router.back()}
          className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500">
            {skillName} Workspace
          </h1>
          <p className="text-slate-400 mt-1">Master this technology step-by-step</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-3">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 px-2">Concept Tree</div>
          
          <button
            onClick={() => setActiveTab(-1)}
            className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-300 ${
              activeTab === -1 
                ? "bg-orange-500/20 border-orange-500/50 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.15)]" 
                : "bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:border-slate-600"
            }`}
          >
            <div className="font-bold">Core {skillName}</div>
          </button>

          {data.sub_topics && data.sub_topics.length > 0 && (
            <div className="pl-4 border-l-2 border-slate-800 space-y-2 mt-2">
              {data.sub_topics.map((sub: any, i: number) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                    activeTab === i 
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]" 
                      : "bg-slate-800/30 border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <div className="font-semibold text-sm line-clamp-2">{sub.name}</div>
                </button>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-8 space-y-3">
            <Link
              href={`/assessment/${encodeURIComponent(skillName)}`}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-95"
            >
              Take Assessment <Target className="w-4 h-4" />
            </Link>
            <Link
              href={`/project-verify/${encodeURIComponent(skillName)}`}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all border border-slate-700 active:scale-95 hover:border-orange-500/30"
            >
              Verify Project <CheckCircle2 className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-white mb-8">{activeConcept.name}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Video Card */}
              {activeConcept.best_video_url && (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 group hover:border-rose-500/30 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl">
                      <PlayCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">Video Tutorial</h3>
                      <p className="text-xs text-slate-400">Curated from YouTube</p>
                    </div>
                  </div>
                  <a 
                    href={activeConcept.best_video_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="block w-full py-2.5 text-center bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-rose-600/20"
                  >
                    Watch Now
                  </a>
                </div>
              )}

              {/* Docs Card */}
              {activeConcept.official_docs_url && (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 group hover:border-amber-500/30 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">Official Docs</h3>
                      <p className="text-xs text-slate-400">Trusted Reference</p>
                    </div>
                  </div>
                  <a 
                    href={activeConcept.official_docs_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="block w-full py-2.5 text-center bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-amber-600/20"
                  >
                    Read Docs
                  </a>
                </div>
              )}
            </div>

            {/* Practice Project */}
            {activeConcept.practice_project && (
              <div className="bg-gradient-to-br from-indigo-900/40 to-slate-800/40 border border-indigo-500/30 rounded-2xl p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl shrink-0 mt-1">
                    <Code2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-indigo-300 mb-2 uppercase tracking-widest text-xs">Practice Assignment</h3>
                    <p className="text-slate-200 text-lg leading-relaxed">
                      {activeConcept.practice_project}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
