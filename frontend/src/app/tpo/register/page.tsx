"use client";

import React, { useState } from 'react';
import { registerTPO } from '@/lib/tpoApi';
import { searchColleges } from '@/lib/api';
import Link from 'next/link';
import { GraduationCap, ArrowRight, ShieldCheck } from 'lucide-react';

export default function TPORegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // College search
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
      <div className="min-h-screen bg-stone-50 font-sans flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-stone-200 p-8 text-center">
          <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-stone-900 mb-2">Registration Submitted</h2>
          <p className="text-stone-500 text-xs mb-6 leading-relaxed">
            Your institutional placement administrator account has been recorded and is pending administrative approval. You will receive an update once verified.
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
            <h1 className="text-xl font-bold mb-3 tracking-tight text-stone-900">Campus Placement Cell</h1>
            <p className="text-xs text-stone-600 leading-relaxed">
              Equip your institution with verified student skill analytics, real-time employer pipeline management, and placement audit reports.
            </p>
          </div>

          <div className="space-y-3 text-xs text-stone-600 border-t border-stone-200 pt-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>Institutional candidate registry</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>Assessment & skill score tracking</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>Direct corporate placement pipeline</span>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-2/3 p-8 md:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-stone-900">Placement Officer Registration</h2>
            <p className="text-stone-500 text-xs mt-1">Register your institutional authority credentials.</p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="relative">
              <label className="block font-semibold text-stone-700 mb-1">Institution / College *</label>
              <input
                type="text" required
                placeholder="Search college name..."
                className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-700 focus:bg-white outline-none text-stone-900 text-xs"
                value={selectedCollegeId ? selectedCollegeName : collegeQuery}
                onChange={e => handleCollegeSearch(e.target.value)}
              />
              {collegeResults.length > 0 && !selectedCollegeId && (
                <div className="absolute z-10 w-full bg-white border border-stone-200 rounded-lg shadow-md mt-1 max-h-48 overflow-y-auto">
                  {collegeResults.map(c => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => {
                        setSelectedCollegeId(c.id);
                        setSelectedCollegeName(c.name);
                        setCollegeResults([]);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-stone-50 text-xs transition-colors border-b border-stone-100 last:border-b-0"
                    >
                      <span className="font-semibold text-stone-900">{c.name}</span>
                      {c.state && <span className="text-stone-400 ml-2">· {c.state}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Officer Full Name *</label>
              <input
                type="text" required
                placeholder="Dr. S. Sharma"
                className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-700 focus:bg-white outline-none text-stone-900 text-xs"
                value={name} onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Official Email *</label>
                <input
                  type="email" required
                  placeholder="tpo@university.edu"
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-700 focus:bg-white outline-none text-stone-900 text-xs"
                  value={email} onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Designation</label>
                <input
                  type="text"
                  placeholder="Head, Placement & Training"
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-700 focus:bg-white outline-none text-stone-900 text-xs"
                  value={designation} onChange={e => setDesignation(e.target.value)}
                />
              </div>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-800 text-white text-xs font-semibold rounded-lg hover:bg-emerald-900 disabled:opacity-50 mt-4 transition-colors shadow-xs"
            >
              {loading ? "Registering authority..." : "Register Placement Cell"}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-stone-500">
            Already have an officer account?{' '}
            <Link href="/login" className="text-emerald-800 font-semibold hover:underline">
              Login here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}