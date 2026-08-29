"use client";

import Link from 'next/link';
import { GraduationCap, Building2, Users, LogIn } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl text-center">
        <h1 className="text-4xl font-bold text-slate-800 tracking-tight mb-3">SkillGraph</h1>
        <p className="text-slate-500 mb-10">
          Live-market-driven roadmaps, verified skills, and a connected career ecosystem.
        </p>

        <p className="text-sm font-medium text-slate-600 mb-4">I am a...</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <Link
            href="/register"
            className="flex flex-col items-center gap-3 bg-white border border-slate-200 rounded-2xl p-6 hover:border-indigo-400 hover:shadow-md transition-all"
          >
            <GraduationCap className="w-8 h-8 text-indigo-600" />
            <span className="font-medium text-slate-800">Student</span>
          </Link>

          <Link
            href="/company/register"
            className="flex flex-col items-center gap-3 bg-white border border-slate-200 rounded-2xl p-6 hover:border-indigo-400 hover:shadow-md transition-all"
          >
            <Building2 className="w-8 h-8 text-indigo-600" />
            <span className="font-medium text-slate-800">Company</span>
          </Link>

          <Link
            href="/tpo/register"
            className="flex flex-col items-center gap-3 bg-white border border-slate-200 rounded-2xl p-6 hover:border-indigo-400 hover:shadow-md transition-all"
          >
            <GraduationCap className="w-8 h-8 text-indigo-600" />
            <span className="font-medium text-slate-800">TPO / College</span>
          </Link>

          <Link
            href="/alumni/register"
            className="flex flex-col items-center gap-3 bg-white border border-slate-200 rounded-2xl p-6 hover:border-indigo-400 hover:shadow-md transition-all"
          >
            <Users className="w-8 h-8 text-indigo-600" />
            <span className="font-medium text-slate-800">Alumni</span>
          </Link>
        </div>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-indigo-600 font-medium hover:underline"
        >
          Already have an account? Login <LogIn className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}