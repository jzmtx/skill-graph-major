"use client";

import React, { useEffect, useState } from 'react';
import { getAllJobs, getEligibleJobs, applyToJob } from '@/lib/companyApi';
import { getOpportunitiesForStudent, expressInterest } from '@/lib/alumniApi';
import { Briefcase, Building2, CheckCircle2, Zap, X, GraduationCap, Users, ExternalLink, Sparkles } from 'lucide-react';

export default function StudentJobsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'eligible' | 'alumni'>('eligible');
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [eligibleJobs, setEligibleJobs] = useState<any[]>([]);
  const [alumniOpportunities, setAlumniOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [applyingJob, setApplyingJob] = useState<any | null>(null);
  const [resumeUrl, setResumeUrl] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [appliedOpps, setAppliedOpps] = useState<Set<string>>(new Set());
  const [oppApplyingId, setOppApplyingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const studentId = localStorage.getItem('student_id');
      if (!studentId) return;
      try {
        const [all, eligible, opps] = await Promise.all([
          getAllJobs(),
          getEligibleJobs(studentId),
          getOpportunitiesForStudent(studentId).catch(() => [])
        ]);
        setAllJobs(all || []);
        setEligibleJobs(eligible || []);
        setAlumniOpportunities(opps || []);

        const interestedSet = new Set<string>();
        (opps || []).forEach((o: any) => {
          if (o.already_interested) interestedSet.add(o.id);
        });
        setAppliedOpps(interestedSet);
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

  const handleApplyOpportunity = async (opp: any) => {
    const studentId = localStorage.getItem('student_id');
    if (!studentId) return;

    setOppApplyingId(opp.id);
    try {
      await expressInterest(opp.id, studentId);
      setAppliedOpps(prev => new Set(prev).add(opp.id));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to express interest / apply.');
    } finally {
      setOppApplyingId(null);
    }
  };

  const renderOpportunityCard = (opp: any) => {
    const isApplied = appliedOpps.has(opp.id) || opp.already_interested;
    const isSubmittingThis = oppApplyingId === opp.id;

    const typeBadges: Record<string, { label: string; color: string }> = {
      referral: { label: "Alumni Referral", color: "bg-purple-50 text-purple-700 border-purple-200" },
      internship: { label: "Internship", color: "bg-blue-50 text-blue-700 border-blue-200" },
      mentorship: { label: "Mentorship", color: "bg-teal-50 text-teal-700 border-teal-200" },
      job: { label: "Direct Job", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
      opensource: { label: "Open Source", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    };

    const typeInfo = typeBadges[opp.type] || { label: opp.type, color: "bg-slate-50 text-slate-700 border-slate-200" };

    return (
      <div key={opp.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
        {opp.from_my_college && (
          <div className="absolute top-0 right-0 px-4 py-1.5 bg-amber-50 text-amber-800 border-b border-l border-amber-200 font-bold text-xs rounded-bl-xl flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5" /> From Your College Alumni
          </div>
        )}

        <div className="flex justify-between items-start mb-4">
          <div className="pr-20">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold uppercase tracking-wider ${typeInfo.color}`}>
                {typeInfo.label}
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-800">{opp.title}</h3>
            {opp.posted_by && (
              <div className="flex flex-wrap items-center gap-2 text-slate-600 mt-2 text-sm font-medium">
                <span className="flex items-center gap-1 text-slate-700 font-semibold">
                  <Users className="w-4 h-4 text-indigo-600" /> {opp.posted_by.name}
                </span>
                {opp.posted_by.current_company && (
                  <span>• {opp.posted_by.current_company}</span>
                )}
                {opp.posted_by.current_job_role && (
                  <span className="text-slate-500">({opp.posted_by.current_job_role})</span>
                )}
                {opp.posted_by.linkedin_url && (
                  <a 
                    href={opp.posted_by.linkedin_url.startsWith('http') ? opp.posted_by.linkedin_url : `https://${opp.posted_by.linkedin_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-xs text-blue-600 hover:underline gap-0.5 ml-1"
                  >
                    LinkedIn <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="mt-1 shrink-0">
            {isApplied ? (
              <span className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 text-sm font-bold rounded-lg border border-green-200">
                <CheckCircle2 className="w-4 h-4" /> Applied
              </span>
            ) : (
              <button
                onClick={() => handleApplyOpportunity(opp)}
                disabled={isSubmittingThis}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <Briefcase className="w-4 h-4" /> {isSubmittingThis ? 'Applying...' : 'Apply / Express Interest'}
              </button>
            )}
          </div>
        </div>

        {opp.description && (
          <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap leading-relaxed">{opp.description}</p>
        )}
      </div>
    );
  };

  if (loading) return <div className="p-8 text-center text-slate-500 min-h-screen">Loading Opportunities...</div>;

  const currentJobs = activeTab === 'eligible' ? eligibleJobs : allJobs;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Opportunities & Job Board</h1>
        <p className="text-slate-500">Discover company roles and alumni opportunities curated for you.</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={() => setActiveTab('eligible')}
          className={`px-5 py-2.5 rounded-full text-sm font-bold transition-colors ${
            activeTab === 'eligible' 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${activeTab === 'eligible' ? 'fill-indigo-400 text-indigo-400' : ''}`} />
            Eligible Company Jobs ({eligibleJobs.length})
          </div>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`px-5 py-2.5 rounded-full text-sm font-bold transition-colors ${
            activeTab === 'all' 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Browse All Company Jobs ({allJobs.length})
        </button>

        <button
          onClick={() => setActiveTab('alumni')}
          className={`px-5 py-2.5 rounded-full text-sm font-bold transition-colors ${
            activeTab === 'alumni' 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Alumni Opportunities & Referrals ({alumniOpportunities.length})
          </div>
        </button>
      </div>

      {activeTab === 'alumni' ? (
        alumniOpportunities.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">No alumni opportunities right now</h3>
            <p className="text-slate-500 text-sm">
              Alumni haven't posted any open referrals or opportunities yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {alumniOpportunities.map(opp => renderOpportunityCard(opp))}
          </div>
        )
      ) : currentJobs.length === 0 ? (
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