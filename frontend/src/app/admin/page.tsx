"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { CheckCircle2, XCircle, Search, Mail, MapPin } from "lucide-react";

type UnifiedUser = {
  id: string;
  name: string;
  email: string;
  user_type: "Student" | "Company" | "TPO" | "Alumni";
  location: string;
  verified: boolean;
  skills: any[];
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UnifiedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await adminApi.getUsers();

      const students: UnifiedUser[] = (data.users || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        user_type: "Student",
        location: s.state || "",
        verified: !!s.is_verified,
        skills: s.student_skills || [],
      }));

      const companies: UnifiedUser[] = (data.recruiters || []).map((r: any) => ({
        id: r.id,
        name: r.name || r.companies?.name || "Unknown Company",
        email: r.email,
        user_type: "Company",
        location: r.companies?.name || "",
        verified: !!r.companies?.is_verified,
        skills: [],
      }));

      const tpo: UnifiedUser[] = (data.tpo_officials || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        user_type: "TPO",
        location: t.colleges?.name || "",
        verified: !!t.is_verified,
        skills: [],
      }));

      const alumni: UnifiedUser[] = (data.alumni || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        user_type: "Alumni",
        location: a.colleges?.name || "",
        verified: !!a.is_verified,
        skills: [],
      }));

      setUsers([...students, ...companies, ...tpo, ...alumni]);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "All" || u.user_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const typeBadgeColor = (type: string) => {
    switch (type) {
      case "Student":
        return "bg-stone-100 text-stone-800 border-stone-200";
      case "Company":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "TPO":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "Alumni":
        return "bg-stone-200 text-stone-800 border-stone-300";
      default:
        return "bg-stone-100 text-stone-600 border-stone-200";
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900 mb-1 tracking-tight">User Directory & Permissions</h1>
        <p className="text-stone-500 text-xs">Audit and monitor all registered students, corporate recruiters, placement officers, and alumni.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white border border-stone-200 p-5 rounded-xl shadow-xs">
          <div className="text-stone-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Registered Entities</div>
          <div className="text-2xl font-bold text-stone-900">{users.length}</div>
        </div>
        <div className="bg-white border border-stone-200 p-5 rounded-xl shadow-xs">
          <div className="text-stone-500 text-xs font-semibold uppercase tracking-wider mb-1">Verified Users</div>
          <div className="text-2xl font-bold text-emerald-800">
            {users.filter((u) => u.verified).length}
          </div>
        </div>
        <div className="bg-white border border-stone-200 p-5 rounded-xl shadow-xs">
          <div className="text-stone-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Skills Verified</div>
          <div className="text-2xl font-bold text-stone-800">
            {users.reduce((acc, user) => acc + (user.skills?.length || 0), 0)}
          </div>
        </div>
      </div>

      {/* Search + Type Filter */}
      <div className="mb-6 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search records by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-stone-300 rounded-lg pl-10 pr-4 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-700 shadow-xs"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-white border border-stone-300 rounded-lg px-4 py-2.5 text-xs text-stone-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-700 shadow-xs"
        >
          <option value="All">All User Types</option>
          <option value="Student">Students</option>
          <option value="Company">Companies</option>
          <option value="TPO">TPOs</option>
          <option value="Alumni">Alumni</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Type</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Location / Org</th>
                <th className="p-4">Status</th>
                <th className="p-4">Verified Skills</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-400">Loading user directory...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-400">No matching user records located.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={`${user.user_type}-${user.id}`} className="hover:bg-stone-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-stone-900">{user.name}</div>
                      <div className="text-[10px] text-stone-400">ID: {user.id?.slice(0, 8)}...</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex py-1 px-2.5 rounded-full text-[10px] font-semibold border ${typeBadgeColor(user.user_type)}`}>
                        {user.user_type}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-stone-700">
                        <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        {user.email}
                      </div>
                    </td>
                    <td className="p-4">
                      {user.location && (
                        <div className="flex items-center gap-1.5 text-stone-600">
                          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" /> {user.location}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {user.verified ? (
                        <span className="inline-flex items-center gap-1 py-0.5 px-2.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 py-0.5 px-2.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-500 border border-stone-200">
                          <XCircle className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {user.skills?.map((skill: any, i: number) => (
                          <span key={i} className="inline-flex px-1.5 py-0.5 bg-stone-100 text-stone-700 text-[10px] font-medium rounded border border-stone-200">
                            {skill.skill_name} (L{skill.verification_level})
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}