"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileQuestion, Lock, LogOut, BarChart as ChartIcon, Activity, Library, GitGraph, ShieldCheck } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const auth = localStorage.getItem("admin_auth");
      if (auth === "true") {
        setIsAuthenticated(true);
      }
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "admin123") {
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_auth", "true");
      }
      setIsAuthenticated(true);
    } else {
      alert("Incorrect password");
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_auth");
    }
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-50 font-sans flex items-center justify-center p-4">
        <div className="bg-white border border-stone-200 p-8 rounded-2xl w-full max-w-md shadow-sm">
          <div className="flex justify-center mb-5">
            <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center text-emerald-800">
              <Lock className="w-6 h-6" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-stone-900 text-center mb-1">Administrative Access</h1>
          <p className="text-stone-500 text-xs text-center mb-6">Enter platform security PIN to access the audit console.</p>
          
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter PIN (admin123)"
                className="w-full bg-stone-50 border border-stone-300 rounded-lg p-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-700 focus:bg-white transition-all text-xs"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-semibold py-3 rounded-lg transition-colors shadow-xs"
            >
              Authenticate Portal
            </button>
          </form>
        </div>
      </div>
    );
  }

 const navItems = [
    { name: "Users", href: "/admin", icon: Users },
    { name: "Verifications", href: "/admin/verifications", icon: ShieldCheck },
    { name: "Question Bank", href: "/admin/questions", icon: FileQuestion },
    { name: "Market Analytics", href: "/admin/market", icon: ChartIcon },
    { name: "Resource Cache", href: "/admin/resources", icon: Library },
    { name: "API Usage", href: "/admin/api", icon: Activity },
    { name: "Knowledge Graph", href: "/admin/graph", icon: GitGraph },
  ];

  return (
    <div className="h-screen bg-stone-50 font-sans flex overflow-hidden text-stone-900">
      {/* Sidebar */}
      <div className="w-64 h-screen border-r border-stone-200 bg-white flex flex-col shrink-0">
        <div className="p-5 border-b border-stone-200">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-800 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              SG
            </div>
            <div>
              <span className="text-sm font-bold text-stone-900 block leading-tight">SkillGraph</span>
              <span className="text-[10px] text-stone-500 font-medium uppercase tracking-wider">Admin Console</span>
            </div>
          </Link>
        </div>
        
        <div className="p-3 flex-1 overflow-y-auto">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs transition-colors ${
                    isActive 
                      ? "bg-emerald-800 text-white font-semibold shadow-xs" 
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-100 font-medium"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="p-3 border-t border-stone-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs text-stone-600 hover:text-rose-700 hover:bg-rose-50 transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 h-screen overflow-y-auto bg-stone-50 text-stone-900">
        {children}
      </div>
    </div>
  );
}
