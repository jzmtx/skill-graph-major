"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";
import { Activity, DollarSign, Database, Cpu, Key, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminApiPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [apifyKeys, setApifyKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingApify, setLoadingApify] = useState(true);
  const [activeTab, setActiveTab] = useState<"standard" | "apify">("apify");

  useEffect(() => {
    fetchLogs();
    fetchApifyUsage();
  }, []);

  const fetchLogs = async () => {
    try {
      const data = await adminApi.getApiUsage();
      setLogs(data.logs || []);
    } catch (error) {
      console.error("Failed to fetch API logs", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApifyUsage = async () => {
    setLoadingApify(true);
    try {
      const data = await adminApi.getApifyUsage();
      setApifyKeys(data.keys || []);
    } catch (error) {
      console.error("Failed to fetch Apify usage", error);
    } finally {
      setLoadingApify(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-400">Loading API analytics...</div>;
  }

  // Aggregate Standard logs
  let totalCost = 0;
  let groqTokens = 0;
  let tavilyCalls = 0;

  const costDataByDate: Record<string, number> = {};
  const tokenDataByDate: Record<string, number> = {};

  logs.forEach(log => {
    totalCost += (log.cost_usd || 0);
    
    if (log.provider === "Groq") {
      groqTokens += (log.tokens_used || 0);
    } else if (log.provider === "Tavily") {
      tavilyCalls += 1;
    }

    const dateStr = new Date(log.created_at).toLocaleDateString();
    
    if (!costDataByDate[dateStr]) costDataByDate[dateStr] = 0;
    costDataByDate[dateStr] += (log.cost_usd || 0);

    if (log.provider === "Groq") {
        if (!tokenDataByDate[dateStr]) tokenDataByDate[dateStr] = 0;
        tokenDataByDate[dateStr] += (log.tokens_used || 0);
    }
  });

  const costChartData = Object.keys(costDataByDate).map(date => ({
    date,
    cost: Number(costDataByDate[date].toFixed(4))
  })).reverse();

  const tokenChartData = Object.keys(tokenDataByDate).map(date => ({
    date,
    tokens: tokenDataByDate[date]
  })).reverse();

  // Aggregate Apify statistics
  const totalApifyLimit = apifyKeys.reduce((acc, curr) => acc + (curr.limit_usd || 0), 0);
  const totalApifyConsumed = apifyKeys.reduce((acc, curr) => acc + (curr.consumed_usd || 0), 0);
  const totalApifyRemaining = totalApifyLimit - totalApifyConsumed;
  const apifyPercentage = totalApifyLimit > 0 ? (totalApifyConsumed / totalApifyLimit) * 100 : 0;
  const activeKeysCount = apifyKeys.filter(k => k.status === "Online").length;

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">API Usage & Key Control</h1>
          <p className="text-slate-400">Monitor token consumption, load-balanced keys, and API status.</p>
        </div>
        
        {/* Tab Controls */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("apify")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "apify" 
                ? "bg-indigo-600 text-white" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            Apify Key Registry ({apifyKeys.length})
          </button>
          <button
            onClick={() => setActiveTab("standard")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "standard" 
                ? "bg-indigo-600 text-white" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            LLM & Search Costs
          </button>
        </div>
      </div>

      {activeTab === "apify" ? (
        <div>
          {/* Apify Pooled KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center gap-4">
              <div className="p-4 bg-indigo-500/10 rounded-xl">
                <Key className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Active Pool Size</p>
                <h3 className="text-2xl font-bold text-white">{activeKeysCount} <span className="text-xs text-slate-500">/ {apifyKeys.length} Keys</span></h3>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center gap-4">
              <div className="p-4 bg-emerald-500/10 rounded-xl">
                <DollarSign className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Pooled Limit</p>
                <h3 className="text-2xl font-bold text-white">${totalApifyLimit.toFixed(2)}</h3>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center gap-4">
              <div className="p-4 bg-rose-500/10 rounded-xl">
                <Activity className="w-8 h-8 text-rose-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Consumed</p>
                <h3 className="text-2xl font-bold text-white">${totalApifyConsumed.toFixed(4)}</h3>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center gap-4">
              <div className="p-4 bg-amber-500/10 rounded-xl">
                <ShieldCheck className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Remaining Credits</p>
                <h3 className="text-2xl font-bold text-white">${totalApifyRemaining.toFixed(4)}</h3>
              </div>
            </motion.div>
          </div>

          {/* Visual Pooled Usage Gauge */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl mb-8">
            <div className="flex justify-between items-center mb-3">
              <span className="text-white font-bold">Total Credits Consumed</span>
              <span className="text-indigo-400 font-black bg-indigo-500/10 px-2 py-0.5 rounded text-sm">
                {apifyPercentage.toFixed(2)}% Used
              </span>
            </div>
            <div className="w-full bg-slate-800 h-4 rounded-full overflow-hidden relative">
              <div 
                style={{ width: `${Math.min(apifyPercentage, 100)}%` }}
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-600 via-indigo-400 to-rose-500 rounded-full transition-all duration-500"
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium">
              <span>$0.00 Spent</span>
              <span>Pool Capacity: ${totalApifyLimit.toFixed(2)} USD</span>
            </div>
          </div>

          {/* Apify Key Details Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Apify Rotated Credentials</h2>
                <p className="text-xs text-slate-500 mt-1">Multi-account proxy scrapers currently configured in .env</p>
              </div>
              <button 
                onClick={fetchApifyUsage}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center gap-2 text-sm font-semibold"
              >
                <RefreshCw className={`w-4 h-4 ${loadingApify ? "animate-spin" : ""}`} /> Refresh Status
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-950/50">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Masked Token</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Email / Owner</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Usage USD</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Quota Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {apifyKeys.map((key, i) => (
                    <tr key={i} className="hover:bg-slate-800/40 transition-all">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-indigo-300">
                        {key.key}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200 font-medium">
                        <div>{key.username}</div>
                        <div className="text-xs text-slate-500">{key.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit ${
                          key.status === 'Online' 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : key.status === 'Offline' 
                              ? 'bg-amber-500/10 text-amber-400' 
                              : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {key.status === 'Online' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {key.status === 'Offline' && <AlertTriangle className="w-3.5 h-3.5" />}
                          {key.status === 'Invalid/Expired' && <AlertTriangle className="w-3.5 h-3.5" />}
                          {key.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-300">
                        ${key.consumed_usd.toFixed(4)} <span className="text-slate-500">/ ${key.limit_usd.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-3 min-w-[120px]">
                          <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div 
                              style={{ width: `${Math.min(key.percent_used, 100)}%` }} 
                              className="bg-indigo-500 h-full rounded-full"
                            />
                          </div>
                          <span className="font-bold text-slate-400 text-xs">{key.percent_used}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center gap-4">
              <div className="p-4 bg-emerald-500/10 rounded-xl">
                <DollarSign className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Cost (USD)</p>
                <h3 className="text-3xl font-bold text-white">${totalCost.toFixed(4)}</h3>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center gap-4">
              <div className="p-4 bg-purple-500/10 rounded-xl">
                <Cpu className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Groq Tokens Used</p>
                <h3 className="text-3xl font-bold text-white">{groqTokens.toLocaleString()}</h3>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center gap-4">
              <div className="p-4 bg-blue-500/10 rounded-xl">
                <Database className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Tavily Searches</p>
                <h3 className="text-3xl font-bold text-white">{tavilyCalls.toLocaleString()}</h3>
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Cost Chart */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <h2 className="text-xl font-bold text-white mb-6">Daily Cost ($)</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={costChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                      itemStyle={{ color: '#10b981' }}
                    />
                    <Bar dataKey="cost" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tokens Chart */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <h2 className="text-xl font-bold text-white mb-6">Groq Tokens Usage</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tokenChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                      itemStyle={{ color: '#a855f7' }}
                    />
                    <Line type="monotone" dataKey="tokens" stroke="#a855f7" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Raw Logs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">Recent API Calls</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-950/50">
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Provider</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Endpoint</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Tokens/Results</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          log.provider === 'Groq' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {log.provider}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {log.endpoint}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-400">
                        {log.tokens_used?.toLocaleString() || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-emerald-400">
                        ${log.cost_usd?.toFixed(4) || '0.0000'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
