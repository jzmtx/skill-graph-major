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
      const poll = setInterval(() => {
        loadMessages(selectedProject.id);
      }, 2500);
      return () => clearInterval(poll);
    }
  }, [selectedProject, modalTab]);

  useEffect(() => {
    if (chatApplication) {
      const poll = setInterval(async () => {
        try {
          const msgs = await getOpenSourceApplicationMessages(chatApplication.application_id);
          setAppMessages(msgs);
        } catch {}
      }, 2500);
      return () => clearInterval(poll);
    }
  }, [chatApplication]);

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
        sender_name: alumniName || 'Alumni Lead',
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2 border border-emerald-200">
            <GitBranch className="w-3.5 h-3.5 text-emerald-800" />
            Open Source Lab
          </div>
          <h2 className="text-xl font-bold text-stone-900">Your Open Source Repositories</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Share production projects, form contributor teams from applicants, and track student performance.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" /> Share New Open Source Project
        </button>
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-44 bg-stone-100 rounded-2xl animate-pulse" />
          <div className="h-44 bg-stone-100 rounded-2xl animate-pulse" />
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-xs">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-200">
            <GitBranch className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-stone-900 mb-1">No Open Source Projects Posted</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mb-5">
            Post an open source repository to invite motivated student contributors from your college.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-emerald-800 text-white text-xs font-semibold rounded-xl hover:bg-emerald-900 transition-colors"
          >
            Share Project Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      proj.status === 'open'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-stone-100 text-stone-600 border-stone-200'
                    }`}
                  >
                    {proj.status.replace('_', ' ')}
                  </span>

                  {proj.repo_url && (
                    <a
                      href={proj.repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-stone-400 hover:text-stone-900 transition-colors p-1"
                      title="View GitHub"
                    >
                      <GithubIcon className="w-4 h-4" />
                    </a>
                  )}
                </div>

                <h3 className="font-bold text-stone-900 text-base mb-1 line-clamp-1">{proj.title}</h3>
                <p className="text-xs text-stone-500 line-clamp-2 mb-3">
                  {proj.description || 'No description provided.'}
                </p>

                {proj.tech_stack && proj.tech_stack.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {proj.tech_stack.map((t) => (
                      <span key={t} className="text-[10px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-medium border border-stone-200">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-stone-100 pt-3 mt-2 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-stone-500">
                  <span className="font-semibold text-stone-700">
                    {proj.applicant_count || 0} Applicants
                  </span>
                  <span>·</span>
                  <span className="font-semibold text-emerald-800">
                    {proj.group_count || 0} Teams Formed
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenProjectDetails(proj, 'applicants')}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 border border-stone-200"
                  >
                    <Users className="w-3.5 h-3.5" /> Teams & Applicants
                  </button>
                  <button
                    onClick={() => handleOpenProjectDetails(proj, 'performance')}
                    className="px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <TrendingUp className="w-3.5 h-3.5" /> Metrics
                  </button>
                  <button
                    onClick={() => handleOpenProjectDetails(proj, 'chat')}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Chat
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 md:p-8 shadow-xl border border-stone-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 mb-6">
              <div>
                <h3 className="text-base font-bold text-stone-900">Share Open Source Project</h3>
                <p className="text-xs text-stone-500">Post repository details for student contributors</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Project Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Consensus Engine"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 text-stone-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Repository URL (GitHub / GitLab)</label>
                <input
                  type="url"
                  placeholder="https://github.com/organization/repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Tech Stack (comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Rust, Tokio, gRPC"
                    value={techStackStr}
                    onChange={(e) => setTechStackStr(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Max Contributors</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={maxContributors}
                    onChange={(e) => setMaxContributors(parseInt(e.target.value) || 5)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Project Overview</label>
                <textarea
                  rows={2}
                  placeholder="Summary of project goals, architecture, and expected deliverables..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 text-stone-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Contribution Guidelines & Prerequisites</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Must understand async concurrency and have working knowledge of Git workflows."
                  value={guidelines}
                  onChange={(e) => setGuidelines(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 text-stone-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 py-2.5 font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {createLoading ? 'Sharing...' : 'Publish Repository'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE PROJECT MODAL (Applicants, Groups, Performance, Chat) */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-3 md:p-6">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-xl border border-stone-200 max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 mb-4 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                    Repository Management
                  </span>
                  {selectedProject.repo_url && (
                    <a
                      href={selectedProject.repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1"
                    >
                      <GithubIcon className="w-3.5 h-3.5" /> View Repo
                    </a>
                  )}
                </div>
                <h3 className="text-lg font-bold text-stone-900">{selectedProject.title}</h3>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-Tabs Navigation */}
            <div className="flex gap-2 border-b border-stone-200 mb-4 pb-0 shrink-0">
              <button
                onClick={() => setModalTab('applicants')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                  modalTab === 'applicants'
                    ? 'border-emerald-800 text-emerald-800 bg-emerald-50/50'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Applicants ({applicants.length})
              </button>
              <button
                onClick={() => setModalTab('groups')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                  modalTab === 'groups'
                    ? 'border-emerald-800 text-emerald-800 bg-emerald-50/50'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Teams / Subgroups ({groups.length})
              </button>
              <button
                onClick={() => setModalTab('performance')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                  modalTab === 'performance'
                    ? 'border-emerald-800 text-emerald-800 bg-emerald-50/50'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Performance Metrics
              </button>
              <button
                onClick={() => setModalTab('chat')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                  modalTab === 'chat'
                    ? 'border-emerald-800 text-emerald-800 bg-emerald-50/50'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Team Chat
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto pr-1">
              {dataLoading ? (
                <div className="text-center py-12 text-stone-400 text-xs">Loading data...</div>
              ) : null}

              {/* TAB 1: APPLICANTS */}
              {!dataLoading && modalTab === 'applicants' && (
                <div className="space-y-3">
                  {applicants.length === 0 ? (
                    <div className="text-center py-12 text-stone-400 text-xs">
                      No students have applied for this project yet.
                    </div>
                  ) : (
                    applicants.map((app) => (
                      <div
                        key={app.application_id}
                        className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-stone-900 text-xs">{app.student.name}</h4>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-md border border-emerald-200">
                              Score: {app.hireability?.score || 300}
                            </span>
                            {app.assigned_group ? (
                              <span className="text-[10px] font-semibold bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full border border-stone-200">
                                In {app.assigned_group.name}
                              </span>
                            ) : null}
                            {app.status === 'shortlisted' && (
                              <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                                Shortlisted
                              </span>
                            )}
                            {app.status === 'hired' && (
                              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                                Referred
                              </span>
                            )}
                            {app.status === 'rejected' && (
                              <span className="text-[10px] font-semibold bg-rose-50 text-rose-800 px-2 py-0.5 rounded-full border border-rose-200">
                                Rejected
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-500">
                            {app.student.email} · {app.student.branch || 'Student'} · Year {app.student.year || 3}
                          </p>

                          {app.pitch && (
                            <p className="text-xs text-stone-600 italic bg-white p-2.5 rounded-lg border border-stone-200 mt-2">
                              &quot;{app.pitch}&quot;
                            </p>
                          )}

                          {/* Skills */}
                          {app.skills && app.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {app.skills.slice(0, 4).map((sk, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] px-2 py-0.5 bg-white text-stone-700 rounded border border-stone-200 font-medium"
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
                            <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-stone-200">
                              <select
                                value={targetGroupId}
                                onChange={(e) => setTargetGroupId(e.target.value)}
                                className="text-[11px] p-1.5 bg-stone-50 border border-stone-200 rounded-md outline-none font-medium text-stone-800"
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
                                className="px-2.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-md text-[11px] font-semibold transition-colors disabled:opacity-50"
                              >
                                {app.assigned_group ? 'Reassign' : 'Add to Team'}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-stone-400 italic">Create a team in tab 2 first</span>
                          )}

                          <div className="flex gap-1 items-center bg-white p-1 rounded-lg border border-stone-200 shadow-xs">
                            <button
                              disabled={app.status === 'shortlisted' || app.status === 'hired' || app.status === 'rejected'}
                              onClick={() => handleStatusChange(app.application_id, app.student.name, 'shortlisted')}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-amber-200"
                              title="Shortlist"
                            >
                              <Star className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={app.status === 'hired' || app.status === 'rejected'}
                              onClick={() => handleStatusChange(app.application_id, app.student.name, 'hired')}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-200"
                              title="Hire/Refer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={app.status === 'rejected' || app.status === 'hired'}
                              onClick={() => handleStatusChange(app.application_id, app.student.name, 'rejected')}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-rose-200"
                              title="Reject"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            <div className="w-px h-5 bg-stone-200 mx-0.5"></div>
                            <button
                              onClick={() => openApplicationChat(app)}
                              className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-md transition-colors flex items-center gap-1 text-xs font-semibold px-2 border border-stone-200"
                            >
                              <MessageSquare className="w-3 h-3" /> Chat
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
                            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
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
                    className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end"
                  >
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-stone-700 uppercase tracking-wider mb-1">
                        Create New Team / Subgroup
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Core Engine Team, Testing & Verification..."
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700 font-medium text-stone-900"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-stone-700 uppercase tracking-wider mb-1">
                        Team Focus / Objective
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Builds query optimizers and benchmarks"
                        value={newGroupDesc}
                        onChange={(e) => setNewGroupDesc(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700 font-medium text-stone-900"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={creatingGroup}
                      className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold transition-colors shrink-0 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" /> Add Team
                    </button>
                  </form>

                  {/* Existing Groups Grid */}
                  {groups.length === 0 ? (
                    <div className="text-center py-10 text-stone-400 text-xs">
                      No groups created yet. Use the form above to organize contributors into teams.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {groups.map((grp) => (
                        <div key={grp.id} className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
                          <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-xs border border-emerald-200">
                                <Layers className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-bold text-stone-900 text-xs">{grp.name}</h4>
                                {grp.description && (
                                  <p className="text-[11px] text-stone-500">{grp.description}</p>
                                )}
                              </div>
                            </div>
                            <span className="text-xs font-semibold bg-stone-100 text-stone-700 px-2.5 py-1 rounded-full border border-stone-200">
                              {grp.members?.length || 0} Members
                            </span>
                          </div>

                          {/* Member chips */}
                          {!grp.members || grp.members.length === 0 ? (
                            <p className="text-xs text-stone-400 italic">
                              No members assigned yet. Assign candidates from the Applicants tab.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {grp.members.map((m) => (
                                <div
                                  key={m.id}
                                  className="flex items-center justify-between bg-stone-50 p-2.5 rounded-lg border border-stone-200"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-6 h-6 rounded-full bg-emerald-800 text-white font-bold text-[10px] flex items-center justify-center">
                                      {m.name.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-stone-900">{m.name}</p>
                                      <p className="text-[10px] text-stone-500">
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
                                      className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[10px] font-semibold rounded-md transition-colors flex items-center gap-1 border border-stone-200"
                                    >
                                      <TrendingUp className="w-3 h-3 text-emerald-800" /> Graph
                                    </button>
                                    <button
                                      onClick={() => handleRemoveMember(grp.id, m.id)}
                                      className="p-1 text-stone-400 hover:text-rose-600 transition-colors"
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
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                    <label className="block text-[11px] font-semibold text-stone-700 uppercase tracking-wider mb-2">
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
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                            activeStudentForPerf?.id === app.student.id
                              ? 'bg-emerald-800 text-white shadow-xs'
                              : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
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
                    <div className="h-56 bg-stone-100 rounded-xl animate-pulse" />
                  ) : perfData && activeStudentForPerf ? (
                    <div className="space-y-6">
                      {/* Overall Metric Header */}
                      <div className="bg-emerald-800 border border-emerald-700 text-white rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                        <div>
                          <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-200">
                            Performance Assessment: {activeStudentForPerf.name}
                          </span>
                          <h4 className="text-2xl font-bold mt-1">
                            {perfData.logs.length === 0 ? (
                              <span className="text-xl text-stone-200">Not Evaluated Yet</span>
                            ) : (
                              <>
                                {perfData.overall_performance_score} <span className="text-sm text-emerald-200">/ 100</span>
                              </>
                            )}
                          </h4>
                          <p className="text-xs text-stone-200 mt-1">
                            {perfData.logs.length === 0
                              ? "No evaluations recorded yet for this project. Once the student begins tasks, record their performance below."
                              : "Calculated across Code Quality, Velocity, Collaboration & Reliability."}
                          </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
                          <Award className="w-6 h-6 text-amber-300" />
                        </div>
                      </div>

                      {/* Visual Contribution Breakdown (Bar Chart) */}
                      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
                        <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-4">
                          Individual Competency Breakdown
                        </h4>
                        {perfData.metric_breakdown.length === 0 ? (
                          <div className="text-center py-8 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                            <p className="text-xs text-stone-600 font-semibold">
                              No performance evaluations recorded yet for {activeStudentForPerf.name}.
                            </p>
                            <p className="text-[11px] text-stone-400 mt-1">
                              Submit a rating below once they begin contributing to this project.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {perfData.metric_breakdown.map((item) => (
                              <div key={item.metric} className="bg-stone-50 p-3 rounded-lg border border-stone-200">
                                <div className="flex justify-between items-center text-xs font-semibold text-stone-800 mb-1">
                                  <span>{item.metric}</span>
                                  <span className="text-emerald-800 font-bold">{item.score}%</span>
                                </div>
                                <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-emerald-800 h-2 rounded-full transition-all duration-700"
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
                        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
                          <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-4">
                            Weekly Score Timeline
                          </h4>
                          <div className="flex items-end gap-3 h-28 bg-stone-50 p-4 rounded-lg border border-stone-200">
                            {perfData.weekly_progress.map((w) => (
                              <div key={w.week} className="flex-1 flex flex-col items-center h-full justify-end group">
                                <span className="text-[10px] font-bold text-emerald-800 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {w.average_score}%
                                </span>
                                <div
                                  className="w-full bg-emerald-700 rounded-t-sm transition-all group-hover:bg-emerald-800"
                                  style={{ height: `${Math.min(100, Math.max(15, w.average_score))}%` }}
                                />
                                <span className="text-[10px] font-medium text-stone-500 mt-2 truncate w-full text-center">
                                  {w.week}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Log New Performance Rating Form */}
                      <div className="bg-stone-50 rounded-xl border border-stone-200 p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                            Record Evaluation for {activeStudentForPerf.name}
                          </h4>
                          {ratingSuccess && (
                            <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> {ratingSuccess}
                            </span>
                          )}
                        </div>

                        <form onSubmit={handleSubmitPerformanceLog} className="space-y-3 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block font-semibold text-stone-700 mb-1">Metric</label>
                              <select
                                value={metricName}
                                onChange={(e) => setMetricName(e.target.value)}
                                className="w-full p-2 bg-white border border-stone-200 rounded-lg outline-none font-medium text-stone-800"
                              >
                                <option value="Code Quality">Code Quality</option>
                                <option value="Development Velocity">Development Velocity</option>
                                <option value="Collaboration & Teamwork">Collaboration & Teamwork</option>
                                <option value="Consistency & Reliability">Consistency & Reliability</option>
                                <option value="Documentation & Testing">Documentation & Testing</option>
                              </select>
                            </div>

                            <div>
                              <label className="block font-semibold text-stone-700 mb-1">
                                Score (0 - 100): <span className="text-emerald-800 font-bold">{scoreVal}</span>
                              </label>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={scoreVal}
                                onChange={(e) => setScoreVal(parseInt(e.target.value) || 0)}
                                className="w-full accent-emerald-800 mt-2"
                              />
                            </div>

                            <div>
                              <label className="block font-semibold text-stone-700 mb-1">Sprint / Period</label>
                              <input
                                type="text"
                                value={weekLabel}
                                onChange={(e) => setWeekLabel(e.target.value)}
                                placeholder="Week 1 or Sprint 2"
                                className="w-full p-2 bg-white border border-stone-200 rounded-lg outline-none font-medium text-stone-800"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block font-semibold text-stone-700 mb-1">Feedback & Notes</label>
                            <input
                              type="text"
                              placeholder="e.g. Clean async implementation and addressed code review comments promptly"
                              value={feedbackNote}
                              onChange={(e) => setFeedbackNote(e.target.value)}
                              className="w-full p-2 bg-white border border-stone-200 rounded-lg outline-none font-medium text-stone-800"
                            />
                          </div>

                          <div className="text-right">
                            <button
                              type="submit"
                              disabled={submittingRating}
                              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                            >
                              {submittingRating ? 'Saving...' : 'Save Evaluation & Update Graph'}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-stone-400 text-xs">
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
                  <div className="flex flex-col h-[520px] border border-stone-200 rounded-xl bg-stone-50 overflow-hidden relative">
                    {/* Subtle Orange Accent Top Trim */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-700 via-orange-500 to-amber-500" />

                    {/* Quick Team Prompt Pills Deck */}
                    <div className="px-3.5 py-2 border-b border-stone-200 bg-stone-50/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none mt-1">
                      {[
                        { label: "Sprint Review", text: "Team, let us review milestone pull requests and review queue updates for this week." },
                        { label: "Architecture Guidance", text: "Please share questions regarding API design, schema models, or state management." },
                        { label: "Merge Guidelines", text: "Ensure all PRs have clean commit messages and pass automated linter requirements." },
                        { label: "Office Hours", text: "I will be available for quick technical unblocking sessions this afternoon." }
                      ].map((prompt, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => setNewMessage(prompt.text)}
                          className="shrink-0 px-2.5 py-1 bg-white border border-stone-200 hover:border-orange-300 hover:bg-orange-50/40 text-[10px] font-medium text-stone-700 hover:text-orange-950 rounded-lg transition-all shadow-2xs"
                        >
                          {prompt.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/40">
                      {messages.length === 0 ? (
                        <div className="text-center py-12 text-stone-400 text-xs">
                          No messages yet. Select a prompt pill above or send a message to start collaboration!
                        </div>
                      ) : (
                        messages.map(msg => {
                          const isMe = msg.sender_type === 'alumni' && msg.sender_id === alumniId;
                          return (
                            <div key={msg.id} className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}>
                              <div className="flex items-center gap-2 mb-1 px-1">
                                {isMe && (
                                  <button
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-500 hover:text-rose-700 p-0.5"
                                    title="Delete message"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                                <span className="text-[10px] text-stone-500 font-semibold">
                                  {msg.sender_name} ({msg.sender_type})
                                </span>
                              </div>
                              <div className={`px-3.5 py-2 rounded-xl text-xs max-w-[80%] leading-relaxed ${
                                isMe 
                                  ? 'bg-emerald-800 text-white rounded-br-xs' 
                                  : 'bg-white border border-stone-200 text-stone-800 rounded-bl-xs shadow-2xs border-l-[3px] border-l-orange-500'
                              }`}>
                                <ReactMarkdown>
                                  {msg.message}
                                </ReactMarkdown>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-stone-200 flex flex-col gap-2">
                      <div className="flex gap-2">
                        <input type="file" accept="image/*" className="hidden" ref={fileInputRefTeam} onChange={handleImageUploadTeam} />
                        <button
                          type="button"
                          onClick={handleInsertLinkTeam}
                          className="px-2.5 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center gap-1 border border-stone-200"
                        >
                          <LinkIcon className="w-3.5 h-3.5" /> Link
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRefTeam.current?.click()}
                          disabled={uploadingImageTeam}
                          className="px-2.5 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center gap-1 border border-stone-200 disabled:opacity-50"
                        >
                          <ImageIcon className="w-3.5 h-3.5" /> {uploadingImageTeam ? 'Uploading...' : 'Image'}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Type a message or click a prompt pill above..."
                          value={newMessage}
                          onChange={e => setNewMessage(e.target.value)}
                          className="flex-1 p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-400 focus:bg-white text-stone-900 transition-all"
                        />
                        <button
                          type="submit"
                          disabled={sendingMsg || !newMessage.trim()}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-800 to-emerald-900 border border-orange-400/40 text-white rounded-xl text-xs font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all disabled:opacity-50 flex items-center justify-center shadow-xs"
                        >
                          <Send className="w-3.5 h-3.5 text-orange-200" />
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
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-lg h-[600px] flex flex-col overflow-hidden my-8 animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-stone-200 bg-stone-50">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Dialogue with {chatApplication.student.name}</h3>
                  <p className="text-xs text-stone-500">Applicant review and technical mentorship</p>
                </div>
                <button
                  onClick={() => setChatApplication(null)}
                  className="p-1.5 hover:bg-stone-200 rounded-lg transition-colors text-stone-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/50">
                {loadingAppMsgs ? (
                  <div className="text-center text-xs text-stone-400 py-10">Loading messages...</div>
                ) : appMessages.length === 0 ? (
                  <div className="text-center text-xs text-stone-400 py-10">No messages yet. Send a note to start the conversation.</div>
                ) : (
                  appMessages.map((msg) => {
                    const isMe = msg.sender_type === 'alumni' && msg.sender_id === alumniId;
                    return (
                      <div key={msg.id} className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-0.5 px-1">
                          {isMe && (
                            <button
                              onClick={() => handleDeleteAppMessage(msg.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-500 hover:text-rose-700 p-0.5"
                              title="Delete message"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                          <span className="text-[10px] text-stone-500 font-semibold">
                            {isMe ? 'You' : msg.sender_name || 'Student'}
                          </span>
                        </div>
                        <div
                          className={`max-w-[85%] rounded-xl px-3.5 py-2 text-xs ${
                            isMe 
                              ? 'bg-emerald-800 text-white rounded-tr-xs' 
                              : 'bg-white border border-stone-200 text-stone-800 rounded-tl-xs shadow-xs'
                          }`}
                        >
                          <ReactMarkdown>
                            {msg.message}
                          </ReactMarkdown>
                        </div>
                        <span className="text-[9px] text-stone-400 mt-1 px-1">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendAppMessage} className="p-3 border-t border-stone-200 bg-white flex flex-col gap-2">
                <div className="flex gap-2 mb-1">
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRefApp} onChange={handleImageUploadApp} />
                  <button
                    type="button"
                    onClick={handleInsertLinkApp}
                    className="px-2.5 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md flex items-center gap-1 border border-stone-200"
                  >
                    <LinkIcon className="w-3.5 h-3.5" /> Link
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRefApp.current?.click()}
                    disabled={uploadingImageApp}
                    className="px-2.5 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md flex items-center gap-1 border border-stone-200 disabled:opacity-50"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> {uploadingImageApp ? 'Uploading...' : 'Image'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Message ${chatApplication.student.name}...`}
                    value={appNewMessage}
                    onChange={(e) => setAppNewMessage(e.target.value)}
                    className="flex-1 p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-700 focus:bg-white text-stone-900"
                  />
                  <button
                    type="submit"
                    disabled={sendingAppMsg || !appNewMessage.trim()}
                    className="px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-semibold hover:bg-emerald-900 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    <Send className="w-3.5 h-3.5" />
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
