"use client";

import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Target, 
  Zap, 
  Award, 
  Layers, 
  Calendar, 
  Briefcase, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  TrendingUp,
  BrainCircuit,
  Sliders,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GLIExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScore?: number;
}

export default function GLIExplanationModal({ isOpen, onClose, currentScore = 300 }: GLIExplanationModalProps) {
  const [activeTab, setActiveTab] = useState<'formula' | 'scale' | 'normalization' | 'ats'>('formula');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="bg-white border border-stone-200 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-stone-900"
        >
          {/* Header */}
          <div className="p-6 border-b border-stone-200 bg-stone-50 flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-800 via-orange-500 to-amber-500" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-base shadow-2xs">
                <Target className="w-5 h-5 text-emerald-100" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-stone-900 font-serif">
                    Global Learner Index (GLI) Architecture
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-800 border border-orange-200">
                    Institutional Standard
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Standardized mathematical employability algorithm, asymptotic scaling, and ATS matching engine.
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-stone-200 bg-white px-6 gap-2 overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => setActiveTab('formula')}
              className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'formula'
                  ? 'border-emerald-800 text-emerald-800 font-bold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Score Contribution Split
            </button>
            <button
              onClick={() => setActiveTab('scale')}
              className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'scale'
                  ? 'border-emerald-800 text-emerald-800 font-bold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Why 300 to 850 Scale?
            </button>
            <button
              onClick={() => setActiveTab('normalization')}
              className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'normalization'
                  ? 'border-emerald-800 text-emerald-800 font-bold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Asymptotic Normalization
            </button>
            <button
              onClick={() => setActiveTab('ats')}
              className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'ats'
                  ? 'border-emerald-800 text-emerald-800 font-bold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Company ATS Matching (JD)
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-6 text-xs leading-relaxed text-stone-700">
            
            {/* TAB 1: FORMULA & SCORE SPLIT */}
            {activeTab === 'formula' && (
              <div className="space-y-4">
                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-emerald-950 font-serif mb-1">
                    Mathematical Anatomy of Your Score
                  </h3>
                  <p className="text-emerald-900 text-xs leading-relaxed">
                    Unlike subjective resumes, your GLI rating is computed dynamically from audited code repositories, adaptive examinations, and multi-paradigm consistency.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-xs">1. Base Starting Score</span>
                      <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        300 pts
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-normal">
                      Every student begins with a standardized 300 foundational baseline upon entering the platform.
                    </p>
                  </div>

                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-xs">2. Level 1 Verification (MCQ)</span>
                      <span className="font-mono font-bold text-stone-800 bg-white px-2 py-0.5 rounded border border-stone-200">
                        Exam Score / 2
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-normal">
                      Score achieved on the 12-question adaptive test divided by 2 gives base competency points.
                    </p>
                  </div>

                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-xs">3. Level 2 Project Mastery</span>
                      <span className="font-mono font-bold text-orange-800 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                        +100 pts + 3x Multiplier
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-normal">
                      Passing the anti-plagiarism repo audit and oral defense grants +100 bonus pts and multiplies skill depth by 3x.
                    </p>
                  </div>

                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-xs">4. Cross-Stack Synergy</span>
                      <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        +15% to +30% Multiplier
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-normal">
                      Triggered when verified skills span complementary stacks (e.g. Frontend + Backend + Database/DevOps).
                    </p>
                  </div>

                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-xs">5. Consistency & Velocity</span>
                      <span className="font-mono font-bold text-stone-800 bg-white px-2 py-0.5 rounded border border-stone-200">
                        +10% to +20% Multiplier
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-normal">
                      Rewards candidates with zero unverified skills and continuous verification activity across 30+ days.
                    </p>
                  </div>

                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-xs">6. Proctoring Trust Metric</span>
                      <span className="font-mono font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        Integrity Penalty
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-normal">
                      Exceeding 3 proctoring flags (window switching, copy-paste, or screenshot attempts) applies an automatic trust deduction.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: WHY 300 TO 850 SCALE */}
            {activeTab === 'scale' && (
              <div className="space-y-4">
                <div className="bg-stone-100 rounded-xl p-4 border border-stone-200">
                  <h3 className="text-sm font-bold text-stone-900 font-serif mb-1">
                    Modeled After the Credit Score Framework (300 – 850)
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Just as credit scores measure financial reliability on a standardized 300–850 bracket, SkillGraph measures engineering hireability through verified competency depth.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-300 bg-emerald-50/70">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-emerald-800 text-white flex items-center justify-center font-bold text-xs">
                        750+
                      </div>
                      <div>
                        <div className="font-bold text-emerald-950 text-xs">Top-Tier Candidate (Elite Junior / Mid-Level)</div>
                        <div className="text-[11px] text-emerald-800">Multiple verified Level 2 projects, stack synergy, zero unverified skills.</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">Top 5%</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-stone-200 bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-stone-800 text-white flex items-center justify-center font-bold text-xs">
                        650+
                      </div>
                      <div>
                        <div className="font-bold text-stone-900 text-xs">Industry Ready (Production Ready)</div>
                        <div className="text-[11px] text-stone-600">At least one Level 2 project mastered and broad Level 1 coverage across stacks.</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-700 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">Top 25%</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50/60">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-amber-700 text-white flex items-center justify-center font-bold text-xs">
                        520+
                      </div>
                      <div>
                        <div className="font-bold text-amber-950 text-xs">Competitive (Internship Qualified)</div>
                        <div className="text-[11px] text-amber-800">Multiple Level 1 exam verifications with solid fundamentals.</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-white px-2 py-0.5 rounded border border-amber-200">Median</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-stone-200 bg-stone-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-stone-600 text-white flex items-center justify-center font-bold text-xs">
                        300
                      </div>
                      <div>
                        <div className="font-bold text-stone-800 text-xs">Foundational Baseline</div>
                        <div className="text-[11px] text-stone-500">Unverified declared skills awaiting algorithmic and project evaluation.</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 bg-white px-2 py-0.5 rounded border border-stone-200">Entry</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ASYMPTOTIC NORMALIZATION */}
            {activeTab === 'normalization' && (
              <div className="space-y-4">
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-stone-900 font-serif mb-1">
                    The Exponential Asymptotic Curve
                  </h3>
                  <p className="text-stone-600 text-xs leading-relaxed">
                    To guarantee that no student can game the system by taking dozens of easy tests, raw points pass through an exponential decay formula:
                  </p>
                  <div className="mt-3 p-3 bg-white rounded-lg border border-stone-200 font-mono text-center text-xs font-bold text-emerald-900">
                    Final Score = 300 + 550 × (1 - e^( -Raw Score / 1000 ))
                  </div>
                </div>

                <div className="space-y-2 text-xs text-stone-600">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-stone-900">Diminishing Marginal Returns:</strong> As your raw score increases, each additional point requires significantly more verified code depth. Moving from 300 to 500 is straightforward; pushing from 700 to 750 requires rigorous Level 2 masteries.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-stone-900">Asymptotic Ceiling (850):</strong> The mathematical limit mathematically guarantees nobody achieves a fake "100%", establishing credibility with elite engineering hiring managers.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-stone-900">Time Decay Protection:</strong> Fast-evolving technologies (e.g. Next.js, PyTorch) feature exponential half-lives to reward engineers who maintain live production skills.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: COMPANY ATS MATCHING (JD) */}
            {activeTab === 'ats' && (
              <div className="space-y-4">
                <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-orange-950 font-serif mb-1">
                    How Recruiters Rank Applicants by Job Description (JD)
                  </h3>
                  <p className="text-orange-900 text-xs leading-relaxed">
                    Traditional Applicant Tracking Systems (ATS) scan for resume keywords—which can easily be keyword-stuffed. SkillGraph evaluates verified competency depth directly against employer criteria.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                    <div className="font-bold text-stone-900 text-xs flex items-center justify-between">
                      <span>Step 1: Recruiter Posts Vacancy (JD)</span>
                      <span className="text-stone-500 font-mono text-[10px]">Competencies + Minimum Level</span>
                    </div>
                    <p className="text-[11px] text-stone-600">
                      Recruiters configure required technologies (e.g. React: Level 2, Python: Level 1) and optional desired skills.
                    </p>
                  </div>

                  <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                    <div className="font-bold text-stone-900 text-xs flex items-center justify-between">
                      <span>Step 2: Real-Time Competency Match Formula</span>
                      <span className="text-stone-500 font-mono text-[10px]">60% Depth + 40% GLI</span>
                    </div>
                    <div className="p-2 bg-white rounded border border-stone-200 font-mono text-[11px] text-center font-bold text-stone-800">
                      ATS Rank Score = (Skill Coverage % × 0.60) + (((GLI - 300) / 550) × 0.40 × 100)
                    </div>
                    <p className="text-[11px] text-stone-600">
                      60% of the applicant score is determined by matching verified Level 1/Level 2 competencies; 40% is derived from the candidate's Global Learner Index.
                    </p>
                  </div>

                  <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                    <div className="font-bold text-stone-900 text-xs flex items-center justify-between">
                      <span>Step 3: Automated Candidate Ranking Deck</span>
                      <span className="text-emerald-800 font-bold text-[10px]">Level 2 Candidates Filtered First</span>
                    </div>
                    <p className="text-[11px] text-stone-600">
                      Candidates with verified Level 2 mastery automatically rank at the very top of recruiter candidate pipelines, bypassing traditional resume screening completely.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-stone-600 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-800" />
              <span>Institutional Model: 300 – 850 pts</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
            >
              Close Architecture Breakdown
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
