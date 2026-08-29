"use client";

import React, { useState, useEffect, use } from 'react';
import { getAdaptiveQuestion, submitAnswer, completeAssessment, getCodingQuestion, evaluateCode, simulateCode, reportQuestion } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { Target, ArrowLeft, CheckCircle2, XCircle, Code, Loader2, Brain, ShieldAlert, Flag, Terminal, EyeOff, Timer } from 'lucide-react';
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
  const [timeLeft, setTimeLeft] = useState(60);
  
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

  // Proctoring state
  const MAX_VIOLATIONS = 3;
  const [violations, setViolations] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [proctorFailed, setProctorFailed] = useState(false);
  const lastViolationTime = React.useRef(0);

  useEffect(() => {
    if (isFinished || proctorFailed) return;

    const handleViolation = () => {
      if (document.hidden || !document.hasFocus()) {
        const now = Date.now();
        if (now - lastViolationTime.current < 3000) return; // 3 second cooldown to prevent double-counting
        lastViolationTime.current = now;

        setViolations(prev => {
          const next = prev + 1;
          if (next >= MAX_VIOLATIONS) {
            setProctorFailed(true);
            handleFinish(score, history, true);
          } else {
            setShowWarning(true);
          }
          return next;
        });
      }
    };

    document.addEventListener("visibilitychange", handleViolation);
    window.addEventListener("blur", handleViolation);

    return () => {
      document.removeEventListener("visibilitychange", handleViolation);
      window.removeEventListener("blur", handleViolation);
    };
  }, [isFinished, score, history, proctorFailed]);

  useEffect(() => {
    if (timeLeft <= 0 || isSubmitting || !!feedback || !question || isFinished || loading) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer);
          handleSubmit(true); // timeout submission
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isSubmitting, feedback, question, isFinished, loading]);

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
        if (count > 10) {
          setTimeLeft(300); // 5 minutes for coding
        } else {
          setTimeLeft(30 + (currentDiff * 15)); // 45s to 105s based on level
        }
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

  const handleSubmit = async (isTimeout = false) => {
    if (!question) return;
    if (isTimeout !== true) {
      if (!question.isCoding && !selectedOption) return;
      if (question.isCoding && !studentCode.trim()) return;
    }
    
    setIsSubmitting(true);
    try {
      const studentId = localStorage.getItem('student_id');
      let isCorrect = false;
      let correctAns = "";
      let nextDiff = difficulty;
      
      if (question.isCoding) {
        if (isTimeout) {
          isCorrect = false;
          correctAns = "Time's up! No code was evaluated.";
          nextDiff = difficulty; // Don't change diff for coding timeouts usually, they are fixed
        } else {
          const evalRes = await evaluateCode({
            skill_name: skillName,
            question_text: question.question_text,
            student_code: studentCode
          });
          isCorrect = evalRes.is_correct;
          correctAns = evalRes.feedback;
        }
      } else {
        const res = await submitAnswer({
          student_id: studentId,
          skill_name: skillName,
          question_id: question.question_id,
          selected_option: isTimeout ? "[TIMEOUT]" : selectedOption!,
          current_difficulty: difficulty
        });
        isCorrect = res.is_correct;
        correctAns = isTimeout ? "Time's up! The correct answer was: " + res.correct_answer : res.correct_answer;
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

  const handleFinish = async (finalScore: number, finalHistory = history, failedProctoring = false) => {
    setIsFinished(true);
    setLoading(true);
    try {
      const studentId = localStorage.getItem('student_id');
      // Calculate percentage. Max possible: 10*50 + 2*50 = 600 pts
      const percentage = failedProctoring ? 0 : Math.min(100, Math.round((finalScore / 600) * 100)); 
      
      const res = await completeAssessment({
        student_id: studentId,
        skill_name: skillName,
        score_percentage: percentage,
        history: finalHistory
      });
      
      setFinalPassed(failedProctoring ? false : res.passed);
      if (failedProctoring) {
        setAnalytics("Assessment failed automatically due to proctoring violations (tab switching or leaving the test window).");
      } else if (res.analytics) {
        setAnalytics(res.analytics);
      }
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
            <span className="text-4xl font-black text-indigo-600">{proctorFailed ? 0 : score}</span>
            <span className="text-slate-400 font-medium"> / 600</span>
          </div>
          <p className="text-slate-500 mb-6">
            {proctorFailed
              ? `Your assessment was terminated because you left the testing window ${MAX_VIOLATIONS} times. Proctored exams require full focus.`
              : finalPassed 
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
            <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${timeLeft < 15 ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-indigo-50 border-indigo-200 text-indigo-600'}`}>
              <Timer className="w-3.5 h-3.5" />
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${violations > 0 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
              <ShieldAlert className="w-3.5 h-3.5" />
              {MAX_VIOLATIONS - violations} Warnings Left
            </div>
            <div className="text-sm font-medium text-slate-500">
              Difficulty: <span className="text-indigo-600">Level {difficulty}</span>
            </div>
            <div className="w-24 md:w-32 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
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
                    onClick={() => handleSubmit(false)}
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

      {/* Proctor Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-red-950/90 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl text-center animate-in zoom-in-95">
            <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <EyeOff className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-3">Proctor Warning!</h2>
            <p className="text-slate-600 text-lg mb-6 leading-relaxed">
              We detected that you switched tabs or clicked outside the testing window. This is a proctored assessment. 
            </p>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
              <p className="text-red-700 font-bold">
                Violation {violations} of {MAX_VIOLATIONS}.
              </p>
              <p className="text-red-600 text-sm mt-1">
                If you leave the window {MAX_VIOLATIONS - violations} more time(s), you will automatically fail this assessment.
              </p>
            </div>
            <button 
              onClick={() => setShowWarning(false)}
              className="w-full py-4 bg-red-600 text-white font-black text-lg rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
            >
              I Understand, Return to Test
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
