"use client";

import React, { useState } from 'react';
import { forceResetPassword } from '@/lib/api';
import Link from 'next/link';
import { RefreshCcw, CheckCircle2, ShieldCheck, ArrowLeft } from 'lucide-react';

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
    <div className="min-h-screen bg-stone-50 font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col md:flex-row">
        {/* Left Side: Institutional Overview */}
        <div className="w-full md:w-1/3 bg-stone-100 border-b md:border-b-0 md:border-r border-stone-200 p-8 text-stone-900 flex flex-col justify-between hidden md:flex">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-9 h-9 rounded-lg bg-emerald-800 text-white flex items-center justify-center font-bold text-sm">
                SG
              </div>
              <span className="text-lg font-bold tracking-tight text-stone-900">SkillGraph</span>
            </div>
            <h1 className="text-xl font-bold mb-3 tracking-tight text-stone-900">Account Recovery</h1>
            <p className="text-xs text-stone-600 leading-relaxed">
              Restore access to your authenticated institutional profile and placement records.
            </p>
          </div>
          
          <div className="space-y-3 text-xs text-stone-600 border-t border-stone-200 pt-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>Cryptographic credential reset</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>Synchronized institutional records</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>Direct verification audit log</span>
            </div>
          </div>
        </div>

        {/* Right Side: Reset Form */}
        <div className="w-full md:w-2/3 p-8 md:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-stone-900">Reset Account Credentials</h2>
            <p className="text-stone-500 text-xs mt-1">Provide your registered account email and set a new password.</p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs mb-6">
              {error}
            </div>
          )}

          {success ? (
            <div className="space-y-4 text-center py-6">
              <div className="flex justify-center mb-2">
                <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-base font-bold text-stone-900">Password Updated Successfully</h3>
              <p className="text-stone-500 text-xs max-w-sm mx-auto">
                Your credentials have been securely updated. You can now authenticate with your new password.
              </p>
              
              <Link
                href="/login"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Return to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Institutional Email</label>
                <input 
                  type="email" required
                  placeholder="e.g. candidate@university.edu"
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-700 focus:bg-white outline-none text-stone-900 text-xs"
                  value={email} onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">New Password</label>
                <input 
                  type="password" required
                  placeholder="Enter secure new password"
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-700 focus:bg-white outline-none text-stone-900 text-xs"
                  value={password} onChange={e => setPassword(e.target.value)}
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-800 text-white text-xs font-semibold rounded-lg hover:bg-emerald-900 disabled:opacity-50 mt-4 transition-colors shadow-xs"
              >
                {loading ? "Updating credentials..." : "Reset Password"} <RefreshCcw className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-stone-500">
            Remembered your credentials?{' '}
            <Link href="/login" className="text-emerald-800 font-semibold hover:underline">
              Return to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
