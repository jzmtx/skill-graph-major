"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { roadmapsApi } from "@/lib/roadmapsApi";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { Briefcase, TrendingUp, Download, FileText, Trash2, AlertCircle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminMarketPage() {
  const [marketData, setMarketData] = useState<any[]>([]);
  const [roadmaps, setRoadmaps] = useState<any[]>([]);
  const [rawJds, setRawJds] = useState<any[]>([]);
  const [marketStats, setMarketStats] = useState<any>(null);
  const [scraperLogs, setScraperLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string>("all");

  useEffect(() => {
    fetchMarketData();
  }, []);

  const fetchMarketData = async () => {
    try {
      const data = await adminApi.getMarketData();
      const rawJdsData = await roadmapsApi.getRawJdsAdmin();
      const statsData = await roadmapsApi.getMarketStatsAdmin();
      const logsData = await adminApi.getScraperDiagnostics();
      
      setMarketData(data.market_data || []);
      setRoadmaps(data.roadmaps || []);
      setRawJds(rawJdsData || []);
      setMarketStats(statsData);
      setScraperLogs(logsData.logs || []);
    } catch (error) {
      console.error("Failed to fetch market data", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-400 font-medium tracking-wide">Aggregating Market Intelligence...</p>
        </div>
      </div>
    );
  }

  const handleDownloadCsv = () => {
    if (rawJds.length === 0) return;
    const headers = ["Role", "Ecosystem", "Company", "Source URL", "JD Snippet", "Extracted Skills", "Date Extracted"];
    const rows = rawJds.map(jd => {
      return [
        `"${(jd.role_name || '').replace(/"/g, '""')}"`,
        `"${(jd.ecosystem || '').replace(/"/g, '""')}"`,
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

  const handleDeleteRoadmap = async (id: string, roleName: string) => {
    if (!window.confirm(`Permanently delete roadmap for "${roleName}"? This wipes all scraped JDs and intelligence.`)) return;
    try {
      setDeletingId(id);
      await adminApi.deleteRoadmapDeep(id);
      if (selectedRoadmapId === id) setSelectedRoadmapId("all");
      fetchMarketData();
    } catch (error) {
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm("Clear all scraper diagnostic history?")) return;
    try {
      await adminApi.clearScraperDiagnostics();
      setScraperLogs([]);
    } catch (error) {
      console.error(error);
    }
  };

  // Aggregation Math
  const selectedRoadmap = selectedRoadmapId === "all" ? null : roadmaps.find(r => r.id === selectedRoadmapId);
  const roadmapsToAnalyze = selectedRoadmap ? [selectedRoadmap] : roadmaps;
  const filteredRawJds = selectedRoadmap ? rawJds.filter(jd => jd.role_name === selectedRoadmap.role_name) : rawJds;

  const skillCount: Record<string, { demand_percentage: number, count: number }> = {};
  
  roadmapsToAnalyze.forEach(r => {
    const allSkills = [...(r.core_skills || []), ...(r.recommended_skills || [])];
    allSkills.forEach((s: any) => {
      if (!skillCount[s.skill]) skillCount[s.skill] = { demand_percentage: 0, count: 0 };
      skillCount[s.skill].demand_percentage += (s.percentage || 0);
      skillCount[s.skill].count += 1;
    });
  });

  const aggregatedSkills = Object.keys(skillCount).map(key => ({
    skill_name: key,
    demand_percentage: Math.round(skillCount[key].demand_percentage / skillCount[key].count)
  })).sort((a, b) => b.demand_percentage - a.demand_percentage).slice(0, 10);
  
  const companiesPieData = marketStats?.companies ? Object.keys(marketStats.companies).map(key => ({ name: key, value: marketStats.companies[key] })) : [];
  const urlsPieData = marketStats?.urls ? Object.keys(marketStats.urls).map(key => ({ name: key, value: marketStats.urls[key] })) : [];
  const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="p-6 lg:p-10 bg-slate-950 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mb-2 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-indigo-400" /> Market Intelligence
          </h1>
          <p className="text-slate-400">Deep-dive into the raw Job Descriptions powering the AI Roadmaps.</p>
        </div>
        
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-2.5 rounded-2xl flex items-center gap-4 shadow-xl">
          <label className="text-sm font-bold text-slate-400 pl-2">Analyse Roadmap:</label>
          <select 
            value={selectedRoadmapId}
            onChange={(e) => setSelectedRoadmapId(e.target.value)}
            className="bg-slate-950 border border-indigo-500/30 text-white font-medium text-sm rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
          >
            <option value="all">Global (All Roadmaps)</option>
            {roadmaps.map(r => (
              <option key={r.id} value={r.id}>{r.role_name} ({r.ecosystem})</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          { label: "Total JDs Scraped", value: marketStats?.total_count || 0, icon: FileText, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
          { label: "Companies Scraped", value: marketStats?.companies ? Object.keys(marketStats.companies).length : 0, icon: Briefcase, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
          { label: "Skills Ranked", value: Object.keys(skillCount).length, icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
        ].map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} 
            className={`bg-slate-900/50 backdrop-blur-sm border ${kpi.border} p-6 rounded-3xl flex items-center gap-5 hover:bg-slate-900 transition-all shadow-lg`}>
            <div className={`p-4 ${kpi.bg} rounded-2xl`}>
              <kpi.icon className={`w-8 h-8 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium">{kpi.label}</p>
              <h3 className="text-4xl font-black text-white mt-1">{kpi.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        
        {/* Bar Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} 
          className="lg:col-span-2 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp className="w-6 h-6 text-indigo-400" />
            <h2 className="text-2xl font-bold text-white tracking-tight">Top 10 High-Demand Skills</h2>
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
        </motion.div>

        {/* Company Pie Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} 
          className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-8">
            <Briefcase className="w-6 h-6 text-indigo-400" />
            <h2 className="text-2xl font-bold text-white tracking-tight">Top Companies</h2>
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
              <div className="text-slate-500 font-medium">No company data found.</div>
            )}
          </div>
        </motion.div>

        {/* Ecosystem Pie Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} 
          className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-8">
            <Briefcase className="w-6 h-6 text-emerald-400" />
            <h2 className="text-2xl font-bold text-white tracking-tight">Ecosystem Spread</h2>
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
              <div className="text-slate-500 font-medium">No domains found.</div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Raw Data Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} 
        className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 shadow-xl mb-10 overflow-hidden flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <FileText className="w-6 h-6 text-indigo-400" /> Ground-Truth JD Snippets
            </h2>
            <p className="text-slate-400 text-sm mt-1">Review the raw text exacted from the web.</p>
          </div>
          <button 
            onClick={handleDownloadCsv}
            disabled={rawJds.length === 0}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
        
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-900 font-bold text-slate-400">
              <tr>
                <th className="px-6 py-4">Company & Source</th>
                <th className="px-6 py-4">Target Role</th>
                <th className="px-6 py-4 w-1/2">LLM Extracted Snippet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 bg-slate-950/30">
              {filteredRawJds.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-500">No JD data found for this segment.</td></tr>
              ) : (
                filteredRawJds.slice(0, 50).map((jd) => (
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
                      <div className="text-xs text-slate-500 mt-1">{jd.job_title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <details className="text-xs text-slate-400 max-w-2xl cursor-pointer group">
                        <summary className="font-semibold text-indigo-400 group-hover:text-indigo-300 select-none outline-none">Expand Raw Text</summary>
                        <div className="mt-3 p-4 bg-slate-950 rounded-xl border border-slate-800 max-h-64 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed custom-scrollbar shadow-inner">
                          {jd.description || "No description logged."}
                        </div>
                      </details>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
      
    </div>
  );
}
