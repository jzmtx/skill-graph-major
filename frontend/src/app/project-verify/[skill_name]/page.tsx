"use client";

import React, { useState, useEffect, useRef, use } from 'react';
import { scheduleProjectInterview, getInterviewStatus, verifyProjectRepo, submitProjectInterview, getProjectIdea } from '@/lib/api';
import { 
  ArrowLeft, CheckCircle2, Send, Terminal, Loader2, XCircle, 
  ShieldAlert, Brain, Lightbulb, Code2, Mic, MicOff, Volume2, 
  VolumeX, RotateCcw, Sparkles, Clock, Radio, Award, UserCheck, ShieldCheck,
  Calendar, Play, ArrowRight, Check, ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Editor } from '@monaco-editor/react';
import { AiInterviewerAvatar } from '@/components/common/AiInterviewerAvatar';
import { ProctoringMonitor, ProctoringViolation } from '@/components/proctoring/ProctoringMonitor';

export default function ProjectVerificationPage({ params }: { params: Promise<{ skill_name: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const skillName = decodeURIComponent(unwrappedParams.skill_name);
  
  // Steps: 0: Idea Spec, 1: Repo Form, 2: Scheduled Lobby / Background Audit, 3: Virtual Voice Interview, 4: Result / Evaluation
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [projectIdea, setProjectIdea] = useState('');
  const [projectAbstract, setProjectAbstract] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  
  // Scheduling & Asynchronous Audit States
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [scheduledStatus, setScheduledStatus] = useState<'PREPARING' | 'READY' | 'INVALID'>('PREPARING');
  const [auditFeedback, setAuditFeedback] = useState<string>('');
  const [estimatedSeconds, setEstimatedSeconds] = useState(25);
  const [scheduledTime, setScheduledTime] = useState<string>('');
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Voice & Speech States (100% Free Browser Web Speech APIs)
  const [voiceMode, setVoiceMode] = useState(true);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [interimSpeech, setInterimSpeech] = useState('');
  
  // Evaluation Result / Asynchronous Audit
  const [result, setResult] = useState<{passed: boolean, feedback: string, proctoring_flagged?: boolean, violations_count?: number} | null>(null);
  const [evaluationPending, setEvaluationPending] = useState(false);

  // Proctoring Telemetry State
  const [interviewViolations, setInterviewViolations] = useState<ProctoringViolation[]>([]);

  const handleProctoringViolation = (v: ProctoringViolation) => {
    setInterviewViolations(prev => [v, ...prev]);
  };

  const recognitionRef = useRef<any>(null);

  // Initialize browser Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition && 'speechSynthesis' in window) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let currentFinal = '';
          let currentInterim = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              currentFinal += transcript + ' ';
            } else {
              currentInterim += transcript;
            }
          }

          setInterimSpeech(currentInterim);
          if (currentFinal) {
            const currentQ = questions[currentQuestionIndex];
            if (currentQ) {
              setAnswers(prev => ({
                ...prev,
                [currentQ.id]: ((prev[currentQ.id] || '') + ' ' + currentFinal).trim()
              }));
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("[Voice] Speech recognition event:", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
          setInterimSpeech('');
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
    };
  }, [questions, currentQuestionIndex]);

  // Read AI Question Aloud when entering question
  const speakQuestion = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !voiceMode) return;
    
    window.speechSynthesis.cancel();
    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      setIsListening(false);
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    // Pick professional sounding voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')) && v.lang.startsWith('en'));
    if (naturalVoice) utterance.voice = naturalVoice;

    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => {
      setIsAiSpeaking(false);
      // Auto-start listening after AI finishes speaking in voice mode
      if (voiceMode && speechSupported && questions[currentQuestionIndex]?.type !== 'coding') {
        startListening();
      }
    };
    utterance.onerror = () => setIsAiSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Toggle Microphone
  const toggleListening = () => {
    if (!speechSupported) {
      setError("Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge, or type your answer.");
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      if (isAiSpeaking && typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
        setIsAiSpeaking(false);
      }
      startListening();
    }
  };

  const startListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
      setError('');
    } catch (e) {
      // Already running or permission needed
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimSpeech('');
    } catch (e) {}
  };

  // Speak automatically when question changes in Step 3 (Virtual Interview)
  useEffect(() => {
    if (step === 3 && questions.length > 0 && voiceMode) {
      const q = questions[currentQuestionIndex];
      if (q) {
        const announcement = q.type === 'coding' 
          ? `Question ${currentQuestionIndex + 1}. Coding Challenge. ${q.text}. Please implement your solution in the code editor on screen.`
          : `Question ${currentQuestionIndex + 1}. ${q.text}`;
        speakQuestion(announcement);
      }
    }
  }, [step, currentQuestionIndex, voiceMode]);

  // Polling hook for scheduled interview preparation in Step 2
  useEffect(() => {
    if (step !== 2 || !interviewId || scheduledStatus === 'READY' || scheduledStatus === 'INVALID') return;

    const interval = setInterval(async () => {
      try {
        const statusRes = await getInterviewStatus(interviewId);
        if (statusRes.status === 'READY') {
          setScheduledStatus('READY');
          if (statusRes.questions && statusRes.questions.length > 0) {
            setQuestions(statusRes.questions);
          }
          clearInterval(interval);
        } else if (statusRes.status === 'INVALID') {
          setScheduledStatus('INVALID');
          setAuditFeedback(statusRes.feedback || `No ${skillName} implementation detected in this repository.`);
          clearInterval(interval);
        }
      } catch (e) {
        console.warn("Polling interview status:", e);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [step, interviewId, scheduledStatus, skillName]);

  // Countdown timer in scheduled lobby
  useEffect(() => {
    if (step !== 2 || scheduledStatus !== 'PREPARING') return;
    const timer = setInterval(() => {
      setEstimatedSeconds(prev => (prev > 1 ? prev - 1 : 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, scheduledStatus]);

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

  // Submits repository and schedules the interview asynchronously
  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl.includes("github.com")) {
      setError("Please enter a valid GitHub repository URL.");
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
      const res = await scheduleProjectInterview({
        student_id: studentId,
        skill_name: skillName,
        github_url: githubUrl,
        project_abstract: projectAbstract
      });
      
      setInterviewId(res.interview_id);
      setScheduledStatus("PREPARING");
      setEstimatedSeconds(res.estimated_seconds || 25);
      
      const now = new Date();
      setScheduledTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      
      setStep(2); // Immediately move to Interview Scheduled Lobby
    } catch (e: any) {
      console.warn("Schedule interview fallback:", e);
      // Fail-safe direct verify fallback
      try {
        const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
        const res = await verifyProjectRepo({
          student_id: studentId,
          skill_name: skillName,
          github_url: githubUrl,
          project_abstract: projectAbstract
        });
        setQuestions(res.questions || []);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setStep(3);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to submit repository. Please verify your URL.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Start the interview from the lobby
  const handleEnterInterview = () => {
    if (questions.length === 0) {
      // Default calibrated defense questions if none yet
      setQuestions([
        {"id": 1, "type": "conceptual", "text": `Walk me through the high-level architecture of your project and where ${skillName} is used.`},
        {"id": 2, "type": "conceptual", "text": `What was the most challenging technical tradeoff or bug you encountered while building this with ${skillName}?`},
        {"id": 3, "type": "conceptual", "text": `How did you handle error handling, edge cases, and data persistence in this codebase?`},
        {"id": 4, "type": "conceptual", "text": `If this application scaled to 100,000 active users, what bottleneck would emerge first and how would you optimize it?`},
        {"id": 5, "type": "coding", "text": `Write a clean, modular helper function or middleware in ${skillName} extending the core feature of your project.`}
      ]);
    }
    setCurrentQuestionIndex(0);
    setAnswers({});
    setStep(3);
  };

  const handleNextQuestion = () => {
    if (isListening) stopListening();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsAiSpeaking(false);
    }

    const currentQ = questions[currentQuestionIndex];
    if (!answers[currentQ.id] || answers[currentQ.id].trim().length < 8) {
      setError("Please provide an answer (speak or type) before continuing.");
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
    if (isListening) stopListening();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsAiSpeaking(false);
    }

    setLoading(true);
    setError('');
    setStep(4);
    setEvaluationPending(true);
    
    try {
      const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
      const qa_pairs = questions.map(q => ({
        question: q.text,
        answer: answers[q.id] || ""
      }));
      
      const res = await submitProjectInterview({
        student_id: studentId,
        skill_name: skillName,
        github_url: githubUrl,
        qa_pairs: qa_pairs,
        violations: interviewViolations.length,
        violation_details: interviewViolations
      });
      
      setResult(res);
      setEvaluationPending(false);
    } catch (e) {
      console.error("Evaluation response delay or error:", e);
      // Keep pending state active so candidate knows evaluation is asynchronous
      setEvaluationPending(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col text-stone-900">
      {/* Top Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/verify" className="text-stone-400 hover:text-stone-700 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-bold text-stone-900 flex items-center gap-2 font-serif text-base md:text-lg">
                <Terminal className="w-5 h-5 text-emerald-800" />
                Level 2 Project Audit: <span className="text-emerald-800">{skillName}</span>
              </h1>
            </div>
          </div>

          {step === 3 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const newMode = !voiceMode;
                  setVoiceMode(newMode);
                  if (!newMode && typeof window !== 'undefined') {
                    window.speechSynthesis.cancel();
                    setIsAiSpeaking(false);
                  }
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                  voiceMode 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-stone-100 text-stone-600 border-stone-200'
                }`}
              >
                {voiceMode ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                {voiceMode ? 'Voice Mode Active' : 'Text Only Mode'}
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xs border border-stone-200 overflow-hidden">
          
          {/* Progress Indicator */}
          <div className="flex bg-stone-100 h-1.5">
            <div className={`transition-all duration-300 ${step >= 1 ? 'flex-1 bg-emerald-800' : 'w-0'}`} />
            <div className={`transition-all duration-300 ${step >= 2 ? 'flex-1 bg-emerald-800' : 'w-0'}`} />
            <div className={`transition-all duration-300 ${step >= 3 ? 'flex-1 bg-emerald-800' : 'w-0'}`} />
            <div className={`transition-all duration-300 ${step >= 4 ? 'flex-1 bg-emerald-700' : 'w-0'}`} />
          </div>

          <div className="p-6 md:p-10">
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl text-xs md:text-sm mb-6 flex items-start gap-2.5 border border-red-200">
                <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-600" />
                <p>{error}</p>
              </div>
            )}

            {/* Step 0: Idea Generation */}
            {step === 0 && (
              <div className="animate-in fade-in duration-300">
                <div className="max-w-2xl mx-auto">
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-900 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">
                    Stage 1: Codebase Verification
                  </span>
                  <h2 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 mt-2 mb-2">
                    Level 2 Repository Mastery
                  </h2>
                  <p className="text-stone-600 text-xs md:text-sm mb-6 leading-relaxed">
                    Level 2 attestation validates your architectural depth through live repository inspection and an interactive oral defense interview.
                  </p>
                  
                  {!projectIdea ? (
                    <div className="text-center py-10 border-2 border-dashed border-stone-200 rounded-2xl mb-6 bg-stone-50/50 p-6">
                      <Lightbulb className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                      <h3 className="font-bold text-stone-900 text-sm mb-1">Need a Real-World Project Spec?</h3>
                      <p className="text-stone-500 text-xs max-w-md mx-auto mb-5">
                        Our AI can recommend an industry-grade portfolio specification in {skillName} designed to impress recruiters.
                      </p>
                      <button
                        onClick={handleGenerateIdea}
                        disabled={loading}
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-xl transition-colors shadow-2xs disabled:opacity-50"
                      >
                        {loading ? "Architecting Spec..." : "Generate Project Spec"}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-stone-50 border border-stone-200 p-6 rounded-2xl mb-6">
                      <h3 className="font-bold text-stone-900 mb-2 flex items-center gap-2 text-sm">
                        <Terminal className="w-4 h-4 text-emerald-800" />
                        Recommended Architecture Spec
                      </h3>
                      <p className="text-stone-700 text-xs md:text-sm whitespace-pre-wrap leading-relaxed">{projectIdea}</p>
                    </div>
                  )}

                  <div className="border-t border-stone-200 pt-6">
                    <p className="text-xs text-stone-500 mb-3 text-center">Already built your project in a public repository?</p>
                    <button
                      onClick={() => setStep(1)}
                      className="w-full py-3.5 bg-emerald-800 text-white font-semibold text-xs md:text-sm rounded-xl hover:bg-emerald-900 transition-colors shadow-2xs flex items-center justify-center gap-2"
                    >
                      <Code2 className="w-4 h-4" />
                      Submit GitHub Repository for Audit
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Submit Repository */}
            {step === 1 && (
              <div className="animate-in fade-in duration-300 max-w-2xl mx-auto">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Step 2: Repository Submission & Scheduling
                </span>
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 mt-2 mb-2">
                  Submit Your {skillName} Repository
                </h2>
                <p className="text-stone-600 text-xs md:text-sm mb-6 leading-relaxed">
                  Provide your public GitHub repository. Submitting will instantly schedule your oral defense interview while our AI Assessor scans your codebase asynchronously.
                </p>
                
                <form onSubmit={handleScheduleInterview} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">GitHub Repository URL</label>
                    <input 
                      type="url" required placeholder="https://github.com/username/project"
                      className="w-full p-3 border border-stone-300 rounded-xl text-xs md:text-sm bg-stone-50 text-stone-900 focus:outline-none focus:border-emerald-800 focus:bg-white"
                      value={githubUrl} onChange={e => setGithubUrl(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">Project Abstract & Architecture</label>
                    <textarea 
                      required placeholder="Briefly describe the key services, modules, and how you architected this codebase with {skillName}..."
                      className="w-full p-3 border border-stone-300 rounded-xl text-xs md:text-sm bg-stone-50 text-stone-900 focus:outline-none focus:border-emerald-800 focus:bg-white resize-none h-24"
                      value={projectAbstract} onChange={e => setProjectAbstract(e.target.value)}
                    />
                  </div>
                  
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading || !githubUrl}
                      className="w-full flex items-center justify-center py-3.5 bg-emerald-800 text-white font-semibold text-xs md:text-sm rounded-xl hover:bg-emerald-900 disabled:opacity-50 transition-colors shadow-2xs"
                    >
                      {loading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scheduling Interview Session...</>
                      ) : (
                        <><Calendar className="w-4 h-4 mr-2" /> Schedule Interview & Submit Repository</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 2: Scheduled Interview & Codebase Audit Lobby */}
            {step === 2 && (
              <div className="animate-in fade-in duration-300 max-w-2xl mx-auto">
                {scheduledStatus === 'INVALID' ? (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-6 sm:p-8 text-left shadow-xs">
                    <div className="flex items-start gap-3.5 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-red-100 border border-red-200 text-red-700 flex items-center justify-center shrink-0">
                        <XCircle className="w-7 h-7 text-red-600" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-800 bg-red-100/80 border border-red-200 px-2 py-0.5 rounded-full">
                          Verification Check Failed
                        </span>
                        <h2 className="text-xl sm:text-2xl font-serif font-bold text-red-950 mt-1">
                          No {skillName} Implementation Detected
                        </h2>
                      </div>
                    </div>

                    <div className="bg-white border border-red-200/80 rounded-xl p-4 text-xs md:text-sm text-stone-800 leading-relaxed mb-4">
                      <p className="font-semibold text-red-900 mb-1 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-red-600" />
                        Assessor Audit Telemetry:
                      </p>
                      <p className="text-stone-700 font-mono text-xs bg-stone-50 p-2.5 rounded-lg border border-stone-200 mt-1">
                        {auditFeedback || `Scanned ${githubUrl}: No evidence of ${skillName} source code or configurations found.`}
                      </p>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 mb-6 space-y-1">
                      <p className="font-bold flex items-center gap-1.5 text-amber-950">
                        <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                        Level 2 Codebase Standards:
                      </p>
                      <p className="text-amber-900/90 leading-relaxed">
                        Level 2 certification requires an authentic project codebase. If you are validating <strong>{skillName}</strong>, your repository must contain real implementation files (e.g., Docker requires a <code>Dockerfile</code> or <code>docker-compose.yml</code>; Python requires <code>.py</code> source files).
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <button
                        onClick={() => {
                          setScheduledStatus('PREPARING');
                          setStep(1);
                        }}
                        className="w-full sm:flex-1 py-3.5 bg-red-800 hover:bg-red-900 text-white font-semibold text-xs md:text-sm rounded-xl transition-colors shadow-2xs text-center cursor-pointer"
                      >
                        Submit Qualified Repository
                      </button>
                      <button
                        onClick={() => router.push('/dashboard/verify')}
                        className="w-full sm:w-auto px-6 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs md:text-sm rounded-xl transition-colors border border-stone-300 text-center cursor-pointer"
                      >
                        Return to Hub
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-center mb-6">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border transition-all ${
                        scheduledStatus === 'READY' 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-md shadow-emerald-500/10'
                          : 'bg-amber-50 border-amber-300 text-amber-700'
                      }`}>
                        {scheduledStatus === 'READY' ? (
                          <CheckCircle2 className="w-8 h-8 text-emerald-700 animate-bounce" />
                        ) : (
                          <Clock className="w-8 h-8 text-amber-600 animate-spin" />
                        )}
                      </div>

                      <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                        scheduledStatus === 'READY'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : 'bg-amber-50 text-amber-900 border-amber-200'
                      }`}>
                        {scheduledStatus === 'READY' ? 'Oral Defense Room Ready' : 'Interview Scheduled & Preparing'}
                      </span>

                      <h2 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 mt-3 mb-2">
                        {scheduledStatus === 'READY' ? "Your Defense Room is Open!" : "Interview Scheduled & Under Review"}
                      </h2>
                      <p className="text-stone-600 text-xs md:text-sm max-w-lg mx-auto leading-relaxed">
                        {scheduledStatus === 'READY'
                          ? "Our AI Assessor has audited your repository structure and calibrated 5 tailored defense questions. You may enter whenever you are ready."
                          : "Analyzing real-world code takes a few moments. Your interview has been scheduled — our AI Assessor is currently reviewing your codebase."}
                      </p>
                    </div>

                    {/* Repository & Schedule Overview Card */}
                    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 mb-6 space-y-3.5">
                      <div className="flex items-center justify-between text-xs pb-3 border-b border-stone-200">
                        <span className="text-stone-500 font-medium">Target Competency:</span>
                        <span className="font-bold text-stone-900">{skillName}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pb-3 border-b border-stone-200">
                        <span className="text-stone-500 font-medium">Registered Repository:</span>
                        <a 
                          href={githubUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="font-mono text-emerald-800 font-semibold hover:underline flex items-center gap-1 max-w-[260px] truncate"
                        >
                          {githubUrl.replace('https://github.com/', '')}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                      <div className="flex items-center justify-between text-xs pb-3 border-b border-stone-200">
                        <span className="text-stone-500 font-medium">Scheduled Time:</span>
                        <span className="font-semibold text-stone-900 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-stone-600" />
                          Today at {scheduledTime || "Now"} (On-Demand / Flexible)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-stone-500 font-medium">Assessor Telemetry Status:</span>
                        <span className={`font-semibold flex items-center gap-1.5 ${
                          scheduledStatus === 'READY' ? 'text-emerald-800' : 'text-amber-700'
                        }`}>
                          {scheduledStatus === 'READY' ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              Questions Ready & Calibrated
                            </>
                          ) : (
                            <>
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                              Scanning Codebase (~{estimatedSeconds}s remaining)
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Background Checklist */}
                    <div className="bg-white border border-stone-200 rounded-xl p-4 mb-6 space-y-2.5 text-xs text-stone-700">
                      <div className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>Repository endpoint validated & commits indexed</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>Architectural patterns and {skillName} usage mapped</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        {scheduledStatus === 'READY' ? (
                          <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                        ) : (
                          <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                        )}
                        <span className={scheduledStatus === 'READY' ? 'text-stone-700' : 'text-amber-800 font-semibold'}>
                          {scheduledStatus === 'READY' 
                            ? '5 custom oral defense and coding questions prepared' 
                            : 'AI formulating customized defense & coding challenge questions...'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>AI Video Proctoring Guard: Real-time anti-mobile phone &amp; photo-taking scanner active</span>
                      </div>
                    </div>

                    {/* Pre-Interview Checklist & Actions */}
                    <div className="space-y-3">
                      {scheduledStatus === 'READY' ? (
                        <button
                          onClick={handleEnterInterview}
                          className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-800 text-white font-bold text-sm rounded-xl hover:bg-emerald-900 transition-all shadow-md shadow-emerald-900/10 cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          Enter Virtual Interview Room Now
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </button>
                      ) : (
                        <button
                          onClick={handleEnterInterview}
                          className="w-full flex items-center justify-center gap-2 py-4 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs md:text-sm rounded-xl transition-all border border-stone-300"
                        >
                          <Loader2 className="w-4 h-4 animate-spin text-stone-600" />
                          Waiting for Assessor Calibration (~{estimatedSeconds}s) • Or Enter Now
                        </button>
                      )}

                      <p className="text-[11px] text-stone-500 text-center leading-normal">
                        Your interview is reserved. You can take it immediately or return later to complete your oral defense.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Speech-to-Speech Virtual Technical Interview */}
            {step === 3 && questions.length > 0 && (
              <div className="animate-in fade-in duration-300">
                {/* Dual Stage: AI Assessor Studio & Candidate Proctoring Stream */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6 items-start">
                  <div className="lg:col-span-2">
                    <AiInterviewerAvatar
                      isAiSpeaking={isAiSpeaking}
                      isListening={isListening}
                      currentQuestionText={questions[currentQuestionIndex]?.text || ''}
                      onReplayAudio={() => speakQuestion(questions[currentQuestionIndex]?.text)}
                      voiceMode={voiceMode}
                      onToggleVoiceMode={() => {
                        const newMode = !voiceMode;
                        setVoiceMode(newMode);
                        if (!newMode && typeof window !== 'undefined') {
                          window.speechSynthesis.cancel();
                          setIsAiSpeaking(false);
                        }
                      }}
                    />
                  </div>
                  <div className="lg:col-span-1">
                    <ProctoringMonitor
                      variant="interview"
                      title="Candidate AI Proctor"
                      isActive={step === 3 && !evaluationPending}
                      onViolation={handleProctoringViolation}
                      currentQuestionText={questions[currentQuestionIndex]?.text || ''}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {questions[currentQuestionIndex]?.type === 'coding' ? 'Live Coding' : 'Oral Defense'}
                    </span>
                  </div>
                  <button
                    onClick={() => speakQuestion(questions[currentQuestionIndex]?.text)}
                    className="text-xs text-stone-500 hover:text-emerald-800 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Replay Audio
                  </button>
                </div>

                {/* Question Box */}
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 mb-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                    {questions[currentQuestionIndex].type === 'coding' ? (
                      <span className="text-emerald-800 flex items-center gap-1">
                        <Code2 className="w-4 h-4" /> Live Coding Challenge
                      </span>
                    ) : (
                      <span className="text-stone-700 flex items-center gap-1">
                        <Brain className="w-4 h-4 text-emerald-800" /> Architectural Defense Question
                      </span>
                    )}
                  </div>
                  <p className="text-stone-900 font-semibold text-sm md:text-base leading-relaxed select-none">
                    {questions[currentQuestionIndex].text}
                  </p>
                </div>

                {/* Response Area: Speech + Code Editor */}
                <div className="space-y-4">
                  {questions[currentQuestionIndex].type === 'coding' ? (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-stone-700">Implement Solution Snippet (Monaco Editor):</label>
                        <span className="text-[11px] text-stone-500">Syntax & logic evaluated directly</span>
                      </div>
                      <div className="border border-stone-300 rounded-xl overflow-hidden h-64 shadow-2xs">
                        <Editor
                          height="100%"
                          defaultLanguage="javascript"
                          value={answers[questions[currentQuestionIndex].id] || ""}
                          onChange={(val) => setAnswers({...answers, [questions[currentQuestionIndex].id]: val || ""})}
                          options={{
                            minimap: { enabled: false },
                            fontSize: 13,
                            lineNumbers: "on",
                            scrollBeyondLastLine: false,
                            padding: { top: 12, bottom: 12 }
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-stone-700 flex items-center gap-2">
                          Your Spoken / Written Explanation:
                        </label>
                        <button
                          type="button"
                          onClick={toggleListening}
                          className={`text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1.5 transition-all ${
                            isListening 
                              ? 'bg-rose-500 text-white animate-pulse shadow-xs' 
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                          {isListening ? 'Stop Mic (Listening...)' : 'Speak into Microphone'}
                        </button>
                      </div>

                      <div className="relative">
                        <textarea 
                          rows={5} required placeholder="Speak through your microphone or type your technical reasoning here (mention specific files, abstractions, and trade-offs)..."
                          className="w-full p-4 border border-stone-300 rounded-xl focus:outline-none focus:border-emerald-800 bg-stone-50/50 text-stone-900 text-xs md:text-sm resize-none"
                          value={answers[questions[currentQuestionIndex].id] || ""} 
                          onChange={e => setAnswers({...answers, [questions[currentQuestionIndex].id]: e.target.value})}
                        />
                        {interimSpeech && (
                          <div className="absolute bottom-3 left-4 right-4 bg-white/95 border border-emerald-300 rounded-lg p-2 text-xs text-emerald-900 shadow-sm flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                            <span className="italic truncate">{interimSpeech}...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      onClick={handleNextQuestion}
                      disabled={loading || !answers[questions[currentQuestionIndex].id] || answers[questions[currentQuestionIndex].id].trim().length < 8}
                      className="w-full flex items-center justify-center py-3.5 bg-emerald-800 text-white font-semibold text-xs md:text-sm rounded-xl hover:bg-emerald-900 disabled:opacity-40 transition-colors shadow-2xs"
                    >
                      {loading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting Audit...</>
                      ) : currentQuestionIndex < questions.length - 1 ? (
                        "Submit Answer & Next Question"
                      ) : (
                        <><Send className="w-4 h-4 mr-2" /> Complete Oral Defense & Submit</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Result / Asynchronous Evaluation Screen */}
            {step === 4 && (
              <div className="text-center animate-in zoom-in-95 duration-500 py-6 max-w-xl mx-auto">
                {evaluationPending && !result ? (
                  <div>
                    <div className="w-20 h-20 bg-amber-50 text-amber-700 border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xs">
                      <Clock className="w-10 h-10 animate-spin" />
                    </div>

                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                      Audit Processing
                    </span>

                    <h2 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 mt-3 mb-2">
                      Oral Defense & Codebase Submitted!
                    </h2>

                    <p className="text-xs md:text-sm text-stone-600 leading-relaxed max-w-md mx-auto mb-6">
                      Your technical defense audio transcript, coding challenge snippet, and repository telemetry have been submitted to the AI Engineering Audit panel.
                    </p>

                    {/* Audit Pipeline Progress Steps */}
                    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 text-left mb-6 space-y-3">
                      <div className="flex items-center gap-3 text-xs text-stone-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Repository Telemetry & AST Extracted</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-stone-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Oral Defense Audio Recorded & Verified</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-amber-700 font-semibold">
                        <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                        <span>Architectural Depth & Anti-Plagiarism Audit in Progress...</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-stone-400">
                        <Award className="w-4 h-4 shrink-0" />
                        <span>Level 2 Credential Badge & Hireability Score Update</span>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 text-left mb-6 flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <p>
                        <strong>Results will be announced shortly:</strong> Your complete score breakdown and Level 2 badge will be published to your Dashboard and portfolio within <strong>~1 to 2 minutes</strong>.
                      </p>
                    </div>

                    <button 
                      onClick={() => router.push('/dashboard/verify')}
                      className="w-full py-3.5 bg-emerald-800 text-white font-semibold text-xs md:text-sm rounded-xl hover:bg-emerald-900 transition-colors shadow-2xs"
                    >
                      Return to Verification Hub
                    </button>
                  </div>
                ) : result ? (
                  <div>
                    <div className="flex justify-center mb-5">
                      {result.passed ? (
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center justify-center shadow-xs">
                          <CheckCircle2 className="w-10 h-10" />
                        </div>
                      ) : (
                        <div className="w-20 h-20 bg-red-50 text-red-600 border border-red-200 rounded-full flex items-center justify-center shadow-xs">
                          <XCircle className="w-10 h-10" />
                        </div>
                      )}
                    </div>
                    
                    <h2 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 mb-2">
                      {result.passed ? "Level 2 Mastery Attained!" : "Verification Needs Revision"}
                    </h2>

                    <p className="text-xs md:text-sm text-stone-600 mb-6">
                      {result.passed 
                        ? `Congratulations! Your oral defense and repository depth for ${skillName} have been formally verified.`
                        : `Your submission did not meet the required threshold for Level 2 verification.`}
                    </p>

                    {result.proctoring_flagged && (
                      <div className="mb-4 bg-red-100 border border-red-300 rounded-xl p-3 text-red-900 text-xs text-left flex items-start gap-2">
                        <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Security Violation Flagged:</p>
                          <p>{result.violations_count || 'Security'} incident(s) detected during interview session (including camera/mobile device inspection).</p>
                        </div>
                      </div>
                    )}
                    
                    <div className={`p-5 rounded-2xl text-left text-xs md:text-sm ${result.passed ? 'bg-emerald-50 text-emerald-950 border border-emerald-200' : 'bg-red-50 text-red-950 border border-red-200'}`}>
                      <p className="font-bold mb-1.5 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-emerald-800" />
                        Senior AI Evaluator Feedback:
                      </p>
                      <p className="leading-relaxed opacity-95">{result.feedback}</p>
                    </div>
                    
                    <button 
                      onClick={() => router.push('/dashboard/verify')}
                      className="w-full mt-6 py-3.5 bg-emerald-800 text-white font-semibold text-xs md:text-sm rounded-xl hover:bg-emerald-900 transition-colors shadow-2xs"
                    >
                      Return to Verification Hub
                    </button>
                  </div>
                ) : null}
              </div>
            )}
            
          </div>
        </div>
      </main>
    </div>
  );
}

