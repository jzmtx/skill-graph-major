"use client";

import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { getAppliedJobs, getApplicationMessages, sendApplicationMessage, getApplicationAssessment, updateAssessmentStudentStatus, deleteApplicationMessage } from '@/lib/companyApi';
import { getStudentApplications, getOpenSourceApplicationMessages, sendOpenSourceApplicationMessage, deleteOpenSourceApplicationMessage } from '@/lib/opensourceApi';
import { getOpportunitiesForStudent, getAlumniMessages, sendAlumniMessage, deleteAlumniMessage } from '@/lib/alumniApi';
import { Briefcase, Building, Mail, Clock, CheckCircle, XCircle, ChevronRight, MessageSquare, Send, X, ClipboardList, Link as LinkIcon, Image as ImageIcon, Sparkles, GitBranch, Trash2 } from 'lucide-react';

interface UnifiedApplication {
  id: string;
  title: string;
  companyName: string;
  type: 'job' | 'opensource' | 'alumni_opp';
  status: string;
  originalData: any;
}

export default function JobOffersPage() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<UnifiedApplication[]>([]);
  const [assessments, setAssessments] = useState<Record<string, any>>({});
  
  // Chat state
  const [chatApp, setChatApp] = useState<UnifiedApplication | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  useEffect(() => {
    const studentId = localStorage.getItem('student_id');
    if (!studentId) {
      setLoading(false);
      return;
    }

    const fetchApps = async () => {
      try {
        const apps = await getAppliedJobs(studentId);
        const jobs: UnifiedApplication[] = (apps || []).map((app: any) => ({
          id: app.id,
          title: app.job_postings?.title || 'Unknown Job',
          companyName: app.job_postings?.companies?.name || 'Unknown Company',
          type: 'job',
          status: app.status,
          originalData: app
        }));
        
        let os: UnifiedApplication[] = [];
        try {
          const osApps = await getStudentApplications(studentId);
          os = osApps.map((osApp: any) => ({
            id: osApp.application_id,
            title: osApp.project?.title || 'Unknown Project',
            companyName: osApp.project?.posted_by?.name ? `${osApp.project.posted_by.name} (Alumni Open Source)` : 'Alumni Open Source',
            type: 'opensource',
            status: osApp.status,
            originalData: osApp
          }));
        } catch(e) {}

        let oppsList: UnifiedApplication[] = [];
        try {
          const allOpps = await getOpportunitiesForStudent(studentId);
          const interestedOpps = allOpps.filter((o: any) => o.already_interested);
          oppsList = interestedOpps.map((opp: any) => ({
            id: opp.id,
            title: opp.title,
            companyName: opp.posted_by?.name ? `${opp.posted_by.name} (${opp.type})` : `Alumni ${opp.type}`,
            type: 'alumni_opp',
            status: opp.status,
            originalData: opp
          }));
        } catch(e) {}

        const allApplications = [...jobs, ...os, ...oppsList];
        setApplications(allApplications);
        
        // Fetch assessments for job apps
        const assmts: Record<string, any> = {};
        for(const app of jobs) {
          try {
             const data = await getApplicationAssessment(app.id);
             if(data) assmts[app.id] = data;
          } catch(e) {}
        }
        setAssessments(assmts);
      } catch (err) {
        console.error("Failed to load applications", err);
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, []);

  const loadMessages = async (app: UnifiedApplication) => {
    setLoadingMsgs(true);
    try {
      const studentId = localStorage.getItem('student_id') || '';
      if (app.type === 'job') {
        const msgs = await getApplicationMessages(app.id);
        console.log("DEBUG Student Messages Fetched for App:", app.id, msgs);
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
      setMessages([{ id: 'error', sender_type: 'system', sender_name: 'System', message: `Error loading messages: ${e.message || e}` }]);
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
      const studentId = localStorage.getItem('student_id') || '';
      const sName = localStorage.getItem('student_name') || 'Student';
      
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

  const handleDeleteMessage = async (msgId: string) => {
    try {
      if (chatApp?.type === 'job') {
        await deleteApplicationMessage(msgId);
      } else if (chatApp?.type === 'opensource') {
        await deleteOpenSourceApplicationMessage(msgId);
      } else if (chatApp?.type === 'alumni_opp') {
        await deleteAlumniMessage(msgId);
      }
      if (chatApp) {
        loadMessages(chatApp);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Job Offers...</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 animate-in fade-in duration-300">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <Mail className="w-8 h-8 text-indigo-600" /> Job Offers & Messages
        </h1>
        <p className="text-slate-500 mt-2 text-sm max-w-2xl">
          Track your job application statuses. Communicate directly with recruiters or alumni for roles where you are shortlisted or hired.
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <Briefcase className="w-8 h-8 text-slate-300" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">No Applications Yet</h2>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            You haven't applied to any jobs, opportunities, or open source projects yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {applications.map((app, index) => (
            <div key={`${app.id}-${index}`} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col gap-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                    {app.type === 'job' ? <Building className="w-6 h-6 text-indigo-600" /> : 
                     app.type === 'opensource' ? <GitBranch className="w-6 h-6 text-indigo-600" /> :
                     <Sparkles className="w-6 h-6 text-indigo-600" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">
                      {app.title}
                    </h3>
                    <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                      <span>{app.companyName}</span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase tracking-wider">
                        {app.type === 'job' ? 'Job' : app.type === 'opensource' ? 'Open Source' : 'Alumni Opp'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto shrink-0 flex-wrap md:flex-nowrap">
                  <div className="flex flex-col items-start md:items-end w-full md:w-auto">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</span>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                      app.status === 'hired' ? 'bg-emerald-100 text-emerald-700' :
                      app.status === 'shortlisted' ? 'bg-amber-100 text-amber-700' :
                      app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {app.status === 'hired' && <CheckCircle className="w-3.5 h-3.5" />}
                      {app.status === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
                      {app.status === 'applied' && <Clock className="w-3.5 h-3.5" />}
                      {app.status === 'shortlisted' && <MessageSquare className="w-3.5 h-3.5" />}
                      {(app.status || 'pending').toUpperCase()}
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenChat(app)}
                    className="w-full md:w-auto px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Mail className="w-4 h-4" /> Message {app.type === 'job' ? 'Company' : 'Alumni'}
                  </button>
                </div>
              </div>

              {/* Assessment Section (only for job types) */}
              {app.type === 'job' && assessments[app.id] && (
                <div className="mt-2 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-indigo-800 font-bold text-sm">
                    <ClipboardList className="w-4 h-4" /> Company Assessment Assigned
                  </div>
                  {assessments[app.id].guidelines && (
                    <p className="text-xs text-slate-600">{assessments[app.id].guidelines}</p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <a href={assessments[app.id].assessment_link} target="_blank" rel="noreferrer" className="text-xs font-bold bg-white border border-indigo-200 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-50">
                      Open Assessment Link
                    </a>
                    
                    {assessments[app.id].student_status === 'pending' && (
                      <button 
                        onClick={async () => {
                          try {
                            const res = await updateAssessmentStudentStatus(app.id, 'accepted');
                            setAssessments(prev => ({...prev, [app.id]: res}));
                          } catch(e) {}
                        }}
                        className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
                      >
                        Accept Assessment
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
                        className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700"
                      >
                        Mark as Completed
                      </button>
                    )}
                    
                    {assessments[app.id].student_status === 'completed' && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Completed
                      </span>
                    )}

                    {assessments[app.id].company_result && (
                       <div className="ml-auto flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                         <span className="text-[10px] font-bold uppercase text-slate-400">Result:</span>
                         <span className="text-xs font-bold text-slate-800">{assessments[app.id].company_result}</span>
                       </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* FLOATING ALL CHATS BUTTON */}
      <button 
        onClick={() => {
          if (!chatApp && applications.length > 0) setChatApp(applications[0]);
          setIsChatModalOpen(true);
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-indigo-700 hover:scale-105 transition-all z-40 group"
      >
        <MessageSquare className="w-6 h-6" />
        <span className="absolute -top-10 right-0 bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          All Chats
        </span>
      </button>

      {/* WHATSAPP-STYLE CHAT MODAL */}
      {isChatModalOpen && (() => {
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

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-5xl h-[85vh] flex overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              
              {/* Left Side: Chat List (Hidden on mobile if chat is active) */}
              <div className={`w-full md:w-1/3 bg-slate-50 border-r border-slate-200 flex-col ${!chatApp ? 'flex' : 'hidden md:flex'}`}>
                <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
                  <h2 className="font-bold text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                    All Conversations
                  </h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {applications.length === 0 ? (
                     <div className="p-4 text-center text-xs text-slate-400">No applications yet.</div>
                  ) : (
                    applications.map((app, idx) => (
                      <button 
                        key={`${app.id}-${idx}`}
                        onClick={() => handleOpenChat(app)}
                        className={`w-full text-left p-3 rounded-xl transition-all border ${
                          chatApp?.id === app.id 
                            ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                            : 'bg-transparent border-transparent hover:bg-slate-200'
                        }`}
                      >
                        <div className={`font-bold text-sm truncate ${chatApp?.id === app.id ? 'text-indigo-900' : 'text-slate-900'}`}>
                          {app.title}
                        </div>
                        <div className="text-xs text-slate-500 truncate mt-0.5 flex justify-between">
                          <span>{app.companyName}</span>
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] uppercase">{app.type === 'job' ? 'Job' : app.type === 'opensource' ? 'OS' : 'Opp'}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Right Side: Active Chat View */}
              <div className={`flex-1 bg-white flex-col w-full ${chatApp ? 'flex' : 'hidden md:flex'}`}>
                {chatApp ? (
                  <>
                    <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0 bg-white">
                      <div className="flex flex-col">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider mb-1 w-max">
                          <Mail className="w-3 h-3" />
                          Application Chat
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 leading-tight">
                          {chatApp.title} 
                          <span className="text-slate-400 font-normal mx-1">@</span> 
                          {chatApp.companyName}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setChatApp(null)}
                          className="md:hidden w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                        >
                          <span className="text-xs font-bold">Back</span>
                        </button>
                        <button
                          onClick={() => { setIsChatModalOpen(false); setChatApp(null); }}
                          className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-50/50 relative">
                  {loadingMsgs ? (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        Loading messages...
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center flex-col text-slate-400">
                      <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                      <div className="text-center text-sm max-w-[200px]">
                        No messages yet. Send a message to the {chatApp.type === 'job' ? 'company recruiter' : 'alumnus'}!
                      </div>
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isMe = msg.sender_type === 'student';
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
                              {msg.sender_name} {isMe ? '(You)' : `(${msg.sender_type})`}
                            </span>
                          </div>
                          <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-[85%] shadow-sm ${
                            isMe 
                              ? 'bg-indigo-600 text-white rounded-tr-sm prose prose-invert max-w-none' 
                              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm prose max-w-none'
                          }`}>
                            <ReactMarkdown>{msg.message}</ReactMarkdown>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="shrink-0 flex flex-col gap-2 p-4 bg-white border-t border-slate-100">
                  <div className="flex gap-2 mb-1">
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                    <button
                      type="button"
                      onClick={handleInsertLink}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <LinkIcon className="w-3.5 h-3.5" /> Insert Link
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <ImageIcon className="w-3.5 h-3.5" /> {uploadingImage ? 'Uploading...' : 'Post Image'}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`Type a message to the ${chatApp.type === 'job' ? 'company' : 'alumnus'}...`}
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      className="flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={sendingMsg || !newMessage.trim()}
                      className="px-6 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span className="hidden sm:inline">Send</span>
                    </button>
                  </div>
                </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/30 relative">
                    <button
                      onClick={() => setIsChatModalOpen(false)}
                      className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                    <h3 className="text-xl font-bold text-slate-600 mb-2">Your Conversations</h3>
                    <p className="text-sm max-w-sm">Select an application from the left to view messages and communicate with the recruiter or alumnus.</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}
