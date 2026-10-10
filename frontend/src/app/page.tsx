"use client";

import Link from 'next/link';
import { GraduationCap, Building2, Users, LogIn } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 text-stone-900">
      <div className="w-full max-w-3xl text-center">
        
        {/* Brand Monogram */}
        <div className="w-12 h-12 rounded-xl bg-emerald-800 text-white flex items-center justify-center mx-auto mb-4 font-serif font-bold text-xl shadow-2xs">
          S
        </div>

        <h1 className="text-4xl font-extrabold text-stone-900 tracking-tight mb-2 font-serif">SkillGraph</h1>
        <p className="text-stone-600 text-sm max-w-lg mx-auto mb-10 leading-relaxed">
          Standardized competency benchmarking, live market roadmaps, and an integrated campus placement network.
        </p>

        <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-4">Select Portal Role</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <Link
            href="/register"
            className="flex flex-col items-center gap-3 bg-white border border-stone-200 rounded-xl p-6 hover:border-emerald-800 hover:shadow-2xs transition-all group"
          >
            <div className="w-12 h-12 rounded-lg bg-stone-100 group-hover:bg-emerald-50 flex items-center justify-center transition-colors">
              <GraduationCap className="w-6 h-6 text-stone-700 group-hover:text-emerald-800 transition-colors" />
            </div>
            <span className="font-semibold text-stone-900 text-sm font-serif">Student</span>
          </Link>

          <Link
            href="/company/register"
            className="flex flex-col items-center gap-3 bg-white border border-stone-200 rounded-xl p-6 hover:border-emerald-800 hover:shadow-2xs transition-all group"
          >
            <div className="w-12 h-12 rounded-lg bg-stone-100 group-hover:bg-emerald-50 flex items-center justify-center transition-colors">
              <Building2 className="w-6 h-6 text-stone-700 group-hover:text-emerald-800 transition-colors" />
            </div>
            <span className="font-semibold text-stone-900 text-sm font-serif">Company</span>
          </Link>

          <Link
            href="/tpo/register"
            className="flex flex-col items-center gap-3 bg-white border border-stone-200 rounded-xl p-6 hover:border-emerald-800 hover:shadow-2xs transition-all group"
          >
            <div className="w-12 h-12 rounded-lg bg-stone-100 group-hover:bg-emerald-50 flex items-center justify-center transition-colors">
              <GraduationCap className="w-6 h-6 text-stone-700 group-hover:text-emerald-800 transition-colors" />
            </div>
            <span className="font-semibold text-stone-900 text-sm font-serif">TPO / College</span>
          </Link>

          <Link
            href="/alumni/register"
            className="flex flex-col items-center gap-3 bg-white border border-stone-200 rounded-xl p-6 hover:border-emerald-800 hover:shadow-2xs transition-all group"
          >
            <div className="w-12 h-12 rounded-lg bg-stone-100 group-hover:bg-emerald-50 flex items-center justify-center transition-colors">
              <Users className="w-6 h-6 text-stone-700 group-hover:text-emerald-800 transition-colors" />
            </div>
            <span className="font-semibold text-stone-900 text-sm font-serif">Alumni</span>
          </Link>
        </div>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs text-emerald-800 font-bold hover:underline"
        >
          <span>Already have an account? Sign in here</span>
          <LogIn className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}