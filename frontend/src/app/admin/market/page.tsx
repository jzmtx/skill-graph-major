"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { roadmapsApi } from "@/lib/roadmapsApi";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { Briefcase, TrendingUp, PieChart as PieIcon, Download, FileText } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminMarketPage() {
  const [marketData, setMarketData] = useState<any[]>([]);
  const [roadmaps, setRoadmaps] = useState<any[]>([]);
  const [rawJds, setRawJds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string>("all");

  useEffect(() => {
    fetchMarketData();
  }, []);

  const fetchMarketData = async () => {
    try {
      const data = await adminApi.getMarketData();
      const rawJdsData = await roadmapsApi.getRawJdsAdmin();
      
      setMarketData(data.market_data || []);
      setRoadmaps(data.roadmaps || []);
      setRawJds(rawJdsData || []);
    } catch (error) {
      console.error("Failed to fetch market data", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-400">Loading market analytics...</div>;
  }

  const handleDownloadCsv = () => {
    if (rawJds.length === 0) return;
    
    // Create CSV header
    const headers = ["Role", "Ecosystem", "Company", "Source URL", "JD Snippet", "Extracted Skills", "Date Extracted"];
    
    // Create CSV rows
    const rows = rawJds.map(jd => {
      return [
        `"${(jd.role_name || '').replace(/"/g, '""')}"`,
        `"${(jd.ecosystem || '').replace(/"/g, '""')}"`,
        `"${(jd.company_name || '').replace(/"/g, '""')}"`,
        `"${(jd.source_url || '').replace(/"/g, '""')}"`,
        `"${(jd.jd_text || '').replace(/"/g, '""')}"`,
        `"${(jd.extracted_skills || []).join(', ')}"`,
        `"${new Date(jd.created_at).toLocaleDateString()}"`
      ].join(',');
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "raw_job_descriptions_dataset.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Process data for charts from dynamically generated roadmaps
  const selectedRoadmap = selectedRoadmapId === "all" ? null : roadmaps.find(r => r.id === selectedRoadmapId);
  const roadmapsToAnalyze = selectedRoadmap ? [selectedRoadmap] : roadmaps;
  const filteredRawJds = selectedRoadmap ? rawJds.filter(jd => jd.role_name === selectedRoadmap.role_name && jd.ecosystem === selectedRoadmap.ecosystem) : rawJds;

  const skillCount: Record<string, { demand_percentage: number, count: number }> = {};
  const companiesCount: Record<string, number> = {};
  const urlsCount: Record<string, number> = {};
  const mncsFound: Set<string> = new Set();
  const allCompaniesFound: Set<string> = new Set();

  roadmapsToAnalyze.forEach(r => {
    if (r.analytics_json) {
      // Top skills aggregation
      const coreSkills = r.analytics_json.core_skills || [];
      const recSkills = r.analytics_json.recommended_skills || [];
      const allSkills = [...coreSkills, ...recSkills];
      
      allSkills.forEach((s: any) => {
        if (!skillCount[s.skill]) {
          skillCount[s.skill] = { demand_percentage: 0, count: 0 };
        }
        // Score is directly given as percentage from backend
        skillCount[s.skill].demand_percentage += (s.percentage || 0);
        skillCount[s.skill].count += 1;
      });

      // Data sources/companies aggregation
      const mncs = r.analytics_json.companies_analyzed || r.analytics_json.mncs_found || [];
      mncs.forEach((mnc: string) => {
        const capitalized = mnc.charAt(0).toUpperCase() + mnc.slice(1);
        companiesCount[capitalized] = (companiesCount[capitalized] || 0) + 1;
        allCompaniesFound.add(capitalized);
      });
      
      // URLs/Domains aggregation
      const sources = r.analytics_json.sources || [];
      sources.forEach((src: string) => {
        urlsCount[src] = (urlsCount[src] || 0) + 1;
      });
      
      // Track actual MNCs found
      const actualMncs = r.analytics_json.mncs_found || [];
      actualMncs.forEach((m: string) => mncsFound.add(m.charAt(0).toUpperCase() + m.slice(1)));
    }
  });

  const aggregatedSkills = Object.keys(skillCount).map(key => ({
    skill_name: key,
    demand_percentage: Math.round(skillCount[key].demand_percentage / skillCount[key].count)
  })).sort((a, b) => b.demand_percentage - a.demand_percentage).slice(0, 10);
  
  const companiesPieData = Object.keys(companiesCount).map(key => ({
    name: key,
    value: companiesCount[key]
  }));
  
  const urlsPieData = Object.keys(urlsCount).map(key => ({
    name: key,
    value: urlsCount[key]
  }));
  
  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f43f5e', '#f59e0b', '#06b6d4'];

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Market Analytics</h1>
          <p className="text-slate-400">View real-world Job Description insights driving our roadmaps.</p>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl flex items-center gap-3">
          <label className="text-sm text-slate-400 pl-2">Filter by Roadmap:</label>
          <select 
            value={selectedRoadmapId}
            onChange={(e) => setSelectedRoadmapId(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-white text-sm rounded-lg p-2 outline-none focus:border-indigo-500"
          >
            <option value="all">All Roadmaps (Aggregated)</option>
            {roadmaps.map(r => (
              <option key={r.id} value={r.id}>
                {r.role_name} ({r.ecosystem})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center gap-4">
          <div className="p-4 bg-indigo-500/10 rounded-xl">
            <FileText className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <p className="text-slate-400 text-sm">JDs Analysed</p>
            <h3 className="text-3xl font-bold text-white">{filteredRawJds.length}</h3>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center gap-4">
          <div className="p-4 bg-purple-500/10 rounded-xl">
            <Briefcase className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <p className="text-slate-400 text-sm">Companies Scraped</p>
            <h3 className="text-3xl font-bold text-white">{Object.keys(companiesCount).length}</h3>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center gap-4">
          <div className="p-4 bg-emerald-500/10 rounded-xl">
            <TrendingUp className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <p className="text-slate-400 text-sm">Skills Extracted</p>
            <h3 className="text-3xl font-bold text-white">{Object.keys(skillCount).length}</h3>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Aggregated ML Skill Demand */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-bold text-white">ML Skill Demand Score (Top 10)</h2>
            </div>
            {selectedRoadmapId !== "all" && roadmapsToAnalyze[0] && (
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-full">
                Specific Roadmap Mode
              </span>
            )}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aggregatedSkills} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="#64748b" />
                <YAxis dataKey="skill_name" type="category" stroke="#64748b" width={100} />
                <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }} />
                <Bar dataKey="demand_percentage" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Source URLs Pie Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Briefcase className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Top Website Sources</h2>
          </div>
          <div className="h-48 flex justify-center items-center">
            {urlsPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={urlsPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                    {urlsPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-500 text-sm">No website domains found.</div>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {urlsPieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2 text-xs text-slate-400">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                {entry.name}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Companies Pie Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Briefcase className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Top Companies Scraped</h2>
          </div>
          <div className="h-48 flex justify-center items-center">
            {companiesPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={companiesPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                    {companiesPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-500 text-sm">No companies found.</div>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {companiesPieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2 text-xs text-slate-400">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                {entry.name}
              </div>
            ))}
          </div>
          {mncsFound.size > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-semibold text-slate-300 mb-2">High-Value MNCs Identified:</h3>
              <div className="flex flex-wrap gap-2">
                {Array.from(mncsFound).map(mnc => (
                  <span key={mnc} className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-xs border border-indigo-500/30">
                    {mnc}
                  </span>
                ))}
              </div>
            </div>
          )}
          {allCompaniesFound.size > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-semibold text-slate-300 mb-2">All Companies Extracted:</h3>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                {Array.from(allCompaniesFound).sort().map(company => (
                  <span key={company} className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs border border-slate-700">
                    {company}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Generated Roadmaps Summary */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Generated Roadmaps</h2>
          <div className="space-y-4">
            {roadmaps.length === 0 ? (
              <div className="text-slate-500">No roadmaps generated yet.</div>
            ) : (
              roadmaps.map((r) => (
                <div key={r.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-white text-lg">{r.role_name}</h3>
                    <p className="text-slate-400 text-sm">Ecosystem: {r.ecosystem} | {r.roadmap_json.nodes?.length || 0} Skills</p>
                  </div>
                  <div className="text-right">
                    <div className="text-indigo-400 font-medium">{r.roadmap_json?.estimated_months || 6} Months</div>
                    <div className="text-xs text-slate-500">Est. Time to Complete</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Raw Dataset Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-hidden flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" /> Raw JD Dataset
              </h2>
              <p className="text-slate-400 text-sm">Every individual job description extracted by the AI.</p>
            </div>
            <button 
              onClick={handleDownloadCsv}
              disabled={rawJds.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download CSV
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="text-xs uppercase bg-slate-950/50 text-slate-300">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Company</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3 w-1/3">Extracted Skills</th>
                  <th className="px-4 py-3 rounded-tr-lg">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredRawJds.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No raw JD data found.</td>
                  </tr>
                ) : (
                  filteredRawJds.map((jd) => (
                    <tr key={jd.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-200">
                        {jd.company_name}
                        {jd.source_url && (
                          <a href={jd.source_url.startsWith('http') ? jd.source_url : `https://${jd.source_url}`} target="_blank" rel="noreferrer" className="block text-xs text-indigo-400 hover:underline mt-0.5 truncate max-w-[150px]">
                            {jd.source_url}
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {jd.role_name}
                        <span className="block text-xs text-slate-500">{jd.ecosystem}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(jd.extracted_skills || []).slice(0, 5).map((skill: string) => (
                            <span key={skill} className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-300 border border-slate-700">
                              {skill}
                            </span>
                          ))}
                          {(jd.extracted_skills || []).length > 5 && (
                            <span className="px-1.5 py-0.5 text-[10px] text-slate-500">+{jd.extracted_skills.length - 5} more</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {new Date(jd.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
