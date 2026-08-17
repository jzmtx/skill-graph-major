"use client";

import React, { useEffect, useState } from 'react';
import { browseJobs, checkEligibility, applyToJob, getMyApplications } from '@/lib/jobsApi';
import { Briefcase, MapPin, Building2, CheckCircle2 } from 'lucide-react';

interface Job {
  id: string;
  title: string;
  description?: string;
  required_skills: string[];
  location?: string;
  ctc?: string;
  deadline?: string;
  is_active: boolean;
  company_name?: string;
}

interface Application {
  id: string;
  job_id: string;
  status: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);

  const [eligibility, setEligibility] = useState<Record<string, { match_percentage: number; matched_skills: string[]; missing_skills: string[] }>>({});
  const [applyingId, setApplyingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const sid = localStorage.getItem('student_id');
      setStudentId(sid);

      try {
        const jobList = await browseJobs();
        setJobs(jobList);

        if (sid) {
          const myApps = await getMyApplications(sid);
          setApplications(myApps);

          const eligibilityMap: typeof eligibility = {};
          await Promise.all(
            jobList.map(async (job: Job) => {
              try {
                const result = await checkEligibility(job.id, sid);
                eligibilityMap[job.id] = result;
              } catch {
                // skip if it fails
              }
            })
          );
          setEligibility(eligibilityMap);
        }
      } catch {
        setError('Failed to load jobs.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleApply = async (jobId: string) => {
    if (!studentId) return;
    setApplyingId(jobId);
    try {
      await applyToJob(jobId, studentId);
      setApplications([...applications, { id: 'temp', job_id: jobId, status: 'applied' }]);
    } catch {
      // silently ignore for now
    } finally {
      setApplyingId(null);
    }
  };

  const hasApplied = (jobId: string) => applications.some(a => a.job_id === jobId);

  if (loading) {
    return <div className="p-8 text-slate-500">Loading jobs...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Jobs</h1>
      <p className="text-sm text-slate-500 mb-6">Browse open roles and check your fit before applying.</p>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6">{error}</div>
      )}

      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
          No jobs available right now. Check back soon.
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => {
            const elig = eligibility[job.id];
            const applied = hasApplied(job.id);

            return (
              <div key={job.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800">{job.title}</h3>
                      {elig && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          elig.match_percentage >= 70 ? 'bg-green-50 text-green-700' :
                          elig.match_percentage >= 40 ? 'bg-amber-50 text-amber-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {elig.match_percentage}% match
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                      {job.company_name && (
                        <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {job.company_name}</span>
                      )}
                      {job.location && (
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>
                      )}
                      {job.ctc && <span>{job.ctc}</span>}
                    </div>

                    {job.description && (
                      <p className="text-sm text-slate-600 mt-2 line-clamp-2">{job.description}</p>
                    )}

                    {job.required_skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {job.required_skills.map((skill, i) => {
                          const matched = elig?.matched_skills.includes(skill.toLowerCase());
                          return (
                            <span
                              key={i}
                              className={`px-2 py-0.5 text-xs rounded-full ${
                                matched ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-500'
                              }`}
                            >
                              {skill}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 ml-4">
                    {applied ? (
                      <span className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 text-sm font-medium rounded-lg">
                        <CheckCircle2 className="w-4 h-4" /> Applied
                      </span>
                    ) : (
                      <button
                        onClick={() => handleApply(job.id)}
                        disabled={applyingId === job.id || !studentId}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <Briefcase className="w-4 h-4" />
                        {applyingId === job.id ? 'Applying...' : 'Apply'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}