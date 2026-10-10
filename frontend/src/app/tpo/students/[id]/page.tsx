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
      const authId = typeof window !== 'undefined' ? localStorage.getItem('tpo_auth_id') : null;
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

  if (loading) return <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-500 text-xs">Loading candidate profile...</div>;
  if (error) return <div className="min-h-screen bg-stone-50 flex items-center justify-center text-red-700 text-xs">{error}</div>;
  if (!data) return null;

  const { student, skills, roadmaps } = data;

  return (
    <div className="min-h-screen bg-stone-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/tpo/dashboard" className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to College Dashboard
        </Link>

        {/* Header Profile */}
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs flex items-start gap-4">
          <div className="w-14 h-14 bg-stone-100 border border-stone-200 rounded-full flex items-center justify-center text-stone-800 shrink-0">
            <User className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-stone-900">{student.name}</h1>
            <p className="text-stone-500 text-xs">{student.email}</p>
            <div className="flex gap-4 mt-2 text-xs text-stone-600">
              {student.branch && <span><strong className="text-stone-800">Branch:</strong> {student.branch}</span>}
              {student.year && <span><strong className="text-stone-800">Year:</strong> {student.year}</span>}
              {student.usn && <span><strong className="text-stone-800">USN:</strong> {student.usn}</span>}
            </div>
          </div>
        </div>
        
        {/* GLI Hireability Score Proof */}
        <div>
          <HireabilityScore studentIdProp={studentId} />
        </div>
        
        {/* Learning Stats & Heatmap */}
        {activity && (
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-4 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-800" /> Academic Engagement & Consistency
            </h3>
            
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="flex-1 min-w-[150px] bg-stone-50 rounded-lg p-3.5 border border-stone-200 flex items-center gap-3">
                <div className="p-2.5 bg-stone-200 rounded-lg text-stone-700">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xl font-bold text-stone-900">{Math.round(activity.total_learning_minutes / 60)}h {activity.total_learning_minutes % 60}m</p>
                  <p className="text-[10px] text-stone-500 uppercase font-semibold">Total Learning Time</p>
                </div>
              </div>
              
              <div className="flex-1 min-w-[150px] bg-amber-50/50 rounded-lg p-3.5 border border-amber-200 flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 rounded-lg text-amber-800">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xl font-bold text-amber-900">{activity.current_streak} Days</p>
                  <p className="text-[10px] text-amber-700 uppercase font-semibold">Learning Streak</p>
                </div>
              </div>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activity.heatmap} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorConsistency" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#166534" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#166534" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E4" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => val.split('-').slice(1).join('/')} 
                    tick={{fontSize: 11, fill: '#78716C'}} tickLine={false} axisLine={false} 
                  />
                  <YAxis tick={{fontSize: 11, fill: '#78716C'}} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E7E5E4', boxShadow: 'none', backgroundColor: '#FFFFFF' }}
                    formatter={(value) => [`${value} Sessions`, 'Activity']}
                    labelStyle={{ color: '#292524', fontWeight: 600, fontSize: 12 }}
                  />
                  <Area type="step" dataKey="count" stroke="#166534" strokeWidth={2} fillOpacity={1} fill="url(#colorConsistency)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Verified Skills */}
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-4 flex items-center gap-1.5">
              <Star className="w-4 h-4 text-emerald-800" /> Verified Competencies
            </h3>
            {skills.length === 0 ? (
              <p className="text-xs text-stone-400">No verified skills recorded.</p>
            ) : (
              <div className="space-y-2">
                {skills.map((skill: any) => (
                  <div key={skill.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-200">
                    <div>
                      <p className="font-semibold text-stone-800 text-xs">{skill.skill_name}</p>
                      <p className="text-[11px] text-stone-500">Level {skill.verification_level} Verified</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-emerald-800">{skill.skill_score}</p>
                      <p className="text-[10px] text-stone-400">Score</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Roadmaps */}
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-4 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-800" /> Career Milestones
            </h3>
            {roadmaps.length === 0 ? (
              <p className="text-xs text-stone-400">No active milestones tracked.</p>
            ) : (
              <div className="space-y-2">
                {roadmaps.map((node: any) => (
                  <div key={node.id} className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                    <p className="font-semibold text-stone-800 text-xs">{node.roadmap_id}</p>
                    <div className="flex justify-between items-center mt-1 text-[11px]">
                      <span className="text-stone-500">Status: {node.status}</span>
                      <span className="text-emerald-800 font-semibold">Node: {node.node_id}</span>
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
