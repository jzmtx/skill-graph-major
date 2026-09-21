"use client";

import React, { useEffect, useState } from 'react';
import { getAllJobs, getEligibleJobs, applyToJob } from '@/lib/companyApi';
import { Briefcase, Building2, CheckCircle2, Zap, X } from 'lucide-react';

export default function StudentJobsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'eligible'>('eligible');
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [eligibleJobs, setEligibleJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [applyingJob, setApplyingJob] = useState<any | null>(null);
  const [resumeUrl, setResumeUrl] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      const studentId = localStorage.getItem('student_id');
      if (!studentId) return;
      try {
        const [all, eligible] = await Promise.all([
          getAllJobs(),
          getEligibleJobs(studentId)
        ]);
        setAllJobs(all || []);
        setEligibleJobs(eligible || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleApplyClick = (job: any) => {
    setApplyingJob(job);
    setResumeUrl('');
    setCoverLetter('');
    setSubmitError('');
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const studentId = localStorage.getItem('student_id');
    if (!studentId || !applyingJob) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      await applyToJob(applyingJob.id, {
        student_id: studentId,
        resume_url: resumeUrl,
        cover_letter: coverLetter
      });
      
      const updatedApplied = new Set(appliedJobs);
      updatedApplied.add(applyingJob.id);
      setAppliedJobs(updatedApplied);
      setApplyingJob(null);
    } catch (err: any) {
      setSubmitError(err.response?.data?.detail || 'Failed to submit application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderJobCard = (job: any, isEligibleTab: boolean) => {
    const isApplied = appliedJobs.has(job.id);
    
    return (
      <div key={job.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
        {isEligibleTab && (
          <div className="absolute top-0 right-0 px-4 py-1.5 bg-green-50 text-green-700 border-b border-l border-green-100 font-bold text-xs rounded-bl-xl flex items-center gap-1">
            <Zap className="w-3 h-3 fill-current" /> {job.match_score}% MATCH
          </div>
        )}
        
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800">{job.title}</h3>
            <div className="flex items-center gap-2 text-slate-500 mt-1 text-sm font-medium">
              <Building2 className="w-4 h-4" /> {job.companies?.name || 'Company Name'}
            </div>
          </div>
          <div className="mt-1">
            {isApplied ? (
              <span className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 text-sm font-bold rounded-lg border border-green-200">
                <CheckCircle2 className="w-4 h-4" /> Applied
              </span>
            ) : (
              <button
                onClick={() => handleApplyClick(job)}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Briefcase className="w-4 h-4" /> Apply Now
              </button>
            )}
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-6 line-clamp-2">{job.description}</p>

        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Required Skills</h4>
          <div className="flex flex-wrap gap-2">
            {job.required_skills?.map((s: any, idx: number) => (
              <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                {s.skill_name}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="p-8 text-center text-slate-500 min-h-screen">Loading Opportunities...</div>;

  const currentJobs = activeTab === 'eligible' ? eligibleJobs : allJobs;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Job Board</h1>
        <p className="text-slate-500">Discover roles curated for your skill profile.</p>
      </div>

      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setActiveTab('eligible')}
          className={`px-6 py-2.5 rounded-full text-sm font-bold transition-colors ${
            activeTab === 'eligible' 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${activeTab === 'eligible' ? 'fill-indigo-400 text-indigo-400' : ''}`} />
            Eligible For Me
          </div>
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-6 py-2.5 rounded-full text-sm font-bold transition-colors ${
            activeTab === 'all' 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Browse All Jobs
        </button>
      </div>

      {currentJobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Briefcase className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No jobs found</h3>
          <p className="text-slate-500 text-sm">
            {activeTab === 'eligible' 
              ? "We couldn't find any jobs matching your verified skills right now. Keep leveling up!" 
              : "There are no open job postings right now."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {currentJobs.map(job => renderJobCard(job, activeTab === 'eligible'))}
        </div>
      )}

      {/* Application Modal */}
      {applyingJob && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Apply to {applyingJob.companies?.name}</h2>
              <button onClick={() => setApplyingJob(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleApplySubmit} className="p-6">
              <div className="mb-6">
                <h3 className="font-bold text-slate-800 mb-1">{applyingJob.title}</h3>
                <p className="text-sm text-slate-500">Submit your application directly to the recruiter.</p>
              </div>

              {submitError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium mb-6">
                  {submitError}
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Resume URL <span className="text-red-500">*</span></label>
                  <input
                    type="url" required
                    placeholder="Link to your Google Drive, Portfolio, or PDF"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                    value={resumeUrl} onChange={e => setResumeUrl(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Cover Letter <span className="text-slate-400 font-normal">(Optional)</span></label>
                  <textarea
                    rows={4}
                    placeholder="Why are you a great fit for this role?"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                    value={coverLetter} onChange={e => setCoverLetter(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setApplyingJob(null)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !resumeUrl}
                  className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
                >
                  {isSubmitting ? 'Sending...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}