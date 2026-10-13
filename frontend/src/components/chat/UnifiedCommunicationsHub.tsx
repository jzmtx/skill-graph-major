"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  X, Send, MessageSquare, Sparkles, Users, User, 
  Search, CheckCheck, RefreshCw, ChevronRight, MessageCircle, 
  ChevronDown, ChevronUp
} from 'lucide-react';
import { api } from '@/lib/api';

export type ConversationType = 'group' | 'direct' | 'job' | 'opensource_app' | 'opensource_squad' | 'alumni_opp' | 'peer_direct';

export interface SquadMember {
  id: string;
  name: string;
  role: string;
  branch?: string;
  company?: string;
  isMaintainer: boolean;
  isSelf?: boolean;
}

export interface UnifiedConversation {
  id: string; // unique conversation key (e.g. group_xxx or dm_xxx)
  type: ConversationType;
  title: string;
  subtitle: string;
  recipientName: string;
  recipientRole: string;
  contextTag: string;
  isGroup: boolean;
  memberCount?: number;
  lastMessage?: string;
  lastMessageTime?: string;
  lastSenderType?: string;
  unreadCount: number;
  metadata: {
    projectId?: string;
    partnerId?: string;
    partnerName?: string;
    partnerRole?: string;
    canonicalChannelId?: string;
    members?: SquadMember[];
  };
}

export interface ChatMessageItem {
  id: string | number;
  sender_type: string;
  sender_id?: string;
  sender_name: string;
  message: string;
  created_at: string;
  status?: 'sending' | 'delivered';
}

interface UnifiedCommunicationsHubProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserType: 'student' | 'alumni' | 'company';
  currentUserId?: string | null;
  currentUserName?: string;
  initialConversations?: UnifiedConversation[];
  activeConversationId?: string | null;
  onSelectConversation?: (convo: UnifiedConversation) => void;
  isEmbedded?: boolean;
}

const DEFAULT_PROMPTS = [
  { label: "Technical Review Schedule", text: "Hello! I am available this week for an initial technical conversation or project review. What time works best for your team?" },
  { label: "Milestones & PR Update", text: "I have updated my SkillGraph verified assessments and pushed recent milestone deliverables to the repository. Please take a look." },
  { label: "Tech Stack & Conventions Query", text: "Could you share more details regarding the core technology stack, code review conventions, and deployment pipelines?" },
  { label: "Sprint Planning & Contributions", text: "Ready to take up the next set of open issues for our squad sprint. Looking forward to your guidance!" },
];

export const UnifiedCommunicationsHub: React.FC<UnifiedCommunicationsHubProps> = ({
  isOpen,
  onClose,
  currentUserType,
  currentUserId,
  currentUserName = "Member",
  initialConversations = [],
  activeConversationId,
  onSelectConversation,
  isEmbedded = false
}) => {
  const [conversations, setConversations] = useState<UnifiedConversation[]>(initialConversations);
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(activeConversationId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'direct' | 'group'>('all');
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  
  // Message Thread State
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // In-memory instant cache: channelKey -> ChatMessageItem[]
  const messagesCacheRef = useRef<Record<string, ChatMessageItem[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Ref to track currently active channel to avoid cross-person message bleed
  const activeChannelRef = useRef<string>('');

  // Auto-fetch deduplicated contacts from backend
  const loadContacts = useCallback(async () => {
    const uid = currentUserId || (typeof window !== 'undefined' ? (currentUserType === 'student' ? localStorage.getItem('student_id') : (localStorage.getItem('alumni_id') || localStorage.getItem('alumni_auth_id'))) : '');
    if (!uid) return;

    try {
      const res = await api.get(`/api/communications/contacts/${currentUserType}/${uid}`);
      const fetched: UnifiedConversation[] = res.data.contacts || [];
      if (fetched.length > 0) {
        setConversations(fetched);
        // Do not force overwrite selectedConvoId if user has already selected a contact or has one active
        setSelectedConvoId(prev => {
          if (prev && fetched.some(c => c.id === prev || c.metadata?.canonicalChannelId === prev || c.metadata?.partnerId === prev.replace('dm_', ''))) {
            return prev;
          }
          return prev || fetched[0].id;
        });
      }
    } catch (err) {
      console.warn("[CommunicationsHub] loadContacts error:", err);
    }
  }, [currentUserType, currentUserId]);

  useEffect(() => {
    if (isOpen || isEmbedded) {
      loadContacts();
    }
  }, [isOpen, isEmbedded, loadContacts]);

  useEffect(() => {
    if (initialConversations && initialConversations.length > 0 && conversations.length === 0) {
      setConversations(initialConversations);
      if (!selectedConvoId) {
        setSelectedConvoId(initialConversations[0].id);
      }
    }
  }, [initialConversations, conversations.length, selectedConvoId]);

  useEffect(() => {
    if (activeConversationId) {
      setSelectedConvoId(activeConversationId);
    }
  }, [activeConversationId]);

  // Currently active conversation object
  const activeConvo = useMemo(() => {
    return conversations.find(c => c.id === selectedConvoId || c.metadata?.canonicalChannelId === selectedConvoId) || conversations[0] || null;
  }, [conversations, selectedConvoId]);

  // Read / Unread Storage Sync
  const markConvoAsRead = useCallback((convoId: string) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`read_ts_${convoId}`, new Date().toISOString());
      } catch (_) {}
    }
    setConversations(prev => prev.map(c => {
      if (c.id === convoId) {
        return { ...c, unreadCount: 0 };
      }
      return c;
    }));
  }, []);

  // Compute canonical channel key for the active conversation
  const getChannelKey = useCallback((convo: UnifiedConversation) => {
    if (convo.isGroup) {
      return convo.id.startsWith('group_') ? convo.id : `group_${convo.id}`;
    }
    if (convo.metadata?.canonicalChannelId) {
      return convo.metadata.canonicalChannelId;
    }
    const partnerId = convo.metadata?.partnerId || (convo.id.startsWith('dm_') ? convo.id.replace('dm_', '') : null);
    if (partnerId) {
      const myUid = currentUserId || (typeof window !== 'undefined' ? (currentUserType === 'student' ? localStorage.getItem('student_id') : (localStorage.getItem('alumni_id') || localStorage.getItem('alumni_auth_id'))) : '') || '';
      if (myUid) {
        const sorted = [myUid, partnerId].sort();
        return `dm_${sorted[0]}_${sorted[1]}`;
      }
    }
    return convo.id;
  }, [currentUserId, currentUserType]);

  // Fetch messages for a conversation with strict channel isolation
  const fetchMessages = useCallback(async (convo: UnifiedConversation, silent = false) => {
    if (!convo) return;
    const channelKey = getChannelKey(convo);
    const channelType = convo.isGroup ? 'group' : 'direct';

    if (!silent) {
      setIsSyncing(true);
    }

    try {
      const res = await api.get(`/api/communications/messages/${channelType}/${channelKey}`);
      
      // CRITICAL RACE GUARD: If the user switched away to another chat while this request was in flight, DROP immediately!
      if (activeChannelRef.current !== channelKey) {
        return;
      }

      const rawMsgs = res.data.messages || [];

      const formatted: ChatMessageItem[] = rawMsgs.map((m: any) => ({
        id: m.id || Math.random(),
        sender_type: m.sender_type || 'student',
        sender_id: m.sender_id,
        sender_name: m.sender_name || 'Member',
        message: m.message || '',
        created_at: m.created_at || new Date().toISOString(),
        status: 'delivered'
      }));

      // Cache the result for this exact channelKey
      messagesCacheRef.current[channelKey] = formatted;

      if (activeChannelRef.current === channelKey) {
        setMessages(formatted);
      }

      // Update last message in conversation list
      if (formatted.length > 0) {
        const last = formatted[formatted.length - 1];
        setConversations(prev => prev.map(c => {
          if (c.id === convo.id) {
            return {
              ...c,
              lastMessage: last.message,
              lastMessageTime: last.created_at,
              lastSenderType: last.sender_type
            };
          }
          return c;
        }));
      }
    } catch (err) {
      console.warn("[CommunicationsHub] Message sync error:", err);
    } finally {
      if (activeChannelRef.current === channelKey) {
        setIsSyncing(false);
      }
    }
  }, [getChannelKey]);

  // Conversation switch handler: IMMEDIATELY clears/sets messages for the new conversation
  useEffect(() => {
    if (activeConvo && (isOpen || isEmbedded)) {
      const channelKey = getChannelKey(activeConvo);
      activeChannelRef.current = channelKey;

      // PREVENT MESSAGE BLEED: Load cache for this specific channel or immediately reset to empty
      if (messagesCacheRef.current[channelKey]) {
        setMessages(messagesCacheRef.current[channelKey]);
      } else {
        setMessages([]); // Clears previous person's chat instantly!
      }

      markConvoAsRead(activeConvo.id);
      fetchMessages(activeConvo, false);
      onSelectConversation?.(activeConvo);
    }
  }, [activeConvo?.id, isOpen, isEmbedded, fetchMessages, getChannelKey, markConvoAsRead, onSelectConversation]);

  // Silent Background Real-time Polling (Every 3.5s)
  useEffect(() => {
    if ((!isOpen && !isEmbedded) || !activeConvo) return;

    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(() => {
      fetchMessages(activeConvo, true);
    }, 3500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [activeConvo?.id, isOpen, isEmbedded, fetchMessages]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // 1-on-1 direct message jump from Squad Roster drawer
  const handleDirectMessageWithMember = (member: SquadMember) => {
    const targetDmId = `dm_${member.id}`;
    const existing = conversations.find(c => c.id === targetDmId || c.metadata?.partnerId === member.id);

    if (existing) {
      setSelectedConvoId(existing.id);
      setIsRosterOpen(false);
      return;
    }

    const myUid = currentUserId || (typeof window !== 'undefined' ? (currentUserType === 'student' ? localStorage.getItem('student_id') : (localStorage.getItem('alumni_id') || localStorage.getItem('alumni_auth_id'))) : '') || '';
    const sortedIds = [myUid, member.id].sort();
    const newConvo: UnifiedConversation = {
      id: targetDmId,
      type: 'direct',
      title: member.isMaintainer ? `Alumni • ${member.company || 'Mentor'}` : `Teammate • ${member.branch || 'Student'}`,
      subtitle: member.isMaintainer ? `Alumni • ${member.company || 'Mentor'}` : `Squad Teammate • ${member.branch || 'Student'}`,
      recipientName: member.name,
      recipientRole: member.isMaintainer ? 'Alumni Mentor' : 'Squad Teammate',
      contextTag: member.isMaintainer ? 'Alumni Direct' : 'Teammate Direct',
      isGroup: false,
      unreadCount: 0,
      metadata: {
        partnerId: member.id,
        partnerName: member.name,
        partnerRole: member.isMaintainer ? 'alumni' : 'student',
        canonicalChannelId: `dm_${sortedIds[0]}_${sortedIds[1]}`
      }
    };

    setConversations(prev => [newConvo, ...prev]);
    setSelectedConvoId(newConvo.id);
    setIsRosterOpen(false);
  };

  // Instant 0ms Optimistic Send Handler
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || !activeConvo || isSending) return;

    const sId = currentUserId || (typeof window !== 'undefined' ? (currentUserType === 'student' ? localStorage.getItem('student_id') : (localStorage.getItem('alumni_id') || localStorage.getItem('alumni_auth_id'))) : '') || '';
    const sName = currentUserName || (typeof window !== 'undefined' ? localStorage.getItem('student_name') || 'Member' : 'Member');
    const channelKey = getChannelKey(activeConvo);
    const channelType = activeConvo.isGroup ? 'group' : 'direct';

    // 1. Create Optimistic Message (0ms UI latency)
    const optimisticMsg: ChatMessageItem = {
      id: `opt_${Date.now()}`,
      sender_type: currentUserType,
      sender_id: sId,
      sender_name: sName,
      message: text,
      created_at: new Date().toISOString(),
      status: 'sending'
    };

    // 2. Immediately update in memory and state for THIS channel
    const nextList = [...messages, optimisticMsg];
    setMessages(nextList);
    messagesCacheRef.current[channelKey] = nextList;
    setInputMessage('');
    setIsSending(true);

    // 3. Update last message preview in directory
    setConversations(prev => prev.map(c => {
      if (c.id === activeConvo.id) {
        return {
          ...c,
          lastMessage: text,
          lastMessageTime: new Date().toISOString(),
          lastSenderType: currentUserType
        };
      }
      return c;
    }));

    // 4. Background Server Dispatch
    try {
      const payload = {
        sender_type: currentUserType,
        sender_id: sId,
        sender_name: sName,
        message: text,
        channel_type: channelType,
        channel_id: channelKey,
        recipient_id: activeConvo.metadata?.partnerId,
        metadata: activeConvo.metadata
      };

      await api.post(`/api/communications/messages/${channelType}/${channelKey}`, payload);

      // Mark optimistic message as delivered
      if (activeChannelRef.current === channelKey) {
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? { ...m, status: 'delivered' } : m));
      }
    } catch (err) {
      console.error("[CommunicationsHub] Send failed:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Filtered conversation list
  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      if (filterType === 'direct' && c.isGroup) return false;
      if (filterType === 'group' && !c.isGroup) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.recipientName.toLowerCase().includes(q) ||
          c.subtitle.toLowerCase().includes(q) ||
          (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [conversations, filterType, searchQuery]);

  const groupsCount = useMemo(() => conversations.filter(c => c.isGroup).length, [conversations]);
  const directCount = useMemo(() => conversations.filter(c => !c.isGroup).length, [conversations]);
  const totalUnreadCount = useMemo(() => conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0), [conversations]);

  const currentSquadMembers = activeConvo?.metadata?.members || [];

  if (!isOpen && !isEmbedded) return null;

  const content = (
    <div className={`relative w-full ${isEmbedded ? 'h-[780px]' : 'max-w-6xl h-[92vh] max-h-[860px]'} bg-stone-50 border border-stone-300 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-stone-900`}>
      {/* Top Trim Accent */}
      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-800 via-orange-500 to-amber-500" />

      {/* Header Bar */}
      <div className="px-5 py-3.5 bg-white border-b border-stone-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-800 border border-emerald-700 flex items-center justify-center text-white shadow-2xs">
            <MessageSquare className="w-5 h-5 text-emerald-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-serif font-bold text-stone-900 leading-tight">
                Institutional Communications Hub
              </h2>
              {totalUnreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-100 text-orange-900 border border-orange-300 animate-pulse">
                  {totalUnreadCount} UNREAD
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-500 font-medium">
              Verified Mentorship, Open Source Contributor Squads & 1-to-1 Direct Messaging
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadContacts();
              if (activeConvo) fetchMessages(activeConvo, false);
            }}
            className="p-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
            title="Refresh conversation"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-800' : ''}`} />
          </button>
          {!isEmbedded && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Split View Body (Directory + Main Chat Stream) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ============================================================
            LEFT DIRECTORY: WhatsApp-Style Channels & Contacts
           ============================================================ */}
        <div className="w-full sm:w-80 md:w-88 bg-stone-100/90 border-r border-stone-200 flex flex-col shrink-0 overflow-hidden">
          
          {/* Search and Filters */}
          <div className="p-3.5 border-b border-stone-200 bg-white/70 space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-stone-400" />
              <input
                type="text"
                placeholder="Search contributors, alumni..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-700 transition-all text-stone-800 placeholder-stone-400"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 text-[11px] font-semibold">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-emerald-800 text-white font-bold shadow-2xs'
                    : 'bg-stone-200/70 text-stone-600 hover:bg-stone-200'
                }`}
              >
                All ({conversations.length})
              </button>
              <button
                onClick={() => setFilterType('group')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  filterType === 'group'
                    ? 'bg-emerald-800 text-white font-bold shadow-2xs'
                    : 'bg-stone-200/70 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <Users className="w-3 h-3" /> Groups ({groupsCount})
              </button>
              <button
                onClick={() => setFilterType('direct')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  filterType === 'direct'
                    ? 'bg-emerald-800 text-white font-bold shadow-2xs'
                    : 'bg-stone-200/70 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <User className="w-3 h-3" /> Direct 1:1 ({directCount})
              </button>
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-200/60 p-1.5 space-y-1">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-stone-400 text-xs">
                <MessageSquare className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="font-semibold text-stone-600">No conversations found</p>
                <p className="text-[11px] text-stone-400 mt-0.5">Explore opportunities or open source projects to begin dialogue.</p>
              </div>
            ) : (
              filteredConversations.map((convo) => {
                const isSelected = convo.id === activeConvo?.id;
                return (
                  <div
                    key={convo.id}
                    onClick={() => {
                      setSelectedConvoId(convo.id);
                      markConvoAsRead(convo.id);
                      setIsRosterOpen(false);
                    }}
                    className={`p-3 rounded-2xl transition-all cursor-pointer flex items-start gap-3 relative group ${
                      isSelected
                        ? 'bg-white border border-emerald-700/60 shadow-xs'
                        : 'hover:bg-white/70 border border-transparent'
                    }`}
                  >
                    {/* Avatar / Channel Icon */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                        convo.isGroup 
                          ? 'bg-purple-100 text-purple-900 border border-purple-200' 
                          : 'bg-emerald-100 text-emerald-950 border border-emerald-200'
                      }`}>
                        {convo.isGroup ? <Users className="w-4 h-4 text-purple-700" /> : convo.recipientName.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-400" />
                    </div>

                    {/* Conversation Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-stone-900 truncate">
                          {convo.recipientName}
                        </h4>
                        {convo.lastMessageTime && (
                          <span className="text-[10px] font-mono text-stone-400 shrink-0 ml-1">
                            {new Date(convo.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider border ${
                          convo.isGroup
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {convo.recipientRole}
                        </span>
                        <span className="text-[10px] text-stone-500 truncate">
                          • {convo.subtitle}
                        </span>
                      </div>

                      <p className="text-[11px] text-stone-500 truncate mt-1">
                        {convo.lastSenderType === currentUserType && <span className="font-semibold text-stone-700">You: </span>}
                        {convo.lastMessage || (convo.isGroup ? 'Open source contributors channel' : 'Direct 1-to-1 conversation')}
                      </p>
                    </div>

                    {/* Unread Badge */}
                    {convo.unreadCount > 0 && (
                      <div className="shrink-0 flex items-center justify-center">
                        <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-mono text-[10px] font-bold flex items-center justify-center shadow-xs animate-bounce">
                          {convo.unreadCount}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================
            RIGHT PANEL: Real-time Message Stream & Instant Composer
           ============================================================ */}
        <div className="flex-1 flex flex-col bg-stone-50 overflow-hidden relative">
          {activeConvo ? (
            <>
              {/* Active Channel Header */}
              <div className="px-5 py-3 bg-white border-b border-stone-200 flex items-center justify-between shrink-0 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold shrink-0 ${
                    activeConvo.isGroup 
                      ? 'bg-purple-50 border-purple-200 text-purple-800' 
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}>
                    {activeConvo.isGroup ? <Users className="w-4 h-4 text-purple-700" /> : <User className="w-4 h-4 text-emerald-800" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-stone-900 truncate">
                        {activeConvo.recipientName}
                      </h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {activeConvo.recipientRole}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 truncate flex items-center gap-1.5">
                      <span>{activeConvo.subtitle}</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {activeConvo.isGroup ? 'Open Source Squad Stream' : '1-to-1 Direct Chat'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Contributors Roster Toggle for Open Source Groups */}
                  {activeConvo.isGroup && currentSquadMembers.length > 0 && (
                    <button
                      onClick={() => setIsRosterOpen(prev => !prev)}
                      className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <Users className="w-3.5 h-3.5 text-purple-700" />
                      <span>Contributors ({currentSquadMembers.length})</span>
                      {isRosterOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}

                  <span className="text-[10px] font-mono text-stone-400 hidden sm:inline">
                    {activeConvo.contextTag}
                  </span>
                </div>
              </div>

              {/* Team Roster Slide-Down Drawer */}
              {isRosterOpen && currentSquadMembers.length > 0 && (
                <div className="bg-purple-50/80 border-b border-purple-200 p-3 sm:p-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-800" />
                      <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider font-mono">
                        Open Source Contributors & Direct Chat
                      </h4>
                    </div>
                    <span className="text-[10px] text-purple-700 font-medium">Click DM to chat 1-on-1 with any person</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {currentSquadMembers.map((member) => (
                      <div 
                        key={member.id} 
                        className="bg-white border border-purple-200/80 rounded-xl p-2.5 flex items-center justify-between shadow-2xs hover:border-purple-400 transition-all"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${
                            member.isMaintainer 
                              ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                              : 'bg-teal-100 text-teal-900 border border-teal-300'
                          }`}>
                            {member.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-stone-900 truncate">
                              {member.name} {member.isSelf && <span className="text-stone-400 text-[10px]">(You)</span>}
                            </p>
                            <span className={`text-[9px] font-semibold px-1 py-0.1 rounded ${
                              member.isMaintainer 
                                ? 'bg-amber-50 text-amber-800' 
                                : 'bg-emerald-50 text-emerald-800'
                            }`}>
                              {member.role}
                            </span>
                          </div>
                        </div>

                        {!member.isSelf && (
                          <button
                            onClick={() => handleDirectMessageWithMember(member)}
                            className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 shadow-2xs"
                            title={`Chat 1-on-1 with ${member.name}`}
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>DM</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 mb-3 shadow-sm">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <h4 className="text-sm font-serif font-bold text-stone-900 mb-1">
                      {activeConvo.isGroup 
                        ? `Team Stream for ${activeConvo.recipientName}` 
                        : `Direct 1-on-1 Dialogue with ${activeConvo.recipientName}`}
                    </h4>
                    <p className="text-xs text-stone-500 mb-5 leading-relaxed">
                      {activeConvo.isGroup 
                        ? "Collaborate on pull requests, technical architecture, and project milestones with your squad."
                        : "Inquire about verified technical skills, team expectations, or schedule your project review."}
                    </p>

                    {/* Quick Prompt Suggestions */}
                    <div className="w-full space-y-1.5 text-left">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Quick Suggestions:</span>
                      {DEFAULT_PROMPTS.slice(0, 3).map((qp, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendMessage(qp.text)}
                          className="w-full p-2.5 rounded-xl bg-white border border-stone-200 hover:border-emerald-700 text-stone-700 hover:text-emerald-950 text-xs text-left transition-all shadow-2xs group flex items-center justify-between"
                        >
                          <span className="truncate pr-2 font-medium">{qp.label}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-800 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((m, idx) => {
                    const isMe = m.sender_type === currentUserType;
                    return (
                      <div
                        key={m.id || idx}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                      >
                        <div className="flex items-center gap-1.5 px-1">
                          <span className="text-[10px] font-bold text-stone-600">
                            {isMe ? 'You' : m.sender_name}
                          </span>
                          <span className="text-[9px] font-mono text-stone-400">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div
                          className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                            isMe
                              ? 'bg-emerald-800 text-white rounded-tr-xs'
                              : 'bg-white border border-stone-200 text-stone-900 rounded-tl-xs'
                          }`}
                        >
                          <div className="prose prose-xs max-w-none text-inherit">
                            <ReactMarkdown>{m.message}</ReactMarkdown>
                          </div>

                          {/* Delivery double check marks for sent messages */}
                          {isMe && (
                            <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-emerald-200">
                              <span>{m.status === 'sending' ? 'Sending...' : 'Delivered'}</span>
                              <CheckCheck className="w-3 h-3 text-emerald-200" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Instant Composer Stage */}
              <div className="p-3.5 sm:p-4 bg-white border-t border-stone-200 space-y-2 shrink-0">
                {/* Quick Prompts Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-orange-500" /> Prompts:
                  </span>
                  {DEFAULT_PROMPTS.map((qp, i) => (
                    <button
                      key={i}
                      onClick={() => setInputMessage(qp.text)}
                      className="px-2.5 py-1 rounded-full bg-stone-100 hover:bg-orange-50 text-stone-700 hover:text-orange-950 border border-stone-200 hover:border-orange-300 shrink-0 transition-colors cursor-pointer"
                    >
                      {qp.label}
                    </button>
                  ))}
                </div>

                {/* Input Box & Action Button */}
                <div className="flex items-end gap-2 bg-stone-50 border border-stone-200 rounded-2xl p-2 focus-within:border-emerald-700 focus-within:bg-white transition-all">
                  <textarea
                    rows={2}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${activeConvo.recipientName}... (Enter to send, Shift+Enter for new line)`}
                    className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-hidden resize-none p-1"
                  />

                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!inputMessage.trim() || isSending}
                    className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs shrink-0 cursor-pointer"
                  >
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-center text-stone-400">
              <p>Select a conversation from the left to read messages.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {content}
    </div>
  );
};
