"use client";

import React, { useState, useEffect, useRef, use } from 'react';
import { verifyProjectRepo, submitProjectInterview, getProjectIdea } from '@/lib/api';
import { 
  ArrowLeft, CheckCircle2, Send, Terminal, Loader2, XCircle, 
  ShieldAlert, Brain, Lightbulb, Code2, Mic, MicOff, Volume2, 
  VolumeX, RotateCcw, Sparkles, Clock, Radio, Award, UserCheck, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Editor } from '@monaco-editor/react';

export default function ProjectVerificationPage({ params }: { params: Promise<{ skill_name: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const skillName = decodeURIComponent(unwrappedParams.skill_name);
  
  const [step, setStep] = useState(0); // 0: Idea, 1: URL, 2: Virtual Voice Interview, 3: Result / Processing
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [projectIdea, setProjectIdea] = useState('');
  const [projectAbstract, setProjectAbstract] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  
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
  const [result, setResult] = useState<{passed: boolean, feedback: string} | null>(null);
  const [evaluationPending, setEvaluationPending] = useState(false);

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

  // Speak automatically when question changes in Step 2
  useEffect(() => {
    if (step === 2 && questions.length > 0 && voiceMode) {
      const q = questions[currentQuestionIndex];
      if (q) {
        const announcement = q.type === 'coding' 
          ? `Question ${currentQuestionIndex + 1}. Coding Challenge. ${q.text}. Please implement your solution in the code editor on screen.`
          : `Question ${currentQuestionIndex + 1}. ${q.text}`;
        speakQuestion(announcement);
      }
    }
  }, [step, currentQuestionIndex, voiceMode]);

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
      
      setQuestions(res.questions || []);
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
    setStep(3);
    setEvaluationPending(true);
    
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

          {step === 2 && (
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
            <div className={`transition-all duration-300 ${step >= 3 ? 'flex-1 bg-emerald-700' : 'w-0'}`} />
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
                  Step 2: Repository Telemetry
                </span>
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 mt-2 mb-2">
                  Submit Your {skillName} Repository
                </h2>
                <p className="text-stone-600 text-xs md:text-sm mb-6 leading-relaxed">
                  Provide your public GitHub repository. Our senior AI engineering assessor will inspect commit chronology, file trees, and implementation patterns to calibrate your oral defense.
                </p>
                
                <form onSubmit={handleVerifyUrl} className="space-y-4">
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
                      {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scanning Codebase & Commits...</> : "Audit Repo & Begin Virtual Oral Defense"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 2: Speech-to-Speech Virtual Technical Interview */}
            {step === 2 && questions.length > 0 && (
              <div className="animate-in fade-in duration-300">
                {/* Virtual Interviewer Studio Header */}
                <div className="bg-stone-900 text-white rounded-2xl p-5 mb-6 relative overflow-hidden shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      {/* Animated Avatar / Audio Orb */}
                      <div className="relative">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                          isAiSpeaking 
                            ? 'bg-emerald-500 shadow-lg shadow-emerald-500/40 animate-pulse' 
                            : isListening 
                            ? 'bg-rose-500 shadow-lg shadow-rose-500/40 animate-bounce' 
                            : 'bg-stone-700'
                        }`}>
                          <Brain className="w-6 h-6 text-white" />
                        </div>
                        {isAiSpeaking && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm tracking-tight">AI Senior Engineering Assessor</h3>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                            Oral Defense
                          </span>
                        </div>
                        <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1.5">
                          {isAiSpeaking ? (
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <Radio className="w-3.5 h-3.5 animate-pulse" /> Speaking question...
                            </span>
                          ) : isListening ? (
                            <span className="text-rose-400 font-semibold flex items-center gap-1">
                              <Mic className="w-3.5 h-3.5 animate-pulse" /> Listening to your answer...
                            </span>
                          ) : (
                            <span>Auditing your repository telemetry & architecture</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Speech Controls */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => speakQuestion(questions[currentQuestionIndex].text)}
                        title="Replay Question Audio"
                        className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-800 text-stone-300">
                        Q{currentQuestionIndex + 1} of {questions.length}
                      </div>
                    </div>
                  </div>

                  {/* Sound Wave Animation Visualizer */}
                  {(isAiSpeaking || isListening) && (
                    <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-center gap-1 h-6">
                      <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-3"></span>
                      <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-5 [animation-delay:0.1s]"></span>
                      <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-4 [animation-delay:0.2s]"></span>
                      <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-6 [animation-delay:0.15s]"></span>
                      <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-2 [animation-delay:0.3s]"></span>
                      <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-5 [animation-delay:0.25s]"></span>
                      <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-3 [animation-delay:0.05s]"></span>
                    </div>
                  )}
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
                  <p className="text-stone-900 font-semibold text-sm md:text-base leading-relaxed">
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

            {/* Step 3: Result / Asynchronous Evaluation Screen */}
            {step === 3 && (
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

