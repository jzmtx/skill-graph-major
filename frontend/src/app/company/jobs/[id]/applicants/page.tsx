"use client";

import React, { useEffect, useState } from 'react';
import { getJobApplicants, updateApplicationStatus } from '@/lib/companyApi';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User, FileText, Check, X, Star, Mail, Phone, GraduationCap, ShieldCheck, CheckCircle2, Sparkles, ExternalLink, Award } from 'lucide-react';
import Link from 'next/link';

const GithubIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const LinkedinIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

export default function JobApplicantsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applicants, setApplicants] = useState<any[]>([]);
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null);

  const fetchApplicants = async (authId: string) => {
    try {
      const data = await getJobApplicants(authId, jobId);
      setApplicants(data || []);
      if (data && data.length > 0 && !selectedApplicant) {
        setSelectedApplicant(data[0]);
      }
    } catch {
      setError('Failed to load applicants for this job.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const authId = localStorage.getItem('company_auth_id');
    if (!authId) {
      router.push('/login');
      return;
    }
    fetchApplicants(authId);
  }, [jobId, router]);

  const handleStatusChange = async (appId: string, status: string) => {
    const authId = localStorage.getItem('company_auth_id');
    if (!authId) return;

    try {
      await updateApplicationStatus(authId, appId, status);
      // Optimistic update
      setApplicants(apps => apps.map(a => a.id === appId ? { ...a, status } : a));
      if (selectedApplicant && selectedApplicant.id === appId) {
        setSelectedApplicant({ ...selectedApplicant, status });
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading Pipeline...</div>;
  if (error) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col h-screen overflow-hidden">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <Link href="/company/dashboard" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="text-sm font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-md">
          {applicants.length} Total Applicants
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Applicant List */}
        <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-bold text-slate-800">Aplicant Pipeline</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {applicants.length === 0 ? (
              <p className="text-center text-sm text-slate-400 mt-10">No applicants yet.</p>
            ) : (
              applicants.map(app => (
                <button
                  key={app.id}
                  onClick={() => setSelectedApplicant(app)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${selectedApplicant?.id === app.id
                      ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                    }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800 truncate pr-2">{(app.student || app.students)?.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0 ${app.status === 'shortlisted' ? 'bg-amber-100 text-amber-700' :
                        app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          app.status === 'hired' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-slate-200 text-slate-600'
                      }`}>
                      {app.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2 truncate">{(app.student || app.students)?.email}</p>
                  <div className="flex items-center justify-between gap-1 text-xs">
                    {app.hireability ? (
                      <span className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        <Sparkles className="w-3 h-3 text-indigo-600" /> {app.hireability.score}
                      </span>
                    ) : (
                      <span className="text-slate-500">{(app.student || app.students)?.branch || 'N/A'}</span>
                    )}
                    <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-md font-bold text-xs">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{app.match_score}%</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Applicant Deep Dive */}
        <div className="w-2/3 bg-slate-50 flex flex-col h-full overflow-y-auto">
          {selectedApplicant ? (
            <div className="p-8 max-w-4xl mx-auto w-full space-y-6">
              {/* Profile Header */}
              {(() => {
                const stu = selectedApplicant.student || selectedApplicant.students || {};
                const skills = selectedApplicant.skills || [];
                const hireScore = selectedApplicant.hireability?.score || 300;
                const level2 = skills.filter((s: any) => s.verification_level >= 2);
                const level1 = skills.filter((s: any) => s.verification_level === 1);
                const level0 = skills.filter((s: any) => s.verification_level === 0);

                return (
                  <>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col md:flex-row justify-between items-start gap-6">
                      <div className="flex gap-5 items-start">
                        <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center shrink-0 text-3xl font-black text-indigo-600 shadow-sm">
                          {stu.name ? stu.name.charAt(0).toUpperCase() : "C"}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">{stu.name}</h2>
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {hireScore >= 750 ? "Elite Candidate" : hireScore >= 650 ? "High Competency" : "Verified Candidate"}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-slate-500 text-sm">
                            {stu.branch && <span>{stu.branch}</span>}
                            {stu.year && <span>• Year {stu.year}</span>}
                            {stu.usn && <span>• USN: {stu.usn}</span>}
                            {selectedApplicant.college_name && (
                              <span className="flex items-center gap-1 text-indigo-600 font-medium">
                                <GraduationCap className="w-4 h-4" /> {selectedApplicant.college_name}
                              </span>
                            )}
                          </div>

                          {/* Contact & Social Links */}
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            {stu.email && (
                              <a
                                href={`mailto:${stu.email}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-xs font-medium rounded-lg text-slate-700 transition-colors"
                              >
                                <Mail className="w-3.5 h-3.5" /> {stu.email}
                              </a>
                            )}
                            {stu.phone && (
                              <a
                                href={`tel:${stu.phone}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-xs font-medium rounded-lg text-slate-700 transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5" /> {stu.phone}
                              </a>
                            )}
                            {stu.github_url && (
                              <a
                                href={stu.github_url.startsWith('http') ? stu.github_url : `https://${stu.github_url}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-white transition-colors"
                              >
                                <GithubIcon className="w-3.5 h-3.5" /> GitHub <ExternalLink className="w-3 h-3 opacity-60" />
                              </a>
                            )}
                            {stu.linkedin_url && (
                              <a
                                href={stu.linkedin_url.startsWith('http') ? stu.linkedin_url : `https://${stu.linkedin_url}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-xs font-semibold rounded-lg text-white transition-colors"
                              >
                                <LinkedinIcon className="w-3.5 h-3.5" /> LinkedIn <ExternalLink className="w-3 h-3 opacity-60" />
                              </a>
                            )}
                            {selectedApplicant.resume_url && (
                              <a
                                href={selectedApplicant.resume_url}
                                target="_blank" rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5" /> View Resume
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Match Score Badge */}
                      <div className="text-center shrink-0 self-center md:self-start">
                        <div className="w-24 h-24 rounded-full border-8 border-green-100 flex items-center justify-center mb-1">
                          <span className="text-2xl font-black text-green-600">{selectedApplicant.match_score}%</span>
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">JD Match</span>
                      </div>
                    </div>

                    {/* Hireability & Verification Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Hireability Index */}
                      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Hireability Index
                          </span>
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            Score / 850
                          </span>
                        </div>
                        <div className="text-3xl font-black text-slate-900 my-1">{hireScore}</div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full"
                            style={{ width: `${Math.min(100, Math.max(10, ((hireScore - 300) / 550) * 100))}%` }}
                          />
                        </div>
                      </div>

                      {/* Verified Skills Summary */}
                      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verification Breakdown
                        </span>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between items-center text-slate-700">
                            <span className="font-semibold text-emerald-700">Level 2 (Project Architecture Verified):</span>
                            <span className="font-bold">{level2.length} Skills</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-700">
                            <span className="font-semibold text-indigo-700">Level 1 (Adaptive Assessment Passed):</span>
                            <span className="font-bold">{level1.length} Skills</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-500">
                            <span>Level 0 (Extracted/Self-Reported):</span>
                            <span>{level0.length} Skills</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Skills Matrix */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Award className="w-4 h-4 text-indigo-600" /> What The Candidate Has Done & Verified
                      </h3>

                      {level2.length > 0 && (
                        <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4">
                          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-700" /> Level 2: Project Architecture Verified
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {level2.map((s: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-white border border-emerald-200 rounded-lg text-xs">
                                <span className="font-bold text-slate-800">{s.skill_name}</span>
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                  {s.skill_score} pts
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {level1.length > 0 && (
                        <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-4">
                          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-800 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-indigo-700" /> Level 1: Adaptive Assessment Verified
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {level1.map((s: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-white border border-indigo-200 rounded-lg text-xs">
                                <span className="font-semibold text-slate-800">{s.skill_name}</span>
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                                  {s.skill_score} pts
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {level0.length > 0 && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                            Level 0: Extracted / Self-Reported
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {level0.map((s: any, idx: number) => (
                              <span key={idx} className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-600">
                                {s.skill_name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {skills.length === 0 && (
                        <p className="text-sm text-slate-400">No skills data available for this candidate.</p>
                      )}
                    </div>
                  </>
                );
              })()}

              {selectedApplicant.cover_letter && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Cover Letter</h3>
                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedApplicant.cover_letter}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex gap-4">
                <button
                  disabled={selectedApplicant.status === 'shortlisted'}
                  onClick={() => handleStatusChange(selectedApplicant.id, 'shortlisted')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-bold hover:bg-amber-100 disabled:opacity-50"
                >
                  <Check className="w-5 h-5" /> Shortlist Candidate
                </button>
                <button
                  disabled={selectedApplicant.status === 'hired'}
                  onClick={() => handleStatusChange(selectedApplicant.id, 'hired')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold hover:bg-emerald-100 disabled:opacity-50"
                >
                  <Star className="w-5 h-5" /> Hire
                </button>
                <button
                  disabled={selectedApplicant.status === 'rejected'}
                  onClick={() => handleStatusChange(selectedApplicant.id, 'rejected')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 text-red-700 border border-red-200 rounded-xl font-bold hover:bg-red-100 disabled:opacity-50"
                >
                  <X className="w-5 h-5" /> Reject
                </button>
              </div>

            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              Select a candidate from the pipeline to view their profile.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}