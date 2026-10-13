"use client";

import React, { useEffect, useState } from 'react';
import { getTPOProfile, getCollegeStudents, getCollegeAnalytics, syncRoster } from '@/lib/tpoApi';
import { useRouter } from 'next/navigation';
import { GraduationCap, Users, TrendingUp, Award, Flame, RotateCw } from 'lucide-react';
import ConnectionManager from '@/components/tpo/ConnectionManager';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Student {
  id: string;
  name: string;
  email: string;
  branch?: string;
  year?: number;
  usn?: string;
  total_skills: number;
  verified_skills: number;
  avg_skill_score: number;
  gli_score: number;
}

interface Analytics {
  total_students: number;
  avg_skill_score: number;
  total_verified_skills: number;
  top_skills: { skill_name: string; student_count: number }[];
  placement_stats: { total_applications: number; hired: number; shortlisted: number };
  branch_stats?: { branch: string; count: number }[];
  activity_trend?: { date: string; full_date: string; activity: number }[];
}

export default function TPODashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tpo, setTpo] = useState<{ name: string; is_verified: boolean } | null>(null);
  const [coTpos, setCoTpos] = useState<{ id: string; name: string; email: string; designation: string }[]>([]);
  const [college, setCollege] = useState<{ name: string } | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [syncing, setSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState('');

  const fetchStudents = async (authId: string, branch?: string) => {
    try {
      const studentList = await getCollegeStudents(authId, branch);
      setStudents(studentList);
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuickSync = async () => {
    const authId = typeof window !== 'undefined' ? localStorage.getItem('tpo_auth_id') : null;
    if (!authId) return;
    setSyncing(true);
    try {
      await syncRoster(authId);
      await fetchStudents(authId, selectedBranch || undefined);
      const analyticsData = await getCollegeAnalytics(authId);
      setAnalytics(analyticsData);
      setSyncToast('Roster updated');
      setTimeout(() => setSyncToast(''), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  const handleBranchFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const branch = e.target.value;
    setSelectedBranch(branch);
    const authId = typeof window !== 'undefined' ? localStorage.getItem('tpo_auth_id') : null;
    if (authId) fetchStudents(authId, branch);
  };

  useEffect(() => {
    const load = async () => {
      const authId = typeof window !== 'undefined' ? localStorage.getItem('tpo_auth_id') : null;
      if (!authId) {
        router.push('/login');
        return;
      }
      try {
        const profile = await getTPOProfile(authId);
        setTpo(profile.tpo_official);
        if (profile.co_tpos) setCoTpos(profile.co_tpos);
        setCollege(profile.college);

        if (profile.tpo_official.is_verified) {
          fetchStudents(authId);
          const analyticsData = await getCollegeAnalytics(authId);
          setAnalytics(analyticsData);
        }
      } catch {
        setError('Failed to load dashboard. Please try logging in again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  if (loading) {
    return <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-500 text-xs">Loading institutional dashboard...</div>;
  }

  if (error) {
    return <div className="min-h-screen bg-stone-50 flex items-center justify-center text-red-700 text-xs">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-serif font-bold text-stone-900">{college?.name}</h1>
                <button
                  type="button"
                  onClick={handleQuickSync}
                  disabled={syncing}
                  title="Resync institutional roster"
                  className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors opacity-60 hover:opacity-100"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-emerald-800' : ''}`} />
                </button>
                {syncToast && (
                  <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                    {syncToast}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500">Placement Officer Portal: {tpo?.name}</p>
            </div>
          </div>
          {tpo && !tpo.is_verified && (
            <span className="px-3 py-1 bg-amber-50 text-amber-800 text-xs font-semibold rounded-full border border-amber-200">
              Pending Accreditation Review
            </span>
          )}
        </div>

        {coTpos.length > 0 && (
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Co-Officers:</span>
            {coTpos.map(c => (
              <span key={c.id} className="px-2.5 py-1 bg-white border border-stone-200 text-stone-700 text-xs rounded-md shadow-2xs">
                <span className="font-semibold text-stone-900">{c.name}</span> • {c.designation || 'TPO'}
              </span>
            ))}
          </div>
        )}

        {tpo && !tpo.is_verified ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-4 rounded-xl">
            Your institutional account is awaiting administrative verification. Student data and metrics will be unlocked once approved.
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            {analytics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-stone-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                    <Users className="w-3.5 h-3.5" /> Enrolled Students
                  </div>
                  <p className="text-2xl font-bold text-stone-900">{analytics.total_students}</p>
                </div>
                <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-stone-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Average Score
                  </div>
                  <p className="text-2xl font-bold text-stone-900">{analytics.avg_skill_score}</p>
                </div>
                <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-stone-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                    <Award className="w-3.5 h-3.5" /> Verified Skills
                  </div>
                  <p className="text-2xl font-bold text-emerald-800">{analytics.total_verified_skills}</p>
                </div>
                <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-stone-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                    <Award className="w-3.5 h-3.5" /> Candidates Hired
                  </div>
                  <p className="text-2xl font-bold text-emerald-800">{analytics.placement_stats.hired}</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">of {analytics.placement_stats.total_applications} candidacies</p>
                </div>
              </div>
            )}

            {/* Top Skills */}
            {analytics && analytics.top_skills.length > 0 && (
              <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-3">Top College Competencies</h3>
                <div className="flex flex-wrap gap-1.5">
                  {analytics.top_skills.map((s, i) => (
                    <span key={i} className="px-2.5 py-1 bg-stone-100 text-stone-800 text-xs rounded-md border border-stone-200 font-medium">
                      {s.skill_name} <span className="text-stone-400">· {s.student_count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Learning Engagement Trend */}
            {analytics?.activity_trend && analytics.activity_trend.length > 0 && (
              <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-800" /> Assessment Volume (Last 7 Days)
                </h3>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.activity_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#166534" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#166534" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E4" />
                      <XAxis dataKey="date" tick={{fontSize: 11, fill: '#78716C'}} tickLine={false} axisLine={false} />
                      <YAxis tick={{fontSize: 11, fill: '#78716C'}} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #E7E5E4', boxShadow: 'none', backgroundColor: '#FFFFFF' }}
                        formatter={(value) => [`${value} Assessments`, 'Activity']}
                        labelStyle={{ color: '#292524', fontWeight: 600, fontSize: 12 }}
                      />
                      <Area type="monotone" dataKey="activity" stroke="#166534" strokeWidth={2} fillOpacity={1} fill="url(#colorActivity)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            {/* Connection Manager */}
            {tpo && (typeof window !== 'undefined' ? localStorage.getItem('tpo_auth_id') : null) && (
              <ConnectionManager authId={localStorage.getItem('tpo_auth_id')!} />
            )}

            {/* Placement Funnel */}
            {analytics && (
              <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-4">Placement Funnel</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Applied', value: analytics.placement_stats.total_applications, color: 'bg-stone-400' },
                    { label: 'Shortlisted', value: analytics.placement_stats.shortlisted, color: 'bg-amber-600' },
                    { label: 'Hired', value: analytics.placement_stats.hired, color: 'bg-emerald-800' },
                  ].map((stage, i) => {
                    const max = analytics.placement_stats.total_applications || 1;
                    const widthPct = Math.max((stage.value / max) * 100, stage.value > 0 ? 4 : 0);
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs text-stone-500 mb-1">
                          <span>{stage.label}</span>
                          <span className="font-semibold text-stone-800">{stage.value}</span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${stage.color} transition-all`}
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top Consistent Learners */}
            {students.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-3 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-700" /> High-Performing Candidates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {students.slice().sort((a, b) => (b.gli_score || 0) - (a.gli_score || 0)).slice(0, 4).map((student, i) => {
                    const projects = Math.max(1, Math.floor((student.gli_score || 300) / 100));
                    
                    return (
                    <div key={student.id} className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs relative">
                      <div className="absolute top-0 right-0 bg-stone-100 border-b border-l border-stone-200 text-stone-700 font-bold px-2.5 py-0.5 rounded-bl-lg text-[10px]">
                        #{i + 1}
                      </div>
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-stone-800 font-bold text-xs border border-stone-200">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-stone-900 text-xs truncate max-w-[110px]">{student.name}</p>
                          <p className="text-[10px] text-stone-500">{student.branch || 'General'}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="bg-stone-50 rounded p-2 text-center border border-stone-200">
                          <p className="text-base font-bold text-stone-900">{student.gli_score}</p>
                          <p className="text-[9px] text-stone-500 uppercase font-semibold">GLI Score</p>
                        </div>
                        <div className="bg-stone-50 rounded p-2 text-center border border-stone-200">
                          <p className="text-base font-bold text-emerald-800">{projects}</p>
                          <p className="text-[9px] text-stone-500 uppercase font-semibold">Projects</p>
                        </div>
                      </div>
                      
                      <Link href={`/tpo/students/${student.id}`} className="mt-3 block w-full text-center py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-md border border-stone-200 transition-colors">
                        View Dossier
                      </Link>
                    </div>
                  )})}
                </div>
              </div>
            )}

            {/* Student Directory Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700">Student Directory ({students.length})</h2>
                  <button
                    type="button"
                    onClick={handleQuickSync}
                    disabled={syncing}
                    title="Resync roster"
                    className="p-1 rounded text-stone-400 hover:text-stone-700 transition-colors opacity-70 hover:opacity-100"
                  >
                    <RotateCw className={`w-3 h-3 ${syncing ? 'animate-spin text-emerald-800' : ''}`} />
                  </button>
                </div>
                
                {analytics?.branch_stats && analytics.branch_stats.length > 0 && (
                  <select 
                    className="text-xs border border-stone-300 bg-white rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-800"
                    value={selectedBranch}
                    onChange={handleBranchFilter}
                  >
                    <option value="">All Branches</option>
                    {analytics.branch_stats.map(b => (
                      <option key={b.branch} value={b.branch}>{b.branch} ({b.count})</option>
                    ))}
                  </select>
                )}
              </div>
              
              {students.length === 0 ? (
                <div className="bg-white rounded-xl border border-stone-200 p-8 text-center text-stone-400 text-xs">
                  <p>No registered students found for this filter.</p>
                  <button
                    type="button"
                    onClick={handleQuickSync}
                    disabled={syncing}
                    className="mt-2 text-emerald-800 hover:underline font-semibold"
                  >
                    {syncing ? 'Synchronizing roster...' : 'Click to auto-sync college roster'}
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-stone-50 text-stone-500 text-[10px] uppercase border-b border-stone-200">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Name</th>
                        <th className="px-4 py-2.5 font-semibold">Branch / Year</th>
                        <th className="px-4 py-2.5 font-semibold">Skill Cluster</th>
                        <th className="px-4 py-2.5 font-semibold text-center">GLI Score</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {students.map(student => (
                        <tr key={student.id} className="hover:bg-stone-50/70 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-stone-900">{student.name}</p>
                            <p className="text-stone-400 text-[11px]">{student.email}</p>
                          </td>
                          <td className="px-4 py-3 text-stone-600">
                            {student.branch || '—'} {student.year ? `· Y${student.year}` : ''}
                          </td>
                          <td className="px-4 py-3">
                             <span className="px-2 py-0.5 bg-stone-100 text-stone-700 rounded text-[11px] font-medium border border-stone-200">
                               {(student as any).cluster || 'General'}
                             </span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-stone-800">
                            {student.gli_score}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/tpo/students/${student.id}`} className="text-emerald-800 hover:text-emerald-950 font-semibold text-xs">
                              View Profile
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}