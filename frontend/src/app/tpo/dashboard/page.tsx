"use client";

import React, { useEffect, useState } from 'react';
import { getTPOProfile, getCollegeStudents, getCollegeAnalytics } from '@/lib/tpoApi';
import { useRouter } from 'next/navigation';
import { GraduationCap, Users, TrendingUp, Award, Flame } from 'lucide-react';

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

import ConnectionManager from '@/components/tpo/ConnectionManager';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

  const fetchStudents = async (authId: string, branch?: string) => {
    try {
      const studentList = await getCollegeStudents(authId, branch);
      setStudents(studentList);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBranchFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const branch = e.target.value;
    setSelectedBranch(branch);
    const authId = localStorage.getItem('tpo_auth_id');
    if (authId) fetchStudents(authId, branch);
  };

  useEffect(() => {
    const load = async () => {
      const authId = localStorage.getItem('tpo_auth_id');
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
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-indigo-700" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{college?.name}</h1>
              <p className="text-sm text-slate-500">Welcome back, {tpo?.name}</p>
            </div>
          </div>
          {tpo && !tpo.is_verified && (
            <span className="px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
              Pending Verification
            </span>
          )}
        </div>

        {coTpos.length > 0 && (
          <div className="mb-6 flex gap-2 flex-wrap items-center">
            <span className="text-xs font-medium text-slate-500">Co-Officials:</span>
            {coTpos.map(c => (
              <span key={c.id} className="px-2 py-1 bg-white border border-slate-200 text-slate-600 text-xs rounded-md shadow-sm">
                <span className="font-semibold text-slate-700">{c.name}</span> • {c.designation || 'TPO'}
              </span>
            ))}
          </div>
        )}

        {tpo && !tpo.is_verified ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-4 rounded-lg">
            Your TPO account is awaiting admin approval. Student data and analytics will be available once verified.
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            {analytics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
                    <Users className="w-4 h-4" /> STUDENTS
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{analytics.total_students}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
                    <TrendingUp className="w-4 h-4" /> AVG SKILL SCORE
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{analytics.avg_skill_score}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
                    <Award className="w-4 h-4" /> VERIFIED SKILLS
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{analytics.total_verified_skills}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
                    <Award className="w-4 h-4" /> HIRED
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{analytics.placement_stats.hired}</p>
                  <p className="text-xs text-slate-400 mt-0.5">of {analytics.placement_stats.total_applications} applications</p>
                </div>
              </div>
            )}

            {/* Top Skills */}
            {analytics && analytics.top_skills.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Top Skills Across College</h3>
                <div className="flex flex-wrap gap-2">
                  {analytics.top_skills.map((s, i) => (
                    <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full">
                      {s.skill_name} <span className="text-indigo-400">· {s.student_count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Learning Engagement Trend */}
            {analytics?.activity_trend && analytics.activity_trend.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500" /> College Learning Engagement (Last 7 Days)
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.activity_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} />
                      <YAxis tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value) => [`${value} Assessments`, 'Activity']}
                        labelStyle={{ color: '#475569', fontWeight: 600, marginBottom: '4px' }}
                      />
                      <Area type="monotone" dataKey="activity" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorActivity)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            {/* Connection Manager */}
            {tpo && localStorage.getItem('tpo_auth_id') && (
              <ConnectionManager authId={localStorage.getItem('tpo_auth_id')!} />
            )}

                        {/* Hiring Funnel Chart */}
            {analytics && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Placement Funnel</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Applied', value: analytics.placement_stats.total_applications, color: 'bg-slate-400' },
                    { label: 'Shortlisted', value: analytics.placement_stats.shortlisted, color: 'bg-amber-400' },
                    { label: 'Hired', value: analytics.placement_stats.hired, color: 'bg-green-500' },
                  ].map((stage, i) => {
                    const max = analytics.placement_stats.total_applications || 1;
                    const widthPct = Math.max((stage.value / max) * 100, stage.value > 0 ? 4 : 0);
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>{stage.label}</span>
                          <span className="font-medium text-slate-700">{stage.value}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full ${stage.color} transition-all`}
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
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" /> Top Consistent Learners
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {students.slice().sort((a, b) => (b.gli_score || 0) - (a.gli_score || 0)).slice(0, 4).map((student, i) => {
                    const projects = Math.max(1, Math.floor((student.gli_score || 300) / 100));
                    
                    return (
                    <div key={student.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-orange-100 text-orange-600 font-bold px-3 py-1 rounded-bl-lg text-xs">
                        #{i + 1}
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm truncate max-w-[120px]">{student.name}</p>
                          <p className="text-xs text-slate-500">{student.branch || 'General'}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
                          <p className="text-lg font-bold text-indigo-600">{student.gli_score}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-semibold">GLI Score</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
                          <p className="text-lg font-bold text-emerald-600">{projects}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-semibold">Projects</p>
                        </div>
                      </div>
                      
                      <Link href={`/tpo/students/${student.id}`} className="mt-4 block w-full text-center py-2 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-100 transition-colors">
                        View Profile
                      </Link>
                    </div>
                  )})}
                </div>
              </div>
            )}

            {/* Student List */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Students ({students.length})</h2>
              
              {analytics?.branch_stats && analytics.branch_stats.length > 0 && (
                <select 
                  className="text-sm border border-slate-300 rounded-md px-3 py-1.5 outline-none focus:border-indigo-500"
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
              <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
                No students match this filter or none are registered yet.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">Branch / Year</th>
                      <th className="px-5 py-3 font-medium">Primary Cluster</th>
                      <th className="px-5 py-3 font-medium text-center">GLI Score</th>
                      <th className="px-5 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-800">{student.name}</p>
                          <p className="text-slate-400 text-xs">{student.email}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {student.branch || '—'} {student.year ? `· Y${student.year}` : ''}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                           <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                             {(student as any).cluster || 'General'}
                           </span>
                        </td>
                        <td className="px-5 py-4 text-slate-600 text-center font-semibold text-slate-700">
                          {student.gli_score}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link href={`/tpo/students/${student.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium text-xs">
                            View Profile
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}