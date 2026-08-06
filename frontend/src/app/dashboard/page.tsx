"use client";

import { useEffect, useState } from 'react';
import { ArrowRight, Lock, Target, TrendingUp, Briefcase, CodeXml, ShieldAlert, Terminal, CheckCircle2, Plus, RefreshCcw, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { extractGithubSkills, getMySkills, addSkill } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import HireabilityScore from '@/components/dashboard/HireabilityScore';

export default function DashboardPage() {
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [addingSkill, setAddingSkill] = useState(false);
  const [customSkill, setCustomSkill] = useState("");
  
  const hasVerifiedSkills = skills.some(s => s.verification_level > 0);

  const fetchSkills = async () => {
    try {
      const studentId = localStorage.getItem('student_id');
      if (!studentId) return;

      setSyncing(true);
      const mySkills = await getMySkills(studentId);
      
      if (mySkills) {
        localStorage.setItem('cached_skills', JSON.stringify(mySkills));
        setSkills(mySkills);
      }
    } catch (error) {
      console.error("Failed to sync skills:", error);
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  const handleAddSkill = async () => {
    if (!customSkill.trim()) return;
    
    const studentId = localStorage.getItem('student_id');
    if (!studentId) return;

    setAddingSkill(true);
    try {
      await addSkill({ student_id: studentId, skill_name: customSkill.trim() });
      setCustomSkill("");
      // Sync immediately to show the new skill
      await fetchSkills();
    } catch (e) {
      console.error("Failed to add skill", e);
    } finally {
      setAddingSkill(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const studentId = localStorage.getItem('student_id');
        const githubUrl = localStorage.getItem('student_github');
        
        // Optimistic UI: Load from cache instantly to prevent flicker
        const cached = localStorage.getItem('cached_skills');
        if (cached) {
          setSkills(JSON.parse(cached));
          setLoading(false);
        }
        
        if (!studentId) {
          setLoading(false);
          return;
        }

        // 1. Trigger extraction in background if they have github
        if (githubUrl) {
          try {
            await extractGithubSkills(studentId, githubUrl);
          } catch (e) {
            console.error("Extraction failed or already done");
          }
        }

        // 2. Sync all skills
        await fetchSkills();
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };

    init();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome to your Dashboard</h1>
          <p className="text-slate-500 mt-1">Let's map out your journey from campus to top-tier placements.</p>
        </div>
      </div>

      {/* Hireability 3D Score Widget */}
      <HireabilityScore />

      {/* Extracted Skills Section */}
      {!loading && skills.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CodeXml className="w-5 h-5 text-slate-700" />
              <h3 className="text-lg font-semibold text-slate-800">Your Skills</h3>
            </div>
            {syncing && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                Syncing...
              </div>
            )}
          </div>
          <p className="text-sm text-slate-500 mb-4">Verify your skills by taking adaptive assessments to boost your Global Learner Index.</p>
          <motion.div layout className="flex flex-wrap gap-3">
            <AnimatePresence>
              {skills.map(s => {
                const isLevel0 = s.verification_level === 0;
                const isLevel1 = s.verification_level === 1;
                const isLevel2 = s.verification_level >= 2;

                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    key={s.id} 
                    className={`flex items-center border rounded-lg px-4 py-2 gap-3 group transition-colors ${
                      isLevel2 ? 'bg-emerald-50 border-emerald-200' :
                      isLevel1 ? 'bg-indigo-50 border-indigo-200' :
                      'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800">{s.skill_name}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      isLevel2 ? 'text-emerald-600' :
                      isLevel1 ? 'text-indigo-600' :
                      'text-slate-500'
                    }`}>
                      Level {s.verification_level} {isLevel2 && "Verified"}
                    </span>
                  </div>
                  
                  {isLevel0 && (
                    <Link href={`/assessment/${encodeURIComponent(s.skill_name)}`}>
                      <button className="text-xs bg-indigo-100 text-indigo-700 font-medium px-3 py-1.5 rounded-md hover:bg-indigo-600 hover:text-white transition-colors flex items-center gap-1 ml-2">
                        <ShieldAlert className="w-3 h-3" /> Upgrade to L1
                      </button>
                    </Link>
                  )}

                  {isLevel1 && (
                    <Link href={`/project-verify/${encodeURIComponent(s.skill_name)}`}>
                      <button className="text-xs bg-emerald-100 text-emerald-700 font-medium px-3 py-1.5 rounded-md hover:bg-emerald-600 hover:text-white transition-colors flex items-center gap-1 ml-2">
                        <Terminal className="w-3 h-3" /> Verify L2 Project
                      </button>
                    </Link>
                  )}
                  
                  {isLevel2 && (
                    <div className="ml-2 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-md flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> MAX
                    </div>
                  )}
                </motion.div>
              );
            })}
            </AnimatePresence>
          </motion.div>
        </div>
      )}

      {/* Manual Skill Addition Section */}
      {!loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Add a New Skill</h3>
            <p className="text-sm text-slate-500 mt-1">Want to prove your expertise in something else? Type it below and take the assessment immediately.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="e.g. Docker, AWS, React"
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSkill();
              }}
              className="flex-1 md:w-64 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button 
              onClick={handleAddSkill}
              disabled={!customSkill.trim() || addingSkill}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                customSkill.trim() && !addingSkill
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {addingSkill ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Skill
            </button>
          </div>
        </div>
      )}

      {/* Action Required Banner - Only show if NO verified skills */}
      {!loading && !hasVerifiedSkills && (
        <>
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 md:p-8 text-white shadow-xl shadow-indigo-900/20 relative overflow-hidden group mt-8">
            <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
              <Target className="w-64 h-64" />
            </div>
            
            <div className="relative z-10 max-w-2xl">
              <span className="inline-block px-3 py-1 bg-amber-400 text-amber-950 text-xs font-bold rounded-full mb-4 uppercase tracking-wider">
                Action Required
              </span>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Establish your Baseline Skills</h2>
              <p className="text-indigo-100 mb-6 text-lg">
                Before we can generate your personalized roadmap or match you with jobs, we need to know where you stand. Take a quick, adaptive assessment to unlock your profile.
              </p>
              {skills.length > 0 ? (
                <Link href={`/assessment/${encodeURIComponent(skills[0].skill_name)}`}>
                  <button className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-xl font-medium transition-all group-hover:shadow-lg shadow-emerald-500/30">
                    <span>Assess {skills[0].skill_name}</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
              ) : (
                <button disabled className="flex items-center space-x-2 bg-slate-500 text-white px-6 py-3 rounded-xl font-medium opacity-50 cursor-not-allowed">
                  <span>Add a skill above first</span>
                </button>
              )}
            </div>
          </div>

          {/* Locked Modules Grid */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">What unlocks next?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Roadmap Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 opacity-75 relative overflow-hidden">
                <div className="absolute top-4 right-4 text-slate-400"><Lock className="w-5 h-5" /></div>
                <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-slate-800 mb-2">Dynamic Roadmap</h4>
                <p className="text-sm text-slate-500">
                  A personalized step-by-step learning path tailored exactly to your baseline assessment and target career.
                </p>
              </div>

              {/* Skill Graph Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 opacity-75 relative overflow-hidden">
                <div className="absolute top-4 right-4 text-slate-400"><Lock className="w-5 h-5" /></div>
                <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center mb-4">
                  <Target className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-slate-800 mb-2">Verified Skill Graph</h4>
                <p className="text-sm text-slate-500">
                  Your overall Global Learner Index (GLI) and visual representation of your mastered skills.
                </p>
              </div>

              {/* Job Match Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 opacity-75 relative overflow-hidden">
                <div className="absolute top-4 right-4 text-slate-400"><Lock className="w-5 h-5" /></div>
                <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center mb-4">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-slate-800 mb-2">Company Matching</h4>
                <p className="text-sm text-slate-500">
                  Apply to verified jobs directly. Our Eligibility Engine will automatically match your skills to Job Descriptions.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
