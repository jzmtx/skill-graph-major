"use client";

import React, { useState } from 'react';
import { loginStudent, devLoginStudent } from '@/lib/api';
import { loginCompany } from '@/lib/companyApi';
import { loginTPO } from '@/lib/tpoApi';
import { loginAlumni } from '@/lib/alumniApi';
import Link from 'next/link';
import { LogIn, Zap } from 'lucide-react';

type Role = 'student' | 'company' | 'tpo' | 'alumni';

export default function LoginPage() {
  const [role, setRole] = useState<Role>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDevLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await devLoginStudent();
      if (response.user) {
        localStorage.setItem('student_id', response.user.id);
        localStorage.setItem('student_github', response.user.github_url || '');
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        {/* Left Side: Branding / Info */}
        <div className="w-full md:w-1/3 bg-indigo-900 p-8 text-white flex flex-col justify-between hidden md:flex">
          <div>
            <h1 className="text-3xl font-bold mb-4 tracking-tight">SkillGraph</h1>
            <p className="text-indigo-200">
              Welcome back to your personalized career ecosystem.
            </p>
          </div>

          <div className="text-sm text-indigo-300">
            <p className="mb-2">✓ AI-Driven Roadmaps</p>
            <p className="mb-2">✓ Verified Skill Scores</p>
            <p>✓ Direct Company Matching</p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-2/3 p-8 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800">Welcome Back</h2>
            <p className="text-slate-500 text-sm mt-1">Log in to your account.</p>
          </div>

          {/* Role Tabs */}
          <div className="flex gap-1.5 mb-6 bg-slate-100 p-1 rounded-lg w-fit flex-wrap">
            {(['student', 'company', 'tpo', 'alumni'] as Role[]).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => { setRole(r); setError(''); }}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
                  role === r ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'
                }`}
              >
                {r === 'tpo' ? 'TPO / College' : r}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email" required
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                {role === 'student' && (
                  <Link href="/forgot-password" className="text-xs text-indigo-600 hover:underline font-medium">
                    Forgot password?
                  </Link>
                )}
              </div>
              <input
                type="password" required
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={password} onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 mt-6"
            >
              {loading ? "Logging in..." : "Login"} <LogIn className="w-4 h-4 ml-2" />
            </button>

            {role === 'student' && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                  <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-500">Or bypass auth for testing</span></div>
                </div>

                <button
                  type="button"
                  onClick={handleDevLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center px-6 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 shadow-md transition-colors"
                >
                  <Zap className="w-4 h-4 mr-2" /> DEV MODE: One-Click Auto Login
                </button>
              </>
            )}
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href={registerLink} className="text-indigo-600 font-medium hover:underline">
              Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}