"use client";

import React, { useState, useEffect } from 'react';
import { MessageSquare, Users } from 'lucide-react';
import { UnifiedCommunicationsHub } from './UnifiedCommunicationsHub';
import { api } from '@/lib/api';

export default function StudentCommunicationsLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string>('Student');
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sid = localStorage.getItem('student_id');
      const sname = localStorage.getItem('student_name') || 'Student';
      setStudentId(sid);
      setStudentName(sname);

      // Check unread count or available channels
      if (sid) {
        api.get(`/api/communications/contacts/student/${sid}`)
          .then(res => {
            const contacts = res.data.contacts || [];
            const unread = contacts.reduce((acc: number, c: any) => acc + (c.unreadCount || 0), 0);
            setUnreadCount(unread);
          })
          .catch(() => {});
      }

      // Event listener for global triggers
      const handleGlobalOpen = () => setIsOpen(true);
      window.addEventListener('open-student-communications', handleGlobalOpen);
      return () => {
        window.removeEventListener('open-student-communications', handleGlobalOpen);
      };
    }
  }, []);

  if (!studentId) return null;

  return (
    <>
      {/* Floating Mini-WhatsApp Style Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-emerald-800 hover:bg-emerald-700 text-white rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 border border-emerald-600/50 group cursor-pointer"
        title="Open Communications Hub • Team Squads & Direct Chats"
      >
        <div className="relative flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-emerald-100 group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-emerald-900 animate-pulse" />
        </div>
        <span className="text-xs font-serif font-bold tracking-tight hidden sm:inline">
          Team Chat & Inquiries
        </span>
        {unreadCount > 0 && (
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-orange-500 text-white shadow-xs">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Unified Communications Hub Modal */}
      <UnifiedCommunicationsHub
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        currentUserType="student"
        currentUserId={studentId}
        currentUserName={studentName}
      />
    </>
  );
}
