"use client";

import React, { useState, useEffect } from 'react';
import { Briefcase, Building2, MapPin, ExternalLink, Calendar, Search, Filter, Loader2, Zap, Clock, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getCachedData, smartFetchWithCache } from '@/lib/cache';
import { SmartTopBarLoader, SmartListSkeleton } from '@/components/common/SmartLoader';

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
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("All");
  const [userLocation, setUserLocation] = useState("");
  const [indiaOnly, setIndiaOnly] = useState(true);
  const [userSkills, setUserSkills] = useState<string[]>([]);

  useEffect(() => {
    const cachedJobs = getCachedData<RawJob[]>('careers_raw_jds');
    if (cachedJobs && cachedJobs.length > 0) {
      setJobs(cachedJobs);
      setLoading(false);
    }

    const cached = typeof window !== 'undefined' ? localStorage.getItem('cached_skills') : null;
    if (cached) {
      try {
        const skillsArr = JSON.parse(cached);
        setUserSkills(skillsArr.map((s: any) => s.skill_name.toLowerCase()));
      } catch (e) {
        console.error("Failed to parse cached skills");
      }
    }

    const fetchJobs = async () => {
      setSyncing(true);
      try {
        const data = await smartFetchWithCache<RawJob[]>(
          'careers_raw_jds',
          async () => {
            const res = await api.get('/api/roadmaps/raw-jds/admin');
            return res.data?.raw_jds || [];
          },
          {
            ttl: 10 * 60 * 1000, // 10 minutes cache
            onFresh: (freshData) => {
              if (freshData && freshData.length > 0) {
                setJobs(freshData);
              }
            }
          }
        );
        if (data && data.length > 0) {
          setJobs(data);
        }
      } catch (err) {
        console.error("Failed to fetch jobs", err);
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    };
    fetchJobs();
  }, []);

  const roles = ["All", ...Array.from(new Set(jobs.map(j => j.role_name))).filter(Boolean)];
  const indianKeywords = ["india", "in", "mumbai", "bangalore", "bengaluru", "pune", "hyderabad", "chennai", "delhi", "gurugram", "gurgaon", "noida", "kolkata", "ahmedabad", "maharashtra", "karnataka", "telangana", "tamil nadu", "gujarat", "mh", "ka", "tn", "dl", "up", "hr", "ts"];

  const filteredJobs = jobs.filter(job => {
    const hasLocation = job.company_name?.includes('|');
    const compParts = job.company_name?.split('|') || [];
    const locationStr = hasLocation && compParts.length > 1 ? compParts[1].toLowerCase().trim() : "";
    const cleanCompany = hasLocation ? compParts[0].trim() : job.company_name;
    
    if (indiaOnly && !hasLocation) return false;
    if (job.url?.toLowerCase().includes("adzuna")) return false;
    
    if (indiaOnly && hasLocation) {
      const isIndia = indianKeywords.some(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return regex.test(locationStr);
      });
      if (!isIndia) return false;
    }
    
    const matchesSearch = 
      (job.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (cleanCompany?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (job.role_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
      
    const matchesRole = selectedRole === "All" || job.role_name === selectedRole;
    const matchesLocation = userLocation === "" || locationStr.includes(userLocation.toLowerCase().trim());
    
    return matchesSearch && matchesRole && matchesLocation;
  });

  const calculateMatch = (desc: string) => {
    if (!desc || userSkills.length === 0) return 0;
    const lowerDesc = desc.toLowerCase();
    const matched = userSkills.filter(skill => lowerDesc.includes(skill));
    return Math.min(100, Math.round((matched.length / Math.min(userSkills.length, 6)) * 100));
  };

  return (
    <div className="space-y-6">
      <SmartTopBarLoader active={syncing} />

      {/* Header Banner */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 md:p-8 shadow-sm">
        <div className="max-w-3xl">
          <span className="px-2.5 py-1 bg-stone-100 text-stone-700 text-xs font-semibold uppercase tracking-wider rounded border border-stone-200 inline-block mb-3">
            Market Intelligence
          </span>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 tracking-tight mb-2">
            Live Industry Job Openings
          </h1>
          <p className="text-stone-600 text-xs md:text-sm leading-relaxed">
            Direct job opportunities aggregated to evaluate real-time competency demand and alignment with student skill profiles.
          </p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex-1 flex flex-col md:flex-row gap-3 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input 
              type="text" 
              placeholder="Search positions or companies..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 text-stone-900 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-emerald-800 focus:bg-white"
            />
          </div>
          
          <div className="relative w-full md:w-56">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input 
              type="text" 
              placeholder="City (e.g. Bengaluru)" 
              value={userLocation}
              onChange={(e) => setUserLocation(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 text-stone-900 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-emerald-800 focus:bg-white"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto shrink-0 justify-between md:justify-end">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 ${indiaOnly ? 'bg-emerald-800' : 'bg-stone-300'}`}>
              <div className={`w-3 h-3 bg-white rounded-full shadow-2xs transform transition-transform duration-200 ${indiaOnly ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <span className="text-xs font-medium text-stone-700">India Only</span>
            <input 
              type="checkbox" 
              className="sr-only" 
              checked={indiaOnly}
              onChange={(e) => setIndiaOnly(e.target.checked)}
            />
          </label>
          
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-stone-50 border border-stone-300 text-stone-800 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-800"
            >
              {roles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Job Grid */}
      {loading ? (
        <SmartListSkeleton count={6} />
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-stone-200 p-8 shadow-2xs">
          <Briefcase className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-stone-800 mb-1">No vacancies found</h3>
          <p className="text-stone-500 text-xs">Adjust your search keyword or region filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map((job) => {
            const compParts = job.company_name?.split('|') || [];
            const cleanCompany = compParts.length > 0 ? compParts[0].trim() : 'Verified Enterprise';
            const location = compParts.length > 1 ? compParts[1].trim() : 'Location Unspecified';
            const matchPercent = calculateMatch(job.description || "");
            
            const cleanDescription = (job.description || "No description specified.")
              .replace(/[*#_`]/g, '')
              .replace(/\s+/g, ' ');
            
            return (
              <div
                key={job.id}
                className="bg-white border border-stone-200 rounded-xl p-5 hover:border-emerald-700 transition-all flex flex-col justify-between shadow-2xs hover:shadow-sm"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[10px] font-bold uppercase tracking-wider border border-stone-200">
                      {job.role_name}
                    </span>
                    {matchPercent > 0 && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                        {matchPercent}% Match
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-stone-900 mb-1 line-clamp-1">
                    {job.job_title || job.role_name}
                  </h3>
                  
                  <div className="flex items-center gap-1.5 text-xs text-stone-600 mb-2 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="truncate">{cleanCompany}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="truncate">{location}</span>
                  </div>

                  <p className="text-stone-600 text-xs line-clamp-3 leading-relaxed mb-4">
                    {cleanDescription}
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-[11px] text-stone-400">
                    {new Date(job.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                  
                  {job.url && (
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
                    >
                      View Posting <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
