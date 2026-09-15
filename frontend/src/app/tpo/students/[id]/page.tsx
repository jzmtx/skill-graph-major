"use client";

import React, { useEffect, useState } from 'react';
import { getStudentMonitor, getStudentActivity } from '@/lib/tpoApi';
import { useParams, useRouter } from 'next/navigation';
import { User, BookOpen, Star, ArrowLeft, Clock, Flame, Calendar } from 'lucide-react';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import HireabilityScore from '@/components/dashboard/HireabilityScore';

export default function StudentMonitorPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const authId = localStorage.getItem('tpo_auth_id');
      if (!authId) {
        router.push('/login');
        return;
      }
      try {
        const [monitorData, activityData] = await Promise.all([
          getStudentMonitor(authId, studentId),
          getStudentActivity(authId, studentId)
        ]);
        setData(monitorData);
        setActivity(activityData);
      } catch {
        setError('Failed to load student data. They may not exist or are not linked to your college.');
      } finally {
        setLoading(false);
      }
    };
    if (studentId) load();
  }, [studentId, router]);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading student monitor...</div>;
  if (error) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-red-600">{error}</div>;
  if (!data) return null;

  const { student, skills, roadmaps } = data;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <Link href="/tpo/dashboard" className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 mb-6 font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {/* Header Profile */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 flex items-start gap-5">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{student.name}</h1>
            <p className="text-slate-500">{student.email}</p>
            <div className="flex gap-4 mt-3 text-sm text-slate-600">
              {student.branch && <span><strong className="text-slate-800">Branch:</strong> {student.branch}</span>}
              {student.year && <span><strong className="text-slate-800">Year:</strong> {student.year}</span>}
              {student.usn && <span><strong className="text-slate-800">USN:</strong> {student.usn}</span>}
            </div>
          </div>
        </div>
        
        {/* GLI Hireability Score Proof */}
        <div className="mb-6">
          <HireabilityScore studentIdProp={studentId} />
        </div>
        
        {/* Learning Stats & Consistency Chart */}
        {activity && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" /> Learning Consistency & Engagement
            </h3>
            
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex-1 min-w-[150px] bg-indigo-50/50 rounded-lg p-4 border border-indigo-100 flex items-center gap-4">
                <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{Math.round(activity.total_learning_minutes / 60)}h {activity.total_learning_minutes % 60}m</p>
                  <p className="text-xs font-medium text-slate-500">Est. Total Learning Time</p>
                </div>
              </div>
              
              <div className="flex-1 min-w-[150px] bg-orange-50/50 rounded-lg p-4 border border-orange-100 flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-full text-orange-600">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{activity.current_streak} Days</p>
                  <p className="text-xs font-medium text-slate-500">Current Learning Streak</p>
                </div>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activity.heatmap} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorConsistency" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => val.split('-').slice(1).join('/')} 
                    tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} 
                  />
                  <YAxis tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [`${value} Interactions`, 'Activity']}
                    labelStyle={{ color: '#475569', fontWeight: 600, marginBottom: '4px' }}
                  />
                  <Area type="step" dataKey="count" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorConsistency)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Verified Skills */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" /> Verified Skills & Scores
            </h3>
            {skills.length === 0 ? (
              <p className="text-sm text-slate-400">No skills assessed yet.</p>
            ) : (
              <div className="space-y-3">
                {skills.map((skill: any) => (
                  <div key={skill.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                      <p className="font-medium text-slate-700">{skill.skill_name}</p>
                      <p className="text-xs text-slate-500">Level {skill.verification_level} Verified</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-indigo-600">{skill.skill_score}</p>
                      <p className="text-xs text-slate-400">Score</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Roadmaps */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" /> Career Roadmap Progress
            </h3>
            {roadmaps.length === 0 ? (
              <p className="text-sm text-slate-400">No active roadmaps found.</p>
            ) : (
              <div className="space-y-3">
                {roadmaps.map((node: any) => (
                  <div key={node.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="font-medium text-slate-700">{node.roadmap_id}</p>
                    <div className="flex justify-between items-center mt-2 text-xs">
                      <span className="text-slate-500">Status: {node.status}</span>
                      <span className="text-indigo-600 font-medium">Node: {node.node_id}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
