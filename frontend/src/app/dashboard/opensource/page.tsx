"use client";

import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  listOpenSourceProjects,
  applyToOpenSourceProject,
  getStudentApplications,
  getStudentPerformanceGraph,
  getProjectMessages,
  sendProjectMessage,
  deleteOpenSourceProjectMessage,
  OpenSourceProject,
  StudentPerformanceGraphData,
  ProjectMessage
} from '@/lib/opensourceApi';
import {
  GitBranch,
  Users,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Award,
  Layers,
  Send,
  AlertCircle,
  MessageSquare,
  X,
  Link as LinkIcon,
  Image as ImageIcon,
  Trash2
} from 'lucide-react';
import CreativeChatConsole from '@/components/chat/CreativeChatConsole';

const GithubIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

export default function StudentOpenSourcePage() {
  const [activeTab, setActiveTab] = useState<'explore' | 'my_teams'>('explore');
  const [projects, setProjects] = useState<OpenSourceProject[]>([]);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Apply modal
  const [applyingProject, setApplyingProject] = useState<OpenSourceProject | null>(null);
  const [pitch, setPitch] = useState('');
  const [applyingLoading, setApplyingLoading] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState('');

  // Performance graph modal / drawer
  const [selectedPerfData, setSelectedPerfData] = useState<StudentPerformanceGraphData | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [perfProjectTitle, setPerfProjectTitle] = useState('');

  // Chat modal
  const [chatProject, setChatProject] = useState<OpenSourceProject | null>(null);
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    const sId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
    setStudentId(sId);
    loadData(sId);
  }, []);

  const loadData = async (sId: string | null) => {
    setLoading(true);
    try {
      const allProjects = await listOpenSourceProjects();
      setProjects(allProjects || []);

      if (sId) {
        const apps = await getStudentApplications(sId);
        setMyApplications(apps || []);
      }
    } catch (err) {
      console.error('Error fetching open source projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const appliedProjectIds = new Set(myApplications.map((app) => app.project?.id || app.project_id));

  const allTags = Array.from(
    new Set(projects.flatMap((p) => p.tech_stack || []).filter(Boolean))
  );

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.posted_by?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTag = selectedTag ? p.tech_stack?.includes(selectedTag) : true;
    return matchesSearch && matchesTag;
  });

  const handleOpenApply = (proj: OpenSourceProject) => {
    setApplyingProject(proj);
    setPitch('');
    setApplyError('');
    setApplySuccess('');
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingProject || !studentId) {
      setApplyError('Please login as a student to apply.');
      return;
    }

    setApplyingLoading(true);
    setApplyError('');

    try {
      await applyToOpenSourceProject({
        project_id: applyingProject.id,
        student_id: studentId,
        pitch: pitch.trim() || undefined
      });

      setApplySuccess('Application submitted successfully!');
      const updatedApps = await getStudentApplications(studentId);
      setMyApplications(updatedApps || []);
      setTimeout(() => {
        setApplyingProject(null);
        setApplySuccess('');
      }, 1200);
    } catch (err: any) {
      setApplyError(err.response?.data?.detail || 'Failed to submit application. Please try again.');
    } finally {
      setApplyingLoading(false);
    }
  };

  const handleViewPerformance = async (projectId: string, projectTitle: string) => {
    if (!studentId) return;
    setPerfLoading(true);
    setPerfProjectTitle(projectTitle);
    try {
      const data = await getStudentPerformanceGraph(projectId, studentId);
      setSelectedPerfData(data);
    } catch (err) {
      console.error('Failed to load performance graph:', err);
    } finally {
      setPerfLoading(false);
    }
  };

  const handleOpenChat = async (proj: OpenSourceProject) => {
    setChatProject(proj);
    setLoadingMsgs(true);
    try {
      const msgs = await getProjectMessages(proj.id);
      setMessages(msgs || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMsgs(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatProject || !studentId || !newMessage.trim()) return;
    setSendingMsg(true);
    try {
      const sName = typeof window !== 'undefined' ? localStorage.getItem('student_name') || 'Student Contributor' : 'Student Contributor';
      await sendProjectMessage(chatProject.id, {
        sender_type: 'student',
        sender_id: studentId,
        sender_name: sName,
        message: newMessage.trim()
      });
      setNewMessage('');
      const msgs = await getProjectMessages(chatProject.id);
      setMessages(msgs || []);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await deleteOpenSourceProjectMessage(msgId);
      if (chatProject) {
        const msgs = await getProjectMessages(chatProject.id);
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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 md:p-8 shadow-sm">
        <div className="max-w-3xl">
          <span className="px-2.5 py-1 bg-stone-100 text-stone-700 text-xs font-semibold uppercase tracking-wider rounded border border-stone-200 inline-block mb-3">
            Alumni Open Source Lab
          </span>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 tracking-tight mb-2">
            Collaborative Open Source Development
          </h1>
          <p className="text-stone-600 text-xs md:text-sm leading-relaxed">
            Collaborate on production repositories overseen by verified alumni practitioners. Contribute code, execute pull requests, and assemble an audited portfolio of real-world deliverables.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mt-6 border-b border-stone-200 pb-0">
          <button
            onClick={() => setActiveTab('explore')}
            className={`px-4 py-2 font-semibold text-xs rounded-t-lg transition-all flex items-center gap-1.5 border-b-2 ${
              activeTab === 'explore'
                ? 'bg-stone-50 text-stone-900 border-emerald-800'
                : 'text-stone-500 hover:text-stone-800 border-transparent'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Explore Repositories ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab('my_teams')}
            className={`px-4 py-2 font-semibold text-xs rounded-t-lg transition-all flex items-center gap-1.5 border-b-2 ${
              activeTab === 'my_teams'
                ? 'bg-stone-50 text-stone-900 border-emerald-800'
                : 'text-stone-500 hover:text-stone-800 border-transparent'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            My Team Assignments ({myApplications.length})
          </button>
        </div>
      </div>

      {/* TAB 1: EXPLORE PROJECTS */}
      {activeTab === 'explore' && (
        <div className="space-y-4">
          {/* Search Bar & Tag Filter */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search projects by title, description, or mentor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-emerald-800 focus:bg-white"
              />
            </div>
            {allTags.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                <button
                  onClick={() => setSelectedTag(null)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                    selectedTag === null
                      ? 'bg-emerald-800 text-white shadow-2xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  All Stacks
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                    className={`text-xs px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-all ${
                      selectedTag === tag
                        ? 'bg-emerald-800 text-white shadow-2xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Projects Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-stone-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-stone-200 p-8 shadow-2xs">
              <GitBranch className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-stone-800 mb-1">No open source projects found</h3>
              <p className="text-stone-500 text-xs max-w-md mx-auto">
                {searchTerm || selectedTag
                  ? 'Try adjusting your search criteria.'
                  : 'Verified alumni have not published any projects at this time.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => {
                const isApplied = appliedProjectIds.has(project.id);

                return (
                  <div
                    key={project.id}
                    className="bg-white rounded-xl border border-stone-200 p-5 flex flex-col justify-between hover:border-emerald-700 transition-all shadow-2xs hover:shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                              project.status === 'open'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : project.status === 'in_progress'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-stone-100 text-stone-600 border-stone-200'
                            }`}
                          >
                            {project.status.replace('_', ' ')}
                          </span>
                          {project.group_count ? (
                            <span className="text-[10px] font-semibold bg-stone-100 text-stone-700 px-2 py-0.5 rounded border border-stone-200 flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              {project.group_count} Teams
                            </span>
                          ) : null}
                        </div>

                        {project.repo_url && (
                          <a
                            href={project.repo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-stone-400 hover:text-stone-800 transition-colors p-1"
                            title="GitHub Repo"
                          >
                            <GithubIcon className="w-4 h-4" />
                          </a>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-stone-900 line-clamp-1 mb-1">
                        {project.title}
                      </h3>
                      <p className="text-stone-600 text-xs line-clamp-3 mb-3 leading-relaxed">
                        {project.description || 'No description provided.'}
                      </p>

                      {project.tech_stack && project.tech_stack.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {project.tech_stack.map((tech) => (
                            <span
                              key={tech}
                              className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded border border-stone-200 font-medium"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-stone-100 pt-3 mt-1">
                      <div className="flex items-center justify-between text-xs text-stone-500 mb-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-stone-200 text-stone-700 font-bold flex items-center justify-center text-[10px]">
                            {project.posted_by?.name?.charAt(0) || 'A'}
                          </div>
                          <div>
                            <p className="font-semibold text-stone-800 text-xs line-clamp-1">
                              {project.posted_by?.name || 'Alumni Mentor'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right text-[11px]">
                          <span className="font-bold text-stone-700">
                            {project.applicant_count || 0} / {project.max_contributors}
                          </span>
                        </div>
                      </div>

                      {isApplied ? (
                        <button
                          disabled
                          className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-stone-100 text-stone-600 border border-stone-200 flex items-center justify-center gap-1.5 cursor-default"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800" />
                          Application Submitted
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenApply(project)}
                          className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-emerald-800 text-white hover:bg-emerald-900 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Apply as Contributor
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY APPLICATIONS & TEAMS */}
      {activeTab === 'my_teams' && (
        <div className="space-y-4">
          {myApplications.length === 0 ? (
            <div className="bg-white rounded-xl border border-stone-200 p-12 text-center shadow-2xs">
              <Users className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-stone-800 mb-1">No Active Project Teams</h3>
              <p className="text-stone-500 text-xs">
                Explore the open repositories tab to apply for team slots.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myApplications.map((app) => {
                const project = app.project || {};
                return (
                  <div
                    key={app.application_id || app.id}
                    className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            app.status === 'accepted' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            app.status === 'rejected' ? 'bg-stone-100 text-stone-600 border-stone-200' :
                            'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {app.status}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-stone-900">{project.title || 'Untitled Project'}</h3>
                      </div>

                      <div className="flex items-center gap-2">
                        {app.status === 'accepted' && (
                          <>
                            <button
                              onClick={() => handleViewPerformance(project.id, project.title)}
                              className="px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs"
                            >
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-800" /> Metrics
                            </button>
                            <button
                              onClick={() => handleOpenChat(project)}
                              className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> Team Chat
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {app.pitch && (
                      <p className="text-xs text-stone-600 bg-stone-50 p-3 rounded-lg border border-stone-100 italic">
                        &quot;{app.pitch}&quot;
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* APPLY MODAL */}
      {applyingProject && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-4">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Apply as Contributor</h3>
                <p className="text-xs text-stone-500">{applyingProject.title}</p>
              </div>
              <button
                onClick={() => setApplyingProject(null)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {applyError && (
              <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {applyError}
              </div>
            )}

            {applySuccess && (
              <div className="mb-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
                {applySuccess}
              </div>
            )}

            <form onSubmit={handleSubmitApplication} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Candidate Note / Qualifications
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detail your relevant language, framework, or architecture experience..."
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  className="w-full text-xs p-3 bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-emerald-800 focus:bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApplyingProject(null)}
                  className="flex-1 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyingLoading || !!applySuccess}
                  className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg disabled:opacity-50 shadow-2xs"
                >
                  {applyingLoading ? 'Submitting...' : 'Submit Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PERFORMANCE GRAPH MODAL */}
      {(selectedPerfData || perfLoading) && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl border border-stone-200 animate-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-4">
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  {perfProjectTitle || 'Project Contribution Analytics'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPerfData(null)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {perfLoading ? (
              <div className="h-48 bg-stone-100 rounded-lg animate-pulse" />
            ) : selectedPerfData ? (
              <div className="space-y-4">
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-500 block mb-0.5">Overall Rating</span>
                    <h4 className="text-2xl font-bold text-stone-900">
                      {selectedPerfData.overall_performance_score} <span className="text-xs text-stone-500 font-normal">/ 100</span>
                    </h4>
                  </div>
                  <Award className="w-6 h-6 text-emerald-800" />
                </div>

                <div className="space-y-2">
                  {selectedPerfData.metric_breakdown.map((item) => (
                    <div key={item.metric} className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg">
                      <div className="flex justify-between text-xs font-semibold text-stone-800 mb-1">
                        <span>{item.metric}</span>
                        <span>{item.score}%</span>
                      </div>
                      <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-800 h-full rounded-full" style={{ width: `${item.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* CREATIVE TEAM CHAT CONSOLE */}
      <CreativeChatConsole
        isOpen={Boolean(chatProject)}
        onClose={() => setChatProject(null)}
        title={`${chatProject?.title || 'Open Source'} Team Channel`}
        subtitle="Collaborative Engineering & Architecture Dispatch"
        recipientRole="Project Maintainers & Contributors"
        contextTag="OpenSource Stream"
        messages={messages}
        currentUserId={studentId}
        currentUserType="student"
        loading={loadingMsgs}
        sending={sendingMsg}
        onSendMessage={async (msg) => {
          if (!chatProject || !studentId) return;
          const sName = typeof window !== 'undefined' ? localStorage.getItem('student_name') || 'Student' : 'Student';
          setSendingMsg(true);
          try {
            await sendProjectMessage(chatProject.id, {
              sender_id: studentId,
              sender_name: sName,
              sender_type: 'student',
              message: msg
            });
            const msgs = await getProjectMessages(chatProject.id);
            setMessages(msgs || []);
          } catch (e) {
            console.error(e);
          } finally {
            setSendingMsg(false);
          }
        }}
        onDeleteMessage={async (msgId) => {
          try {
            await deleteOpenSourceProjectMessage(String(msgId));
            if (chatProject) {
              const msgs = await getProjectMessages(chatProject.id);
              setMessages(msgs || []);
            }
          } catch (e) {
            console.error(e);
          }
        }}
      />
    </div>
  );
}
