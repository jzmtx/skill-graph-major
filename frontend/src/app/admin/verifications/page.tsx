"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { CheckCircle2, Building, GraduationCap, Users, Mail, Search, Loader2 } from "lucide-react";

interface Company {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  created_at: string;
}

interface TPOOfficial {
  id: string;
  name: string;
  email: string;
  designation?: string;
  colleges?: { name: string };
  created_at: string;
}

interface Alumnus {
  id: string;
  name: string;
  email: string;
  current_company?: string;
  current_job_role?: string;
  colleges?: { name: string };
  created_at: string;
}
interface College {
  id: string;
  name: string;
  state: string;
  district?: string;
}

export default function AdminVerificationsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [tpoOfficials, setTpoOfficials] = useState<TPOOfficial[]>([]);
  const [alumni, setAlumni] = useState<Alumnus[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const [jobRole, setJobRole] = useState('');
  const [jobLocation, setJobLocation] = useState('India');
  const [fetchingJobs, setFetchingJobs] = useState(false);
  const [fetchResult, setFetchResult] = useState('');

  const [pendingColleges, setPendingColleges] = useState<College[]>([]);
  const [newCollegeName, setNewCollegeName] = useState('');
  const [newCollegeState, setNewCollegeState] = useState('');
  const [addingCollege, setAddingCollege] = useState(false);

  useEffect(() => {
    fetchPending();
  }, []);

    const fetchPending = async () => {
    try {
      const data = await adminApi.getPendingVerifications();
      setCompanies(data.companies || []);
      setTpoOfficials(data.tpo_officials || []);
      setAlumni(data.alumni || []);

      const collegeData = await adminApi.getPendingColleges();
      setPendingColleges(collegeData.colleges || []);
    } catch (error) {
      console.error("Error fetching pending verifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCompany = async (id: string) => {
    setVerifyingId(id);
    try {
      await adminApi.verifyCompany(id);
      setCompanies(companies.filter(c => c.id !== id));
    } catch (error) {
      console.error(error);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleVerifyTPO = async (id: string) => {
    setVerifyingId(id);
    try {
      await adminApi.verifyTPO(id);
      setTpoOfficials(tpoOfficials.filter(t => t.id !== id));
    } catch (error) {
      console.error(error);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleVerifyAlumni = async (id: string) => {
    setVerifyingId(id);
    try {
      await adminApi.verifyAlumni(id);
      setAlumni(alumni.filter(a => a.id !== id));
    } catch (error) {
      console.error(error);
    } finally {
      setVerifyingId(null);
    }
  };

    const handleFetchJobs = async () => {
    if (!jobRole.trim()) return;
    setFetchingJobs(true);
    setFetchResult('');
    try {
      const result = await adminApi.fetchExternalJobs(jobRole, jobLocation, 15);
      if (result.error) {
        setFetchResult(`Error: ${result.error}`);
      } else {
        setFetchResult(`Fetched ${result.inserted} new job(s) (${result.skipped || 0} duplicates skipped) from ${result.total_found || 0} found.`);
      }
    } catch (error) {
      setFetchResult('Failed to fetch jobs. Check backend logs.');
    } finally {
      setFetchingJobs(false);
    }
  };
  

   const handleApproveCollege = async (id: string) => {
    setVerifyingId(id);
    try {
      await adminApi.approveCollege(id);
      setPendingColleges(pendingColleges.filter(c => c.id !== id));
    } catch (error) {
      console.error(error);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleAddCollege = async () => {
    if (!newCollegeName.trim() || !newCollegeState.trim()) return;
    setAddingCollege(true);
    try {
      await adminApi.addCollege(newCollegeName, newCollegeState);
      setNewCollegeName('');
      setNewCollegeState('');
    } catch (error) {
      console.error(error);
    } finally {
      setAddingCollege(false);
    }
  };

  const totalPending = companies.length + tpoOfficials.length + alumni.length + pendingColleges.length;

  
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Ecosystem Verifications</h1>
        <p className="text-slate-400">Approve companies, TPO officials, and alumni before they can act on the platform.</p>
      </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-1">
          <Search className="w-5 h-5 text-indigo-400" /> Fetch Real Job Listings
        </h2>
        <p className="text-slate-400 text-sm mb-4">Pull live listings from LinkedIn, Indeed, and Glassdoor into the platform.</p>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Role (e.g. Backend Developer)"
            value={jobRole}
            onChange={e => setJobRole(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            placeholder="Location"
            value={jobLocation}
            onChange={e => setJobLocation(e.target.value)}
            className="w-40 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleFetchJobs}
            disabled={fetchingJobs || !jobRole.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50"
          >
            {fetchingJobs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {fetchingJobs ? 'Fetching...' : 'Fetch Jobs'}
          </button>
        </div>
        {fetchResult && (
          <p className="text-sm text-slate-400 mt-3">{fetchResult}</p>
        )}
      </div>

     

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-1">Add a College</h2>
        <p className="text-slate-400 text-sm mb-4">Manually add a college — it's added pre-approved.</p>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="College name"
            value={newCollegeName}
            onChange={e => setNewCollegeName(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            placeholder="State"
            value={newCollegeState}
            onChange={e => setNewCollegeState(e.target.value)}
            className="w-40 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleAddCollege}
            disabled={addingCollege || !newCollegeName.trim() || !newCollegeState.trim()}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50"
          >
            {addingCollege ? 'Adding...' : 'Add College'}
          </button>
        </div>
      </div>

      {pendingColleges.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">Pending Colleges</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800">
            {pendingColleges.map(college => (
              <div key={college.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">{college.name}</div>
                  <div className="text-xs text-slate-500">{college.state} {college.district ? `· ${college.district}` : ''}</div>
                </div>
                <button
                  onClick={() => handleApproveCollege(college.id)}
                  disabled={verifyingId === college.id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-medium rounded-lg hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  {verifyingId === college.id ? 'Approving...' : 'Approve'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="text-slate-400 text-sm font-medium mb-1">Pending Companies</div>
          <div className="text-3xl font-bold text-white">{companies.length}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="text-slate-400 text-sm font-medium mb-1">Pending TPOs</div>
          <div className="text-3xl font-bold text-white">{tpoOfficials.length}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="text-slate-400 text-sm font-medium mb-1">Pending Alumni</div>
          <div className="text-3xl font-bold text-white">{alumni.length}</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-8">Loading pending verifications...</div>
      ) : totalPending === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-500">
          Nothing pending — all caught up.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Companies */}
          {companies.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-3">
                <Building className="w-5 h-5 text-indigo-400" /> Companies
              </h2>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800">
                {companies.map(company => (
                  <div key={company.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{company.name}</div>
                      <div className="text-xs text-slate-500">
                        {company.industry || 'No industry listed'} {company.website ? `· ${company.website}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => handleVerifyCompany(company.id)}
                      disabled={verifyingId === company.id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-medium rounded-lg hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {verifyingId === company.id ? 'Verifying...' : 'Verify'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TPO Officials */}
          {tpoOfficials.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-3">
                <GraduationCap className="w-5 h-5 text-indigo-400" /> TPO Officials
              </h2>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800">
                {tpoOfficials.map(tpo => (
                  <div key={tpo.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{tpo.name}</div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {tpo.email}</span>
                        <span>{tpo.colleges?.name || 'Unknown college'}</span>
                        {tpo.designation && <span>· {tpo.designation}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleVerifyTPO(tpo.id)}
                      disabled={verifyingId === tpo.id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-medium rounded-lg hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {verifyingId === tpo.id ? 'Verifying...' : 'Verify'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alumni */}
          {alumni.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-3">
                <Users className="w-5 h-5 text-indigo-400" /> Alumni
              </h2>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800">
                {alumni.map(alumnus => (
                  <div key={alumnus.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{alumnus.name}</div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {alumnus.email}</span>
                        <span>{alumnus.colleges?.name || 'Unknown college'}</span>
                        {alumnus.current_company && <span>· {alumnus.current_company}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleVerifyAlumni(alumnus.id)}
                      disabled={verifyingId === alumnus.id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-medium rounded-lg hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {verifyingId === alumnus.id ? 'Verifying...' : 'Verify'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}