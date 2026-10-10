"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
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
    return <div className="p-8 text-stone-400 text-xs">Loading resource cache...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 mb-1 tracking-tight flex items-center gap-2.5">
            <Library className="w-6 h-6 text-emerald-800" /> Curated Learning Resource Cache
          </h1>
          <p className="text-stone-500 text-xs">Review curriculum resources, technical tutorials, and verified open-source documentation.</p>
        </div>
        
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by skill, role, or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 bg-white border border-stone-300 text-stone-900 placeholder:text-stone-400 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700 w-full md:w-80 shadow-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredResources.length === 0 ? (
          <div className="col-span-full text-center p-12 bg-white border border-stone-200 rounded-xl shadow-xs">
            <BookOpen className="w-10 h-10 text-stone-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-stone-800">No resources matched</h3>
            <p className="text-stone-500 text-xs mt-1">Try refining your search keyword.</p>
          </div>
        ) : (
          filteredResources.map((res) => (
            <div
              key={res.id}
              className="bg-white border border-stone-200 rounded-xl p-5 hover:border-stone-300 transition-colors flex flex-col shadow-xs"
            >
              <div className="mb-4">
                <div className="flex justify-between items-start mb-1.5">
                  <h2 className="text-sm font-bold text-stone-900">{res.skill_name}</h2>
                  <span className="px-2 py-0.5 bg-stone-100 text-stone-700 text-[10px] font-semibold rounded border border-stone-200">
                    {res.role_name}
                  </span>
                </div>
                <div className="text-[10px] text-stone-400 font-medium">
                  Verified: {new Date(res.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="flex-1 space-y-2.5">
                {res.resources_json && Array.isArray(res.resources_json) ? (
                  res.resources_json.slice(0, 4).map((r: any, idx: number) => (
                    <a
                      key={idx}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-2.5 bg-stone-50 border border-stone-200 rounded-lg hover:bg-stone-100 transition-colors group"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-semibold text-stone-900 group-hover:text-emerald-800 truncate">
                            {r.title}
                          </h4>
                          <p className="text-[10px] text-stone-500 truncate mt-0.5 flex items-center gap-1">
                            <LinkIcon className="w-2.5 h-2.5 text-stone-400" /> {(() => {
                              try {
                                return new URL(r.url).hostname.replace('www.', '');
                              } catch {
                                return r.url;
                              }
                            })()}
                          </p>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-800 shrink-0" />
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="text-stone-400 text-xs italic">Structured documentation not attached</div>
                )}
                
                {res.resources_json?.length > 4 && (
                  <div className="text-center text-[10px] text-stone-500 pt-1 font-semibold">
                    +{res.resources_json.length - 4} additional resources cataloged
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
