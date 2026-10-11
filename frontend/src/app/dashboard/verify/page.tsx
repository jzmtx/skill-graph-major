"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  CodeXml, 
  FolderGit2, 
  Search, 
  Zap, 
  Award,
  Layers,
  ChevronRight
} from 'lucide-react';
import { getMySkills } from '@/lib/api';
import { getCachedData, setCachedData } from '@/lib/cache';
import { SmartTopBarLoader, SmartListSkeleton } from '@/components/common/SmartLoader';

export default function StudentVerificationPage() {
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<'all' | 'level0' | 'level1' | 'level2'>('all');

  useEffect(() => {
    const cachedSkills = getCachedData<any[]>('student_skills');
    if (cachedSkills && cachedSkills.length > 0) {
      setSkills(cachedSkills);
      setLoading(false);
    }

    const fetchSkills = async () => {
      const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
      if (!studentId) {
        setLoading(false);
        return;
      }
      setSyncing(true);
      try {
        const mySkills = await getMySkills(studentId);
        if (mySkills) {
          setSkills(mySkills);
          setCachedData('student_skills', mySkills);
        }
      } catch (e) {
        console.error("Failed to load skills for verification hub:", e);
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    };
    fetchSkills();
  }, []);

  const filteredSkills = useMemo(() => {
    return skills.filter(s => {
      const matchesSearch = s.skill_name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (activeFilter === 'level0') return s.verification_level === 0;
      if (activeFilter === 'level1') return s.verification_level === 1;
      if (activeFilter === 'level2') return s.verification_level >= 2;
      return true;
    });
  }, [skills, searchQuery, activeFilter]);

  const level0Count = useMemo(() => skills.filter(s => s.verification_level === 0).length, [skills]);
  const level1Count = useMemo(() => skills.filter(s => s.verification_level === 1).length, [skills]);
  const level2Count = useMemo(() => skills.filter(s => s.verification_level >= 2).length, [skills]);

  return (
    <div className="space-y-6">
      <SmartTopBarLoader active={syncing} />

      {/* Header Banner */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 shadow-2xs relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-700 via-orange-500 to-amber-500" />
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-900 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              Competency Attestation
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 tracking-tight">
            Skill & Project Verification Hub
          </h1>
          <p className="text-xs md:text-sm text-stone-600 mt-1 leading-relaxed">
            Progress through adaptive algorithmic evaluations (Level 1) and anti-plagiarism GitHub repository audits (Level 2) to maximize your Hireability Rating.
          </p>
        </div>
      </div>

      {/* Verification Level Explanations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-2xs flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-stone-900">Level 1: Adaptive Evaluation</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                1x Weight
              </span>
            </div>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
              Dynamically calibrated conceptual questions and automated code execution tests that confirm fundamental theoretical depth.
            </p>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-2xs flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-stone-900">Level 2: Repository Mastery</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-200">
                3x Multiplier
              </span>
            </div>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
              Full-stack project audit with commit chronology verification, automated anti-plagiarism checks, and interactive oral defense.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter competencies by name (e.g. React, Python)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-emerald-800 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'all'
                ? 'bg-emerald-800 text-white shadow-2xs'
                : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            All ({skills.length})
          </button>
          <button
            onClick={() => setActiveFilter('level0')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'level0'
                ? 'bg-emerald-800 text-white shadow-2xs'
                : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            Unverified ({level0Count})
          </button>
          <button
            onClick={() => setActiveFilter('level1')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'level1'
                ? 'bg-emerald-800 text-white shadow-2xs'
                : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            Level 1 ({level1Count})
          </button>
          <button
            onClick={() => setActiveFilter('level2')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'level2'
                ? 'bg-emerald-800 text-white shadow-2xs'
                : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            Level 2 ({level2Count})
          </button>
        </div>
      </div>

      {/* Skills Grid */}
      {loading && skills.length === 0 ? (
        <SmartListSkeleton count={4} />
      ) : filteredSkills.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-stone-200 p-8 shadow-2xs">
          <ShieldCheck className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-stone-800 mb-1">No competencies match your criteria</h3>
          <p className="text-stone-500 text-xs">Try clearing your search query or declaring new skills on your dashboard.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSkills.map((s) => {
            const isLevel2 = s.verification_level >= 2;
            const isLevel1 = s.verification_level === 1;

            return (
              <div 
                key={s.id || s.skill_name} 
                className="bg-white border border-stone-200 rounded-xl p-5 shadow-2xs hover:border-emerald-800/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h4 className="text-base font-bold text-stone-900 font-serif">{s.skill_name}</h4>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        {isLevel2 
                          ? 'Audited project code depth validated' 
                          : isLevel1 
                          ? 'Conceptual exam verified' 
                          : 'Self-declared competency'}
                      </p>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                      isLevel2 
                        ? 'bg-orange-50 text-orange-800 border-orange-200' 
                        : isLevel1 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                        : 'bg-stone-100 text-stone-600 border-stone-200'
                    }`}>
                      {isLevel2 ? 'Level 2' : isLevel1 ? 'Level 1' : 'Declared'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 py-2 border-t border-stone-100 text-xs text-stone-600">
                    <span className="font-semibold text-stone-800">Score:</span>
                    <span>{s.score ? `${Math.round(s.score)}%` : 'Not tested'}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center gap-2 mt-2">
                  <Link 
                    href={`/assessment/${encodeURIComponent(s.skill_name)}`}
                    className="flex-1 text-center py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg transition-colors"
                  >
                    {isLevel1 || isLevel2 ? 'Retake L1 Test' : 'Start L1 Exam'}
                  </Link>

                  <Link 
                    href={`/project-verify/${encodeURIComponent(s.skill_name)}`}
                    className={`flex-1 text-center py-2 px-3 text-xs font-semibold rounded-lg transition-colors ${
                      isLevel2 
                        ? 'bg-emerald-800 hover:bg-emerald-900 text-white shadow-2xs' 
                        : 'bg-orange-600 hover:bg-orange-700 text-white shadow-2xs'
                    }`}
                  >
                    {isLevel2 ? 'Review L2 Repo' : 'Verify L2 Project'}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
