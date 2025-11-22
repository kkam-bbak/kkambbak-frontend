import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import styles from './rolePlay.module.css';
import { http } from '../../apis/http';
import Header from '@/components/layout/Header/Header';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';
import ContentSection from '@/components/layout/ContentSection/ContentSection';

// --- 인터페이스 정의 ---
interface ApiResponseBody<T> {
  status: { statusCode: string; message: string; description: string | null };
  body: T;
}

// ... (나머지 인터페이스 정의 동일) ...
type NextDialogueResponse = ApiResponseBody<DialogueData>;
type StartRoleplayResponse = ApiResponseBody<DialogueData>;
interface SessionSummary {
  sessionId: number;
  totalSentence: number;
  correctSentence: number;
  completedAt: string;
}
type CompleteRoleplayResponse = ApiResponseBody<SessionSummary>;

interface ChoiceOption {
  id: number;
  korean: string;
  romanized: string;
  english: string;
  isCorrect: boolean;
}

interface DialogueData {
  sessionId: number;
  dialogueId: number;
  korean: string;
  romanized: string;
  english: string;
  speaker: 'AI' | 'USER';
  mismatchKorean: string;
  mismatchEnglish: string;
  mismatchRomanized: string;
  coreWord: string;
  role: string;
  choices?: ChoiceOption[];
  result?: string; 
  userResponseData?: { 
        selectedId: number;
        text: string;
        romanized: string;
        english: string;
        finalResult: string;
    }; 
  sessionTitle: string;
}
const LS_KEY_COMPLETIONS = 'roleplay_completions';
interface CompletionData {
  isCompleted: boolean;
  actualTime: number; 
}

type CompletedScenarios = { [scenarioId: number]: CompletionData };

// ... (localStorage, API 함수들 동일) ...
const saveCompletionToLocalStorage = (scenarioId: number, elapsedMinutes: number) => {
    try {
        const storedData = localStorage.getItem(LS_KEY_COMPLETIONS);
        const completions: CompletedScenarios = storedData ? JSON.parse(storedData) : {};
        completions[scenarioId] = { isCompleted: true, actualTime: elapsedMinutes };
        localStorage.setItem(LS_KEY_COMPLETIONS, JSON.stringify(completions));
        console.log(`✅ Scenario ${scenarioId} completion saved to LocalStorage.`);
    } catch (e) {
        console.error('Failed to save completion to LocalStorage', e);
    }
};

const startRoleplaySession = async (scenarioId: number): Promise<DialogueData> => {
  try {
    const response = await http.post<StartRoleplayResponse>('/roleplay/start', {}, { params: { scenarioId } });
    return response.data.body; 
  } catch (error) {
    console.error('Failed to start roleplay session:', error);
    throw error;
  }
};

const getNextDialogue = async (sessionId: number): Promise<DialogueData> => {
  try {
    const response = await http.post<NextDialogueResponse>(`/roleplay/next`, {}, { params: { sessionId } }); 
    return response.data.body; 
  } catch (error) {
    console.error('Failed to get next dialogue:', error);
    throw error;
  }
};

interface EvaluationResult {
  dialogueId: number;
  score: number;
  feedback: 'GOOD' | 'RETRY' | 'WRONG';
}

const evaluatePronunciation = async (audioFile: File, sessionId: number, dialogueId: number): Promise<EvaluationResult> => {
  try {
    const formData = new FormData();
    formData.append('audioFile', audioFile);
    if (audioFile.size === 0) throw new Error('Audio file is empty');
    const response = await http.post('/roleplay/evaluate', formData, { params: { sessionId, dialogueId } });
    return response.data.body;
  } catch (error) {
    console.error('❌ Evaluation failed:', error);
    throw error;
  }
};

const completeRoleplaySession = async (sessionId: number): Promise<SessionSummary> => {
  try {
    const response = await http.post<CompleteRoleplayResponse>('/roleplay/complete', {}, { params: { sessionId } });
    return response.data.body; 
  } catch (error) {
    console.error('❌ Failed to complete roleplay session:', error);
    throw error;
  }
};

const STEPS = {
  START: 'START', LISTEN: 'LISTEN', LISTEN_DONE: 'LISTEN_DONE',
  SPEAK_SETUP: 'SPEAK_SETUP', RECORDING: 'RECORDING', GRADING: 'GRADING',
  PRACTICE_LISTEN: 'PRACTICE_LISTEN', PRACTICE_LISTEN_DONE: 'PRACTICE_LISTEN_DONE',
  PRACTICE_SPEAK: 'PRACTICE_SPEAK', PRACTICE_GRADING: 'PRACTICE_GRADING',
  CHOICE_SETUP: 'CHOICE_SETUP', CHOICE_TTS: 'CHOICE_TTS', CHOICE_FEEDBACK: 'CHOICE_FEEDBACK',
  DONE: 'DONE',
};

const BUBBLE_TEXT = {
  [STEPS.START]: "Okay, Let's go!",
  [STEPS.LISTEN]: "Listen carefully.",
  [STEPS.SPEAK_SETUP]: "Speak!",
  [STEPS.RECORDING]: "Speak!",
  [STEPS.PRACTICE_LISTEN]: "Listen carefully.",
  [STEPS.PRACTICE_SPEAK]: "Speak!",
  [STEPS.CHOICE_SETUP]: "Which is correct?",
  CORRECT: "Good job!",
  INCORRECT: "It's a waste.",
  OOS: "That's out of our Learning Scope\ntry to focus on your Study",
};

const getCharacterImage = (step: string, gradingResult: string | null): MascotImage => {
  if (step === STEPS.START) return 'smile';
  if (step === STEPS.GRADING || step === STEPS.CHOICE_FEEDBACK || step === STEPS.PRACTICE_GRADING) {
    if (gradingResult === 'CORRECT') return 'jump';
    if (gradingResult === 'INCORRECT') return 'gloomy';
    if (gradingResult === 'OOS') return 'wrong';
  }
  return 'basic';
};

const RolePlay: React.FC = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { roleId } = useParams<{ roleId: string }>(); 
  const scenarioId = roleId;

  // ... (LocationState 인터페이스 등 동일) ...
  interface LocationState {
      wordsToRetry?: any[];
      isRetryWrong?: boolean;
      baseResultId?: number;
      scenarioTitle?: string; 
  }
  
  const location = useLocation();
  const state = location.state as LocationState; 

  const initialTitle = state?.scenarioTitle || 'Role Play_At a Cafe'; 
  const [scenarioTitle, setScenarioTitle] = useState(initialTitle); 

  // ... (Refs 동일) ...
  const hasFetched = useRef(false); 
  const startTimeRef = useRef<number>(0);
  const resultsRef = useRef<any[]>([]); 
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const ttsPlayedRef = useRef<{ [key: string]: boolean }>({});
  const audioMimeTypeRef = useRef<string>('audio/wav');
  const sessionStartTimeRef = useRef<number>(Date.now());

  // ... (States 동일) ...
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [currentDialogue, setCurrentDialogue] = useState<DialogueData | null>(null);
  const [turnHistory, setTurnHistory] = useState<DialogueData[]>([]); 
  const [practiceLineData, setPracticeLineData] = useState<DialogueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState(STEPS.START);
  const [isRecording, setIsRecording] = useState(false);
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);
  const [gradingResult, setGradingResult] = useState<string | null>(null);
  const [recordingCountdown, setRecordingCountdown] = useState(10);
  const [selectedChoiceId, setSelectedChoiceId] = useState<number | null>(null);
  const [ttsOptionId, setTtsOptionId] = useState<number | null>(null);
  const [isLoadingNextTurn, setIsLoadingNextTurn] = useState(false);
  const [selectedChoiceData, setSelectedChoiceData] = useState<DialogueData | null>(null); 
  
  const timerRef = useRef<number | null>(null);
  const flowTimerRef = useRef<number | null>(null);

  // ⭐ [추가] 모달 상태
  const [showExitModal, setShowExitModal] = useState(false);

  // ⭐ [수정] 뒤로 가기 핸들러: 모달 띄우기
  const handleBackClick = useCallback(() => {
      setShowExitModal(true);
  }, []);

  // ⭐ [추가] 모달 Yes 핸들러: 목록으로 이동
  const handleExitConfirm = useCallback(() => {
      setShowExitModal(false);
      navigate('/mainpage/roleList');
  }, [navigate]);

  // ⭐ [추가] 모달 No 핸들러: 모달 닫기 (계속 진행)
  const handleExitCancel = useCallback(() => {
      setShowExitModal(false);
  }, []);


  // ... (speakKoreanText, initializeSession 등 기존 함수 동일) ...
  const speakKoreanText = useCallback((text: string, onFinish: ((success: boolean) => void) | null = null) => {
    if (!('speechSynthesis' in window)) { if (onFinish) onFinish(false); return; }
    if (window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); setTimeout(() => speakKoreanText(text, onFinish), 50); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onend = () => { if (onFinish) onFinish(true); };
    utterance.onerror = (event) => { if (event.error !== 'interrupted') if (onFinish) onFinish(false); };
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    const initializeSession = async () => {
      if (!scenarioId) { setError('Scenario ID not found'); return; }
      try {
        setIsLoading(true);
        sessionStartTimeRef.current = Date.now();
        const initialDialogue = await startRoleplaySession(parseInt(scenarioId));
        setSessionId(initialDialogue.sessionId);
        setCurrentDialogue(initialDialogue);
        setError(null);
        
        if (initialDialogue.sessionTitle) {
            setScenarioTitle(initialDialogue.sessionTitle);
        }
      } catch (err: any) {
        const status = err?.response?.data?.status;
        const errorMsg = status?.message || err?.message || 'Unknown error';

        if (errorMsg.includes('Credit limit') || errorMsg === 'Credit limit standard') {
            alert("크레딧이 부족합니다. 충전 페이지로 이동합니다.");
            navigate('/payment/checkout');
            return; 
        }

        setError(`Failed to start roleplay: ${errorMsg}`);
      } finally {
        setIsLoading(false);
      }
    };
    initializeSession();
  }, [scenarioId, navigate]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [turnHistory, step, selectedChoiceId]);

  const moveToNextTurn = useCallback(async (lastTurnAdded?: DialogueData) => {
    if (!sessionId) return;
    try {
      setIsLoadingNextTurn(true);
      const nextDialogue = await getNextDialogue(sessionId);

      if (nextDialogue.speaker === 'USER' && nextDialogue.mismatchKorean) {
        nextDialogue.choices = [
          { id: 1, korean: nextDialogue.korean, romanized: nextDialogue.romanized, english: nextDialogue.english, isCorrect: true },
          { id: 2, korean: nextDialogue.mismatchKorean, romanized: nextDialogue.mismatchRomanized, english: nextDialogue.mismatchEnglish, isCorrect: false }
        ];
      }

      setCurrentDialogue(nextDialogue);
      setSelectedChoiceId(nextDialogue.speaker === 'USER' ? 1 : null);
      setGradingResult(null);
      setPracticeLineData(null);
      delete ttsPlayedRef.current[`listen-${nextDialogue.dialogueId}`];
      delete ttsPlayedRef.current[`practice-${nextDialogue.dialogueId}`];

      const nextStep = nextDialogue.speaker === 'AI' ? STEPS.LISTEN : STEPS.CHOICE_SETUP;
      setStep(nextStep);
      setIsLoadingNextTurn(false);
    } catch (err: any) {
      if (err?.response?.data?.status?.statusCode === 'R016') {
        try {
          const sessionSummary = await completeRoleplaySession(sessionId);
          const elapsedMs = Date.now() - sessionStartTimeRef.current;
          const minutes = Math.floor(elapsedMs / 60000);
          const seconds = Math.floor((elapsedMs % 60000) / 1000);
          
          const scenarioIntId = parseInt(scenarioId || '0');
          if (scenarioIntId > 0) {
              const elapsedMinutes = elapsedMs / 60000;
              saveCompletionToLocalStorage(scenarioIntId, elapsedMinutes);
          }
          
          const timeTaken = `${minutes}m ${seconds}s`;
          const finalTurnHistory = lastTurnAdded ? [...turnHistory, lastTurnAdded] : turnHistory;

          navigate('/mainpage/rolePlay/complete', {
            state: {
              sessionId,
              scenarioId: parseInt(scenarioId || '0'),
              sessionSummary,
              timeTaken,
              rolePlayName: scenarioTitle, 
              turns: finalTurnHistory 
            }
          });
        } catch (completeErr) {
          setError('세션 완료 처리 중 오류가 발생했습니다.');
          setStep(STEPS.DONE);
          setIsLoadingNextTurn(false);
        }
      } else {
        setError('다음 대사를 불러올 수 없습니다.');
        setStep(STEPS.DONE);
        setIsLoadingNextTurn(false);
      }
    }
  }, [sessionId, navigate, turnHistory, scenarioId, scenarioTitle]);

  // ... (handleRecordingGrading, handlePracticeGrading, handleTtsPlaybackFinished 등 기존 함수 동일) ...
  const handleRecordingGrading = useCallback((feedback: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setStep(STEPS.GRADING);
    const resultDisplay = feedback === 'GOOD' ? 'CORRECT' : 'INCORRECT';
    setGradingResult(resultDisplay);

    setTimeout(() => {
      if (currentDialogue) {
        const finalTurnData = {
          ...currentDialogue,
          result: resultDisplay,
          userResponseData: { text: currentDialogue.korean, romanized: currentDialogue.romanized, english: currentDialogue.english, finalResult: resultDisplay, selectedId: 0 } 
        };
        setTurnHistory(prev => [...prev, finalTurnData]);
        moveToNextTurn(finalTurnData);
      }
    }, 1500);
  }, [currentDialogue, moveToNextTurn]);

  const handlePracticeGrading = useCallback((feedback: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setStep(STEPS.PRACTICE_GRADING);
    const resultDisplay = feedback === 'GOOD' ? 'CORRECT' : 'INCORRECT';
    setGradingResult(resultDisplay);

    setTimeout(() => {
      let finalTurn: DialogueData | undefined = undefined;

      if (practiceLineData && selectedChoiceData) { 
        finalTurn = {
          ...selectedChoiceData, 
          ...practiceLineData, 
          dialogueId: practiceLineData.dialogueId, 
          result: resultDisplay, 
          userResponseData: {
              selectedId: selectedChoiceData.userResponseData?.selectedId || 0,
              text: practiceLineData.korean,
              romanized: practiceLineData.romanized,
              english: practiceLineData.english,
              finalResult: resultDisplay, 
          },
          speaker: 'USER'
        };
        setTurnHistory(prev => [...prev, finalTurn!]);
      }
      
      setSelectedChoiceData(null); 
      setPracticeLineData(null); 
      moveToNextTurn(finalTurn);
    }, 1500);
  }, [moveToNextTurn, selectedChoiceData, practiceLineData]); 

  const handleTtsPlaybackFinished = useCallback((success) => {
    setIsTtsPlaying(false);
    if (flowTimerRef.current) clearTimeout(flowTimerRef.current);

    if (success && (step === STEPS.LISTEN || step === STEPS.PRACTICE_LISTEN)) {
      const nextStep = step === STEPS.LISTEN ? STEPS.LISTEN_DONE : STEPS.PRACTICE_LISTEN_DONE;
      setTimeout(() => { setStep(nextStep); }, 500);
      return;
    }

    if (success && ttsOptionId) {
      setStep(STEPS.CHOICE_SETUP);
      setTtsOptionId(null);
    }
  }, [step, ttsOptionId]);

  const startTtsAndListen = useCallback((text, onFinish: ((success: boolean) => void) | null = null) => {
    if (isRecording || window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsTtsPlaying(false);
      if (onFinish) onFinish(false);
      return;
    }
    setIsTtsPlaying(true);
    speakKoreanText(text, (success) => {
      handleTtsPlaybackFinished(success);
      if (onFinish) onFinish(success);
    });
  }, [isRecording, handleTtsPlaybackFinished, speakKoreanText]);

  const handleChoiceOptionClick = useCallback((optionId, text) => {
    if (step === STEPS.CHOICE_FEEDBACK || isRecording) return;
    setSelectedChoiceId(optionId);
    setTtsOptionId(optionId);
    startTtsAndListen(text);
  }, [step, isRecording, startTtsAndListen]);

  const handleListenTtsClick = useCallback(() => {
    const allowedSteps = [STEPS.LISTEN, STEPS.PRACTICE_LISTEN, STEPS.SPEAK_SETUP, STEPS.PRACTICE_SPEAK];
    if (allowedSteps.includes(step) && !isTtsPlaying) {
      let textToSpeak = currentDialogue?.korean;
      if ((step === STEPS.PRACTICE_LISTEN || step === STEPS.PRACTICE_SPEAK) && practiceLineData) {
        textToSpeak = practiceLineData.korean;
      }
      if (textToSpeak) {
        if (flowTimerRef.current) clearTimeout(flowTimerRef.current);
        startTtsAndListen(textToSpeak);
      }
    }
  }, [step, currentDialogue, practiceLineData, isTtsPlaying, startTtsAndListen]);

  useEffect(() => {
    if (step === STEPS.LISTEN && currentDialogue) {
      const dialogueKey = `listen-${currentDialogue.dialogueId}`;
      if (!ttsPlayedRef.current[dialogueKey]) {
        ttsPlayedRef.current[dialogueKey] = true;
        startTtsAndListen(currentDialogue.korean);
      }
    } else if (step === STEPS.PRACTICE_LISTEN && practiceLineData) {
      const practiceKey = `practice-${practiceLineData.dialogueId}`;
      if (!ttsPlayedRef.current[practiceKey]) {
        ttsPlayedRef.current[practiceKey] = true;
        startTtsAndListen(practiceLineData.korean);
      }
    }
  }, [step, currentDialogue, practiceLineData, startTtsAndListen]);

  const handleChoiceSelect = useCallback(() => {
    if (selectedChoiceId === null || step !== STEPS.CHOICE_SETUP || !currentDialogue) return;
    const selectedOption = currentDialogue.choices?.find(c => c.id === selectedChoiceId);
    const isCorrect = selectedOption && selectedOption.isCorrect;
    const result = isCorrect ? 'CORRECT' : 'INCORRECT';
    const correctOption = currentDialogue.choices?.find(c => c.isCorrect) || currentDialogue.choices?.[0];

    if (selectedOption) {
        setSelectedChoiceData({
        ...currentDialogue,
        result: result,
        userResponseData: {
            selectedId: selectedOption.id,
            text: selectedOption.korean,
            romanized: selectedOption.romanized,
            english: selectedOption.english,
            finalResult: result,
        }
        });
    }

    window.speechSynthesis.cancel();
    setIsTtsPlaying(false);
    setTtsOptionId(null); 
    setStep(STEPS.CHOICE_FEEDBACK);
    setGradingResult(result);

    setTimeout(() => {
      if (correctOption) {
        setPracticeLineData({
             sessionId: currentDialogue.sessionId, 
             dialogueId: currentDialogue.dialogueId, 
             korean: correctOption.korean,
             romanized: correctOption.romanized,
             english: correctOption.english,
             speaker: 'USER',
             mismatchKorean: '', mismatchEnglish: '', mismatchRomanized: '', coreWord: currentDialogue.coreWord, role: currentDialogue.role, sessionTitle: currentDialogue.sessionTitle, 
        });
      }
      
      setStep(STEPS.PRACTICE_LISTEN); 
      setSelectedChoiceId(null);
      setGradingResult(null);
    }, 1500);
  }, [selectedChoiceId, step, currentDialogue]);

  const handleMicPress = useCallback(() => {
    const isAiTurn = currentDialogue?.speaker === 'AI';
    const isUserTurn = currentDialogue?.speaker === 'USER';
    if (isAiTurn && isTtsPlaying) return;
    const isActionable = isAiTurn || step === STEPS.PRACTICE_SPEAK;
    const isReady = step === STEPS.SPEAK_SETUP || step === STEPS.LISTEN_DONE ||
                    (isUserTurn && (step === STEPS.PRACTICE_LISTEN || step === STEPS.PRACTICE_LISTEN_DONE)) ||
                    step === STEPS.PRACTICE_SPEAK;
    if (!isActionable || !isReady) return;
    if (step === STEPS.SPEAK_SETUP || step === STEPS.LISTEN_DONE) {
      setStep(STEPS.RECORDING);
    } else if (step === STEPS.PRACTICE_LISTEN_DONE) {
      setStep(STEPS.PRACTICE_SPEAK);
      return;
    }

    const initMediaRecorder = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        let mimeType = '';
        const supportedTypes = ['audio/wav', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
        for (const type of supportedTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            mimeType = type;
            break;
          }
        }
        audioMimeTypeRef.current = mimeType || 'audio/wav';
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
        audioChunksRef.current = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        recorder.onerror = (event) => console.error('Recording error:', event);
        mediaRecorderRef.current = recorder;
        recorder.start();
        console.log('🎤 Recording started');
      } catch (err) {
        console.error('Mic access failed:', err);
        setError('마이크 접근 권한이 없습니다.');
        setIsRecording(false);
      }
    };

    initMediaRecorder().then(() => {
      setTimeout(() => {
        setIsRecording(true);
        if (timerRef.current) clearInterval(timerRef.current);
      }, 50);
    });
  }, [step, currentDialogue, isTtsPlaying]);

  const handleMicRelease = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current) return;
    const recorder = mediaRecorderRef.current;
    if (recorder.state !== 'recording') {
      setIsRecording(false);
      return;
    }
    setIsRecording(false);
    recorder.onstop = async () => {
      try {
        if (audioChunksRef.current.length === 0) {
            alert("녹음된 내용이 없습니다. 다시 시도해주세요.");
            if (currentDialogue?.speaker === 'AI') {
                setStep(STEPS.SPEAK_SETUP);
            } else {
                setStep(STEPS.PRACTICE_SPEAK);
            }
            return;
        }
        const mimeType = audioMimeTypeRef.current;
        const fileExtension = mimeType.includes('wav') ? 'wav' : 'webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioFile = new File([audioBlob], `recording-${Date.now()}.${fileExtension}`, { type: mimeType });
        if (audioFile.size === 0) {
            alert("녹음 파일 크기가 0입니다. 다시 시도해주세요.");
            if (currentDialogue?.speaker === 'AI') {
                setStep(STEPS.SPEAK_SETUP);
            } else {
                setStep(STEPS.PRACTICE_SPEAK);
            }
            return;
        }
        if (!sessionId || !currentDialogue) return;
        const evaluationResult = await evaluatePronunciation(
          audioFile,
          sessionId,
          currentDialogue.dialogueId
        );
        const feedback = evaluationResult.feedback;
        if (currentDialogue?.speaker === 'AI') {
          handleRecordingGrading(feedback);
        } else {
          handlePracticeGrading(feedback);
        }
      } catch (err: any) {
        console.error('Evaluation failed:', err);
        const statusCode = err?.response?.data?.status?.statusCode;
        if (statusCode === 'OA001') {
            alert("일시적인 서버 지연으로 응답하지 못했습니다.\n토큰은 차감되지 않았습니다.\n목록으로 돌아갑니다.");
            navigate('/mainpage/roleList');
            return;
        }
        if (statusCode === 'R015') {
            if (currentDialogue?.speaker === 'AI') {
                handleRecordingGrading('RETRY');
            } else {
                handlePracticeGrading('RETRY');
            }
        } else {
            alert("녹음 인식에 실패했습니다. 다시 시도해주세요.");
            if (currentDialogue?.speaker === 'AI') {
                setStep(STEPS.SPEAK_SETUP);
            } else {
                setStep(STEPS.PRACTICE_SPEAK);
            }
        }
      } finally {
        if (recorder.stream) {
            recorder.stream.getTracks().forEach(track => track.stop());
        }
      }
    };
    recorder.stop();
  }, [isRecording, handleRecordingGrading, handlePracticeGrading, currentDialogue, sessionId, scenarioId, navigate]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (flowTimerRef.current) clearTimeout(flowTimerRef.current);
    if (step === STEPS.START && currentDialogue) {
      flowTimerRef.current = setTimeout(() => {
        const nextStep = currentDialogue.speaker === 'AI' ? STEPS.LISTEN : STEPS.CHOICE_SETUP;
        setStep(nextStep);
      }, 1500);
    }
    if (step === STEPS.LISTEN_DONE) {
      flowTimerRef.current = setTimeout(() => {
        setStep(STEPS.SPEAK_SETUP);
      }, 0);
    }
    if (step === STEPS.SPEAK_SETUP && currentDialogue?.speaker === 'AI') {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    if (step === STEPS.PRACTICE_LISTEN_DONE) {
      flowTimerRef.current = setTimeout(() => {
        setStep(STEPS.PRACTICE_SPEAK);
      }, 0);
    }
    if (step === STEPS.PRACTICE_SPEAK) {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (flowTimerRef.current) clearTimeout(flowTimerRef.current);
      window.speechSynthesis.cancel();
    };
  }, [step, isRecording, currentDialogue, handleRecordingGrading, handlePracticeGrading]);


  if (isLoading) return <div className={styles.pageContainer}><Mascot image="thinking" text="Loading roleplay..." /></div>;
  if (error || !currentDialogue) return <div className={styles.pageContainer}><div style={{color:'red'}}>{error}</div></div>;

  let currentBubbleText = BUBBLE_TEXT[step] || "";
  if (step === STEPS.GRADING || step === STEPS.CHOICE_FEEDBACK || step === STEPS.PRACTICE_GRADING) {
      currentBubbleText = BUBBLE_TEXT[gradingResult || 'INCORRECT'];
  } else if (step === STEPS.PRACTICE_LISTEN) {
      currentBubbleText = BUBBLE_TEXT[STEPS.LISTEN];
  } else if (step === STEPS.PRACTICE_SPEAK) {
      currentBubbleText = BUBBLE_TEXT[STEPS.SPEAK_SETUP];
  }

  const characterImage = getCharacterImage(step, gradingResult);
  const isPracticeFlow = step === STEPS.PRACTICE_LISTEN || step === STEPS.PRACTICE_SPEAK || step === STEPS.PRACTICE_GRADING || step === STEPS.PRACTICE_LISTEN_DONE;
  const isScrollLocked = step === STEPS.CHOICE_SETUP || step === STEPS.CHOICE_FEEDBACK;

  const TurnContentBox = ({ data }: { data: DialogueData }) => {
      const isRecordingTurn = data.speaker === 'AI';
      const romanizedClass = styles.correctRom; 
      const role = data.speaker;
      const mainKoreanText = data.korean; 
      const mainRomanizedText = data.romanized;
      const mainEnglishText = data.english;

      return (
          <div className={`${styles.textDisplayBox} ${styles.historyBox}`}>
              <div className={`${styles.textLine} ${styles.koreanLine}`}>
                  <span className={`${styles.koreanText} ${styles.historyKorean}`}>{mainKoreanText}</span>
                  {isRecordingTurn && <button className={`${styles.ttsButton} ${styles.active}`} onClick={() => startTtsAndListen(data.korean)} disabled={isTtsPlaying}>🔊</button>}
                   <span className={`${styles.smallMicIcon} ${styles.active}`} style={{marginLeft:'5px'}}>🎤</span>
              </div>
              <div className={`${styles.textLine} ${styles.romanizedLine}`}>
                  <span className={`${styles.romanizedText} ${styles.historyRomanized} ${romanizedClass}`}>{mainRomanizedText}</span>
              </div>
              <span className={`${styles.englishText} ${styles.historyEnglish}`}>{mainEnglishText}</span>
              <div className={`${styles.roleContainer} ${styles.customer}`}><span className={styles.roleTag}>{role}</span></div>
          </div>
      );
  };

  const renderActiveInput = () => {
      const isCurrentlySpeaking = window.speechSynthesis.speaking;
      if (isLoadingNextTurn) {
          return null;
      }
      if (selectedChoiceData && step !== STEPS.CHOICE_SETUP && !isPracticeFlow) {
          return <TurnContentBox data={selectedChoiceData} />;
      }
      if (currentDialogue.speaker === 'AI' && !isPracticeFlow) {
          const isTtsActionable = step === STEPS.LISTEN || step === STEPS.SPEAK_SETUP;
          const isMicActionable = step === STEPS.SPEAK_SETUP || step === STEPS.RECORDING || step === STEPS.LISTEN_DONE;
          const mainMicButtonClass = isMicActionable ? (isRecording ? styles.on : styles.off) : `${styles.off} ${styles.disabled}`;
          const getRomClass = () => {
               if (step === STEPS.GRADING) {
                   return gradingResult === 'CORRECT' ? styles.correctActive : (gradingResult === 'INCORRECT' || gradingResult === 'OOS' ? styles.incorrectActive : '');
               }
               return '';
          };
          const currentGradeClass = getRomClass();
          return (
              <div className={styles.activeTurnRecordingFlow}>
                  <div className={`${styles.textDisplayBox} ${styles.historyBox}`}>
                      <div className={`${styles.textLine} ${styles.koreanLine}`}>
                          <span className={`${styles.koreanText} ${currentGradeClass}`}>{currentDialogue.korean}</span>
                          <button className={`${styles.ttsButton} ${isTtsActionable ? styles.active : ''}`} onClick={handleListenTtsClick} disabled={!isTtsActionable || isCurrentlySpeaking}>🔊</button>
                      </div>
                      <div className={`${styles.textLine} ${styles.romanizedLine}`}>
                          <span className={`${styles.romanizedText} ${currentGradeClass}`}>{currentDialogue.romanized}</span>
                          <span className={`${styles.smallMicIcon}${isRecording || isMicActionable ? styles.active : ''}`}>🎤</span>
                      </div>
                      <span className={`${styles.englishText} ${currentGradeClass}`}>{currentDialogue.english}</span>
                      <div className={`${styles.roleContainer} ${styles.costomer}`}><span className={styles.roleTag}>{currentDialogue.speaker}</span></div>
                  </div>
                  <div className={`${styles.micArea} ${styles.fullWidthMic}`}>
                       <div className={styles.micButtonWrapper}>
                           <button className={`${styles.mainMicButton} ${mainMicButtonClass}`}
                               onMouseDown={handleMicPress} onMouseUp={handleMicRelease}
                               onTouchStart={handleMicPress} onTouchEnd={handleMicRelease}
                               disabled={!isMicActionable || isCurrentlySpeaking}>
                               <span className={styles.mainMicIcon}>🎤<span className={styles.micStatusText}>{isRecording ? "ON" : "OFF"}</span></span>
                           </button>
                       </div>
                   </div>
              </div>
          );
      } 
      else if (currentDialogue.speaker === 'USER' && !isPracticeFlow) {
          const customerData = currentDialogue.choices;
          if (!customerData || customerData.length === 0) return <div>No choices</div>;
          const isDisabled = step === STEPS.CHOICE_FEEDBACK || isCurrentlySpeaking;
          const isSubmitActive = selectedChoiceId !== null;
          const submitButtonClass = isSubmitActive ? styles.on : `${styles.off} ${styles.disabled}`;
          let displayOption = customerData.find(c => c.id === selectedChoiceId);
          if (!displayOption && step === STEPS.CHOICE_SETUP) displayOption = customerData[0];
          else if (step === STEPS.CHOICE_FEEDBACK) displayOption = undefined; 
          return (
              <>
                  {displayOption && step === STEPS.CHOICE_SETUP && (
                      <div className={`${styles.textDisplayBox} ${styles.historyBox}`}>
                          <div className={`${styles.textLine} ${styles.koreanLine}`}>
                              <span className={styles.koreanText}>{displayOption.korean}</span>
                              <button className={`${styles.ttsButton} ${isCurrentlySpeaking && ttsOptionId === displayOption.id ? styles.active : styles.choiceTtsInactive}`}
                                  onClick={() => handleChoiceOptionClick(displayOption.id, displayOption.korean)} disabled={isDisabled}>🔊</button>
                          </div>
                          <div className={`${styles.textLine} ${styles.romanizedLine}`}><span className={styles.romanizedText}>{displayOption.romanized}</span></div>
                          <span className={styles.englishText}>{displayOption.english}</span>
                          <div className={`${styles.roleContainer} ${styles.costomer}`}><span className={styles.roleTag}>{currentDialogue.speaker}</span></div>
                      </div>
                  )}
                  <div className={`${styles.micArea} ${styles.choiceButton}`}>
                      {customerData.map(option => (
                          <button key={option.id} className={`${styles.choiceButtonAction} ${option.id === selectedChoiceId ? styles.selected : ''}`}
                              onClick={() => handleChoiceOptionClick(option.id, option.korean)} disabled={isDisabled}>{option.id}</button>
                      ))}
                      <button className={`${styles.mainMicButton} ${styles.selectSubmitButton} ${step === STEPS.CHOICE_FEEDBACK ? (gradingResult === 'CORRECT' ? styles.correctSubmit : styles.incorrectSubmit) : ''} ${submitButtonClass}`}
                          onClick={handleChoiceSelect} disabled={!isSubmitActive}>
                          <span className={styles.selectSubmitText}>Select</span>
                      </button>
                  </div>
              </>
          );
      }
      else if (isPracticeFlow && practiceLineData) {
          const practiceButtonActive = step === STEPS.PRACTICE_SPEAK || step === STEPS.PRACTICE_LISTEN_DONE;
          const practiceMainMicClass = practiceButtonActive ? (isRecording ? styles.on : styles.off) : `${styles.off} ${styles.disabled}`;
          const currentGradeClass = step === STEPS.PRACTICE_GRADING ? (gradingResult === 'CORRECT' ? styles.correctActive : styles.incorrectActive) : '';
          const isTtsActionable = step === STEPS.PRACTICE_LISTEN || step === STEPS.PRACTICE_SPEAK;
          return (
               <div className={styles.activeTurnRecordingFlow}>
                   <div className={`${styles.textDisplayBox} ${styles.historyBox}`}>
                       <div className={`${styles.textLine} ${styles.koreanLine}`}>
                           <span className={`${styles.koreanText} ${currentGradeClass}`}>{practiceLineData.korean}</span>
                           <button 
                               className={`${styles.ttsButton} ${isTtsActionable ? styles.active : ''}`} 
                               onClick={handleListenTtsClick} 
                               disabled={!isTtsActionable || isCurrentlySpeaking}
                           >🔊</button>
                       </div>
                       <div className={`${styles.textLine} ${styles.romanizedLine}`}>
                           <span className={`${styles.romanizedText} ${currentGradeClass}`}>{practiceLineData.romanized}</span>
                           <span className={`${styles.smallMicIcon} ${isRecording || practiceButtonActive ? styles.active : ''}`}>🎤</span>
                       </div>
                       <span className={`${styles.englishText} ${currentGradeClass}`}>{practiceLineData.english}</span>
                       <div className={`${styles.roleContainer} ${styles.customer}`}>
                           <span className={styles.roleTag}>{practiceLineData.speaker}</span>
                       </div>
                   </div>
                   <div className={`${styles.micArea} ${styles.fullWidthMic}`}>
                       <div className={styles.micButtonWrapper}>
                           <button className={`${styles.mainMicButton} ${practiceMainMicClass}`}
                               onMouseDown={handleMicPress} onMouseUp={handleMicRelease}
                               onTouchStart={handleMicPress} onTouchEnd={handleMicRelease}
                               disabled={!practiceButtonActive || isCurrentlySpeaking}>
                               <span className={styles.mainMicIcon}>🎤<span className={styles.micStatusText}>{isRecording ? "ON" : "OFF"}</span></span>
                           </button>
                       </div>
                   </div>
               </div>
          );
      }
      return <></>;
  };

  return (
    <div className={`${styles.pageContainer} ${styles.appContainer}`}>
        {/* ⭐ Header에 customBackAction 전달 */}
        <Header hasBackButton customBackAction={handleBackClick} />
        <Mascot image={characterImage} text={currentBubbleText} />
        <ContentSection color="blue">
            <div className={styles.cardTitleBar}>
                <span className={styles.cardTitleText}>{scenarioTitle}</span>
                <span className={styles.cardStepText}>{Math.min(turnHistory.length + 1, 6)}/6</span>
            </div>
            <div className={`${styles.turnHistoryArea} ${isScrollLocked ? styles.scrollLocked : ''}`} ref={scrollRef}>
                {turnHistory.map((turn, index) => (
                    <TurnContentBox key={index} data={turn} />
                ))}
                {renderActiveInput()}
            </div>
        </ContentSection>

        {/* ⭐ 모달 오버레이 (하단 고정 카드) */}
        {showExitModal && (
          <div className={styles.exitModalOverlay}>
             {/* 뒷배경을 클릭해도 닫히지 않게 하려면 onClick 제거하거나 stopPropagation 사용 */}
             <div className={styles.exitModalContent}>
                <div className={styles.exitModalCard}>
                   <div className={styles.exitModalQuestion}>
                      Are you sure you want to quit<br />Role Play and go back?
                   </div>
                   <div className={styles.exitModalButtons}>
                      <button onClick={handleExitCancel} className={styles.exitButtonNo}>No</button>
                      <button onClick={handleExitConfirm} className={styles.exitButtonYes}>Yes</button>
                   </div>
                </div>
             </div>
          </div>
        )}
    </div>
  );
};

export default RolePlay;