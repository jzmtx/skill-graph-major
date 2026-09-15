"use client"; // force reload

import React, { useEffect, useState } from 'react';
import { getCompanyDashboard, getCompanyJobs, postJob } from '@/lib/companyApi';
import { useRouter } from 'next/navigation';
import { Briefcase, Plus, X, Users, MapPin, Building2, CheckCircle2, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function CompanyDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [dashboard, setDashboard] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skillsInput, setSkillsInput] = useState('');

  useEffect(() => {
    const load = async () => {
      // In a real app we'd get this from a proper auth provider or login context
      // Assuming company registered and stored auth_id. 
      // For testing, we fallback to a known ID if you register one, or force login
      const authId = localStorage.getItem('company_auth_id');
      if (!authId || authId === 'undefined') {
        localStorage.removeItem('company_auth_id');
        localStorage.removeItem('company_id');
        router.push('/login');
        return;
      }
      try {
        const dashData = await getCompanyDashboard(authId);
        setDashboard(dashData);

        const jobList = await getCompanyJobs(authId);
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
    const authId = localStorage.getItem('company_auth_id');
    if (!authId) return;
    
    setFormLoading(true);
    setFormError('');

    try {
      const skillsArray = skillsInput.split(',').map(s => {
        return { skill_name: s.trim(), level: 1 }; // Default level 1 for simplicity
      }).filter(s => s.skill_name.length > 0);

      await postJob(authId, {
        title,
        description: description,
        required_skills: skillsArray
      });

      const jobList = await getCompanyJobs(authId);
      setJobs(jobList);
      
      const dashData = await getCompanyDashboard(authId);
      setDashboard(dashData);
      
      setShowForm(false);
      setTitle(''); setDescription(''); setSkillsInput('');
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to post job');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-red-600">{error}</div>;
  }

  const { company, active_jobs, total_applications, shortlisted, hired } = dashboard;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white shadow-sm border border-slate-200 rounded-xl flex items-center justify-center">
              <Building2 className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">{company?.name}</h1>
              <p className="text-sm text-slate-500">{company?.industry || 'Technology'} • {company?.website || 'Website not provided'}</p>
            </div>
          </div>
        </div>

        {/* Top Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-500">Active Jobs</p>
              <Briefcase className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{active_jobs}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-500">Total Applicants</p>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{total_applications}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-500">Shortlisted</p>
              <TrendingUp className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{shortlisted}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-500">Hired</p>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{hired}</p>
          </div>
        </div>

        {/* Post Job Button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">Job Postings</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'Post New Vacancy'}
          </button>
        </div>

        {/* New Job Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 mb-8 animate-in slide-in-from-top-4 duration-300">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Create Job Posting</h3>
            {formError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{formError}</div>
            )}
            <form onSubmit={handleCreateJob} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
                <input
                  type="text" required
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                  value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Senior Frontend Developer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Job Description</label>
                <textarea
                  required rows={4}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                  value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Describe the role, responsibilities, and perks..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Required Skills (Comma-separated)</label>
                <input
                  type="text" required
                  placeholder="e.g. React, Node.js, TypeScript"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                  value={skillsInput} onChange={e => setSkillsInput(e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-1">Our intelligent matching engine will use these to evaluate students.</p>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {formLoading ? 'Publishing...' : 'Publish Job'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Job List */}
        {jobs.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Briefcase className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No active jobs</h3>
            <p className="text-slate-500">Post a new vacancy to start attracting top student talent.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {jobs.map(job => (
              <div key={job.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${job.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {job.status.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-1 pr-20">{job.title}</h3>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2">{job.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {job.required_skills?.map((skill: any, i: number) => (
                    <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-medium rounded-md">
                      {skill.skill_name}
                    </span>
                  ))}
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>{job.job_applications?.[0]?.count || 0} Applicants</span>
                  </div>
                  <Link 
                    href={`/company/jobs/${job.id}/applicants`}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    View Pipeline &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}