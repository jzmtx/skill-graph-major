"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  X, 
  Send, 
  MessageSquare, 
  Sparkles, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Trash2, 
  Copy, 
  Check, 
  ShieldCheck, 
  Maximize2, 
  Minimize2, 
  Clock, 
  Users, 
  User, 
  Hash, 
  Radio, 
  CheckCheck, 
  ChevronRight,
  ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type ChatType = 'personal' | 'group';

export interface ChatMessage {
  id: string | number;
  sender_id?: string;
  sender_name: string;
  sender_type: string;
  message: string;
  created_at: string;
}

export interface QuickPrompt {
  label: string;
  category: 'inquiry' | 'technical' | 'schedule' | 'milestone';
  text: string;
}

export interface CreativeChatConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  recipientRole?: string;
  contextTag?: string;
  chatType?: ChatType;
  memberCount?: number;
  channelTopic?: string;
  messages: ChatMessage[];
  currentUserId?: string | null;
  currentUserType: 'student' | 'company' | 'alumni' | 'tpo';
  loading: boolean;
  sending: boolean;
  onSendMessage: (message: string) => Promise<void> | void;
  onDeleteMessage?: (id: any) => Promise<void> | void;
  onUploadImage?: (file: File) => Promise<void> | void;
  customPrompts?: QuickPrompt[];
  onRefresh?: () => Promise<void> | void;
  pollIntervalMs?: number;
}

const PERSONAL_DEFAULT_PROMPTS: QuickPrompt[] = [
  {
    label: "Verify Candidate Dossier",
    category: "inquiry",
    text: "Could you review my verified SkillGraph skill assessments and advise if there are specific competencies you recommend bolstering for this position?"
  },
  {
    label: "Interview Availability",
    category: "schedule",
    text: "I am available for an initial technical conversation or project defense. Please share your team's preferred interview windows."
  },
  {
    label: "Stack & Architecture Query",
    category: "technical",
    text: "Could you provide further insights regarding the core engineering stack, code review conventions, and deployment workflows used by the team?"
  },
  {
    label: "Milestone & Placement Update",
    category: "milestone",
    text: "I have updated my portfolio with recent project milestones. Would you like me to share the direct repository links and performance metrics?"
  }
];

const GROUP_DEFAULT_PROMPTS: QuickPrompt[] = [
  {
    label: "Sprint Milestone Release",
    category: "milestone",
    text: "Team, I have merged the latest feature branch and published the milestone build. Please review the updated documentation and test cases."
  },
  {
    label: "Code Review & PR Request",
    category: "technical",
    text: "A new pull request is open for review focusing on core performance optimization. Maintainers and contributors, please leave your feedback."
  },
  {
    label: "Architecture RFC Discussion",
    category: "inquiry",
    text: "Proposing an RFC for state sync and caching layer. Would appreciate comments on the proposed interface before finalizing the implementation."
  },
  {
    label: "Team Sync & Standup",
    category: "schedule",
    text: "Let's align on this week's sprint deliverables and blocker resolution. When is everyone available for a quick async or voice check-in?"
  }
];

// Helper to determine role styling in group chats
function getRoleBadgeStyle(role: string = '') {
  const r = role.toLowerCase();
  if (r.includes('lead') || r.includes('maintainer')) {
    return {
      bg: 'bg-purple-50 text-purple-800 border-purple-200',
      avatarBg: 'bg-purple-100 text-purple-800 border-purple-300',
      accentBorder: 'border-l-purple-500',
      label: 'Maintainer'
    };
  }
  if (r.includes('alumni') || r.includes('advisor')) {
    return {
      bg: 'bg-sky-50 text-sky-800 border-sky-200',
      avatarBg: 'bg-sky-100 text-sky-800 border-sky-300',
      accentBorder: 'border-l-sky-500',
      label: 'Alumni Lead'
    };
  }
  if (r.includes('company') || r.includes('recruiter')) {
    return {
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      avatarBg: 'bg-amber-100 text-amber-800 border-amber-300',
      accentBorder: 'border-l-amber-500',
      label: 'Recruiter'
    };
  }
  if (r.includes('tpo') || r.includes('admin')) {
    return {
      bg: 'bg-rose-50 text-rose-800 border-rose-200',
      avatarBg: 'bg-rose-100 text-rose-800 border-rose-300',
      accentBorder: 'border-l-rose-500',
      label: 'Institutional Admin'
    };
  }
  return {
    bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    avatarBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    accentBorder: 'border-l-emerald-500',
    label: 'Contributor'
  };
}

export default function CreativeChatConsole({
  isOpen,
  onClose,
  title,
  subtitle,
  recipientRole = "Institutional Contact",
  contextTag = "Encrypted Thread",
  chatType = "personal",
  memberCount,
  channelTopic,
  messages,
  currentUserId,
  currentUserType,
  loading,
  sending,
  onSendMessage,
  onDeleteMessage,
  onUploadImage,
  customPrompts,
  onRefresh,
  pollIntervalMs = 2500
}: CreativeChatConsoleProps) {
  const [inputText, setInputText] = useState("");
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'inquiry' | 'technical' | 'schedule' | 'milestone'>('all');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPromptDeck, setShowPromptDeck] = useState(true);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevMsgLengthRef = useRef(messages.length);

  // Clear optimistic messages once canonical messages receive it
  useEffect(() => {
    if (optimisticMessages.length > 0) {
      setOptimisticMessages(prev => 
        prev.filter(opt => !messages.some(m => m.message === opt.message && m.sender_type === opt.sender_type))
      );
    }
  }, [messages, optimisticMessages.length]);

  // Combined messages to show optimistic sends immediately without reload
  const allDisplayMessages = [...messages, ...optimisticMessages];

  // Select appropriate default prompts based on chat type
  const prompts = customPrompts || (chatType === 'group' ? GROUP_DEFAULT_PROMPTS : PERSONAL_DEFAULT_PROMPTS);

  const filteredPrompts = selectedCategory === 'all'
    ? prompts
    : prompts.filter(p => p.category === selectedCategory);

  // REAL-TIME BACKGROUND SYNC (NO RELOAD NEEDED)
  const handlePoll = useCallback(async () => {
    if (onRefresh) {
      try {
        await onRefresh();
      } catch (err) {
        console.warn("Real-time poll error:", err);
      }
    }
  }, [onRefresh]);

  useEffect(() => {
    if (!isOpen || !onRefresh) return;

    // Run active polling every pollIntervalMs (default 2.5s) while chat modal is open
    const interval = setInterval(() => {
      handlePoll();
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [isOpen, onRefresh, pollIntervalMs, handlePoll]);

  // Auto-scroll when new messages arrive if user is already near bottom
  useEffect(() => {
    if (!isOpen) return;

    const container = scrollContainerRef.current;
    const isNewMessage = allDisplayMessages.length > prevMsgLengthRef.current;
    prevMsgLengthRef.current = allDisplayMessages.length;

    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
      if (isNearBottom || isNewMessage) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [allDisplayMessages.length, isOpen]);

  // Detect scroll position to show "jump to bottom" button if scrolled up
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isScrolledUp = container.scrollHeight - container.scrollTop - container.clientHeight > 150;
    setShowScrollBottomBtn(isScrolledUp);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBottomBtn(false);
  };

  if (!isOpen) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || sending) return;
    const msg = inputText.trim();
    setInputText("");

    // Optimistically insert message for zero-latency instant rendering
    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender_id: currentUserId || undefined,
      sender_name: currentUserType === 'student' ? 'You' : currentUserType === 'company' ? 'Recruiter' : 'You',
      sender_type: currentUserType,
      message: msg,
      created_at: new Date().toISOString()
    };
    setOptimisticMessages(prev => [...prev, tempMsg]);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    try {
      await onSendMessage(msg);
      // Trigger instant poll after send to synchronize canonical ID
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
    textareaRef.current?.focus();
  };

  const handleSelectPrompt = (promptText: string) => {
    setInputText(prev => prev ? `${prev}\n\n${promptText}` : promptText);
    textareaRef.current?.focus();
  };

  const handleCopy = (id: string | number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInsertFormat = (type: 'bold' | 'code' | 'link' | 'quote') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = inputText.substring(start, end);

    let replacement = "";
    if (type === 'bold') replacement = `**${selection || 'text'}**`;
    if (type === 'code') replacement = `\`\`\`\n${selection || '// code block'}\n\`\`\``;
    if (type === 'link') {
      const url = prompt("Enter hyperlink URL (e.g. https://github.com/...):");
      if (!url) return;
      replacement = `[${selection || 'Resource Link'}](${url})`;
    }
    if (type === 'quote') replacement = `> ${selection || 'Referenced point'}\n`;

    const nextText = inputText.substring(0, start) + replacement + inputText.substring(end);
    setInputText(nextText);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadImage) {
      await onUploadImage(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isGroup = chatType === 'group';

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className={`bg-white rounded-2xl border border-stone-200/90 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 w-full relative ${
          isExpanded ? 'max-w-5xl h-[94vh]' : 'max-w-3xl h-[86vh]'
        }`}
      >
        {/* HEADER: DISTINCT PERSONAL VS GROUP STYLING */}
        <div className={`border-b border-stone-200 px-5 py-3.5 flex items-center justify-between shrink-0 relative overflow-hidden ${
          isGroup ? 'bg-gradient-to-r from-purple-50/60 via-stone-50 to-amber-50/40' : 'bg-stone-50/95'
        }`}>
          {/* Top Decorative Trim Accent */}
          <div className={`absolute top-0 left-0 right-0 h-1 ${
            isGroup 
              ? 'bg-gradient-to-r from-purple-600 via-indigo-500 to-amber-500' 
              : 'bg-gradient-to-r from-emerald-700 via-teal-600 to-emerald-500'
          }`} />

          <div className="flex items-center gap-3">
            {/* Header Icon / Avatar Distinction */}
            {isGroup ? (
              // GROUP CHAT ICON BADGE
              <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 shadow-2xs flex items-center justify-center text-purple-800 relative">
                <Users className="w-5 h-5 text-purple-700" />
                <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-600 border border-white" />
                </span>
              </div>
            ) : (
              // PERSONAL CHAT AVATAR BADGE
              <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 shadow-2xs flex items-center justify-center text-emerald-900 relative">
                <User className="w-5 h-5 text-emerald-800" />
                <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600 border border-white" />
                </span>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-stone-900 tracking-tight leading-none flex items-center gap-1.5">
                  {isGroup && <Hash className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                  {title}
                </h3>

                {/* Chat Type Identifier Tag */}
                {isGroup ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    <Users className="w-2.5 h-2.5 text-purple-600" />
                    Team Channel
                    {memberCount ? ` (${memberCount})` : ''}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-700" />
                    1-on-1 Direct
                  </span>
                )}

                {/* Real-time Live Sync Indicator Pill */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-600 border border-stone-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>

              <p className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-stone-700">{recipientRole}</span>
                {subtitle && (
                  <>
                    <span className="text-stone-300">•</span>
                    <span className="truncate max-w-xs">{subtitle}</span>
                  </>
                )}
                {channelTopic && (
                  <>
                    <span className="text-stone-300">•</span>
                    <span className="text-purple-700 font-medium truncate max-w-xs">Topic: {channelTopic}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowPromptDeck(!showPromptDeck)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1 ${
                showPromptDeck 
                  ? isGroup 
                    ? 'bg-purple-100 border-purple-200 text-purple-800' 
                    : 'bg-emerald-100 border-emerald-200 text-emerald-800'
                  : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
              title="Toggle Quick Prompts Deck"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGroup ? 'text-purple-600' : 'text-emerald-700'}`} />
              <span className="hidden sm:inline">Options Deck</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
              title={isExpanded ? "Collapse View" : "Expand View"}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors ml-1"
              title="Close Dialogue"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CREATIVE CHAT OPTIONS & PROMPT DECK */}
        <AnimatePresence>
          {showPromptDeck && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-stone-200 bg-stone-50/70 px-5 py-2.5 overflow-hidden shrink-0"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className={`w-3 h-3 ${isGroup ? 'text-purple-600' : 'text-emerald-700'}`} />
                    {isGroup ? 'Team Collab Capsules' : 'Personal Dispatch Capsules'}
                  </span>
                  <span className="text-[10px] text-stone-400 hidden sm:inline">
                    Click to insert structured message template
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {(['all', 'inquiry', 'schedule', 'technical', 'milestone'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        selectedCategory === cat 
                          ? isGroup 
                            ? 'bg-purple-100 text-purple-900 border border-purple-300 font-bold' 
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold'
                          : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
                      }`}
                    >
                      {cat.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {filteredPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPrompt(p.text)}
                    className="shrink-0 group px-3 py-1.5 rounded-xl bg-white border border-stone-200/90 hover:border-emerald-300 hover:bg-emerald-50/40 text-left transition-all shadow-2xs flex items-center gap-2"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full group-hover:scale-125 transition-transform ${
                      isGroup ? 'bg-purple-500' : 'bg-emerald-600'
                    }`} />
                    <div>
                      <span className="block text-xs font-semibold text-stone-800 group-hover:text-emerald-950">
                        {p.label}
                      </span>
                      <span className="block text-[10px] text-stone-400 group-hover:text-stone-600 max-w-[200px] truncate">
                        {p.text}
                      </span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-stone-300 group-hover:text-emerald-600 ml-1" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DIALOGUE STREAM: DISTINCT PERSONAL VS GROUP RENDERING */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className={`flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 ${
            isGroup ? 'bg-stone-50/50' : 'bg-slate-50/30'
          }`}
        >
          {loading && allDisplayMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-stone-400 text-xs gap-2">
              <div className="w-6 h-6 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
              <span>Decrypting transmission history...</span>
            </div>
          ) : allDisplayMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xs mb-3 ${
                isGroup ? 'bg-purple-100 border border-purple-200 text-purple-700' : 'bg-emerald-100 border border-emerald-200 text-emerald-800'
              }`}>
                {isGroup ? <Users className="w-7 h-7" /> : <MessageSquare className="w-7 h-7" />}
              </div>
              <h4 className="text-sm font-bold text-stone-900">
                {isGroup ? 'Open-Source Team Channel Dialogue' : '1-on-1 Direct Encrypted Dialogue'}
              </h4>
              <p className="text-xs text-stone-500 max-w-md mt-1 leading-relaxed">
                {isGroup 
                  ? 'No group messages recorded yet in this channel. Maintainers and contributors can collaborate here seamlessly with live auto-refresh.'
                  : 'No communications have been recorded yet. Select one of the dispatch capsules above or send a direct inquiry below.'}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-stone-200 text-[11px] text-stone-600 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live delivery active — updates appear without page refresh
              </div>
            </div>
          ) : (
            allDisplayMessages.map((m) => {
              const isMe = 
                (currentUserId && m.sender_id === currentUserId) || 
                (currentUserType === m.sender_type);

              const roleStyle = getRoleBadgeStyle(m.sender_type);
              const senderInitial = (m.sender_name || 'U').charAt(0).toUpperCase();

              // PERSONAL CHAT BUBBLE RENDERING
              if (!isGroup) {
                return (
                  <div 
                    key={m.id} 
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
                  >
                    {/* Timestamp & Metadata */}
                    <div className="flex items-center gap-1.5 text-[10px] text-stone-400 mb-1 px-1">
                      {!isMe && (
                        <span className="font-semibold text-stone-700 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                          {m.sender_name}
                        </span>
                      )}
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-stone-100 text-stone-600 border border-stone-200">
                        {m.sender_type}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-stone-400" />
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      {/* Delete action */}
                      {isMe && onDeleteMessage && (
                        <button 
                          type="button"
                          onClick={() => onDeleteMessage(m.id)}
                          className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-700 p-0.5 transition-all ml-1"
                          title="Delete message"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* 1-on-1 Personal Bubble */}
                    <div className={`relative p-3.5 rounded-2xl text-xs max-w-[85%] sm:max-w-[78%] leading-relaxed shadow-xs transition-all ${
                      isMe
                        ? 'bg-gradient-to-br from-emerald-800 to-emerald-950 text-white rounded-tr-xs shadow-emerald-900/10'
                        : 'bg-white border border-stone-200 text-stone-800 rounded-tl-xs border-l-[3px] border-l-emerald-600 shadow-2xs'
                    }`}>
                      <div className={`prose prose-xs max-w-none ${isMe ? 'text-white prose-invert' : 'text-stone-800'}`}>
                        <ReactMarkdown>{m.message}</ReactMarkdown>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 mt-1">
                        {isMe && (
                          <span className="text-[10px] text-emerald-200/80 flex items-center gap-0.5">
                            <CheckCheck className="w-3 h-3 text-emerald-300" />
                          </span>
                        )}

                        {/* Copy button */}
                        <button
                          type="button"
                          onClick={() => handleCopy(m.id, m.message)}
                          className={`opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-[10px] ${
                            isMe ? 'text-emerald-200 hover:text-white' : 'text-stone-400 hover:text-stone-700'
                          }`}
                          title="Copy text"
                        >
                          {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              // GROUP CHAT BUBBLE RENDERING
              return (
                <div 
                  key={m.id} 
                  className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'} group items-start`}
                >
                  {/* Contributor Avatar in Group Stream */}
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs mt-1 ${roleStyle.avatarBg}`}>
                    {senderInitial}
                  </div>

                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[84%] sm:max-w-[78%]`}>
                    {/* Contributor Identity Header in Group Chat */}
                    <div className={`flex items-center gap-1.5 text-[10px] mb-1 px-1 flex-wrap ${isMe ? 'flex-row-reverse' : ''}`}>
                      <span className="font-bold text-stone-800">
                        {isMe ? 'You' : m.sender_name}
                      </span>

                      {/* Distinctive Group Role Pill */}
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border shadow-2xs ${roleStyle.bg}`}>
                        {roleStyle.label}
                      </span>

                      <span className="text-stone-300">•</span>
                      <span className="text-stone-400 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      {/* Delete action */}
                      {isMe && onDeleteMessage && (
                        <button 
                          type="button"
                          onClick={() => onDeleteMessage(m.id)}
                          className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-700 p-0.5 transition-all ml-1"
                          title="Delete message"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Group Message Bubble with Role Accent Border */}
                    <div className={`relative p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs w-full ${
                      isMe
                        ? 'bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-950 text-white rounded-tr-xs shadow-indigo-950/20'
                        : `bg-white border border-stone-200 text-stone-800 rounded-tl-xs border-l-[3.5px] ${roleStyle.accentBorder} shadow-2xs`
                    }`}>
                      <div className={`prose prose-xs max-w-none ${isMe ? 'text-white prose-invert' : 'text-stone-800'}`}>
                        <ReactMarkdown>{m.message}</ReactMarkdown>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 mt-1">
                        {isMe && (
                          <span className="text-[10px] text-purple-200/80 flex items-center gap-0.5">
                            <CheckCheck className="w-3 h-3 text-purple-300" />
                          </span>
                        )}

                        {/* Copy button */}
                        <button
                          type="button"
                          onClick={() => handleCopy(m.id, m.message)}
                          className={`opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-[10px] ${
                            isMe ? 'text-purple-200 hover:text-white' : 'text-stone-400 hover:text-stone-700'
                          }`}
                          title="Copy text"
                        >
                          {copiedId === m.id ? <Check className="w-3 h-3 text-purple-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* FLOATING "SCROLL TO BOTTOM / NEW MESSAGES" BUTTON */}
        <AnimatePresence>
          {showScrollBottomBtn && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={scrollToBottom}
              className="absolute bottom-20 right-6 px-3 py-1.5 bg-stone-900/90 text-white text-xs font-semibold rounded-full shadow-lg backdrop-blur-xs flex items-center gap-1.5 hover:bg-stone-800 transition-all z-20 border border-stone-700"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>Latest Messages</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* COMPOSE & DISPATCH INTERFACE */}
        <div className="p-3.5 border-t border-stone-200 bg-white shrink-0">
          {/* Quick Formatting Tools */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100 text-[11px] text-stone-500">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mr-1">
                Format:
              </span>
              <button
                type="button"
                onClick={() => handleInsertFormat('bold')}
                className="px-2 py-0.5 rounded hover:bg-stone-100 text-stone-600 font-bold"
                title="Bold"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => handleInsertFormat('code')}
                className="px-2 py-0.5 rounded hover:bg-stone-100 text-stone-600 font-mono text-[10px]"
                title="Code block"
              >
                {"</>"}
              </button>
              <button
                type="button"
                onClick={() => handleInsertFormat('link')}
                className="px-2 py-0.5 rounded hover:bg-stone-100 text-stone-600 flex items-center gap-1"
                title="Hyperlink"
              >
                <LinkIcon className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => handleInsertFormat('quote')}
                className="px-2 py-0.5 rounded hover:bg-stone-100 text-stone-600"
                title="Quote"
              >
                &ldquo;
              </button>

              {onUploadImage && (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2 py-0.5 rounded hover:bg-stone-100 text-stone-600 flex items-center gap-1"
                    title="Attach Image"
                  >
                    <ImageIcon className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Auto-sync live
              </span>
              {inputText.length > 0 && (
                <button
                  type="button"
                  onClick={() => setInputText("")}
                  className="text-[10px] text-stone-400 hover:text-red-600 ml-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSend} className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                rows={2}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  isGroup 
                    ? "Broadcast to open source team channel... (Press Enter to transmit, Shift+Enter for newline)"
                    : "Draft personal inquiry or reply... (Press Enter to transmit, Shift+Enter for newline)"
                }
                className={`w-full text-xs p-3 bg-stone-50 border rounded-xl text-stone-900 focus:outline-none focus:bg-white resize-none transition-all ${
                  isGroup 
                    ? 'border-purple-200 focus:border-purple-600 focus:ring-1 focus:ring-purple-400' 
                    : 'border-stone-300 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-600'
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={sending || !inputText.trim()}
              className={`px-4 py-3 text-white font-semibold text-xs rounded-xl shadow-xs disabled:opacity-50 transition-all flex items-center gap-1.5 shrink-0 ${
                isGroup
                  ? 'bg-gradient-to-r from-purple-800 to-indigo-900 hover:from-purple-700 hover:to-indigo-800 border border-purple-400/40'
                  : 'bg-gradient-to-r from-emerald-800 to-emerald-900 hover:from-emerald-700 hover:to-emerald-800 border border-emerald-500/40'
              }`}
              title="Transmit Message"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5 text-white/90" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
