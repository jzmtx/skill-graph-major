"use client";

import React, { useState } from 'react';
import { forceResetPassword } from '@/lib/api';
import Link from 'next/link';
import { RefreshCcw, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await forceResetPassword({ email, password });
      setSuccess(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || "Failed to reset password. Please ensure the email is correct.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        {/* Left Side: Branding / Info */}
        <div className="w-full md:w-1/3 bg-indigo-900 p-8 text-white flex flex-col justify-between hidden md:flex">
          <div>
            <h1 className="text-3xl font-bold mb-4 tracking-tight">SkillGraph</h1>
            <p className="text-indigo-200">
              Get back to your personalized career roadmap instantly.
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
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Reset Password</h2>
            <p className="text-slate-500 text-sm mt-1">Forgot your testing password? Reset it instantly below.</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          {success ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 text-center py-8">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-800">Password Reset Successful!</h3>
              <p className="text-slate-500 text-sm">Your new password is now active.</p>
              
              <Link href="/login" className="inline-block mt-6 px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
                Return to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Your Account Email</label>
                <input 
                  type="email" required
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={email} onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
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
                {loading ? "Resetting..." : "Force Reset Password"} <RefreshCcw className="w-4 h-4 ml-2" />
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-slate-500">
            Remembered your password?{' '}
            <Link href="/login" className="text-indigo-600 font-medium hover:underline">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
