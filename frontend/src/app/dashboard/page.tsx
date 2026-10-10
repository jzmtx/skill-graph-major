"use client";

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  Target, 
  TrendingUp, 
  Briefcase, 
  CodeXml, 
  ShieldCheck, 
  CheckCircle2, 
  Plus, 
  RefreshCw, 
  Loader2, 
  X, 
  GraduationCap, 
  UserCircle, 
  Compass, 
  Map, 
  Search,
  Check,
  AlertCircle,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { 
  extractGithubSkills, 
  getMySkills, 
  addSkill, 
  getStudentInvitations, 
  acceptStudentInvitation,
  getStudentProfile,
  getHireabilityScore
} from '@/lib/api';
import { getAppliedJobs } from '@/lib/companyApi';
import { motion, AnimatePresence } from 'framer-motion';
import HireabilityScore from '@/components/dashboard/HireabilityScore';
import StudentProfileModal, { StudentProfileData } from '@/components/dashboard/StudentProfileModal';
import { SmartTopBarLoader, SmartDashboardSkeleton } from '@/components/common/SmartLoader';
import { getCachedData, setCachedData } from '@/lib/cache';

export default function DashboardPage() {
  const [skills, setSkills] = useState<any[]>(() => getCachedData<any[]>('student_skills') || []);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [addingSkill, setAddingSkill] = useState(false);
  const [customSkill, setCustomSkill] = useState("");
  const [invitations, setInvitations] = useState<any[]>(() => getCachedData<any[]>('student_invs') || []);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [appliedJobsCount, setAppliedJobsCount] = useState<number>(() => getCachedData<number>('student_apps_count') || 0);
  
  // Student profile state (synchronously loaded from instant cache)
  const [studentProfile, setStudentProfile] = useState<any>(() => getCachedData<any>('student_profile') || null);
  const [collegeName, setCollegeName] = useState<string>(() => getCachedData<string>('student_college') || "");
  const [hireabilityData, setHireabilityData] = useState<any>(() => getCachedData<any>('student_hireability') || null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Skill filter
  const [skillFilter, setSkillFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [searchQuery, setSearchQuery] = useState("");

  const popularSuggestions = ["TypeScript", "Docker", "PostgreSQL", "Next.js", "Python", "FastAPI"];

  const fetchSkills = async () => {
    try {
      const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
      if (!studentId) return;

      setSyncing(true);
      const mySkills = await getMySkills(studentId);
      
      if (mySkills) {
        setCachedData('student_skills', mySkills);
        setSkills(mySkills);
      }
    } catch (error) {
      console.error("Failed to sync skills:", error);
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  const handleAddSkill = async (skillToAdd?: string) => {
    const targetSkill = (skillToAdd || customSkill).trim();
    if (!targetSkill) return;
    
    const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
    if (!studentId) return;

    setAddingSkill(true);
    try {
      await addSkill({ student_id: studentId, skill_name: targetSkill });
      setCustomSkill("");
      await fetchSkills();
    } catch (e) {
      console.error("Failed to add skill", e);
    } finally {
      setAddingSkill(false);
    }
  };

  const handleAcceptInvitation = async (linkId: string) => {
    const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
    if (!studentId) return;
    try {
      await acceptStudentInvitation(studentId, linkId);
      const updated = invitations.filter(inv => inv.id !== linkId);
      setInvitations(updated);
      setCachedData('student_invs', updated);
    } catch(e) {
      console.error("Failed to accept invitation", e);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
        const githubUrl = typeof window !== 'undefined' ? localStorage.getItem('student_github') : null;
        
        // Fast optimistic cache initialization
        const cachedSkills = getCachedData<any[]>('student_skills');
        if (cachedSkills && cachedSkills.length > 0) {
          setSkills(cachedSkills);
          setLoading(false);
        }
        
        if (!studentId) {
          setLoading(false);
          return;
        }

        setSyncing(true);

        // Run all critical data queries simultaneously in parallel (eliminates 3.5s sequential waiting)
        const [profResult, hScoreResult, skillsResult, invsResult, appsResult] = await Promise.allSettled([
          getStudentProfile(studentId),
          getHireabilityScore(studentId),
          getMySkills(studentId),
          getStudentInvitations(studentId),
          getAppliedJobs(studentId)
        ]);

        // 1. Profile Data
        if (profResult.status === 'fulfilled' && profResult.value?.student) {
          const profData = profResult.value;
          setStudentProfile(profData.student);
          setCachedData('student_profile', profData.student);
          if (profData.college_name) {
            setCollegeName(profData.college_name);
            setCachedData('student_college', profData.college_name);
          }
          if (profData.student.name && typeof window !== 'undefined') {
            localStorage.setItem('student_name', profData.student.name);
          }
        }

        // 2. Hireability Score
        if (hScoreResult.status === 'fulfilled' && hScoreResult.value) {
          setHireabilityData(hScoreResult.value);
          setCachedData('student_hireability', hScoreResult.value);
        }

        // 3. Verified Skills
        if (skillsResult.status === 'fulfilled' && skillsResult.value) {
          setSkills(skillsResult.value);
          setCachedData('student_skills', skillsResult.value);
        }

        // 4. College Invitations
        if (invsResult.status === 'fulfilled' && invsResult.value) {
          setInvitations(invsResult.value);
          setCachedData('student_invs', invsResult.value);
        }

        // 5. Job Applications & Notifications
        if (appsResult.status === 'fulfilled' && appsResult.value) {
          const apps = appsResult.value;
          setAppliedJobsCount(apps.length);
          setCachedData('student_apps_count', apps.length);

          const dismissed = JSON.parse(localStorage.getItem('dismissed_notifications') || '[]');
          const newNotifs = apps.filter((a: any) => 
            (a.status === 'hired' || a.status === 'rejected') && !dismissed.includes(`${a.id}-${a.status}`)
          );
          setNotifications(newNotifs);
        }

        // Background GitHub skill extraction if configured
        if (githubUrl) {
          extractGithubSkills(studentId, githubUrl)
            .then(() => fetchSkills())
            .catch(e => console.error("GitHub extraction skipped or done", e));
        }

      } catch (error) {
        console.error("Dashboard initialization error:", error);
      } finally {
        setSyncing(false);
        setLoading(false);
      }
    };

    init();

    const handleProfileEvent = () => setIsProfileModalOpen(true);
    window.addEventListener('open-student-profile', handleProfileEvent);
    return () => window.removeEventListener('open-student-profile', handleProfileEvent);
  }, []);

  const dismissNotification = (appId: string, status: string) => {
    const dismissed = JSON.parse(localStorage.getItem('dismissed_notifications') || '[]');
    dismissed.push(`${appId}-${status}`);
    localStorage.setItem('dismissed_notifications', JSON.stringify(dismissed));
    setNotifications(prev => prev.filter(n => n.id !== appId));
  };

  const totalSkillsCount = skills.length;
  const verifiedSkillsCount = useMemo(() => skills.filter(s => s.verification_level > 0).length, [skills]);
  const level2SkillsCount = useMemo(() => skills.filter(s => s.verification_level >= 2).length, [skills]);
  const hasVerifiedSkills = verifiedSkillsCount > 0;

  const filteredSkills = useMemo(() => {
    return skills.filter(s => {
      const matchesSearch = s.skill_name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (skillFilter === 'verified') return s.verification_level > 0;
      if (skillFilter === 'unverified') return s.verification_level === 0;
      return true;
    });
  }, [skills, searchQuery, skillFilter]);

  const modalData: StudentProfileData | null = useMemo(() => {
    if (!studentProfile) return null;
    return {
      student: studentProfile,
      college_name: collegeName,
      skills: skills,
      hireability: hireabilityData
    };
  }, [studentProfile, collegeName, skills, hireabilityData]);

  const studentDisplayName = studentProfile?.name || (typeof window !== 'undefined' ? localStorage.getItem('student_name') : null) || 'Student';

  if (loading && !studentProfile && skills.length === 0) {
    return <SmartDashboardSkeleton />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-stone-900">
      <SmartTopBarLoader active={syncing} />
      
      {/* Executive Header Banner (Classical Warm White & Stone with Warm Orange Accent Trim) */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Subtle Orange Accent Top Trim */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-700 via-orange-500 to-amber-500" />

        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-900 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              Student Workspace
            </span>
            {collegeName && (
              <span className="flex items-center gap-1 text-xs font-medium text-stone-600">
                <GraduationCap className="w-3.5 h-3.5 text-stone-500" />
                {collegeName}
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-stone-900 tracking-tight mt-1.5 font-serif">
            Welcome back, {studentDisplayName}
          </h1>
          <p className="text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
            Monitor your verified competency benchmarks, roadmap progression, and live industry hireability ratings.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-300 transition-colors"
          >
            <UserCircle className="w-4 h-4 text-stone-600" />
            <span>Profile Details</span>
          </button>

          <button
            onClick={fetchSkills}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-800 hover:bg-emerald-900 shadow-2xs transition-colors disabled:opacity-70"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Data'}</span>
          </button>
        </div>
      </div>

      {/* College Invitations Alert */}
      {invitations.length > 0 && (
        <div className="bg-stone-100 border border-stone-300 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-800 text-white flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">Institutional Affiliation Invitation</h3>
              <p className="text-xs text-stone-600 mt-0.5">
                Your institution <span className="font-semibold text-stone-900">{invitations[0].colleges?.name}</span> has invited you to join their official placement cluster.
              </p>
            </div>
          </div>
          <button 
            onClick={() => handleAcceptInvitation(invitations[0].id)}
            className="px-4 py-2 bg-emerald-800 text-white text-xs font-bold rounded-lg hover:bg-emerald-900 transition-colors whitespace-nowrap shadow-2xs"
          >
            Confirm Affiliation
          </button>
        </div>
      )}

      {/* Notifications Banner */}
      {notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map(notif => {
            const isHired = notif.status === 'hired';
            const companyName = notif.job_postings?.companies?.name || 'Recruiter';
            const jobTitle = notif.job_postings?.title || 'Applied Position';
            
            return (
              <div 
                key={notif.id} 
                className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                  isHired 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                    : 'bg-stone-100 border-stone-300 text-stone-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isHired ? 'bg-emerald-800 text-white' : 'bg-stone-300 text-stone-800'}`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">
                      {isHired ? 'Selection Confirmation: Candidate Hired' : 'Application Status Update'}
                    </h4>
                    <p className="text-xs mt-0.5 text-stone-600">
                      {isHired 
                        ? `Congratulations! You have received an offer for ${jobTitle} at ${companyName}.`
                        : `Your candidate profile for ${jobTitle} at ${companyName} has been reviewed.`}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => dismissNotification(notif.id, notif.status)} 
                  className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors text-stone-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Key Performance Indicators (4 Classical Metric Tiles) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Hireability Index */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase tracking-wider">
            <span>Hireability Index</span>
            <Target className="w-4 h-4 text-emerald-800" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-stone-900 font-serif">
              {hireabilityData?.score || 300}
            </span>
            <span className="text-xs font-medium text-stone-500">/ 850 pts</span>
          </div>
          <div className="mt-2 text-xs text-stone-600 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-800"></span>
            <span>Verified competency model</span>
          </div>
        </div>

        {/* KPI 2: Verified Skills Ratio */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase tracking-wider">
            <span>Verified Skills</span>
            <ShieldCheck className="w-4 h-4 text-emerald-800" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-stone-900 font-serif">
              {verifiedSkillsCount}
            </span>
            <span className="text-xs font-medium text-stone-500">/ {totalSkillsCount} declared</span>
          </div>
          <div className="mt-2 text-xs text-stone-600 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
            <span className="text-orange-950 font-medium">{level2SkillsCount} Level 2 Project Masteries</span>
          </div>
        </div>

        {/* KPI 3: Learning Roadmap */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase tracking-wider">
            <span>Learning Path</span>
            <Map className="w-4 h-4 text-stone-700" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-lg font-bold text-stone-900 truncate">
              Adaptive Roadmap
            </span>
          </div>
          <div className="mt-2">
            <Link 
              href="/dashboard/roadmap" 
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 transition-colors"
            >
              <span>View Roadmap Canvas</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* KPI 4: Job Applications */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase tracking-wider">
            <span>Placement Activity</span>
            <Briefcase className="w-4 h-4 text-stone-700" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-stone-900 font-serif">
              {appliedJobsCount}
            </span>
            <span className="text-xs font-medium text-stone-500">applications</span>
          </div>
          <div className="mt-2">
            <Link 
              href="/dashboard/jobs" 
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 transition-colors"
            >
              <span>Explore Active Openings</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

      </div>

      {/* Hireability Index Component */}
      <HireabilityScore />

      {/* Skills & Verification Management Hub */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 shadow-2xs">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-stone-200 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CodeXml className="w-5 h-5 text-emerald-800" />
              <h3 className="text-lg font-bold text-stone-900 font-serif">Skills Competency Portfolio</h3>
            </div>
            <p className="text-xs text-stone-600 mt-1">
              Verify your skills through adaptive technical evaluations (Level 1) and anti-plagiarism project audits (Level 2).
            </p>
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-800 w-36 sm:w-44 text-stone-800"
              />
            </div>

            <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-xs font-medium">
              <button
                onClick={() => setSkillFilter('all')}
                className={`px-3 py-1 rounded-md transition-all ${
                  skillFilter === 'all' 
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold' 
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All ({skills.length})
              </button>
              <button
                onClick={() => setSkillFilter('verified')}
                className={`px-3 py-1 rounded-md transition-all ${
                  skillFilter === 'verified' 
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold' 
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Verified ({verifiedSkillsCount})
              </button>
              <button
                onClick={() => setSkillFilter('unverified')}
                className={`px-3 py-1 rounded-md transition-all ${
                  skillFilter === 'unverified' 
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold' 
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Pending ({totalSkillsCount - verifiedSkillsCount})
              </button>
            </div>
          </div>
        </div>

        {/* Skills Cards Grid */}
        <div className="py-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-28 bg-stone-50 rounded-xl animate-pulse border border-stone-200"></div>
              ))}
            </div>
          ) : filteredSkills.length > 0 ? (
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {filteredSkills.map(s => {
                  const isLevel0 = s.verification_level === 0;
                  const isLevel1 = s.verification_level === 1;
                  const isLevel2 = s.verification_level >= 2;

                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={s.id || s.skill_name}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                        isLevel2 
                          ? 'bg-emerald-50/50 border-emerald-300' 
                          : isLevel1 
                          ? 'bg-stone-50 border-stone-300' 
                          : 'bg-stone-50/70 border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-stone-900 text-sm font-serif">{s.skill_name}</h4>
                          <span className="text-[11px] text-stone-500 mt-0.5 block">
                            Score: {s.skill_score || 0} / 100
                          </span>
                        </div>
                        
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider shrink-0 ${
                          isLevel2 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                            : isLevel1 
                            ? 'bg-stone-200 text-stone-800 border border-stone-300' 
                            : 'bg-stone-100 text-stone-600'
                        }`}>
                          {isLevel2 ? 'L2 Mastered' : isLevel1 ? 'L1 Verified' : 'Declared'}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-stone-200 flex items-center justify-between gap-2">
                        {isLevel0 && (
                          <Link href={`/assessment/${encodeURIComponent(s.skill_name)}`} className="w-full">
                            <button className="w-full text-xs font-semibold py-1.5 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white transition-colors flex items-center justify-center gap-1.5 shadow-2xs">
                              <span>Take Adaptive Exam</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </Link>
                        )}

                        {isLevel1 && (
                          <Link href={`/project-verify/${encodeURIComponent(s.skill_name)}`} className="w-full">
                            <button className="w-full text-xs font-semibold py-1.5 px-3 rounded-lg bg-stone-800 hover:bg-stone-900 text-white transition-colors flex items-center justify-center gap-1.5 shadow-2xs">
                              <span>Verify Project (L2)</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </Link>
                        )}

                        {isLevel2 && (
                          <div className="w-full py-1 text-center text-xs font-semibold text-emerald-800 flex items-center justify-center gap-1.5">
                            <Check className="w-3.5 h-3.5" />
                            <span>Max Depth Achieved</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="text-center py-12 border border-dashed border-stone-300 rounded-xl bg-stone-50/50">
              <CodeXml className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-stone-700">No skills matching your criteria</p>
              <p className="text-xs text-stone-500 mt-1">Try adjusting your search query or add a new skill below.</p>
            </div>
          )}
        </div>

        {/* Skill Addition Control */}
        <div className="pt-6 border-t border-stone-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1 w-full">
            <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Add Technical Skill</div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
              <span className="text-[11px] text-stone-600 font-medium mr-1">Suggestions:</span>
              {popularSuggestions.map(sug => (
                <button
                  key={sug}
                  onClick={() => handleAddSkill(sug)}
                  disabled={addingSkill}
                  className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors text-[11px] font-medium border border-stone-200"
                >
                  +{sug}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="e.g. Docker, Rust, AWS"
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSkill();
              }}
              className="flex-1 md:w-64 border border-stone-300 bg-stone-50 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-emerald-800 text-stone-900"
            />
            <button 
              onClick={() => handleAddSkill()}
              disabled={!customSkill.trim() || addingSkill}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                customSkill.trim() && !addingSkill
                  ? 'bg-emerald-800 hover:bg-emerald-900 text-white shadow-2xs' 
                  : 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200'
              }`}
            >
              {addingSkill ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Add Skill</span>
            </button>
          </div>
        </div>

      </div>

      {/* Action Prompt - If student has no verified skills yet (Warm Stone & Forest Green - No Black, No Blue) */}
      {!loading && !hasVerifiedSkills && (
        <div className="bg-stone-100 border border-stone-300 text-stone-900 rounded-2xl p-6 md:p-8 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Assessment Required</span>
            </div>
            <h3 className="text-xl md:text-2xl font-bold tracking-tight text-stone-900 font-serif">
              Establish Your Competency Baseline
            </h3>
            <p className="text-stone-600 text-sm mt-1.5 leading-relaxed">
              Before your personalized roadmap and company matching can activate, you must verify at least one skill through an adaptive assessment.
            </p>
          </div>

          <div className="shrink-0">
            {skills.length > 0 ? (
              <Link href={`/assessment/${encodeURIComponent(skills[0].skill_name)}`}>
                <button className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-2xs">
                  <span>Assess {skills[0].skill_name}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            ) : (
              <button 
                onClick={() => handleAddSkill("Python")}
                className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-2xs"
              >
                <span>Add Skill & Assess</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Strategic Platform Workflows (Classical Professional Cards with Orange Accents) */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">Core Career Workflows</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Adaptive Roadmap */}
          <Link href="/dashboard/roadmap" className="group">
            <div className="bg-white border border-stone-200 hover:border-emerald-800/40 rounded-xl p-5 shadow-2xs transition-all h-full flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-stone-100 text-stone-800 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Map className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-stone-900 text-sm group-hover:text-emerald-800 transition-colors font-serif">
                  Personalized Roadmap
                </h4>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  Navigate milestone nodes curated for your target engineering career.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-emerald-800">
                <span>Open Canvas</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Card 2: Market Career Intelligence */}
          <Link href="/dashboard/careers" className="group">
            <div className="bg-white border border-stone-200 hover:border-emerald-800/40 rounded-xl p-5 shadow-2xs transition-all h-full flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Compass className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-stone-900 text-sm group-hover:text-emerald-800 transition-colors font-serif">
                  Career Explorer & Demand
                </h4>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  Analyze real-time hiring demand across thousands of live job listings.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-emerald-800">
                <span>Analyze Demand</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Card 3: Placement Opportunities */}
          <Link href="/dashboard/jobs" className="group">
            <div className="bg-white border border-stone-200 hover:border-emerald-800/40 rounded-xl p-5 shadow-2xs transition-all h-full flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-stone-100 text-stone-800 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Briefcase className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-stone-900 text-sm group-hover:text-stone-900 transition-colors font-serif">
                  Recruiter Matching & Jobs
                </h4>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  Browse company openings filtered directly by your verified Hireability Index.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-stone-800">
                <span>View Openings</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Card 4: Direct Communications & Advisory Channels */}
          <Link href="/dashboard/job-offers" className="group">
            <div className="bg-white border border-orange-200 hover:border-orange-400 rounded-xl p-5 shadow-2xs transition-all h-full flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-orange-100/40 rounded-full blur-xl pointer-events-none" />
              <div>
                <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-800 border border-orange-200 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-5 h-5 text-orange-700" />
                </div>
                <h4 className="font-bold text-stone-900 text-sm group-hover:text-orange-950 transition-colors font-serif flex items-center gap-1.5">
                  Direct Communications
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                </h4>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  Direct dialogue with corporate recruiters, alumni mentors, and project teams.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-orange-100 flex items-center justify-between text-xs font-semibold text-orange-800">
                <span>Open Communication Hub</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-orange-600" />
              </div>
            </div>
          </Link>

        </div>
      </div>

      {/* Student Profile Modal */}
      {isProfileModalOpen && (
        <StudentProfileModal
          data={modalData}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}

    </div>
  );
}
