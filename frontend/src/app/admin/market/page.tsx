"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { roadmapsApi } from "@/lib/roadmapsApi";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { Briefcase, TrendingUp, Download, FileText, Activity, Database, Sparkles, Server, Cpu, CheckCircle, Globe, LayoutDashboard, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  // Handle selected roadmap ID changing to fetch filtered market stats
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
        `"${(jd.description || '').replace(/"/g, '""')}"`,
        `"${new Date(jd.created_at).toLocaleDateString()}"`
      ].join(',');
    });
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "scraped_job_intelligence.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Aggregation Math for Analytics Tab
  const roadmaps = marketData.roadmaps || [];
  const rawJds = marketData.raw_jds || [];
  const demandScores = marketData.demand_scores || [];
  
  const selectedRoadmap = selectedRoadmapId === "all" ? null : roadmaps.find((r: any) => r.id === selectedRoadmapId);
  const selectedRole = selectedRoadmap ? selectedRoadmap.role_name : null;

  const filteredRawJds = selectedRole ? rawJds.filter((jd: any) => jd.role_name?.toLowerCase().trim() === selectedRole?.toLowerCase().trim()) : rawJds;
  const filteredDemandScores = selectedRole ? demandScores.filter((ds: any) => ds.role_name?.toLowerCase().trim() === selectedRole?.toLowerCase().trim()) : demandScores;

  // Pagination Logic
  const totalPages = Math.ceil(filteredRawJds.length / rowsPerPage);
  const currentJds = filteredRawJds.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // Process Skills from Demand Scores
  const skillCount: Record<string, { demand_percentage: number, count: number }> = {};
  filteredDemandScores.forEach((ds: any) => {
    const title = ds.canonical_skills?.title || "Unknown";
    if (!skillCount[title]) skillCount[title] = { demand_percentage: 0, count: 0 };
    skillCount[title].demand_percentage += (ds.industry_score * 100 || 0);
    skillCount[title].count += 1;
  });

  const aggregatedSkills = Object.keys(skillCount).map(key => ({
    skill_name: key,
    demand_percentage: Math.round(skillCount[key].demand_percentage / skillCount[key].count)
  })).sort((a, b) => b.demand_percentage - a.demand_percentage).slice(0, 10);

  // Server-Side Pie Charts
  const companiesPieData = marketStats?.companies ? Object.keys(marketStats.companies).map(key => ({ name: key, value: marketStats.companies[key] })).sort((a,b) => b.value - a.value).slice(0, 20) : [];
  const urlsPieData = marketStats?.urls ? Object.keys(marketStats.urls).map(key => ({ name: key, value: marketStats.urls[key] })).sort((a,b) => b.value - a.value).slice(0, 10) : [];
  const rolesPieData = marketStats?.roles ? Object.keys(marketStats.roles).map(key => ({ name: key, value: marketStats.roles[key] })).sort((a,b) => b.value - a.value).slice(0, 10) : [];
  
  const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#8b5cf6'];

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
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-400 font-medium tracking-wide">Initializing Market Control Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 bg-slate-950 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 gap-6 border-b border-slate-800 pb-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mb-2 flex items-center gap-3">
              <Globe className="w-8 h-8 text-indigo-400" /> Market Intelligence Center
            </h1>
            <p className="text-slate-400">Deep-dive into the live AI data pipelines powering the roadmaps.</p>
          </div>
          
          <div className="flex items-center gap-3">
              <button 
                onClick={handleStartPipeline}
                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-5 py-2.5 rounded-xl font-bold border border-emerald-500/30 transition-all flex items-center gap-2"
              >
                <Play className="w-4 h-4" /> Manually Trigger Pipeline
              </button>
          </div>
        </div>
        
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button 
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'analytics' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <LayoutDashboard className="w-4 h-4" /> Extracted Intelligence
          </button>
          <button 
            onClick={() => setActiveTab("monitor")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'monitor' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <Activity className="w-4 h-4" /> Live Engine Monitor
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "analytics" && (
          <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {/* Context Switcher */}
            <div className="flex justify-end mb-6">
              <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-2.5 rounded-2xl flex items-center gap-4 shadow-xl">
                <label className="text-sm font-bold text-slate-400 pl-2">Analyse Roadmap:</label>
                <select 
                  value={selectedRoadmapId}
                  onChange={(e) => setSelectedRoadmapId(e.target.value)}
                  className="bg-slate-950 border border-indigo-500/30 text-white font-medium text-sm rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  <option value="all">Global Database (All Scraped JDs)</option>
                  {roadmaps.map((r: any) => (
                    <option key={r.id} value={r.id}>{r.role_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {[
                { label: "Total JDs Scraped", value: marketStats?.total_count || 0, icon: FileText, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
                { label: "Companies Targeted", value: marketStats?.companies ? Object.keys(marketStats.companies).length : 0, icon: Briefcase, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
                { label: "Skills Evaluated", value: Object.keys(skillCount).length, icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
              ].map((kpi, i) => (
                <div key={i} className={`bg-slate-900/50 backdrop-blur-sm border ${kpi.border} p-6 rounded-3xl flex items-center gap-5 hover:bg-slate-900 transition-all shadow-lg`}>
                  <div className={`p-4 ${kpi.bg} rounded-2xl`}>
                    <kpi.icon className={`w-8 h-8 ${kpi.color}`} />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm font-medium">{kpi.label}</p>
                    <h3 className="text-4xl font-black text-white mt-1">{kpi.value}</h3>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
              {/* Bar Chart */}
              <div className="lg:col-span-3 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-8">
                  <TrendingUp className="w-6 h-6 text-indigo-400" />
                  <h2 className="text-2xl font-bold text-white tracking-tight">Top 10 High-Demand Skills (O*NET + ESCO Scaled)</h2>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={aggregatedSkills} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} stroke="#64748b" tickFormatter={(v) => `${v}%`} />
                      <YAxis dataKey="skill_name" type="category" stroke="#e2e8f0" width={120} tick={{ fontSize: 13, fontWeight: 600 }} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }} 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '12px', padding: '12px' }} 
                        itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="demand_percentage" fill="#6366f1" radius={[0, 6, 6, 0]}>
                        {aggregatedSkills.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`url(#colorGradient)`} />
                        ))}
                      </Bar>
                      <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Roles Distribution Pie Chart */}
              <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-6 h-6 text-indigo-400" />
                    <h2 className="text-2xl font-bold text-white tracking-tight">Role Distribution</h2>
                  </div>
                  <p className="text-xs text-slate-400 mb-6">Database representation</p>
                </div>
                <div className="h-60 flex justify-center items-center">
                  {rolesPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={rolesPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none">
                          {rolesPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-slate-500 font-medium">No roles found.</div>
                  )}
                </div>
              </div>

              {/* Companies Hired Pie Chart */}
              <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Briefcase className="w-6 h-6 text-emerald-400" />
                    <h2 className="text-2xl font-bold text-white tracking-tight">Top Companies Hiring</h2>
                  </div>
                  <p className="text-xs text-slate-400 mb-6">Market demand by enterprise</p>
                </div>
                <div className="h-60 flex justify-center items-center">
                  {companiesPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={companiesPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none">
                          {companiesPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-slate-500 font-medium">No companies found.</div>
                  )}
                </div>
              </div>

              {/* Source Diversity (URLs) */}
              <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Globe className="w-6 h-6 text-cyan-400" />
                    <h2 className="text-2xl font-bold text-white tracking-tight">Source Diversity</h2>
                  </div>
                  <p className="text-xs text-slate-400 mb-6">Scraping origins</p>
                </div>
                <div className="h-60 flex justify-center items-center">
                  {urlsPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={urlsPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none">
                          {urlsPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-slate-500 font-medium">No sources found.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Raw Data Table */}
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 shadow-xl mb-10 overflow-hidden flex flex-col">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Database className="w-6 h-6 text-indigo-400" /> Database: Ground-Truth Job Descriptions
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">Direct from the Data Pipeline Extractors.</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={handleDownloadCsv}
                    disabled={filteredRawJds.length === 0}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Export CSV
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs uppercase bg-slate-900 font-bold text-slate-400">
                    <tr>
                      <th className="px-6 py-4">Company & Source</th>
                      <th className="px-6 py-4">Target Role</th>
                      <th className="px-6 py-4 w-1/2">Raw Job Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 bg-slate-950/30">
                    {currentJds.length === 0 ? (
                      <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-500">No JD data found. Trigger a roadmap generation to run the pipeline!</td></tr>
                    ) : (
                      currentJds.map((jd: any) => (
                        <tr key={jd.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-white text-base">{jd.company_name}</div>
                            {jd.url && (
                              <a href={jd.url.startsWith('http') ? jd.url : `https://${jd.url}`} target="_blank" rel="noreferrer" className="inline-block mt-1 text-xs font-medium text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20 hover:bg-indigo-500/20 truncate max-w-[200px]">
                                {jd.url}
                              </a>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-200">{jd.role_name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => setSelectedJd(jd)} 
                              className="text-indigo-400 font-bold hover:text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 transition-all text-xs flex items-center gap-2"
                            >
                              <FileText className="w-4 h-4" /> View Extracted Data
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-between items-center text-sm font-bold">
                    <span className="text-slate-400">Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredRawJds.length)} of {filteredRawJds.length} rows</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-50 hover:bg-slate-700 transition-colors"
                      >
                        Previous
                      </button>
                      <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-50 hover:bg-slate-700 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "monitor" && (
          <motion.div key="monitor" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Architecture Diagram */}
              <div className="lg:col-span-1 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 shadow-xl">
                <h2 className="text-xl font-bold text-white flex items-center gap-3 mb-8">
                  <Server className="w-5 h-5 text-indigo-400" /> Pipeline Architecture
                </h2>
                <div className="flex flex-col gap-4 relative">
                  {/* Connectors */}
                  <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-indigo-500 via-cyan-500 to-emerald-500 opacity-20"></div>
                  
                  {[
                    { id: "Adzuna", title: "Adzuna Extractor", desc: "Fetches 900+ raw market JDs", icon: Globe, baseColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30", activeColor: "border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)] bg-indigo-900/30 scale-105" },
                    { id: "JobSpy", title: "JobSpy Scraper", desc: "Targeted scraping for Platinum MNCs", icon: Briefcase, baseColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30", activeColor: "border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.4)] bg-cyan-900/30 scale-105" },
                    { id: "ESCO", title: "ESCO Normalizer", desc: "Standardizes extracted terminology", icon: Cpu, baseColor: "text-blue-400 bg-blue-500/10 border-blue-500/30", activeColor: "border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)] bg-blue-900/30 scale-105" },
                    { id: "Groq", title: "Groq LLM Scorer", desc: "Applies statistical trend analysis", icon: Activity, baseColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", activeColor: "border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] bg-emerald-900/30 scale-105" },
                  ].map((node, i) => {
                    const isActive = activeProvider === node.id;
                    return (
                    <div key={i} className={`flex items-center gap-4 z-10 p-4 rounded-2xl border transition-all duration-500 ${isActive ? node.activeColor : `bg-slate-950/80 shadow-lg ${node.baseColor.split(' ')[2]}`}`}>
                      <div className={`p-3 rounded-full relative ${node.baseColor.split(' ')[1]}`}>
                        {isActive && <div className={`absolute inset-0 rounded-full animate-ping opacity-30 ${node.baseColor.split(' ')[0].replace('text-', 'bg-')}`}></div>}
                        <node.icon className={`w-5 h-5 ${node.baseColor.split(' ')[0]} ${isActive ? 'animate-pulse' : ''}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white">{node.title}</h3>
                          {isActive && <span className="text-[9px] font-bold uppercase tracking-wider text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 animate-pulse">Running</span>}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{node.desc}</p>
                      </div>
                    </div>
                  )})}
                </div>
              </div>
              
              {/* API Logs Feed */}
              <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 shadow-xl flex flex-col h-[600px]">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <Activity className="w-5 h-5 text-emerald-400" /> Live API Execution Feed
                  </h2>
                  <span className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Monitoring
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                  {apiLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                      <Cpu className="w-12 h-12 mb-3 opacity-20" />
                      <p>Awaiting pipeline execution...</p>
                      <p className="text-xs mt-1">Generate a roadmap to start the engines.</p>
                    </div>
                  ) : (
                    apiLogs.map((log, i) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        transition={{ delay: i * 0.05 }}
                        key={log.id || i} 
                        className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 hover:border-indigo-500/30 transition-colors flex items-start gap-4"
                      >
                        <div className="mt-1">
                          {log.status_code === 200 ? (
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Activity className="w-5 h-5 text-amber-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="text-sm font-bold text-white">{log.provider} Engine</h4>
                            <span className="text-[10px] font-mono text-slate-500">
                              {new Date(log.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1 font-mono break-all">
                            <span className="text-indigo-400 font-bold">REQ:</span> {log.endpoint}
                          </div>
                          <div className="flex gap-4 mt-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${log.status_code === 200 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                              HTTP {log.status_code}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {log.duration_ms}ms response
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>

              {/* Error Diagnostics Feed */}
              <div className="lg:col-span-3 bg-red-950/10 backdrop-blur-sm border border-red-900/30 rounded-3xl p-8 shadow-xl mt-4">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <Activity className="w-5 h-5 text-red-400" /> Pipeline Error Diagnostics
                  </h2>
                </div>
                
                <div className="max-h-64 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                  {pipelineErrors.length === 0 ? (
                    <div className="text-slate-500 flex flex-col items-center justify-center py-6">
                      <CheckCircle className="w-8 h-8 text-emerald-500/50 mb-2" />
                      <p>No recent pipeline errors detected.</p>
                    </div>
                  ) : (
                    pipelineErrors.map((err, i) => (
                      <div key={i} className="bg-slate-950/80 p-4 rounded-xl border border-red-900/30 flex flex-col gap-2">
                        <div className="flex justify-between">
                          <span className="font-bold text-red-400 text-sm">{err.provider} <span className="text-slate-500 text-xs font-mono ml-2">{err.endpoint}</span></span>
                          <span className="text-slate-500 text-xs font-mono">{new Date(err.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="font-mono text-xs text-slate-300 break-all whitespace-pre-wrap">{err.error}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* JD View Modal */}
      {selectedJd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedJd.company_name}</h3>
                <p className="text-indigo-400 font-mono text-sm">{selectedJd.role_name}</p>
              </div>
              <button onClick={() => setSelectedJd(null)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-lg transition-colors font-bold text-sm">Close</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-slate-950 font-mono text-xs text-slate-300 whitespace-pre-wrap custom-scrollbar">
              {selectedJd.description || "No description extracted."}
              
              {selectedJd.extracted_skills && Array.isArray(selectedJd.extracted_skills) && selectedJd.extracted_skills.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-800">
                  <h4 className="text-white font-sans text-sm font-bold mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" /> Extracted Technical Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedJd.extracted_skills.map((s: string, i: number) => (
                      <span key={i} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded-md font-sans text-xs font-bold shadow-sm">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
