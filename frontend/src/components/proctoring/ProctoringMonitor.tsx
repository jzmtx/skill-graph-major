"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { 
  ShieldAlert, ShieldCheck, Camera, CameraOff, Video, AlertTriangle, 
  Smartphone, Eye, Users, ChevronDown, ChevronUp, Bell, Volume2, 
  VolumeX, Maximize2, Minimize2, Mic, MicOff, Lock, RefreshCw
} from 'lucide-react';

export interface ProctoringViolation {
  id: string;
  timestamp: string;
  type: 
    | 'mobile_phone' 
    | 'multiple_faces' 
    | 'no_face' 
    | 'tab_switch' 
    | 'screenshot_attempt' 
    | 'window_blur' 
    | 'blind_spot_gaze' 
    | 'camera_tilt'
    | 'audio_leak'
    | 'camera_disconnected';
  category: 'tab_switch' | 'webcam_issue' | 'voice_leak' | 'security';
  strikeCount: number;
  isPenaltyFlag: boolean;
  reason: string;
  confidence?: number;
}

export interface CategoryStrikeStats {
  tabSwitchStrikes: number;
  webcamStrikes: number;
  voiceStrikes: number;
  tabPenaltyFlags: number;
  webcamPenaltyFlags: number;
  voicePenaltyFlags: number;
  totalPenaltyFlags: number;
}

function computeIoU(b1: [number, number, number, number] | number[], b2: [number, number, number, number] | number[]): number {
  const [x1, y1, w1, h1] = b1;
  const [x2, y2, w2, h2] = b2;
  const ix1 = Math.max(x1, x2);
  const iy1 = Math.max(y1, y2);
  const ix2 = Math.min(x1 + w1, x2 + w2);
  const iy2 = Math.min(y1 + h1, y2 + h2);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const interArea = iw * ih;
  const unionArea = (w1 * h1) + (w2 * h2) - interArea;
  if (unionArea <= 0) return 0;
  return interArea / unionArea;
}

interface QuestionAudioMetadata {
  questionKeywords: string[];
  questionPhrases: string[];
  rareKeywords: string[];
  optionPhrases: { text: string; phrase: string }[];
  optionKeywordsMap: { text: string; keywords: string[] }[];
}

interface ProctoringMonitorProps {
  onViolation?: (violation: ProctoringViolation) => void;
  onCategoryStrikeChange?: (stats: CategoryStrikeStats) => void;
  isActive?: boolean;
  variant?: 'floating' | 'interview' | 'compact';
  title?: string;
  currentQuestionText?: string;
  currentOptions?: string[];
  onBlackoutChange?: (isBlackedOut: boolean) => void;
  onCameraStatusChange?: (isActive: boolean, error?: string | null) => void;
  retryCameraTrigger?: number;
}

const COMMON_STOPWORDS = new Set([
  'what', 'which', 'where', 'when', 'from', 'with', 'this', 'that', 'these',
  'those', 'have', 'been', 'will', 'would', 'could', 'should', 'about', 'there',
  'their', 'output', 'following', 'code', 'function', 'return', 'program', 'given',
  'true', 'false', 'select', 'correct', 'option', 'choose', 'below'
]);

export const ProctoringMonitor: React.FC<ProctoringMonitorProps> = ({
  onViolation,
  onCategoryStrikeChange,
  isActive = true,
  variant = 'floating',
  title = "AI Proctoring Guard",
  currentQuestionText = "",
  currentOptions = [],
  onBlackoutChange,
  onCameraStatusChange,
  retryCameraTrigger = 0
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [violations, setViolations] = useState<ProctoringViolation[]>([]);
  const [latestAlert, setLatestAlert] = useState<ProctoringViolation | null>(null);
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Categorized 3-Strike Rule States
  const [tabSwitchStrikes, setTabSwitchStrikes] = useState(0);
  const [webcamStrikes, setWebcamStrikes] = useState(0);
  const [voiceStrikes, setVoiceStrikes] = useState(0);

  const tabSwitchStrikesRef = useRef(0);
  const webcamStrikesRef = useRef(0);
  const voiceStrikesRef = useRef(0);

  // Threat & Telemetry States
  const [phoneDetectedActive, setPhoneDetectedActive] = useState(false);
  const [isBlackoutActive, setIsBlackoutActive] = useState(false);
  const [personStatus, setPersonStatus] = useState<'normal' | 'absent' | 'multiple'>('normal');
  const [gazeStatus, setGazeStatus] = useState<'center' | 'downward_lap' | 'away' | 'tilted'>('center');
  const [audioLeakActive, setAudioLeakActive] = useState(false);

  const cocoModelRef = useRef<any>(null);
  const isAnalyzingRef = useRef(false);
  const lastViolationTimeRef = useRef<Record<string, number>>({});
  const audioCtxRef = useRef<AudioContext | null>(null);
  const consecutiveDownwardFramesRef = useRef(0);
  const consecutiveTiltFramesRef = useRef(0);
  const consecutivePhoneHitsRef = useRef(0);
  const consecutiveAbsenceFramesRef = useRef(0);
  const blackoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Play subtle warning tone via Web Audio API
  const playAlertSound = useCallback(() => {
    if (isSoundMuted || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.28);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (_) {}
  }, [isSoundMuted]);

  // Activate Blackout Shield (renders pure pitch-black screen to protect content)
  const triggerBlackout = useCallback((durationMs = 2500) => {
    setIsBlackoutActive(true);
    onBlackoutChange?.(true);

    if (blackoutTimerRef.current) clearTimeout(blackoutTimerRef.current);
    blackoutTimerRef.current = setTimeout(() => {
      // If window is currently blurred or hidden (e.g. Snipping tool active), DO NOT lift blackout
      if (typeof document !== 'undefined' && (!document.hasFocus() || document.hidden)) {
        return;
      }
      setIsBlackoutActive(false);
      onBlackoutChange?.(false);
    }, durationMs);
  }, [onBlackoutChange]);

  // Dispatch violation event with type throttling and categorized 3-strike rules
  const triggerViolation = useCallback((
    type: ProctoringViolation['type'],
    rawReason: string,
    confidence = 0.85
  ) => {
    const now = Date.now();
    const lastTime = lastViolationTimeRef.current[type] || 0;
    if (now - lastTime < 3500) return; // Throttle to prevent spam
    lastViolationTimeRef.current[type] = now;

    // Determine category and increment corresponding strike counter
    let category: ProctoringViolation['category'] = 'security';
    let strikeCount = 1;
    let isPenaltyFlag = false;

    if (type === 'tab_switch' || type === 'window_blur' || type === 'screenshot_attempt') {
      category = 'tab_switch';
      tabSwitchStrikesRef.current += 1;
      strikeCount = tabSwitchStrikesRef.current;
      setTabSwitchStrikes(strikeCount);
    } else if (type === 'mobile_phone' || type === 'multiple_faces' || type === 'no_face' || type === 'blind_spot_gaze' || type === 'camera_tilt' || type === 'camera_disconnected') {
      category = 'webcam_issue';
      webcamStrikesRef.current += 1;
      strikeCount = webcamStrikesRef.current;
      setWebcamStrikes(strikeCount);
    } else if (type === 'audio_leak') {
      category = 'voice_leak';
      voiceStrikesRef.current += 1;
      strikeCount = voiceStrikesRef.current;
      setVoiceStrikes(strikeCount);
    } else {
      category = 'security';
      strikeCount = 1;
    }

    isPenaltyFlag = strikeCount > 3;

    // Compute updated stats
    const stats: CategoryStrikeStats = {
      tabSwitchStrikes: tabSwitchStrikesRef.current,
      webcamStrikes: webcamStrikesRef.current,
      voiceStrikes: voiceStrikesRef.current,
      tabPenaltyFlags: Math.max(0, tabSwitchStrikesRef.current - 3),
      webcamPenaltyFlags: Math.max(0, webcamStrikesRef.current - 3),
      voicePenaltyFlags: Math.max(0, voiceStrikesRef.current - 3),
      totalPenaltyFlags: (
        Math.max(0, tabSwitchStrikesRef.current - 3) +
        Math.max(0, webcamStrikesRef.current - 3) +
        Math.max(0, voiceStrikesRef.current - 3)
      )
    };

    // Format human-readable strike/flag explanation
    let reason = rawReason;
    if (category !== 'security') {
      if (strikeCount <= 3) {
        reason = `[Strike ${strikeCount}/3 - Warning]: ${rawReason} (3 warnings permitted per category before GLI penalties)`;
      } else {
        const excessFlags = strikeCount - 3;
        reason = `[PENALTY FLAG #${excessFlags} INCURRED]: ${rawReason} (Category threshold exceeded: ${strikeCount} total strikes. Directly reduces GLI score)`;
      }
    }

    const newViolation: ProctoringViolation = {
      id: `${type}_${now}`,
      timestamp: new Date().toLocaleTimeString(),
      type,
      category,
      strikeCount,
      isPenaltyFlag,
      reason,
      confidence
    };

    setViolations(prev => [newViolation, ...prev]);
    setLatestAlert(newViolation);
    setIsAlertVisible(true);
    playAlertSound();

    if (type === 'mobile_phone' || type === 'screenshot_attempt' || type === 'tab_switch') {
      setPhoneDetectedActive(true);
      triggerBlackout(3000);
      setTimeout(() => setPhoneDetectedActive(false), 3000);
    }

    if (type === 'audio_leak') {
      setAudioLeakActive(true);
      setTimeout(() => setAudioLeakActive(false), 3000);
    }

    if (onViolation) {
      onViolation(newViolation);
    }

    if (onCategoryStrikeChange) {
      onCategoryStrikeChange(stats);
    }
  }, [onViolation, onCategoryStrikeChange, playAlertSound, triggerBlackout]);

  // Auto-dismiss alert notification banner
  useEffect(() => {
    if (!isAlertVisible) return;
    const timer = setTimeout(() => setIsAlertVisible(false), 4500);
    return () => clearTimeout(timer);
  }, [isAlertVisible]);

  // Request Webcam Stream
  const startCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Webcam access not supported in this browser");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 480 },
          height: { ideal: 360 },
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn("Video play error:", e));
      }

      // Attach track disconnection and mute listeners
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          setHasPermission(false);
          const err = "Camera feed was disconnected or stopped.";
          setCameraError(err);
          onCameraStatusChange?.(false, err);
          triggerViolation('camera_disconnected', 'Webcam feed was disconnected or turned off during the assessment.');
        };
        videoTrack.onmute = () => {
          setHasPermission(false);
          const err = "Camera feed was muted or turned off.";
          setCameraError(err);
          onCameraStatusChange?.(false, err);
          triggerViolation('camera_disconnected', 'Webcam feed was muted or turned off during the assessment.');
        };
        videoTrack.onunmute = () => {
          setHasPermission(true);
          setCameraError(null);
          onCameraStatusChange?.(true, null);
        };
      }

      setHasPermission(true);
      setCameraError(null);
      onCameraStatusChange?.(true, null);
    } catch (err: any) {
      setHasPermission(false);
      const errMsg = err.name === 'NotAllowedError'
        ? "Camera permission denied. Please allow camera access in browser settings."
        : (err.message || "Camera permission denied or camera not found.");
      setCameraError(errMsg);
      onCameraStatusChange?.(false, errMsg);
    }
  }, [onCameraStatusChange, triggerViolation]);

  useEffect(() => {
    if (!isActive) return;

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [isActive, retryCameraTrigger, startCamera]);

  // Dynamically load TensorFlow.js and COCO-SSD from CDN with strict dependency sequencing
  useEffect(() => {
    if (typeof window === 'undefined' || !isActive) return;
    let isCancelled = false;

    async function loadCoco() {
      try {
        // Fast path: both tf and cocoSsd already available
        if ((window as any).cocoSsd && (window as any).tf) {
          const model = await (window as any).cocoSsd.load({ base: 'lite_mobilenet_v2' });
          if (!isCancelled) {
            cocoModelRef.current = model;
            setModelLoaded(true);
          }
          return;
        }

        const injectScript = (src: string, isLoadedCheck: () => boolean): Promise<void> => {
          return new Promise((resolve, reject) => {
            if (isLoadedCheck()) {
              resolve();
              return;
            }
            const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
            if (existing) {
              if (isLoadedCheck()) {
                resolve();
                return;
              }
              const onExistingLoad = () => {
                existing.removeEventListener('load', onExistingLoad);
                resolve();
              };
              existing.addEventListener('load', onExistingLoad);
              existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
              
              const checkInt = setInterval(() => {
                if (isLoadedCheck()) {
                  clearInterval(checkInt);
                  resolve();
                }
              }, 50);
              setTimeout(() => { clearInterval(checkInt); resolve(); }, 3500);
              return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.async = false;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
          });
        };

        // 1. First inject and wait for TensorFlow.js
        await injectScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js', () => Boolean((window as any).tf));

        // Verify window.tf is fully available before attempting COCO-SSD
        let tfReady = Boolean((window as any).tf);
        if (!tfReady) {
          for (let i = 0; i < 25; i++) {
            await new Promise(r => setTimeout(r, 100));
            if ((window as any).tf) {
              tfReady = true;
              break;
            }
          }
        }

        if (!tfReady || isCancelled) {
          return;
        }

        // 2. Then inject COCO-SSD
        await injectScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js', () => Boolean((window as any).cocoSsd));

        // 3. Initialize model only if both tf and cocoSsd are verified in scope
        if ((window as any).cocoSsd && (window as any).tf && !isCancelled) {
          const model = await (window as any).cocoSsd.load({ base: 'lite_mobilenet_v2' });
          if (!isCancelled) {
            cocoModelRef.current = model;
            setModelLoaded(true);
          }
        }
      } catch (err) {
        console.warn("[Proctoring] AI CDN script offline, running resilient canvas vision engine:", err);
      }
    }

    loadCoco();

    return () => {
      isCancelled = true;
    };
  }, [isActive]);

  // Extract Question Keywords, Phrases, and Multiple Choice Options for Audio Whisper / Reading / Assistant Leak Detection
  const { 
    questionKeywords, 
    questionPhrases, 
    rareKeywords,
    optionPhrases,
    optionKeywordsMap
  } = useMemo<QuestionAudioMetadata>((): QuestionAudioMetadata => {
    // 1. Question extraction
    const cleanQ = (currentQuestionText || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ');
    const qTokens = cleanQ
      .split(/\s+/)
      .filter(w => w.length >= 3 && !COMMON_STOPWORDS.has(w));

    const rawQWords = cleanQ.split(/\s+/).filter(w => w.length >= 3);
    const qPhrases: string[] = [];
    for (let i = 0; i < rawQWords.length - 1; i++) {
      if (!COMMON_STOPWORDS.has(rawQWords[i]) || !COMMON_STOPWORDS.has(rawQWords[i + 1])) {
        qPhrases.push(`${rawQWords[i]} ${rawQWords[i + 1]}`);
      }
    }

    const rareQ = qTokens.filter(w => w.length >= 5);

    // 2. Options extraction
    const optPhrases: { text: string; phrase: string }[] = [];
    const optKwMap: { text: string; keywords: string[] }[] = [];

    (currentOptions || []).forEach(opt => {
      if (!opt || typeof opt !== 'string') return;
      const cleanOpt = opt
        .toLowerCase()
        .replace(/^[a-d0-9][\).\s\-]+/, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .trim();

      const optWords = cleanOpt.split(/\s+/).filter(w => w.length >= 3);
      const keywords = optWords.filter(w => !COMMON_STOPWORDS.has(w) && w.length >= 3);

      if (keywords.length > 0) {
        optKwMap.push({ text: opt, keywords: Array.from(new Set(keywords)) });
      }

      for (let i = 0; i < optWords.length - 1; i++) {
        optPhrases.push({ text: opt, phrase: `${optWords[i]} ${optWords[i + 1]}` });
        if (i < optWords.length - 2) {
          optPhrases.push({ text: opt, phrase: `${optWords[i]} ${optWords[i + 1]} ${optWords[i + 2]}` });
        }
      }
    });

    return {
      questionKeywords: Array.from(new Set(qTokens)),
      questionPhrases: Array.from(new Set(qPhrases)),
      rareKeywords: Array.from(new Set(rareQ)),
      optionPhrases: optPhrases,
      optionKeywordsMap: optKwMap
    };
  }, [currentQuestionText, currentOptions]);

  // Audio Microphone Speech-to-Text: Detects Assistants Answering Questions, Whispering Answers, or Candidate Leaks
  useEffect(() => {
    if (typeof window === 'undefined' || !isActive) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    let isMounted = true;
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        if (!isMounted) return;
        let spokenText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          spokenText += ' ' + event.results[i][0].transcript;
        }

        const cleanSpoken = spokenText
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ');
        const spokenWords = cleanSpoken
          .split(/\s+/)
          .filter(Boolean);

        // 0. Assistant Dictating Answers & Option Choices
        const ASSISTANT_ANSWER_PATTERNS = [
          'option a', 'option b', 'option c', 'option d',
          'option 1', 'option 2', 'option 3', 'option 4',
          'option one', 'option two', 'option three', 'option four',
          'choose a', 'choose b', 'choose c', 'choose d',
          'choose option', 'choose the',
          'select a', 'select b', 'select c', 'select d',
          'select option', 'select the first', 'select the second', 'select the third', 'select the fourth',
          'click a', 'click b', 'click c', 'click d',
          'click on a', 'click on b', 'click on c', 'click on d',
          'mark a', 'mark b', 'mark c', 'mark d', 'mark option',
          'answer is a', 'answer is b', 'answer is c', 'answer is d',
          'the answer is a', 'the answer is b', 'the answer is c', 'the answer is d',
          'the answer is', 'correct answer is', 'correct option is',
          'it is option', 'its option', "it's option",
          'go with a', 'go with b', 'go with c', 'go with d',
          'first option', 'second option', 'third option', 'fourth option',
          'pick a', 'pick b', 'pick c', 'pick d',
          'put option', 'type option'
        ];

        for (const pattern of ASSISTANT_ANSWER_PATTERNS) {
          if (cleanSpoken.includes(pattern)) {
            triggerViolation(
              'audio_leak',
              `Assistant Audio Leak: External assistant answering question verbally ("${pattern.toUpperCase()}"). Human voice assistance strictly prohibited.`,
              0.98
            );
            return;
          }
        }

        // 1. Assistant Verbalizing Option Choices / Text
        for (const item of optionPhrases) {
          if (item.phrase.length >= 6 && cleanSpoken.includes(item.phrase)) {
            triggerViolation(
              'audio_leak',
              `Assistant Audio Leak: Outside assistant speaking answer option ("${item.phrase}"). Outside coaching strictly prohibited.`,
              0.96
            );
            return;
          }
        }

        for (const item of optionKeywordsMap) {
          const matched = item.keywords.filter((kw: string) => spokenWords.includes(kw));
          if (matched.length >= 2 || (matched.length >= 1 && item.keywords.length === 1 && matched[0].length >= 6)) {
            triggerViolation(
              'audio_leak',
              `Assistant Audio Leak: Multiple answer keywords verbalized for option ("${matched.join(', ')}"). Outside voice assistance prohibited.`,
              0.94
            );
            return;
          }
        }

        // 2. Candidate verbally querying external assistant for answers
        const ASSISTANCE_QUERY_PATTERNS = [
          'what is the answer',
          'tell me the answer',
          'tell me answer',
          'give me the answer',
          'give answer',
          'what is option',
          'how to solve',
          'can you answer',
          'what is the correct',
          'which option is correct',
          'solve this for me',
          'answer for this question',
          'whats the answer',
          'tell the answer'
        ];
        for (const pattern of ASSISTANCE_QUERY_PATTERNS) {
          if (cleanSpoken.includes(pattern)) {
            triggerViolation(
              'audio_leak',
              `Audio Alert: Candidate verbally querying external assistant for answer ("${pattern}"). Oral assistance prohibited.`,
              0.98
            );
            return;
          }
        }

        // 3. Candidate spelling out letters (e.g. "s q l" -> "sql" or "p y t h o n")
        const spelledRuns: string[] = [];
        let currRun = '';
        for (const word of spokenWords) {
          if (word.length === 1 && /[a-z]/i.test(word)) {
            currRun += word;
          } else {
            if (currRun.length >= 3) spelledRuns.push(currRun);
            currRun = '';
          }
        }
        if (currRun.length >= 3) spelledRuns.push(currRun);

        for (const spelled of spelledRuns) {
          if (questionKeywords.includes(spelled)) {
            triggerViolation(
              'audio_leak',
              `Audio Alert: Candidate detected spelling out question keyword aloud ("${spelled.toUpperCase()}"). Oral spelling or whispering prohibited.`,
              0.96
            );
            return;
          }
        }

        // 4. 2-word phrase matches from question
        for (const phrase of questionPhrases) {
          if (cleanSpoken.includes(phrase)) {
            triggerViolation(
              'audio_leak',
              `Audio Alert: Candidate reading question phrase aloud ("${phrase}"). Whispering or voice assistance prohibited.`,
              0.95
            );
            return;
          }
        }

        // 5. Rare / specialized terminology match (e.g. "polymorphism", "recursion")
        const rareMatches = rareKeywords.filter((kw: string) => spokenWords.includes(kw));
        if (rareMatches.length >= 1) {
          triggerViolation(
            'audio_leak',
            `Audio Alert: Candidate reading key question terminology aloud ("${rareMatches[0]}"). Speaking into microphone prohibited.`,
            0.92
          );
          return;
        }

        // 6. Multiple general question keywords spoken (>= 2)
        const matches = questionKeywords.filter((kw: string) => spokenWords.includes(kw));
        if (matches.length >= 2) {
          triggerViolation(
            'audio_leak',
            `Audio Alert: Candidate detected reading question keywords aloud ("${matches.slice(0, 3).join(', ')}"). Whispering prohibited.`,
            0.90
          );
        }
      };

      recognition.onerror = () => {};
      recognition.onend = () => {
        // Auto restart speech listener while assessment is active
        if (isMounted && isActive) {
          try { recognition.start(); } catch (_) {}
        }
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch (_) {}

    return () => {
      isMounted = false;
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch (_) {}
        speechRecognitionRef.current = null;
      }
    };
  }, [isActive, questionKeywords, questionPhrases, rareKeywords, optionPhrases, optionKeywordsMap, triggerViolation]);

  // Low-Light Adaptive Computer Vision Engine (Zero False-Positives in Night/Dim Light)
  const runCanvasHeuristicScan = useCallback((video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const w = 160;
    const h = 120;
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);

    const frame = ctx.getImageData(0, 0, w, h);
    const data = frame.data;
    const len = data.length;

    let skinPixels = 0;
    let totalLuminance = 0;
    let faceTopLuminance = 0;
    let faceBottomLuminance = 0;
    let facePixelCount = 0;
    let centerSilhouettePixels = 0;

    const sampledCount = len / 16;

    // First pass: Calculate whole frame ambient luminance
    for (let i = 0; i < len; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      totalLuminance += (0.299 * r + 0.587 * g + 0.114 * b);
    }
    const ambientLum = totalLuminance / sampledCount;
    const isNightVision = ambientLum < 55; // Low-light / dark room adaptation threshold

    // Second pass: Adaptive analysis
    for (let i = 0; i < len; i += 16) {
      const pxIndex = i / 4;
      const py = Math.floor(pxIndex / w);
      const px = pxIndex % w;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = (0.299 * r + 0.587 * g + 0.114 * b);

      // Light-adaptive skin tone evaluation
      const isSkin = isNightVision
        ? (r > 30 && r >= g && r >= b && lum > 12) // Relaxed chroma for dark/shadowed faces in night light
        : (r > 60 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 12);

      if (isSkin) skinPixels++;

      // Candidate silhouette tracker in frame center for night vision
      if (px > w * 0.20 && px < w * 0.80 && py > h * 0.10 && py < h * 0.90) {
        if (lum > 12 && lum < 140) {
          centerSilhouettePixels++;
        }
      }

      // Upper face quadrant
      if (py > h * 0.15 && py < h * 0.65 && px > w * 0.25 && px < w * 0.75) {
        if (isSkin) {
          facePixelCount++;
          if (py < h * 0.40) faceTopLuminance += lum;
          else faceBottomLuminance += lum;
        }
      }
    }

    const skinRatio = skinPixels / sampledCount;

    // 1. Presence check with low-light tolerance
    const isCandidatePresent = isNightVision
      ? (skinRatio >= 0.015 || centerSilhouettePixels > 80)
      : (skinRatio >= 0.035);

    if (!isCandidatePresent) {
      consecutiveAbsenceFramesRef.current++;
      const absenceThreshold = isNightVision ? 8 : 4; // Tolerates low-light shadows without false alarms
      if (consecutiveAbsenceFramesRef.current >= absenceThreshold) {
        setPersonStatus('absent');
        triggerViolation('no_face', 'Candidate absent from camera view or camera obstructed.', 0.82);
      }
    } else {
      consecutiveAbsenceFramesRef.current = 0;
      setPersonStatus('normal');
    }

    // Natural head movement and screen reading are allowed; no false-positive downward gaze flags
    setGazeStatus('center');
  }, [triggerViolation]);

  // Main Detection Loop (Scans every 500ms)
  useEffect(() => {
    if (!isActive || !hasPermission) return;

    const interval = setInterval(async () => {
      if (isAnalyzingRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const overlayCanvas = overlayCanvasRef.current;

      if (!video || video.readyState < 2 || !canvas) return;

      isAnalyzingRef.current = true;

      try {
        const vWidth = video.videoWidth || 320;
        const vHeight = video.videoHeight || 240;

        if (cocoModelRef.current) {
          // Detect candidate objects & gadgets with high sensitivity (minScore: 0.28, maxBoxes: 20)
          const predictions = await cocoModelRef.current.detect(video, 20, 0.28);

          let rawGadgetDetected = false;
          let gadgetConfidence = 0;
          let gadgetName = 'MOBILE PHONE';
          let candidateBox: [number, number, number, number] | null = null;

          // 1. Person Tracking & Deduplication (IoU-based NMS)
          const rawPersonPredictions = predictions
            .filter((p: any) => p.class === 'person' && p.score >= 0.28)
            .sort((a: any, b: any) => b.score - a.score);

          const distinctPersons: any[] = [];
          for (const person of rawPersonPredictions) {
            let isDuplicate = false;
            for (const accepted of distinctPersons) {
              if (computeIoU(person.bbox, accepted.bbox) > 0.50) {
                isDuplicate = true;
                break;
              }
            }
            if (!isDuplicate) {
              distinctPersons.push(person);
            }
          }

          // Candidate is the person with the largest bounding box area in the frame
          if (distinctPersons.length > 0) {
            let maxArea = -1;
            for (const p of distinctPersons) {
              const area = p.bbox[2] * p.bbox[3];
              if (area > maxArea) {
                maxArea = area;
                candidateBox = p.bbox;
              }
            }
          }

          // 2. Gadget & Mobile Electronic Device Identification
          predictions.forEach((p: any) => {
            const cls = (p.class || '').toLowerCase();
            const score = p.score || 0;
            const [, , w, h] = p.bbox;

            // Reject noise dots or background walls spanning entire view
            if (w < 16 || h < 16 || w > vWidth * 0.90 || h > vHeight * 0.90) return;

            let isGadget = false;
            let label = '';

            if (cls === 'cell phone' && score >= 0.28) {
              isGadget = true;
              label = 'MOBILE PHONE';
            } else if (cls === 'remote' && score >= 0.32) {
              isGadget = true;
              label = 'REMOTE GADGET';
            } else if (cls === 'camera' && score >= 0.32) {
              isGadget = true;
              label = 'CAMERA DEVICE';
            } else if (cls === 'laptop' && score >= 0.38) {
              isGadget = true;
              label = 'SECONDARY LAPTOP';
            } else if ((cls === 'tv' || cls === 'monitor') && score >= 0.42) {
              isGadget = true;
              label = 'EXTERNAL MONITOR';
            }

            if (isGadget) {
              rawGadgetDetected = true;
              if (score > gadgetConfidence) {
                gadgetConfidence = score;
                gadgetName = label;
              }
            }
          });

          // 3. Canvas Overlay Rendering with Unmirrored Labels
          if (overlayCanvas) {
            const oCtx = overlayCanvas.getContext('2d');
            if (oCtx) {
              overlayCanvas.width = vWidth;
              overlayCanvas.height = vHeight;
              oCtx.clearRect(0, 0, vWidth, vHeight);

              // Render Persons
              distinctPersons.forEach((p: any) => {
                const [x, y, w, h] = p.bbox;
                const isCandidate = candidateBox && (x === candidateBox[0] && y === candidateBox[1]);

                if (isCandidate) {
                  // Verified green candidate reticle
                  oCtx.strokeStyle = '#10b981';
                  oCtx.lineWidth = 1.5;
                  oCtx.setLineDash([4, 4]);
                  oCtx.strokeRect(x, y, w, h);
                  oCtx.setLineDash([]);
                } else {
                  // UNAUTHORIZED HUMAN ASSISTANT detected in frame!
                  oCtx.strokeStyle = '#ef4444';
                  oCtx.lineWidth = 3;
                  oCtx.strokeRect(x, y, w, h);

                  oCtx.fillStyle = 'rgba(239, 68, 68, 0.92)';
                  oCtx.fillRect(x, Math.max(0, y - 22), 220, 22);

                  oCtx.save();
                  oCtx.translate(x + 4, Math.max(14, y - 6));
                  oCtx.fillStyle = '#ffffff';
                  oCtx.font = 'bold 11px monospace';
                  oCtx.fillText(`UNAUTHORIZED ASSISTANT ${(p.score * 100).toFixed(0)}%`, 0, 0);
                  oCtx.restore();
                }
              });

              // Render Prohibited Gadgets (Glowing Red Bounding Box)
              predictions.forEach((p: any) => {
                const cls = (p.class || '').toLowerCase();
                const score = p.score || 0;
                const [x, y, w, h] = p.bbox;
                if (w < 16 || h < 16 || w > vWidth * 0.90 || h > vHeight * 0.90) return;

                let label = '';
                if (cls === 'cell phone' && score >= 0.28) label = 'MOBILE PHONE';
                else if (cls === 'remote' && score >= 0.32) label = 'REMOTE GADGET';
                else if (cls === 'camera' && score >= 0.32) label = 'CAMERA DEVICE';
                else if (cls === 'laptop' && score >= 0.38) label = 'SECONDARY LAPTOP';
                else if ((cls === 'tv' || cls === 'monitor') && score >= 0.42) label = 'EXTERNAL MONITOR';

                if (label) {
                  oCtx.strokeStyle = '#ef4444';
                  oCtx.lineWidth = 3;
                  oCtx.strokeRect(x, y, w, h);

                  oCtx.fillStyle = 'rgba(239, 68, 68, 0.95)';
                  oCtx.fillRect(x, Math.max(0, y - 22), 195, 22);

                  oCtx.save();
                  oCtx.translate(x + 4, Math.max(14, y - 6));
                  oCtx.fillStyle = '#ffffff';
                  oCtx.font = 'bold 11px monospace';
                  oCtx.fillText(`${label} ${(score * 100).toFixed(0)}%`, 0, 0);
                  oCtx.restore();
                }
              });
            }
          }

          // 4. Trigger Gadget Violations
          if (rawGadgetDetected) {
            consecutivePhoneHitsRef.current++;
            if (consecutivePhoneHitsRef.current >= 1) {
              setPhoneDetectedActive(true);
              triggerViolation(
                'mobile_phone',
                `Prohibited Gadget Detected: ${gadgetName} identified in camera view (${(gadgetConfidence * 100).toFixed(0)}% confidence). Devices strictly prohibited during exam.`,
                gadgetConfidence
              );
            }
          } else {
            consecutivePhoneHitsRef.current = 0;
            setPhoneDetectedActive(false);
          }

          // 5. Trigger Multi-Person / Human Assistant / Absence Violations
          const personCount = distinctPersons.length;
          if (personCount === 0) {
            consecutiveAbsenceFramesRef.current++;
            if (consecutiveAbsenceFramesRef.current >= 3) {
              setPersonStatus('absent');
              triggerViolation('no_face', 'Candidate Absent: No face or person detected in webcam view. Candidate must remain continuously in camera frame.', 0.88);
            }
          } else if (personCount > 1) {
            consecutiveAbsenceFramesRef.current = 0;
            setPersonStatus('multiple');
            triggerViolation(
              'multiple_faces',
              `Human Assistance Detected: Second individual / assistant detected in camera view (${personCount} persons in room). Outside assistance is strictly prohibited.`,
              0.96
            );
          } else {
            consecutiveAbsenceFramesRef.current = 0;
            setPersonStatus('normal');

            // Screen tilt evasion check (laptop screen pushed excessively back)
            if (candidateBox) {
              const [, py, , ph] = candidateBox;
              if (py < vHeight * 0.04 && ph < vHeight * 0.32) {
                consecutiveTiltFramesRef.current++;
                if (consecutiveTiltFramesRef.current >= 4) {
                  setGazeStatus('tilted');
                  triggerViolation('camera_tilt', 'Camera angle tilted too high. Please tilt your screen down so face and hands are clearly visible.', 0.89);
                }
              } else {
                consecutiveTiltFramesRef.current = 0;
              }
            }
          }

          // Execute low-light adapted downside scan
          runCanvasHeuristicScan(video, canvas);
        } else {
          runCanvasHeuristicScan(video, canvas);
        }
      } catch (err) {
        console.warn("[Proctoring] Inference cycle error:", err);
      } finally {
        isAnalyzingRef.current = false;
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isActive, hasPermission, runCanvasHeuristicScan, triggerViolation]);

  // Screen-Capture Interception: Immediately Blacks Out on Capture Keys, Window Blur, or Snipping Tool
  useEffect(() => {
    if (!isActive) return;

    // Window Blur: When candidate switches tabs, opens Snipping Tool (Win+Shift+S), or launches grabber
    // The screen IMMEDIATELY blacks out and STAYS 100% BLACK until window regains focus!
    const handleWindowBlur = () => {
      setIsBlackoutActive(true);
      onBlackoutChange?.(true);
      triggerViolation('window_blur', 'Window focus lost. Secondary application or screen capture tool active.', 0.95);
    };

    // Window Focus: Retain blackout for 1200ms after focus returns so snipping overlays vanish completely
    const handleWindowFocus = () => {
      if (blackoutTimerRef.current) clearTimeout(blackoutTimerRef.current);
      blackoutTimerRef.current = setTimeout(() => {
        if (typeof document !== 'undefined' && document.hasFocus() && !document.hidden) {
          setIsBlackoutActive(false);
          onBlackoutChange?.(false);
        }
      }, 1200);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlackoutActive(true);
        onBlackoutChange?.(true);
        triggerViolation('tab_switch', 'Candidate navigated away from examination window or switched browser tabs.', 0.99);
      } else {
        if (blackoutTimerRef.current) clearTimeout(blackoutTimerRef.current);
        blackoutTimerRef.current = setTimeout(() => {
          if (document.hasFocus()) {
            setIsBlackoutActive(false);
            onBlackoutChange?.(false);
          }
        }, 1200);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen Key (standalone or combo)
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        triggerBlackout(4000);
        triggerViolation('screenshot_attempt', 'Screen capture attempted via PrintScreen.', 1.0);
      }
      // Windows Snipping Tool (Meta+Shift+S / Win+Shift+S) / Mac Screenshot (Cmd+Shift+3/4/5)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'S' || e.key === 's' || e.key === '3' || e.key === '4' || e.key === '5')) {
        e.preventDefault();
        triggerBlackout(4000);
        triggerViolation('screenshot_attempt', 'Screen clipping / capture shortcut detected.', 1.0);
      }
      // Print Dialog (Ctrl+P / Cmd+P)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        triggerBlackout(3500);
        triggerViolation('screenshot_attempt', 'Print / save page shortcut blocked.', 1.0);
      }
      // Devtools inspector (Ctrl+Shift+I / F12)
      if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c'))) {
        e.preventDefault();
        triggerBlackout(3000);
        triggerViolation('screenshot_attempt', 'Developer inspection shortcut blocked.', 1.0);
      }
      // Copy shortcut (Ctrl+C / Cmd+C)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        triggerBlackout(2000);
      }
    };

    // Clipboard Copy / Cut Interception: Wipe clipboard data and trigger blackout
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', '');
      }
      triggerBlackout(2500);
    };

    // Prevent right-click context menu (inspect / save image)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Prevent dragging question text
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('copy', handleCopy);
    window.addEventListener('cut', handleCopy);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('dragstart', handleDragStart);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('cut', handleCopy);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('dragstart', handleDragStart);
      if (blackoutTimerRef.current) clearTimeout(blackoutTimerRef.current);
    };
  }, [isActive, triggerBlackout, triggerViolation, onBlackoutChange]);

  const isInterviewMode = variant === 'interview';

  return (
    <>
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Global CSS for Print Screen Media Blackout */}
      <style jsx global>{`
        @media print {
          body * {
            display: none !important;
          }
          body {
            background-color: #000000 !important;
            background: #000000 !important;
          }
        }
      `}</style>

      {/* IMMERSIVE ANTI-CAPTURE BLACKOUT SHIELD */}
      {/* Non-disruptive Proctoring: Exam screen remains visible without full-screen blackouts */}

      {/* Global Full-Screen Red Alert Flashing Border */}
      {phoneDetectedActive && (
        <div className="fixed inset-0 pointer-events-none z-50 border-4 border-red-600 animate-pulse bg-red-500/10 transition-all duration-300" />
      )}

      {/* Floating Alert Toast for Proctoring Violations */}
      {isAlertVisible && latestAlert && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm w-full bg-red-950/95 text-white border border-red-500/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-600 rounded-xl shrink-0 text-white animate-bounce">
              {latestAlert.type === 'mobile_phone' ? (
                <Smartphone className="w-5 h-5" />
              ) : latestAlert.type === 'audio_leak' ? (
                <Mic className="w-5 h-5" />
              ) : latestAlert.type === 'multiple_faces' ? (
                <Users className="w-5 h-5" />
              ) : (
                <ShieldAlert className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-wider font-bold uppercase text-red-400 bg-red-900/60 px-2 py-0.5 rounded-full border border-red-700/50">
                  SECURITY VIOLATION #{violations.length}
                </span>
                <span className="text-[10px] font-mono text-stone-400">{latestAlert.timestamp}</span>
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-red-200 mt-1">
                {latestAlert.type === 'mobile_phone'
                  ? 'Mobile Device / Photo Capture Detected!'
                  : latestAlert.type === 'audio_leak'
                  ? 'Audio Leak / Reading Question Aloud!'
                  : latestAlert.type === 'blind_spot_gaze'
                  ? 'Downward Lap Gaze Detected'
                  : latestAlert.type === 'multiple_faces'
                  ? 'Multiple Persons in Environment'
                  : latestAlert.type === 'no_face'
                  ? 'Candidate Out of View'
                  : 'Window Focus Lost'}
              </h4>
              <p className="text-[11px] text-stone-300 mt-0.5 leading-snug">
                {latestAlert.reason}
              </p>
              <p className="text-[10px] text-amber-300/90 font-mono mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                This incident is permanently logged in your integrity telemetry.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Proctoring HUD Widget */}
      <div 
        className={
          isInterviewMode
            ? "relative w-full rounded-2xl overflow-hidden bg-stone-900 border border-stone-800 shadow-xl"
            : `fixed bottom-4 right-4 z-40 transition-all duration-300 ${
                isMinimized ? "w-56" : "w-72 sm:w-80"
              } bg-stone-950/95 border ${
                phoneDetectedActive 
                  ? "border-red-500 shadow-red-500/30 ring-2 ring-red-500/50" 
                  : "border-stone-800 shadow-2xl"
              } rounded-2xl overflow-hidden backdrop-blur-md`
        }
      >
        {/* Widget Header */}
        <div className="px-3.5 py-2.5 bg-gradient-to-r from-stone-900 via-stone-900 to-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${
              hasPermission ? (phoneDetectedActive ? 'bg-red-500 animate-ping' : 'bg-emerald-400 animate-pulse') : 'bg-amber-500'
            }`} />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-stone-200 flex items-center gap-1 font-serif">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {title}
              </span>
              <span className="text-[9px] font-mono text-stone-400">
                {modelLoaded ? 'AI Vision, Audio & Screen Guard Active' : 'Real-time Camera & Mic Guard Active'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsSoundMuted(!isSoundMuted)}
              title={isSoundMuted ? "Unmute Alerts" : "Mute Alerts"}
              className="p-1 rounded-md text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors cursor-pointer"
            >
              {isSoundMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            {!isInterviewMode && (
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Expand Camera" : "Minimize Camera"}
                className="p-1 rounded-md text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors cursor-pointer"
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Video Stage (hidden when minimized) */}
        {!isMinimized && (
          <div className="relative aspect-4/3 w-full bg-black overflow-hidden group">
            {/* Live Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover -scale-x-100"
            />

            {/* AI Bounding Box Canvas Overlay */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none -scale-x-100"
            />

            {/* Camera Permission / Error Fallback */}
            {hasPermission === false && (
              <div className="absolute inset-0 bg-stone-950/95 flex flex-col items-center justify-center p-4 text-center z-10">
                <CameraOff className="w-8 h-8 text-red-500 mb-2" />
                <p className="text-xs font-semibold text-stone-200 mb-1">Camera Feed Inactive</p>
                <p className="text-[11px] text-stone-400 mb-3">{cameraError || "Webcam is turned off or access was denied."}</p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Turn On Camera
                </button>
              </div>
            )}

            {/* Live Scanner HUD Reticle & Telemetry Overlay */}
            <div className="absolute inset-0 pointer-events-none p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-black/60 text-emerald-400 border border-emerald-500/30 backdrop-blur-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE PROCTOR
                </span>
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border backdrop-blur-xs ${
                  phoneDetectedActive
                    ? 'bg-red-950/90 text-red-300 border-red-500 font-bold animate-pulse'
                    : personStatus === 'multiple'
                    ? 'bg-red-950/90 text-red-300 border-red-500 font-bold animate-pulse'
                    : audioLeakActive
                    ? 'bg-amber-950/90 text-amber-300 border-amber-500 font-bold animate-pulse'
                    : 'bg-black/70 text-stone-300 border-stone-700'
                }`}>
                  {phoneDetectedActive
                    ? '⚠️ GADGET / PHONE DETECTED'
                    : personStatus === 'multiple'
                    ? '⚠️ ASSISTANT IN FRAME'
                    : audioLeakActive
                    ? '⚠️ ASSISTANT SPEECH DETECTED'
                    : '🛡️ 360° ANTI-CHEAT ACTIVE'}
                </span>
              </div>

              {/* Status footer bar inside video */}
              <div className="flex items-center justify-between text-[10px] font-mono text-stone-300 bg-black/80 px-2 py-1 rounded-md backdrop-blur-xs">
                <div className="flex items-center gap-1.5">
                  <span>
                    {personStatus === 'absent' ? (
                      <span className="text-amber-400 font-bold">Candidate Absent</span>
                    ) : personStatus === 'multiple' ? (
                      <span className="text-red-400 font-bold">Multiple Persons / Assistant Detected!</span>
                    ) : (
                      <span className="text-emerald-400">Candidate In View</span>
                    )}
                  </span>
                  <span className="text-stone-500">•</span>
                  <span>
                    {gazeStatus === 'downward_lap' ? (
                      <span className="text-amber-400 font-bold animate-pulse">👁️ Gaze: Lap</span>
                    ) : gazeStatus === 'tilted' ? (
                      <span className="text-amber-400 font-bold">⚠️ Screen Tilt</span>
                    ) : (
                      <span className="text-stone-300">👁️ Screen Focus</span>
                    )}
                  </span>
                </div>
                <span className={violations.length > 0 ? "text-amber-400 font-bold" : "text-stone-400"}>
                  Strikes: {violations.length}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3-Category Strike Meter */}
        <div className="grid grid-cols-3 gap-1 px-2.5 py-2 bg-stone-900 border-t border-stone-800 text-[10px] font-mono text-center">
          <div className={`p-1 rounded border transition-colors ${
            tabSwitchStrikes > 3 
              ? 'bg-red-950/80 border-red-500 text-red-300 font-bold' 
              : tabSwitchStrikes > 0 
              ? 'bg-amber-950/60 border-amber-500/50 text-amber-300' 
              : 'bg-stone-950 border-stone-800 text-stone-400'
          }`}>
            <div className="text-[9px] text-stone-400 uppercase tracking-tighter truncate">Tab Switch</div>
            <div className="mt-0.5">{tabSwitchStrikes}/3 {tabSwitchStrikes > 3 ? `(+${tabSwitchStrikes - 3} flag)` : ''}</div>
          </div>

          <div className={`p-1 rounded border transition-colors ${
            webcamStrikes > 3 
              ? 'bg-red-950/80 border-red-500 text-red-300 font-bold' 
              : webcamStrikes > 0 
              ? 'bg-amber-950/60 border-amber-500/50 text-amber-300' 
              : 'bg-stone-950 border-stone-800 text-stone-400'
          }`}>
            <div className="text-[9px] text-stone-400 uppercase tracking-tighter truncate">Webcam/Assist</div>
            <div className="mt-0.5">{webcamStrikes}/3 {webcamStrikes > 3 ? `(+${webcamStrikes - 3} flag)` : ''}</div>
          </div>

          <div className={`p-1 rounded border transition-colors ${
            voiceStrikes > 3 
              ? 'bg-red-950/80 border-red-500 text-red-300 font-bold' 
              : voiceStrikes > 0 
              ? 'bg-amber-950/60 border-amber-500/50 text-amber-300' 
              : 'bg-stone-950 border-stone-800 text-stone-400'
          }`}>
            <div className="text-[9px] text-stone-400 uppercase tracking-tighter truncate">Voice/Pronounce</div>
            <div className="mt-0.5">{voiceStrikes}/3 {voiceStrikes > 3 ? `(+${voiceStrikes - 3} flag)` : ''}</div>
          </div>
        </div>

        {/* Audit Log Drawer Toggle */}
        <div className="px-3 py-2 bg-stone-900/90 border-t border-stone-800 flex items-center justify-between">
          <button
            onClick={() => setShowLogDrawer(!showLogDrawer)}
            className="text-[11px] font-mono text-stone-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Audit Trail ({violations.length})</span>
            {showLogDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          
          {(() => {
            const totalPenaltyFlags = Math.max(0, tabSwitchStrikes - 3) + Math.max(0, webcamStrikes - 3) + Math.max(0, voiceStrikes - 3);
            return (
              <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                totalPenaltyFlags === 0 
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60' 
                  : 'bg-red-950 text-red-300 border border-red-800/60 font-bold animate-pulse'
              }`}>
                {totalPenaltyFlags === 0 ? 'TRUST HIGH' : `${totalPenaltyFlags} PENALTY FLAGS`}
              </span>
            );
          })()}
        </div>

        {/* Expanded Audit Log Items */}
        {showLogDrawer && (
          <div className="max-h-40 overflow-y-auto p-2.5 bg-black/80 border-t border-stone-800 space-y-1.5 text-[11px] font-mono">
            {violations.length === 0 ? (
              <p className="text-stone-500 text-center py-2">No integrity violations recorded.</p>
            ) : (
              violations.map((v) => (
                <div key={v.id} className="p-1.5 bg-stone-900/90 rounded border border-stone-800 flex items-start gap-2">
                  <span className="text-red-400 font-bold shrink-0">[{v.timestamp}]</span>
                  <div className="flex-1">
                    <p className="text-stone-300 text-[10px] leading-tight">{v.reason}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
};
