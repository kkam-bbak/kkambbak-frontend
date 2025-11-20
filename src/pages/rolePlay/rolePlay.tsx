import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './rolePlay.module.css';
import { http } from '../../apis/http';
import Header from '@/components/layout/Header/Header';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';
import ContentSection from '@/components/layout/ContentSection/ContentSection';

// --- API 응답 타입 정의 ---
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
}

// --- API 함수 ---
const startRoleplaySession = async (scenarioId: number): Promise<DialogueData> => {
  try {
    const response = await http.post('/api/v1/roleplay/start', {}, {
      params: { scenarioId },
    });
    return response.data.body;
  } catch (error) {
    console.error('Failed to start roleplay session:', error);
    throw error;
  }
};

// 다음 대사 생성
const getNextDialogue = async (sessionId: number): Promise<DialogueData> => {
  try {
    const response = await http.post('/api/v1/roleplay/next', {}, {
      params: { sessionId },
    });
    return response.data.body;
  } catch (error) {
    console.error('Failed to get next dialogue:', error);
    throw error;
  }
};

// 발음 평가
interface EvaluationResult {
  dialogueId: number;
  score: number;
  feedback: 'GOOD' | 'RETRY' | 'WRONG';
}

const evaluatePronunciation = async (
  audioFile: File,
  sessionId: number,
  dialogueId: number
): Promise<EvaluationResult> => {
  try {
    const formData = new FormData();
    formData.append('audioFile', audioFile);

    if (audioFile.size === 0) {
      throw new Error('Audio file is empty');
    }

    const response = await http.post('/api/v1/roleplay/evaluate', formData, {
      params: { sessionId, dialogueId },
    });
    console.log('📊 Evaluation:', { dialogueId, score: response.data.body.score, feedback: response.data.body.feedback });
    return response.data.body;
  } catch (error) {
    console.error('❌ Evaluation failed:', error?.message);
    throw error;
  }
};

// 세션 완료
interface SessionSummary {
  sessionId: number;
  totalSentence: number;
  correctSentence: number;
  completedAt: string;
}

const completeRoleplaySession = async (sessionId: number): Promise<SessionSummary> => {
  try {
    const response = await http.post('/api/v1/roleplay/complete', {}, {
      params: { sessionId },
    });
    console.log('✅ Session completed:', response.data.body);
    return response.data.body;
  } catch (error) {
    console.error('❌ Failed to complete roleplay session:', error);
    throw error;
  }
};

// 단계별 상태 정의
const STEPS = {
    START: 'START', LISTEN: 'LISTEN', LISTEN_DONE: 'LISTEN_DONE',
    SPEAK_SETUP: 'SPEAK_SETUP', RECORDING: 'RECORDING', GRADING: 'GRADING',
    PRACTICE_LISTEN: 'PRACTICE_LISTEN', PRACTICE_LISTEN_DONE: 'PRACTICE_LISTEN_DONE',
    PRACTICE_SPEAK: 'PRACTICE_SPEAK', PRACTICE_GRADING: 'PRACTICE_GRADING',
    CHOICE_SETUP: 'CHOICE_SETUP', CHOICE_TTS: 'CHOICE_TTS', CHOICE_FEEDBACK: 'CHOICE_FEEDBACK',
    DONE: 'DONE',
};

// 상태별 말풍선 텍스트
const BUBBLE_TEXT = {
    [STEPS.START]: "Okay, Let's go!",
    [STEPS.LISTEN]: "Listen carefully.",
    //[STEPS.LISTEN_DONE]: "Ready to speak? Push the mic button.",
    [STEPS.SPEAK_SETUP]: "Speak!",
    [STEPS.RECORDING]: "Speak!",
    [STEPS.PRACTICE_LISTEN]: "Listen carefully.",
    // [STEPS.PRACTICE_LISTEN_DONE]: "Now, it's your turn to practice. Speak!",
    [STEPS.PRACTICE_SPEAK]: "Speak!",
    [STEPS.CHOICE_SETUP]: "Which is correct?",
    CORRECT: "Good job!",
    INCORRECT: "It's a waste.",
    OOS: "That's out of our Learning Scope\ntry to focus on your Study",
};

const getCharacterImage = (step, gradingResult): MascotImage => {
    // 1. 시작 단계
    if (step === STEPS.START) return 'smile';

    // 2. 채점 또는 피드백 단계
    if (step === STEPS.GRADING || step === STEPS.CHOICE_FEEDBACK || step === STEPS.PRACTICE_GRADING) {
        // ⭐ 이미지 변수 대신 문자열 키를 반환하도록 수정
        if (gradingResult === 'CORRECT') return 'jump';
        if (gradingResult === 'INCORRECT') return 'gloomy';
        if (gradingResult === 'OOS') return 'wrong'; // 'wrong' 키 사용 (sullen과 유사)
    }

    // 3. 기타/기본값
    // ⭐ 이미지 변수 대신 문자열 키를 반환하도록 수정
    return 'basic';
};
const speakKoreanText = (text, onFinish = null) => {
    if (!('speechSynthesis' in window)) {
        console.error("❌ Web Speech API is not supported");
        if (onFinish) onFinish(false);
        return;
    }

    // ✅ 기존 TTS가 실행 중이면 먼저 중지
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setTimeout(() => {
            speakKoreanText(text, onFinish);
        }, 100);
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
        console.log('▶️ TTS started');
    };

    utterance.onend = () => {
        if (onFinish) onFinish(true);
    };

    utterance.onerror = (event) => {
        console.error('❌ TTS Error:', event.error);
        if (event.error === 'interrupted') {
            if (onFinish) onFinish(true);
        } else {
            if (onFinish) onFinish(false);
        }
    };

    window.speechSynthesis.speak(utterance);
};

// --- 핵심 컴포넌트 ---

const RolePlay = () => {
    const navigate = useNavigate();
    const scrollRef = useRef(null);
    const { roleId } = useParams<{ roleId: string }>();
    const scenarioId = roleId;


    const [sessionId, setSessionId] = useState<number | null>(null);
    const [currentDialogue, setCurrentDialogue] = useState<DialogueData | null>(null);
    const [turnHistory, setTurnHistory] = useState([]);
    const [practiceLineData, setPracticeLineData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [step, setStep] = useState(STEPS.START);
    const [isRecording, setIsRecording] = useState(false);
    const [isTtsPlaying, setIsTtsPlaying] = useState(false);
    const [gradingResult, setGradingResult] = useState(null);
    const [recordingCountdown, setRecordingCountdown] = useState(10);
    const [selectedChoiceId, setSelectedChoiceId] = useState(null);
    const [ttsOptionId, setTtsOptionId] = useState(null);
    const [isLoadingNextTurn, setIsLoadingNextTurn] = useState(false);
    const [selectedChoiceData, setSelectedChoiceData] = useState(null); // 카드선택 임시 저장
    const timerRef = useRef(null);
    const flowTimerRef = useRef(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const ttsPlayedRef = useRef<{ [key: string]: boolean }>({});
    const audioMimeTypeRef = useRef<string>('audio/wav');
    const sessionStartTimeRef = useRef<number>(Date.now()); // 세션 시작 시간 저장

    // 세션 초기화
    useEffect(() => {
        const initializeSession = async () => {
            if (!scenarioId) {
                console.log('❌ scenarioId not found');
                setError('Scenario ID not found');
                return;
            }
            try {
                setIsLoading(true);
                // 세션 시작 시간 기록
                sessionStartTimeRef.current = Date.now();
                const initialDialogue = await startRoleplaySession(parseInt(scenarioId));
                setSessionId(initialDialogue.sessionId);
                setCurrentDialogue(initialDialogue);
                setError(null);
            } catch (err: any) {
                console.error('❌ Session init failed:', err?.message);
                const errorMsg = err?.response?.data?.status?.message || err?.message || 'Unknown error';
                setError(`Failed to start roleplay: ${errorMsg}`);
            } finally {
                setIsLoading(false);
            }
        };
        initializeSession();
    }, [scenarioId]);

    // 스크롤 자동 이동 로직
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }, 0);
        return () => clearTimeout(timeout);
    }, [turnHistory, step, selectedChoiceId]);

    // 다음 대사 가져오기
    const moveToNextTurn = useCallback(async () => {
        if (!sessionId) return;
        try {
            setIsLoadingNextTurn(true);
            const nextDialogue = await getNextDialogue(sessionId);

            // USER speaker이고 mismatch 필드가 있으면 choices 배열로 변환
            if (nextDialogue.speaker === 'USER' && nextDialogue.mismatchKorean) {
                nextDialogue.choices = [
                    {
                        id: 1,
                        korean: nextDialogue.korean,
                        romanized: nextDialogue.romanized,
                        english: nextDialogue.english,
                        isCorrect: true
                    },
                    {
                        id: 2,
                        korean: nextDialogue.mismatchKorean,
                        romanized: nextDialogue.mismatchRomanized,
                        english: nextDialogue.mismatchEnglish,
                        isCorrect: false
                    }
                ];
            }

            setCurrentDialogue(nextDialogue);
            // USER 턴일 때는 1번을 기본값으로 선택, AI 턴일 때는 null
            setSelectedChoiceId(nextDialogue.speaker === 'USER' ? 1 : null);
            setGradingResult(null);
            setPracticeLineData(null);
            // 새로운 대사에 대한 TTS 재생 플래그 초기화
            delete ttsPlayedRef.current[`listen-${nextDialogue.dialogueId}`];
            delete ttsPlayedRef.current[`practice-${nextDialogue.dialogueId}`];

            // Speaker 타입에 따라 다른 단계로 이동
            const nextStep = nextDialogue.speaker === 'AI' ? STEPS.LISTEN : STEPS.CHOICE_SETUP;
            setStep(nextStep);
            setIsLoadingNextTurn(false);
        } catch (err: any) {
            console.error('Failed to get next dialogue:', err);

            // R016 에러 (대화 세트 초과 = 세션 완료)
            if (err?.response?.data?.status?.statusCode === 'R016') {
                console.log('📝 R016: 모든 대화 완료, 세션 종료 처리 중...');
                try {
                    // 세션 완료 API 호출
                    const sessionSummary = await completeRoleplaySession(sessionId);

                    // 소요 시간 계산
                    const elapsedMs = Date.now() - sessionStartTimeRef.current;
                    const minutes = Math.floor(elapsedMs / 60000);
                    const seconds = Math.floor((elapsedMs % 60000) / 1000);
                    const timeTaken = `${minutes}m ${seconds}s`;

                    // 완료 페이지로 이동
                    navigate('/mainpage/rolePlay/complete', {
                        state: {
                            sessionId,
                            scenarioId: parseInt(scenarioId || '0'),
                            sessionSummary,
                            timeTaken,
                            rolePlayName: 'Role Play_At a Cafe',
                            turns: turnHistory
                        }
                    });
                } catch (completeErr) {
                    console.error('Failed to complete session:', completeErr);
                    setError('세션 완료 처리 중 오류가 발생했습니다.');
                    setStep(STEPS.DONE);
                }
            } else {
                // 기타 에러
                console.error('API Error:', err?.response?.data?.status?.statusCode);
                setError('다음 대사를 불러올 수 없습니다.');
                setStep(STEPS.DONE);
            }
            setIsLoadingNextTurn(false);
        }
    }, [sessionId, navigate, turnHistory]);

    // 녹음 채점 로직 (일반 녹음 턴) - 재도전 없음, 한 번에 평가 후 다음으로
    const handleRecordingGrading = useCallback((feedback: string) => {
        clearInterval(timerRef.current);
        setIsRecording(false);
        setStep(STEPS.GRADING);

        // 피드백 결과 매핑 (API 응답 기준)
        const resultDisplay = feedback === 'GOOD' ? 'CORRECT' : 'INCORRECT';
        setGradingResult(resultDisplay);  // UI 표시용

        setTimeout(() => {
            // 피드백을 표시한 후, 무조건 다음 턴으로 이동 (재도전 없음)
            const finalTurnData = {
                ...currentDialogue,
                result: resultDisplay,
                userResponseData: {
                    text: currentDialogue.korean,
                    grade: resultDisplay
                }
            };
            setTurnHistory(prev => [...prev, finalTurnData]);
            moveToNextTurn();
        }, 1500);
    }, [currentDialogue, moveToNextTurn]);

    // 연습 단계 녹음 채점 로직 - 재도전 없음, 한 번에 평가 후 다음으로
    const handlePracticeGrading = useCallback((feedback: string) => {
        clearInterval(timerRef.current);
        setIsRecording(false);
        setStep(STEPS.PRACTICE_GRADING);

        // 피드백 결과 매핑 (API 응답 기준)
        const resultDisplay = feedback === 'GOOD' ? 'CORRECT' : 'INCORRECT';
        setGradingResult(resultDisplay);  // UI 표시용

        setTimeout(() => {
            // 최종적으로 카드선택 내용을 turnHistory에 추가 (연습 완료 후)
            if (selectedChoiceData) {
                setTurnHistory(prev => [...prev, selectedChoiceData]);
                setSelectedChoiceData(null);
            }

            moveToNextTurn();
        }, 1500);

    }, [moveToNextTurn, selectedChoiceData]);

    // TTS 재생이 끝났을 때 호출되는 콜백
    const handleTtsPlaybackFinished = useCallback((success) => {
        setIsTtsPlaying(false);

        if (flowTimerRef.current) {
            clearTimeout(flowTimerRef.current);
            flowTimerRef.current = null;
        }

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

    const startTtsAndListen = useCallback((text, onFinish = null) => {
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

    }, [isRecording, handleTtsPlaybackFinished]);


    // 선택지 버튼 클릭 시 (TTS 재생 및 선택)
    const handleChoiceOptionClick = useCallback((optionId, text) => {
        if (step === STEPS.CHOICE_FEEDBACK || isRecording) return;

        setSelectedChoiceId(optionId);
        setTtsOptionId(optionId);

        startTtsAndListen(text);
    }, [step, isRecording, startTtsAndListen]);


    // LISTEN 단계에서 TTS 버튼을 눌렀을 때
    const handleListenTtsClick = useCallback(() => {
        if ((step === STEPS.LISTEN || step === STEPS.PRACTICE_LISTEN) && !isTtsPlaying) {

            let textToSpeak = currentDialogue?.korean;
            if (step === STEPS.PRACTICE_LISTEN && practiceLineData) {
                textToSpeak = practiceLineData.korean;
            }
            if (textToSpeak) {
                if (flowTimerRef.current) {
                    clearTimeout(flowTimerRef.current);
                    flowTimerRef.current = null;
                }
                startTtsAndListen(textToSpeak);
            }
        }
    }, [step, currentDialogue, practiceLineData, isTtsPlaying, startTtsAndListen]);

    const handlePracticeListenTtsClick = handleListenTtsClick;


    // LISTEN/PRACTICE_LISTEN 단계 자동 TTS 호출 (한 번만)
    useEffect(() => {
        if (step === STEPS.LISTEN && currentDialogue) {
            const dialogueKey = `listen-${currentDialogue.dialogueId}`;

            // 이미 재생했으면 건너뛰기
            if (ttsPlayedRef.current[dialogueKey]) {
                return;
            }

            const textToSpeak = currentDialogue.korean;
            ttsPlayedRef.current[dialogueKey] = true;
            startTtsAndListen(textToSpeak);
        } else if (step === STEPS.PRACTICE_LISTEN && practiceLineData) {
            const practiceKey = `practice-${practiceLineData.dialogueId}`;

            if (ttsPlayedRef.current[practiceKey]) {
                return;
            }

            const textToSpeak = practiceLineData.korean;
            ttsPlayedRef.current[practiceKey] = true;
            startTtsAndListen(textToSpeak);
        }
    }, [step, currentDialogue, practiceLineData, startTtsAndListen]);

// 선택 제출 로직 (턴 2, 4, 6)
const handleChoiceSelect = useCallback(() => {
    if (selectedChoiceId === null || step !== STEPS.CHOICE_SETUP) return;

    const selectedOption = currentDialogue.choices?.find(c => c.id === selectedChoiceId);
    const isCorrect = selectedOption && selectedOption.isCorrect;
    const result = isCorrect ? 'CORRECT' : 'INCORRECT';

    // 정답 옵션 (연습용)
    const correctOption = currentDialogue.choices?.find(c => c.isCorrect);

    // 카드선택 내용 임시 저장 (화면에는 표시하지만 카운트에 포함 X)
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

    window.speechSynthesis.cancel();
    setIsTtsPlaying(false);

    setStep(STEPS.CHOICE_FEEDBACK);
    setGradingResult(result);

    setTimeout(() => {
        // 3. 피드백 기간 종료 후 처리

        if (isCorrect) {
            // 정답인 경우: 정답 텍스트를 연습하고 다음 메인 턴으로 이동
            setPracticeLineData(correctOption);
            setStep(STEPS.PRACTICE_LISTEN);

        } else {
            // 오답인 경우: 정답 텍스트를 연습하도록 설정
            setPracticeLineData(correctOption);

            // Practice Listen 단계로 전환 (정답 텍스트 학습)
            setStep(STEPS.PRACTICE_LISTEN);
        }

        setSelectedChoiceId(null);
        setGradingResult(null);
    }, 1500); // 1.5초 후 피드백 완료

}, [selectedChoiceId, step, currentDialogue, moveToNextTurn]);

    // 마이크 누름/뗌 핸들러
    const handleMicPress = useCallback(() => {
        // USER 턴(PRACTICE_LISTEN/PRACTICE_SPEAK)은 TTS 중에도 마이크 사용 가능
        const isAiTurn = currentDialogue?.speaker === 'AI';
        const isUserTurn = currentDialogue?.speaker === 'USER';

        // AI 턴이면 isTtsPlaying 확인, USER 턴이면 무시
        if (isAiTurn && isTtsPlaying) {
            return;
        }

        const isActionable = isAiTurn || step === STEPS.PRACTICE_SPEAK;
        const isReady = step === STEPS.SPEAK_SETUP || step === STEPS.LISTEN_DONE ||
                        (isUserTurn && (step === STEPS.PRACTICE_LISTEN || step === STEPS.PRACTICE_LISTEN_DONE)) ||
                        step === STEPS.PRACTICE_SPEAK;

        if (!isActionable || !isReady) {
            console.log('🎙️ Mic press blocked:', { step, isActionable, isReady, speaker: currentDialogue?.speaker });
            return;
        }

        if (step === STEPS.SPEAK_SETUP || step === STEPS.LISTEN_DONE) {
            setStep(STEPS.RECORDING);
        } else if (step === STEPS.PRACTICE_LISTEN_DONE) {
            setStep(STEPS.PRACTICE_SPEAK);
            return; // step 변경 후 바로 return (마이크 시작 안 함)
        }

        // MediaRecorder 시작
        const initMediaRecorder = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

                // 브라우저가 지원하는 mime type 자동 감지 (WAV 우선순위)
                let mimeType = '';
                const supportedTypes = ['audio/wav', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
                for (const type of supportedTypes) {
                    if (MediaRecorder.isTypeSupported(type)) {
                        mimeType = type;
                        break;
                    }
                }

                audioMimeTypeRef.current = mimeType || 'audio/wav'; // ref에 저장
                const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
                audioChunksRef.current = [];

                recorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunksRef.current.push(event.data);
                    }
                };

                recorder.onerror = (event) => {
                    console.error('Recording error:', event.error);
                };

                mediaRecorderRef.current = recorder;
                recorder.start();
                console.log('🎤 Recording started with mime type:', mimeType);

            } catch (err) {
                console.error('Mic access failed:', err);
                setError('마이크 접근 권한이 없습니다.');
                setIsRecording(false);
            }
        };

        // MediaRecorder 초기화 및 시작
        initMediaRecorder().then(() => {
            // recorder.start()가 비동기이므로 약간의 지연 후 isRecording 설정
            setTimeout(() => {
                setIsRecording(true);
                clearInterval(timerRef.current);
            }, 50);
        });
    }, [step, currentDialogue, isTtsPlaying]);

    const handleMicRelease = useCallback(() => {
        if (!isRecording || !mediaRecorderRef.current) return;

        const recorder = mediaRecorderRef.current;

        // recorder가 실제로 녹음 중인지 확인
        if (recorder.state !== 'recording') {
            console.warn('Recorder not in recording state:', recorder.state);
            setIsRecording(false);
            return;
        }

        setIsRecording(false);

        // 🎤 녹음 종료 및 음성 파일 생성

        recorder.onstop = async () => {
            try {
                // 오디오 파일 검증
                if (audioChunksRef.current.length === 0) {
                    console.error('No audio chunks recorded');
                    setError('녹음 실패: 오디오가 캡처되지 않았습니다.');
                    return;
                }

                // Blob 생성 및 File로 변환 (선택된 MIME 타입 사용)
                const mimeType = audioMimeTypeRef.current;
                const fileExtension = mimeType === 'audio/wav' ? 'wav' : mimeType === 'audio/mp4' ? 'mp4' : 'webm';
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                const audioFile = new File([audioBlob], `recording-${Date.now()}.${fileExtension}`, { type: mimeType });

                if (audioFile.size === 0) {
                    console.error('Audio file is empty');
                    setError('녹음 실패: 생성된 파일이 비어있습니다.');
                    return;
                }

                // evaluatePronunciation API 호출
                if (!sessionId || !currentDialogue) {
                    console.error('Missing sessionId or currentDialogue');
                    setError('세션 정보가 없습니다.');
                    return;
                }

                const evaluationResult = await evaluatePronunciation(
                    audioFile,
                    sessionId,
                    currentDialogue.dialogueId
                );

                // 피드백에 따라 처리
                const feedback = evaluationResult.feedback; // 'GOOD' | 'RETRY' | 'WRONG'

                if (currentDialogue?.speaker === 'AI') {
                    handleRecordingGrading(feedback);
                } else {
                    handlePracticeGrading(feedback);
                }

                // 스트림 정지
                recorder.stream.getTracks().forEach(track => track.stop());
            } catch (err: any) {
                console.error('Failed to evaluate pronunciation:', err);
                const errorMsg = err?.response?.data?.status?.message || err?.message || 'Unknown error';

                // R015 에러 (재도전 횟수 초과)
                if (err?.response?.data?.status?.statusCode === 'R015') {
                    console.log('Max retries exceeded (R015), moving to next dialogue');
                    if (currentDialogue?.speaker === 'AI') {
                        handleRecordingGrading('RETRY'); // 다음으로 강제 진행
                    } else {
                        handlePracticeGrading('RETRY');
                    }
                } else {
                    setError(`평가 실패: ${errorMsg}`);
                    // 재시도 가능하도록 recording 상태로 복귀
                }

                recorder.stream.getTracks().forEach(track => track.stop());
            }
        };

        recorder.stop();
    }, [isRecording, handleRecordingGrading, handlePracticeGrading, currentDialogue, sessionId]);

    // --- (useEffect 흐름 제어 로직은 변화 없음) ---
    useEffect(() => {

        clearInterval(timerRef.current);
        clearTimeout(flowTimerRef.current);

        if (step === STEPS.START && currentDialogue) {
            flowTimerRef.current = setTimeout(() => {
                const nextStep = currentDialogue.speaker === 'AI' ? STEPS.LISTEN : STEPS.CHOICE_SETUP;
                setStep(nextStep);
            }, 1500);
        }

        if (step === STEPS.LISTEN || step === STEPS.PRACTICE_LISTEN) {
            flowTimerRef.current = setTimeout(() => {
                window.speechSynthesis.cancel();
                setIsTtsPlaying(false);
                const nextStep = step === STEPS.LISTEN ? STEPS.LISTEN_DONE : STEPS.PRACTICE_LISTEN_DONE;
                setStep(nextStep);
            }, 4000);
        }

        if (step === STEPS.LISTEN_DONE) {
            flowTimerRef.current = setTimeout(() => {
                setStep(STEPS.SPEAK_SETUP);
            }, 0);
        }

        if (step === STEPS.SPEAK_SETUP && currentDialogue?.speaker === 'AI') {
            // 엄격하게 10으로 리셋 - 재시도 시 누적 방지
            setRecordingCountdown(10);

            // 기존 interval이 있으면 먼저 명시적으로 clear
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }

            timerRef.current = setInterval(() => {
                setRecordingCountdown(prev => {
                    if (prev === 0) {
                        clearInterval(timerRef.current);
                        if (!isRecording) { handleRecordingGrading('INCORRECT'); }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

    if (step === STEPS.DONE) {
        navigate('/mainpage/rolePlay/complete', {
            state: {
                sessionId,
                rolePlayName: 'Role Play_At a Cafe',
                turns: turnHistory
            }
        });
    }

        if (step === STEPS.PRACTICE_LISTEN_DONE) {
                flowTimerRef.current = setTimeout(() => {
                    setStep(STEPS.PRACTICE_SPEAK);
                }, 0);
        }

        if (step === STEPS.PRACTICE_SPEAK) {
            // 엄격하게 10으로 리셋 - 재시도 시 누적 방지
            setRecordingCountdown(10);

            // 기존 interval이 있으면 먼저 명시적으로 clear
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }

            timerRef.current = setInterval(() => {
                setRecordingCountdown(prev => {
                    if (prev === 0) {
                        clearInterval(timerRef.current);
                        if (!isRecording) { handlePracticeGrading('INCORRECT'); }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
                clearInterval(timerRef.current);
                clearTimeout(flowTimerRef.current);
                window.speechSynthesis.cancel();
        };


    }, [step, isRecording, currentDialogue, handleRecordingGrading, handlePracticeGrading, navigate, sessionId]);


    // 로딩 상태
    if (isLoading) {
        return (
            <div className={styles.pageContainer}>
                <Header hasBackButton />
                <Mascot image="thinking" text="Loading roleplay..." />
                <ContentSection color="blue">
                    <div>Loading...</div>
                </ContentSection>
            </div>
        );
    }

    // 에러 상태
    if (error || !currentDialogue) {
        return (
            <div className={styles.pageContainer}>
                <Header hasBackButton />
                <Mascot image="gloomy" text="Something went wrong" />
                <ContentSection color="blue">
                    <div style={{ color: 'red' }}>{error || 'Failed to load roleplay'}</div>
                </ContentSection>
            </div>
        );
    }

    // UI 데이터 설정
    let currentBubbleText;
    let bubbleClass = 'role-bubble';

    const isPracticeFlow = step === STEPS.PRACTICE_LISTEN || step === STEPS.PRACTICE_SPEAK || step === STEPS.PRACTICE_GRADING || step === STEPS.PRACTICE_LISTEN_DONE;

    // 스크롤 잠금 변수 정의 (렌더링 스코프)
    const isScrollLocked = step === STEPS.CHOICE_SETUP || step === STEPS.CHOICE_FEEDBACK;

    if (step === STEPS.GRADING || step === STEPS.CHOICE_FEEDBACK || step === STEPS.PRACTICE_GRADING) {
        currentBubbleText = BUBBLE_TEXT[gradingResult];
        bubbleClass += gradingResult === 'CORRECT' ? ' correct' : ' incorrect';
    } else {
        if (step === STEPS.PRACTICE_LISTEN) {
            currentBubbleText = BUBBLE_TEXT[STEPS.LISTEN];
        } else if (step === STEPS.PRACTICE_LISTEN_DONE) {
            currentBubbleText = BUBBLE_TEXT[STEPS.LISTEN_DONE];
        } else if (step === STEPS.PRACTICE_SPEAK) {
            currentBubbleText = BUBBLE_TEXT[STEPS.SPEAK_SETUP];
        } else {
            currentBubbleText = BUBBLE_TEXT[step] || BUBBLE_TEXT[STEPS.START];
        }
    }

    const characterImage = getCharacterImage(step, gradingResult);


    const TurnContentBox = ({ data }) => {
        const isRecordingTurn = data.speaker === 'AI';
        const isChoiceTurn = data.speaker === 'USER';

        // turnHistory에 기록된 내용은 항상 CORRECT(정답)이므로 항상 초록색을 표시합니다.
        const resultForColor = isChoiceTurn ? data.userResponseData?.finalResult : data.result;
        // romanizedClass 변수를 styles 객체를 사용하도록 수정해야 함
        const romanizedClass = styles.correctRom;
        const role = data.speaker;

        const selectedData = isChoiceTurn ? data.userResponseData : {};

        const mainKoreanText = isChoiceTurn ? selectedData.text : data.korean;
        const mainRomanizedText = isChoiceTurn ? selectedData.romanized : data.romanized;
        const mainEnglishText = isChoiceTurn ? selectedData.english : data.english;

        return (
            <div className={`${styles.textDisplayBox} ${styles.historyBox}`}>
                <div className={`${styles.textLine} ${styles.koreanLine}`}>
                    <span className={`${styles.koreanText} ${styles.historyKorean}`}>{mainKoreanText}</span>
                    {isRecordingTurn && <button className={`${styles.ttsButton} ${styles.active}`} onClick={() => startTtsAndListen(data.korean)} disabled={isTtsPlaying}>🔊</button>}
                </div>
                <div className={`${styles.textLine} ${styles.romanizedLine}`}>
                    <span className={`${styles.romanizedText} ${styles.historyRomanized} ${romanizedClass}`}>{mainRomanizedText}</span>
                    {isRecordingTurn && <span className={`${styles.smallMicIcon} ${styles.active}`}>🎤</span>}
                </div>
                <span className={`${styles.englishText} ${styles.historyEnglish}`}>{mainEnglishText}</span>

                <div className={`${styles.roleContainer} ${styles.customer}`}><span className={styles.roleTag}>{role}</span></div>
            </div>
        );
    };


    // ⬇현재 활성 입력 턴 렌더링
    const renderActiveInput = () => {
        const isCurrentlySpeaking = window.speechSynthesis.speaking;

        const isPracticeFlow = step === STEPS.PRACTICE_LISTEN || step === STEPS.PRACTICE_SPEAK || step === STEPS.PRACTICE_GRADING || step === STEPS.PRACTICE_LISTEN_DONE;

        // 임시 저장된 카드선택 데이터 표시 (화면에만 표시, 카운트 미포함)
        if (selectedChoiceData && step !== STEPS.CHOICE_SETUP) {
            return <TurnContentBox data={selectedChoiceData} />;
        }

        // 다음 턴 로딩 중일 때
        if (isLoadingNextTurn) {
            return (
                <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: '#666',
                    fontSize: '16px',
                    fontWeight: 'bold'
                }}>
                    <div style={{ marginBottom: '15px' }}>⏳ 다음 문제를 준비 중입니다...</div>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '4px solid #007CFF',
                        borderTop: '4px solid #f3f3f3',
                        borderRadius: '50%',
                        margin: '0 auto',
                        animation: 'spin 1s linear infinite'
                    }}></div>
                    <style>{`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            );
        }

        // 1. 일반 녹음 입력 턴 (AI Speaker)
        if (currentDialogue.speaker === 'AI' && !isPracticeFlow) {
            const isTtsActionable = step === STEPS.LISTEN;
            const isMicActionable = step === STEPS.SPEAK_SETUP || step === STEPS.RECORDING || step === STEPS.LISTEN_DONE;
            // styles 객체 사용을 위해 문자열 클래스 제거 및 모듈 클래스로 변경 필요
            const mainMicButtonClass = isMicActionable ? (isRecording ? styles.on : styles.off) : `${styles.off} ${styles.disabled}`;
            const getRomClass = () => {
                 // styles 객체를 사용하도록 변경 필요
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
                            <button
                                className={`${styles.ttsButton} ${isTtsActionable ? styles.active : ''}`}
                                onClick={handleListenTtsClick}
                                disabled={!isTtsActionable || isCurrentlySpeaking}>
                                🔊
                            </button>
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

                            <button
                                className={`${styles.mainMicButton} ${mainMicButtonClass}`}
                                onMouseDown={handleMicPress} onMouseUp={handleMicRelease}
                                onTouchStart={handleMicPress} onTouchEnd={handleMicRelease}
                                disabled={!isMicActionable || isCurrentlySpeaking}>
                                <span className={styles.mainMicIcon}>🎤
                                    <span className={styles.micStatusText}>{isRecording ? "ON" : "OFF"}</span>
                                </span>
                            </button>

                        </div>
                    </div>
                </div>
            );
        }

        // 2. 선택지 입력 턴 (USER Speaker) - CHOICE_SETUP 또는 CHOICE_FEEDBACK 단계
        else if (currentDialogue.speaker === 'USER' && !isPracticeFlow) {
            const customerData = currentDialogue.choices;

            // USER speaker인데 choices가 없으면 오류 표시
            if (!customerData || customerData.length === 0) {
                console.error('❌ USER turn but no choices provided!', {
                    dialogueId: currentDialogue.dialogueId,
                    speaker: currentDialogue.speaker,
                    hasChoices: !!customerData,
                    choicesLength: customerData?.length || 0
                });

                return (
                    <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>
                        ❌ 선택지가 없습니다. (백엔드 오류)
                    </div>
                );
            }

            const isDisabled = step === STEPS.CHOICE_FEEDBACK || isCurrentlySpeaking;
            const isSubmitActive = selectedChoiceId !== null;
            // ⭐ styles 객체 사용을 위해 문자열 클래스 제거 및 모듈 클래스로 변경 필요
            const submitButtonClass = isSubmitActive ? styles.on : `${styles.off} ${styles.disabled}`;

            let displayOption = customerData?.find(c => c.id === selectedChoiceId);
            if (!displayOption && step === STEPS.CHOICE_SETUP) {
                displayOption = customerData?.[0];
            } else if (step === STEPS.CHOICE_FEEDBACK) {
                displayOption = null;
            }

            return (
                <>
                    {displayOption && step === STEPS.CHOICE_SETUP && (
                        <div className={`${styles.textDisplayBox} ${styles.historyBox}`}>
                            <div className={`${styles.textLine} ${styles.koreanLine}`}>
                                <span className={styles.koreanText}>{displayOption.korean}</span>
                                <button
                                    className={`${styles.ttsButton} ${isCurrentlySpeaking && ttsOptionId === displayOption.id ? styles.active : styles.choiceTtsInactive}`}
                                    onClick={() => handleChoiceOptionClick(displayOption.id, displayOption.korean)}
                                    disabled={isDisabled}
                                >
                                    🔊
                                </button>
                            </div>
                            <div className={`${styles.textLine} ${styles.romanizedLine}`}>
                                <span className={styles.romanizedText}>{displayOption.romanized}</span>
                            </div>
                            <span className={styles.englishText}>{displayOption.english}</span>
                            <div className={`${styles.roleContainer} ${styles.costomer}`}><span className={styles.roleTag}>{currentDialogue.speaker}</span></div>
                        </div>
                    )}

                    {/* 3. 선택 버튼 영역 (하단 고정) */}
                    <div className={`${styles.micArea} ${styles.choiceButton}`}>
                        {/* 1, 2 버튼 */}
                        {customerData?.map(option => (
                            <button
                                key={option.id}
                                className={`${styles.choiceButtonAction} ${option.id === selectedChoiceId ? styles.selected : ''}`}
                                onClick={() => handleChoiceOptionClick(option.id, option.korean)}
                                disabled={isDisabled}
                            >
                                {option.id}
                            </button>
                        ))}

                        <button
                            // ⭐ styles 객체와 조건부 클래스 사용
                            className={`${styles.mainMicButton} ${styles.selectSubmitButton} ${
                                step === STEPS.CHOICE_FEEDBACK
                                    ? (gradingResult === 'CORRECT' ? styles.correctSubmit : styles.incorrectSubmit)
                                    : ''
                            } ${submitButtonClass}`}
                            onClick={handleChoiceSelect}
                            disabled={!isSubmitActive}
                        >
                            <span className={styles.selectSubmitText}>
                                Select
                            </span>
                        </button>
                    </div>
                </>
            );
        }

        // 3. ⭐ 연습 단계 렌더링
        else if (isPracticeFlow && practiceLineData) {
            // ⭐ styles 객체 사용을 위해 문자열 클래스 제거 및 모듈 클래스로 변경 필요
            const practiceButtonActive = step === STEPS.PRACTICE_SPEAK || step === STEPS.PRACTICE_LISTEN_DONE;
            const practiceMainMicClass = practiceButtonActive ? (isRecording ? styles.on : styles.off) : `${styles.off} ${styles.disabled}`;
            // const practiceRomClass = (step === STEPS.PRACTICE_GRADING && gradingResult !== 'CORRECT') ? styles.incorrectActive : '';

            return (
                <div className={`${styles.micArea} ${styles.fullWidthMic}`}>
                    <div className={styles.micButtonWrapper}>
                        <button
                            className={`${styles.mainMicButton} ${practiceMainMicClass}`}
                            onMouseDown={handleMicPress} onMouseUp={handleMicRelease}
                            onTouchStart={handleMicPress} onTouchEnd={handleMicRelease}
                            disabled={!practiceButtonActive || isCurrentlySpeaking}>
                            <span className={styles.mainMicIcon}>🎤
                                <span className={styles.micStatusText}>{isRecording ? "ON" : "OFF"}</span>
                            </span>
                        </button>
                    </div>
                </div>
            );
        }

        return <></>;
    };


    return (
        <div className={`${styles.pageContainer} ${styles.appContainer}`}>

            {/* ⭐ 1. Header 컴포넌트 추가 */}
            <Header hasBackButton />

                {/* ⭐ 2. Mascot 컴포넌트로 대체 */}
                <Mascot image={characterImage} text={currentBubbleText} />

            <ContentSection color="blue">
                <div className={styles.cardTitleBar}>
                    <span className={styles.cardTitleText}>Role Play_At a Cafe</span>
                    <span className={styles.cardStepText}>{turnHistory.length + 1}/6</span>
                </div>

                {/* 스크롤 가능한 대화 기록 영역 */}
                <div className={`${styles.turnHistoryArea} ${isScrollLocked ? styles.scrollLocked : ''}`} ref={scrollRef}>
                    {turnHistory.map((turn, index) => (
                        <TurnContentBox key={index} data={turn} />
                    ))}
                    {renderActiveInput()}
                </div>

        </ContentSection>
        </div>
    );
};

export default RolePlay;
