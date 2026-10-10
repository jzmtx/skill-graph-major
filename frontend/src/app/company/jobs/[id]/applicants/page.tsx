"use client";

import React, { useEffect, useState } from 'react';
import { getJobApplicants, updateApplicationStatus, getApplicationMessages, sendApplicationMessage, getApplicationAssessment, assignApplicationAssessment, updateAssessmentCompanyResult, deleteApplicationMessage } from '@/lib/companyApi';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User, FileText, Check, X, Star, Mail, Phone, GraduationCap, ShieldCheck, CheckCircle2, Sparkles, ExternalLink, Award, MessageSquare, Send, ClipboardList, Link as LinkIcon, Image as ImageIcon, Trash2 } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { useRef } from 'react';

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

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Assessment state
  const [assessmentData, setAssessmentData] = useState<any>(null);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [assmtLink, setAssmtLink] = useState('');
  const [assmtGuidelines, setAssmtGuidelines] = useState('');
  const [assmtResult, setAssmtResult] = useState('');
  const [submittingAssmt, setSubmittingAssmt] = useState(false);

  const fetchApplicants = async (authId: string) => {
    try {
      const data = await getJobApplicants(authId, jobId);
      if (data) {
        localStorage.setItem(`cached_applicants_${jobId}`, JSON.stringify(data));
      }
      setApplicants(data || []);
      
      setSelectedApplicant((prev: any) => {
        if (!prev && data && data.length > 0) return data[0];
        // If there is an existing selection, update it with fresh data
        if (prev && data) {
          const fresh = data.find((a: any) => a.id === prev.id);
          return fresh || prev;
        }
        return prev;
      });
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

    const cached = localStorage.getItem(`cached_applicants_${jobId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setApplicants(parsed);
        if (parsed.length > 0) {
          setSelectedApplicant(parsed[0]);
        }
        setLoading(false);
      } catch (e) {
        console.error(e);
      }
    }

    fetchApplicants(authId);
  }, [jobId, router]);

  useEffect(() => {
    if (selectedApplicant) {
      getApplicationAssessment(selectedApplicant.id)
        .then(data => setAssessmentData(data))
        .catch(() => setAssessmentData(null));
    } else {
      setAssessmentData(null);
    }
  }, [selectedApplicant]);

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

  const loadMessages = async (appId: string) => {
    setLoadingMsgs(true);
    try {
      const msgs = await getApplicationMessages(appId);
      setMessages(msgs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMsgs(false);
    }
  };

  const handleOpenChat = () => {
    if (!selectedApplicant) return;
    setChatOpen(true);
    loadMessages(selectedApplicant.id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplicant || !newMessage.trim()) return;
    setSendingMsg(true);
    try {
      const authId = localStorage.getItem('company_auth_id');
      await sendApplicationMessage(selectedApplicant.id, {
        sender_type: 'company',
        sender_id: authId || '',
        sender_name: 'Company Recruiter',
        message: newMessage.trim()
      });
      setNewMessage('');
      loadMessages(selectedApplicant.id);
    } catch (e) {
      console.error(e);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await deleteApplicationMessage(msgId);
      if (selectedApplicant) {
        loadMessages(selectedApplicant.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleInsertLink = () => {
    const url = prompt("Enter the link URL (e.g. https://github.com/...)");
    if (!url) return;
    const text = prompt("Enter the text to display for the link", "Click here") || "Link";
    setNewMessage(prev => prev + (prev.endsWith(' ') ? '' : ' ') + `[${text}](${url}) `);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/api/upload/file", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (data.url) {
        setNewMessage(prev => prev + (prev.endsWith(' ') ? '' : ' ') + `![Image](${data.url}) `);
      }
    } catch (error) {
      console.error("Image upload failed:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
            <h2 className="font-bold text-slate-800">Applicant Pipeline</h2>
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

              {/* Assessment Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-indigo-600" /> Custom Assessment
                  </h3>
                  {!assessmentData && (
                    <button onClick={() => setShowAssessmentModal(true)} className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                      Assign Assessment
                    </button>
                  )}
                </div>
                
                {assessmentData ? (
                  <div className="space-y-4 border-t border-slate-100 pt-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 font-medium">Link:</span>
                        <a href={assessmentData.assessment_link} target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold hover:underline">View Link</a>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 font-medium">Student Status:</span>
                        <span className={`font-bold px-2 py-1 rounded-md text-xs uppercase ${assessmentData.student_status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                          {assessmentData.student_status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      {assessmentData.company_result ? (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Result / Feedback</span>
                          <p className="text-sm font-semibold text-slate-800 mt-1">{assessmentData.company_result}</p>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Enter Result (e.g. Passed, Score: 85)" 
                            value={assmtResult} 
                            onChange={e => setAssmtResult(e.target.value)} 
                            className="flex-1 p-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                          />
                          <button 
                            disabled={!assmtResult.trim()}
                            onClick={async () => {
                              if(!assmtResult.trim()) return;
                              try {
                                const res = await updateAssessmentCompanyResult(selectedApplicant.id, assmtResult.trim());
                                setAssessmentData(res);
                                setAssmtResult('');
                              } catch(e) { console.error(e); }
                            }} 
                            className="px-5 py-3 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                          >
                            Save Result
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No assessment assigned to this candidate yet.</p>
                )}
              </div>

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
                <button
                  onClick={handleOpenChat}
                  className="flex-[0.5] flex items-center justify-center gap-2 py-3 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-bold hover:bg-indigo-100 transition-colors"
                >
                  <MessageSquare className="w-5 h-5" /> Chat
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

      {/* CHAT MODAL */}
      {chatOpen && selectedApplicant && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 shrink-0">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider mb-1">
                  <MessageSquare className="w-3 h-3" />
                  Applicant Chat
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {(selectedApplicant.student || selectedApplicant.students)?.name}
                </h3>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 rounded-2xl border border-slate-200 mb-4">
              {loadingMsgs ? (
                <div className="text-center py-12 text-slate-400 text-xs">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No messages yet. Send the first message to the candidate!
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender_type === 'company';
                  return (
                    <div key={msg.id} className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1 ml-1 mr-1">
                        {isMe && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-1"
                            title="Delete message"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                        <span className="text-[10px] text-slate-500 font-bold">
                          {msg.sender_name} ({msg.sender_type})
                        </span>
                      </div>
                      <div className={`px-4 py-2.5 rounded-2xl text-xs max-w-[80%] ${isMe ? 'bg-indigo-600 text-white rounded-br-sm prose prose-invert max-w-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm prose max-w-none'}`}>
                        <ReactMarkdown>
                          {msg.message}
                        </ReactMarkdown>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendMessage} className="shrink-0 flex flex-col gap-2">
              <div className="flex gap-2">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                <button
                  type="button"
                  onClick={handleInsertLink}
                  className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <LinkIcon className="w-3.5 h-3.5" /> Insert Link
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  <ImageIcon className="w-3.5 h-3.5" /> {uploadingImage ? 'Uploading...' : 'Post Image'}
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={sendingMsg || !newMessage.trim()}
                  className="px-5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN ASSESSMENT MODAL */}
      {showAssessmentModal && selectedApplicant && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-6 h-6 text-indigo-600" />
                Assign Assessment
              </h3>
              <button
                onClick={() => setShowAssessmentModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if(!assmtLink.trim()) return;
              setSubmittingAssmt(true);
              try {
                const res = await assignApplicationAssessment(selectedApplicant.id, {
                  assessment_link: assmtLink.trim(),
                  guidelines: assmtGuidelines.trim()
                });
                setAssessmentData(res);
                setShowAssessmentModal(false);
                setAssmtLink('');
                setAssmtGuidelines('');
              } catch(err) {
                console.error(err);
              } finally {
                setSubmittingAssmt(false);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Assessment Link *</label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/test"
                  value={assmtLink}
                  onChange={e => setAssmtLink(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Guidelines / Instructions</label>
                <textarea
                  rows={4}
                  placeholder="e.g. Please complete this within 48 hours. The test takes 30 mins."
                  value={assmtGuidelines}
                  onChange={e => setAssmtGuidelines(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={submittingAssmt || !assmtLink.trim()}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {submittingAssmt ? 'Assigning...' : 'Assign to Candidate'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}