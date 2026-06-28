"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Map, Trophy, Briefcase, UserCircle, LogOut } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Careers', href: '/dashboard/careers', icon: Compass },
  { name: 'My Roadmaps', href: '/dashboard/roadmap', icon: Map },
  { name: 'Verification', href: '/dashboard/verify', icon: Trophy },
  { name: 'Jobs', href: '/dashboard/jobs', icon: Briefcase },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar (Left) */}
      <aside className="hidden md:flex flex-col w-64 bg-indigo-950 text-white h-screen fixed left-0 top-0">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-white">SkillGraph</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                    : 'text-indigo-200 hover:bg-indigo-900/50 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-indigo-900 space-y-2">
          <button className="flex items-center space-x-3 px-4 py-3 w-full rounded-xl text-indigo-200 hover:bg-indigo-900/50 hover:text-white transition-all">
            <UserCircle className="w-5 h-5" />
            <span className="font-medium">Profile</span>
          </button>
          <button className="flex items-center space-x-3 px-4 py-3 w-full rounded-xl text-indigo-200 hover:bg-indigo-900/50 hover:text-red-400 transition-all">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex justify-around p-3 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'fill-indigo-50' : ''}`} />
              <span className="text-[10px] font-medium mt-1">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
