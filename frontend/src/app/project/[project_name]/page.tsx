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
  const displayTitle = isCapstone ? "Industry Capstone Milestone" : `${decodedName} Project Verification`;

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
        setProjectIdea("Implement an end-to-end production architecture with modular components, data persistence, and verified testing suites.");
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
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 1500);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-white border border-stone-200 rounded-xl p-8 text-center shadow-sm"
        >
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-800" />
          </div>
          
          <h2 className="text-xl font-serif font-bold text-stone-900 mb-2">Project Repository Registered</h2>
          <p className="text-stone-600 text-xs leading-relaxed mb-6">
            Your codebase has been queued for automated architecture verification and code quality inspection.
          </p>
          
          <button 
            onClick={() => router.push("/dashboard/roadmap")}
            className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-semibold py-2.5 px-4 rounded-lg text-xs transition-colors shadow-2xs"
          >
            Return to Roadmap
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 p-4 md:p-8">
      <div className="max-w-3xl mx-auto mt-6">
        <Link href="/dashboard/roadmap" className="inline-flex items-center gap-1.5 text-stone-500 hover:text-stone-800 text-xs font-medium mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Roadmap
        </Link>
        
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-stone-900">{displayTitle}</h1>
          </div>
          <p className="text-stone-600 text-xs">
            Submit your GitHub repository for automated architectural review and Level 2 skill certification.
          </p>
        </div>

        {/* Assigned Project Requirements Section */}
        <div className="mb-6 bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <TerminalSquare className="w-4 h-4 text-emerald-800" /> Assigned Deliverable Specifications
          </h2>
          
          {isLoadingIdea ? (
            <div className="flex items-center gap-2 text-stone-500 text-xs py-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-800" /> Formulating project criteria...
            </div>
          ) : (
            <div className="text-stone-700 leading-relaxed text-xs">
              {projectIdea}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-stone-500" /> GitHub Repository URL *
            </label>
            <input 
              type="url" 
              required
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/username/project"
              className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-emerald-800 focus:bg-white transition-all placeholder:text-stone-400"
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-stone-500" /> Live Deployment URL (Optional)
            </label>
            <input 
              type="url" 
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
              placeholder="https://your-deployment.domain.com"
              className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-emerald-800 focus:bg-white transition-all placeholder:text-stone-400"
            />
          </div>
          
          <div className="pt-2 border-t border-stone-100">
            <button 
              type="submit"
              disabled={isSubmitting || !repoUrl}
              className="w-full flex items-center justify-center gap-2 font-semibold py-2.5 rounded-lg text-xs transition-all bg-emerald-800 hover:bg-emerald-900 text-white shadow-2xs disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Submit Repository for Review <UploadCloud className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
