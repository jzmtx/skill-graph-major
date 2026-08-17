"use client";

import React, { useEffect, useState } from 'react';
import { getRecruiterProfile, getMyJobs, createJob, deactivateJob } from '@/lib/companyApi';
import { useRouter } from 'next/navigation';
import { Briefcase, Plus, X, Users, MapPin, Building2 } from 'lucide-react';

interface Job {
  id: string;
  title: string;
  description?: string;
  required_skills: string[];
  location?: string;
  ctc?: string;
  deadline?: string;
  is_active: boolean;
  created_at: string;
}

export default function CompanyDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recruiter, setRecruiter] = useState<{ id: string; name: string } | null>(null);
  const [company, setCompany] = useState<{ name: string; is_verified: boolean } | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [location, setLocation] = useState('');
  const [ctc, setCtc] = useState('');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    const load = async () => {
      const authId = localStorage.getItem('recruiter_auth_id');
      if (!authId) {
        router.push('/login');
        return;
      }
      try {
        const profile = await getRecruiterProfile(authId);
        setRecruiter(profile.recruiter);
        setCompany(profile.company);

        const jobList = await getMyJobs(profile.recruiter.id);
        setJobs(jobList);
      } catch {
        setError('Failed to load dashboard. Please try logging in again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recruiter) return;
    setFormLoading(true);
    setFormError('');

    try {
      const skillsArray = skillsInput.split(',').map(s => s.trim()).filter(Boolean);
      await createJob({
        recruiter_id: recruiter.id,
        title,
        description: description || undefined,
        required_skills: skillsArray,
        location: location || undefined,
        ctc: ctc || undefined,
        deadline: deadline || undefined,
      });

      const jobList = await getMyJobs(recruiter.id);
      setJobs(jobList);
      setShowForm(false);
      setTitle(''); setDescription(''); setSkillsInput(''); setLocation(''); setCtc(''); setDeadline('');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setFormError(error.response?.data?.detail || 'Failed to post job');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeactivate = async (jobId: string) => {
    try {
      await deactivateJob(jobId);
      setJobs(jobs.map(j => j.id === jobId ? { ...j, is_active: false } : j));
    } catch {
      // silently ignore for now
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
            <Building2 className="w-8 h-8 text-indigo-700" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{company?.name}</h1>
              <p className="text-sm text-slate-500">Welcome back, {recruiter?.name}</p>
            </div>
          </div>
          {company && !company.is_verified && (
            <span className="px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
              Pending Verification
            </span>
          )}
        </div>

        {company && !company.is_verified && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-4 rounded-lg mb-6">
            Your company is awaiting admin approval. You can prepare job postings, but they won&apos;t go live until verification completes.
          </div>
        )}

        {/* Post Job Button */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Briefcase className="w-5 h-5" /> Your Job Postings
          </h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'Post New Job'}
          </button>
        </div>

        {/* New Job Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            {formError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{formError}</div>
            )}
            <form onSubmit={handleCreateJob} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Required Skills (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. React, Node.js, PostgreSQL"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={skillsInput} onChange={e => setSkillsInput(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={location} onChange={e => setLocation(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CTC</label>
                  <input
                    type="text"
                    placeholder="e.g. 8-12 LPA"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={ctc} onChange={e => setCtc(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
                  <input
                    type="date"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={deadline} onChange={e => setDeadline(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={formLoading}
                className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {formLoading ? 'Posting...' : 'Post Job'}
              </button>
            </form>
          </div>
        )}

        {/* Job List */}
        {jobs.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
            No jobs posted yet. Click &quot;Post New Job&quot; to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <div key={job.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800">{job.title}</h3>
                      {!job.is_active && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">Closed</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                      {job.location && (
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>
                      )}
                      {job.ctc && <span>{job.ctc}</span>}
                    </div>
                    {job.required_skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {job.required_skills.map((skill, i) => (
                          <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => router.push(`/company/jobs/${job.id}/applicants`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-200"
                    >
                      <Users className="w-3.5 h-3.5" /> Applicants
                    </button>
                    {job.is_active && (
                      <button
                        onClick={() => handleDeactivate(job.id)}
                        className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}