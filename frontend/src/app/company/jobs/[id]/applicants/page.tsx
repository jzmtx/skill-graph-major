"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getApplicants, updateApplicationStatus } from '@/lib/companyApi';
import { ArrowLeft, ExternalLink, Mail, GraduationCap } from 'lucide-react';

interface Applicant {
  application_id: string;
  status: string;
  applied_at: string;
  student: {
    id: string;
    name: string;
    email: string;
    branch?: string;
    year?: number;
    github_url?: string;
  };
  skills: { skill_name: string; verification_level: number; skill_score: number }[];
  matched_skills: string[];
  match_percentage: number;
}

const STATUS_OPTIONS = ['applied', 'shortlisted', 'rejected', 'hired'];

const STATUS_COLORS: Record<string, string> = {
  applied: 'bg-slate-100 text-slate-600',
  shortlisted: 'bg-blue-50 text-blue-700',
  rejected: 'bg-red-50 text-red-600',
  hired: 'bg-green-50 text-green-700',
};

export default function ApplicantsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getApplicants(jobId);
        setApplicants(data);
      } catch {
        setError('Failed to load applicants.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [jobId]);

  const handleStatusChange = async (applicationId: string, newStatus: string) => {
    setUpdatingId(applicationId);
    try {
      await updateApplicationStatus(applicationId, newStatus);
      setApplicants(prev =>
        prev.map(a => a.application_id === applicationId ? { ...a, status: newStatus } : a)
      );
    } catch {
      // silently ignore for now
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading applicants...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/company/dashboard')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <h1 className="text-2xl font-bold text-slate-800 mb-1">Applicants</h1>
        <p className="text-sm text-slate-500 mb-6">
          {applicants.length} {applicants.length === 1 ? 'candidate has' : 'candidates have'} applied, ranked by skill match.
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6">{error}</div>
        )}

        {applicants.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
            No applicants yet.
          </div>
        ) : (
          <div className="space-y-3">
            {applicants.map(app => (
              <div key={app.application_id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-slate-800">{app.student.name}</h3>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">
                        {app.match_percentage}% match
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {app.student.email}</span>
                      {app.student.branch && (
                        <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> {app.student.branch} {app.student.year ? `· Year ${app.student.year}` : ''}</span>
                      )}
                      {app.student.github_url && (
                        <a href={app.student.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-indigo-600">
                          <ExternalLink className="w-3.5 h-3.5" /> ExternalLink
                        </a>
                      )}
                    </div>

                    {app.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {app.skills.map((s, i) => (
                          <span
                            key={i}
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              app.matched_skills.includes(s.skill_name.toLowerCase())
                                ? 'bg-green-50 text-green-700'
                                : 'bg-slate-50 text-slate-500'
                            }`}
                          >
                            {s.skill_name} {s.verification_level >= 1 && '✓'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 ml-4">
                    <select
                      value={app.status}
                      disabled={updatingId === app.application_id}
                      onChange={e => handleStatusChange(app.application_id, e.target.value)}
                      className={`text-xs font-medium rounded-lg px-3 py-1.5 border-0 outline-none cursor-pointer capitalize ${STATUS_COLORS[app.status]}`}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
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