"use client";

import React, { useState } from 'react';
import { registerCompany, registerRecruiter, searchCompanies } from '@/lib/companyApi';
import Link from 'next/link';
import { Building2, LogIn } from 'lucide-react';

export default function CompanyRegisterPage() {
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // New company fields
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');

  // Existing company search
  const [companyQuery, setCompanyQuery] = useState('');
  const [companyResults, setCompanyResults] = useState<Array<{ id: string; name: string; industry: string }>>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedCompanyName, setSelectedCompanyName] = useState('');

  // Recruiter fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleTitle, setRoleTitle] = useState('');

  const handleCompanySearch = async (query: string) => {
    setCompanyQuery(query);
    setSelectedCompanyId('');
    if (query.length < 2) {
      setCompanyResults([]);
      return;
    }
    try {
      const results = await searchCompanies(query);
      setCompanyResults(results);
    } catch {
      setCompanyResults([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let companyId = selectedCompanyId;

      if (mode === 'new') {
        if (!companyName.trim()) {
          throw new Error('Company name is required');
        }
        const companyResponse = await registerCompany({
          name: companyName,
          website: website || undefined,
          industry: industry || undefined,
        });
        companyId = companyResponse.company.id;
      } else {
        if (!companyId) {
          throw new Error('Please select a company from the search results');
        }
      }

      await registerRecruiter({
        company_id: companyId,
        name,
        email,
        password,
        role_title: roleTitle || undefined,
      });

      setSuccess(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(error.response?.data?.detail || error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <Building2 className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Registration Submitted</h2>
          <p className="text-slate-500 text-sm mb-6">
            {mode === 'new'
              ? "Your company and recruiter account have been created. Your company is pending admin verification before you can post jobs."
              : "Your recruiter account has been created under the selected company."}
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
            <h1 className="text-3xl font-bold mb-4 tracking-tight">SkillGraph</h1>
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
            <p className="text-slate-500 text-sm mt-1">Register your company and create a recruiter account.</p>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setMode('new')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'new' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              New Company
            </button>
            <button
              type="button"
              onClick={() => setMode('existing')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'existing' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              Join Existing Company
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'new' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text" required
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={companyName} onChange={e => setCompanyName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={website} onChange={e => setWebsite(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={industry} onChange={e => setIndustry(e.target.value)}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-1">Search Company</label>
                <input
                  type="text" required
                  placeholder="Start typing your company name..."
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={selectedCompanyId ? selectedCompanyName : companyQuery}
                  onChange={e => handleCompanySearch(e.target.value)}
                />
                {companyResults.length > 0 && !selectedCompanyId && (
                  <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {companyResults.map(c => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => {
                          setSelectedCompanyId(c.id);
                          setSelectedCompanyName(c.name);
                          setCompanyResults([]);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm"
                      >
                        <span className="font-medium text-slate-800">{c.name}</span>
                        {c.industry && <span className="text-slate-400 ml-2">· {c.industry}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-slate-200 pt-4 mt-4">
              <p className="text-sm font-medium text-slate-700 mb-3">Recruiter Details</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
                  <input
                    type="text" required
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={name} onChange={e => setName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email" required
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={email} onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Role Title</label>
                    <input
                      type="text"
                      placeholder="e.g. HR Manager"
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={roleTitle} onChange={e => setRoleTitle(e.target.value)}
                    />
                  </div>
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
            Already have a recruiter account?{' '}
            <Link href="/login" className="text-indigo-600 font-medium hover:underline">
              Login here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}