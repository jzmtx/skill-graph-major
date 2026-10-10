"use client";

import RegisterWizard from '@/components/auth/RegisterWizard';
import { CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 text-stone-900">
      <div className="w-full max-w-4xl bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Classical Academic Column (No Black, No Blue) */}
        <div className="w-full md:w-5/12 bg-stone-100 border-r border-stone-200 p-8 flex flex-col justify-between hidden md:flex">
          <div>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-9 h-9 rounded-lg bg-emerald-800 flex items-center justify-center text-white font-serif font-bold text-lg shadow-2xs">
                S
              </div>
              <span className="font-serif font-bold text-stone-900 text-lg">SkillGraph</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-stone-900 mb-2 font-serif">
              Begin Your Placement Journey
            </h1>
            <p className="text-sm text-stone-600 leading-relaxed">
              Create your verified student profile, establish baseline competencies, and connect to enterprise recruiters.
            </p>
          </div>
          
          <div className="space-y-3 pt-6 border-t border-stone-200 text-xs text-stone-700">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>Institutional Placement Record</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>Objective Competency Ratings</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>Direct Industry Applications</span>
            </div>
          </div>
        </div>

        {/* Right Side: Wizard */}
        <div className="w-full md:w-7/12 p-8 sm:p-10">
          <RegisterWizard />
        </div>
      </div>
    </div>
  );
}
