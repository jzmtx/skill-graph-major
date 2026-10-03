"use client";

import React, { useEffect, useState } from 'react';
import {
  getAlumniProfile,
  getMyOpportunities,
  createOpportunity,
  deactivateOpportunity,
  getInterestedStudents,
  getCollegeStudents,
} from '@/lib/alumniApi';
import { useRouter } from 'next/navigation';
import { Users, Plus, X, UserCheck, Briefcase, GraduationCap, ChevronDown, ChevronUp, Eye, Sparkles, GitBranch } from 'lucide-react';
import StudentProfileModal, { StudentProfileData } from '@/components/dashboard/StudentProfileModal';
import AlumniOpenSourceManager from '@/components/alumni/AlumniOpenSourceManager';

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
  const [dashboardTab, setDashboardTab] = useState<'opportunities' | 'opensource' | 'students'>('opportunities');

  // --- College Students section ---
  const [showCollegeStudents, setShowCollegeStudents] = useState(false);
  const [collegeStudents, setCollegeStudents] = useState<StudentWithSkills[]>([]);
  const [collegeStudentsLoading, setCollegeStudentsLoading] = useState(false);
  const [collegeStudentsLoaded, setCollegeStudentsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const authId = localStorage.getItem('alumni_auth_id');
      if (!authId) {
        router.push('/login');
        return;
      }
      try {
        const profile = await getAlumniProfile(authId);
        setAlumni(profile.alumni);
        setCollege(profile.college);

        if (profile.alumni.is_verified) {
          const oppList = await getMyOpportunities(profile.alumni.id);
          setOpportunities(oppList);
        }
      } catch {
        setError('Failed to load dashboard. Please try logging in again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

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
    } catch {
      setInterestedStudents([]);
    } finally {
      setInterestedLoading(false);
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
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-700" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Welcome back, {alumni?.name}</h1>
              <p className="text-sm text-slate-500">{college?.name}</p>
            </div>
          </div>
          {alumni && !alumni.is_verified && (
            <span className="px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
              Pending Verification
            </span>
          )}
        </div>

        {alumni && !alumni.is_verified ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-4 rounded-lg">
            Your alumni account is awaiting admin approval. You&apos;ll be able to post opportunities once verified.
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-slate-200 mb-6 pb-0 overflow-x-auto">
              <button
                onClick={() => setDashboardTab('opensource')}
                className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
                  dashboardTab === 'opensource'
                    ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <GitBranch className="w-4 h-4" />
                Open Source Projects
              </button>
              <button
                onClick={() => setDashboardTab('opportunities')}
                className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
                  dashboardTab === 'opportunities'
                    ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                Referrals & Mentorship ({opportunities.length})
              </button>
              <button
                onClick={() => {
                  setDashboardTab('students');
                  if (!collegeStudentsLoaded && alumni) toggleCollegeStudents();
                }}
                className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
                  dashboardTab === 'students'
                    ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                College Students
              </button>
            </div>

            {/* TAB: OPEN SOURCE PROJECTS */}
            {dashboardTab === 'opensource' && alumni && (
              <AlumniOpenSourceManager alumniId={alumni.id} collegeName={college?.name} />
            )}

            {/* TAB: GENERAL OPPORTUNITIES */}
            {dashboardTab === 'opportunities' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Briefcase className="w-5 h-5" /> Your Opportunities
                  </h2>
                  <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
                  >
                    {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showForm ? 'Cancel' : 'Post Opportunity'}
                  </button>
                </div>

            {/* New Opportunity Form */}
            {showForm && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                {formError && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{formError}</div>
                )}
                <form onSubmit={handleCreateOpportunity} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                    <input
                      type="text" required
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={title} onChange={e => setTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea
                      rows={3}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={description} onChange={e => setDescription(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                    <select
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={type} onChange={e => setType(e.target.value)}
                    >
                      <option value="referral">Referral</option>
                      <option value="internship">Internship</option>
                      <option value="mentorship">Mentorship</option>
                      <option value="job">Job</option>
                      <option value="opensource">Open Source</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {formLoading ? 'Posting...' : 'Post Opportunity'}
                  </button>
                </form>
              </div>
            )}

            {/* Opportunity List */}
            {opportunities.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
                No opportunities posted yet. Click &quot;Post Opportunity&quot; to get started.
              </div>
            ) : (
              <div className="space-y-3 mb-10">
                {opportunities.map(opp => (
                  <div key={opp.id} className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-800">{opp.title}</h3>
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full capitalize">{opp.type}</span>
                          {!opp.is_active && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">Closed</span>
                          )}
                        </div>
                        {opp.description && <p className="text-sm text-slate-500 mt-1">{opp.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggleInterested(opp.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-200"
                        >
                          <UserCheck className="w-3.5 h-3.5" /> {opp.interested_count} Interested
                        </button>
                        {opp.is_active && (
                          <button
                            onClick={() => handleDeactivate(opp.id)}
                            className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100"
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </div>

                    {expandedOppId === opp.id && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        {interestedLoading ? (
                          <p className="text-sm text-slate-400">Loading interested students...</p>
                        ) : interestedStudents.length === 0 ? (
                          <p className="text-sm text-slate-400">No students have expressed interest yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {interestedStudents.map((s, i) => (
                              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 hover:bg-slate-100/70 transition-colors">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-slate-800">{s.student.name}</p>
                                    {s.hireability && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[11px] font-extrabold rounded-md">
                                        <Sparkles className="w-3 h-3 text-indigo-600" /> Score: {s.hireability.score}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {s.student.email} {s.student.branch ? `· ${s.student.branch}` : ''} {s.student.year ? `· Year ${s.student.year}` : ''}
                                  </p>
                                </div>

                                <div className="flex items-center gap-3 self-end sm:self-auto">
                                  <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                                    {s.skills.slice(0, 3).map((sk, j) => (
                                      <span key={j} className="px-2 py-0.5 bg-white text-slate-600 text-xs rounded border border-slate-200">
                                        {sk.skill_name}{sk.verification_level >= 1 ? ' ✓' : ''}
                                      </span>
                                    ))}
                                    {s.skills.length > 3 && (
                                      <span className="text-[11px] text-slate-400 self-center">+{s.skills.length - 3}</span>
                                    )}
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
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
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
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* TAB: COLLEGE STUDENTS */}
        {dashboardTab === 'students' && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <GraduationCap className="w-5 h-5" /> Students at {college?.name}
              </h2>
              <button
                onClick={toggleCollegeStudents}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200"
              >
                {collegeStudentsLoading ? 'Refreshing...' : 'Refresh List'}
              </button>
            </div>
                {collegeStudentsLoading ? (
                  <p className="text-sm text-slate-400">Loading students...</p>
                ) : collegeStudents.length === 0 ? (
                  <p className="text-sm text-slate-400">No students found from your college yet.</p>
                ) : (
                  <div className="space-y-2">
                    {collegeStudents.map((s, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 hover:bg-slate-100/70 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-800">{s.student.name}</p>
                            {s.hireability && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[11px] font-extrabold rounded-md">
                                <Sparkles className="w-3 h-3 text-indigo-600" /> Score: {s.hireability.score}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {s.student.email}
                            {s.student.branch ? ` · ${s.student.branch}` : ''}
                            {s.student.year ? ` · Year ${s.student.year}` : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                            {s.skills.length === 0 ? (
                              <span className="text-xs text-slate-400">No skills yet</span>
                            ) : (
                              s.skills.slice(0, 3).map((sk, j) => (
                                <span key={j} className="px-2 py-0.5 bg-white text-slate-600 text-xs rounded border border-slate-200">
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
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
    </div>
  );
}