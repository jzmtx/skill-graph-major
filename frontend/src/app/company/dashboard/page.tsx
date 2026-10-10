"use client";

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
      const authId = typeof window !== 'undefined' ? localStorage.getItem('company_auth_id') : null;
      if (!authId || authId === 'undefined') {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('company_auth_id');
          localStorage.removeItem('company_id');
        }
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
    const authId = typeof window !== 'undefined' ? localStorage.getItem('company_auth_id') : null;
    if (!authId) return;
    
    setFormLoading(true);
    setFormError('');

    try {
      const skillsArray = skillsInput.split(',').map(s => {
        return { skill_name: s.trim(), level: 1 };
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
      setFormError(err.response?.data?.detail || 'Failed to post vacancy');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-500 text-xs">Loading employer dashboard...</div>;
  }

  if (error) {
    return <div className="min-h-screen bg-stone-50 flex items-center justify-center text-red-700 text-xs">{error}</div>;
  }

  const { company, active_jobs, total_applications, shortlisted, hired } = dashboard;

  return (
    <div className="min-h-screen bg-stone-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-white shadow-2xs border border-stone-200 rounded-xl flex items-center justify-center text-emerald-800">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-stone-900">{company?.name}</h1>
              <p className="text-xs text-stone-500">{company?.industry || 'Enterprise'} • {company?.website || 'Verified Employer'}</p>
            </div>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Active Roles</p>
              <Briefcase className="w-3.5 h-3.5 text-stone-400" />
            </div>
            <p className="text-2xl font-bold text-stone-900">{active_jobs}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Total Applicants</p>
              <Users className="w-3.5 h-3.5 text-stone-400" />
            </div>
            <p className="text-2xl font-bold text-stone-900">{total_applications}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Shortlisted</p>
              <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-stone-900">{shortlisted}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Candidates Hired</p>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800" />
            </div>
            <p className="text-2xl font-bold text-emerald-800">{hired}</p>
          </div>
        </div>

        {/* Post Job Button */}
        <div className="flex justify-between items-center pt-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700">Active Vacancies</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-800 text-white text-xs font-semibold rounded-lg hover:bg-emerald-900 transition-colors shadow-2xs"
          >
            {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showForm ? 'Cancel' : 'Post New Vacancy'}
          </button>
        </div>

        {/* New Job Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 animate-in slide-in-from-top-2 duration-150">
            <h3 className="text-sm font-bold text-stone-900 mb-4">Publish Position Listing</h3>
            {formError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs mb-3 border border-red-200">{formError}</div>
            )}
            <form onSubmit={handleCreateJob} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">Job Title</label>
                <input
                  type="text" required
                  className="w-full p-2.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:border-emerald-800 focus:bg-white outline-none"
                  value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Associate Backend Engineer"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">Job Description</label>
                <textarea
                  required rows={4}
                  className="w-full p-2.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:border-emerald-800 focus:bg-white outline-none"
                  value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Describe technical domain, scope, and team expectations..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">Required Competencies (Comma-separated)</label>
                <input
                  type="text" required
                  placeholder="e.g. Python, PostgreSQL, Docker"
                  className="w-full p-2.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:border-emerald-800 focus:bg-white outline-none"
                  value={skillsInput} onChange={e => setSkillsInput(e.target.value)}
                />
                <p className="text-[10px] text-stone-400 mt-1">Skills matching algorithm will evaluate candidates against these tags.</p>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-6 py-2 bg-emerald-800 text-white font-semibold text-xs rounded-lg hover:bg-emerald-900 disabled:opacity-50 transition-colors shadow-2xs"
                >
                  {formLoading ? 'Publishing...' : 'Publish Vacancy'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Job List */}
        {jobs.length === 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 p-12 text-center shadow-2xs">
            <Briefcase className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-stone-700 mb-1">No vacancies published</h3>
            <p className="text-stone-400 text-xs">Publish your first position to match qualified candidates.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jobs.map(job => (
              <div key={job.id} className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs hover:border-emerald-700 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="text-base font-bold text-stone-900">{job.title}</h3>
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
                      job.status === 'open' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-stone-100 text-stone-600 border-stone-200'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mb-3 line-clamp-2 leading-relaxed">{job.description}</p>
                  
                  <div className="flex flex-wrap gap-1 mb-4">
                    {job.required_skills?.map((skill: any, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-stone-100 text-stone-700 border border-stone-200 text-[11px] font-medium rounded">
                        {skill.skill_name}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs">
                  <div className="flex items-center gap-1.5 text-stone-600 font-medium">
                    <Users className="w-3.5 h-3.5 text-stone-400" />
                    <span>{job.job_applications?.[0]?.count || 0} Candidates</span>
                  </div>
                  <Link 
                    href={`/company/jobs/${job.id}/applicants`}
                    className="font-semibold text-emerald-800 hover:text-emerald-950 text-xs"
                  >
                    Candidate Dossiers &rarr;
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