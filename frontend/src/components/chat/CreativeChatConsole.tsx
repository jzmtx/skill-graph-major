"use client";

import React, { useState, useRef, useEffect } from 'react';
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
  Code, 
  Calendar, 
  FileText, 
  HelpCircle,
  Briefcase,
  ChevronRight,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

interface CreativeChatConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  recipientRole?: string;
  contextTag?: string;
  messages: ChatMessage[];
  currentUserId?: string | null;
  currentUserType: 'student' | 'company' | 'alumni' | 'tpo';
  loading: boolean;
  sending: boolean;
  onSendMessage: (message: string) => Promise<void> | void;
  onDeleteMessage?: (id: any) => Promise<void> | void;
  onUploadImage?: (file: File) => Promise<void> | void;
  customPrompts?: QuickPrompt[];
}

const DEFAULT_PROMPTS: QuickPrompt[] = [
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
    label: "Milestone & Capstone Update",
    category: "milestone",
    text: "I have published an updated open-source milestone on my repository. Would you like me to link the commit log and documentation?"
  }
];

export default function CreativeChatConsole({
  isOpen,
  onClose,
  title,
  subtitle,
  recipientRole = "Institutional Contact",
  contextTag = "Encrypted Thread",
  messages,
  currentUserId,
  currentUserType,
  loading,
  sending,
  onSendMessage,
  onDeleteMessage,
  onUploadImage,
  customPrompts
}: CreativeChatConsoleProps) {
  const [inputText, setInputText] = useState("");
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'inquiry' | 'technical' | 'schedule' | 'milestone'>('all');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPromptDeck, setShowPromptDeck] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const prompts = customPrompts || DEFAULT_PROMPTS;

  const filteredPrompts = selectedCategory === 'all'
    ? prompts
    : prompts.filter(p => p.category === selectedCategory);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || sending) return;
    const msg = inputText.trim();
    setInputText("");
    await onSendMessage(msg);
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

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2 }}
        className={`bg-white rounded-2xl border border-stone-200/90 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 w-full ${
          isExpanded ? 'max-w-5xl h-[92vh]' : 'max-w-3xl h-[84vh]'
        }`}
      >
        {/* TOP ATELIER HEADER WITH ORANGE CITRUS ACCENT */}
        <div className="border-b border-stone-200 bg-stone-50/90 px-5 py-3.5 flex items-center justify-between shrink-0 relative overflow-hidden">
          {/* Subtle Orange Accent Top Trim */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-700 via-orange-500 to-amber-500" />

          <div className="flex items-center gap-3">
            {/* Geometric Monogram with Orange border */}
            <div className="w-10 h-10 rounded-xl bg-white border border-orange-200 shadow-2xs flex items-center justify-center text-emerald-900 font-bold text-sm relative">
              <MessageSquare className="w-5 h-5 text-emerald-800" />
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500 border border-white" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-stone-900 tracking-tight leading-none">
                  {title}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-800 border border-orange-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  {contextTag}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-1.5">
                <span className="font-medium text-stone-700">{recipientRole}</span>
                {subtitle && (
                  <>
                    <span className="text-stone-300">•</span>
                    <span className="truncate max-w-xs">{subtitle}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowPromptDeck(!showPromptDeck)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1 ${
                showPromptDeck 
                  ? 'bg-orange-50 border-orange-200 text-orange-800' 
                  : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
              title="Toggle Quick Prompts Deck"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
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
              className="border-b border-stone-200 bg-stone-50/60 px-5 py-2.5 overflow-hidden shrink-0"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-orange-600" />
                    Bespoke Dispatch Capsules
                  </span>
                  <span className="text-[10px] text-stone-400">Click to stage structured message</span>
                </div>

                <div className="flex items-center gap-1">
                  {(['all', 'inquiry', 'schedule', 'technical', 'milestone'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        selectedCategory === cat 
                          ? 'bg-orange-100 text-orange-900 border border-orange-300 font-bold' 
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
                    className="shrink-0 group px-3 py-1.5 rounded-xl bg-white border border-stone-200/90 hover:border-orange-300 hover:bg-orange-50/40 text-left transition-all shadow-2xs flex items-center gap-2"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 group-hover:scale-125 transition-transform" />
                    <div>
                      <span className="block text-xs font-semibold text-stone-800 group-hover:text-orange-950">
                        {p.label}
                      </span>
                      <span className="block text-[10px] text-stone-400 group-hover:text-stone-600 max-w-[200px] truncate">
                        {p.text}
                      </span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-stone-300 group-hover:text-orange-600 ml-1" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DIALOGUE STREAM */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-stone-50/40">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-stone-400 text-xs gap-2">
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span>Decrypting transmission history...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-700 shadow-2xs mb-3">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-stone-900">Direct Institutional Dialogue</h4>
              <p className="text-xs text-stone-500 max-w-md mt-1 leading-relaxed">
                No communications have been recorded yet. Select one of the dispatch capsules above or draft an inquiry below to start the conversation.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-[11px] text-stone-600">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-800" />
                Verified & encrypted candidate-institutional thread
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = 
                (currentUserId && m.sender_id === currentUserId) || 
                (currentUserType === m.sender_type);

              return (
                <div 
                  key={m.id} 
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
                >
                  {/* Sender Metadata Bar */}
                  <div className="flex items-center gap-1.5 text-[10px] text-stone-400 mb-1 px-1">
                    {!isMe && (
                      <span className="font-semibold text-stone-700">
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

                  {/* Message Bubble */}
                  <div className={`relative p-3.5 rounded-2xl text-xs max-w-[85%] sm:max-w-[78%] leading-relaxed shadow-2xs ${
                    isMe
                      ? 'bg-emerald-800 text-white rounded-tr-xs'
                      : 'bg-white border border-stone-200 text-stone-800 rounded-tl-xs border-l-[3px] border-l-orange-500'
                  }`}>
                    <div className={`prose prose-xs max-w-none ${isMe ? 'text-white prose-invert' : 'text-stone-800'}`}>
                      <ReactMarkdown>{m.message}</ReactMarkdown>
                    </div>

                    {/* Copy action pill on hover */}
                    <button
                      type="button"
                      onClick={() => handleCopy(m.id, m.message)}
                      className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md text-[10px] ${
                        isMe ? 'bg-emerald-900/80 text-emerald-200 hover:text-white' : 'bg-stone-100 text-stone-500 hover:text-stone-800'
                      }`}
                      title="Copy message"
                    >
                      {copiedId === m.id ? <Check className="w-3 h-3 text-orange-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

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
              {inputText.length > 0 && (
                <span className="text-[10px] text-orange-700 font-medium">
                  {inputText.length} characters
                </span>
              )}
              {inputText.length > 0 && (
                <button
                  type="button"
                  onClick={() => setInputText("")}
                  className="text-[10px] text-stone-400 hover:text-red-600"
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
                placeholder="Draft a message or select a dispatch capsule above... (Press Enter to send, Shift+Enter for newline)"
                className="w-full text-xs p-3 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-400 focus:bg-white resize-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={sending || !inputText.trim()}
              className="px-4 py-3 bg-gradient-to-r from-emerald-800 to-emerald-900 hover:from-emerald-700 hover:to-emerald-800 border border-orange-400/40 text-white font-semibold text-xs rounded-xl shadow-xs disabled:opacity-50 transition-all flex items-center gap-1.5 shrink-0"
              title="Transmit Message"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5 text-orange-300" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
