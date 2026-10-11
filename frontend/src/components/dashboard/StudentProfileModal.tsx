"use client";

import React, { useState, useEffect } from 'react';
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
  Check,
  Briefcase,
  GitPullRequest,
  Code2,
  Building2,
  Sparkles,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { getStudentRecruiterProfile } from '@/lib/companyApi';

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

export interface OpenSourceProjectItem {
  id: string;
  title: string;
  description?: string;
  repo_url?: string;
  tech_stack?: string[] | string;
  role?: string;
  status?: string;
  applied_at?: string;
  team_name?: string;
}

export interface HiredJobItem {
  id?: string;
  job_id?: string;
  job_title: string;
  company_name: string;
  hired_at?: string;
  status?: string;
}

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
  open_source_projects?: {
    active_count: number;
    total_worked_count: number;
    active_projects: OpenSourceProjectItem[];
    completed_projects: OpenSourceProjectItem[];
  };
  hired_status?: {
    is_hired: boolean;
    hired_count: number;
    hired_jobs: HiredJobItem[];
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
  const [livePortfolio, setLivePortfolio] = useState<{
    open_source_projects?: StudentProfileData['open_source_projects'];
    hired_status?: StudentProfileData['hired_status'];
  } | null>(null);

  useEffect(() => {
    if (!data?.student?.id) return;
    // If not already supplied in data, fetch full portfolio on mount
    if (!data.open_source_projects || !data.hired_status) {
      getStudentRecruiterProfile(data.student.id)
        .then((res) => {
          if (res) {
            setLivePortfolio({
              open_source_projects: res.open_source_projects,
              hired_status: res.hired_status
            });
          }
        })
        .catch((err) => console.warn("Failed to fetch live recruiter dossier:", err));
    }
  }, [data?.student?.id, data?.open_source_projects, data?.hired_status]);

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

  // Use either preloaded or freshly fetched live portfolio data
  const osData = data.open_source_projects || livePortfolio?.open_source_projects || {
    active_count: 0,
    total_worked_count: 0,
    active_projects: [],
    completed_projects: []
  };

  const hiredData = data.hired_status || livePortfolio?.hired_status || {
    is_hired: false,
    hired_count: 0,
    hired_jobs: []
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-4xl overflow-hidden my-6 animate-in zoom-in-95 duration-200 text-stone-900 flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Classical Recruiter Dossier Header */}
        <div className="bg-gradient-to-r from-stone-100 via-stone-50 to-emerald-50/40 border-b border-stone-200 p-5 sm:p-7 relative shrink-0">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 flex items-center justify-center text-3xl font-serif font-bold text-white shadow-md shrink-0">
              {student.name ? student.name.charAt(0).toUpperCase() : "S"}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h2 className="text-xl sm:text-2xl font-bold font-serif text-stone-900 truncate">{student.name}</h2>
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${scoreTier.color}`}>
                  {scoreTier.label}
                </span>

                {/* Recruiter Immediate Placement Indicator */}
                {hiredData.is_hired ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    Currently Placed ({hiredData.hired_count} Offer{hiredData.hired_count > 1 ? 's' : ''})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-sky-50 text-sky-800 border border-sky-300 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                    Available For Immediate Hire
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-stone-600 text-xs sm:text-sm">
                {student.branch && <span className="font-medium text-stone-800">{student.branch}</span>}
                {student.year && <span>• Year {student.year}</span>}
                {student.usn && <span>• USN: {student.usn}</span>}
                {college_name && (
                  <span className="flex items-center gap-1 text-emerald-800 font-semibold">
                    <GraduationCap className="w-4 h-4" /> {college_name}
                  </span>
                )}
              </div>

              {/* Contact & Social Links */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {student.email && (
                  <a 
                    href={`mailto:${student.email}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-stone-100 text-xs font-medium rounded-lg text-stone-700 border border-stone-300 transition-colors shadow-2xs"
                  >
                    <Mail className="w-3.5 h-3.5 text-stone-500" /> {student.email}
                  </a>
                )}
                {student.phone && (
                  <a 
                    href={`tel:${student.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-stone-100 text-xs font-medium rounded-lg text-stone-700 border border-stone-300 transition-colors shadow-2xs"
                  >
                    <Phone className="w-3.5 h-3.5 text-stone-500" /> {student.phone}
                  </a>
                )}
                {student.github_url && (
                  <a 
                    href={student.github_url.startsWith('http') ? student.github_url : `https://${student.github_url}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-900 hover:bg-stone-800 text-xs font-semibold rounded-lg text-white transition-colors shadow-2xs"
                  >
                    <GithubIcon className="w-3.5 h-3.5" /> GitHub Profile <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                )}
                {student.linkedin_url && (
                  <a 
                    href={student.linkedin_url.startsWith('http') ? student.linkedin_url : `https://${student.linkedin_url}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0A66C2] hover:bg-[#004182] text-xs font-semibold rounded-lg text-white transition-colors shadow-2xs"
                  >
                    <LinkedinIcon className="w-3.5 h-3.5" /> LinkedIn <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 space-y-6 overflow-y-auto flex-1 bg-stone-50/40">
          
          {/* TOP RECRUITER SPOTLIGHT CARDS: OPEN SOURCE & HIRED JOBS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. OPEN SOURCE CAPSTONES SPOTLIGHT */}
            <div className="bg-white border border-purple-200 rounded-xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-indigo-600" />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <GitPullRequest className="w-4 h-4 text-purple-700" /> Open Source Engineering
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                    {osData.total_worked_count} Projects Worked
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-extrabold text-stone-900 font-serif">
                    {osData.active_count}
                  </span>
                  <span className="text-xs text-stone-600 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Currently Active & Contributing
                  </span>
                </div>

                <p className="text-[11px] text-stone-500 mb-3">
                  Verified real-world pull requests and collaborative open source codebases:
                </p>

                {osData.active_projects.length > 0 ? (
                  <div className="space-y-2">
                    {osData.active_projects.map((proj, idx) => (
                      <div key={idx} className="bg-purple-50/50 border border-purple-200/80 rounded-lg p-2.5 flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-stone-900 truncate flex items-center gap-1.5">
                            <Code2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            {proj.title}
                          </h4>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {proj.role || 'Contributor'}
                          </span>
                        </div>
                        {proj.repo_url && (
                          <a 
                            href={proj.repo_url.startsWith('http') ? proj.repo_url : `https://${proj.repo_url}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[10px] text-purple-700 hover:underline flex items-center gap-1 truncate"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" /> {proj.repo_url}
                          </a>
                        )}
                        {proj.tech_stack && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {(Array.isArray(proj.tech_stack) ? proj.tech_stack : [proj.tech_stack]).map((t, tidx) => (
                              <span key={tidx} className="text-[9px] font-mono px-1.5 py-0.2 bg-white text-stone-700 rounded border border-purple-200">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-stone-400 bg-stone-50 border border-dashed border-stone-200 rounded-lg p-3 text-center">
                    {osData.total_worked_count > 0 
                      ? `${osData.total_worked_count} completed project(s) on record; currently idle for new capstones.`
                      : "No public open source repositories tracked yet."}
                  </div>
                )}
              </div>
            </div>

            {/* 2. PLACEMENT & CURRENT HIRED JOBS SPOTLIGHT */}
            <div className={`border rounded-xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden ${
              hiredData.is_hired ? 'bg-emerald-50/40 border-emerald-300' : 'bg-white border-stone-200'
            }`}>
              <div className={`absolute top-0 left-0 right-0 h-1 ${
                hiredData.is_hired ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gradient-to-r from-sky-500 to-emerald-500'
              }`} />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    hiredData.is_hired ? 'text-emerald-900' : 'text-stone-700'
                  }`}>
                    <Briefcase className="w-4 h-4 text-emerald-800" /> Placement & Current Employment
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    hiredData.is_hired ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-stone-100 text-stone-700 border-stone-200'
                  }`}>
                    {hiredData.is_hired ? `${hiredData.hired_count} Hired Position(s)` : '0 Competing Offers'}
                  </span>
                </div>

                {hiredData.is_hired ? (
                  <>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-2xl font-extrabold text-emerald-950 font-serif">
                        Currently Hired
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 mb-3">
                      Candidate holds accepted job offers / active placements:
                    </p>
                    <div className="space-y-2">
                      {hiredData.hired_jobs.map((job, idx) => (
                        <div key={idx} className="bg-white border border-emerald-200 rounded-lg p-3 shadow-2xs">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              {job.company_name}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              HIRED
                            </span>
                          </div>
                          <p className="text-[11px] font-medium text-stone-700">{job.job_title}</p>
                          {job.hired_at && (
                            <span className="text-[10px] text-stone-400 mt-1 block">
                              Placed on: {new Date(job.hired_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-2xl font-extrabold text-stone-900 font-serif">
                        Available for Hire
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 mb-3 leading-relaxed">
                      Candidate has not accepted any other company job offers yet and is immediately eligible for hire, interview rounds, and direct placement.
                    </p>
                    <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-xs text-sky-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-sky-700 shrink-0" />
                      <span>Zero competing commitments. Ready for fast-track recruitment.</span>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>

          {/* Hireability Highlights & Verification Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Hireability Index Score */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col justify-between shadow-2xs">
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
            <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col justify-between shadow-2xs">
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
            <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col justify-between shadow-2xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-700" /> Application Match
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
                      <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-stone-100 text-stone-800 border border-stone-200">
                        {extraDetails.status}
                      </span>
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
                  Institutional Candidate Dossier
                </div>
              )}
              <div className="text-[11px] text-stone-500 font-medium font-mono">
                ID: {student.id?.slice(0, 8)}...
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
              <div className="bg-white border border-stone-200 rounded-xl p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
                  Level 0: Declared Skills
                </div>
                <div className="flex flex-wrap gap-2">
                  {level0Skills.map((s, idx) => (
                    <span 
                      key={idx} 
                      className="px-2.5 py-1 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-700"
                    >
                      {s.skill_name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-stone-100 border-t border-stone-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-stone-800 text-white font-semibold text-xs rounded-xl hover:bg-stone-900 transition-colors shadow-2xs"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
}
