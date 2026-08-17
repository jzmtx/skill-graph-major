"use client";

import React, { useState } from 'react';
import { registerTPO } from '@/lib/tpoApi';
import { searchColleges } from '@/lib/api';
import Link from 'next/link';
import { GraduationCap, LogIn } from 'lucide-react';

export default function TPORegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // College search (reuses existing /api/colleges/search endpoint)
  const [collegeQuery, setCollegeQuery] = useState('');
  const [collegeResults, setCollegeResults] = useState<Array<{ id: string; name: string; state: string }>>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState('');
  const [selectedCollegeName, setSelectedCollegeName] = useState('');

  // TPO fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [designation, setDesignation] = useState('');

  const handleCollegeSearch = async (query: string) => {
    setCollegeQuery(query);
    setSelectedCollegeId('');
    if (query.length < 2) {
      setCollegeResults([]);
      return;
    }
    try {
      const results = await searchColleges(query);
      setCollegeResults(results);
    } catch {
      setCollegeResults([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!selectedCollegeId) {
        throw new Error('Please select your college from the search results');
      }

      await registerTPO({
        college_id: selectedCollegeId,
        name,
        email,
        password,
        designation: designation || undefined,
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
          <GraduationCap className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Registration Submitted</h2>
          <p className="text-slate-500 text-sm mb-6">
            Your TPO account has been created and is pending admin verification. You&apos;ll be able to access your dashboard once approved.
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
              Track your college&apos;s placement readiness in real time.
            </p>
          </div>

          <div className="text-sm text-indigo-300">
            <p className="mb-2">✓ Student skill analytics</p>
            <p className="mb-2">✓ Placement funnel tracking</p>
            <p>✓ College-wide insights</p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-2/3 p-8 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800">TPO / College Registration</h2>
            <p className="text-slate-500 text-sm mt-1">Register as a Training & Placement Officer.</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-1">College</label>
              <input
                type="text" required
                placeholder="Start typing your college name..."
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={selectedCollegeId ? selectedCollegeName : collegeQuery}
                onChange={e => handleCollegeSearch(e.target.value)}
              />
              {collegeResults.length > 0 && !selectedCollegeId && (
                <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {collegeResults.map(c => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => {
                        setSelectedCollegeId(c.id);
                        setSelectedCollegeName(c.name);
                        setCollegeResults([]);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm"
                    >
                      <span className="font-medium text-slate-800">{c.name}</span>
                      {c.state && <span className="text-slate-400 ml-2">· {c.state}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

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
                <label className="block text-sm font-medium text-slate-700 mb-1">Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Placement Officer"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={designation} onChange={e => setDesignation(e.target.value)}
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

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 mt-6"
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Already have a TPO account?{' '}
            <Link href="/login" className="text-indigo-600 font-medium hover:underline">
              Login here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}