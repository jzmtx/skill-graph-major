"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronLeft, CheckCircle2, User, GraduationCap } from 'lucide-react';
import { registerStudent, searchColleges } from '@/lib/api';

export default function RegisterWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', phone: '',
    college_id: '', college_name: '', state: '', branch: '', year: '', usn: '',
    github_url: '', linkedin_url: ''
  });
  
  const [collegeSearch, setCollegeSearch] = useState('');
  const [collegeResults, setCollegeResults] = useState<any[]>([]);

  const handleNext = () => setStep(s => Math.min(s + 1, 3));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  const handleSearchCollege = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCollegeSearch(val);
    setFormData({ ...formData, college_name: val }); // fallback if new
    
    if (val.length >= 3) {
      try {
        const results = await searchColleges(val);
        setCollegeResults(results);
      } catch (err) {
        console.error("College search failed");
      }
    } else {
      setCollegeResults([]);
    }
  };

  const handleSelectCollege = (c: any) => {
    setFormData({ ...formData, college_id: c.id, college_name: c.name, state: c.state });
    setCollegeSearch(c.name);
    setCollegeResults([]);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const data = { ...formData, year: parseInt(formData.year) || 1 };
      const response = await registerStudent(data);
      
      // Save info to local storage for the dashboard
      if (response.user) {
        localStorage.setItem('student_id', response.user.id);
        localStorage.setItem('student_github', response.user.github_url || '');
      }
      
      // Success: redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full justify-center">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Create your account</h2>
        <p className="text-slate-500 text-sm mt-1">Step {step} of 3</p>
        
        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-2 rounded-full mt-4">
          <div 
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input 
                type="text" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input 
                type="email" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input 
                type="password" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input 
                type="tel" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
          </div>
        )}

        {/* Step 2: Academic Info */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-1">College</label>
              <input 
                type="text" placeholder="Search your college..."
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={collegeSearch} onChange={handleSearchCollege}
              />
              {collegeResults.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-slate-200 mt-1 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {collegeResults.map(c => (
                    <div key={c.id} onClick={() => handleSelectCollege(c)} className="p-2 hover:bg-slate-50 cursor-pointer text-sm">
                      {c.name} ({c.state})
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                <input 
                  type="text" className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                <input 
                  type="text" placeholder="e.g. CSE" className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Year / Sem</label>
                <input 
                  type="number" className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">USN / Roll No</label>
                <input 
                  type="text" className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  value={formData.usn} onChange={e => setFormData({...formData, usn: e.target.value})}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Social Profiles */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">GitHub URL (Optional)</label>
              <input 
                type="url" placeholder="https://github.com/yourusername"
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.github_url} onChange={e => setFormData({...formData, github_url: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn URL (Optional)</label>
              <input 
                type="url" placeholder="https://linkedin.com/in/yourusername"
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.linkedin_url} onChange={e => setFormData({...formData, linkedin_url: e.target.value})}
              />
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8 pt-4 border-t border-slate-100">
        <button
          onClick={handlePrev}
          disabled={step === 1 || loading}
          className="flex items-center px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </button>
        
        {step < 3 ? (
          <button
            onClick={handleNext}
            className="flex items-center px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center px-6 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Complete Registration"} <CheckCircle2 className="w-4 h-4 ml-2" />
          </button>
        )}
      </div>

      <div className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link href="/login" className="text-indigo-600 font-medium hover:underline">
          Log in here
        </Link>
      </div>
    </div>
  );
}
