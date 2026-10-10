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
    <div className="p-8 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 mb-1 tracking-tight">Assessment Question Repository</h1>
          <p className="text-stone-500 text-xs">Review, verify, and export standardized assessment question batteries.</p>
        </div>
        <button
          onClick={downloadJSON}
          className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2.5 rounded-lg transition-colors font-semibold text-xs shadow-xs"
        >
          <Download className="w-4 h-4" /> Export Repository JSON
        </button>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-6 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
          <div className="flex bg-stone-100 p-1 rounded-lg border border-stone-200 w-full md:w-auto">
            <button
              onClick={() => setActiveTab("mcq")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-xs transition-colors flex-1 md:flex-none justify-center ${
                activeTab === "mcq" ? "bg-emerald-800 text-white shadow-xs" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Conceptual MCQs ({mcqs.length})
            </button>
            <button
              onClick={() => setActiveTab("coding")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-xs transition-colors flex-1 md:flex-none justify-center ${
                activeTab === "coding" ? "bg-emerald-800 text-white shadow-xs" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Code className="w-3.5 h-3.5" /> Coding Challenges ({coding.length})
            </button>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by skill or prompt text..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-lg pl-9 pr-3.5 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-700 focus:bg-white"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4 w-48">Skill & Level</th>
                <th className="p-4">Prompt & Verification Answer</th>
                <th className="p-4 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {loading ? (
                <tr><td colSpan={3} className="p-8 text-center text-stone-400">Loading question repository...</td></tr>
              ) : activeTab === "mcq" ? (
                filteredMcqs.length === 0 ? (
                  <tr><td colSpan={3} className="p-8 text-center text-stone-400">No matching multiple-choice questions found.</td></tr>
                ) : (
                  filteredMcqs.map((q) => (
                    <tr key={q.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="p-4 align-top">
                        <span className="inline-block px-2.5 py-1 bg-stone-100 text-stone-800 font-semibold rounded-md text-[11px] border border-stone-200 mb-1.5">
                          {q.skill_name}
                        </span>
                        <div className="text-stone-500 text-[11px]">Difficulty Level {q.difficulty_level}</div>
                      </td>
                      <td className="p-4 align-top">
                        <p className="text-stone-900 font-medium text-xs mb-2 leading-relaxed">{q.question_base_text}</p>
                        <p className="text-emerald-800 text-[11px] font-mono font-semibold">Verified Solution: {q.correct_answer}</p>
                      </td>
                      <td className="p-4 align-top text-right">
                        <button className="p-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-600 border border-stone-200 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )
              ) : (
                filteredCoding.length === 0 ? (
                  <tr><td colSpan={3} className="p-8 text-center text-stone-400">No matching coding challenges found.</td></tr>
                ) : (
                  filteredCoding.map((q) => (
                    <tr key={q.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="p-4 align-top">
                        <span className="inline-block px-2.5 py-1 bg-stone-100 text-stone-800 font-semibold rounded-md text-[11px] border border-stone-200 mb-1.5">
                          {q.skill_name}
                        </span>
                        <div className="text-stone-500 text-[11px]">Difficulty Level {q.difficulty_level}</div>
                      </td>
                      <td className="p-4 align-top">
                        <p className="text-stone-900 font-medium text-xs mb-2 leading-relaxed">{q.question_base_text}</p>
                        <div className="text-stone-700 text-[11px] font-mono bg-stone-50 border border-stone-200 p-2.5 rounded-lg truncate max-w-xl">
                          {q.starter_code || "Standard solution template provided"}
                        </div>
                      </td>
                      <td className="p-4 align-top text-right">
                        <button className="p-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-600 border border-stone-200 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
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
