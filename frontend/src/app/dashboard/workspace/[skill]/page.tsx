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
  const [activeTab, setActiveTab] = useState<number>(-1);
  const [displaySkillName, setDisplaySkillName] = useState(skillName);

  useEffect(() => {
    if (!rawSkill) return;
    
    let intervalId: NodeJS.Timeout;
    
    const fetchResources = async () => {
      try {
        const res = await getWorkspaceResources(rawSkill);
        
        if (res.status === "generating") {
          setLoading(true);
        } else {
          setData(res.resources);
          if (res.resources?.skill_name) {
            setDisplaySkillName(res.resources.skill_name);
          }
          setLoading(false);
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error("Workspace error:", err);
        setError("Failed to load workspace resources. Please try again.");
        setLoading(false);
        clearInterval(intervalId);
      }
    };
    
    fetchResources();
    intervalId = setInterval(fetchResources, 3000);
    return () => clearInterval(intervalId);
  }, [rawSkill]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-stone-600">
        <Loader2 className="w-10 h-10 text-emerald-800 animate-spin mb-4" />
        <h2 className="text-xl font-serif font-bold text-stone-900 mb-1">Curating Curriculum Resources...</h2>
        <p className="text-stone-500 text-xs">Fetching syllabus resources and practical materials for {displaySkillName}.</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-white border border-stone-200 p-6 rounded-xl max-w-md text-center shadow-sm">
          <p className="font-bold text-stone-800 text-sm mb-4">{error || "No resources found."}</p>
          <button 
            onClick={() => router.back()}
            className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 rounded-lg text-white text-xs font-semibold transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const concepts = [
    {
      name: `Core ${displaySkillName}`,
      official_docs_url: data.official_docs_url,
      best_video_url: data.best_video_url,
      best_video_title: data.best_video_title || `${displaySkillName} Full Course`,
      practice_project: data.practice_project
    },
    ...(data.sub_topics || [])
  ];

  const activeConcept = concepts[activeTab === -1 ? 0 : activeTab + 1];

  return (
    <div className="max-w-6xl mx-auto py-4">
      {/* Header */}
      <div className="flex items-center gap-3.5 mb-6">
        <button 
          onClick={() => router.back()}
          className="p-2 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg text-stone-600 transition-all shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">
            {displaySkillName} Study Workspace
          </h1>
          <p className="text-stone-500 text-xs mt-0.5">Structured documentation, video tutorials & lab assignments</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2 px-1">Concept Index</div>
          
          <button
            onClick={() => setActiveTab(-1)}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg border text-xs transition-all ${
              activeTab === -1 
                ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-2xs" 
                : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
            }`}
          >
            <div>Core {skillName}</div>
          </button>

          {data.sub_topics && data.sub_topics.length > 0 && (
            <div className="pl-3 border-l-2 border-stone-200 space-y-1.5 mt-1">
              {data.sub_topics.map((sub: any, i: number) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                    activeTab === i 
                      ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-2xs" 
                      : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  <div className="line-clamp-2">{sub.name}</div>
                </button>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-6 space-y-2">
            <Link
              href={`/assessment/${encodeURIComponent(skillName)}`}
              className="w-full flex items-center justify-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold py-2.5 rounded-lg text-xs transition-all shadow-2xs"
            >
              Take Assessment <Target className="w-3.5 h-3.5" />
            </Link>
            <Link
              href={`/project-verify/${encodeURIComponent(skillName)}`}
              className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-stone-50 text-stone-700 font-semibold py-2.5 rounded-lg text-xs transition-all border border-stone-300"
            >
              Verify Project <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800" />
            </Link>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm"
          >
            <h2 className="text-xl font-bold text-stone-900 mb-6">{activeConcept.name}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Video Card */}
              {activeConcept.best_video_url && (
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 flex flex-col justify-between">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="p-2 bg-stone-200/70 text-stone-700 rounded-lg">
                      <PlayCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-900 text-sm">Video Lecture</h3>
                      <p className="text-[11px] text-stone-500">Curated Video Walkthrough</p>
                    </div>
                  </div>
                  <a 
                    href={activeConcept.best_video_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="block w-full py-2 text-center bg-stone-800 hover:bg-stone-900 text-white font-semibold text-xs rounded-lg transition-colors shadow-2xs mt-2"
                  >
                    Watch Tutorial
                  </a>
                </div>
              )}

              {/* Docs Card */}
              {activeConcept.official_docs_url && (
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 flex flex-col justify-between">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-900 text-sm">Official Standards</h3>
                      <p className="text-[11px] text-stone-500">Authoritative Specification</p>
                    </div>
                  </div>
                  <a 
                    href={activeConcept.official_docs_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="block w-full py-2 text-center bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs rounded-lg transition-colors shadow-2xs mt-2"
                  >
                    Review Documentation
                  </a>
                </div>
              )}
            </div>

            {/* Practice Project */}
            {activeConcept.practice_project && (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 shrink-0 mt-0.5">
                    <Code2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-800 mb-1 uppercase tracking-wider text-[10px]">Practical Milestone Assignment</h3>
                    <p className="text-stone-700 text-xs leading-relaxed">
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
