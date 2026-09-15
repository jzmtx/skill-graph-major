"use client";

import React, { useState } from 'react';
import { registerCompany } from '@/lib/companyApi';
import Link from 'next/link';
import { Building2, LogIn } from 'lucide-react';

export default function CompanyRegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Company fields
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!companyName.trim()) {
        throw new Error('Company name is required');
      }
      
      await registerCompany({
        name: companyName,
        email,
        password,
        website: website || undefined,
        industry: industry || undefined,
      });

      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <Building2 className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Registration Successful</h2>
          <p className="text-slate-500 text-sm mb-6">
            Your company account has been created successfully! You can now log in and start posting jobs.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
          >
            Go to Login <LogIn className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        {/* Left Side: Branding / Info */}
        <div className="w-full md:w-1/3 bg-indigo-900 p-8 text-white flex flex-col justify-between hidden md:flex">
          <div>
            <h1 className="text-3xl font-bold mb-4 tracking-tight">SkillGraph ATS</h1>
            <p className="text-indigo-200">
              Find verified, job-ready talent straight from the skill graph.
            </p>
          </div>

          <div className="text-sm text-indigo-300">
            <p className="mb-2">✓ Post jobs directly</p>
            <p className="mb-2">✓ See verified skill scores</p>
            <p>✓ Rank applicants by fit</p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-2/3 p-8 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800">Company Registration</h2>
            <p className="text-slate-500 text-sm mt-1">Create an account to hire top talent.</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
              <input
                type="text" required
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={companyName} onChange={e => setCompanyName(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Work Email</label>
                <input
                  type="email" required
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={email} onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password" required minLength={6}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={password} onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Website (Optional)</label>
                <input
                  type="text"
                  placeholder="https://"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={website} onChange={e => setWebsite(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Industry (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Technology"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={industry} onChange={e => setIndustry(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 mt-6"
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Already have a company account?{' '}
            <Link href="/login" className="text-indigo-600 font-medium hover:underline">
              Login here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}