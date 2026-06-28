"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { Download, Edit2, Code, FileText, Search } from "lucide-react";

export default function AdminQuestionsPage() {
  const [mcqs, setMcqs] = useState<any[]>([]);
  const [coding, setCoding] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"mcq" | "coding">("mcq");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const data = await adminApi.getQuestions();
      setMcqs(data.mcqs || []);
      setCoding(data.coding_questions || []);
    } catch (error) {
      console.error("Failed to fetch questions", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadJSON = () => {
    const dataStr = JSON.stringify({ mcqs, coding_questions: coding }, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.download = "skillgraph_question_bank.json";
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredMcqs = mcqs.filter(q => 
    q.skill_name.toLowerCase().includes(search.toLowerCase()) || 
    q.question_base_text.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCoding = coding.filter(q => 
    q.skill_name.toLowerCase().includes(search.toLowerCase()) || 
    q.question_base_text.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Question Bank</h1>
          <p className="text-slate-400">Audit and export AI-generated questions.</p>
        </div>
        <button
          onClick={downloadJSON}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl transition-colors font-medium"
        >
          <Download className="w-5 h-5" /> Export JSON Backup
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab("mcq")}
              className={`flex items-center gap-2 px-6 py-2 rounded-md font-medium transition-all ${
                activeTab === "mcq" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4" /> MCQs ({mcqs.length})
            </button>
            <button
              onClick={() => setActiveTab("coding")}
              className={`flex items-center gap-2 px-6 py-2 rounded-md font-medium transition-all ${
                activeTab === "coding" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              <Code className="w-4 h-4" /> Coding ({coding.length})
            </button>
          </div>
          
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by skill or text..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 text-sm">
              <tr>
                <th className="p-4 font-medium w-48">Skill & Level</th>
                <th className="p-4 font-medium">Question Text</th>
                <th className="p-4 font-medium w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr><td colSpan={3} className="p-8 text-center text-slate-500">Loading bank...</td></tr>
              ) : activeTab === "mcq" ? (
                filteredMcqs.length === 0 ? (
                  <tr><td colSpan={3} className="p-8 text-center text-slate-500">No MCQs found.</td></tr>
                ) : (
                  filteredMcqs.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-800/50">
                      <td className="p-4">
                        <span className="inline-block px-3 py-1 bg-indigo-500/10 text-indigo-400 font-medium rounded-full text-sm border border-indigo-500/20 mb-2">
                          {q.skill_name}
                        </span>
                        <div className="text-slate-400 text-xs">Level {q.difficulty_level}</div>
                      </td>
                      <td className="p-4">
                        <p className="text-white text-sm mb-2 line-clamp-2">{q.question_base_text}</p>
                        <p className="text-emerald-400 text-xs font-mono">Answer: {q.correct_answer}</p>
                      </td>
                      <td className="p-4">
                        <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )
              ) : (
                filteredCoding.length === 0 ? (
                  <tr><td colSpan={3} className="p-8 text-center text-slate-500">No Coding questions found.</td></tr>
                ) : (
                  filteredCoding.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-800/50">
                      <td className="p-4">
                        <span className="inline-block px-3 py-1 bg-purple-500/10 text-purple-400 font-medium rounded-full text-sm border border-purple-500/20 mb-2">
                          {q.skill_name}
                        </span>
                        <div className="text-slate-400 text-xs">Level {q.difficulty_level}</div>
                      </td>
                      <td className="p-4">
                        <p className="text-white text-sm mb-2 line-clamp-2">{q.question_base_text}</p>
                        <div className="text-slate-500 text-xs font-mono bg-slate-950 p-2 rounded truncate max-w-lg">
                          {q.starter_code || "No starter code"}
                        </div>
                      </td>
                      <td className="p-4">
                        <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
