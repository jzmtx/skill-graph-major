"use client";

import React, { useState, useEffect, use, useRef } from 'react';
import { getAdaptiveQuestion, submitAnswer, completeAssessment, getCodingQuestion, evaluateCode, simulateCode, reportQuestion } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import { 
  Target, ArrowLeft, CheckCircle2, XCircle, Code, Loader2, Brain, 
  ShieldAlert, ShieldCheck, Flag, Terminal, EyeOff, Timer, Info, X,
  Check, ArrowRight, AlertTriangle, FileText, Lock
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';

export default function AssessmentPage({ params }: { params: Promise<{ skill_name: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const skillName = decodeURIComponent(unwrappedParams.skill_name);
  
  // Initial Student Agreement & Instructions Screen
  const [hasAcceptedRules, setHasAcceptedRules] = useState(false);
  const [acknowledgedPolicy, setAcknowledgedPolicy] = useState(false);

  const [loading, setLoading] = useState(false);
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

  // Weight Info Modal state
  const [showWeightModal, setShowWeightModal] = useState(false);

  // Proctoring & Anti-Cheat State
  const [violations, setViolations] = useState(0);
  const [violationNotice, setViolationNotice] = useState<{ show: boolean; reason: string; count: number }>({
    show: false,
    reason: "",
    count: 0
  });
  const lastViolationTime = useRef(0);

  // STRICT RULE: Only Question 6 and Question 12 can ever be coding questions
  const isCurrentItemCoding = (questionCount === 6 || questionCount === 12) && Boolean(question?.isCoding);

  const triggerViolation = (reason: string) => {
    if (!hasAcceptedRules || isFinished) return;
    const now = Date.now();
    if (now - lastViolationTime.current < 2500) return; // throttle 2.5s
    lastViolationTime.current = now;

    setViolations(prev => {
      const next = prev + 1;
      setViolationNotice({
        show: true,
        reason,
        count: next
      });
      return next;
    });
  };

  // Auto-hide proctoring warning toast after 4.5s
  useEffect(() => {
    if (!violationNotice.show) return;
    const timer = setTimeout(() => {
      setViolationNotice(prev => ({ ...prev, show: false }));
    }, 4500);
    return () => clearTimeout(timer);
  }, [violationNotice.show]);

  // Anti-cheat event interceptors (Active only after rules accepted)
  useEffect(() => {
    if (!hasAcceptedRules || isFinished) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation("Active window lost focus. The testing tab must remain in foreground focus.");
      }
    };

    const handleWindowBlur = () => {
      triggerViolation("Browser window lost focus. Switching windows or applications is prohibited.");
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerViolation("Copy action blocked. Clipboard copying is disabled during assessment.");
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerViolation("Paste action blocked. External code or text insertion is restricted.");
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerViolation("Cut action blocked during proctored assessment.");
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerViolation("Right-click context menu is disabled during assessment.");
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen detection
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault();
        triggerViolation("Screenshot capture (PrintScreen) detected and prohibited.");
        return;
      }

      // Windows Snipping tool / Screenshot: Win+Shift+S or Ctrl+Shift+S
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        triggerViolation("Screen capture shortcut detected and prohibited.");
        return;
      }

      // Mac screenshot: Cmd+Shift+3, 4, 5
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        triggerViolation("Mac screen capture shortcut detected and prohibited.");
        return;
      }

      // Copy/Paste hotkeys: Ctrl+C, Ctrl+V, Ctrl+X, Cmd+C, Cmd+V, Cmd+X
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        triggerViolation("Clipboard shortcut (Copy/Paste/Cut) blocked.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("copy", handleCopy, true);
    window.addEventListener("paste", handlePaste, true);
    window.addEventListener("cut", handleCut, true);
    window.addEventListener("contextmenu", handleContextMenu, true);
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("copy", handleCopy, true);
      window.removeEventListener("paste", handlePaste, true);
      window.removeEventListener("cut", handleCut, true);
      window.removeEventListener("contextmenu", handleContextMenu, true);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [hasAcceptedRules, isFinished]);

  // Question countdown timer (Active only after rules accepted)
  useEffect(() => {
    if (!hasAcceptedRules || timeLeft <= 0 || isSubmitting || !!feedback || !question || isFinished || loading) return;
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
  }, [hasAcceptedRules, timeLeft, isSubmitting, feedback, question, isFinished, loading]);

  const fetchNextQuestion = async (currentDiff: number, excludeIds: string[], count: number) => {
    try {
      setLoading(true);
      const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
      
      // STRICT RULE: Coding questions ONLY on Question 6 and Question 12 (5 minutes time limit = 300s)
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
          setTimeLeft(300); // 5 minutes for coding questions
          setLoading(false);
          return;
        }
      }

      // All other items (1, 2, 3, 4, 5, 7, 8, 9, 10, 11) are STRICTLY conceptual MCQs (60s limit)
      const q = await getAdaptiveQuestion({
        skill_name: skillName,
        difficulty_level: currentDiff,
        exclude_question_ids: excludeIds,
        student_id: studentId || null,
      });
      if (q && q.question_text) {
        setQuestion({ ...q, isCoding: false }); // Explicitly false!
        setSeenIds(prev => [...prev, q.question_id]);
        setSelectedOption(null);
        setTimeLeft(60); // 60 seconds for MCQs
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

  const handleStartAssessment = () => {
    if (!acknowledgedPolicy) return;
    setHasAcceptedRules(true);
    fetchNextQuestion(difficulty, [], 1);
  };

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
      setExecutionOutput(res.output || "Program finished with exit code 0.");
    } catch (e) {
      setExecutionOutput("Execution failed or timed out.");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSubmit = async (isTimeout = false) => {
    if (isSubmitting || !!feedback) return;
    if (!isCurrentItemCoding && !selectedOption && !isTimeout) return;
    if (isCurrentItemCoding && !studentCode.trim() && !isTimeout) return;

    setIsSubmitting(true);
    setEvaluationPhase('evaluating');

    try {
      const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
      let isCorrect = false;
      let correctAns = "";
      let explanation = "";
      let nextDiff = difficulty;

      if (isCurrentItemCoding) {
        if (isTimeout) {
          isCorrect = false;
          correctAns = "Time expired (5:00 min limit).";
          explanation = "You did not complete the coding challenge within the allocated 5-minute sandbox window.";
        } else {
          const evalRes = await evaluateCode({
            skill_name: skillName,
            question_text: question.question_text,
            student_code: studentCode,
          });
          isCorrect = evalRes.is_correct;
          correctAns = evalRes.feedback;
          explanation = "Code evaluated successfully against automated test fixtures.";
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
      
      const topic = question.topic || (isCurrentItemCoding ? "Coding" : "General");
      const newHistory = [...history, { topic, is_correct: isCorrect, difficulty: isCurrentItemCoding ? 5 : difficulty }];
      setHistory(newHistory);
      
      let newScore = score;
      if (isCorrect) {
        newScore += (isCurrentItemCoding ? 50 : difficulty * 10);
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

  const handleFinish = async (finalScore: number, finalHistory = history) => {
    setIsFinished(true);
    setLoading(true);
    try {
      const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
      const percentage = Math.min(100, Math.round((finalScore / 600) * 100)); 
      
      const res = await completeAssessment({
        student_id: studentId,
        skill_name: skillName,
        score_percentage: percentage,
        history: finalHistory,
        violations: violations,
      });
      
      setFinalPassed(res.passed);
      if (res.analytics) {
        setAnalytics(res.analytics);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Current question score weight calculations
  const questionWeightPoints = isCurrentItemCoding ? 50 : (difficulty * 10);
  const questionWeightPercentage = ((questionWeightPoints / 600) * 100).toFixed(1);

  // ==========================================
  // INITIAL INSTRUCTIONS & AGREEMENT SCREEN
  // ==========================================
  if (!hasAcceptedRules) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl border border-stone-200 shadow-sm p-6 md:p-8 animate-in fade-in duration-200">
          
          {/* Header */}
          <div className="flex items-center gap-3 pb-5 border-b border-stone-200">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold shadow-2xs">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold font-serif text-stone-900">
                  {skillName} Level 1 Verification
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-800 border border-orange-200">
                  Proctored
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Standardized 12-item adaptive technical examination & anti-cheat guidelines.
              </p>
            </div>
          </div>

          {/* Guidelines Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 my-6 text-xs text-stone-700">
            
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-1">
              <span className="font-bold text-stone-900 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-800" />
                12 Total Questions (2 Coding)
              </span>
              <p className="text-[11px] text-stone-500 leading-normal">
                10 adaptive conceptual MCQs scaling across Levels 1–5, plus <strong className="text-stone-800">exactly 2 hands-on coding challenges</strong> (Item 6 & Item 12).
              </p>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-1">
              <span className="font-bold text-stone-900 flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-emerald-800" />
                Pacing: 60s MCQ • 5 Min Coding
              </span>
              <p className="text-[11px] text-stone-500 leading-normal">
                Each MCQ has a 60-second timer. Each coding sandbox grants <strong className="text-stone-800">strictly 5:00 minutes (300s)</strong> to write, execute, and verify code.
              </p>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-1">
              <span className="font-bold text-stone-900 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-800" />
                600 Points & Weight Info (i)
              </span>
              <p className="text-[11px] text-stone-500 leading-normal">
                Passing threshold is 60% (360 pts). Coding challenges award 50 pts each. Click the <strong className="text-stone-800">(i) badge</strong> on any item to view its exact score weight.
              </p>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-1">
              <span className="font-bold text-stone-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-800" />
                Anti-Cheat & Proctoring Flags
              </span>
              <p className="text-[11px] text-stone-500 leading-normal">
                Copy-paste, cut, and screenshots are blocked. Flags 1–3 give warnings. <strong className="text-stone-800">&gt;3 flags triggers an automatic trust penalty</strong> on your score &amp; GLI.
              </p>
            </div>

          </div>

          {/* Student Declaration Checkbox */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4 mb-6">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input 
                type="checkbox"
                checked={acknowledgedPolicy}
                onChange={(e) => setAcknowledgedPolicy(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-emerald-800 accent-emerald-800 focus:ring-emerald-800 cursor-pointer"
              />
              <span className="text-xs text-stone-700 leading-relaxed font-medium">
                I confirm that I will complete this assessment independently. I understand that the browser tab must remain in focus, clipboard operations and screenshots are restricted, and violations exceeding 3 flags will negatively impact my Global Learner Index (GLI).
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <Link 
              href="/dashboard"
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors text-center"
            >
              Cancel &amp; Return to Dashboard
            </Link>
            <button
              onClick={handleStartAssessment}
              disabled={!acknowledgedPolicy}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Accept Guidelines &amp; Begin Assessment</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // COMPLETION SCREEN
  // ==========================================
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
            <span className="text-3xl font-black text-emerald-800">{score}</span>
            <span className="text-stone-400 font-medium"> / 600 pts</span>
            <span className="text-xs text-stone-500 block mt-1 font-medium">
              Overall Result: {Math.round((score / 600) * 100)}% ({finalPassed ? 'Passed >= 60%' : 'Needs Improvement'})
            </span>
          </div>

          <p className="text-stone-600 text-xs leading-relaxed mb-5">
            {finalPassed 
              ? `Congratulations! You scored high enough to achieve Level 1 verification in ${skillName}. Your Global Learner Index (GLI) has updated.`
              : `Baseline established for ${skillName}. Practice further and re-attempt to advance verification.`}
          </p>

          {/* Proctoring Integrity Summary */}
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-3.5 mb-5 text-left">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-stone-500" />
                Proctoring Trust Audit
              </span>
              <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                violations <= 3 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}>
                {violations <= 3 ? 'Verified Trusted' : `${violations} Flags Logged`}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              {violations === 0 
                ? 'Clean proctored session. Zero window deviations or clipboard actions detected.'
                : violations <= 3 
                  ? `${violations} minor focus or shortcut interruption(s) recorded within normal tolerance. Full score preserved.`
                  : `${violations} flags recorded (>3 tolerance limit). A trust deduction was logged against your score and Global Learner Index (GLI).`}
            </p>
          </div>
          
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
            className="w-full px-5 py-2.5 bg-emerald-800 text-white font-semibold text-xs rounded-lg hover:bg-emerald-900 transition-colors shadow-2xs cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // EVALUATION & FEEDBACK PHASE
  // ==========================================
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
                    <button onClick={handleContinue} className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer">
                       Proceed to Next Item
                    </button>
                 )}
              </>
           )}
        </div>
      </div>
    );
  }

  // ==========================================
  // ACTIVE QUESTION SCREEN
  // ==========================================
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col select-none">
      {/* Anti-cheat Proctoring Toast Notice */}
      {violationNotice.show && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in slide-in-from-top-2 duration-200">
          <div className={`p-3.5 rounded-lg border shadow-lg flex items-start gap-3 ${
            violationNotice.count > 3 
              ? 'bg-amber-50 border-amber-300 text-amber-950' 
              : 'bg-stone-900 text-stone-100 border-stone-800'
          }`}>
            <ShieldAlert className={`w-4 h-4 shrink-0 mt-0.5 ${violationNotice.count > 3 ? 'text-amber-700' : 'text-amber-400'}`} />
            <div className="flex-1 text-xs">
              <div className="flex items-center justify-between font-bold mb-0.5">
                <span>Proctoring Flag {violationNotice.count}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                  violationNotice.count > 3 ? 'bg-amber-200 text-amber-900' : 'bg-stone-800 text-stone-300'
                }`}>
                  {violationNotice.count > 3 ? 'GLI Trust Penalty Active' : `${violationNotice.count}/3 Warning`}
                </span>
              </div>
              <p className={violationNotice.count > 3 ? 'text-amber-900 text-[11px]' : 'text-stone-300 text-[11px]'}>
                {violationNotice.reason}
              </p>
              {violationNotice.count > 3 && (
                <p className="text-[10px] text-amber-800 font-medium mt-1">
                  Exceeding 3 proctoring flags triggers an automatic trust deduction from your score and GLI rating.
                </p>
              )}
            </div>
            <button 
              onClick={() => setViolationNotice(prev => ({ ...prev, show: false }))} 
              className="text-stone-400 hover:text-white text-xs ml-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

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
          <div className="flex items-center gap-2.5">
            {/* Timer */}
            <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md border ${
              timeLeft < 30 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-stone-100 border-stone-200 text-stone-700'
            }`}>
              <Timer className="w-3.5 h-3.5" />
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>

            {/* Proctoring Trust Indicator */}
            <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md border ${
              violations === 0 
                ? 'bg-stone-100 border-stone-200 text-stone-700'
                : violations <= 3
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {violations === 0 ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span className="hidden sm:inline">
                {violations === 0 
                  ? 'Trusted' 
                  : violations <= 3 
                    ? `Flag ${violations}/3` 
                    : `${violations} Flags (Penalty)`}
              </span>
              <span className="sm:hidden">
                {violations === 0 ? 'OK' : `F:${violations}`}
              </span>
            </div>

            {/* Difficulty Badge */}
            <div className="text-xs font-medium text-stone-500">
              Lvl <span className="text-stone-900 font-bold">{isCurrentItemCoding ? 'Coding' : difficulty}</span>
            </div>

            {/* Progress Bar */}
            <div className="w-20 bg-stone-200 h-1.5 rounded-full overflow-hidden hidden sm:block">
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
              <div className="text-xs text-stone-500">Synthesizing adaptive assessment item...</div>
            </div>
          ) : question ? (
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 md:p-8 animate-in fade-in duration-200">
              
              {/* Question Metadata Header Bar with Info Badge */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                    isCurrentItemCoding 
                      ? 'bg-amber-50 text-amber-900 border-amber-200' 
                      : 'bg-stone-100 text-stone-700 border-stone-200'
                  }`}>
                    {isCurrentItemCoding ? 'Coding Sandbox (5 Min)' : `MCQ • Level ${difficulty}`}
                  </span>
                  <span className="text-[11px] text-stone-400">
                    Item {questionCount} of 12
                  </span>
                </div>

                {/* Question Weight Info Badge */}
                <button
                  type="button"
                  onClick={() => setShowWeightModal(true)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 px-2.5 py-1 rounded-md border border-stone-200 transition-colors cursor-pointer group"
                  title="Click to view question score weight & GLI contribution"
                >
                  <Info className="w-3.5 h-3.5 text-emerald-800 group-hover:scale-110 transition-transform" />
                  <span>Weight: {questionWeightPoints} pts ({questionWeightPercentage}%)</span>
                </button>
              </div>

              {/* Question Text */}
              <div className="text-stone-900 mb-6 text-sm leading-relaxed font-medium">
                <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{question.question_text}</ReactMarkdown>
              </div>

              {/* Coding Question Sandbox or MCQ Options */}
              {isCurrentItemCoding ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-stone-500 px-1">
                    <span className="flex items-center gap-1 font-medium">
                      <Code className="w-3.5 h-3.5 text-emerald-800" />
                      5-Minute Sandbox • Copy/Paste Disabled
                    </span>
                    <span className="text-[11px] text-stone-400">
                      Standard coding challenge: 50 pts
                    </span>
                  </div>

                  <div className="rounded-lg overflow-hidden border border-stone-300 h-[260px]">
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
                        readOnly: !!feedback || isSubmitting,
                        contextmenu: false,
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
                  {(question.options || []).map((opt: string, i: number) => {
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
                        className={`w-full text-left p-3.5 rounded-lg border transition-all text-xs cursor-pointer ${optStyle}`}
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

              {/* Action Bar */}
              <div className="mt-6 pt-4 border-t border-stone-100 flex justify-between items-center gap-3">
                <button
                  onClick={() => setIsReporting(true)}
                  className="text-stone-400 hover:text-stone-700 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5" /> Report Issue
                </button>
                <div className="flex gap-2">
                  {isCurrentItemCoding && (
                    <button
                      onClick={handleRunCode}
                      disabled={!studentCode.trim() || isSubmitting || !!feedback || isExecuting}
                      className="px-4 py-2 bg-stone-100 border border-stone-300 text-stone-800 text-xs font-semibold rounded-lg hover:bg-stone-200 flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Terminal className="w-3.5 h-3.5" /> {isExecuting ? "Executing..." : "Execute"}
                    </button>
                  )}
                  <button
                    onClick={() => handleSubmit(false)}
                    disabled={(isCurrentItemCoding ? !studentCode.trim() : !selectedOption) || isSubmitting || !!feedback}
                    className="px-6 py-2 bg-emerald-800 text-white text-xs font-semibold rounded-lg hover:bg-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
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

      {/* Question Weight Info Modal */}
      {showWeightModal && (
        <div className="fixed inset-0 bg-stone-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl border border-stone-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Question Weight Breakdown</h3>
                  <p className="text-[11px] text-stone-500">Contribution to Total Assessment &amp; GLI</p>
                </div>
              </div>
              <button 
                onClick={() => setShowWeightModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 grid grid-cols-2 gap-3 text-center">
                <div className="border-r border-stone-200 pr-2">
                  <div className="text-stone-400 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Points Value</div>
                  <div className="text-xl font-black text-emerald-800">{questionWeightPoints} pts</div>
                  <div className="text-[10px] text-stone-500">of 600 total points</div>
                </div>
                <div>
                  <div className="text-stone-400 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Exam Share</div>
                  <div className="text-xl font-black text-stone-800">{questionWeightPercentage}%</div>
                  <div className="text-[10px] text-stone-500">of assessment total</div>
                </div>
              </div>

              <div className="space-y-2 text-stone-600 leading-relaxed text-[11px]">
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500 font-medium">Question Format:</span>
                  <span className="font-semibold text-stone-800">
                    {isCurrentItemCoding ? 'Hands-on Coding Sandbox' : 'Adaptive Conceptual MCQ'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500 font-medium">Allocated Time Limit:</span>
                  <span className="font-semibold text-stone-800">
                    {isCurrentItemCoding ? '5 Minutes (300 seconds)' : '1 Minute (60 seconds)'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500 font-medium">Difficulty Level:</span>
                  <span className="font-semibold text-stone-800">
                    Level {difficulty} of 5 ({isCurrentItemCoding ? 'Practical Tier (50 pts)' : `${difficulty * 10} pts scale`})
                  </span>
                </div>
              </div>

              <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-[11px] text-stone-600 leading-relaxed">
                <span className="font-bold text-stone-800 block mb-1">GLI Integration Architecture:</span>
                Your cumulative score across all 12 items feeds into the asymptotic normalization engine 
                (<span className="font-mono text-[10px] text-stone-800">300 + 550 × (1 - e^-Raw/1000)</span>). 
                Coding challenges contribute 50 pts each to verify practical implementation fidelity.
              </div>
            </div>

            <button 
              onClick={() => setShowWeightModal(false)}
              className="w-full mt-4 py-2 bg-emerald-800 text-white font-semibold text-xs rounded-lg hover:bg-emerald-900 transition-colors shadow-2xs cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      )}

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
                    className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-md cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleReportSubmit}
                    disabled={!reportReason.trim()}
                    className="px-4 py-1.5 bg-emerald-800 text-white text-xs font-semibold rounded-md hover:bg-emerald-900 disabled:opacity-50 cursor-pointer"
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
