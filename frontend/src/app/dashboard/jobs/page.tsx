"use client";

import React, { useEffect, useState, useRef } from 'react';
import { getAllJobs, getEligibleJobs, applyToJob, getAppliedJobs } from '@/lib/companyApi';
import { getOpportunitiesForStudent, expressInterest, getAlumniMessages, sendAlumniMessage, deleteAlumniMessage } from '@/lib/alumniApi';
import { Briefcase, Building2, CheckCircle2, Zap, X, GraduationCap, Users, ExternalLink, MessageSquare, Send, Link as LinkIcon, Image as ImageIcon, Trash2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import CreativeChatConsole from '@/components/chat/CreativeChatConsole';

export default function StudentJobsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'eligible' | 'alumni'>('eligible');
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [eligibleJobs, setEligibleJobs] = useState<any[]>([]);
  const [alumniOpportunities, setAlumniOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [applyingJob, setApplyingJob] = useState<any | null>(null);
  const [resumeUrl, setResumeUrl] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [appliedOpps, setAppliedOpps] = useState<Set<string>>(new Set());
  const [oppApplyingId, setOppApplyingId] = useState<string | null>(null);

  // Chat State
  const [chatOpp, setChatOpp] = useState<{opp_id: string, opp_title: string} | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
      if (!studentId) return;
      try {
        const [all, eligible, opps, applied] = await Promise.all([
          getAllJobs(),
          getEligibleJobs(studentId),
          getOpportunitiesForStudent(studentId).catch(() => []),
          getAppliedJobs(studentId).catch(() => [])
        ]);
        setAllJobs(all || []);
        setEligibleJobs(eligible || []);
        setAlumniOpportunities(opps || []);

        const interestedSet = new Set<string>();
        (opps || []).forEach((o: any) => {
          if (o.already_interested) interestedSet.add(o.id);
        });
        setAppliedOpps(interestedSet);

        const appliedSet = new Set<string>();
        (applied || []).forEach((a: any) => {
          appliedSet.add(a.job_id);
        });
        setAppliedJobs(appliedSet);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleApplyClick = (job: any) => {
    setApplyingJob(job);
    setResumeUrl('');
    setCoverLetter('');
    setSubmitError('');
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
    if (!studentId || !applyingJob) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      await applyToJob(applyingJob.id, {
        student_id: studentId,
        resume_url: resumeUrl,
        cover_letter: coverLetter
      });
      
      const updatedApplied = new Set(appliedJobs);
      updatedApplied.add(applyingJob.id);
      setAppliedJobs(updatedApplied);
      setApplyingJob(null);
    } catch (err: any) {
      setSubmitError(err.response?.data?.detail || 'Failed to submit application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderJobCard = (job: any, isEligibleTab: boolean) => {
    const isApplied = appliedJobs.has(job.id);
    
    return (
      <div key={job.id} className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm hover:border-emerald-700 transition-all relative overflow-hidden">
        {isEligibleTab && (
          <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-50 text-emerald-800 border-b border-l border-emerald-200 font-bold text-[11px] rounded-bl-lg flex items-center gap-1">
            <Zap className="w-3 h-3 fill-current" /> {job.match_score}% MATCH
          </div>
        )}
        
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-bold text-stone-900">{job.title}</h3>
            <div className="flex items-center gap-2 text-stone-500 mt-0.5 text-xs font-medium">
              <Building2 className="w-3.5 h-3.5" /> {job.companies?.name || 'Enterprise Employer'}
            </div>
          </div>
          <div className="mt-0.5">
            {isApplied ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Applied
              </span>
            ) : (
              <button
                onClick={() => handleApplyClick(job)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-800 text-white text-xs font-semibold rounded-lg hover:bg-emerald-900 transition-colors shadow-2xs"
              >
                <Briefcase className="w-3.5 h-3.5" /> Apply Now
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-stone-600 mb-5 line-clamp-2 leading-relaxed">{job.description}</p>

        <div>
          <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Required Competencies</h4>
          <div className="flex flex-wrap gap-1.5">
            {job.required_skills?.map((s: any, idx: number) => (
              <span key={idx} className="px-2.5 py-0.5 bg-stone-100 text-stone-700 text-xs font-medium rounded border border-stone-200">
                {s.skill_name}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const handleApplyOpportunity = async (opp: any) => {
    const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
    if (!studentId) return;

    setOppApplyingId(opp.id);
    try {
      await expressInterest(opp.id, studentId);
      setAppliedOpps(prev => new Set(prev).add(opp.id));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to express interest.');
    } finally {
      setOppApplyingId(null);
    }
  };

  const handleOpenChat = async (oppId: string, oppTitle: string) => {
    const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
    if (!studentId) return;
    setChatOpp({ opp_id: oppId, opp_title: oppTitle });
    setLoadingMsgs(true);
    try {
      const msgs = await getAlumniMessages(oppId, studentId);
      setMessages(msgs || []);
    } catch(e) {}
    setLoadingMsgs(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
    const studentName = typeof window !== 'undefined' ? localStorage.getItem('student_name') || 'Student' : 'Student';
    if (!studentId || !chatOpp || !newMessage.trim()) return;
    
    setSendingMsg(true);
    try {
      await sendAlumniMessage(chatOpp.opp_id, studentId, {
        sender_type: 'student',
        sender_id: studentId,
        sender_name: studentName,
        message: newMessage.trim()
      });
      setNewMessage('');
      const msgs = await getAlumniMessages(chatOpp.opp_id, studentId);
      setMessages(msgs || []);
    } catch(e) {}
    setSendingMsg(false);
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await deleteAlumniMessage(msgId);
      if (chatOpp) {
        const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
        if (studentId) {
          const msgs = await getAlumniMessages(chatOpp.opp_id, studentId);
          setMessages(msgs || []);
        }
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

  const renderOpportunityCard = (opp: any) => {
    const isApplied = appliedOpps.has(opp.id) || opp.already_interested;
    const isSubmittingThis = oppApplyingId === opp.id;

    const typeBadges: Record<string, { label: string; color: string }> = {
      referral: { label: "Alumni Referral", color: "bg-orange-50 text-orange-900 border-orange-200" },
      internship: { label: "Internship", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
      mentorship: { label: "Mentorship", color: "bg-amber-50 text-amber-900 border-amber-200" },
      job: { label: "Direct Role", color: "bg-emerald-100 text-emerald-900 border-emerald-300" },
      opensource: { label: "Open Source", color: "bg-stone-100 text-stone-800 border-stone-200" },
    };

    const typeInfo = typeBadges[opp.type] || { label: opp.type, color: "bg-stone-100 text-stone-800 border-stone-200" };

    return (
      <div key={opp.id} className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm hover:border-emerald-700 transition-all relative overflow-hidden">
        {opp.from_my_college && (
          <div className="absolute top-0 right-0 px-3 py-1 bg-orange-50 text-orange-900 border-b border-l border-orange-200 font-bold text-[11px] rounded-bl-lg flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-orange-700" /> From College Alumni
          </div>
        )}

        <div className="flex justify-between items-start mb-3">
          <div className="pr-16">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${typeInfo.color}`}>
                {typeInfo.label}
              </span>
            </div>
            <h3 className="text-lg font-bold text-stone-900">{opp.title}</h3>
            {opp.posted_by && (
              <div className="flex flex-wrap items-center gap-2 text-stone-600 mt-1 text-xs font-medium">
                <span className="flex items-center gap-1 text-stone-800 font-semibold">
                  <Users className="w-3.5 h-3.5 text-emerald-800" /> {opp.posted_by.name}
                </span>
                {opp.posted_by.current_company && (
                  <span>• {opp.posted_by.current_company}</span>
                )}
                {opp.posted_by.current_job_role && (
                  <span className="text-stone-500">({opp.posted_by.current_job_role})</span>
                )}
                {opp.posted_by.linkedin_url && (
                  <a 
                    href={opp.posted_by.linkedin_url.startsWith('http') ? opp.posted_by.linkedin_url : `https://${opp.posted_by.linkedin_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-[11px] text-emerald-800 hover:underline gap-0.5 ml-1"
                  >
                    LinkedIn <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="mt-1 shrink-0">
            {isApplied ? (
              <div className="flex gap-2 items-center">
                {opp.status === 'hired' ? (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Hired
                  </span>
                ) : opp.status === 'rejected' ? (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-semibold rounded-lg border border-red-200 shadow-2xs">
                    <X className="w-3.5 h-3.5" /> Closed
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 text-stone-700 text-xs font-semibold rounded-lg border border-stone-200 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Interested
                  </span>
                )}
                <button
                  onClick={() => handleOpenChat(opp.id, opp.title)}
                  className="px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-800" /> Chat
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleApplyOpportunity(opp)}
                disabled={isSubmittingThis}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-800 text-white text-xs font-semibold rounded-lg hover:bg-emerald-900 transition-colors shadow-2xs disabled:opacity-50"
              >
                {isSubmittingThis ? 'Submitting...' : 'Express Interest'}
              </button>
            )}
          </div>
        </div>

        {opp.description && (
          <p className="text-xs text-stone-600 mb-4 line-clamp-2 leading-relaxed">{opp.description}</p>
        )}

        <div className="flex items-center justify-between text-[11px] text-stone-500 pt-3 border-t border-stone-100">
          <span>Posted {new Date(opp.created_at).toLocaleDateString()}</span>
          {opp.interested_count > 0 && (
            <span>{opp.interested_count} students interested</span>
          )}
        </div>
      </div>
    );
  };

  const currentJobs = activeTab === 'eligible' ? eligibleJobs : allJobs;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight">Career Placement & Opportunities</h1>
          <p className="text-stone-500 text-xs mt-0.5">Explore positions matched directly against your verified skill profile.</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
        <button
          onClick={() => setActiveTab('eligible')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'eligible' 
              ? 'bg-emerald-800 text-white shadow-2xs' 
              : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
          }`}
        >
          Matched Roles ({eligibleJobs.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'all' 
              ? 'bg-emerald-800 text-white shadow-2xs' 
              : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
          }`}
        >
          All Postings ({allJobs.length})
        </button>
        <button
          onClick={() => setActiveTab('alumni')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'alumni' 
              ? 'bg-emerald-800 text-white shadow-2xs' 
              : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" /> Alumni Referrals ({alumniOpportunities.length})
        </button>
      </div>

      {/* Listing Content */}
      {activeTab === 'alumni' ? (
        alumniOpportunities.length === 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 p-12 text-center shadow-2xs">
            <GraduationCap className="w-8 h-8 text-stone-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-stone-800 mb-1">No Active Alumni Postings</h3>
            <p className="text-stone-500 text-xs">Alumni have not published any opportunities at the moment. Please revisit shortly.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alumniOpportunities.map(opp => renderOpportunityCard(opp))}
          </div>
        )
      ) : currentJobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center shadow-2xs">
          <Briefcase className="w-8 h-8 text-stone-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-stone-800 mb-1">No Matching Vacancies Found</h3>
          <p className="text-stone-500 text-xs max-w-sm mx-auto">
            {activeTab === 'eligible' 
              ? "No job vacancies currently match your verified skills. Continue milestone assessments to raise your match index." 
              : "No open positions currently available."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentJobs.map(job => renderJobCard(job, activeTab === 'eligible'))}
        </div>
      )}

      {/* Application Modal */}
      {applyingJob && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-stone-200 shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center bg-stone-50">
              <h2 className="text-sm font-bold text-stone-900">Application: {applyingJob.companies?.name}</h2>
              <button onClick={() => setApplyingJob(null)} className="p-1 text-stone-400 hover:text-stone-600 rounded-md transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleApplySubmit} className="p-6 space-y-4">
              <div>
                <h3 className="font-bold text-stone-900 text-sm mb-0.5">{applyingJob.title}</h3>
                <p className="text-xs text-stone-500">Submit your candidacy directly to the recruiting department.</p>
              </div>

              {submitError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                  {submitError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">Portfolio / Resume URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={resumeUrl}
                  onChange={(e) => setResumeUrl(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:border-emerald-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">Statement of Interest</label>
                <textarea
                  rows={4}
                  placeholder="Summarize your relevant project competencies..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:border-emerald-800 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setApplyingJob(null)}
                  className="px-4 py-2 border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold shadow-2xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Confirm Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Creative Alumni Chat Console */}
      <CreativeChatConsole
        isOpen={Boolean(chatOpp)}
        onClose={() => setChatOpp(null)}
        title={chatOpp?.opp_title || 'Alumni Conversation'}
        subtitle="Alumni Mentorship & Placement Direct Channel"
        recipientRole="Verified Alumni Advisor"
        contextTag="Mentorship Frequency"
        messages={messages}
        currentUserId={typeof window !== 'undefined' ? localStorage.getItem('student_id') : null}
        currentUserType="student"
        loading={loadingMsgs}
        sending={sendingMsg}
        onSendMessage={async (msg) => {
          if (!chatOpp) return;
          const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
          if (!studentId) return;
          setSendingMsg(true);
          try {
            await sendAlumniMessage(chatOpp.opp_id, studentId, {
              sender_type: 'student',
              message: msg,
              sender_name: 'Student'
            });
            const msgs = await getAlumniMessages(chatOpp.opp_id, studentId);
            setMessages(msgs || []);
          } catch (e) {
            console.error(e);
          } finally {
            setSendingMsg(false);
          }
        }}
        onDeleteMessage={(id) => handleDeleteMessage(String(id))}
      />
    </div>
  );
}