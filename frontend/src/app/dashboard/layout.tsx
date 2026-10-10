import Sidebar from '@/components/layout/Sidebar';
import { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 overflow-x-hidden">
      <Sidebar />
      <div className="md:pl-64 flex flex-col min-h-screen w-full">
        <main className="flex-1 min-w-0 w-full pb-20 md:pb-12">
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
