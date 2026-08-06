"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { motion } from "framer-motion";
import { Library, Link as LinkIcon, BookOpen, Search, ExternalLink } from "lucide-react";

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const data = await adminApi.getResources();
      setResources(data.resources || []);
    } catch (error) {
      console.error("Failed to fetch resources", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResources = resources.filter(
    (res) =>
      res.skill_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      res.role_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      res.resources_json?.some((r: any) => r.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <div className="p-8 text-slate-400">Loading resource cache...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Library className="w-8 h-8 text-indigo-400" /> Resource Cache
          </h1>
          <p className="text-slate-400">View all AI-curated learning resources, tutorials, and open-source repositories.</p>
        </div>
        
        <div className="relative">
          <Search className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by skill, role, or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-indigo-500 w-full md:w-80"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredResources.length === 0 ? (
          <div className="col-span-full text-center p-12 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400">No resources found</h3>
            <p className="text-slate-500 mt-2">Try adjusting your search criteria.</p>
          </div>
        ) : (
          filteredResources.map((res) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={res.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 transition-colors flex flex-col"
            >
              <div className="mb-4">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-bold text-white">{res.skill_name}</h2>
                  <span className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded border border-slate-700">
                    {res.role_name}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  Cached on: {new Date(res.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="flex-1 space-y-3">
                {res.resources_json && Array.isArray(res.resources_json) ? (
                  res.resources_json.slice(0, 4).map((r: any, idx: number) => (
                    <a
                      key={idx}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors group"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-indigo-300 group-hover:text-indigo-400 truncate">
                            {r.title}
                          </h4>
                          <p className="text-xs text-slate-500 truncate mt-1 flex items-center gap-1">
                            <LinkIcon className="w-3 h-3" /> {new URL(r.url).hostname.replace('www.', '')}
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 flex-shrink-0" />
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="text-slate-500 text-sm italic">Invalid JSON format</div>
                )}
                
                {res.resources_json?.length > 4 && (
                  <div className="text-center text-xs text-slate-500 pt-2 font-medium">
                    +{res.resources_json.length - 4} more resources
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
