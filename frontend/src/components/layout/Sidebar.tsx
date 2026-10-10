"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Compass, Map, Briefcase, UserCircle, LogOut, GitBranch, Mail, ShieldCheck } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Careers', href: '/dashboard/careers', icon: Compass },
  { name: 'Roadmaps', href: '/dashboard/roadmap', icon: Map },
  { name: 'Verification', href: '/dashboard/verify', icon: ShieldCheck },
  { name: 'Job Board', href: '/dashboard/jobs', icon: Briefcase },
  { name: 'Job Offers', href: '/dashboard/job-offers', icon: Mail, badge: 'Hub' },
  { name: 'Open Source', href: '/dashboard/opensource', icon: GitBranch },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('student_id');
    localStorage.removeItem('student_github');
    localStorage.removeItem('student_name');
    localStorage.removeItem('student_email');
    localStorage.removeItem('cached_skills');
    router.push('/login');
  };

  const handleOpenProfile = () => {
    window.dispatchEvent(new CustomEvent('open-student-profile'));
  };

  return (
    <>
      {/* Desktop Sidebar (Warm Classical Academic Light Theme - No Black, No Blue) */}
      <aside className="hidden md:flex flex-col w-64 bg-stone-50 border-r border-stone-200 text-stone-800 h-screen fixed left-0 top-0 z-40 overflow-hidden">
        {/* Subtle Orange Accent Top Trim */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-700 via-orange-500 to-amber-500" />

        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-white pt-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 border border-orange-200/80 flex items-center justify-center font-serif font-bold text-white text-base shadow-2xs">
              S
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-bold tracking-tight text-stone-900 leading-tight font-serif">SkillGraph</h1>
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              </div>
              <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Student Portal</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-emerald-800 text-white shadow-2xs font-semibold' 
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && !isActive && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-orange-50 text-orange-800 border border-orange-200">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 pb-12 border-t border-stone-200 bg-white/70 space-y-1">
          <button 
            onClick={handleOpenProfile}
            className="flex items-center space-x-3 px-3.5 py-2.5 w-full rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-all text-left"
          >
            <UserCircle className="w-4 h-4 text-stone-500" />
            <span>My Profile</span>
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 px-3.5 py-2.5 w-full rounded-xl text-sm font-medium text-stone-600 hover:bg-rose-50 hover:text-rose-700 transition-all text-left"
          >
            <LogOut className="w-4 h-4 text-stone-500" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200 z-50 flex justify-around p-1.5 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.04)] overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center px-3 py-1.5 rounded-lg transition-all ${
                isActive ? 'text-emerald-800 font-bold' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
