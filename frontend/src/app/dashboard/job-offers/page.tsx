"use client";

import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { getAppliedJobs, getApplicationMessages, sendApplicationMessage, getApplicationAssessment, updateAssessmentStudentStatus, deleteApplicationMessage } from '@/lib/companyApi';
import { getStudentApplications, getOpenSourceApplicationMessages, sendOpenSourceApplicationMessage, deleteOpenSourceApplicationMessage } from '@/lib/opensourceApi';
import { getOpportunitiesForStudent, getAlumniMessages, sendAlumniMessage, deleteAlumniMessage } from '@/lib/alumniApi';
import { Briefcase, Building, Mail, Clock, CheckCircle, XCircle, ChevronRight, MessageSquare, Send, X, ClipboardList, Link as LinkIcon, Image as ImageIcon, GitBranch, Trash2, Sparkles } from 'lucide-react';
import CreativeChatConsole from '@/components/chat/CreativeChatConsole';

import { getCachedData, setCachedData } from '@/lib/cache';
import { SmartTopBarLoader, SmartListSkeleton } from '@/components/common/SmartLoader';

interface UnifiedApplication {
  id: string;
  title: string;
  companyName: string;
  type: 'job' | 'opensource' | 'alumni_opp';
  status: string;
  originalData: any;
}

export default function JobOffersPage() {
  const [applications, setApplications] = useState<UnifiedApplication[]>(() => getCachedData<UnifiedApplication[]>('job_offers_apps') || []);
  const [loading, setLoading] = useState(() => !getCachedData<UnifiedApplication[]>('job_offers_apps')?.length);
  const [syncing, setSyncing] = useState(false);
  const [assessments, setAssessments] = useState<Record<string, any>>(() => getCachedData<Record<string, any>>('job_offers_assmts') || {});
  
  // Chat state
  const [chatApp, setChatApp] = useState<UnifiedApplication | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  useEffect(() => {
    const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
    if (!studentId) {
      setLoading(false);
      return;
    }

    const fetchApps = async () => {
      setSyncing(true);
      try {
        const [appsRes, osRes, oppsRes] = await Promise.allSettled([
          getAppliedJobs(studentId),
          getStudentApplications(studentId),
          getOpportunitiesForStudent(studentId)
        ]);

        const apps = appsRes.status === 'fulfilled' ? appsRes.value : [];
        const osApps = osRes.status === 'fulfilled' ? osRes.value : [];
        const allOpps = oppsRes.status === 'fulfilled' ? oppsRes.value : [];

        const jobs: UnifiedApplication[] = (apps || []).map((app: any) => ({
          id: app.id,
          title: app.job_postings?.title || 'Unknown Job',
          companyName: app.job_postings?.companies?.name || 'Unknown Company',
          type: 'job',
          status: app.status,
          originalData: app
        }));

        const os: UnifiedApplication[] = (osApps || []).map((osApp: any) => ({
          id: osApp.application_id,
          title: osApp.project?.title || 'Unknown Project',
          companyName: osApp.project?.posted_by?.name ? `${osApp.project.posted_by.name} (Alumni Open Source)` : 'Alumni Open Source',
          type: 'opensource',
          status: osApp.status,
          originalData: osApp
        }));

        const interestedOpps = (allOpps || []).filter((o: any) => o.already_interested);
        const oppsList: UnifiedApplication[] = interestedOpps.map((opp: any) => ({
          id: opp.id,
          title: opp.title,
          companyName: opp.posted_by?.name ? `${opp.posted_by.name} (${opp.type})` : `Alumni ${opp.type}`,
          type: 'alumni_opp',
          status: opp.status,
          originalData: opp
        }));

        const allApplications = [...jobs, ...os, ...oppsList];
        setApplications(allApplications);
        setCachedData('job_offers_apps', allApplications);

        // Fetch assessments in parallel instead of sequential await loop
        if (jobs.length > 0) {
          const assmtResults = await Promise.allSettled(
            jobs.map(app => getApplicationAssessment(app.id).then(data => ({ id: app.id, data })))
          );
          const assmtsMap: Record<string, any> = {};
          assmtResults.forEach(r => {
            if (r.status === 'fulfilled' && r.value?.data) {
              assmtsMap[r.value.id] = r.value.data;
            }
          });
          setAssessments(assmtsMap);
          setCachedData('job_offers_assmts', assmtsMap);
        }
      } catch (err) {
        console.error("Failed to load applications", err);
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    };
    fetchApps();
  }, []);

  const loadMessages = async (app: UnifiedApplication) => {
    setLoadingMsgs(true);
    try {
      const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') || '' : '';
      if (app.type === 'job') {
        const msgs = await getApplicationMessages(app.id);
        setMessages(msgs || []);
      } else if (app.type === 'opensource') {
        const msgs = await getOpenSourceApplicationMessages(app.id);
        setMessages(msgs || []);
      } else if (app.type === 'alumni_opp') {
        const msgs = await getAlumniMessages(app.id, studentId);
        setMessages(msgs || []);
      }
    } catch (e: any) {
      console.error(e);
      setMessages([]);
    } finally {
      setLoadingMsgs(false);
    }
  };

  const handleOpenChat = (app: UnifiedApplication) => {
    setChatApp(app);
    loadMessages(app);
    setIsChatModalOpen(true);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatApp || !newMessage.trim()) return;
    setSendingMsg(true);
    try {
      const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') || '' : '';
      const sName = typeof window !== 'undefined' ? localStorage.getItem('student_name') || 'Student' : 'Student';
      
      const payload = {
        sender_type: 'student',
        sender_id: studentId,
        sender_name: sName,
        message: newMessage.trim()
      };

      if (chatApp.type === 'job') {
        await sendApplicationMessage(chatApp.id, payload);
      } else if (chatApp.type === 'opensource') {
        await sendOpenSourceApplicationMessage(chatApp.id, payload as any);
      } else if (chatApp.type === 'alumni_opp') {
        await sendAlumniMessage(chatApp.id, studentId, payload);
      }
      
      setNewMessage('');
      loadMessages(chatApp);
    } catch (e) {
      console.error(e);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleSendCreativeMessage = async (msg: string) => {
    if (!chatApp) return;
    const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') || '' : '';
    const sName = typeof window !== 'undefined' ? localStorage.getItem('student_name') || 'Student' : 'Student';
    setSendingMsg(true);
    try {
      const payload = {
        sender_type: 'student',
        sender_id: studentId,
        sender_name: sName,
        message: msg
      };

      if (chatApp.type === 'job') {
        await sendApplicationMessage(chatApp.id, payload);
      } else if (chatApp.type === 'opensource') {
        await sendOpenSourceApplicationMessage(chatApp.id, payload as any);
      } else if (chatApp.type === 'alumni_opp') {
        await sendAlumniMessage(chatApp.id, studentId, payload);
      }

      await loadMessages(chatApp);
    } catch (e) {
      console.error(e);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleDeleteMessage = async (msgId: string | number) => {
    if (!chatApp) return;
    try {
      if (chatApp.type === 'job') {
        await deleteApplicationMessage(String(msgId));
      } else if (chatApp.type === 'opensource') {
        await deleteOpenSourceApplicationMessage(String(msgId));
      } else if (chatApp.type === 'alumni_opp') {
        await deleteAlumniMessage(String(msgId));
      }
      await loadMessages(chatApp);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading && applications.length === 0) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <SmartListSkeleton count={4} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SmartTopBarLoader active={syncing} />
      <div>
        <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight flex items-center gap-2.5">
          <Mail className="w-6 h-6 text-emerald-800" /> Application Pipeline & Communications
        </h1>
        <p className="text-stone-500 text-xs mt-1">
          Review recruitment progression and direct recruiter communications for active candidacies.
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center shadow-2xs">
          <Briefcase className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <h2 className="text-sm font-bold text-stone-800 mb-1">No Active Candidacies</h2>
          <p className="text-stone-500 text-xs max-w-sm mx-auto">
            You have not submitted applications to open positions or alumni projects yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app, index) => (
            <div key={`${app.id}-${index}`} className="bg-white rounded-xl p-5 border border-stone-200 shadow-sm hover:border-emerald-700 transition-all flex flex-col gap-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0 text-stone-700">
                    {app.type === 'job' ? <Building className="w-5 h-5 text-emerald-800" /> : 
                     app.type === 'opensource' ? <GitBranch className="w-5 h-5 text-stone-700" /> :
                     <Briefcase className="w-5 h-5 text-amber-700" />}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-900">
                      {app.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-medium text-stone-500 mt-0.5">
                      <span>{app.companyName}</span>
                      <span className="px-1.5 py-0.5 bg-stone-100 text-stone-600 text-[10px] font-bold rounded uppercase tracking-wider border border-stone-200">
                        {app.type === 'job' ? 'Direct Job' : app.type === 'opensource' ? 'Open Source' : 'Referral'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto shrink-0 flex-wrap md:flex-nowrap">
                  <div className="flex flex-col items-start md:items-end w-full md:w-auto">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">Status</span>
                    <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1 border ${
                      app.status === 'hired' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                      app.status === 'shortlisted' ? 'bg-orange-50 text-orange-900 border-orange-200' :
                      app.status === 'rejected' ? 'bg-stone-100 text-stone-600 border-stone-200' :
                      'bg-stone-50 text-stone-700 border-stone-200'
                    }`}>
                      {app.status === 'hired' && <CheckCircle className="w-3 h-3 text-emerald-800" />}
                      {app.status === 'rejected' && <XCircle className="w-3 h-3 text-stone-500" />}
                      {app.status === 'applied' && <Clock className="w-3 h-3 text-stone-500" />}
                      {app.status === 'shortlisted' && <MessageSquare className="w-3 h-3 text-orange-700" />}
                      {(app.status || 'pending').toUpperCase()}
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenChat(app)}
                    className="w-full md:w-auto px-3.5 py-2 bg-white hover:bg-orange-50 text-stone-800 hover:text-orange-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-stone-200 hover:border-orange-300 shadow-2xs"
                  >
                    <Mail className="w-3.5 h-3.5 text-emerald-800" /> Message
                  </button>
                </div>
              </div>

              {/* Assessment Section (for job types) */}
              {app.type === 'job' && assessments[app.id] && (
                <div className="mt-1 p-3.5 bg-stone-50 border border-stone-200 rounded-lg flex flex-col gap-2.5 text-xs">
                  <div className="flex items-center gap-1.5 text-stone-900 font-bold">
                    <ClipboardList className="w-4 h-4 text-emerald-800" /> Employer Technical Evaluation Assigned
                  </div>
                  {assessments[app.id].guidelines && (
                    <p className="text-stone-600">{assessments[app.id].guidelines}</p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <a href={assessments[app.id].assessment_link} target="_blank" rel="noreferrer" className="font-semibold bg-white border border-stone-300 text-stone-800 px-3 py-1.5 rounded-md hover:bg-stone-50">
                      View Evaluation Portal
                    </a>
                    
                    {assessments[app.id].student_status === 'pending' && (
                      <button 
                        onClick={async () => {
                          try {
                            const res = await updateAssessmentStudentStatus(app.id, 'accepted');
                            setAssessments(prev => ({...prev, [app.id]: res}));
                          } catch(e) {}
                        }}
                        className="font-semibold bg-emerald-800 text-white px-3 py-1.5 rounded-md hover:bg-emerald-900 shadow-2xs"
                      >
                        Acknowledge Assignment
                      </button>
                    )}
                    
                    {assessments[app.id].student_status === 'accepted' && (
                      <button 
                        onClick={async () => {
                          try {
                            const res = await updateAssessmentStudentStatus(app.id, 'completed');
                            setAssessments(prev => ({...prev, [app.id]: res}));
                          } catch(e) {}
                        }}
                        className="font-semibold bg-emerald-800 text-white px-3 py-1.5 rounded-md hover:bg-emerald-900 shadow-2xs"
                      >
                        Mark as Completed
                      </button>
                    )}
                    
                    {assessments[app.id].student_status === 'completed' && (
                      <span className="font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Assessment Submitted
                      </span>
                    )}

                    {assessments[app.id].company_result && (
                       <div className="ml-auto flex items-center gap-1.5 bg-white px-2.5 py-1 rounded border border-stone-200">
                         <span className="text-[10px] font-bold uppercase text-stone-400">Evaluation:</span>
                         <span className="font-bold text-stone-800">{assessments[app.id].company_result}</span>
                       </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Floating Chats Button with Warm Orange Glow Accent */}
      <button 
        onClick={() => {
          if (!chatApp && applications.length > 0) {
            handleOpenChat(applications[0]);
          } else {
            setIsChatModalOpen(true);
          }
        }}
        className="fixed bottom-6 right-6 w-12 h-12 bg-gradient-to-tr from-emerald-800 to-emerald-900 border border-orange-400/40 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-all z-40 relative group"
        title="Open dialogue hub"
      >
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500 border border-white" />
        </span>
        <MessageSquare className="w-5 h-5" />
      </button>

      {/* Creative Dialogue Console */}
      <CreativeChatConsole
        isOpen={isChatModalOpen && Boolean(chatApp)}
        onClose={() => {
          setIsChatModalOpen(false);
          setChatApp(null);
        }}
        title={`${chatApp?.title || 'Dialogue'} @ ${chatApp?.companyName || 'Institutional Contact'}`}
        subtitle="Recruitment Pipeline & Direct Institutional Communication"
        recipientRole={
          chatApp?.type === 'job' ? 'Corporate Recruiter' :
          chatApp?.type === 'opensource' ? 'Project Maintainer' :
          'Alumni Advisor'
        }
        contextTag={
          chatApp?.type === 'job' ? 'Corporate Thread' :
          chatApp?.type === 'opensource' ? 'OpenSource Dispatch' :
          'Mentorship Frequency'
        }
        messages={messages}
        currentUserId={typeof window !== 'undefined' ? localStorage.getItem('student_id') : null}
        currentUserType="student"
        loading={loadingMsgs}
        sending={sendingMsg}
        onSendMessage={handleSendCreativeMessage}
        onDeleteMessage={handleDeleteMessage}
      />
    </div>
  );
}
