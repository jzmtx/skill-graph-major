"use client";

import React, { useEffect, useState } from 'react';
import {
  listOpenSourceProjects,
  applyToOpenSourceProject,
  getStudentApplications,
  getStudentPerformanceGraph,
  OpenSourceProject,
  StudentPerformanceGraphData
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
  X
} from 'lucide-react';

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

  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    const sId = localStorage.getItem('student_id');
    setStudentId(sId);
    loadData(sId);
  }, []);

  const loadData = async (sId: string | null) => {
    setLoading(true);
    try {
      const allProjects = await listOpenSourceProjects();
      setProjects(allProjects);

      if (sId) {
        const apps = await getStudentApplications(sId);
        setMyApplications(apps);
      }
    } catch (err) {
      console.error('Error fetching open source projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const appliedProjectIds = new Set(myApplications.map((app) => app.project?.id || app.project_id));

  // Collect unique tech stack tags
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
      // refresh applications
      const updatedApps = await getStudentApplications(studentId);
      setMyApplications(updatedApps);
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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Hero Section */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-4 border border-indigo-400/20 backdrop-blur-md">
            <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
            Alumni Open Source Hub
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
            Build Real Open Source with Alumni Mentors
          </h1>
          <p className="text-indigo-200 text-base md:text-lg leading-relaxed">
            Collaborate directly on production-grade repositories created and mentored by verified alumni. Form specialized teams, ship pull requests, and build an audited portfolio of real-world contributions.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mt-8 border-b border-indigo-700/50 pb-0">
          <button
            onClick={() => setActiveTab('explore')}
            className={`px-5 py-3 font-semibold text-sm rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'explore'
                ? 'bg-white/10 text-white border-indigo-400 backdrop-blur-md shadow-sm'
                : 'text-indigo-300 hover:text-white border-transparent hover:bg-white/5'
            }`}
          >
            <Search className="w-4 h-4" />
            Explore Projects ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab('my_teams')}
            className={`px-5 py-3 font-semibold text-sm rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'my_teams'
                ? 'bg-white/10 text-white border-indigo-400 backdrop-blur-md shadow-sm'
                : 'text-indigo-300 hover:text-white border-transparent hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            My Applications & Teams ({myApplications.length})
          </button>
        </div>
      </div>

      {/* TAB 1: EXPLORE PROJECTS */}
      {activeTab === 'explore' && (
        <div className="space-y-6">
          {/* Search & Tag Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search projects by name, description, or alumni mentor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
            {allTags.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                <button
                  onClick={() => setSelectedTag(null)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                    selectedTag === null
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Tech
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                      selectedTag === tag
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <GitBranch className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No open source projects found</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                {searchTerm || selectedTag
                  ? 'Try adjusting your search filters to find matching alumni projects.'
                  : 'Verified alumni haven\'t posted any open source projects yet. Check back soon!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => {
                const isApplied = appliedProjectIds.has(project.id);

                return (
                  <div
                    key={project.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-lg hover:border-indigo-300 transition-all group"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full ${
                              project.status === 'open'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : project.status === 'in_progress'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {project.status.replace('_', ' ')}
                          </span>
                          {project.group_count ? (
                            <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1">
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
                            className="text-slate-400 hover:text-slate-900 transition-colors p-1"
                            title="View GitHub Repository"
                          >
                            <GithubIcon className="w-4 h-4" />
                          </a>
                        )}
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 mb-2">
                        {project.title}
                      </h3>
                      <p className="text-slate-600 text-sm line-clamp-3 mb-4 leading-relaxed">
                        {project.description || 'No description provided for this project.'}
                      </p>

                      {/* Tech Stack Chips */}
                      {project.tech_stack && project.tech_stack.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {project.tech_stack.map((tech) => (
                            <span
                              key={tech}
                              className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Guidelines / Tasks Snippet */}
                      {project.guidelines && (
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-4 text-xs text-slate-600">
                          <span className="font-semibold text-slate-800">Guidelines: </span>
                          <span className="line-clamp-2">{project.guidelines}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer Info & Action */}
                    <div className="border-t border-slate-100 pt-4 mt-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                            {project.posted_by?.name?.charAt(0) || 'A'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 line-clamp-1">
                              {project.posted_by?.name || 'Alumni Mentor'}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {project.posted_by?.current_company || 'Industry Alumni'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Applicants</span>
                          <span className="font-bold text-slate-700">
                            {project.applicant_count || 0} / {project.max_contributors}
                          </span>
                        </div>
                      </div>

                      {/* Apply Button */}
                      {isApplied ? (
                        <button
                          disabled
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center gap-1.5 cursor-default"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Application Submitted
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenApply(project)}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/20"
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
        <div className="space-y-6">
          {loading ? (
            <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
          ) : myApplications.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <GitBranch className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No applications yet</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
                You haven&apos;t applied to any alumni open source projects. Browse the explore tab and send your application!
              </p>
              <button
                onClick={() => setActiveTab('explore')}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-md transition-all"
              >
                Browse Projects
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {myApplications.map((app) => {
                const proj = app.project || {};
                const isSelected = app.status === 'selected' || !!app.assigned_group;

                return (
                  <div
                    key={app.application_id}
                    className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="p-6 md:p-8">
                      {/* Top Bar */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                                isSelected
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : app.status === 'rejected'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              }`}
                            >
                              {isSelected ? 'Accepted & In Team' : app.status}
                            </span>
                            <span className="text-xs text-slate-400">
                              Applied on {new Date(app.applied_at).toLocaleDateString()}
                            </span>
                          </div>
                          <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                            {proj.title || 'Open Source Project'}
                          </h2>
                          <p className="text-sm text-slate-500 mt-1">
                            Mentored by{' '}
                            <span className="font-semibold text-slate-700">
                              {proj.posted_by?.name || 'Alumni Mentor'}
                            </span>{' '}
                            ({proj.posted_by?.current_company || 'Industry Partner'})
                          </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-3">
                          {proj.repo_url && (
                            <a
                              href={proj.repo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                            >
                              <GithubIcon className="w-4 h-4" />
                              GitHub Repo
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </a>
                          )}
                          {isSelected && (
                            <button
                              onClick={() => handleViewPerformance(proj.id, proj.title)}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-indigo-600/20"
                            >
                              <TrendingUp className="w-4 h-4" />
                              View My Performance Graph
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Team / Group Section if selected */}
                      {app.assigned_group ? (
                        <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-5 mb-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                                <Users className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm">
                                  Assigned Group: {app.assigned_group.name}
                                </h4>
                                <p className="text-xs text-indigo-700">
                                  Your Role: <span className="font-semibold uppercase tracking-wider">{app.assigned_group.role || 'Contributor'}</span>
                                </p>
                              </div>
                            </div>
                            <span className="text-xs bg-indigo-100 text-indigo-800 font-semibold px-2.5 py-1 rounded-full">
                              Active Team
                            </span>
                          </div>

                          {/* Teammates */}
                          {app.group_members && app.group_members.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-slate-700 mb-2">Team Members ({app.group_members.length}):</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                {app.group_members.map((member: any) => (
                                  <div
                                    key={member.id}
                                    className="bg-white p-3 rounded-xl border border-indigo-100/80 flex items-center gap-2.5"
                                  >
                                    <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                                      {member.name?.charAt(0) || 'S'}
                                    </div>
                                    <div className="overflow-hidden">
                                      <p className="text-xs font-bold text-slate-900 truncate">{member.name}</p>
                                      <p className="text-[10px] text-slate-500 truncate">{member.branch || 'Student'}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6 flex items-center gap-3">
                          <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                          <p className="text-xs text-slate-600">
                            Your application is currently under review by the alumni mentor. Once selected, your team assignments and performance tracking will appear here.
                          </p>
                        </div>
                      )}

                      {/* Submitted Pitch */}
                      {app.pitch && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-600">
                          <span className="font-semibold text-slate-800 block mb-1">Your Application Note:</span>
                          <p className="italic leading-relaxed">{app.pitch}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* APPLY MODAL */}
      {applyingProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Apply as Contributor</h3>
                <p className="text-xs text-slate-500">{applyingProject.title}</p>
              </div>
              <button
                onClick={() => setApplyingProject(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {applyError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {applyError}
              </div>
            )}

            {applySuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                {applySuccess}
              </div>
            )}

            <form onSubmit={handleSubmitApplication} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Why do you want to contribute to this project?
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Mention your relevant skills, past projects, GitHub experience, or why you are excited to work on this repository..."
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all leading-relaxed"
                />
              </div>

              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-[11px] text-indigo-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                Your verified SkillGraph Hireability score & skills will automatically be shared with the alumni mentor.
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setApplyingProject(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyingLoading || !!applySuccess}
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {applyingLoading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PERFORMANCE GRAPH MODAL */}
      {(selectedPerfData || perfLoading) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider mb-1">
                  <TrendingUp className="w-3 h-3" />
                  Performance Analytics
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {perfProjectTitle || 'Project Contribution Graph'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPerfData(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {perfLoading ? (
              <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
            ) : selectedPerfData ? (
              <div className="space-y-6">
                {/* Overall Score Badge */}
                <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-2xl p-6 text-white flex items-center justify-between shadow-lg">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-indigo-300 font-semibold block mb-1">
                      Overall Contribution Rating
                    </span>
                    <h4 className="text-3xl font-extrabold">
                      {selectedPerfData.logs.length === 0 ? (
                        <span className="text-2xl text-slate-300">Not Evaluated Yet</span>
                      ) : (
                        <>
                          {selectedPerfData.overall_performance_score} <span className="text-lg text-indigo-300">/ 100</span>
                        </>
                      )}
                    </h4>
                    <p className="text-xs text-indigo-200 mt-1">
                      {selectedPerfData.logs.length === 0
                        ? "No evaluations recorded yet for this project."
                        : "Evaluated across code quality, task velocity & team collaboration"}
                    </p>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                    <Award className="w-8 h-8 text-amber-400" />
                  </div>
                </div>

                {/* Metric Breakdown Bars (Visual Performance Chart) */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                    Skill & Contribution Metrics
                  </h4>
                  {selectedPerfData.metric_breakdown.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-xs text-slate-500 font-medium">
                        No performance evaluations recorded yet.
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Your alumni mentor will evaluate your contributions as you start working on project milestones.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedPerfData.metric_breakdown.map((item) => (
                        <div key={item.metric} className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                          <div className="flex justify-between items-center text-xs font-semibold text-slate-800 mb-1.5">
                            <span>{item.metric}</span>
                            <span className="text-indigo-600 font-bold">{item.score}%</span>
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

                {/* Weekly Progression Timeline */}
                {selectedPerfData.weekly_progress.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                      Weekly Score Progression
                    </h4>
                    <div className="flex items-end gap-3 h-32 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      {selectedPerfData.weekly_progress.map((w) => (
                        <div key={w.week} className="flex-1 flex flex-col items-center h-full justify-end group">
                          <span className="text-[10px] font-bold text-indigo-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {w.average_score}%
                          </span>
                          <div
                            className="w-full bg-indigo-500 rounded-t-lg transition-all group-hover:bg-indigo-600"
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

                {/* Detailed Feedback Logs */}
                {selectedPerfData.logs && selectedPerfData.logs.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                      Mentor Feedback & Milestone Notes
                    </h4>
                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      {selectedPerfData.logs.map((log) => (
                        <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-slate-800">{log.metric_name}</span>
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded-full">
                              Score: {log.score}
                            </span>
                          </div>
                          <p className="text-slate-600">{log.feedback || 'Good contribution and clean code standards.'}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            Logged for {log.week_label || 'Sprint'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
