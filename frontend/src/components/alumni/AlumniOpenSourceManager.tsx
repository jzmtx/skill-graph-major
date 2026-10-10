"use client";

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  listOpenSourceProjects,
  createOpenSourceProject,
  getProjectApplicants,
  listProjectGroups,
  createProjectGroup,
  assignStudentToGroup,
  removeStudentFromGroup,
  logStudentPerformance,
  getStudentPerformanceGraph,
  getProjectMessages,
  sendProjectMessage,
  updateApplicationStatus,
  getOpenSourceApplicationMessages,
  sendOpenSourceApplicationMessage,
  deleteOpenSourceProjectMessage,
  deleteOpenSourceApplicationMessage,
  OpenSourceProject,
  ProjectApplicant,
  OpenSourceGroup,
  StudentPerformanceGraphData,
  ProjectMessage
} from '@/lib/opensourceApi';
import {
  GitBranch,
  Plus,
  Users,
  Eye,
  TrendingUp,
  Award,
  Layers,
  Sparkles,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight,
  UserPlus,
  Trash2,
  AlertCircle,
  MessageSquare,
  Send,
  Link as LinkIcon,
  Image as ImageIcon,
  Check,
  Star
} from 'lucide-react';

const GithubIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);
import StudentProfileModal, { StudentProfileData } from '@/components/dashboard/StudentProfileModal';

interface Props {
  alumniId: string;
  collegeName?: string;
  alumniName?: string;
}

export default function AlumniOpenSourceManager({ alumniId, collegeName, alumniName }: Props) {
  const [projects, setProjects] = useState<OpenSourceProject[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Project Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [techStackStr, setTechStackStr] = useState('');
  const [maxContributors, setMaxContributors] = useState(5);
  const [guidelines, setGuidelines] = useState('');

  // Selected Project Management Modal (Applicants & Groups)
  const [selectedProject, setSelectedProject] = useState<OpenSourceProject | null>(null);
  const [modalTab, setModalTab] = useState<'applicants' | 'groups' | 'performance' | 'chat'>('applicants');

  // Chat state
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Applicants & Groups data
  const [applicants, setApplicants] = useState<ProjectApplicant[]>([]);
  const [groups, setGroups] = useState<OpenSourceGroup[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // New Group creation
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Group Assignment
  const [assigningStudentId, setAssigningStudentId] = useState<string | null>(null);
  const [targetGroupId, setTargetGroupId] = useState<string>('');
  const [targetRole, setTargetRole] = useState<string>('contributor');
  const [assignLoading, setAssignLoading] = useState(false);

  // Student Performance Data & Graph
  const [activeStudentForPerf, setActiveStudentForPerf] = useState<{ id: string; name: string } | null>(null);
  const [perfData, setPerfData] = useState<StudentPerformanceGraphData | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);

  // Add Performance Rating form
  const [metricName, setMetricName] = useState('Code Quality');
  const [scoreVal, setScoreVal] = useState(85);
  const [weekLabel, setWeekLabel] = useState('Week 1');
  const [feedbackNote, setFeedbackNote] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState('');

  // 1-on-1 Application Chat state
  const [chatApplication, setChatApplication] = useState<ProjectApplicant | null>(null);
  const [appMessages, setAppMessages] = useState<ProjectMessage[]>([]);
  const [appNewMessage, setAppNewMessage] = useState('');
  const [loadingAppMsgs, setLoadingAppMsgs] = useState(false);
  const [sendingAppMsg, setSendingAppMsg] = useState(false);

  // Profile modal
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<StudentProfileData | null>(null);

  // Chat Image Upload states
  const [uploadingImageTeam, setUploadingImageTeam] = useState(false);
  const fileInputRefTeam = useRef<HTMLInputElement>(null);
  
  const [uploadingImageApp, setUploadingImageApp] = useState(false);
  const fileInputRefApp = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProjects();
  }, [alumniId]);

  useEffect(() => {
    if (selectedProject && modalTab === 'chat') {
      loadMessages(selectedProject.id);
    }
  }, [selectedProject, modalTab]);

  const loadMessages = async (projectId: string) => {
    try {
      const msgs = await getProjectMessages(projectId);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newMessage.trim()) return;
    setSendingMsg(true);
    try {
      await sendProjectMessage(selectedProject.id, {
        sender_type: 'alumni',
        sender_id: alumniId,
        sender_name: 'Alumni Lead',
        message: newMessage.trim()
      });
      setNewMessage('');
      await loadMessages(selectedProject.id);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await deleteOpenSourceProjectMessage(msgId);
      if (selectedProject) {
        await loadMessages(selectedProject.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await listOpenSourceProjects(alumniId);
      setProjects(data);
    } catch (err) {
      console.error('Failed to load alumni open source projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProjectDetails = async (proj: OpenSourceProject, initialTab: 'applicants' | 'groups' | 'performance' | 'chat' = 'applicants') => {
    setSelectedProject(proj);
    setModalTab(initialTab);
    setDataLoading(true);
    setActiveStudentForPerf(null);
    setPerfData(null);

    try {
      const [appData, groupData] = await Promise.all([
        getProjectApplicants(proj.id),
        listProjectGroups(proj.id)
      ]);
      setApplicants(appData);
      setGroups(groupData);

      // default target group if groups exist
      if (groupData.length > 0) {
        setTargetGroupId(groupData[0].id);
      }

      // If initial tab is performance and there are applicants/members, select the first one
      if (initialTab === 'performance') {
        const firstCandidate = appData[0]?.student || groupData[0]?.members[0];
        if (firstCandidate) {
          handleSelectStudentForPerf(proj.id, firstCandidate.id, firstCandidate.name);
        }
      }
    } catch (err) {
      console.error('Failed to load project details:', err);
    } finally {
      setDataLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');

    try {
      const stack = techStackStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await createOpenSourceProject({
        alumni_id: alumniId,
        title,
        description: description || undefined,
        repo_url: repoUrl.trim() || undefined,
        tech_stack: stack,
        max_contributors: maxContributors,
        guidelines: guidelines || undefined
      });

      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setRepoUrl('');
      setTechStackStr('');
      setGuidelines('');
      loadProjects();
    } catch (err: any) {
      setCreateError(err.response?.data?.detail || 'Failed to create open source project');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newGroupName.trim()) return;
    setCreatingGroup(true);
    try {
      await createProjectGroup({
        project_id: selectedProject.id,
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || undefined
      });
      setNewGroupName('');
      setNewGroupDesc('');
      const updatedGroups = await listProjectGroups(selectedProject.id);
      setGroups(updatedGroups);
      if (updatedGroups.length > 0 && !targetGroupId) {
        setTargetGroupId(updatedGroups[0].id);
      }
    } catch (err) {
      console.error('Failed to create group:', err);
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleAssignStudent = async (studentId: string) => {
    if (!targetGroupId || !selectedProject) return;
    setAssignLoading(true);
    try {
      await assignStudentToGroup({
        group_id: targetGroupId,
        student_id: studentId,
        role: targetRole
      });
      setAssigningStudentId(null);

      // Refresh both applicants and groups
      const [appData, groupData] = await Promise.all([
        getProjectApplicants(selectedProject.id),
        listProjectGroups(selectedProject.id)
      ]);
      setApplicants(appData);
      setGroups(groupData);
    } catch (err) {
      console.error('Failed to assign student to group:', err);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRemoveMember = async (groupId: string, studentId: string) => {
    if (!selectedProject) return;
    try {
      await removeStudentFromGroup(groupId, studentId);
      const [appData, groupData] = await Promise.all([
        getProjectApplicants(selectedProject.id),
        listProjectGroups(selectedProject.id)
      ]);
      setApplicants(appData);
      setGroups(groupData);
    } catch (err) {
      console.error('Failed to remove student from group:', err);
    }
  };

  const handleStatusChange = async (applicationId: string, studentName: string, newStatus: string) => {
    if (!selectedProject) return;
    try {
      await updateApplicationStatus(applicationId, newStatus);
      if (newStatus === 'referred') {
        alert(`Referral request for ${studentName} initiated!`);
      } else if (newStatus === 'shortlisted') {
        alert(`${studentName} has been shortlisted.`);
      } else if (newStatus === 'hired') {
        alert(`${studentName} has been hired/referred.`);
      } else if (newStatus === 'rejected') {
        alert(`${studentName}'s application has been rejected.`);
      }
      const appData = await getProjectApplicants(selectedProject.id);
      setApplicants(appData);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status. Please try again.');
    }
  };

  const openApplicationChat = async (app: ProjectApplicant) => {
    setChatApplication(app);
    setLoadingAppMsgs(true);
    setAppMessages([]);
    try {
      const msgs = await getOpenSourceApplicationMessages(app.application_id);
      setAppMessages(msgs);
    } catch (err) {
      console.error('Failed to load application messages:', err);
    } finally {
      setLoadingAppMsgs(false);
    }
  };

  const handleSendAppMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatApplication || !appNewMessage.trim()) return;
    
    setSendingAppMsg(true);
    try {
      const msg = await sendOpenSourceApplicationMessage(chatApplication.application_id, {
        sender_type: 'alumni',
        sender_id: alumniId,
        sender_name: alumniName || 'Alumni',
        message: appNewMessage
      });
      setAppMessages([...appMessages, msg]);
      setAppNewMessage('');
    } catch (err) {
      console.error('Failed to send application message:', err);
    } finally {
      setSendingAppMsg(false);
    }
  };

  const handleDeleteAppMessage = async (msgId: string) => {
    try {
      await deleteOpenSourceApplicationMessage(msgId);
      if (chatApplication) {
        const msgs = await getOpenSourceApplicationMessages(chatApplication.application_id);
        setAppMessages(msgs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectStudentForPerf = async (projectId: string, studentId: string, studentName: string) => {
    setActiveStudentForPerf({ id: studentId, name: studentName });
    setPerfLoading(true);
    setRatingSuccess('');
    try {
      const data = await getStudentPerformanceGraph(projectId, studentId);
      setPerfData(data);
    } catch (err) {
      console.error('Failed to load student performance graph:', err);
    } finally {
      setPerfLoading(false);
    }
  };

  const handleSubmitPerformanceLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !activeStudentForPerf) return;
    setSubmittingRating(true);
    setRatingSuccess('');

    try {
      await logStudentPerformance({
        project_id: selectedProject.id,
        student_id: activeStudentForPerf.id,
        metric_name: metricName,
        score: scoreVal,
        week_label: weekLabel,
        feedback: feedbackNote.trim() || undefined
      });

      setRatingSuccess('Performance rating logged and graph updated!');
      setFeedbackNote('');
      // refresh graph
      const updatedGraph = await getStudentPerformanceGraph(selectedProject.id, activeStudentForPerf.id);
      setPerfData(updatedGraph);
      setTimeout(() => setRatingSuccess(''), 2500);
    } catch (err) {
      console.error('Failed to submit performance rating:', err);
    } finally {
      setSubmittingRating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2 border border-indigo-100">
            <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
            Open Source Lab
          </div>
          <h2 className="text-xl font-bold text-slate-800">Your Open Source Repositories</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Share production projects, form contributor teams from applicants, and track student performance.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-600/20 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Share New Open Source Project
        </button>
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-44 bg-slate-100 rounded-2xl animate-pulse" />
          <div className="h-44 bg-slate-100 rounded-2xl animate-pulse" />
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <GitBranch className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">No Open Source Projects Posted</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
            Post an open source repository to invite motivated student contributors from your college.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-all"
          >
            Share Project Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      proj.status === 'open'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {proj.status.replace('_', ' ')}
                  </span>

                  {proj.repo_url && (
                    <a
                      href={proj.repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-slate-900 transition-colors p-1"
                      title="View GitHub"
                    >
                      <GithubIcon className="w-4 h-4" />
                    </a>
                  )}
                </div>

                <h3 className="font-bold text-slate-800 text-base mb-1 line-clamp-1">{proj.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                  {proj.description || 'No description provided.'}
                </p>

                {proj.tech_stack && proj.tech_stack.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {proj.tech_stack.map((t) => (
                      <span key={t} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-3 mt-2 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">
                    {proj.applicant_count || 0} Applicants
                  </span>
                  <span>·</span>
                  <span className="font-semibold text-indigo-600">
                    {proj.group_count || 0} Teams Formed
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenProjectDetails(proj, 'applicants')}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <Users className="w-3.5 h-3.5" /> Manage & Groups
                  </button>
                  <button
                    onClick={() => handleOpenProjectDetails(proj, 'performance')}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <TrendingUp className="w-3.5 h-3.5" /> Performance Graph
                  </button>
                  <button
                    onClick={() => handleOpenProjectDetails(proj, 'chat')}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Team Chat
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Share Open Source Project</h3>
                <p className="text-xs text-slate-500">Post repository details for student contributors</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Project Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Task Queue & Telemetry Engine"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Briefly describe what this repository does and what contributors will build..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">GitHub Repo URL</label>
                  <input
                    type="url"
                    placeholder="https://github.com/org/repo"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max Contributors</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={maxContributors}
                    onChange={(e) => setMaxContributors(parseInt(e.target.value) || 5)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Required Tech Stack (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="React, TypeScript, FastAPI, PostgreSQL, Docker"
                  value={techStackStr}
                  onChange={(e) => setTechStackStr(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Guidelines & Initial Milestones</label>
                <textarea
                  rows={2}
                  placeholder="e.g. PR conventions, weekly sync times, coding standards, or issues to solve..."
                  value={guidelines}
                  onChange={(e) => setGuidelines(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 py-2.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  {createLoading ? 'Publishing...' : 'Publish Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROJECT DETAILS & MANAGEMENT MODAL (APPLICANTS, GROUPS, PERFORMANCE) */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                    Project Management
                  </span>
                  {selectedProject.repo_url && (
                    <a
                      href={selectedProject.repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1"
                    >
                      <GithubIcon className="w-3.5 h-3.5" /> Repo <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
                <h3 className="text-xl font-bold text-slate-900">{selectedProject.title}</h3>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-200 gap-2 pt-3 shrink-0">
              <button
                onClick={() => setModalTab('applicants')}
                className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all flex items-center gap-1.5 border-b-2 ${
                  modalTab === 'applicants'
                    ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Applicants ({applicants.length})
              </button>
              <button
                onClick={() => setModalTab('groups')}
                className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all flex items-center gap-1.5 border-b-2 ${
                  modalTab === 'groups'
                    ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Teams & Groups ({groups.length})
              </button>
              <button
                onClick={() => {
                  setModalTab('performance');
                  const firstCandidate = applicants[0]?.student || groups[0]?.members[0];
                  if (firstCandidate && !activeStudentForPerf) {
                    handleSelectStudentForPerf(selectedProject.id, firstCandidate.id, firstCandidate.name);
                  }
                }}
                className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all flex items-center gap-1.5 border-b-2 ${
                  modalTab === 'performance'
                    ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Student Performance Graph
              </button>
              <button
                onClick={() => setModalTab('chat')}
                className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all flex items-center gap-1.5 border-b-2 ${
                  modalTab === 'chat'
                    ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Team Chat
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto pt-4 pr-1">
              {dataLoading ? (
                <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                  Loading project data...
                </div>
              ) : null}

              {/* TAB 1: APPLICANTS */}
              {!dataLoading && modalTab === 'applicants' && (
                <div className="space-y-3">
                  {applicants.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      No students have applied for this project yet.
                    </div>
                  ) : (
                    applicants.map((app) => (
                      <div
                        key={app.application_id}
                        className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-slate-900 text-sm">{app.student.name}</h4>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-extrabold rounded-md">
                              <Sparkles className="w-3 h-3 text-indigo-600" /> Score: {app.hireability?.score || 300}
                            </span>
                            {app.assigned_group ? (
                              <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                In {app.assigned_group.name}
                              </span>
                            ) : null}
                            {app.status === 'shortlisted' && (
                              <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                Shortlisted
                              </span>
                            )}
                            {app.status === 'hired' && (
                              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                Hired/Referred
                              </span>
                            )}
                            {app.status === 'rejected' && (
                              <span className="text-[10px] font-semibold bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                                Rejected
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            {app.student.email} · {app.student.branch || 'Student'} · Year {app.student.year || 3}
                          </p>

                          {app.pitch && (
                            <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded-xl border border-slate-100 mt-2">
                              &quot;{app.pitch}&quot;
                            </p>
                          )}

                          {/* Skills */}
                          {app.skills && app.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {app.skills.slice(0, 4).map((sk, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] px-2 py-0.5 bg-white text-slate-700 rounded border border-slate-200 font-medium"
                                >
                                  {sk.skill_name}
                                  {sk.verification_level >= 1 ? ' ✓' : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                          {/* Assign to Group Button / Form */}
                          {groups.length > 0 ? (
                            <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200">
                              <select
                                value={targetGroupId}
                                onChange={(e) => setTargetGroupId(e.target.value)}
                                className="text-[11px] p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium"
                              >
                                {groups.map((g) => (
                                  <option key={g.id} value={g.id}>
                                    {g.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleAssignStudent(app.student.id)}
                                disabled={assignLoading}
                                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-all disabled:opacity-50"
                              >
                                {app.assigned_group ? 'Reassign' : 'Add to Team'}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Create a team in tab 2 first</span>
                          )}

                          <div className="flex gap-1 items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                            <button
                              disabled={app.status === 'shortlisted' || app.status === 'hired' || app.status === 'rejected'}
                              onClick={() => handleStatusChange(app.application_id, app.student.name, 'shortlisted')}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Shortlist"
                            >
                              <Star className="w-4 h-4" />
                            </button>
                            <button
                              disabled={app.status === 'hired' || app.status === 'rejected'}
                              onClick={() => handleStatusChange(app.application_id, app.student.name, 'hired')}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Hire/Refer"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              disabled={app.status === 'rejected' || app.status === 'hired'}
                              onClick={() => handleStatusChange(app.application_id, app.student.name, 'rejected')}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <div className="w-px h-5 bg-slate-200 mx-0.5"></div>
                            <button
                              onClick={() => openApplicationChat(app)}
                              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold px-2"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> Chat
                            </button>
                          </div>
                          <button
                            onClick={() =>
                              setSelectedStudentProfile({
                                student: app.student,
                                college_name: app.college_name || collegeName,
                                skills: app.skills,
                                hireability: app.hireability
                              })
                            }
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> Profile
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 2: GROUPS / TEAMS */}
              {!dataLoading && modalTab === 'groups' && (
                <div className="space-y-6">
                  {/* Create Group Form */}
                  <form
                    onSubmit={handleCreateGroup}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end"
                  >
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Create New Team / Subgroup
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Core Engine Team, Frontend & UI, Testing..."
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Team Focus / Description
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Builds authentication and GraphQL endpoints"
                        value={newGroupDesc}
                        onChange={(e) => setNewGroupDesc(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={creatingGroup}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" /> Add Team
                    </button>
                  </form>

                  {/* Existing Groups Grid */}
                  {groups.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      No groups created yet. Use the form above to organize contributors into teams.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {groups.map((grp) => (
                        <div key={grp.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                                <Layers className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm">{grp.name}</h4>
                                {grp.description && (
                                  <p className="text-xs text-slate-500">{grp.description}</p>
                                )}
                              </div>
                            </div>
                            <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                              {grp.members?.length || 0} Members
                            </span>
                          </div>

                          {/* Member chips */}
                          {!grp.members || grp.members.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">
                              No members assigned yet. Assign candidates from the Applicants tab.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {grp.members.map((m) => (
                                <div
                                  key={m.id}
                                  className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                                      {m.name.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-slate-800">{m.name}</p>
                                      <p className="text-[10px] text-slate-500">
                                        Role: <span className="font-semibold uppercase">{m.role || 'Contributor'}</span>
                                        {m.avg_performance ? ` · Avg Score: ${m.avg_performance}%` : ''}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => {
                                        setModalTab('performance');
                                        handleSelectStudentForPerf(selectedProject.id, m.id, m.name);
                                      }}
                                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1"
                                    >
                                      <TrendingUp className="w-3 h-3" /> Graph
                                    </button>
                                    <button
                                      onClick={() => handleRemoveMember(grp.id, m.id)}
                                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                      title="Remove from team"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: INDIVIDUAL STUDENT PERFORMANCE GRAPH */}
              {!dataLoading && modalTab === 'performance' && (
                <div className="space-y-6">
                  {/* Student Selector Bar */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Select Student Contributor:
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {applicants.map((app) => (
                        <button
                          key={app.student.id}
                          onClick={() =>
                            handleSelectStudentForPerf(
                              selectedProject.id,
                              app.student.id,
                              app.student.name
                            )
                          }
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                            activeStudentForPerf?.id === app.student.id
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          <div className="w-4 h-4 rounded-full bg-white/20 text-current flex items-center justify-center text-[9px] font-bold">
                            {app.student.name.charAt(0)}
                          </div>
                          {app.student.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {perfLoading ? (
                    <div className="h-56 bg-slate-100 rounded-2xl animate-pulse" />
                  ) : perfData && activeStudentForPerf ? (
                    <div className="space-y-6">
                      {/* Overall Metric Header */}
                      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                        <div>
                          <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-300">
                            Performance Radar: {activeStudentForPerf.name}
                          </span>
                          <h4 className="text-3xl font-extrabold mt-1">
                            {perfData.logs.length === 0 ? (
                              <span className="text-2xl text-slate-300">Not Evaluated Yet</span>
                            ) : (
                              <>
                                {perfData.overall_performance_score} <span className="text-base text-indigo-400">/ 100</span>
                              </>
                            )}
                          </h4>
                          <p className="text-xs text-slate-300 mt-1">
                            {perfData.logs.length === 0
                              ? "No evaluations recorded yet for this project. Once the student begins tasks, record their performance below."
                              : "Calculated across Code Quality, Velocity, Collaboration & Consistency."}
                          </p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
                          <Award className="w-7 h-7 text-amber-400" />
                        </div>
                      </div>

                      {/* Visual Contribution Breakdown (Bar Chart) */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
                          Individual Competency Breakdown
                        </h4>
                        {perfData.metric_breakdown.length === 0 ? (
                          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <p className="text-xs text-slate-600 font-semibold">
                              No performance evaluations recorded yet for {activeStudentForPerf.name}.
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              Submit a rating below once they begin contributing to this project.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {perfData.metric_breakdown.map((item) => (
                              <div key={item.metric} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div className="flex justify-between items-center text-xs font-bold text-slate-800 mb-1">
                                  <span>{item.metric}</span>
                                  <span className="text-indigo-600">{item.score}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-indigo-600 h-2 rounded-full transition-all duration-700"
                                    style={{ width: `${Math.min(100, Math.max(5, item.score))}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Weekly Progress Progression Chart */}
                      {perfData.weekly_progress.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
                            Weekly Score Timeline
                          </h4>
                          <div className="flex items-end gap-3 h-28 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            {perfData.weekly_progress.map((w) => (
                              <div key={w.week} className="flex-1 flex flex-col items-center h-full justify-end group">
                                <span className="text-[10px] font-bold text-indigo-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {w.average_score}%
                                </span>
                                <div
                                  className="w-full bg-indigo-500 rounded-t-md transition-all group-hover:bg-indigo-600"
                                  style={{ height: `${Math.min(100, Math.max(15, w.average_score))}%` }}
                                />
                                <span className="text-[10px] font-medium text-slate-500 mt-2 truncate w-full text-center">
                                  {w.week}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Log New Performance Rating Form */}
                      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            Record New Performance Rating for {activeStudentForPerf.name}
                          </h4>
                          {ratingSuccess && (
                            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {ratingSuccess}
                            </span>
                          )}
                        </div>

                        <form onSubmit={handleSubmitPerformanceLog} className="space-y-3 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block font-bold text-slate-700 mb-1">Metric</label>
                              <select
                                value={metricName}
                                onChange={(e) => setMetricName(e.target.value)}
                                className="w-full p-2 bg-white border border-slate-200 rounded-xl outline-none font-medium"
                              >
                                <option value="Code Quality">Code Quality</option>
                                <option value="Task Velocity">Task Velocity</option>
                                <option value="Collaboration">Collaboration</option>
                                <option value="Commit Consistency">Commit Consistency</option>
                                <option value="Problem Solving">Problem Solving</option>
                              </select>
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 mb-1">
                                Score (0 - 100): <span className="text-indigo-600 font-extrabold">{scoreVal}</span>
                              </label>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={scoreVal}
                                onChange={(e) => setScoreVal(parseInt(e.target.value) || 0)}
                                className="w-full accent-indigo-600 mt-2"
                              />
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 mb-1">Sprint / Week</label>
                              <input
                                type="text"
                                value={weekLabel}
                                onChange={(e) => setWeekLabel(e.target.value)}
                                placeholder="Week 1 or Sprint 2"
                                className="w-full p-2 bg-white border border-slate-200 rounded-xl outline-none font-medium"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Feedback & Commentary</label>
                            <input
                              type="text"
                              placeholder="e.g. Excellent unit tests and addressed PR review comments promptly"
                              value={feedbackNote}
                              onChange={(e) => setFeedbackNote(e.target.value)}
                              className="w-full p-2 bg-white border border-slate-200 rounded-xl outline-none font-medium"
                            />
                          </div>

                          <div className="text-right">
                            <button
                              type="submit"
                              disabled={submittingRating}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                            >
                              {submittingRating ? 'Saving...' : 'Save Rating & Update Graph'}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      Select a student above to inspect their performance graph.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: TEAM CHAT */}
              {!dataLoading && modalTab === 'chat' && (() => {
                const handleInsertLinkTeam = () => {
                  const url = prompt("Enter the link URL (e.g. https://github.com/...)");
                  if (!url) return;
                  const text = prompt("Enter the text to display for the link", "Click here") || "Link";
                  setNewMessage(prev => prev + (prev.endsWith(' ') ? '' : ' ') + `[${text}](${url}) `);
                };

                const handleImageUploadTeam = async (e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  setUploadingImageTeam(true);
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
                    setUploadingImageTeam(false);
                    if (fileInputRefTeam.current) fileInputRefTeam.current.value = "";
                  }
                };

                return (
                  <div className="flex flex-col h-[500px] border border-slate-200 rounded-2xl bg-slate-50 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {messages.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-xs">
                          No messages yet. Start the conversation with your team!
                        </div>
                      ) : (
                        messages.map(msg => {
                          const isMe = msg.sender_type === 'alumni' && msg.sender_id === alumniId;
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
                    <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex flex-col gap-2">
                      <div className="flex gap-2">
                        <input type="file" accept="image/*" className="hidden" ref={fileInputRefTeam} onChange={handleImageUploadTeam} />
                        <button
                          type="button"
                          onClick={handleInsertLinkTeam}
                          className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <LinkIcon className="w-3.5 h-3.5" /> Insert Link
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRefTeam.current?.click()}
                          disabled={uploadingImageTeam}
                          className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
                        >
                          <ImageIcon className="w-3.5 h-3.5" /> {uploadingImageTeam ? 'Uploading...' : 'Post Image'}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Type a message to your team..."
                          value={newMessage}
                          onChange={e => setNewMessage(e.target.value)}
                          className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="submit"
                          disabled={sendingMsg || !newMessage.trim()}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </form>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Student Profile Modal */}
      <StudentProfileModal
        data={selectedStudentProfile}
        onClose={() => setSelectedStudentProfile(null)}
      />

      {/* 1-on-1 Application Chat Modal */}
      {chatApplication && (() => {
        const handleInsertLinkApp = () => {
          const url = prompt("Enter the link URL (e.g. https://github.com/...)");
          if (!url) return;
          const text = prompt("Enter the text to display for the link", "Click here") || "Link";
          setAppNewMessage(prev => prev + (prev.endsWith(' ') ? '' : ' ') + `[${text}](${url}) `);
        };

        const handleImageUploadApp = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (!file) return;

          setUploadingImageApp(true);
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
              setAppNewMessage(prev => prev + (prev.endsWith(' ') ? '' : ' ') + `![Image](${data.url}) `);
            }
          } catch (error) {
            console.error("Image upload failed:", error);
            alert("Failed to upload image. Please try again.");
          } finally {
            setUploadingImageApp(false);
            if (fileInputRefApp.current) fileInputRefApp.current.value = "";
          }
        };

        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg h-[600px] flex flex-col overflow-hidden my-8 animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/80">
                <div>
                  <h3 className="font-bold text-slate-800">Chat with {chatApplication.student.name}</h3>
                  <p className="text-xs text-slate-500">Discuss hiring, referral, or project details</p>
                </div>
                <button
                  onClick={() => setChatApplication(null)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                {loadingAppMsgs ? (
                  <div className="text-center text-xs text-slate-400 py-10">Loading messages...</div>
                ) : appMessages.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 py-10">No messages yet. Start the conversation!</div>
                ) : (
                  appMessages.map((msg) => {
                    const isMe = msg.sender_type === 'alumni' && msg.sender_id === alumniId;
                    return (
                      <div key={msg.id} className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-0.5 ml-1">
                          {isMe && (
                            <button
                              onClick={() => handleDeleteAppMessage(msg.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-1"
                              title="Delete message"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                          <span className="text-[10px] text-slate-400 font-medium">
                            {isMe ? 'You' : msg.sender_name || 'Student'}
                          </span>
                        </div>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm prose max-w-none ${
                            isMe 
                              ? 'bg-indigo-600 text-white rounded-tr-sm prose-invert' 
                              : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'
                          }`}
                        >
                          <ReactMarkdown>
                            {msg.message}
                          </ReactMarkdown>
                        </div>
                        <span className="text-[9px] text-slate-400 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendAppMessage} className="p-3 border-t border-slate-100 bg-white flex flex-col gap-2">
                <div className="flex gap-2 mb-1">
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRefApp} onChange={handleImageUploadApp} />
                  <button
                    type="button"
                    onClick={handleInsertLinkApp}
                    className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <LinkIcon className="w-3.5 h-3.5" /> Insert Link
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRefApp.current?.click()}
                    disabled={uploadingImageApp}
                    className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> {uploadingImageApp ? 'Uploading...' : 'Post Image'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Message ${chatApplication.student.name}...`}
                    value={appNewMessage}
                    onChange={(e) => setAppNewMessage(e.target.value)}
                    className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={sendingAppMsg || !appNewMessage.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
