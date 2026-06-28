"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Bot, User, BrainCircuit, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { roadmapsApi } from "@/lib/roadmapsApi";

export default function RoadmapAnalysis({ roadmap }: { roadmap: any }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi there! I generated this roadmap for you. Do you have any questions about the choices I made, or how to get started?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const detailedAnalysis = roadmap?.roadmap_json?.detailed_analysis || "No detailed analysis was generated for this older roadmap.";

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
        setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "Network error occurred." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto mt-12 mb-24 flex flex-col lg:flex-row gap-8">
      {/* Left side: Static Analysis Report */}
      <div className="w-full lg:w-1/2 bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none" />
        
        <div className="flex items-center gap-3 mb-6 border-b border-slate-700/50 pb-4">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <Activity className="w-6 h-6 text-indigo-400" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">Market Analysis Report</h2>
        </div>

        <div className="prose prose-invert prose-indigo prose-sm max-w-none text-slate-300">
          <ReactMarkdown>{detailedAnalysis}</ReactMarkdown>
        </div>
      </div>

      {/* Right side: AI Career Assistant Chat */}
      <div className="w-full lg:w-1/2 bg-slate-900 border border-slate-700 rounded-2xl shadow-xl flex flex-col overflow-hidden relative h-[600px]">
        <div className="absolute inset-0 bg-gradient-to-bl from-orange-500/5 to-amber-500/5 pointer-events-none" />
        
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-700/50 bg-slate-800/50 flex items-center gap-3 z-10">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <BrainCircuit className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide leading-tight">AI Career Assistant</h2>
            <p className="text-xs text-slate-400">Ask about your roadmap</p>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 z-10 custom-scrollbar">
          {messages.map((msg, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-700">
                  <Bot className="w-4 h-4 text-orange-400" />
                </div>
              )}
              
              <div className={`max-w-[80%] rounded-2xl p-3 text-sm shadow-md ${
                msg.role === "user" 
                  ? "bg-orange-600 text-white rounded-tr-sm" 
                  : "bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-sm"
              }`}>
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 border border-orange-500/30">
                  <User className="w-4 h-4 text-orange-400" />
                </div>
              )}
            </motion.div>
          ))}
          
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-700">
                <Bot className="w-4 h-4 text-orange-400" />
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm p-4 flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400/50 animate-bounce" />
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400/50 animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400/50 animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-slate-900 border-t border-slate-700/50 z-10">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about these skills..."
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder-slate-500"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="absolute right-2 p-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:hover:bg-orange-600 rounded-lg text-white transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #334155;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
