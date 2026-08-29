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
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "Company":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "TPO":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case "Alumni":
        return "bg-pink-500/10 text-pink-400 border-pink-500/20";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Users Management</h1>
        <p className="text-slate-400">View and manage all registered students, companies, TPOs, and alumni.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="text-slate-400 text-sm font-medium mb-1">Total Users</div>
          <div className="text-3xl font-bold text-white">{users.length}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="text-slate-400 text-sm font-medium mb-1">Verified Users</div>
          <div className="text-3xl font-bold text-emerald-400">
            {users.filter((u) => u.verified).length}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="text-slate-400 text-sm font-medium mb-1">Total Skills Verified</div>
          <div className="text-3xl font-bold text-indigo-400">
            {users.reduce((acc, user) => acc + (user.skills?.length || 0), 0)}
          </div>
        </div>
      </div>

      {/* Search + Type Filter */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="All">All Types</option>
          <option value="Student">Students</option>
          <option value="Company">Companies</option>
          <option value="TPO">TPOs</option>
          <option value="Alumni">Alumni</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 text-sm">
              <tr>
                <th className="p-4 font-medium">User</th>
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium">Contact</th>
                <th className="p-4 font-medium">Location / Org</th>
                <th className="p-4 font-medium">Verified Status</th>
                <th className="p-4 font-medium">Verified Skills</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">Loading users...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">No users found.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={`${user.user_type}-${user.id}`} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-white">{user.name}</div>
                      <div className="text-xs text-slate-500">ID: {user.id?.slice(0, 8)}...</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex py-1.5 px-3 rounded-full text-xs font-medium border ${typeBadgeColor(user.user_type)}`}>
                        {user.user_type}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Mail className="w-4 h-4 text-slate-500" />
                        {user.email}
                      </div>
                    </td>
                    <td className="p-4">
                      {user.location && (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <MapPin className="w-3 h-3" /> {user.location}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {user.verified ? (
                        <span className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          <XCircle className="w-3.5 h-3.5" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {user.skills?.map((skill: any, i: number) => (
                          <span key={i} className="inline-flex px-2 py-1 bg-indigo-500/10 text-indigo-400 text-xs rounded border border-indigo-500/20">
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