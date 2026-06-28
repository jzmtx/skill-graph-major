"use client";

import React, { useState, use } from 'react';
import { verifyProjectRepo, submitProjectInterview, getProjectIdea } from '@/lib/api';
import { ArrowLeft, CheckCircle2, Send, Terminal, Loader2, XCircle, ShieldAlert, Brain, Lightbulb, Code2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Editor } from '@monaco-editor/react';

export default function ProjectVerificationPage({ params }: { params: Promise<{ skill_name: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const skillName = decodeURIComponent(unwrappedParams.skill_name);
  
  const [step, setStep] = useState(0); // 0: Idea, 1: URL, 2: Interview, 3: Result
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [projectIdea, setProjectIdea] = useState('');
  const [projectAbstract, setProjectAbstract] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  const [result, setResult] = useState<{passed: boolean, feedback: string} | null>(null);

  const handleGenerateIdea = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getProjectIdea({ skill_name: skillName });
      setProjectIdea(res.idea);
    } catch (e: any) {
      setError("Failed to generate project idea.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl.includes("github.com")) {
      setError("Please enter a valid GitHub repository URL.");
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const studentId = localStorage.getItem('student_id');
      const res = await verifyProjectRepo({
        student_id: studentId,
        skill_name: skillName,
        github_url: githubUrl,
        project_abstract: projectAbstract
      });
      
      setQuestions(res.questions);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setStep(2);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to analyze repository. Check if it's public.");
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuestion = () => {
    const currentQ = questions[currentQuestionIndex];
    if (!answers[currentQ.id] || answers[currentQ.id].trim().length < 10) {
      setError("Please provide a more detailed answer before continuing.");
      return;
    }
    setError('');
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleSubmitInterview();
    }
  };

  const handleSubmitInterview = async () => {
    setLoading(true);
    setError('');
    
    try {
      const studentId = localStorage.getItem('student_id');
      
      const qa_pairs = questions.map(q => ({
        question: q.text,
        answer: answers[q.id] || ""
      }));
      
      const res = await submitProjectInterview({
        student_id: studentId,
        skill_name: skillName,
        github_url: githubUrl,
        qa_pairs: qa_pairs
      });
      
      setResult(res);
      setStep(3);
    } catch (e) {
      console.error(e);
      setError("Failed to submit interview.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-bold text-slate-800 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-600" />
              Level 2 Project Verification: {skillName}
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Progress Bar */}
          <div className="flex">
            <div className={`h-1.5 flex-1 ${step >= 1 ? 'bg-indigo-600' : 'bg-slate-100'}`} />
            <div className={`h-1.5 flex-1 ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-100'}`} />
            <div className={`h-1.5 flex-1 ${step >= 3 ? 'bg-emerald-500' : 'bg-slate-100'}`} />
          </div>

          <div className="p-8">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 flex items-start gap-2">
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Step 0: Idea Generation */}
            {step === 0 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">The Level 2 Challenge</h2>
                <p className="text-slate-500 mb-6">
                  To achieve Level 2 verification in {skillName}, you must prove your ability to architect and build a real-world project. Not sure what to build? Let our AI recommend a challenging project spec for you!
                </p>
                
                {!projectIdea ? (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl mb-6 bg-slate-50">
                    <Lightbulb className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <button
                      onClick={handleGenerateIdea}
                      disabled={loading}
                      className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                    >
                      {loading ? "Generating Idea..." : "Generate Project Spec"}
                    </button>
                  </div>
                ) : (
                  <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-xl mb-6">
                    <h3 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                      <Terminal className="w-5 h-5 text-indigo-600" />
                      Your Mission
                    </h3>
                    <p className="text-indigo-800 whitespace-pre-wrap">{projectIdea}</p>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-6 text-center">
                  <p className="text-sm text-slate-500 mb-4">Already built this, or something similar?</p>
                  <button
                    onClick={() => setStep(1)}
                    className="w-full px-6 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    I'm Ready! Submit GitHub Repo
                  </button>
                </div>
              </div>
            )}

            {/* Step 1: GitHub URL */}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Submit your {skillName} Project</h2>
                <p className="text-slate-500 mb-8">
                  To achieve Level 2 verification, provide a public GitHub repository where you extensively used {skillName}. Our AI will analyze the codebase.
                </p>
                
                <form onSubmit={handleVerifyUrl} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">GitHub Repository URL</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <input 
                        type="url" required placeholder="https://github.com/username/project"
                        className="w-full pl-10 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={githubUrl} onChange={e => setGithubUrl(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Project Abstract / Introduction</label>
                    <textarea 
                      required placeholder="Briefly describe what this project does and your architectural approach..."
                      className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24"
                      value={projectAbstract} onChange={e => setProjectAbstract(e.target.value)}
                    />
                  </div>
                  
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={loading || !githubUrl}
                      className="w-full flex items-center justify-center px-6 py-3.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Analyzing Codebase...</> : "Scan Project & Generate Interview"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 2: The Interview */}
            {step === 2 && questions.length > 0 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center mb-4">
                  <div className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase tracking-wider">
                    Anti-Plagiarism Check
                  </div>
                  <div className="text-sm font-medium text-slate-500">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </div>
                </div>
                
                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  {questions[currentQuestionIndex].type === 'coding' ? <Code2 className="w-6 h-6 text-indigo-600" /> : <Brain className="w-6 h-6 text-indigo-600" />}
                  {questions[currentQuestionIndex].type === 'coding' ? 'Coding Challenge' : 'Explain your code'}
                </h2>
                
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
                  <p className="text-slate-800 font-medium leading-relaxed">
                    {questions[currentQuestionIndex].text}
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {questions[currentQuestionIndex].type === 'coding' ? 'Your Code Snippet' : 'Your Answer (Be specific to your codebase)'}
                    </label>
                    {questions[currentQuestionIndex].type === 'coding' ? (
                      <div className="border border-slate-300 rounded-xl overflow-hidden h-64">
                        <Editor
                          height="100%"
                          defaultLanguage="javascript"
                          value={answers[questions[currentQuestionIndex].id] || ""}
                          onChange={(val) => setAnswers({...answers, [questions[currentQuestionIndex].id]: val || ""})}
                          options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            lineNumbers: "on",
                            scrollBeyondLastLine: false,
                            padding: { top: 16, bottom: 16 }
                          }}
                        />
                      </div>
                    ) : (
                      <textarea 
                        rows={6} required placeholder="Explain your approach, the files involved, and why you made those architectural decisions..."
                        className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                        value={answers[questions[currentQuestionIndex].id] || ""} 
                        onChange={e => setAnswers({...answers, [questions[currentQuestionIndex].id]: e.target.value})}
                      />
                    )}
                  </div>
                  
                  <div className="pt-2">
                    <button
                      onClick={handleNextQuestion}
                      disabled={loading || !answers[questions[currentQuestionIndex].id] || answers[questions[currentQuestionIndex].id].trim().length < 10}
                      className="w-full flex items-center justify-center px-6 py-3.5 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                      {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Evaluating...</> : (
                        currentQuestionIndex < questions.length - 1 
                          ? "Next Question" 
                          : <><Send className="w-4 h-4 mr-2" /> Submit Interview</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Results */}
            {step === 3 && result && (
              <div className="text-center animate-in zoom-in-95 duration-500 py-6">
                <div className="flex justify-center mb-6">
                  {result.passed ? (
                    <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-12 h-12" />
                    </div>
                  ) : (
                    <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                      <XCircle className="w-12 h-12" />
                    </div>
                  )}
                </div>
                
                <h2 className="text-3xl font-bold text-slate-800 mb-2">
                  {result.passed ? "Level 2 Verified!" : "Verification Failed"}
                </h2>
                
                <div className={`mt-6 p-4 rounded-xl text-left ${result.passed ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'}`}>
                  <p className="font-medium mb-1">AI Senior Engineer Feedback:</p>
                  <p className="text-sm opacity-90">{result.feedback}</p>
                </div>
                
                <button 
                  onClick={() => router.push('/dashboard')}
                  className="w-full mt-8 px-6 py-3.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
            
          </div>
        </div>
      </main>
    </div>
  );
}
