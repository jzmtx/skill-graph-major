"use client";

import React, { useState, useEffect, use } from 'react';
import { getAdaptiveQuestion, submitAnswer, completeAssessment, getCodingQuestion, evaluateCode, simulateCode, reportQuestion } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { Target, ArrowLeft, CheckCircle2, XCircle, Code, Loader2, Brain, ShieldAlert, Flag, Terminal } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';

export default function AssessmentPage({ params }: { params: Promise<{ skill_name: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const skillName = decodeURIComponent(unwrappedParams.skill_name);
  
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState<any>(null);
  const [questionCount, setQuestionCount] = useState(1);
  const [difficulty, setDifficulty] = useState(1); // Starts at 1
  const [score, setScore] = useState(0);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{isCorrect: boolean, correctAnswer: string} | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [finalPassed, setFinalPassed] = useState(false);
  const [analytics, setAnalytics] = useState<string | null>(null);
  const [history, setHistory] = useState<{topic: string, is_correct: boolean, difficulty: number}[]>([]);
  const [studentCode, setStudentCode] = useState<string>('');
  const [executionOutput, setExecutionOutput] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  
  // Reporting state
  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const fetchNextQuestion = async (currentDiff: number, excludeIds: string[], count: number) => {
    try {
      setLoading(true);
      const studentId = localStorage.getItem('student_id');
      
      if (count > 10) {
        // Coding questions (11, 12)
        const diffType = count === 11 ? 'basic' : 'conceptual';
        const res = await getCodingQuestion({ skill_name: skillName, difficulty_type: diffType, student_id: studentId });
        setQuestion({ ...res, isCoding: true });
        setSelectedOption(null);
        setStudentCode(res.starter_code || '');
        setExecutionOutput(null);
        setFeedback(null);
      } else {
        // MCQs (1-10)
        const res = await getAdaptiveQuestion({
          skill_name: skillName,
          difficulty_level: currentDiff,
          student_id: studentId,
          exclude_question_ids: excludeIds
        });
        setQuestion(res);
        setSeenIds([...excludeIds, res.question_id]);
        setSelectedOption(null);
        setFeedback(null);
      }
    } catch (e) {
      console.error(e);
      handleFinish(score);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNextQuestion(difficulty, [], 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOptionSelect = (opt: string) => {
    if (!feedback && !isSubmitting) {
      setSelectedOption(opt);
    }
  };

  const handleRunCode = async () => {
    if (!studentCode.trim()) return;
    setIsExecuting(true);
    setExecutionOutput("Simulating code execution safely...");
    try {
      const res = await simulateCode({ skill_name: skillName, code: studentCode });
      setExecutionOutput(res.output || "Program finished with no output.");
    } catch (e) {
      console.error(e);
      setExecutionOutput("Error simulating code execution.");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSubmit = async () => {
    if (!question) return;
    if (!question.isCoding && !selectedOption) return;
    if (question.isCoding && !studentCode.trim()) return;
    
    setIsSubmitting(true);
    try {
      const studentId = localStorage.getItem('student_id');
      let isCorrect = false;
      let correctAns = "";
      let nextDiff = difficulty;
      
      if (question.isCoding) {
        const evalRes = await evaluateCode({
          skill_name: skillName,
          question_text: question.question_text,
          student_code: studentCode
        });
        isCorrect = evalRes.is_correct;
        correctAns = evalRes.feedback;
      } else {
        const res = await submitAnswer({
          student_id: studentId,
          skill_name: skillName,
          question_id: question.question_id,
          selected_option: selectedOption!,
          current_difficulty: difficulty
        });
        isCorrect = res.is_correct;
        correctAns = res.correct_answer;
        nextDiff = res.next_difficulty;
      }
      
      setFeedback({
        isCorrect: isCorrect,
        correctAnswer: correctAns
      });
      
      const topic = question.topic || (question.isCoding ? "Coding" : "General");
      const newHistory = [...history, { topic, is_correct: isCorrect, difficulty: question.isCoding ? 5 : difficulty }];
      setHistory(newHistory);
      
      let newScore = score;
      if (isCorrect) {
        newScore += (question.isCoding ? 50 : difficulty * 10);
        setScore(newScore);
      }
      
      setDifficulty(nextDiff);
      
      setTimeout(() => {
        if (questionCount >= 12) {
          handleFinish(newScore, newHistory);
        } else {
          setQuestionCount(c => c + 1);
          fetchNextQuestion(nextDiff, seenIds, questionCount + 1);
        }
        setIsSubmitting(false);
      }, question.isCoding ? 4000 : 2000); // Give more time to read coding feedback
      
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
    }
  };

  const handleReportSubmit = async () => {
    if (!reportReason.trim()) return;
    try {
      const studentId = localStorage.getItem('student_id');
      await reportQuestion({
        question_id: question.question_id || question.id || "unknown",
        student_id: studentId,
        reason: reportReason
      });
      setReportSubmitted(true);
      setTimeout(() => {
        setIsReporting(false);
        setReportSubmitted(false);
        setReportReason("");
      }, 2000);
    } catch (e) {
      console.error("Failed to report question", e);
    }
  };

  const handleFinish = async (finalScore: number, finalHistory = history) => {
    setIsFinished(true);
    setLoading(true);
    try {
      const studentId = localStorage.getItem('student_id');
      // Calculate percentage. Max possible: 10*50 + 2*50 = 600 pts
      const percentage = Math.min(100, Math.round((finalScore / 600) * 100)); 
      
      const res = await completeAssessment({
        student_id: studentId,
        skill_name: skillName,
        score_percentage: percentage,
        history: finalHistory
      });
      
      setFinalPassed(res.passed);
      if (res.analytics) setAnalytics(res.analytics);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (isFinished && !loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden p-8 text-center animate-in zoom-in-95 duration-500">
          <div className="flex justify-center mb-6">
            {finalPassed ? (
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                <Brain className="w-10 h-10" />
              </div>
            )}
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">
            {finalPassed ? "Level 1 Verified!" : "Assessment Complete"}
          </h2>
          <div className="mb-4">
            <span className="text-4xl font-black text-indigo-600">{score}</span>
            <span className="text-slate-400 font-medium"> / 600</span>
          </div>
          <p className="text-slate-500 mb-6">
            {finalPassed 
              ? `Congratulations! You scored high enough to verify your ${skillName} skills to Level 1. Your global skill score has increased.`
              : `You've established a baseline for ${skillName}. Keep practicing and try again later to increase your Level!`}
          </p>
          
          {analytics && (
            <div className="bg-slate-50 rounded-xl p-6 text-left border border-slate-200 mb-8">
              <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600" />
                Performance Analytics
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {analytics}
              </p>
            </div>
          )}
          <button 
            onClick={() => router.push('/dashboard')}
            className="w-full px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-bold text-slate-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              {skillName} Assessment
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-slate-500">
              Difficulty: <span className="text-indigo-600">Level {difficulty}</span>
            </div>
            <div className="w-32 bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${(questionCount / 12) * 100}%` }} />
            </div>
            <div className="text-sm font-bold text-slate-700">{questionCount} / 12</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl">
          {loading ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center animate-pulse">
              <div className="w-16 h-16 bg-slate-200 rounded-full mx-auto mb-6"></div>
              <div className="h-6 bg-slate-200 rounded w-1/2 mx-auto mb-4"></div>
              <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto text-slate-500">Generating adaptive question via Gemini...</div>
            </div>
          ) : question ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <div className="prose prose-slate max-w-none text-slate-800 mb-8 whitespace-pre-wrap">
                <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{question.question_text}</ReactMarkdown>
              </div>

              {question.isCoding ? (
                <div className="space-y-4" data-color-mode="dark">
                  <div className="rounded-xl overflow-hidden border border-slate-700 bg-[#1e1e1e] h-[250px]">
                    <Editor
                      height="100%"
                      defaultLanguage={skillName.toLowerCase() === 'c++' ? 'cpp' : (skillName.toLowerCase() === 'node.js' || skillName.toLowerCase() === 'react' || skillName.toLowerCase() === 'nextjs' ? 'javascript' : skillName.toLowerCase())}
                      theme="vs-dark"
                      value={studentCode}
                      onChange={(value) => setStudentCode(value || '')}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                        padding: { top: 16, bottom: 16 },
                        scrollBeyondLastLine: false,
                        readOnly: !!feedback || isSubmitting
                      }}
                    />
                  </div>
                  
                  {executionOutput && (
                    <div className="bg-black text-green-400 p-4 rounded-xl font-mono text-sm max-h-40 overflow-y-auto whitespace-pre-wrap">
                      <div className="text-slate-400 text-xs mb-1 uppercase tracking-wider">Console Output</div>
                      {executionOutput}
                    </div>
                  )}

                  {feedback && (
                    <div className={`p-4 rounded-xl flex items-start gap-3 ${feedback.isCorrect ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`}>
                      {feedback.isCorrect ? <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" /> : <XCircle className="w-6 h-6 text-red-500 shrink-0" />}
                      <div>
                        <div className="font-bold mb-1">{feedback.isCorrect ? "Correct!" : "Incorrect"}</div>
                        <div className="text-sm">{feedback.correctAnswer}</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {question.options.map((opt: string, i: number) => {
                    const isSelected = selectedOption === opt;
                    const showCorrect = feedback && feedback.correctAnswer === opt;
                    const showWrong = feedback && isSelected && !feedback.isCorrect;
                    
                    let optStyle = "border-slate-200 hover:border-indigo-300 hover:bg-slate-50";
                    if (isSelected && !feedback) optStyle = "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600";
                    if (showCorrect) optStyle = "border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500";
                    if (showWrong) optStyle = "border-red-500 bg-red-50 text-red-900 ring-1 ring-red-500";

                    return (
                      <button
                        key={i}
                        onClick={() => handleOptionSelect(opt)}
                        disabled={!!feedback || isSubmitting}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${optStyle}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium whitespace-pre-wrap"><ReactMarkdown rehypePlugins={[rehypeHighlight]}>{opt}</ReactMarkdown></span>
                          {showCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                          {showWrong && <XCircle className="w-5 h-5 text-red-500" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-8 flex justify-between items-center gap-4">
                <button
                  onClick={() => setIsReporting(true)}
                  className="text-slate-400 hover:text-red-500 text-sm font-medium flex items-center gap-1 transition-colors"
                >
                  <Flag className="w-4 h-4" /> Report Issue
                </button>
                <div className="flex gap-4">
                  {question.isCoding && (
                    <button
                      onClick={handleRunCode}
                      disabled={!studentCode.trim() || isSubmitting || !!feedback || isExecuting}
                      className="px-6 py-3 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-900 flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <Terminal className="w-4 h-4" /> {isExecuting ? "Running..." : "Run Code"}
                    </button>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={(question.isCoding ? !studentCode.trim() : !selectedOption) || isSubmitting || !!feedback}
                    className="px-8 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? "Submitting..." : feedback ? "Loading Next..." : "Submit Answer"}
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center text-slate-500">No question data found.</div>
          )}
        </div>
      </main>

      {/* Report Issue Modal */}
      {isReporting && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" /> Report Question Issue
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Is the correct answer missing, or is the question poorly formatted? Please describe the issue. Your score will be preserved while we review this question.
            </p>
            {reportSubmitted ? (
              <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5" />
                <span>Thank you! Your report has been submitted.</span>
              </div>
            ) : (
              <>
                <textarea
                  className="w-full h-32 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none resize-none mb-4"
                  placeholder="What is wrong with this question?"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                />
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => setIsReporting(false)}
                    className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleReportSubmit}
                    disabled={!reportReason.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    Submit Report
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
