"use client";

import React, { useEffect, useState } from 'react';
import { getJobApplicants, updateApplicationStatus } from '@/lib/companyApi';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User, FileText, Check, X, Star } from 'lucide-react';
import Link from 'next/link';

export default function JobApplicantsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applicants, setApplicants] = useState<any[]>([]);
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null);
  
  const fetchApplicants = async (authId: string) => {
    try {
      const data = await getJobApplicants(authId, jobId);
      setApplicants(data || []);
      if (data && data.length > 0 && !selectedApplicant) {
        setSelectedApplicant(data[0]);
      }
    } catch {
      setError('Failed to load applicants for this job.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const authId = localStorage.getItem('company_auth_id');
    if (!authId) {
      router.push('/login');
      return;
    }
    fetchApplicants(authId);
  }, [jobId, router]);

  const handleStatusChange = async (appId: string, status: string) => {
    const authId = localStorage.getItem('company_auth_id');
    if (!authId) return;
    
    try {
      await updateApplicationStatus(authId, appId, status);
      // Optimistic update
      setApplicants(apps => apps.map(a => a.id === appId ? { ...a, status } : a));
      if (selectedApplicant && selectedApplicant.id === appId) {
        setSelectedApplicant({ ...selectedApplicant, status });
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading Pipeline...</div>;
  if (error) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col h-screen overflow-hidden">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <Link href="/company/dashboard" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="text-sm font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-md">
          {applicants.length} Total Applicants
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Applicant List */}
        <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-bold text-slate-800">Pipeline Pipeline</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {applicants.length === 0 ? (
              <p className="text-center text-sm text-slate-400 mt-10">No applicants yet.</p>
            ) : (
              applicants.map(app => (
                <button
                  key={app.id}
                  onClick={() => setSelectedApplicant(app)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedApplicant?.id === app.id 
                      ? 'border-indigo-500 bg-indigo-50 shadow-sm' 
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800">{app.students?.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      app.status === 'shortlisted' ? 'bg-amber-100 text-amber-700' :
                      app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      app.status === 'hired' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-slate-200 text-slate-600'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{app.students?.email}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Branch: {app.students?.branch || 'N/A'}</span>
                    <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-md">
                      <Star className="w-3 h-3 fill-current" />
                      <span className="text-xs font-bold">{app.match_score}% Match</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Applicant Deep Dive */}
        <div className="w-2/3 bg-slate-50 flex flex-col h-full overflow-y-auto">
          {selectedApplicant ? (
            <div className="p-8 max-w-4xl mx-auto w-full">
              {/* Profile Header */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6 flex justify-between items-start">
                <div className="flex gap-6 items-center">
                  <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center">
                    <User className="w-10 h-10 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-slate-800 mb-1">{selectedApplicant.students?.name}</h2>
                    <p className="text-slate-500">{selectedApplicant.students?.email} • {selectedApplicant.students?.branch}</p>
                    <div className="mt-4 flex gap-3">
                      <a 
                        href={selectedApplicant.resume_url} 
                        target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors"
                      >
                        <FileText className="w-4 h-4" /> View Resume
                      </a>
                    </div>
                  </div>
                </div>
                
                {/* Match Score Badge */}
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full border-8 border-green-100 flex items-center justify-center mb-2">
                    <span className="text-2xl font-black text-green-600">{selectedApplicant.match_score}%</span>
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">JD Match</span>
                </div>
              </div>

              {selectedApplicant.cover_letter && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Cover Letter</h3>
                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedApplicant.cover_letter}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex gap-4">
                <button 
                  disabled={selectedApplicant.status === 'shortlisted'}
                  onClick={() => handleStatusChange(selectedApplicant.id, 'shortlisted')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-bold hover:bg-amber-100 disabled:opacity-50"
                >
                  <Check className="w-5 h-5" /> Shortlist Candidate
                </button>
                <button 
                  disabled={selectedApplicant.status === 'hired'}
                  onClick={() => handleStatusChange(selectedApplicant.id, 'hired')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold hover:bg-emerald-100 disabled:opacity-50"
                >
                  <Star className="w-5 h-5" /> Hire
                </button>
                <button 
                  disabled={selectedApplicant.status === 'rejected'}
                  onClick={() => handleStatusChange(selectedApplicant.id, 'rejected')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 text-red-700 border border-red-200 rounded-xl font-bold hover:bg-red-100 disabled:opacity-50"
                >
                  <X className="w-5 h-5" /> Reject
                </button>
              </div>

            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              Select a candidate from the pipeline to view their profile.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}