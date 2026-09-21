"use client";

import React, { useState, use, useEffect } from "react";
import { motion } from "framer-motion";
import { Globe, UploadCloud, CheckCircle2, ChevronLeft, ShieldCheck, Code2, GitBranch, TerminalSquare, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProjectSubmissionPage({ params }: { params: Promise<{ project_name: string }> }) {
  const router = useRouter();
  const { project_name } = use(params);
  
  const [repoUrl, setRepoUrl] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [projectIdea, setProjectIdea] = useState<string | null>(null);
  const [isLoadingIdea, setIsLoadingIdea] = useState(true);

  const decodedName = decodeURIComponent(project_name);
  const isCapstone = decodedName.toLowerCase() === "capstone";
  const displayTitle = isCapstone ? "Industry Capstone Project" : `${decodedName} Verification`;

  useEffect(() => {
    async function fetchIdea() {
      try {
        const querySkill = isCapstone ? "Full Stack Architecture & Production" : decodedName;
        const res = await fetch("http://localhost:8000/api/assessment/project-idea", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skill_name: querySkill })
        });
        const data = await res.json();
        setProjectIdea(data.idea);
      } catch (e) {
        console.error("Failed to fetch project idea", e);
        setProjectIdea("Build a comprehensive, full-stack application that includes authentication, a database, and a complex domain logic feature.");
      } finally {
        setIsLoadingIdea(false);
      }
    }
    fetchIdea();
  }, [decodedName, isCapstone]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) return;
    
    setIsSubmitting(true);
    
    // Simulate backend processing for the presentation
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 2000);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-slate-900 border border-emerald-500/30 rounded-2xl p-8 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
          
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          
          <h2 className="text-2xl font-black text-white mb-2">Project Submitted!</h2>
          <p className="text-slate-400 mb-8">
            Your codebase is now being analyzed by our automated engineering agents. You will receive your architectural review and certification shortly.
          </p>
          
          <button 
            onClick={() => router.push("/dashboard/roadmap")}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl transition-colors border border-slate-700"
          >
            Return to Roadmap
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8">
      <div className="max-w-3xl mx-auto mt-12">
        <Link href="/dashboard/roadmap" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 font-medium mb-8 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Roadmap
        </Link>
        
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-xl shadow-lg ${isCapstone ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
              <UploadCloud className="w-6 h-6" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white">{displayTitle}</h1>
          </div>
          <p className="text-slate-400 text-lg">
            Submit your repository for automated AI code review and verification.
          </p>
        </div>

        {/* Dynamic Project Requirements Section */}
        <div className="mb-8 bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 md:p-8 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <TerminalSquare className="w-5 h-5 text-indigo-400" /> Your Assigned Project
          </h2>
          
          {isLoadingIdea ? (
            <div className="flex items-center gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" /> Generating custom requirements...
            </div>
          ) : (
            <div className="text-slate-300 leading-relaxed text-sm md:text-base">
              {projectIdea}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                    <GitBranch className="w-4 h-4" /> GitHub Repository URL *
                  </label>
                  <input 
                    type="url" 
                    required
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/username/project"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Live Deployment URL (Optional)
                  </label>
                  <input 
                    type="url" 
                    value={liveUrl}
                    onChange={(e) => setLiveUrl(e.target.value)}
                    placeholder="https://my-project.vercel.app"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-slate-800">
                <button 
                  type="submit"
                  disabled={isSubmitting || !repoUrl}
                  className={`w-full flex items-center justify-center gap-2 font-black py-4 rounded-xl transition-all ${
                    isSubmitting || !repoUrl 
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                      : isCapstone
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:-translate-y-0.5'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:-translate-y-0.5'
                  }`}
                >
                  {isSubmitting ? (
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full"
                    />
                  ) : (
                    <>Submit for Review <UploadCloud className="w-5 h-5" /></>
                  )}
                </button>
              </div>
            </form>
          </div>
          
          <div className="space-y-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
              <h3 className="font-bold text-white flex items-center gap-2 mb-4">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Evaluation Criteria
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Code2 className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-200">Code Quality</p>
                    <p className="text-xs text-slate-500 mt-0.5">Clean architecture, DRY principles, and proper error handling.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <GitBranch className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-200">Best Practices</p>
                    <p className="text-xs text-slate-500 mt-0.5">Correct usage of framework paradigms and security patterns.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
