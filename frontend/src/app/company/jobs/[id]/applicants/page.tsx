"use client";

import React, { useEffect, useState, useRef } from 'react';
import { getJobApplicants, updateApplicationStatus, getApplicationMessages, sendApplicationMessage, getApplicationAssessment, assignApplicationAssessment, updateAssessmentCompanyResult, deleteApplicationMessage } from '@/lib/companyApi';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User, FileText, Check, X, Star, Mail, Phone, GraduationCap, ShieldCheck, CheckCircle2, Sparkles, ExternalLink, Award, MessageSquare, Send, ClipboardList, Link as LinkIcon, Image as ImageIcon, Trash2 } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import CreativeChatConsole from '@/components/chat/CreativeChatConsole';

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
      if (data && typeof window !== 'undefined') {
        localStorage.setItem(`cached_applicants_${jobId}`, JSON.stringify(data));
      }
      setApplicants(data || []);
      
      setSelectedApplicant((prev: any) => {
        if (!prev && data && data.length > 0) return data[0];
        if (prev && data) {
          const fresh = data.find((a: any) => a.id === prev.id);
          return fresh || prev;
        }
        return prev;
      });
    } catch {
      setError('Failed to load candidate dossiers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const authId = typeof window !== 'undefined' ? localStorage.getItem('company_auth_id') : null;
    if (!authId) {
      router.push('/login');
      return;
    }

    const cached = typeof window !== 'undefined' ? localStorage.getItem(`cached_applicants_${jobId}`) : null;
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
        .then(res => setAssessmentData(res))
        .catch(() => setAssessmentData(null));
    }
  }, [selectedApplicant]);

  const handleStatusChange = async (appId: string, status: string) => {
    const authId = typeof window !== 'undefined' ? localStorage.getItem('company_auth_id') : null;
    if (!authId) return;

    try {
      await updateApplicationStatus(authId, appId, status);
      const updated = applicants.map(a => a.id === appId ? { ...a, status } : a);
      setApplicants(updated);
      if (selectedApplicant?.id === appId) {
        setSelectedApplicant({ ...selectedApplicant, status });
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(`cached_applicants_${jobId}`, JSON.stringify(updated));
      }
    } catch {
      alert("Failed to update applicant status.");
    }
  };

  const handleOpenChat = async () => {
    if (!selectedApplicant) return;
    setChatOpen(true);
    setLoadingMsgs(true);
    try {
      const msgs = await getApplicationMessages(selectedApplicant.id);
      setMessages(msgs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMsgs(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const companyId = typeof window !== 'undefined' ? localStorage.getItem('company_id') : null;
    if (!companyId || !selectedApplicant || !newMessage.trim()) return;

    setSendingMsg(true);
    try {
      await sendApplicationMessage(selectedApplicant.id, {
        sender_type: 'company',
        sender_id: companyId,
        sender_name: 'Recruiter',
        message: newMessage.trim()
      });
      setNewMessage('');
      const msgs = await getApplicationMessages(selectedApplicant.id);
      setMessages(msgs || []);
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
        const msgs = await getApplicationMessages(selectedApplicant.id);
        setMessages(msgs || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleInsertLink = () => {
    const url = prompt("Enter the link URL (e.g. https://meet.google.com/...)");
    if (!url) return;
    const text = prompt("Enter link description", "Join Meeting") || "Link";
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
      alert("Failed to upload image.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) return <div className="min-h-screen bg-stone-50 flex items-center justify-center text-xs text-stone-500">Loading candidate dossiers...</div>;
  if (error) return <div className="min-h-screen bg-stone-50 flex items-center justify-center text-xs text-red-700">{error}</div>;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col h-screen overflow-hidden">
      {/* Top Header */}
      <div className="bg-white border-b border-stone-200 px-6 py-3.5 flex items-center justify-between shrink-0 shadow-2xs">
        <Link href="/company/dashboard" className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <div className="text-xs font-bold text-stone-700 bg-stone-100 border border-stone-200 px-3 py-1 rounded-md">
          {applicants.length} Candidates in Pipeline
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Applicant List */}
        <div className="w-1/3 bg-white border-r border-stone-200 flex flex-col h-full overflow-hidden">
          <div className="p-3.5 border-b border-stone-200 bg-stone-50">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700">Candidates</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {applicants.length === 0 ? (
              <p className="text-center text-xs text-stone-400 mt-8">No applications submitted yet.</p>
            ) : (
              applicants.map(app => (
                <button
                  key={app.id}
                  onClick={() => setSelectedApplicant(app)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                    selectedApplicant?.id === app.id
                      ? 'border-emerald-800 bg-emerald-50 text-emerald-950 shadow-2xs ring-1 ring-emerald-800'
                      : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <h3 className="font-bold text-xs text-stone-900 truncate pr-2">{(app.student || app.students)?.name}</h3>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase shrink-0 border ${
                      app.status === 'shortlisted' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                      app.status === 'rejected' ? 'bg-stone-100 text-stone-600 border-stone-200' :
                      app.status === 'hired' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                      'bg-stone-100 text-stone-700 border-stone-200'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mb-2 truncate">{(app.student || app.students)?.email}</p>
                  <div className="flex items-center justify-between gap-1 text-xs">
                    {app.hireability ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-white border border-stone-200 px-2 py-0.5 rounded text-[11px]">
                        <Sparkles className="w-3 h-3 text-emerald-800" /> {app.hireability.score}
                      </span>
                    ) : (
                      <span className="text-stone-500 text-[11px]">{(app.student || app.students)?.branch || 'N/A'}</span>
                    )}
                    <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded text-[11px] font-bold">
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
        <div className="w-2/3 bg-stone-50 flex flex-col h-full overflow-y-auto">
          {selectedApplicant ? (
            <div className="p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6">
              {(() => {
                const stu = selectedApplicant.student || selectedApplicant.students || {};
                const skills = selectedApplicant.skills || [];
                const hireScore = selectedApplicant.hireability?.score || 300;
                const level2 = skills.filter((s: any) => s.verification_level === 2);
                const level1 = skills.filter((s: any) => s.verification_level === 1);
                const level0 = skills.filter((s: any) => s.verification_level === 0 || !s.verification_level);

                return (
                  <>
                    <div className="bg-white rounded-xl shadow-2xs border border-stone-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-stone-100 rounded-xl border border-stone-200 flex items-center justify-center shrink-0 text-xl font-bold text-stone-800">
                          {stu.name?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-xl font-serif font-bold text-stone-900">{stu.name}</h2>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-stone-100 text-stone-700 border-stone-200 uppercase">
                              {stu.branch || 'Undergraduate'} {stu.year ? `· Y${stu.year}` : ''}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-stone-600">
                            {selectedApplicant.college_name && (
                              <span className="flex items-center gap-1 text-stone-800 font-medium">
                                <GraduationCap className="w-3.5 h-3.5 text-stone-500" /> {selectedApplicant.college_name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5 text-stone-400" /> {stu.email}
                            </span>
                            {stu.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-stone-400" /> {stu.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {stu.github_url && (
                          <a href={stu.github_url.startsWith('http') ? stu.github_url : `https://${stu.github_url}`} target="_blank" rel="noreferrer" className="p-2 border border-stone-200 hover:bg-stone-50 rounded-lg text-stone-700">
                            <GithubIcon className="w-4 h-4" />
                          </a>
                        )}
                        {stu.linkedin_url && (
                          <a href={stu.linkedin_url.startsWith('http') ? stu.linkedin_url : `https://${stu.linkedin_url}`} target="_blank" rel="noreferrer" className="p-2 border border-stone-200 hover:bg-stone-50 rounded-lg text-stone-700">
                            <LinkedinIcon className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Hireability & Verification breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-xl shadow-2xs border border-stone-200 p-5 flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-800" /> Hireability Index
                          </span>
                          <span className="text-xs font-bold text-stone-700">Score / 850</span>
                        </div>
                        <div className="text-2xl font-bold text-stone-900 my-1">{hireScore}</div>
                        <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden mt-2">
                          <div
                            className="bg-emerald-800 h-full rounded-full"
                            style={{ width: `${Math.min(100, Math.max(10, ((hireScore - 300) / 550) * 100))}%` }}
                          />
                        </div>
                      </div>

                      <div className="bg-white rounded-xl shadow-2xs border border-stone-200 p-5 flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1 mb-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-800" /> Verification Breakdown
                        </span>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between items-center text-stone-700">
                            <span className="font-semibold text-emerald-800">Level 2 (Project Architecture Verified):</span>
                            <span className="font-bold">{level2.length} Skills</span>
                          </div>
                          <div className="flex justify-between items-center text-stone-700">
                            <span className="font-semibold text-stone-800">Level 1 (Adaptive Assessment Passed):</span>
                            <span className="font-bold">{level1.length} Skills</span>
                          </div>
                          <div className="flex justify-between items-center text-stone-500">
                            <span>Level 0 (Extracted/Self-Reported):</span>
                            <span>{level0.length} Skills</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Skills Matrix */}
                    <div className="bg-white rounded-xl shadow-2xs border border-stone-200 p-5 space-y-3">
                      <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-emerald-800" /> Verified Competencies
                      </h3>

                      {level2.length > 0 && (
                        <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-3">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 mb-2 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-800" /> Level 2: Project Architecture Verified
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {level2.map((s: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-1.5 px-2.5 py-0.5 bg-white border border-emerald-200 rounded text-xs">
                                <span className="font-semibold text-stone-800">{s.skill_name}</span>
                                <span className="text-[10px] font-bold px-1 rounded bg-emerald-100 text-emerald-800">
                                  {s.skill_score} pts
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {level1.length > 0 && (
                        <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-700 mb-2 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-stone-600" /> Level 1: Adaptive Assessment Verified
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {level1.map((s: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-1.5 px-2.5 py-0.5 bg-white border border-stone-200 rounded text-xs">
                                <span className="font-medium text-stone-800">{s.skill_name}</span>
                                <span className="text-[10px] font-bold px-1 rounded bg-stone-100 text-stone-700 border border-stone-200">
                                  {s.skill_score} pts
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {skills.length === 0 && (
                        <p className="text-xs text-stone-400">No skill records available for this candidate.</p>
                      )}
                    </div>
                  </>
                );
              })()}

              {selectedApplicant.cover_letter && (
                <div className="bg-white rounded-xl shadow-2xs border border-stone-200 p-5">
                  <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Statement of Interest</h3>
                  <p className="text-stone-700 text-xs leading-relaxed whitespace-pre-wrap">
                    {selectedApplicant.cover_letter}
                  </p>
                </div>
              )}

              {/* Assessment Section */}
              <div className="bg-white rounded-xl shadow-2xs border border-stone-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-emerald-800" /> Employer Technical Evaluation
                  </h3>
                  {!assessmentData && (
                    <button onClick={() => setShowAssessmentModal(true)} className="text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-md hover:bg-emerald-100 transition-colors">
                      Assign Evaluation
                    </button>
                  )}
                </div>
                
                {assessmentData ? (
                  <div className="space-y-3 border-t border-stone-100 pt-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500 font-medium">Link:</span>
                      <a href={assessmentData.assessment_link} target="_blank" rel="noreferrer" className="text-emerald-800 font-semibold hover:underline">Open Link</a>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500 font-medium">Candidate Status:</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase border ${assessmentData.student_status === 'completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-stone-100 text-stone-700 border-stone-200'}`}>
                        {assessmentData.student_status}
                      </span>
                    </div>
                    
                    <div className="mt-3">
                      {assessmentData.company_result ? (
                        <div className="bg-stone-50 p-3 rounded-lg border border-stone-200">
                          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Recorded Evaluation</span>
                          <p className="text-xs font-bold text-stone-800 mt-0.5">{assessmentData.company_result}</p>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Score or Result (e.g. Cleared / 92 pts)" 
                            value={assmtResult} 
                            onChange={e => setAssmtResult(e.target.value)} 
                            className="flex-1 p-2 bg-stone-50 text-xs border border-stone-300 rounded-lg outline-none focus:border-emerald-800 focus:bg-white" 
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
                            className="px-4 py-2 bg-emerald-800 text-white text-xs font-semibold rounded-lg hover:bg-emerald-900 disabled:opacity-50 transition-colors shadow-2xs"
                          >
                            Save
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-stone-400">No external evaluation assigned to this candidate.</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="bg-white rounded-xl shadow-2xs border border-stone-200 p-5 flex flex-wrap gap-2.5">
                <button
                  disabled={selectedApplicant.status === 'shortlisted'}
                  onClick={() => handleStatusChange(selectedApplicant.id, 'shortlisted')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold hover:bg-amber-100 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" /> Shortlist
                </button>
                <button
                  disabled={selectedApplicant.status === 'hired'}
                  onClick={() => handleStatusChange(selectedApplicant.id, 'hired')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-800 text-white rounded-lg text-xs font-semibold hover:bg-emerald-900 disabled:opacity-50 shadow-2xs"
                >
                  <Star className="w-4 h-4" /> Hire
                </button>
                <button
                  disabled={selectedApplicant.status === 'rejected'}
                  onClick={() => handleStatusChange(selectedApplicant.id, 'rejected')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-stone-100 text-stone-700 border border-stone-200 rounded-lg text-xs font-semibold hover:bg-stone-200 disabled:opacity-50"
                >
                  <X className="w-4 h-4" /> Decline
                </button>
                <button
                  onClick={handleOpenChat}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-800" /> Chat
                </button>
              </div>

            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-stone-400 text-xs">
              Select a candidate dossier from the pipeline.
            </div>
          )}
        </div>
      </div>

      {/* CREATIVE CANDIDATE CHAT CONSOLE */}
      <CreativeChatConsole
        isOpen={chatOpen && Boolean(selectedApplicant)}
        onClose={() => setChatOpen(false)}
        title={`Candidate: ${(selectedApplicant?.student || selectedApplicant?.students)?.name || 'Applicant'}`}
        subtitle={`Application Docket #${selectedApplicant?.id?.slice(0, 8)}`}
        recipientRole="Candidate Student"
        contextTag="Corporate Recruiting Stream"
        messages={messages}
        currentUserId={typeof window !== 'undefined' ? localStorage.getItem('company_id') : null}
        currentUserType="company"
        loading={loadingMsgs}
        sending={sendingMsg}
        customPrompts={[
          {
            label: "Technical Interview Invitation",
            category: "schedule",
            text: "We were impressed by your verified SkillGraph competencies and would like to schedule a 45-minute technical discussion."
          },
          {
            label: "Request Project Repository Links",
            category: "technical",
            text: "Could you provide direct public GitHub repository links for your production-grade capstone milestones?"
          },
          {
            label: "Technical Assessment Note",
            category: "inquiry",
            text: "Please note we have assigned a technical assessment through SkillGraph. Let us know if you have any questions."
          },
          {
            label: "Offer & Compensation Discussion",
            category: "milestone",
            text: "We are pleased with your evaluation results and would like to arrange a final discussion regarding offer terms."
          }
        ]}
        onSendMessage={async (msg) => {
          if (!selectedApplicant) return;
          const cId = typeof window !== 'undefined' ? localStorage.getItem('company_id') || '' : '';
          setSendingMsg(true);
          try {
            await sendApplicationMessage(selectedApplicant.id, {
              sender_type: 'company',
              sender_id: cId,
              sender_name: 'Recruiter',
              message: msg
            });
            const msgs = await getApplicationMessages(selectedApplicant.id);
            setMessages(msgs || []);
          } catch (e) {
            console.error(e);
          } finally {
            setSendingMsg(false);
          }
        }}
        onDeleteMessage={(id) => handleDeleteMessage(String(id))}
      />

      {/* ASSIGN ASSESSMENT MODAL */}
      {showAssessmentModal && selectedApplicant && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-emerald-800" />
                Assign Evaluation
              </h3>
              <button
                onClick={() => setShowAssessmentModal(false)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-md"
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
            }} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">Evaluation Link *</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={assmtLink}
                  onChange={e => setAssmtLink(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:border-emerald-800 focus:bg-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">Guidelines / Details</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Please complete within 48 hours."
                  value={assmtGuidelines}
                  onChange={e => setAssmtGuidelines(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:border-emerald-800 focus:bg-white outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={submittingAssmt || !assmtLink.trim()}
                className="w-full py-2.5 bg-emerald-800 text-white rounded-lg text-xs font-semibold hover:bg-emerald-900 transition-colors disabled:opacity-50 shadow-2xs"
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