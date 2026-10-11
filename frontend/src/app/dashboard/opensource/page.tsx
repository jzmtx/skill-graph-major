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
  getProjectActivities,
  logProjectActivity,
  deleteProjectActivity,
  OpenSourceProject,
  StudentPerformanceGraphData,
  ProjectMessage,
  ProjectActivity
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
  Trash2,
  Plus,
  Activity,
  Check,
  FileText,
  ShieldCheck,
  Code,
  Filter,
  CheckSquare
} from 'lucide-react';
import CreativeChatConsole from '@/components/chat/CreativeChatConsole';
import { getCachedData, setCachedData } from '@/lib/cache';
import { SmartTopBarLoader } from '@/components/common/SmartLoader';

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
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Activities state per project
  const [activitiesMap, setActivitiesMap] = useState<Record<string, ProjectActivity[]>>({});
  const [activityFilterMap, setActivityFilterMap] = useState<Record<string, string>>({});

  // Log Activity modal state
  const [loggingActivityProject, setLoggingActivityProject] = useState<OpenSourceProject | null>(null);
  const [loggingActivityGroup, setLoggingActivityGroup] = useState<{ id: string; name: string } | null>(null);
  const [actTitle, setActTitle] = useState('');
  const [actType, setActType] = useState('pull_request');
  const [actDesc, setActDesc] = useState('');
  const [actUrl, setActUrl] = useState('');
  const [actStatus, setActStatus] = useState('completed');
  const [actSubmitting, setActSubmitting] = useState(false);
  const [actError, setActError] = useState('');
  const [actSuccess, setActSuccess] = useState('');

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
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);

  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    const cachedProjects = getCachedData<OpenSourceProject[]>('os_projects');
    const cachedApps = getCachedData<any[]>('os_my_apps');
    if (cachedProjects && cachedProjects.length > 0) {
      setProjects(cachedProjects);
      setLoading(false);
    }
    if (cachedApps) {
      setMyApplications(cachedApps);
    }

    const sId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
    setStudentId(sId);
    loadData(sId);
  }, []);

  const loadData = async (sId: string | null) => {
    setSyncing(true);
    try {
      const [projectsRes, appsRes] = await Promise.allSettled([
        listOpenSourceProjects(),
        sId ? getStudentApplications(sId) : Promise.resolve([])
      ]);

      if (projectsRes.status === 'fulfilled' && projectsRes.value) {
        setProjects(projectsRes.value);
        setCachedData('os_projects', projectsRes.value);
      }

      if (appsRes.status === 'fulfilled' && appsRes.value) {
        const apps = appsRes.value;
        setMyApplications(apps);
        setCachedData('os_my_apps', apps);

        // Populate activities map from application data
        const initialActs: Record<string, ProjectActivity[]> = {};
        apps.forEach((app: any) => {
          const pId = app.project?.id || app.project_id;
          if (pId && Array.isArray(app.activities) && app.activities.length > 0) {
            initialActs[pId] = app.activities;
          }
        });
        setActivitiesMap(prev => ({ ...prev, ...initialActs }));
      }
    } catch (err) {
      console.error('Error fetching open source projects:', err);
    } finally {
      setLoading(false);
      setSyncing(false);
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

  const fetchProjectActivities = async (projectId: string, groupId?: string) => {
    try {
      const acts = await getProjectActivities(projectId, groupId);
      setActivitiesMap(prev => ({ ...prev, [projectId]: acts }));
    } catch (err) {
      console.error('Failed to load project activities:', err);
    }
  };

  const handleOpenLogActivity = (project: OpenSourceProject, group?: { id: string; name: string } | null) => {
    setLoggingActivityProject(project);
    setLoggingActivityGroup(group || null);
    setActTitle('');
    setActType('pull_request');
    setActDesc('');
    setActUrl('');
    setActStatus('completed');
    setActError('');
    setActSuccess('');
  };

  const handleSubmitActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggingActivityProject || !actTitle.trim()) return;

    setActSubmitting(true);
    setActError('');
    setActSuccess('');

    try {
      const studentName = typeof window !== 'undefined' ? localStorage.getItem('student_name') || 'Student Contributor' : 'Student Contributor';
      const newAct = await logProjectActivity(loggingActivityProject.id, {
        group_id: loggingActivityGroup?.id,
        student_id: studentId || undefined,
        student_name: studentName,
        activity_type: actType,
        title: actTitle.trim(),
        description: actDesc.trim() || undefined,
        link_url: actUrl.trim() || undefined,
        status: actStatus
      });

      setActSuccess('Contribution activity logged successfully!');
      
      // Update local state immediately
      setActivitiesMap(prev => ({
        ...prev,
        [loggingActivityProject.id]: [newAct, ...(prev[loggingActivityProject.id] || [])]
      }));

      setTimeout(() => {
        setLoggingActivityProject(null);
        setActSuccess('');
      }, 1000);
    } catch (err: any) {
      setActError(err.response?.data?.detail || 'Failed to log activity. Please try again.');
    } finally {
      setActSubmitting(false);
    }
  };

  const handleDeleteActivity = async (projectId: string, actId: string) => {
    try {
      await deleteProjectActivity(actId);
      setActivitiesMap(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).filter(a => a.id !== actId)
      }));
    } catch (err) {
      console.error('Failed to delete activity:', err);
    }
  };

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case 'pull_request':
        return <GitBranch className="w-3.5 h-3.5 text-emerald-700" />;
      case 'commit':
        return <Code className="w-3.5 h-3.5 text-stone-700" />;
      case 'task':
        return <CheckSquare className="w-3.5 h-3.5 text-amber-700" />;
      case 'milestone':
        return <Award className="w-3.5 h-3.5 text-emerald-800" />;
      case 'review':
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-stone-600" />;
    }
  };

  const getActivityTypeBadge = (type: string) => {
    switch (type) {
      case 'pull_request':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'commit':
        return 'bg-stone-100 text-stone-700 border-stone-200';
      case 'task':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'milestone':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'review':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      default:
        return 'bg-stone-50 text-stone-700 border-stone-200';
    }
  };

  return (
    <div className="space-y-6">
      <SmartTopBarLoader active={syncing} />

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
            Collaborate on production repositories overseen by verified alumni practitioners. Contribute code, execute pull requests, coordinate in team squad chats, and build an audited portfolio of real-world deliverables.
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
            My Team Assignments & Squad Activities ({myApplications.length})
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

      {/* TAB 2: MY TEAMS & SQUAD WORKSPACES */}
      {activeTab === 'my_teams' && (
        <div className="space-y-6">
          {myApplications.length === 0 ? (
            <div className="bg-white rounded-xl border border-stone-200 p-12 text-center shadow-2xs">
              <Users className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-stone-800 mb-1">No Active Project Teams</h3>
              <p className="text-stone-500 text-xs">
                Explore the open repositories tab to apply for team slots.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {myApplications.map((app) => {
                const project = app.project || {};
                const isAssigned = app.status === 'selected' || app.status === 'accepted' || Boolean(app.assigned_group);
                const assignedGroup = app.assigned_group;
                const groupMembers = app.group_members || [];
                const projectActivities = activitiesMap[project.id] || app.activities || [];
                const currentFilter = activityFilterMap[project.id] || 'all';

                const filteredActivities = projectActivities.filter((act) => {
                  if (currentFilter === 'all') return true;
                  return act.activity_type === currentFilter;
                });

                return (
                  <div
                    key={app.application_id || app.id}
                    className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs"
                  >
                    {/* Header Banner */}
                    <div className="p-5 border-b border-stone-200 bg-stone-50/70">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border ${
                                isAssigned
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : app.status === 'rejected'
                                  ? 'bg-stone-100 text-stone-600 border-stone-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {isAssigned ? 'Assigned Squad Contributor' : app.status === 'applied' ? 'Application Under Review' : app.status}
                            </span>

                            {assignedGroup && (
                              <span className="text-[11px] font-semibold bg-stone-100 text-stone-800 px-2.5 py-0.5 rounded border border-stone-300 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-emerald-800" />
                                Squad: {assignedGroup.name}
                              </span>
                            )}

                            {assignedGroup?.role && (
                              <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                                Role: {assignedGroup.role}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-stone-900">{project.title || 'Untitled Project'}</h3>
                            {project.repo_url && (
                              <a
                                href={project.repo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-emerald-800 border border-stone-300 hover:border-emerald-600 px-2 py-0.5 rounded bg-white transition-colors"
                              >
                                <GithubIcon className="w-3.5 h-3.5" />
                                Repository
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>

                          {project.description && (
                            <p className="text-xs text-stone-600 mt-1 max-w-3xl leading-relaxed">
                              {project.description}
                            </p>
                          )}
                        </div>

                        {/* Action Toolbar */}
                        {isAssigned && (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => handleOpenChat(project)}
                              className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              Squad Chat
                            </button>

                            <button
                              onClick={() => handleOpenLogActivity(project, assignedGroup)}
                              className="px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5 text-emerald-800" />
                              Log Contribution / PR
                            </button>

                            <button
                              onClick={() => handleViewPerformance(project.id, project.title)}
                              className="px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
                            >
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-800" />
                              Performance Metrics
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Assigned Squad Body */}
                    {isAssigned ? (
                      <div className="p-5 space-y-6">
                        {/* Mentor & Teammates Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Mentor Card */}
                          <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1.5">
                              Supervising Mentor
                            </span>
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center text-xs">
                                {project.posted_by?.name?.charAt(0) || 'M'}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-stone-900">{project.posted_by?.name || 'Verified Alumni Mentor'}</h4>
                                <p className="text-[11px] text-stone-600">
                                  {project.posted_by?.current_job_role || 'Software Engineer'} {project.posted_by?.current_company ? `@ ${project.posted_by.current_company}` : ''}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Assigned Teammates Squad Roster */}
                          <div className="md:col-span-2 p-3.5 rounded-xl border border-stone-200 bg-white">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                                Squad Teammates ({groupMembers.length > 0 ? groupMembers.length : 1})
                              </span>
                              <span className="text-[11px] text-stone-500">
                                Assigned squad team members
                              </span>
                            </div>

                            {groupMembers.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {groupMembers.map((member: any) => {
                                  const isMe = member.id === studentId;
                                  return (
                                    <div
                                      key={member.id}
                                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${
                                        isMe ? 'bg-emerald-50 border-emerald-200 text-emerald-950 font-semibold' : 'bg-stone-50 border-stone-200 text-stone-800'
                                      }`}
                                    >
                                      <div className="w-5 h-5 rounded-full bg-stone-200 text-stone-700 font-bold flex items-center justify-center text-[10px]">
                                        {member.name?.charAt(0) || 'S'}
                                      </div>
                                      <span>{member.name} {isMe ? '(You)' : ''}</span>
                                      <span className="text-[10px] px-1.5 py-0.2 bg-white rounded border border-stone-200 text-stone-600">
                                        {member.role || 'Contributor'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-stone-500 italic">
                                You are the initial assigned member in this squad. Fellow contributors will appear as the mentor adds them.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Activities Feed & Workstream */}
                        <div className="border border-stone-200 rounded-xl overflow-hidden">
                          <div className="p-4 bg-stone-50 border-b border-stone-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Activity className="w-4 h-4 text-emerald-800" />
                              <h4 className="text-sm font-bold text-stone-900">
                                All Squad Activities & Deliverables
                              </h4>
                              <span className="text-xs text-stone-500 font-medium">
                                ({filteredActivities.length} items)
                              </span>
                            </div>

                            {/* Activity Filters */}
                            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none w-full md:w-auto">
                              {[
                                { key: 'all', label: 'All Activities' },
                                { key: 'pull_request', label: 'Pull Requests' },
                                { key: 'commit', label: 'Commits' },
                                { key: 'task', label: 'Tasks' },
                                { key: 'review', label: 'Reviews' }
                              ].map((flt) => (
                                <button
                                  key={flt.key}
                                  onClick={() => setActivityFilterMap(prev => ({ ...prev, [project.id]: flt.key }))}
                                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all whitespace-nowrap ${
                                    currentFilter === flt.key
                                      ? 'bg-emerald-800 text-white shadow-2xs'
                                      : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                                  }`}
                                >
                                  {flt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Activity Item List */}
                          <div className="divide-y divide-stone-100">
                            {filteredActivities.length === 0 ? (
                              <div className="p-8 text-center bg-white">
                                <FileText className="w-7 h-7 text-stone-300 mx-auto mb-2" />
                                <p className="text-xs font-semibold text-stone-700">No activities found for this filter</p>
                                <p className="text-[11px] text-stone-500 mt-0.5">
                                  Submit a pull request, commit, or task deliverable using the button above.
                                </p>
                              </div>
                            ) : (
                              filteredActivities.map((act) => (
                                <div key={act.id} className="p-4 bg-white hover:bg-stone-50/60 transition-colors flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-stone-100 border border-stone-200 mt-0.5">
                                      {getActivityTypeIcon(act.activity_type)}
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${getActivityTypeBadge(act.activity_type)}`}>
                                          {act.activity_type.replace('_', ' ')}
                                        </span>
                                        <h5 className="text-xs font-bold text-stone-900">{act.title}</h5>
                                        <span className="text-[10px] text-stone-500">
                                          • {act.student_name || 'Contributor'}
                                        </span>
                                      </div>

                                      {act.description && (
                                        <p className="text-xs text-stone-600 leading-relaxed max-w-2xl">
                                          {act.description}
                                        </p>
                                      )}

                                      <div className="flex items-center gap-3 pt-1 text-[11px] text-stone-500">
                                        {act.created_at && (
                                          <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(act.created_at).toLocaleDateString()}
                                          </span>
                                        )}
                                        {act.link_url && (
                                          <a
                                            href={act.link_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-emerald-800 hover:text-emerald-950 font-semibold inline-flex items-center gap-1"
                                          >
                                            View Artifact / PR
                                            <ExternalLink className="w-3 h-3" />
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                                        act.status === 'completed'
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                          : act.status === 'in_progress'
                                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                                          : 'bg-stone-100 text-stone-600 border-stone-200'
                                      }`}
                                    >
                                      {act.status.replace('_', ' ')}
                                    </span>

                                    {act.student_id === studentId && (
                                      <button
                                        onClick={() => handleDeleteActivity(project.id, act.id)}
                                        className="text-stone-400 hover:text-red-700 p-1 transition-colors"
                                        title="Delete activity"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Application Pending Review Note */
                      <div className="p-5 bg-stone-50/50">
                        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 text-xs text-amber-900 flex items-start gap-3">
                          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <div>
                            <h5 className="font-bold">Application Pending Squad Review</h5>
                            <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                              Your candidate note is under review by verified alumni mentor {project.posted_by?.name || 'the repository maintainer'}. Once assigned to a squad team, the complete activity feed, team member roster, and squad chat channel will unlock here automatically.
                            </p>
                            {app.pitch && (
                              <div className="mt-2.5 p-2.5 rounded bg-white border border-amber-200 text-stone-700 italic">
                                &quot;{app.pitch}&quot;
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* LOG ACTIVITY / CONTRIBUTION MODAL */}
      {loggingActivityProject && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-4">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Log Team Activity / Contribution</h3>
                <p className="text-xs text-stone-500">
                  {loggingActivityProject.title} {loggingActivityGroup ? `• ${loggingActivityGroup.name}` : ''}
                </p>
              </div>
              <button
                onClick={() => setLoggingActivityProject(null)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actError && (
              <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {actError}
              </div>
            )}

            {actSuccess && (
              <div className="mb-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
                {actSuccess}
              </div>
            )}

            <form onSubmit={handleSubmitActivity} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Activity Type
                  </label>
                  <select
                    value={actType}
                    onChange={(e) => setActType(e.target.value)}
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-emerald-800"
                  >
                    <option value="pull_request">Pull Request (PR)</option>
                    <option value="commit">Code Commit</option>
                    <option value="task">Sprint Task</option>
                    <option value="milestone">Milestone Delivery</option>
                    <option value="review">Code Review</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={actStatus}
                    onChange={(e) => setActStatus(e.target.value)}
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-emerald-800"
                  >
                    <option value="completed">Completed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="pending_review">Pending Review</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Deliverable Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., PR #15: Implement JWT refresh token interceptor"
                  value={actTitle}
                  onChange={(e) => setActTitle(e.target.value)}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-emerald-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  GitHub URL / Link (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/organization/repo/pull/15"
                  value={actUrl}
                  onChange={(e) => setActUrl(e.target.value)}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-emerald-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Summary / Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail test coverage, architectural changes, or pull request summary..."
                  value={actDesc}
                  onChange={(e) => setActDesc(e.target.value)}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-emerald-800 focus:bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLoggingActivityProject(null)}
                  className="flex-1 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actSubmitting || !!actSuccess}
                  className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg disabled:opacity-50 shadow-2xs"
                >
                  {actSubmitting ? 'Logging...' : 'Log Activity'}
                </button>
              </div>
            </form>
          </div>
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
