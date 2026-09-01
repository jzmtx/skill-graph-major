"use client";

import React, { useEffect, useState } from 'react';
import { getTPOProfile, getCollegeStudents, getCollegeAnalytics } from '@/lib/tpoApi';
import { useRouter } from 'next/navigation';
import { GraduationCap, Users, TrendingUp, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
}

interface Analytics {
  total_students: number;
  avg_skill_score: number;
  total_verified_skills: number;
  top_skills: { skill_name: string; student_count: number }[];
  placement_stats: { total_applications: number; hired: number; shortlisted: number };
}

export default function TPODashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tpo, setTpo] = useState<{ name: string; is_verified: boolean } | null>(null);
  const [college, setCollege] = useState<{ name: string } | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

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
        setCollege(profile.college);

        if (profile.tpo_official.is_verified) {
          const studentList = await getCollegeStudents(authId);
          setStudents(studentList);

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
            {/* Skill Distribution Chart */}
{analytics && analytics.top_skills.length > 0 && (
  <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
    <h3 className="text-sm font-semibold text-slate-700 mb-4">Students by Skill</h3>
    <ResponsiveContainer width="100%" height={Math.max(analytics.top_skills.length * 40, 200)}>
      <BarChart
        data={analytics.top_skills}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
        <YAxis
          type="category"
          dataKey="skill_name"
          tick={{ fontSize: 12, fill: '#475569' }}
          width={100}
        />
        <Tooltip
          formatter={(value: number) => [`${value} student${value === 1 ? '' : 's'}`, 'Count']}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
        <Bar dataKey="student_count" fill="#4f46e5" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
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

            {/* Student List */}
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Students ({students.length})</h2>
            {students.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
                No students registered under your college yet.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="text-left px-5 py-3">Name</th>
                      <th className="text-left px-5 py-3">Branch / Year</th>
                      <th className="text-left px-5 py-3">Skills</th>
                      <th className="text-left px-5 py-3">Verified</th>
                      <th className="text-left px-5 py-3">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => (
                      <tr key={student.id} className="border-t border-slate-100">
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-800">{student.name}</p>
                          <p className="text-slate-400 text-xs">{student.email}</p>
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {student.branch || '—'} {student.year ? `· Y${student.year}` : ''}
                        </td>
                        <td className="px-5 py-3 text-slate-600">{student.total_skills}</td>
                        <td className="px-5 py-3 text-slate-600">{student.verified_skills}</td>
                        <td className="px-5 py-3 text-slate-600">{student.avg_skill_score}</td>
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