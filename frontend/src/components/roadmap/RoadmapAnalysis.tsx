"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Activity, BookOpen, Compass } from "lucide-react";
import { motion } from "framer-motion";
import { roadmapsApi } from "@/lib/roadmapsApi";

export default function RoadmapAnalysis({ roadmap }: { roadmap: any }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Welcome! I have sequenced this career curriculum based on real-time industry job data. Feel free to ask about any milestone, prerequisites, or preparation strategies." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const detailedAnalysis = roadmap?.roadmap_json?.detailed_analysis || "Detailed competency analysis mapped to target career specifications.";

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const data = await roadmapsApi.chatWithRoadmap(roadmap.id, [...messages, userMessage]);
      
      if (data && data.reply) {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "Unable to process the query. Please retry." }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "Network communication issue occurred." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto mt-10 mb-16 flex flex-col lg:flex-row gap-6">
      {/* Left side: Static Analysis Report */}
      <div className="w-full lg:w-1/2 bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5 border-b border-stone-200 pb-3">
          <div className="p-1.5 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800">
            <Activity className="w-4 h-4" />
          </div>
          <h2 className="text-base font-bold text-stone-900">Curriculum Market Analysis</h2>
        </div>

        <div className="prose prose-stone prose-sm max-w-none text-stone-700 leading-relaxed overflow-y-auto max-h-[500px] pr-2">
          <ReactMarkdown>{detailedAnalysis}</ReactMarkdown>
        </div>
      </div>

      {/* Right side: Academic Career Advisor Chat with Warm Orange Accents & Quick Options */}
      <div className="w-full lg:w-1/2 bg-white border border-stone-200 rounded-xl shadow-sm flex flex-col overflow-hidden h-[580px] relative">
        {/* Subtle Orange Accent Top Trim */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-700 via-orange-500 to-amber-500" />

        {/* Chat Header */}
        <div className="p-4 border-b border-stone-200 bg-stone-50/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white border border-orange-200 flex items-center justify-center text-stone-700 shadow-2xs relative">
              <Compass className="w-4 h-4 text-emerald-800" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
              </span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900 leading-tight">Curriculum Advisor</h2>
              <p className="text-[11px] text-stone-500">Ask questions regarding milestones & preparation</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-900 border border-orange-200">
            Interactive AI Mode
          </span>
        </div>

        {/* Quick Strategy Prompts Pills */}
        <div className="px-3.5 py-2 border-b border-stone-100 bg-stone-50/50 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {[
            { label: "Prerequisites Check", text: "What foundational math or programming skills are recommended before starting Phase 1?" },
            { label: "Time-to-Hire", text: "What is an estimated timeline to reach job readiness given 15 hours per week of study?" },
            { label: "Capstone Ideas", text: "Could you suggest 2 high-impact capstone portfolio projects for this curriculum?" },
            { label: "Industry Tools", text: "Which libraries and production tools in this roadmap are currently in highest demand?" }
          ].map((prompt, pIdx) => (
            <button
              key={pIdx}
              type="button"
              onClick={() => setInput(prompt.text)}
              className="shrink-0 px-2.5 py-1 bg-white border border-stone-200 hover:border-orange-300 hover:bg-orange-50/40 text-[10px] font-medium text-stone-700 hover:text-orange-950 rounded-lg transition-all shadow-2xs"
            >
              {prompt.label}
            </button>
          ))}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/40">
          {messages.map((m, idx) => (
            <div 
              key={idx} 
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[85%] rounded-xl px-4 py-2.5 text-xs leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-emerald-800 text-white font-medium rounded-tr-xs' 
                    : 'bg-white border border-stone-200 text-stone-800 shadow-2xs rounded-tl-xs border-l-[3px] border-l-orange-500'
                }`}
              >
                <div className={`prose prose-xs ${m.role === 'user' ? 'text-white prose-invert' : 'text-stone-800'}`}>
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-xs text-stone-500 shadow-2xs flex items-center gap-2 border-l-[3px] border-l-orange-500">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                Synthesizing curriculum guidance...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-stone-200 bg-white">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
            className="flex items-center gap-2"
          >
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about prerequisites or timeline..."
              className="flex-1 bg-stone-50 border border-stone-300 text-stone-900 placeholder:text-stone-400 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-400 focus:bg-white transition-all"
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-emerald-800 to-emerald-900 border border-orange-400/40 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 text-white p-2.5 rounded-xl transition-all shadow-xs"
              title="Transmit query"
            >
              <Send className="w-3.5 h-3.5 text-orange-200" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
