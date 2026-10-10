"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { roadmapsApi } from "@/lib/roadmapsApi";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { Briefcase, TrendingUp, Download, FileText, Activity, Database, Server, Cpu, CheckCircle, Globe, LayoutDashboard, Play, X } from "lucide-react";

export default function AdminMarketPage() {
  const [activeTab, setActiveTab] = useState<"monitor" | "analytics">("analytics");
  const [marketData, setMarketData] = useState<any>({ roadmaps: [], raw_jds: [], demand_scores: [] });
  const [marketStats, setMarketStats] = useState<any>(null);
  const [apiLogs, setApiLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string>("all");
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [pipelineErrors, setPipelineErrors] = useState<any[]>([]);
  const [selectedJd, setSelectedJd] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 100;

  useEffect(() => {
    fetchDashboardData();
    let interval: any;
    if (activeTab === "monitor") {
      fetchApiLogs();
      interval = setInterval(() => {
        fetchApiLogs();
      }, 8000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab]);

  useEffect(() => {
    if (apiLogs.length > 0) {
      const latestLog = apiLogs[0];
      const logTime = new Date(latestLog.created_at).getTime();
      const now = new Date().getTime();
      if (now - logTime < 30000) {
        setActiveProvider(latestLog.provider);
      } else {
        setActiveProvider(null);
      }
    }
  }, [apiLogs]);

  useEffect(() => {
    const roadmaps = marketData.roadmaps || [];
    const selectedRoadmap = selectedRoadmapId === "all" ? null : roadmaps.find((r: any) => r.id === selectedRoadmapId);
    const selectedRole = selectedRoadmap ? selectedRoadmap.role_name : undefined;
    fetchMarketStats(selectedRole);
  }, [selectedRoadmapId, marketData.roadmaps]);

  const fetchMarketStats = async (role?: string) => {
    try {
      const statsData = await roadmapsApi.getMarketStatsAdmin(role);
      setMarketStats(statsData);
    } catch(e) {
      console.error(e);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getMarketData();
      const rawJdsData = await roadmapsApi.getRawJdsAdmin();
      data.raw_jds = rawJdsData; 
      
      setMarketData(data);
      await fetchApiLogs();
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApiLogs = async () => {
    try {
      const logs = await adminApi.getApiUsage();
      setApiLogs(logs.logs || []);
      const errs = await adminApi.getPipelineErrors();
      setPipelineErrors(errs.errors || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadCsv = () => {
    const rawJds = marketData.raw_jds || [];
    if (rawJds.length === 0) return;
    const headers = ["Role", "Company", "Source URL", "JD Snippet", "Date Extracted"];
    const rows = rawJds.map((jd: any) => {
      return [
        `"${(jd.role_name || '').replace(/"/g, '""')}"`,
        `"${(jd.company_name || '').replace(/"/g, '""')}"`,
        `"${(jd.url || '').replace(/"/g, '""')}"`,
        `"${(jd.description || '').slice(0, 150).replace(/"/g, '""')}..."`,
        `"${jd.created_at || ''}"`
      ].join(",");
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `skillgraph_extracted_jds_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const roadmaps = marketData.roadmaps || [];
  const rawJds = marketData.raw_jds || [];

  const filteredRawJds = rawJds.filter((jd: any) => {
    if (selectedRoadmapId === "all") return true;
    const roadmap = roadmaps.find((r: any) => r.id === selectedRoadmapId);
    if (!roadmap) return true;
    return jd.role_name?.toLowerCase() === roadmap.role_name?.toLowerCase();
  });

  const totalPages = Math.ceil(filteredRawJds.length / rowsPerPage);
  const currentJds = filteredRawJds.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const skillCount: { [key: string]: number } = {};
  filteredRawJds.forEach((jd: any) => {
    if (jd.extracted_skills && Array.isArray(jd.extracted_skills)) {
      jd.extracted_skills.forEach((skill: string) => {
        const norm = skill.trim();
        skillCount[norm] = (skillCount[norm] || 0) + 1;
      });
    }
  });

  const aggregatedSkills = Object.entries(skillCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill, count]) => ({
      skill_name: skill,
      demand_percentage: Math.round((count / Math.max(1, filteredRawJds.length)) * 100),
      count: count
    }));

  const rolesCount: { [key: string]: number } = {};
  rawJds.forEach((jd: any) => {
    if (jd.role_name) {
      rolesCount[jd.role_name] = (rolesCount[jd.role_name] || 0) + 1;
    }
  });
  const rolesPieData = Object.entries(rolesCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  const companiesPieData = Object.entries(marketStats?.companies || {})
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  const urlsPieData = Object.entries(marketStats?.urls || {})
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => {
      let host = name;
      try { host = new URL(name).hostname.replace('www.', ''); } catch(e){}
      return { name: host, value };
    });

  const HARMONIOUS_COLORS = ['#166534', '#15803d', '#b45309', '#d97706', '#44403c', '#78716c', '#047857', '#a16207', '#292524'];

  const handleStartPipeline = async () => {
    const roleName = prompt("Enter the Role Name to run the intelligence pipeline for (e.g. 'Cloud Engineer'):");
    if (!roleName) return;
    
    try {
      await adminApi.runPipeline(roleName);
      alert(`Pipeline started for ${roleName}. The live monitor will automatically track it.`);
    } catch (e: any) {
      alert("Failed to start pipeline: " + e.message);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-stone-50 font-sans">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-stone-500 text-xs font-medium">Loading Market Intelligence Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-stone-50 min-h-screen font-sans text-stone-900 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 gap-6 border-b border-stone-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 mb-1 tracking-tight flex items-center gap-2.5">
            <Globe className="w-6 h-6 text-emerald-800" /> Market Intelligence & Curriculum Analytics
          </h1>
          <p className="text-stone-500 text-xs">Verify live market job descriptions, extraction pipelines, and demand scores.</p>
          <div className="mt-4">
            <button 
              onClick={handleStartPipeline}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg text-xs font-semibold border border-emerald-200 transition-colors flex items-center gap-2 shadow-xs"
            >
              <Play className="w-3.5 h-3.5" /> Trigger Ingestion Pipeline
            </button>
          </div>
        </div>
        
        <div className="flex bg-stone-100 p-1 rounded-lg border border-stone-200">
          <button 
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-colors ${activeTab === 'analytics' ? 'bg-emerald-800 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> Market Intelligence
          </button>
          <button 
            onClick={() => setActiveTab("monitor")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-colors ${activeTab === 'monitor' ? 'bg-emerald-800 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
          >
            <Activity className="w-3.5 h-3.5" /> Live Engine Monitor
          </button>
        </div>
      </div>

      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Context Switcher */}
          <div className="flex justify-end">
            <div className="bg-white border border-stone-200 p-2.5 rounded-xl flex items-center gap-3 shadow-xs">
              <label className="text-xs font-semibold text-stone-600 pl-1">Target Curriculum:</label>
              <select 
                value={selectedRoadmapId}
                onChange={(e) => setSelectedRoadmapId(e.target.value)}
                className="bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-emerald-700 cursor-pointer font-medium"
              >
                <option value="all">Global Repository (All Collected JDs)</option>
                {roadmaps.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.role_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { label: "Total JDs Analyzed", value: marketStats?.total_count || 0, icon: FileText },
              { label: "Target Companies", value: marketStats?.companies ? Object.keys(marketStats.companies).length : 0, icon: Briefcase },
              { label: "Skills Evaluated", value: Object.keys(skillCount).length, icon: TrendingUp },
            ].map((kpi, i) => (
              <div key={i} className="bg-white border border-stone-200 p-5 rounded-xl flex items-center gap-4 shadow-xs">
                <div className="p-3 bg-stone-100 rounded-lg text-emerald-800 border border-stone-200">
                  <kpi.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-stone-500 text-xs font-medium uppercase tracking-wider">{kpi.label}</p>
                  <h3 className="text-2xl font-bold text-stone-900 mt-0.5">{kpi.value}</h3>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar Chart */}
            <div className="lg:col-span-3 bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-emerald-800" />
                <h2 className="text-sm font-bold text-stone-900">Top 10 High-Demand Skills (Industry Scored)</h2>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aggregatedSkills} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} stroke="#78716C" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="skill_name" type="category" stroke="#44403C" width={140} tick={{ fontSize: 11, fontWeight: 600 }} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(22, 101, 52, 0.05)' }} 
                      contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E7E5E4', color: '#1C1917', borderRadius: '8px', fontSize: '12px' }} 
                    />
                    <Bar dataKey="demand_percentage" fill="#166534" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Roles Distribution Pie Chart */}
            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-bold text-stone-900 mb-1">Role Distribution</h2>
                <p className="text-xs text-stone-500 mb-4">Database representation</p>
              </div>
              <div className="h-56 flex justify-center items-center">
                {rolesPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={rolesPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={6} dataKey="value" stroke="#FFFFFF">
                        {rolesPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={HARMONIOUS_COLORS[index % HARMONIOUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E7E5E4', borderRadius: '8px', fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-stone-400 text-xs">No roles cataloged.</div>
                )}
              </div>
            </div>

            {/* Companies Hired Pie Chart */}
            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-bold text-stone-900 mb-1">Active Hiring Employers</h2>
                <p className="text-xs text-stone-500 mb-4">Demand volume by organization</p>
              </div>
              <div className="h-56 flex justify-center items-center">
                {companiesPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={companiesPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={6} dataKey="value" stroke="#FFFFFF">
                        {companiesPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={HARMONIOUS_COLORS[index % HARMONIOUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E7E5E4', borderRadius: '8px', fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-stone-400 text-xs">No companies indexed.</div>
                )}
              </div>
            </div>

            {/* Source Diversity (URLs) */}
            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-bold text-stone-900 mb-1">Index Sources</h2>
                <p className="text-xs text-stone-500 mb-4">Ingestion provider coverage</p>
              </div>
              <div className="h-56 flex justify-center items-center">
                {urlsPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={urlsPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={6} dataKey="value" stroke="#FFFFFF">
                        {urlsPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={HARMONIOUS_COLORS[index % HARMONIOUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E7E5E4', borderRadius: '8px', fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-stone-400 text-xs">No source domains.</div>
                )}
              </div>
            </div>
          </div>

          {/* Raw Data Table */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-800" /> Ingested Job Descriptions Registry
                </h2>
                <p className="text-stone-500 text-xs mt-0.5">Ground-truth records ingested from market scrapers.</p>
              </div>
              <button 
                onClick={handleDownloadCsv}
                disabled={filteredRawJds.length === 0}
                className="bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" /> Export Records CSV
              </button>
            </div>
            
            <div className="overflow-x-auto rounded-lg border border-stone-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 uppercase text-[11px] font-semibold text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="px-4 py-3">Company & URL</th>
                    <th className="px-4 py-3">Target Role</th>
                    <th className="px-4 py-3">Audit Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {currentJds.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-stone-400">No JD records located.</td></tr>
                  ) : (
                    currentJds.map((jd: any) => (
                      <tr key={jd.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-stone-900">{jd.company_name}</div>
                          {jd.url && (
                            <a href={jd.url.startsWith('http') ? jd.url : `https://${jd.url}`} target="_blank" rel="noreferrer" className="inline-block mt-0.5 text-[11px] text-stone-500 hover:text-emerald-800 truncate max-w-xs">
                              {jd.url}
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-stone-800">{jd.role_name}</div>
                        </td>
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => setSelectedJd(jd)} 
                            className="text-stone-800 font-semibold hover:text-emerald-800 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-md border border-stone-200 transition-colors text-[11px] flex items-center gap-1.5"
                          >
                            <FileText className="w-3 h-3" /> View Extracted Dossier
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="p-3 bg-stone-50 border-t border-stone-200 flex justify-between items-center text-xs">
                  <span className="text-stone-500">Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredRawJds.length)} of {filteredRawJds.length} rows</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 bg-white border border-stone-200 text-stone-700 rounded-md disabled:opacity-50 hover:bg-stone-100 text-xs font-semibold"
                    >
                      Previous
                    </button>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 bg-white border border-stone-200 text-stone-700 rounded-md disabled:opacity-50 hover:bg-stone-100 text-xs font-semibold"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "monitor" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Architecture Diagram */}
          <div className="lg:col-span-1 bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2 mb-6">
              <Server className="w-4 h-4 text-emerald-800" /> Pipeline Architecture
            </h2>
            <div className="flex flex-col gap-3 relative">
              {[
                { id: "Adzuna", title: "Adzuna Extractor", desc: "Fetches live market JDs", icon: Globe },
                { id: "JobSpy", title: "JobSpy Scraper", desc: "Targeted enterprise listings", icon: Briefcase },
                { id: "ESCO", title: "ESCO Normalizer", desc: "Standardizes extracted competencies", icon: Cpu },
                { id: "Groq", title: "Assessment Scorer", desc: "Applies statistical trend weights", icon: Activity },
              ].map((node, i) => {
                const isActive = activeProvider === node.id;
                return (
                  <div key={i} className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition-colors ${isActive ? 'bg-emerald-50 border-emerald-300' : 'bg-stone-50 border-stone-200'}`}>
                    <div className="p-2.5 rounded-lg bg-white border border-stone-200 text-stone-800">
                      <node.icon className="w-4 h-4 text-emerald-800" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-stone-900">{node.title}</h3>
                        {isActive && <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">Active</span>}
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">{node.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* API Logs Feed */}
          <div className="lg:col-span-2 bg-white border border-stone-200 rounded-xl p-6 shadow-xs flex flex-col h-[600px]">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-stone-200">
              <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-800" /> Live Ingestion Activity
              </h2>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-pulse"></span>
                Monitoring
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {apiLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-stone-400 text-xs">
                  <Cpu className="w-8 h-8 mb-2 opacity-30" />
                  <p>Awaiting pipeline execution events...</p>
                </div>
              ) : (
                apiLogs.map((log, i) => (
                  <div 
                    key={log.id || i} 
                    className="bg-stone-50 p-3 rounded-lg border border-stone-200 flex items-start gap-3 text-xs"
                  >
                    <div className="mt-0.5">
                      {log.status_code === 200 ? (
                        <CheckCircle className="w-4 h-4 text-emerald-700" />
                      ) : (
                        <Activity className="w-4 h-4 text-amber-700" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-semibold text-stone-900">{log.provider} Engine</h4>
                        <span className="text-[10px] font-mono text-stone-400">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-600 mt-0.5 font-mono truncate">
                        REQ: {log.endpoint}
                      </div>
                      <div className="flex gap-2 mt-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${log.status_code === 200 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                          HTTP {log.status_code}
                        </span>
                        <span className="text-[10px] text-stone-500 font-mono">
                          {log.duration_ms}ms
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Error Diagnostics Feed */}
          <div className="lg:col-span-3 bg-white border border-stone-200 rounded-xl p-6 shadow-xs mt-2">
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-rose-700" /> Ingestion Diagnostic Logs
            </h2>
            
            <div className="max-h-56 overflow-y-auto space-y-2 text-xs">
              {pipelineErrors.length === 0 ? (
                <div className="text-stone-400 flex flex-col items-center justify-center py-6">
                  <CheckCircle className="w-6 h-6 text-emerald-700 mb-1" />
                  <p>All pipeline extraction services operational without runtime exceptions.</p>
                </div>
              ) : (
                pipelineErrors.map((err, i) => (
                  <div key={i} className="bg-rose-50/50 p-3 rounded-lg border border-rose-200 flex flex-col gap-1">
                    <div className="flex justify-between">
                      <span className="font-semibold text-rose-900 text-xs">{err.provider} <span className="text-stone-500 font-mono text-[10px] ml-1">{err.endpoint}</span></span>
                      <span className="text-stone-400 text-[10px] font-mono">{new Date(err.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="font-mono text-[11px] text-rose-800 whitespace-pre-wrap">{err.error}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* JD View Modal */}
      {selectedJd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-stone-200 flex justify-between items-center bg-stone-50">
              <div>
                <h3 className="text-base font-bold text-stone-900">{selectedJd.company_name}</h3>
                <p className="text-stone-500 font-medium text-xs">{selectedJd.role_name}</p>
              </div>
              <button 
                onClick={() => setSelectedJd(null)} 
                className="w-7 h-7 rounded-lg bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 bg-white text-xs text-stone-700 whitespace-pre-wrap leading-relaxed">
              {selectedJd.description || "No full text captured."}
              
              {selectedJd.extracted_skills && Array.isArray(selectedJd.extracted_skills) && selectedJd.extracted_skills.length > 0 && (
                <div className="mt-6 pt-4 border-t border-stone-200">
                  <h4 className="text-stone-900 text-xs font-bold mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-800" /> Extracted Skill Requirements
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedJd.extracted_skills.map((s: string, i: number) => (
                      <span key={i} className="bg-stone-100 border border-stone-200 text-stone-800 px-2 py-0.5 rounded-md text-[11px] font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
