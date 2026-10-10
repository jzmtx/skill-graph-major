"use client";

import React from 'react';
import { 
  X, 
  ExternalLink, 
  Mail, 
  Phone, 
  GraduationCap, 
  Award, 
  ShieldCheck, 
  FileText, 
  Target,
  Zap,
  Check
} from 'lucide-react';

const GithubIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const LinkedinIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
  </svg>
);

export interface StudentProfileData {
  student: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    branch?: string;
    year?: number;
    usn?: string;
    github_url?: string;
    linkedin_url?: string;
    college_id?: string;
  };
  college_name?: string;
  skills: {
    id?: string;
    skill_name: string;
    verification_level: number;
    skill_score?: number;
    source?: string;
  }[];
  hireability?: {
    score: number;
    breakdown?: {
      base_depth?: number;
      decayed_depth?: number;
      synergy_multiplier?: number;
      project_bonus?: number;
      velocity_bonus?: number;
      consistency_multiplier?: number;
      raw_total?: number;
    };
  };
  extraDetails?: {
    resume_url?: string;
    cover_letter?: string;
    expressed_at?: string;
    match_score?: number;
    status?: string;
    opportunity_title?: string;
    opportunity_type?: string;
  };
}

interface Props {
  data: StudentProfileData | null;
  onClose: () => void;
}

export default function StudentProfileModal({ data, onClose }: Props) {
  if (!data) return null;

  const { student, college_name, skills = [], hireability, extraDetails } = data;

  const level2Skills = skills.filter(s => s.verification_level >= 2);
  const level1Skills = skills.filter(s => s.verification_level === 1);
  const level0Skills = skills.filter(s => s.verification_level === 0);

  const hireScore = hireability?.score || 300;
  const scoreTier = 
    hireScore >= 750 ? { label: "Top-Tier Candidate", color: "text-emerald-800 bg-emerald-50 border-emerald-300" } :
    hireScore >= 650 ? { label: "Industry Ready", color: "text-emerald-800 bg-stone-100 border-stone-300" } :
    hireScore >= 500 ? { label: "Competitive", color: "text-stone-800 bg-amber-50 border-amber-300" } :
    { label: "Foundational", color: "text-stone-700 bg-stone-100 border-stone-300" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-3xl overflow-hidden my-8 animate-in zoom-in-95 duration-200 text-stone-900"
        onClick={e => e.stopPropagation()}
      >
        {/* Classical Header (No Black, No Blue) */}
        <div className="bg-stone-100 border-b border-stone-200 p-6 sm:p-8 relative">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-18 h-18 rounded-xl bg-emerald-800 flex items-center justify-center text-2xl font-serif font-bold text-white shadow-xs shrink-0">
              {student.name ? student.name.charAt(0).toUpperCase() : "S"}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900 truncate">{student.name}</h2>
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${scoreTier.color}`}>
                  {scoreTier.label}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-stone-600 text-xs sm:text-sm">
                {student.branch && <span>{student.branch}</span>}
                {student.year && <span>• Year {student.year}</span>}
                {student.usn && <span>• USN: {student.usn}</span>}
                {college_name && (
                  <span className="flex items-center gap-1 text-emerald-800 font-medium">
                    <GraduationCap className="w-4 h-4" /> {college_name}
                  </span>
                )}
              </div>

              {/* Contact & Social Links */}
              <div className="flex flex-wrap items-center gap-2 mt-4">
                {student.email && (
                  <a 
                    href={`mailto:${student.email}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-stone-200 text-xs font-medium rounded-lg text-stone-700 border border-stone-300 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" /> {student.email}
                  </a>
                )}
                {student.phone && (
                  <a 
                    href={`tel:${student.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-stone-200 text-xs font-medium rounded-lg text-stone-700 border border-stone-300 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" /> {student.phone}
                  </a>
                )}
                {student.github_url && (
                  <a 
                    href={student.github_url.startsWith('http') ? student.github_url : `https://${student.github_url}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-200 hover:bg-stone-300 text-xs font-semibold rounded-lg text-stone-800 border border-stone-300 transition-colors"
                  >
                    <GithubIcon className="w-3.5 h-3.5" /> GitHub <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                )}
                {student.linkedin_url && (
                  <a 
                    href={student.linkedin_url.startsWith('http') ? student.linkedin_url : `https://${student.linkedin_url}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-200 hover:bg-stone-300 text-xs font-semibold rounded-lg text-stone-800 border border-stone-300 transition-colors"
                  >
                    <LinkedinIcon className="w-3.5 h-3.5" /> LinkedIn <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[calc(85vh-200px)] overflow-y-auto">
          {/* Hireability Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Hireability Index Score */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-800" /> Hireability Index
              </span>
              <div className="my-2">
                <div className="text-3xl font-extrabold text-stone-900 font-serif">{hireScore}</div>
                <div className="text-[11px] text-stone-500 font-medium">Standard 300 to 850 Rating</div>
              </div>
              <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-800 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(10, ((hireScore - 300) / 550) * 100))}%` }}
                />
              </div>
            </div>

            {/* Verification Stats */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-800" /> Verification Breakdown
              </span>
              <div className="my-2 space-y-1 text-xs">
                <div className="flex justify-between items-center text-stone-700">
                  <span className="font-semibold text-emerald-800">Level 2 (Projects):</span>
                  <span className="font-bold">{level2Skills.length} Verified</span>
                </div>
                <div className="flex justify-between items-center text-stone-700">
                  <span className="font-semibold text-stone-800">Level 1 (Assessments):</span>
                  <span className="font-bold">{level1Skills.length} Verified</span>
                </div>
                <div className="flex justify-between items-center text-stone-500">
                  <span>Level 0 (Declared):</span>
                  <span>{level0Skills.length} Listed</span>
                </div>
              </div>
              <div className="text-[11px] text-stone-500 font-medium">
                Total Skills Tracked: {skills.length}
              </div>
            </div>

            {/* Application / Match Details if available */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-700" /> Application Details
              </span>
              {extraDetails ? (
                <div className="my-2 space-y-1 text-xs">
                  {extraDetails.match_score !== undefined && (
                    <div className="flex justify-between items-center text-stone-700">
                      <span className="font-medium">JD Match:</span>
                      <span className="font-bold text-emerald-800">{extraDetails.match_score}%</span>
                    </div>
                  )}
                  {extraDetails.status && (
                    <div className="flex justify-between items-center text-stone-700">
                      <span className="font-medium">Status:</span>
                      <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-stone-200 text-stone-800">
                        {extraDetails.status}
                      </span>
                    </div>
                  )}
                  {extraDetails.expressed_at && (
                    <div className="text-[11px] text-stone-500 truncate">
                      Applied: {new Date(extraDetails.expressed_at).toLocaleDateString()}
                    </div>
                  )}
                  {extraDetails.resume_url && (
                    <div className="pt-1">
                      <a 
                        href={extraDetails.resume_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-800 font-bold hover:underline text-xs"
                      >
                        <FileText className="w-3.5 h-3.5" /> View Submitted Resume
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="my-auto text-xs text-stone-600">
                  General Verified Profile
                </div>
              )}
              <div className="text-[11px] text-stone-500 font-medium font-mono">
                ID: {student.id.slice(0, 8)}...
              </div>
            </div>
          </div>

          {/* Full Skills Matrix */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-800" />
              Verified Competencies & Accomplishments
            </h3>

            {/* Level 2: Project Architecture Verified */}
            {level2Skills.length > 0 && (
              <div className="bg-emerald-50/50 border border-emerald-300 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-800" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    Level 2: Project Architecture Verified (+100 Bonus Pts)
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {level2Skills.map((s, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg shadow-2xs"
                    >
                      <span className="font-bold text-stone-900 text-xs font-serif">{s.skill_name}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                        {s.skill_score} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Level 1: Adaptive Assessment Passed */}
            {level1Skills.length > 0 && (
              <div className="bg-stone-100 border border-stone-300 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="w-4 h-4 text-stone-800" />
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-900">
                    Level 1: Adaptive Assessment Verified (Score &gt;= 60%)
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {level1Skills.map((s, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-300 rounded-lg shadow-2xs"
                    >
                      <span className="font-semibold text-stone-800 text-xs font-serif">{s.skill_name}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-200 text-stone-800 font-mono">
                        {s.skill_score} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Level 0: Declared */}
            {level0Skills.length > 0 && (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
                  Level 0: Declared Skills
                </div>
                <div className="flex flex-wrap gap-2">
                  {level0Skills.map((s, idx) => (
                    <span 
                      key={idx} 
                      className="px-2.5 py-1 bg-white border border-stone-200 rounded-lg text-xs font-medium text-stone-700"
                    >
                      {s.skill_name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer (No Black) */}
        <div className="p-4 sm:p-6 bg-stone-100 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-stone-800 text-white font-semibold text-xs rounded-xl hover:bg-stone-900 transition-colors shadow-2xs"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}
