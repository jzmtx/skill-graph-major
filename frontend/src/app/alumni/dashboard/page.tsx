"use client";

import React, { useEffect, useState, useRef } from 'react';
import {
  getAlumniProfile,
  getMyOpportunities,
  createOpportunity,
  deactivateOpportunity,
  getInterestedStudents,
  getCollegeStudents,
  updateInterestStatus,
  getAlumniMessages,
  sendAlumniMessage,
  deleteAlumniMessage,
  getAlumniConversations
} from '@/lib/alumniApi';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
  Users,
  Plus,
  X,
  UserCheck,
  Briefcase,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Eye,
  Sparkles,
  GitBranch,
  Send,
  MessageSquare,
  CheckCircle2,
  Link as LinkIcon,
  Image as ImageIcon,
  Trash2,
  Building2,
  Check
} from 'lucide-react';
import StudentProfileModal, { StudentProfileData } from '@/components/dashboard/StudentProfileModal';
import AlumniOpenSourceManager from '@/components/alumni/AlumniOpenSourceManager';
import ReactMarkdown from 'react-markdown';
import CreativeChatConsole from '@/components/chat/CreativeChatConsole';
import { UnifiedCommunicationsHub, UnifiedConversation } from '@/components/chat/UnifiedCommunicationsHub';

interface Opportunity {
  id: string;
  title: string;
  description?: string;
  type: string;
  is_active: boolean;
  created_at: string;
  interested_count: number;
}

interface StudentWithSkills {
  student: { 
    id: string; 
    name: string; 
    email: string; 
    branch?: string; 
    year?: number; 
    phone?: string;
    usn?: string;
    github_url?: string; 
    linkedin_url?: string;
    college_id?: string;
  };
  college_name?: string;
  skills: { 
    skill_name: string; 
    verification_level: number;
    skill_score?: number;
    source?: string;
  }[];
  hireability?: {
    score: number;
    breakdown?: any;
  };
  status?: string;
  expressed_at?: string;
}

export default function AlumniDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alumni, setAlumni] = useState<{ id: string; name: string; is_verified: boolean } | null>(null);
  const [college, setCollege] = useState<{ name: string } | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<StudentProfileData | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('referral');

  const [expandedOppId, setExpandedOppId] = useState<string | null>(null);
  const [interestedStudents, setInterestedStudents] = useState<StudentWithSkills[]>([]);
  const [interestedLoading, setInterestedLoading] = useState(false);

  // Unified Communications & Messages Hub State
  const [conversations, setConversations] = useState<UnifiedConversation[]>([]);
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<'opportunities' | 'opensource' | 'students' | 'messages'>('opportunities');

  // Legacy Chat State fallback
  const [chatStudent, setChatStudent] = useState<{opp_id: string, opp_title: string, student_id: string, student_name: string} | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- College Students section ---
  const [showCollegeStudents, setShowCollegeStudents] = useState(false);
  const [collegeStudents, setCollegeStudents] = useState<StudentWithSkills[]>([]);
  const [collegeStudentsLoading, setCollegeStudentsLoading] = useState(false);
  const [collegeStudentsLoaded, setCollegeStudentsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const authId = typeof window !== 'undefined' ? localStorage.getItem('alumni_auth_id') : null;
      if (!authId) {
        router.push('/login');
        return;
      }
      try {
        const profile = await getAlumniProfile(authId);
        setAlumni(profile.alumni);
        setCollege(profile.college);
        if (typeof window !== 'undefined') {
          localStorage.setItem('alumni_id', profile.alumni.id);
        }

        if (profile.alumni.is_verified) {
          const [oppList, commContacts] = await Promise.allSettled([
            getMyOpportunities(profile.alumni.id),
            api.get(`/api/communications/contacts/alumni/${profile.alumni.id}`)
          ]);
          
          if (oppList.status === 'fulfilled') {
            setOpportunities(oppList.value || []);
          }

          if (commContacts.status === 'fulfilled' && commContacts.value?.data?.contacts) {
            const fetched = commContacts.value.data.contacts || [];
            setConversations(fetched);
            if (fetched.length > 0 && !selectedConvoId) {
              setSelectedConvoId(fetched[0].id);
            }
          }
        }
      } catch {
        setError('Failed to load dashboard. Please try logging in again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router, selectedConvoId]);

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alumni) return;
    setFormLoading(true);
    setFormError('');

    try {
      await createOpportunity({
        alumni_id: alumni.id,
        title,
        description: description || undefined,
        type,
      });

      const oppList = await getMyOpportunities(alumni.id);
      setOpportunities(oppList);
      setShowForm(false);
      setTitle(''); setDescription(''); setType('referral');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setFormError(error.response?.data?.detail || 'Failed to post opportunity');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeactivate = async (oppId: string) => {
    try {
      await deactivateOpportunity(oppId);
      setOpportunities(opportunities.map(o => o.id === oppId ? { ...o, is_active: false } : o));
    } catch {
      // silently ignore for now
    }
  };

  const toggleInterested = async (oppId: string) => {
    if (expandedOppId === oppId) {
      setExpandedOppId(null);
      return;
    }
    setExpandedOppId(oppId);
    setInterestedLoading(true);
    try {
      const data = await getInterestedStudents(oppId);
      setInterestedStudents(data);
      setOpportunities(prev => prev.map(o => o.id === oppId ? { ...o, interested_count: data.length } : o));
    } catch {
      setInterestedStudents([]);
    } finally {
      setInterestedLoading(false);
    }
  };

  const handleOpenChat = (oppId: string, oppTitle: string, studentId: string, studentName: string) => {
    setSelectedConvoId(`dm_${studentId}`);
    setDashboardTab('messages');
  };

  const handleStatusChange = async (oppId: string, studentId: string, newStatus: string) => {
    try {
      await updateInterestStatus(oppId, studentId, newStatus);
      setInterestedStudents(prev => 
        prev.map(s => s.student.id === studentId ? { ...s, status: newStatus } : s)
      );
    } catch (e: any) {
      alert("Failed to update status: " + (e.response?.data?.detail || e.message));
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatStudent || !newMessage.trim() || !alumni) return;
    setSendingMsg(true);
    try {
      await sendAlumniMessage(chatStudent.opp_id, chatStudent.student_id, {
        sender_type: 'alumni',
        sender_id: alumni.id,
        sender_name: alumni.name,
        message: newMessage.trim()
      });
      setNewMessage('');
      const msgs = await getAlumniMessages(chatStudent.opp_id, chatStudent.student_id);
      setMessages(msgs || []);
    } catch(e: any) {
      alert(e.response?.data?.detail || e.message || 'Failed to send');
    }
    setSendingMsg(false);
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await deleteAlumniMessage(msgId);
      if (chatStudent) {
        const msgs = await getAlumniMessages(chatStudent.opp_id, chatStudent.student_id);
        setMessages(msgs || []);
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

  const toggleCollegeStudents = async () => {
    const next = !showCollegeStudents;
    setShowCollegeStudents(next);
    if (next && !collegeStudentsLoaded && alumni) {
      setCollegeStudentsLoading(true);
      try {
        const data = await getCollegeStudents(alumni.id);
        setCollegeStudents(data);
        setCollegeStudentsLoaded(true);
      } catch {
        setCollegeStudents([]);
      } finally {
        setCollegeStudentsLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-500 font-sans">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-stone-600">Loading alumni portal...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6 font-sans">
        <div className="bg-white border border-rose-200 text-rose-800 rounded-xl p-6 max-w-md text-center shadow-xs">
          <p className="text-sm font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-stone-900 tracking-tight">Welcome back, {alumni?.name}</h1>
                {alumni && !alumni.is_verified && (
                  <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 text-[11px] font-semibold rounded-full border border-amber-200">
                    Pending Verification
                  </span>
                )}
                {alumni && alumni.is_verified && (
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 text-[11px] font-semibold rounded-full border border-emerald-200 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Verified Alumni
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-stone-400" />
                {college?.name || 'Institution Partner'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1.5 bg-stone-100 text-stone-700 rounded-lg border border-stone-200">
              Alumni Network
            </span>
          </div>
        </div>

        {alumni && !alumni.is_verified ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-5 rounded-xl mb-6">
            <p className="font-semibold mb-1">Account Awaiting Institutional Approval</p>
            <p className="text-amber-800">Your alumni credentials are currently being reviewed by your college administrator. Once verified, you will be able to post referral positions, mentor projects, and form open source teams.</p>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-stone-200 mb-6 pb-0 overflow-x-auto">
              <button
                onClick={() => setDashboardTab('opensource')}
                className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
                  dashboardTab === 'opensource'
                    ? 'border-emerald-800 text-emerald-800 bg-white shadow-xs'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <GitBranch className="w-4 h-4" />
                Open Source Projects
              </button>
              <button
                onClick={() => setDashboardTab('opportunities')}
                className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
                  dashboardTab === 'opportunities'
                    ? 'border-emerald-800 text-emerald-800 bg-white shadow-xs'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                Referrals &amp; Mentorship ({opportunities.length})
              </button>
              <button
                onClick={() => {
                  setDashboardTab('students');
                  if (!collegeStudentsLoaded && alumni) toggleCollegeStudents();
                }}
                className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
                  dashboardTab === 'students'
                    ? 'border-emerald-800 text-emerald-800 bg-white shadow-xs'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>College Students</span>
              </button>
              <button
                onClick={() => setDashboardTab('messages')}
                className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
                  dashboardTab === 'messages'
                    ? 'border-emerald-800 text-emerald-800 bg-white shadow-xs'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Inquiries &amp; Messages ({conversations.length})</span>
                {conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0) > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white animate-pulse">
                    {conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0)} NEW
                  </span>
                )}
              </button>
            </div>

            {/* TAB: OPEN SOURCE PROJECTS */}
            {dashboardTab === 'opensource' && alumni && (
              <AlumniOpenSourceManager alumniId={alumni.id} alumniName={alumni.name} collegeName={college?.name} />
            )}

            {/* TAB: INQUIRIES & MESSAGES */}
            {dashboardTab === 'messages' && (
              <div className="w-full">
                <UnifiedCommunicationsHub
                  isOpen={true}
                  isEmbedded={true}
                  onClose={() => {}}
                  currentUserType="alumni"
                  currentUserId={alumni?.id}
                  currentUserName={alumni?.name || 'Alumni Mentor'}
                  initialConversations={conversations}
                  activeConversationId={selectedConvoId}
                  onSelectConversation={(c) => setSelectedConvoId(c.id)}
                />
              </div>
            )}

            {/* TAB: GENERAL OPPORTUNITIES */}
            {dashboardTab === 'opportunities' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-emerald-800" /> Mentorship &amp; Referrals
                  </h2>
                  <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 text-white text-xs font-semibold rounded-lg hover:bg-emerald-900 transition-colors shadow-xs"
                  >
                    {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {showForm ? 'Cancel' : 'Post Opportunity'}
                  </button>
                </div>

                {/* New Opportunity Form */}
                {showForm && (
                  <div className="bg-white rounded-xl shadow-xs border border-stone-200 p-6 mb-6">
                    <h3 className="text-sm font-bold text-stone-900 mb-4">Create New Opportunity</h3>
                    {formError && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs mb-4">{formError}</div>
                    )}
                    <form onSubmit={handleCreateOpportunity} className="space-y-4 text-xs">
                      <div>
                        <label className="block font-semibold text-stone-700 mb-1">Title</label>
                        <input
                          type="text" required
                          placeholder="e.g. SDE-1 Referral at Stripe"
                          className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-700 focus:bg-white outline-none text-stone-900 text-xs"
                          value={title} onChange={e => setTitle(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-stone-700 mb-1">Description</label>
                        <textarea
                          rows={3}
                          placeholder="Provide criteria, prerequisites, team context, and expectations..."
                          className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-700 focus:bg-white outline-none text-stone-900 text-xs"
                          value={description} onChange={e => setDescription(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-stone-700 mb-1">Type</label>
                        <select
                          className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-700 focus:bg-white outline-none text-stone-900 text-xs"
                          value={type} onChange={e => setType(e.target.value)}
                        >
                          <option value="referral">Company Referral</option>
                          <option value="internship">Internship Opportunity</option>
                          <option value="mentorship">Career Mentorship</option>
                          <option value="job">Direct Full-Time Job</option>
                          <option value="opensource">Open Source Initiative</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        disabled={formLoading}
                        className="px-5 py-2.5 bg-emerald-800 text-white text-xs font-semibold rounded-lg hover:bg-emerald-900 disabled:opacity-50 transition-colors"
                      >
                        {formLoading ? 'Publishing...' : 'Publish Opportunity'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Opportunity List */}
                {opportunities.length === 0 ? (
                  <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-500 text-xs">
                    No opportunities posted yet. Click &quot;Post Opportunity&quot; to invite candidate inquiries.
                  </div>
                ) : (
                  <div className="space-y-3 mb-10">
                    {opportunities.map(opp => (
                      <div key={opp.id} className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-stone-900 text-sm">{opp.title}</h3>
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold rounded-md capitalize">{opp.type}</span>
                              {!opp.is_active && (
                                <span className="px-2 py-0.5 bg-stone-100 text-stone-500 border border-stone-200 text-[10px] font-medium rounded-md">Closed</span>
                              )}
                            </div>
                            {opp.description && <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">{opp.description}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => toggleInterested(opp.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 text-stone-700 text-xs font-semibold rounded-lg hover:bg-stone-200 border border-stone-200 transition-colors"
                            >
                              <UserCheck className="w-3.5 h-3.5" /> {opp.interested_count} Interested
                            </button>
                            {opp.is_active && (
                              <button
                                onClick={() => handleDeactivate(opp.id)}
                                className="px-3 py-1.5 bg-rose-50 text-rose-700 text-xs font-semibold rounded-lg hover:bg-rose-100 border border-rose-200 transition-colors"
                              >
                                Close
                              </button>
                            )}
                          </div>
                        </div>

                        {expandedOppId === opp.id && (
                          <div className="mt-4 pt-4 border-t border-stone-200">
                            {interestedLoading ? (
                              <p className="text-xs text-stone-500">Loading candidate interests...</p>
                            ) : interestedStudents.length === 0 ? (
                              <p className="text-xs text-stone-500">No students have applied to this opportunity yet.</p>
                            ) : (
                              <div className="space-y-2">
                                {interestedStudents.map((s, i) => (
                                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 border border-stone-200 rounded-xl p-3.5">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <p className="text-xs font-bold text-stone-900">{s.student.name}</p>
                                        {s.hireability && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-md">
                                            Score: {s.hireability.score}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-stone-500 mt-0.5">
                                        {s.student.email} {s.student.branch ? `· ${s.student.branch}` : ''} {s.student.year ? `· Year ${s.student.year}` : ''}
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                                      <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                                        {s.skills.slice(0, 3).map((sk, j) => (
                                          <span key={j} className="px-1.5 py-0.5 bg-white text-stone-700 text-[10px] font-medium rounded border border-stone-200">
                                            {sk.skill_name}{sk.verification_level >= 1 ? ' ✓' : ''}
                                          </span>
                                        ))}
                                      </div>

                                      <button
                                        onClick={() => setSelectedStudentProfile({
                                          student: s.student,
                                          college_name: s.college_name || college?.name,
                                          skills: s.skills,
                                          hireability: s.hireability,
                                          extraDetails: {
                                            expressed_at: s.expressed_at,
                                            opportunity_title: opp.title,
                                            opportunity_type: opp.type
                                          }
                                        })}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-stone-100 text-stone-800 text-xs font-semibold rounded-lg transition-colors border border-stone-300"
                                      >
                                        <Eye className="w-3.5 h-3.5" /> View
                                      </button>

                                      <div className="flex items-center gap-1.5">
                                        {s.status === 'hired' ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Hired
                                          </span>
                                        ) : s.status === 'rejected' ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 text-rose-800 text-xs font-bold rounded-lg border border-rose-200">
                                            <X className="w-3.5 h-3.5" /> Rejected
                                          </span>
                                        ) : (
                                          <>
                                            {s.status === 'shortlisted' ? (
                                              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 text-amber-800 text-xs font-bold rounded-lg border border-amber-200">
                                                Shortlisted
                                              </span>
                                            ) : (
                                              <button
                                                onClick={() => handleStatusChange(opp.id, s.student.id, 'shortlisted')}
                                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-lg border border-amber-200 transition-colors"
                                              >
                                                Shortlist
                                              </button>
                                            )}
                                            <button
                                              onClick={() => handleStatusChange(opp.id, s.student.id, 'hired')}
                                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 transition-colors"
                                            >
                                              Hire
                                            </button>
                                            <button
                                              onClick={() => handleStatusChange(opp.id, s.student.id, 'rejected')}
                                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold rounded-lg border border-rose-200 transition-colors"
                                            >
                                              Reject
                                            </button>
                                          </>
                                        )}

                                        <button
                                          onClick={() => handleOpenChat(opp.id, opp.title, s.student.id, s.student.name)}
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg transition-colors"
                                        >
                                          <MessageSquare className="w-3.5 h-3.5" /> Chat
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* TAB: COLLEGE STUDENTS */}
            {dashboardTab === 'students' && (
              <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-emerald-800" /> Students at {college?.name}
                  </h2>
                  <button
                    onClick={toggleCollegeStudents}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 text-stone-700 text-xs font-semibold rounded-lg hover:bg-stone-200 border border-stone-200"
                  >
                    {collegeStudentsLoading ? 'Refreshing...' : 'Refresh List'}
                  </button>
                </div>

                {collegeStudentsLoading ? (
                  <p className="text-xs text-stone-500">Loading student directory...</p>
                ) : collegeStudents.length === 0 ? (
                  <p className="text-xs text-stone-500">No students found from your college directory yet.</p>
                ) : (
                  <div className="space-y-2">
                    {collegeStudents.map((s, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 border border-stone-200 rounded-xl p-3.5">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-stone-900">{s.student.name}</p>
                            {s.hireability && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-md border border-emerald-200">
                                Score: {s.hireability.score}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            {s.student.email}
                            {s.student.branch ? ` · ${s.student.branch}` : ''}
                            {s.student.year ? ` · Year ${s.student.year}` : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                            {s.skills.length === 0 ? (
                              <span className="text-[10px] text-stone-400">No skills declared</span>
                            ) : (
                              s.skills.slice(0, 3).map((sk, j) => (
                                <span key={j} className="px-1.5 py-0.5 bg-white text-stone-700 text-[10px] font-medium rounded border border-stone-200">
                                  {sk.skill_name}{sk.verification_level >= 1 ? ' ✓' : ''}
                                </span>
                              ))
                            )}
                          </div>

                          <button
                            onClick={() => setSelectedStudentProfile({
                              student: s.student,
                              college_name: college?.name,
                              skills: s.skills,
                              hireability: s.hireability
                            })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-stone-100 text-stone-800 text-xs font-semibold rounded-lg transition-colors border border-stone-300"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Profile
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Student Profile Modal */}
      <StudentProfileModal
        data={selectedStudentProfile}
        onClose={() => setSelectedStudentProfile(null)}
      />

      {/* Floating Candidate Inquiries Button for Alumni */}
      {dashboardTab !== 'messages' && (
        <>
          <button 
            onClick={() => {
              if (!selectedConvoId && conversations.length > 0) {
                setSelectedConvoId(conversations[0].id);
              }
              setIsHubOpen(true);
            }}
            className="fixed bottom-6 right-6 w-13 h-13 bg-gradient-to-tr from-emerald-800 to-emerald-900 border border-orange-400/40 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-all z-40 relative group cursor-pointer"
            title="Open Candidate Inquiries & Communications Hub"
          >
            {conversations.some(c => c.unreadCount > 0) && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-orange-500 border-2 border-white" />
              </span>
            )}
            <MessageSquare className="w-5 h-5" />
          </button>

          {/* Unified Multi-Channel Communications Hub (Modal View) */}
          <UnifiedCommunicationsHub
            isOpen={isHubOpen}
            onClose={() => setIsHubOpen(false)}
            currentUserType="alumni"
            currentUserId={alumni?.id}
            currentUserName={alumni?.name || 'Alumni Mentor'}
            initialConversations={conversations}
            activeConversationId={selectedConvoId}
            onSelectConversation={(c) => setSelectedConvoId(c.id)}
          />
        </>
      )}
    </div>
  );
}