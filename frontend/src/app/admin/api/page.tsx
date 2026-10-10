"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";
import { Activity, DollarSign, Database, Cpu, Key, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw } from "lucide-react";

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
    return <div className="p-8 text-stone-400 text-xs">Loading API analytics...</div>;
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
    <div className="p-8 max-w-7xl mx-auto font-sans text-stone-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 mb-1 tracking-tight">API Infrastructure & Quota Control</h1>
          <p className="text-stone-500 text-xs">Audit inference usage, scraper key pools, and cost utilization.</p>
        </div>
        
        {/* Tab Controls */}
        <div className="flex bg-stone-100 border border-stone-200 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("apify")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "apify" 
                ? "bg-emerald-800 text-white shadow-xs" 
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Apify Key Registry ({apifyKeys.length})
          </button>
          <button
            onClick={() => setActiveTab("standard")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "standard" 
                ? "bg-emerald-800 text-white shadow-xs" 
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Inference & Search Costs
          </button>
        </div>
      </div>

      {activeTab === "apify" ? (
        <div>
          {/* Apify Pooled KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
            <div className="bg-white border border-stone-200 p-5 rounded-xl flex items-center gap-4 shadow-xs">
              <div className="p-3 bg-stone-100 rounded-lg text-emerald-800 border border-stone-200">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <p className="text-stone-500 text-xs font-medium uppercase tracking-wider">Active Pool</p>
                <h3 className="text-xl font-bold text-stone-900">{activeKeysCount} <span className="text-xs text-stone-500 font-normal">/ {apifyKeys.length} Keys</span></h3>
              </div>
            </div>

            <div className="bg-white border border-stone-200 p-5 rounded-xl flex items-center gap-4 shadow-xs">
              <div className="p-3 bg-stone-100 rounded-lg text-emerald-800 border border-stone-200">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-stone-500 text-xs font-medium uppercase tracking-wider">Total Pool Limit</p>
                <h3 className="text-xl font-bold text-stone-900">${totalApifyLimit.toFixed(2)}</h3>
              </div>
            </div>

            <div className="bg-white border border-stone-200 p-5 rounded-xl flex items-center gap-4 shadow-xs">
              <div className="p-3 bg-stone-100 rounded-lg text-stone-800 border border-stone-200">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-stone-500 text-xs font-medium uppercase tracking-wider">Total Consumed</p>
                <h3 className="text-xl font-bold text-stone-900">${totalApifyConsumed.toFixed(4)}</h3>
              </div>
            </div>

            <div className="bg-white border border-stone-200 p-5 rounded-xl flex items-center gap-4 shadow-xs">
              <div className="p-3 bg-stone-100 rounded-lg text-emerald-800 border border-stone-200">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-stone-500 text-xs font-medium uppercase tracking-wider">Remaining Credits</p>
                <h3 className="text-xl font-bold text-emerald-800">${totalApifyRemaining.toFixed(4)}</h3>
              </div>
            </div>
          </div>

          {/* Visual Pooled Usage Gauge */}
          <div className="bg-white border border-stone-200 p-5 rounded-xl mb-8 shadow-xs">
            <div className="flex justify-between items-center mb-2">
              <span className="text-stone-900 font-bold text-xs uppercase tracking-wider">Pool Quota Allocation</span>
              <span className="text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs">
                {apifyPercentage.toFixed(2)}% Utilized
              </span>
            </div>
            <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden relative">
              <div 
                style={{ width: `${Math.min(apifyPercentage, 100)}%` }}
                className="h-full bg-emerald-800 rounded-full transition-all duration-500"
              />
            </div>
            <div className="flex justify-between text-[11px] text-stone-500 mt-2 font-medium">
              <span>$0.00 Expended</span>
              <span>Total Cap: ${totalApifyLimit.toFixed(2)} USD</span>
            </div>
          </div>

          {/* Apify Key Details Table */}
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-stone-200 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-stone-900">Rotated Ingestion Credentials</h2>
                <p className="text-xs text-stone-500 mt-0.5">Multi-account scraper proxies configured in environment</p>
              </div>
              <button 
                onClick={fetchApifyUsage}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-md transition-colors flex items-center gap-1.5 text-xs font-semibold border border-stone-200 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingApify ? "animate-spin" : ""}`} /> Refresh Status
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3 text-left">Masked Token</th>
                    <th className="px-5 py-3 text-left">Account Identity</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-left">Usage USD</th>
                    <th className="px-5 py-3 text-left">Quota Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {apifyKeys.map((key, i) => (
                    <tr key={i} className="hover:bg-stone-50/80 transition-colors">
                      <td className="px-5 py-3 font-mono text-stone-800 font-medium">
                        {key.key}
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-semibold text-stone-900">{key.username}</div>
                        <div className="text-[11px] text-stone-500">{key.email}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 w-fit ${
                          key.status === 'Online' 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : 'bg-stone-100 text-stone-600 border-stone-200'
                        }`}>
                          {key.status === 'Online' && <CheckCircle2 className="w-3 h-3" />}
                          {key.status !== 'Online' && <AlertTriangle className="w-3 h-3" />}
                          {key.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-stone-800">
                        ${key.consumed_usd.toFixed(4)} <span className="text-stone-400">/ ${key.limit_usd.toFixed(2)}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="flex-1 bg-stone-200 h-1.5 rounded-full overflow-hidden">
                            <div 
                              style={{ width: `${Math.min(key.percent_used, 100)}%` }} 
                              className="bg-emerald-800 h-full rounded-full"
                            />
                          </div>
                          <span className="font-bold text-stone-600 text-[10px]">{key.percent_used}%</span>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <div className="bg-white border border-stone-200 p-5 rounded-xl flex items-center gap-4 shadow-xs">
              <div className="p-3 bg-stone-100 rounded-lg text-emerald-800 border border-stone-200">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-stone-500 text-xs font-medium uppercase tracking-wider">Total Incurred Cost</p>
                <h3 className="text-2xl font-bold text-stone-900">${totalCost.toFixed(4)}</h3>
              </div>
            </div>

            <div className="bg-white border border-stone-200 p-5 rounded-xl flex items-center gap-4 shadow-xs">
              <div className="p-3 bg-stone-100 rounded-lg text-stone-800 border border-stone-200">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <p className="text-stone-500 text-xs font-medium uppercase tracking-wider">Groq Tokens Ingested</p>
                <h3 className="text-2xl font-bold text-stone-900">{groqTokens.toLocaleString()}</h3>
              </div>
            </div>

            <div className="bg-white border border-stone-200 p-5 rounded-xl flex items-center gap-4 shadow-xs">
              <div className="p-3 bg-stone-100 rounded-lg text-emerald-800 border border-stone-200">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <p className="text-stone-500 text-xs font-medium uppercase tracking-wider">Tavily Search Queries</p>
                <h3 className="text-2xl font-bold text-stone-900">{tavilyCalls.toLocaleString()}</h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Cost Chart */}
            <div className="bg-white border border-stone-200 p-5 rounded-xl shadow-xs">
              <h2 className="text-sm font-bold text-stone-900 mb-4">Daily Cost Metric ($)</h2>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={costChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                    <XAxis dataKey="date" stroke="#78716C" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#78716C" tick={{ fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E7E5E4', borderRadius: '8px', fontSize: '11px' }}
                    />
                    <Bar dataKey="cost" fill="#166534" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tokens Chart */}
            <div className="bg-white border border-stone-200 p-5 rounded-xl shadow-xs">
              <h2 className="text-sm font-bold text-stone-900 mb-4">Inference Token Timeline</h2>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tokenChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                    <XAxis dataKey="date" stroke="#78716C" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#78716C" tick={{ fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E7E5E4', borderRadius: '8px', fontSize: '11px' }}
                    />
                    <Line type="monotone" dataKey="tokens" stroke="#15803d" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Raw Logs */}
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-stone-200">
              <h2 className="text-sm font-bold text-stone-900">Recent API Execution Calls</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3 text-left">Timestamp</th>
                    <th className="px-5 py-3 text-left">Provider</th>
                    <th className="px-5 py-3 text-left">Endpoint</th>
                    <th className="px-5 py-3 text-left">Units Ingested</th>
                    <th className="px-5 py-3 text-left">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="px-5 py-3 text-stone-600">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-800 border border-stone-200">
                          {log.provider}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-[11px] text-stone-700">
                        {log.endpoint}
                      </td>
                      <td className="px-5 py-3 font-mono text-stone-600">
                        {log.tokens_used?.toLocaleString() || '-'}
                      </td>
                      <td className="px-5 py-3 font-mono font-semibold text-emerald-800">
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
