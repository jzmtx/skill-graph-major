"use client";

import { useState } from 'react';
import Link from 'next/link';
import { LogIn, GraduationCap, CheckCircle2 } from 'lucide-react';
import { loginStudent, devLoginStudent } from '@/lib/api';
import { loginCompany } from '@/lib/companyApi';
import { loginTPO } from '@/lib/tpoApi';
import { loginAlumni } from '@/lib/alumniApi';

type Role = 'student' | 'company' | 'tpo' | 'alumni';

export default function LoginPage() {
  const [role, setRole] = useState<Role>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDevLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await devLoginStudent();
      if (response.user) {
        localStorage.setItem('student_id', response.user.id);
        localStorage.setItem('student_github', response.user.github_url || '');
        localStorage.setItem('student_name', response.user.name || '');
      }
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      setError("Dev login failed. Ensure there is at least one student in the database.");
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (role === 'student') {
        const response = await loginStudent({ email, password });
        if (response.user) {
          localStorage.setItem('student_id', response.user.id);
          localStorage.setItem('student_github', response.user.github_url || '');
          localStorage.setItem('student_name', response.user.name || '');
        }
        window.location.href = '/dashboard';

      } else if (role === 'company') {
        const response = await loginCompany({ email, password });
        if (response.company) {
          localStorage.setItem('company_id', response.company.id);
          localStorage.setItem('company_auth_id', response.auth_id);
        }
        window.location.href = '/company/dashboard';

      } else if (role === 'tpo') {
        const response = await loginTPO({ email, password });
        if (response.tpo_official) {
          localStorage.setItem('tpo_id', response.tpo_official.id);
          localStorage.setItem('tpo_auth_id', response.tpo_official.auth_id);
        }
        window.location.href = '/tpo/dashboard';

      } else if (role === 'alumni') {
        const response = await loginAlumni({ email, password });
        if (response.alumni) {
          localStorage.setItem('alumni_id', response.alumni.id);
          localStorage.setItem('alumni_auth_id', response.alumni.auth_id);
        }
        window.location.href = '/alumni/dashboard';
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } }; message?: string };
      if (!error.response) {
        setError("Unable to connect to the server. Please ensure the backend is running on port 8000.");
      } else {
        setError(error.response?.data?.detail || "Invalid login credentials");
      }
    } finally {
      setLoading(false);
    }
  };

  const registerLink =
    role === 'student' ? '/register' :
    role === 'company' ? '/company/register' :
    role === 'tpo' ? '/tpo/register' :
    '/alumni/register';

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 text-stone-900">
      <div className="w-full max-w-4xl bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Classical Academic Column (No Black, No Blue) */}
        <div className="w-full md:w-5/12 bg-stone-100 border-r border-stone-200 p-8 flex flex-col justify-between hidden md:flex">
          <div>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-9 h-9 rounded-lg bg-emerald-800 flex items-center justify-center text-white font-serif font-bold text-lg shadow-2xs">
                S
              </div>
              <span className="font-serif font-bold text-stone-900 text-lg">SkillGraph</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-stone-900 mb-2 font-serif">
              Institutional Placement Platform
            </h1>
            <p className="text-sm text-stone-600 leading-relaxed">
              Standardized competency benchmarking, live market roadmaps, and campus-to-corporate career pipelines.
            </p>
          </div>

          <div className="space-y-3 pt-6 border-t border-stone-200 text-xs text-stone-700">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>Verified Hireability Index (GLI)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>Adaptive Engineering Assessments</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>Institutional Placement Clusters</span>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-7/12 p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-stone-900 font-serif">Sign In to Your Portal</h2>
            <p className="text-stone-500 text-xs mt-1">Select your platform role to continue.</p>
          </div>

          {/* Role Tabs */}
          <div className="flex gap-1.5 mb-6 bg-stone-100 p-1 rounded-xl w-fit flex-wrap border border-stone-200">
            {(['student', 'company', 'tpo', 'alumni'] as Role[]).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => { setRole(r); setError(''); }}
                className={`px-3 py-1.5 text-xs rounded-lg capitalize transition-all ${
                  role === r 
                    ? 'bg-emerald-800 text-white font-bold shadow-2xs' 
                    : 'text-stone-600 hover:text-stone-900 font-medium'
                }`}
              >
                {r === 'tpo' ? 'TPO / College' : r}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Email Address</label>
              <input
                type="email" 
                required
                className="w-full p-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-800 text-stone-900"
                value={email} 
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">Password</label>
                {role === 'student' && (
                  <Link href="/forgot-password" className="text-xs text-emerald-800 hover:underline font-semibold">
                    Forgot password?
                  </Link>
                )}
              </div>
              <input
                type="password" 
                required
                className="w-full p-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-800 text-stone-900"
                value={password} 
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-6 py-2.5 bg-emerald-800 text-white text-sm font-bold rounded-xl hover:bg-emerald-900 disabled:opacity-50 mt-6 shadow-2xs transition-colors"
            >
              {loading ? "Signing in..." : "Sign In"} <LogIn className="w-4 h-4 ml-2" />
            </button>

            {role === 'student' && (
              <>
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200"></div></div>
                  <div className="relative flex justify-center text-xs"><span className="px-2 bg-white text-stone-400 uppercase font-semibold">Testing Bypass</span></div>
                </div>

                <button
                  type="button"
                  onClick={handleDevLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center px-6 py-2.5 bg-stone-100 text-stone-800 text-xs font-bold rounded-xl hover:bg-stone-200 border border-stone-300 transition-colors"
                >
                  <GraduationCap className="w-4 h-4 mr-2 text-emerald-800" /> Fast Dev Login (Demo Student)
                </button>
              </>
            )}
          </form>

          <div className="mt-6 text-center text-xs text-stone-600">
            Don&apos;t have an account?{' '}
            <Link href={registerLink} className="text-emerald-800 font-bold hover:underline">
              Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}