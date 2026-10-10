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
      fetchPending();
    } catch (error) {
      console.error(error);
    } finally {
      setAddingCollege(false);
    }
  };

  const totalPending = companies.length + tpoOfficials.length + alumni.length + pendingColleges.length;

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900 mb-1 tracking-tight">Institutional & Employer Verifications</h1>
        <p className="text-stone-500 text-xs">Authorize companies, TPO officials, and alumni before credentials activate on the platform.</p>
      </div>

      {/* External Job Market Ingestion */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 mb-8 shadow-xs">
        <h2 className="flex items-center gap-2 text-sm font-bold text-stone-900 mb-1">
          <Search className="w-4 h-4 text-emerald-800" /> Ingest Real Market Job Postings
        </h2>
        <p className="text-stone-500 text-xs mb-4">Pull active market listings from external indices into SkillGraph&apos;s matching engine.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Role (e.g. Distributed Systems Engineer)"
            value={jobRole}
            onChange={e => setJobRole(e.target.value)}
            className="flex-1 bg-stone-50 border border-stone-300 rounded-lg px-3.5 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-700 focus:bg-white"
          />
          <input
            type="text"
            placeholder="Location"
            value={jobLocation}
            onChange={e => setJobLocation(e.target.value)}
            className="w-full sm:w-44 bg-stone-50 border border-stone-300 rounded-lg px-3.5 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-700 focus:bg-white"
          />
          <button
            onClick={handleFetchJobs}
            disabled={fetchingJobs || !jobRole.trim()}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-800 text-white text-xs font-semibold rounded-lg hover:bg-emerald-900 disabled:opacity-50 transition-colors shadow-xs"
          >
            {fetchingJobs ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            {fetchingJobs ? 'Querying...' : 'Fetch Roles'}
          </button>
        </div>
        {fetchResult && (
          <p className="text-xs text-stone-600 mt-3 font-medium">{fetchResult}</p>
        )}
      </div>

      {/* Add College Section */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 mb-8 shadow-xs">
        <h2 className="text-sm font-bold text-stone-900 mb-1">Add Approved Institution</h2>
        <p className="text-stone-500 text-xs mb-4">Register an accredited institution directly to the institutional directory.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Official College Name"
            value={newCollegeName}
            onChange={e => setNewCollegeName(e.target.value)}
            className="flex-1 bg-stone-50 border border-stone-300 rounded-lg px-3.5 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-700 focus:bg-white"
          />
          <input
            type="text"
            placeholder="State / Region"
            value={newCollegeState}
            onChange={e => setNewCollegeState(e.target.value)}
            className="w-full sm:w-44 bg-stone-50 border border-stone-300 rounded-lg px-3.5 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-700 focus:bg-white"
          />
          <button
            onClick={handleAddCollege}
            disabled={addingCollege || !newCollegeName.trim() || !newCollegeState.trim()}
            className="px-4 py-2 bg-stone-800 text-white text-xs font-semibold rounded-lg hover:bg-stone-900 disabled:opacity-50 transition-colors shadow-xs"
          >
            {addingCollege ? 'Registering...' : 'Add Institution'}
          </button>
        </div>
      </div>

      {pendingColleges.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-stone-900 mb-3">Pending College Verifications</h2>
          <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-200 shadow-xs">
            {pendingColleges.map(college => (
              <div key={college.id} className="p-4 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-stone-900">{college.name}</div>
                  <div className="text-[11px] text-stone-500">{college.state} {college.district ? `· ${college.district}` : ''}</div>
                </div>
                <button
                  onClick={() => handleApproveCollege(college.id)}
                  disabled={verifyingId === college.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                >
                  {verifyingId === college.id ? 'Approving...' : 'Approve'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white border border-stone-200 p-5 rounded-xl shadow-xs">
          <div className="text-stone-500 text-xs font-semibold uppercase tracking-wider mb-1">Pending Companies</div>
          <div className="text-2xl font-bold text-stone-900">{companies.length}</div>
        </div>
        <div className="bg-white border border-stone-200 p-5 rounded-xl shadow-xs">
          <div className="text-stone-500 text-xs font-semibold uppercase tracking-wider mb-1">Pending TPO Officials</div>
          <div className="text-2xl font-bold text-stone-900">{tpoOfficials.length}</div>
        </div>
        <div className="bg-white border border-stone-200 p-5 rounded-xl shadow-xs">
          <div className="text-stone-500 text-xs font-semibold uppercase tracking-wider mb-1">Pending Alumni</div>
          <div className="text-2xl font-bold text-stone-900">{alumni.length}</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-stone-400 py-8 text-xs">Loading verification backlog...</div>
      ) : totalPending === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-10 text-center text-stone-500 text-xs shadow-xs">
          No pending approvals — all accounts are verified.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Companies */}
          {companies.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-stone-900 mb-3">
                <Building className="w-4 h-4 text-emerald-800" /> Companies Awaiting Verification
              </h2>
              <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-200 shadow-xs">
                {companies.map(company => (
                  <div key={company.id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-stone-900">{company.name}</div>
                      <div className="text-[11px] text-stone-500">
                        {company.industry || 'General Industry'} {company.website ? `· ${company.website}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => handleVerifyCompany(company.id)}
                      disabled={verifyingId === company.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {verifyingId === company.id ? 'Approving...' : 'Verify Company'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TPO Officials */}
          {tpoOfficials.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-stone-900 mb-3">
                <GraduationCap className="w-4 h-4 text-emerald-800" /> Placement Officers Awaiting Verification
              </h2>
              <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-200 shadow-xs">
                {tpoOfficials.map(tpo => (
                  <div key={tpo.id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-stone-900">{tpo.name}</div>
                      <div className="flex items-center gap-3 text-[11px] text-stone-500 mt-0.5">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-stone-400" /> {tpo.email}</span>
                        <span>{tpo.colleges?.name || 'Institutional Partner'}</span>
                        {tpo.designation && <span>· {tpo.designation}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleVerifyTPO(tpo.id)}
                      disabled={verifyingId === tpo.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {verifyingId === tpo.id ? 'Approving...' : 'Verify Officer'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alumni */}
          {alumni.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-stone-900 mb-3">
                <Users className="w-4 h-4 text-emerald-800" /> Alumni Awaiting Verification
              </h2>
              <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-200 shadow-xs">
                {alumni.map(alumnus => (
                  <div key={alumnus.id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-stone-900">{alumnus.name}</div>
                      <div className="flex items-center gap-3 text-[11px] text-stone-500 mt-0.5">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-stone-400" /> {alumnus.email}</span>
                        <span>{alumnus.colleges?.name || 'Institution Partner'}</span>
                        {alumnus.current_company && <span>· {alumnus.current_company}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleVerifyAlumni(alumnus.id)}
                      disabled={verifyingId === alumnus.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {verifyingId === alumnus.id ? 'Approving...' : 'Verify Alumni'}
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