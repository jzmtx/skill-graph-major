"use client";

import React, { useState } from 'react';
import { registerCompany } from '@/lib/companyApi';
import Link from 'next/link';
import { Building2, ArrowRight, ShieldCheck } from 'lucide-react';

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
      <div className="min-h-screen bg-stone-50 font-sans flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-stone-200 p-8 text-center">
          <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-stone-900 mb-2">Employer Account Created</h2>
          <p className="text-stone-500 text-xs mb-6 leading-relaxed">
            Your corporate recruiting profile has been configured. You can now authenticate and start publishing vacancies and reviewing skill-verified candidates.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-800 text-white text-xs font-semibold rounded-lg hover:bg-emerald-900 transition-colors shadow-xs"
          >
            Go to Login <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

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
            <h1 className="text-xl font-bold mb-3 tracking-tight text-stone-900">Enterprise Talent Network</h1>
            <p className="text-xs text-stone-600 leading-relaxed">
              Recruit verified, benchmarked engineering talent directly from university pipelines with granular assessment proof.
            </p>
          </div>

          <div className="space-y-3 text-xs text-stone-600 border-t border-stone-200 pt-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>Verified level 1 & 2 competencies</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>Direct hiring pipeline and assessments</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>Real-time candidate messaging</span>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-2/3 p-8 md:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-stone-900">Employer Account Registration</h2>
            <p className="text-stone-500 text-xs mt-1">Register your organization to post roles and access verified candidate dossiers.</p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Company / Organization Name *</label>
              <input
                type="text" required
                placeholder="e.g. Acme Technologies"
                className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-700 focus:bg-white outline-none text-stone-900 text-xs"
                value={companyName} onChange={e => setCompanyName(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Work Email *</label>
                <input
                  type="email" required
                  placeholder="talent@acme.com"
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-700 focus:bg-white outline-none text-stone-900 text-xs"
                  value={email} onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Password *</label>
                <input
                  type="password" required minLength={6}
                  placeholder="Minimum 6 characters"
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-700 focus:bg-white outline-none text-stone-900 text-xs"
                  value={password} onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Company Website</label>
                <input
                  type="text"
                  placeholder="https://acme.com"
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-700 focus:bg-white outline-none text-stone-900 text-xs"
                  value={website} onChange={e => setWebsite(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Industry Sector</label>
                <input
                  type="text"
                  placeholder="e.g. Enterprise Software, Fintech"
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-700 focus:bg-white outline-none text-stone-900 text-xs"
                  value={industry} onChange={e => setIndustry(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-800 text-white text-xs font-semibold rounded-lg hover:bg-emerald-900 disabled:opacity-50 mt-4 transition-colors shadow-xs"
            >
              {loading ? "Registering organization..." : "Register Organization"}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-stone-500">
            Already have an employer account?{' '}
            <Link href="/login" className="text-emerald-800 font-semibold hover:underline">
              Login here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}