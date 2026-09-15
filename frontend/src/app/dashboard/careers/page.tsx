"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Briefcase, Building2, MapPin, ExternalLink, Calendar, Search, Filter, Loader2, Zap, TrendingUp, Clock, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface RawJob {
  id: string;
  role_name: string;
  company_name: string | null;
  job_title: string | null;
  description: string | null;
  url: string | null;
  source: string | null;
  created_at: string;
}

export default function CareersPage() {
  const [jobs, setJobs] = useState<RawJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("All");
  const [userLocation, setUserLocation] = useState("");
  const [indiaOnly, setIndiaOnly] = useState(true);
  const [userSkills, setUserSkills] = useState<string[]>([]);

  useEffect(() => {
    // Fetch user skills from cache
    const cached = localStorage.getItem('cached_skills');
    if (cached) {
      try {
        const skillsArr = JSON.parse(cached);
        setUserSkills(skillsArr.map((s: any) => s.skill_name.toLowerCase()));
      } catch (e) {
        console.error("Failed to parse cached skills");
      }
    }

    const fetchJobs = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/roadmaps/raw-jds/admin');
        if (res.data && res.data.raw_jds) {
          setJobs(res.data.raw_jds);
        }
      } catch (err) {
        console.error("Failed to fetch jobs", err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const roles = ["All", ...Array.from(new Set(jobs.map(j => j.role_name))).filter(Boolean)];
  
  // List of major Indian cities/states/codes to fallback on.
  // Using word boundary regex \b allows us to safely include "in" (for "KA, IN") without matching "Austin".
  const indianKeywords = ["india", "in", "mumbai", "bangalore", "bengaluru", "pune", "hyderabad", "chennai", "delhi", "gurugram", "gurgaon", "noida", "kolkata", "ahmedabad", "maharashtra", "karnataka", "telangana", "tamil nadu", "gujarat", "mh", "ka", "tn", "dl", "up", "hr", "ts"];

  const filteredJobs = jobs.filter(job => {
    // Extract location from company_name format: "Company | Location"
    const hasLocation = job.company_name?.includes('|');
    const compParts = job.company_name?.split('|') || [];
    const locationStr = hasLocation && compParts.length > 1 ? compParts[1].toLowerCase().trim() : "";
    const cleanCompany = hasLocation ? compParts[0].trim() : job.company_name;
    
    // Filter out old jobs if India Only is checked and it has no location data
    if (indiaOnly && !hasLocation) return false;

    // IMPORTANT: Hide Adzuna aggregator links to ensure only genuine, direct (Indeed/LinkedIn/Glassdoor) links are shown.
    if (job.url?.toLowerCase().includes("adzuna")) return false;
    
    // Enforce India Only using word boundary regex for accuracy
    if (indiaOnly && hasLocation) {
      const isIndia = indianKeywords.some(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return regex.test(locationStr);
      });
      if (!isIndia) return false;
    }
    
    // Search Term matches (Title, Company, or Role)
    const matchesSearch = 
      (job.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (cleanCompany?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (job.role_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
      
    const matchesRole = selectedRole === "All" || job.role_name === selectedRole;
    
    // Nearest Location Search
    const matchesLocation = userLocation === "" || locationStr.includes(userLocation.toLowerCase().trim());
    
    return matchesSearch && matchesRole && matchesLocation;
  });

  const calculateMatch = (desc: string) => {
    if (!desc || userSkills.length === 0) return 0;
    const lowerDesc = desc.toLowerCase();
    let matches = 0;
    userSkills.forEach(skill => {
      // Use word boundaries so "js" doesn't match "json"
      const regex = new RegExp(`\\b${skill.toLowerCase()}\\b`);
      if (regex.test(lowerDesc)) matches++;
    });
    
    if (matches === 0) return 0;
    
    // Each matched skill gives ~15% base eligibility
    let finalMatch = matches * 15;
    if (finalMatch > 98) finalMatch = 98; // Cap at 98%
    return finalMatch;
  };

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7) return `${diff} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-200">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900 via-purple-900 to-[#0a0a0f] border-b border-white/10">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-indigo-300 text-sm font-medium mb-6 backdrop-blur-md">
              <Zap className="w-4 h-4 text-amber-400" />
              Live Industry Feed
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
              Industry <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Opportunities</span>
            </h1>
            <p className="text-lg text-indigo-200 max-w-2xl leading-relaxed">
              Real-time job postings scraped dynamically from top global employers. Updated weekly to keep your career roadmap perfectly aligned with market demand.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Filters */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div className="flex-1 flex flex-col md:flex-row gap-4 w-full">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search roles, companies..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
              />
            </div>
            
            <div className="relative w-full md:w-64">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Nearest City (e.g. Mumbai)" 
                value={userLocation}
                onChange={(e) => setUserLocation(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-6 w-full md:w-auto">
            <label className="flex items-center gap-2 cursor-pointer">
              <div className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${indiaOnly ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${indiaOnly ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
              <span className="text-sm font-medium text-slate-300">India Only</span>
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={indiaOnly}
                onChange={(e) => setIndiaOnly(e.target.checked)}
              />
            </label>
            
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-slate-400" />
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full md:w-auto bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
              >
                {roles.map(role => (
                  <option key={role} value={role} className="bg-slate-900">{role}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Job Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
            <p className="text-slate-400 font-medium">Syncing with global job boards...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
            <Briefcase className="w-16 h-16 text-slate-600 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-slate-300 mb-2">No opportunities found</h3>
            <p className="text-slate-500">Try adjusting your search filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job, idx) => {
              const compParts = job.company_name?.split('|') || [];
              const cleanCompany = compParts.length > 0 ? compParts[0].trim() : 'Confidential Enterprise';
              const location = compParts.length > 1 ? compParts[1].trim() : 'Remote / Unspecified';
              
              const postedDate = new Date(job.created_at);
              const deadlineDate = new Date(postedDate.getTime() + (30 * 24 * 60 * 60 * 1000));
              const matchPercent = calculateMatch(job.description || "");
              
              // Strip markdown asterisks and hashtags for clean UI
              const cleanDescription = (job.description || "No description provided by the employer.")
                .replace(/[*#_`]/g, '')
                .replace(/\s+/g, ' ');
              
              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.08] hover:border-indigo-500/50 transition-all flex flex-col h-full relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full group-hover:bg-indigo-500/20 transition-all pointer-events-none"></div>

                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="inline-block px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                          {job.role_name}
                        </span>
                        {userSkills.length > 0 && matchPercent > 0 && (
                          <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                            matchPercent >= 75 ? 'bg-emerald-500/20 text-emerald-300' :
                            matchPercent >= 50 ? 'bg-amber-500/20 text-amber-300' :
                            'bg-indigo-500/20 text-indigo-300'
                          }`}>
                            {matchPercent}% Match
                          </span>
                        )}
                        {userSkills.length > 0 && matchPercent === 0 && (
                          <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-500/20 text-slate-300">
                            No Match
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2 leading-tight group-hover:text-indigo-300 transition-colors line-clamp-2">
                        {job.job_title || job.role_name}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span className="font-medium text-slate-300 truncate">{cleanCompany}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-slate-400 mb-4">
                    <MapPin className="w-4 h-4 shrink-0 text-slate-500" />
                    <span className="text-sm text-slate-400 truncate capitalize">{location}</span>
                  </div>

                  <p className="text-sm text-slate-500 mb-6 line-clamp-3 leading-relaxed flex-1">
                    {cleanDescription}
                  </p>

                  <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        Scraped: {postedDate.toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-emerald-400" />
                        Status: Currently Hiring
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-2">
                      {job.url ? (
                        <>
                          <a 
                            href={job.url.startsWith('http') ? job.url : `https://${job.url}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex-1 text-center px-4 py-2.5 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                          >
                            View JD
                          </a>
                          <a 
                            href={job.url.startsWith('http') ? job.url : `https://${job.url}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex-1 text-center px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                          >
                            Apply Now
                          </a>
                        </>
                      ) : (
                        <button disabled className="w-full text-center px-4 py-2.5 rounded-lg bg-white/5 text-slate-500 font-medium cursor-not-allowed border border-white/10">
                          Unavailable
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
