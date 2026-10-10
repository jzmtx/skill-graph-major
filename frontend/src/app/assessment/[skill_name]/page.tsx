"use client";

import React, { useState, useEffect, use } from 'react';
import { getAdaptiveQuestion, submitAnswer, completeAssessment, getCodingQuestion, evaluateCode, simulateCode, reportQuestion } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
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
  const [difficulty, setDifficulty] = useState(1);
  const [score, setScore] = useState(0);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(60);
  
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluationPhase, setEvaluationPhase] = useState<'idle' | 'evaluating' | 'fetching' | 'ready'>('idle');
  const [feedback, setFeedback] = useState<{isCorrect: boolean, correctAnswer: string, explanation?: string} | null>(null);
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
        if (now - lastViolationTime.current < 3000) return;
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
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isSubmitting, feedback, question, isFinished, loading]);

  const fetchNextQuestion = async (currentDiff: number, excludeIds: string[], count: number) => {
    try {
      if (count === 1) setLoading(true);
      const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
      
      if (count === 6 || count === 12) {
        const codingQ = await getCodingQuestion({
          skill_name: skillName,
          difficulty_type: currentDiff.toString(),
          student_id: studentId || null,
        });
        if (codingQ && codingQ.question_text) {
          setQuestion({ ...codingQ, isCoding: true });
          setStudentCode(codingQ.starter_code || '# Write your solution here\n');
          setSeenIds(prev => [...prev, codingQ.question_id || codingQ.id]);
          setSelectedOption(null);
          setTimeLeft(120);
          setLoading(false);
          return;
        }
      }

      const q = await getAdaptiveQuestion({
        skill_name: skillName,
        difficulty_level: currentDiff,
        exclude_question_ids: excludeIds,
        student_id: studentId || null,
      });
      if (q && q.question_text) {
        setQuestion(q);
        setSeenIds(prev => [...prev, q.question_id]);
        setSelectedOption(null);
        setTimeLeft(60);
      } else {
        handleFinish(score, history);
      }
    } catch (e) {
      console.error(e);
      if (count === 1) handleFinish(score, history);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNextQuestion(difficulty, [], 1);
  }, [skillName]);

  const handleOptionSelect = (opt: string) => {
    if (feedback || isSubmitting) return;
    setSelectedOption(opt);
  };

  const handleRunCode = async () => {
    if (!studentCode.trim() || isExecuting) return;
    setIsExecuting(true);
    setExecutionOutput(null);
    try {
      const res = await simulateCode({
        code: studentCode,
        language: skillName.toLowerCase() === 'c++' ? 'cpp' : (skillName.toLowerCase() === 'node.js' || skillName.toLowerCase() === 'react' || skillName.toLowerCase() === 'nextjs' ? 'javascript' : skillName.toLowerCase())
      });
      setExecutionOutput(res.output || "Program finished with code 0.");
    } catch (e) {
      setExecutionOutput("Execution failed or timed out.");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSubmit = async (isTimeout = false) => {
    if (isSubmitting || !!feedback) return;
    if (!question.isCoding && !selectedOption && !isTimeout) return;
    if (question.isCoding && !studentCode.trim() && !isTimeout) return;

    setIsSubmitting(true);
    setEvaluationPhase('evaluating');

    try {
      const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
      let isCorrect = false;
      let correctAns = "";
      let explanation = "";
      let nextDiff = difficulty;

      if (question.isCoding) {
        if (isTimeout) {
          isCorrect = false;
          correctAns = "Time expired.";
          explanation = "You did not complete the code within the allocated time.";
        } else {
          const evalRes = await evaluateCode({
            skill_name: skillName,
            question_text: question.question_text,
            student_code: studentCode,
          });
          isCorrect = evalRes.is_correct;
          correctAns = evalRes.feedback;
          explanation = "Code evaluated successfully against test fixtures.";
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
        correctAns = isTimeout ? "Time expired. The correct answer was: " + res.correct_answer : res.correct_answer;
        nextDiff = res.next_difficulty;
        explanation = res.explanation || explanation;
      }
      
      setFeedback({
        isCorrect: isCorrect,
        correctAnswer: correctAns,
        explanation: explanation
      });
      
      setEvaluationPhase('fetching');
      
      const topic = question.topic || (question.isCoding ? "Coding" : "General");
      const newHistory = [...history, { topic, is_correct: isCorrect, difficulty: question.isCoding ? 5 : difficulty }];
      setHistory(newHistory);
      
      let newScore = score;
      if (isCorrect) {
        newScore += (question.isCoding ? 50 : difficulty * 10);
        setScore(newScore);
      }
      
      setDifficulty(nextDiff);
      
      if (questionCount < 12) {
        setQuestionCount(c => c + 1);
        await fetchNextQuestion(nextDiff, seenIds, questionCount + 1);
      } else {
        setQuestionCount(13);
      }
      
      setEvaluationPhase('ready');
      setIsSubmitting(false);
      
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
    }
  };

  const handleContinue = () => {
    if (questionCount > 12) {
      handleFinish(score, history);
    } else {
      setEvaluationPhase('idle');
      setFeedback(null);
    }
  };

  const handleReportSubmit = async () => {
    if (!reportReason.trim()) return;
    try {
      const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
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
      const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
      const percentage = failedProctoring ? 0 : Math.min(100, Math.round((finalScore / 600) * 100)); 
      
      const res = await completeAssessment({
        student_id: studentId,
        skill_name: skillName,
        score_percentage: percentage,
        history: finalHistory
      });
      
      setFinalPassed(failedProctoring ? false : res.passed);
      if (failedProctoring) {
        setAnalytics("Assessment concluded due to proctoring window interruptions.");
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
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-xl border border-stone-200 shadow-sm p-8 text-center animate-in zoom-in-95 duration-200">
          <div className="flex justify-center mb-4">
            {finalPassed ? (
              <div className="w-16 h-16 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-stone-100 text-stone-700 border border-stone-200 rounded-full flex items-center justify-center">
                <Brain className="w-8 h-8" />
              </div>
            )}
          </div>
          <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2">
            {finalPassed ? "Level 1 Verified!" : "Assessment Completed"}
          </h2>
          <div className="mb-4">
            <span className="text-3xl font-black text-emerald-800">{proctorFailed ? 0 : score}</span>
            <span className="text-stone-400 font-medium"> / 600</span>
          </div>
          <p className="text-stone-600 text-xs leading-relaxed mb-6">
            {proctorFailed
              ? `Your assessment concluded due to window focus violations. Formal evaluations require uninterrupted attention.`
              : finalPassed 
                ? `Congratulations! You scored high enough to achieve Level 1 verification in ${skillName}. Your Hireability index has updated.`
                : `Baseline established for ${skillName}. Practice further and re-attempt to advance verification.`}
          </p>
          
          {analytics && (
            <div className="bg-stone-50 rounded-lg p-4 text-left border border-stone-200 mb-6">
              <h3 className="font-bold text-stone-800 text-xs mb-1.5 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-800" />
                Performance Diagnostics
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                {analytics}
              </p>
            </div>
          )}
          <button 
            onClick={() => router.push('/dashboard')}
            className="w-full px-5 py-2.5 bg-emerald-800 text-white font-semibold text-xs rounded-lg hover:bg-emerald-900 transition-colors shadow-2xs"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (evaluationPhase !== 'idle') {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-xl bg-white rounded-xl shadow-sm border border-stone-200 p-8 text-center animate-in zoom-in-95 duration-150">
           {evaluationPhase === 'evaluating' && (
              <>
                 <Loader2 className="w-12 h-12 text-emerald-800 animate-spin mx-auto mb-4" />
                 <h2 className="text-xl font-bold text-stone-900 mb-1">Evaluating submission...</h2>
                 <p className="text-stone-500 text-xs">Validating criteria against assessment model...</p>
              </>
           )}
           {(evaluationPhase === 'fetching' || evaluationPhase === 'ready') && feedback && (
              <>
                 <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 border ${feedback.isCorrect ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {feedback.isCorrect ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                 </div>
                 <h2 className={`text-xl font-bold mb-3 ${feedback.isCorrect ? 'text-emerald-900' : 'text-red-900'}`}>
                    {feedback.isCorrect ? 'Accurate Response' : 'Incorrect Response'}
                 </h2>
                 {!feedback.isCorrect && (
                    <div className="bg-stone-50 border border-stone-200 text-stone-800 p-3 rounded-lg mb-4 text-xs font-medium text-left">
                       <strong>Correct Resolution:</strong> {feedback.correctAnswer}
                    </div>
                 )}
                 <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 text-stone-700 text-left mb-6 text-xs leading-relaxed">
                    <ReactMarkdown>{feedback.explanation || ''}</ReactMarkdown>
                 </div>
                 
                 {evaluationPhase === 'fetching' ? (
                    <div className="flex items-center justify-center gap-2 text-stone-500 font-medium text-xs">
                       <Loader2 className="w-4 h-4 animate-spin text-emerald-800" /> Synthesizing next question...
                    </div>
                 ) : (
                    <button onClick={handleContinue} className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs">
                       Proceed to Next Item
                    </button>
                 )}
              </>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-stone-400 hover:text-stone-700 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-800" />
              {skillName} Assessment
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md border ${timeLeft < 15 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-stone-100 border-stone-200 text-stone-700'}`}>
              <Timer className="w-3.5 h-3.5" />
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md border bg-stone-100 border-stone-200 text-stone-700">
              <ShieldAlert className="w-3.5 h-3.5 text-stone-500" />
              {MAX_VIOLATIONS - violations} Warnings
            </div>
            <div className="text-xs font-medium text-stone-500">
              Level <span className="text-stone-900 font-bold">{difficulty}</span>
            </div>
            <div className="w-24 bg-stone-200 h-1.5 rounded-full overflow-hidden hidden sm:block">
              <div className="bg-emerald-800 h-full transition-all duration-300" style={{ width: `${(questionCount / 12) * 100}%` }} />
            </div>
            <div className="text-xs font-bold text-stone-800">{questionCount} / 12</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl">
          {loading && !question ? (
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-12 text-center">
              <Loader2 className="w-8 h-8 text-emerald-800 animate-spin mx-auto mb-3" />
              <div className="text-xs text-stone-500">Synthesizing adaptive question...</div>
            </div>
          ) : question ? (
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 md:p-8 animate-in fade-in duration-200">
              
              <div className="text-stone-900 mb-6 text-sm leading-relaxed font-medium">
                <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{question.question_text}</ReactMarkdown>
              </div>

              {question.isCoding ? (
                <div className="space-y-3">
                  <div className="rounded-lg overflow-hidden border border-stone-300 h-[240px]">
                    <Editor
                      height="100%"
                      defaultLanguage={skillName.toLowerCase() === 'c++' ? 'cpp' : (skillName.toLowerCase() === 'node.js' || skillName.toLowerCase() === 'react' || skillName.toLowerCase() === 'nextjs' ? 'javascript' : skillName.toLowerCase())}
                      theme="light"
                      value={studentCode}
                      onChange={(value) => setStudentCode(value || '')}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        padding: { top: 12, bottom: 12 },
                        scrollBeyondLastLine: false,
                        readOnly: !!feedback || isSubmitting
                      }}
                    />
                  </div>
                  
                  {executionOutput && (
                    <div className="bg-stone-100 border border-stone-200 text-stone-800 p-3 rounded-lg font-mono text-xs max-h-36 overflow-y-auto whitespace-pre-wrap">
                      <div className="text-stone-500 text-[10px] uppercase font-bold tracking-wider mb-1">Execution Output</div>
                      {executionOutput}
                    </div>
                  )}

                  {feedback && (
                    <div className={`p-3 rounded-lg flex items-start gap-2 border text-xs ${feedback.isCorrect ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'}`}>
                      {feedback.isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />}
                      <div>
                        <div className="font-bold">{feedback.isCorrect ? "Correct Solution" : "Evaluation Failed"}</div>
                        <div>{feedback.correctAnswer}</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {question.options.map((opt: string, i: number) => {
                    const isSelected = selectedOption === opt;
                    const showCorrect = feedback && feedback.correctAnswer === opt;
                    const showWrong = feedback && isSelected && !feedback.isCorrect;
                    
                    let optStyle = "border-stone-200 hover:border-stone-400 bg-white text-stone-800";
                    if (isSelected && !feedback) optStyle = "border-emerald-800 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-800";
                    if (showCorrect) optStyle = "border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600";
                    if (showWrong) optStyle = "border-red-500 bg-red-50 text-red-950 ring-1 ring-red-500";

                    return (
                      <button
                        key={i}
                        onClick={() => handleOptionSelect(opt)}
                        disabled={!!feedback || isSubmitting}
                        className={`w-full text-left p-3.5 rounded-lg border transition-all text-xs ${optStyle}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium whitespace-pre-wrap leading-relaxed"><ReactMarkdown rehypePlugins={[rehypeHighlight]}>{opt}</ReactMarkdown></span>
                          {showCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />}
                          {showWrong && <XCircle className="w-4 h-4 text-red-700 shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-stone-100 flex justify-between items-center gap-3">
                <button
                  onClick={() => setIsReporting(true)}
                  className="text-stone-400 hover:text-stone-700 text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <Flag className="w-3.5 h-3.5" /> Report Issue
                </button>
                <div className="flex gap-2">
                  {question.isCoding && (
                    <button
                      onClick={handleRunCode}
                      disabled={!studentCode.trim() || isSubmitting || !!feedback || isExecuting}
                      className="px-4 py-2 bg-stone-100 border border-stone-300 text-stone-800 text-xs font-semibold rounded-lg hover:bg-stone-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Terminal className="w-3.5 h-3.5" /> {isExecuting ? "Executing..." : "Execute"}
                    </button>
                  )}
                  <button
                    onClick={() => handleSubmit(false)}
                    disabled={(question.isCoding ? !studentCode.trim() : !selectedOption) || isSubmitting || !!feedback}
                    className="px-6 py-2 bg-emerald-800 text-white text-xs font-semibold rounded-lg hover:bg-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-2xs"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Answer"}
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center text-stone-500 text-xs">No active question found.</div>
          )}
        </div>
      </main>

      {/* Report Modal */}
      {isReporting && (
        <div className="fixed inset-0 bg-stone-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl border border-stone-200 animate-in zoom-in-95">
            <h3 className="text-sm font-bold text-stone-800 mb-1 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-stone-600" /> Report Question Issue
            </h3>
            <p className="text-xs text-stone-500 mb-3">
              Describe formatting or factual concerns. Submissions are reviewed continuously.
            </p>
            {reportSubmitted ? (
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-3 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Issue report acknowledged. Thank you.</span>
              </div>
            ) : (
              <>
                <textarea
                  className="w-full h-24 p-2.5 border border-stone-300 rounded-lg text-xs focus:border-emerald-800 focus:outline-none resize-none mb-3"
                  placeholder="Detail the issue with this item..."
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => setIsReporting(false)}
                    className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-md"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleReportSubmit}
                    disabled={!reportReason.trim()}
                    className="px-4 py-1.5 bg-emerald-800 text-white text-xs font-semibold rounded-md hover:bg-emerald-900 disabled:opacity-50"
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
        <div className="fixed inset-0 bg-stone-900/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl border border-stone-200 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 bg-stone-100 text-stone-800 border border-stone-300 rounded-full flex items-center justify-center mx-auto mb-3">
              <EyeOff className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-serif font-bold text-stone-900 mb-1">Testing Window Warning</h2>
            <p className="text-stone-600 text-xs mb-4 leading-relaxed">
              Loss of focus detected on active testing window. Proctored exams require full concentration.
            </p>
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 mb-4 text-xs">
              <p className="text-stone-800 font-bold">
                Violation {violations} of {MAX_VIOLATIONS}
              </p>
              <p className="text-stone-500 mt-0.5">
                Exceeding the warning threshold will conclude the examination session.
              </p>
            </div>
            <button 
              onClick={() => setShowWarning(false)}
              className="w-full py-2.5 bg-emerald-800 text-white font-semibold text-xs rounded-lg hover:bg-emerald-900 transition-colors shadow-2xs"
            >
              Acknowledge & Return to Assessment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
