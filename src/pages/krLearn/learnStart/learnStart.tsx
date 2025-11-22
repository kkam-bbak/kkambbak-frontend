import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import styles from './learnStart.module.css';
import soundButton from '../../../assets/soundButton.png';
import { http } from '../../../apis/http';
import Header from '@/components/layout/Header/Header';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';
import CorrectImg from '@/assets/Correct.png';
import InCorrectImg from '@/assets/InCorrect.png';
import MicOn from '@/assets/MicOn.png'; 
import MicOff from '@/assets/MicOff.png';
import ContentSection from '@/components/layout/ContentSection/ContentSection';

// --- 인터페이스 정의 ---
// ... (FirstVocabulary 정의를 포함한 나머지 인터페이스 정의 유지) ...
interface ApiResponseBody<T> {
  status: { statusCode: string; message: string; description: string | null };
  body: T;
}
interface LearningStartBody {
    sessionId: string | number;
    resultId: number;
    vocabIds: number[];
    totalVocabularyCount: number;
    baseResultId: number | null;
    firstVocabulary: FirstVocabulary | null;
    sessionTitle: string;
}
interface FirstVocabulary {
  vocabularyId: number;
  korean: string;
  romanization: string;
  english: string;
  imageId: string;
}
type LearningStartResponse = ApiResponseBody<LearningStartBody>;

interface NextItem {
  itemId: number;
  korean: string;
  romanization: string;
  english: string;
  imageUrl: string; 
}

interface GradeData {
  correct: boolean;
  moved: boolean;
  finished: boolean;
  next: NextItem | null;
  correctAnswer: string | null;
}
type GradeResponse = ApiResponseBody<GradeData>;

interface LearningContent {
  topicTitle: string;
  itemId: number;
  korean: string;
  romanized: string;
  translation: string;
  imageUrl: string;
}

export interface WordResult {
  romnized: string;
  korean: string;
  translation: string;
  isCorrect: boolean;
}

interface LocationState {
  wordsToRetry?: WordResult[];
  isRetryWrong?: boolean;
  baseResultId?: number;
  categoryName?: string;
}

type LearningStatus = 'initial' | 'listen' | 'countdown' | 'speak';
type ResultStatus = 'none' | 'processing' | 'correct' | 'incorrect';
type ResultDisplayStatus = 'none' | 'initial_feedback' | 'meaning_revealed';

// 🔥 [추가] Local Storage 키 및 타입 정의 (LearnList, LearnComplete와 동기화)
const LS_LEARNING_TIMES_KEY = 'learning_completion_times';
interface CompletionTime {
    time: string; // 'Xm Ys' 형식
    completedAt: number; // 타임스탬프
}
type LearningTimes = { [sessionId: number]: CompletionTime };

// 🔥 [추가] 로컬 스토리지 완료 기록 삭제 함수
const clearLocalLearningTime = (sessionId: number) => {
    try {
        const storedData = localStorage.getItem(LS_LEARNING_TIMES_KEY);
        if (storedData) {
            const times: LearningTimes = JSON.parse(storedData);
            delete times[sessionId]; // 해당 세션 ID의 기록 삭제
            // String(sessionId) 키도 삭제해야 합니다.
            if (times[String(sessionId) as unknown as number]) {
                delete times[String(sessionId) as unknown as number];
            }
            localStorage.setItem(LS_LEARNING_TIMES_KEY, JSON.stringify(times));
        }
    } catch (e) {
        console.error('Failed to clear local learning time', e);
    }
};


const emptyContent: LearningContent = {
  topicTitle: 'Loading...',
  itemId: 0,
  korean: '',
  romanized: '',
  translation: '',
  imageUrl: 'https://placehold.co/100x100/CCCCCC/000000?text=Wait',
};

const firstVocabToContent = (vocab: FirstVocabulary, title: string): LearningContent => ({
  topicTitle: title,
  itemId: vocab.vocabularyId,
  korean: vocab.korean,
  romanized: vocab.romanization,
  translation: vocab.english,
  imageUrl: vocab.imageId, 
});

const nextItemToContent = (item: NextItem, topicTitle: string): LearningContent => ({
  topicTitle,
  itemId: item.itemId,
  korean: item.korean,
  romanized: item.romanization,
  translation: item.english,
  imageUrl: item.imageUrl || 'https://placehold.co/100x100/E64A19/FFFFFF?text=' + item.korean,
});

// 🔥 [필수] WAV 변환 유틸리티 (서버가 WebM을 못 읽는 경우 대비)
const writeWavHeader = (sampleRate: number, dataLength: number) => {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); 
  view.setUint16(22, 1, true); 
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); 
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  return buffer;
};

const convertToWav = async (webmBlob: Blob): Promise<File> => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const arrayBuffer = await webmBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const channelData = audioBuffer.getChannelData(0); // Mono
  const dataLength = channelData.length * 2; 
  const buffer = new ArrayBuffer(dataLength);
  const view = new DataView(buffer);

  for (let i = 0; i < channelData.length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
  }

  const header = writeWavHeader(audioBuffer.sampleRate, dataLength);
  const wavBlob = new Blob([header, buffer], { type: 'audio/wav' });
  return new File([wavBlob], "recording.wav", { type: "audio/wav" });
};


const LearnStart: React.FC = () => {
  const location = useLocation();
  const state = location.state as LocationState;
  const { topicId: sessionIdParam } = useParams<{ topicId: string }>();

  const navigate = useNavigate();
  const currentCategory = state?.categoryName || 'TOPIK';

  // Refs
  const hasFetched = useRef(false); 
  const startTimeRef = useRef<number>(0);
  const resultsRef = useRef<WordResult[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);


  const wordsToRetry = state?.wordsToRetry;
  const isRetryWrong = state?.isRetryWrong || false;
  const initialBaseResultId = state?.baseResultId || null;

  const [content, setContent] = useState<LearningContent>(emptyContent);
  const [currentWordIndex, setCurrentWordIndex] = useState(1);
  const [totalWords, setTotalWords] = useState(0);
  const [resultId, setResultId] = useState<number | null>(null);
  const [baseResultId, setBaseResultId] = useState<number | null>(initialBaseResultId);
  const [isLoading, setIsLoading] = useState(true);

  const [status, setStatus] = useState<LearningStatus>('initial');
  const [resultStatus, setResultStatus] = useState<ResultStatus>('none');
  const [displayStatus, setDisplayStatus] = useState<ResultDisplayStatus>('none');
  const [micOn, setMicOn] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdownTime, setCountdownTime] = useState(0);
  const countdownRef = useRef<number | null>(null);
  
  // 🔥 [추가] 학습 중단 확인 모달 상태
  const [showExitModal, setShowExitModal] = useState(false); 


  const isWordVisible = status !== 'initial';
  const isSpeakerActive = status !== 'initial';
  const isInputTextHiddenDuringChallenge = (status === 'countdown' || status === 'speak') && resultStatus === 'none';
  const isInputTextVisible = !isInputTextHiddenDuringChallenge;
  const isRomnizedVisible = isInputTextVisible;
  const isKoreanVisible = isInputTextVisible;
  const isTranslationVisible = isInputTextVisible;
  const isIncorrectView = resultStatus === 'incorrect';
  
  // 마이크가 녹음을 시작할 수 있는 기본적인 조건 (사용자가 버튼을 누를 수 있는 상태)
  const isMicActiveForRecording = (status === 'countdown' || status === 'speak') && resultStatus === 'none' && !isProcessing;

  const speakKoreanText = useCallback((text: string) => {
    // 🔥 [수정] 모달이 떠 있으면 TTS 재생 중단
    if (!('speechSynthesis' in window) || showExitModal) return; 
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [showExitModal]);


  // 데이터 처리 및 타이머 시작 (생략)
  const handleSessionData = (data: LearningStartBody) => {
      if (data.firstVocabulary) {
        setContent(firstVocabToContent(data.firstVocabulary, data.sessionTitle));
        setTotalWords(data.totalVocabularyCount);
        setResultId(data.resultId);
        if (data.baseResultId !== undefined) setBaseResultId(data.baseResultId);
        setCurrentWordIndex(1);
        setStatus('initial');
        
        startTimeRef.current = Date.now();
        resultsRef.current = []; 
      } else {
        alert('학습 데이터가 없습니다.');
        navigate('/mainpage/learnList');
      }
  };

  const fetchLearningData = useCallback(async () => {
    // ... (API 호출 로직 유지) ...
    const numericSessionId = Number(sessionIdParam);
    if (!sessionIdParam || isNaN(numericSessionId)) {
      alert("잘못된 접근입니다.");
      navigate('/mainPage/learn'); 
      return;
    }

    setIsLoading(true);

    try {
      const modeParam = (wordsToRetry && isRetryWrong) ? 'WRONG_ONLY' : 'ALL';
      const bodyPayload: { mode: string; baseResultId?: string | null } = { mode: modeParam };

      if (modeParam === 'WRONG_ONLY') {
        if (baseResultId === null) { setIsLoading(false); return; }
        bodyPayload.baseResultId = String(baseResultId);
      } 
      
      const response = await http.post<LearningStartResponse>(
        `/learning/sessions/${numericSessionId}/start`,
        bodyPayload,
        {}
      );
      
      handleSessionData(response.data.body);

    } catch (error: any) {
      
      alert("세션 시작 실패: " + (error.response?.data?.status?.message || "알 수 없는 오류"));
      navigate('/mainpage/learnList');
    } finally {
      setIsLoading(false);
    }
  }, [sessionIdParam, navigate, wordsToRetry, isRetryWrong, baseResultId]);

  // 채점 로직 (생략)
  const startGrading = useCallback(async (action: 'GRADE' | 'NEXT_AFTER_WRONG', audioFile: File | null = null) => {
      // ... (채점 로직 유지) ...
      if (resultId === null) { console.error('Result ID is missing.'); return; }
      const numericSessionId = Number(sessionIdParam);

      if (action === 'GRADE' && !audioFile) {
          console.error("❌ 녹음 파일이 생성되지 않았습니다. 채점 중단.");
          alert("녹음된 소리가 없습니다. 다시 시도해주세요.");
          setResultStatus('incorrect'); 
          return;
      }

      if (action === 'GRADE') setIsProcessing(true);
      setMicOn(false);

      const formData = new FormData();
      formData.append('action', action);
      formData.append('itemId', String(content.itemId));
      
      if (audioFile) {
          formData.append('audioFile', audioFile);
      }

      try {
        const response = await http.post<GradeResponse>(
          `/learning/${numericSessionId}/grade`, 
          formData, 
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        const data = response.data.body;
        
        setResultStatus(data.correct ? 'correct' : 'incorrect');
        if (data.correct) setDisplayStatus('initial_feedback');
        else setDisplayStatus('none');

        if (data.correct || action === 'NEXT_AFTER_WRONG') {
            resultsRef.current.push({
                romnized: content.romanized, 
                korean: content.korean,
                translation: content.translation,
                isCorrect: data.correct
            });
        }

        if (!data.correct && action === 'GRADE') {
            setIsProcessing(false);
            return; 
        }

        if (data.finished) {
             const endTime = Date.now();
             const duration = endTime - startTimeRef.current;
             setTimeout(() => {
                if (isRetryWrong) {
                    navigate(`/mainpage/review/${content.topicTitle}`, { state: { baseResultId } });
                } else {
                    navigate('/mainpage/learn/complete', { 
                        state: { 
                            resultId: resultId,
                            sessionId: numericSessionId,
                            results: resultsRef.current,
                            topicName: content.topicTitle,
                            learningDuration: duration,
                            categoryName: currentCategory,
                        } 
                    });
                }
             }, 2000); 
             return;
        }

        if (data.next) {
            const nextContent = nextItemToContent(data.next, content.topicTitle);
            
            if(data.correct){
                setTimeout(() => {
                    setContent(nextContent);
                    setCurrentWordIndex((prev) => prev + 1);
                    setStatus('initial');
                    setResultStatus('none');
                }, 2000); 
            } else {
                if(action === 'NEXT_AFTER_WRONG'){
                    setContent(nextContent);
                    setCurrentWordIndex((prev) => prev + 1);
                    setStatus('initial');
                    setResultStatus('none'); 
                }
            }
        }
      } catch (error: any) {
        console.error('Grading failed:', error);
        setResultStatus('incorrect'); 
        alert(`채점 실패: ${error.response?.data?.status?.description || "다시 시도해주세요."}`);
      } finally {
        setIsProcessing(false);
      }
    }, [resultId, content, navigate, isRetryWrong, baseResultId, sessionIdParam, currentCategory]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchLearningData();
  }, [fetchLearningData]);

  // 타이머 로직 (학습 흐름 제어)
  useEffect(() => {
    let timer: number | undefined;
    
    // 🔥 [핵심 수정] 모달이 떠 있거나 로딩 중이면 타이머 로직 전체 중단
    if (isLoading || totalWords === 0 || showExitModal) {
        if (countdownRef.current !== null) clearInterval(countdownRef.current);
        if (timer) clearTimeout(timer);
        window.speechSynthesis.cancel(); // 혹시 TTS가 재생 중이라면 중단
        return; 
    }
    
    if (status === 'initial') {
      setResultStatus('none');
      setDisplayStatus('none');
      const initialTimer = setTimeout(() => { setStatus('listen'); }, 2000);
      return () => clearTimeout(initialTimer);
    }
    if (status === 'listen') {
      speakKoreanText(content.korean);
      timer = setTimeout(() => { setStatus('countdown'); setCountdownTime(0); }, 3000);
    }
    if (status === 'countdown') {
      if (countdownRef.current !== null) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setCountdownTime((prevTime) => {
          const newTime = prevTime + 0.1;
          if (newTime >= 10) {
            if (countdownRef.current !== null) clearInterval(countdownRef.current);
            setStatus('speak');
            startGrading('GRADE', null); 
            return 10;
          }
          return newTime;
        });
      }, 100) as unknown as number;
    }
    if (resultStatus === 'correct' && displayStatus === 'initial_feedback') {
      timer = setTimeout(() => { setDisplayStatus('meaning_revealed'); }, 1000);
    }
    return () => {
      if (countdownRef.current !== null) clearInterval(countdownRef.current);
      if (timer) clearTimeout(timer);
      window.speechSynthesis.cancel();
    };
  }, [status, resultStatus, displayStatus, content.korean, isLoading, totalWords, startGrading, showExitModal]); // 🔥 showExitModal 의존성 추가

  const handleAction = async (action: 'tryAgain' | 'next') => {
    if (action === 'next') await startGrading('NEXT_AFTER_WRONG', null);
    else if (action === 'tryAgain') { setStatus('initial'); setResultStatus('none'); setDisplayStatus('none'); }
  };

  // 녹음 로직 (생략)
  const handleMicDown = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isMicActiveForRecording || showExitModal) return; // 🔥 모달이 떠 있으면 막음
    // ... (녹음 시작 로직 유지)
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = []; 
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };
        mediaRecorder.start();
        setMicOn(true);
    } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("마이크 권한이 필요합니다.");
    }
  };

  // 🔥 [중요] WAV 변환 후 전송 (생략)
  const handleMicUp = () => {
    if (!isMicActiveForRecording || !micOn || !mediaRecorderRef.current || showExitModal) return; // 🔥 모달이 떠 있으면 막음
    // ... (녹음 중단 및 전송 로직 유지)
    mediaRecorderRef.current.onstop = async () => {
        try {
            if (audioChunksRef.current.length === 0) {
                console.error("❌ No audio data recorded.");
                return;
            }
            const webmBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const wavFile = await convertToWav(webmBlob);
            if (wavFile.size === 0) {
                alert("녹음 오류: 파일 크기가 0입니다.");
                return;
            }
            startGrading('GRADE', wavFile);
        } catch (error) {
            console.error("❌ WAV Conversion Error:", error);
            alert("오디오 처리 중 오류가 발생했습니다.");
        } finally {
            if (mediaRecorderRef.current?.stream) {
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
        }
    };
    mediaRecorderRef.current.stop();
    setMicOn(false);
  };

  const handleSpeakerClick = () => { 
    // 🔥 [수정] 모달이 떠 있으면 TTS 재생 중단
    if (isSpeakerActive && !showExitModal) { 
        speakKoreanText(content.korean); 
    }
  };

  const bubbleText = (() => {
    if (showExitModal) return 'What was it? Tell me!'; // 모달이 떴을 때 말풍선
    if (isLoading) return 'Loading session data...';
    if (isProcessing) return 'Grading...';
    if (resultStatus === 'correct') {
      if (displayStatus === 'initial_feedback') return 'good job!';
      if (displayStatus === 'meaning_revealed') return `${content.romanized} means ${content.translation.toLowerCase()}.`;
      return 'good job!';
    }
    if (resultStatus === 'incorrect') return 'Should we try again?';
    if (status === 'initial') return 'Start!';
    if (status === 'countdown' || status === 'speak') return 'What was it? Tell me';
    return 'Listen carefully';
  })();

  const getMascotImage = (): MascotImage => {
    if (isLoading || isProcessing) return 'basic';
    if (showExitModal) return 'thinking'; // 모달이 떴을 때 마스코트 이미지
    if (status === 'initial') return 'smile';
    if (resultStatus === 'incorrect') return 'wrong';
    if (resultStatus === 'correct') return 'jump';
    return 'basic';
  };
  
  const renderWordImage = () => {
    if (!isWordVisible) return null;
    return (
      <div className="word-image-placeholder">
        <img src={content.imageUrl} alt="Word visual" className="word-image" />
        {resultStatus === 'correct' && <div className="result-ring correct-ring" />}
        {resultStatus === 'incorrect' && <div className="result-cross incorrect-cross" />}
      </div>
    );
  };

  // 🔥 [추가] 결과 피드백 이미지를 렌더링하는 함수
  const renderResultFeedbackImage = () => {
    if (resultStatus === 'correct' && displayStatus === 'initial_feedback') {
      return <img src={CorrectImg} alt="Correct" className={styles.feedbackImage} />;
    }
    if (resultStatus === 'incorrect') {
      return <img src={InCorrectImg} alt="Incorrect" className={styles.feedbackImage} />;
    }
    return null;
  };

    // ⭐ [추가] 마이크 상태에 따라 이미지를 렌더링하는 함수
    const renderMicIcon = () => {
        let micImageSrc = MicOff; 
        if (micOn) {
            micImageSrc = MicOn; 
        }
        return (
            <img 
                src={micImageSrc} 
                alt="Mic Status" 
                className={styles.micStatusImage}
            />
        );
    };

    // 🔥 [추가] 마이크 버튼을 비활성화할 조건 정의
    const isMicButtonDisabled = 
        isLoading || 
        isProcessing ||
        status === 'initial' || 
        status === 'listen' || 
        (resultStatus !== 'none' && resultStatus !== 'processing') ||
        !isMicActiveForRecording ||
        showExitModal; // 🔥 [추가] 모달이 떠 있을 때도 비활성화


  // 🔥 [추가] 뒤로 가기 버튼 클릭 핸들러
  const handleBackButtonClick = () => {
      // 녹음 중이거나 처리 중이면 막습니다.
      if (micOn || isProcessing) return; 
      
      // 모달을 띄웁니다.
      setShowExitModal(true);
  };

  // 🔥 [추가] 모달에서 'Yes' 클릭 시 (학습 중단 및 목록 이동)
  const handleExitLearning = () => {
      // 🔥 [수정] 로컬 완료 기록 삭제 (API 없음 가정)
      if (sessionIdParam) {
        clearLocalLearningTime(Number(sessionIdParam));
      }
      
      setShowExitModal(false);
      navigate('/mainpage/learnList'); 
  };
  
  // 🔥 [추가] 모달에서 'No' 클릭 시 (학습 계속)
  const handleContinueLearning = () => {
      // 모달만 닫고 학습 상태를 유지합니다. (useEffect가 자동으로 타이머를 재개함)
      setShowExitModal(false);
  };


  if (isLoading) {
    return (
      <div className={styles.learnStartContainer}>
        <Header hasBackButton />
        <Mascot image="basic" text={bubbleText} />
      </div>
    );
  }

  return (
    <div className={styles.learnStartContainer}>
      <Header hasBackButton customBackAction={handleBackButtonClick} /> 
      {/* 🔥 [수정] 피드백 이미지를 띄우기 위한 래퍼 추가 */}
      <div className={styles.mascotWrapper}> 
        {renderResultFeedbackImage()}
        <Mascot image={getMascotImage()} text={bubbleText} />
      </div>
      <div className={styles.learningCard}>
        <div className={styles.cardTitleBar}>
          <span className={styles.topicName}>{content.topicTitle}</span>
          <span className="word-count">{`${currentWordIndex.toString().padStart(2, '0')}/${totalWords.toString().padStart(2, '0')}`}</span>
        </div>
        <div className={styles.wordDisplayArea}>
          {status === 'countdown' && !isIncorrectView && (
            <div className={styles.countdownBarContainer}>
              <div className={styles.countdownBarFill} style={{ width: `${100 - (countdownTime / 10) * 100}%` }}></div>
            </div>
          )}
          {renderWordImage()}
        </div>
        <div className={styles.inputFieldsContainer}>
          <div className={styles.inputRow}>
            <label>Romnized</label>
            <input type="text" value={isRomnizedVisible ? content.romanized : ''} readOnly />
            <button className={`${styles.speakerIcon}`} onClick={handleSpeakerClick} disabled={!isSpeakerActive}>
              <img src={soundButton} alt="sound" className={styles.speakerIconImage} />
            </button>
          </div>
          <div className={styles.inputRow}>
            <label>Korean</label>
            <input type="text" value={isKoreanVisible ? content.korean : ''} readOnly />
          </div>
          <div className={`${styles.inputRow} ${styles.translation}`}>
            <label>Translation</label>
            <input type="text" value={isTranslationVisible ? content.translation : ''} readOnly />
          </div>
        </div>
        {isIncorrectView ? (
          <div className={styles.actionButtonsContainer}>
            <button className={styles.actionButton} onClick={() => handleAction('tryAgain')}>Try Again</button>
            <button className={styles.actionButton} onClick={() => handleAction('next')}>Next</button>
          </div>
        ) : (
          <button className={`${styles.micButton} ${micOn ? styles.on : styles.off} ${isMicButtonDisabled ? styles.disabled : ''}`}
            onMouseDown={handleMicDown} onMouseUp={handleMicUp} onTouchStart={handleMicDown} onTouchEnd={handleMicUp}
            disabled={isMicButtonDisabled}
          >
            {renderMicIcon()}
          </button>
        )}
      </div>
      
      {/* 🔥 [수정] 학습 중단 확인 모달 */}
      {showExitModal && (
        <div className={styles.exitModalOverlay}>
          <div className={styles.exitModalContent}>
            {/* 오버레이 카드 */}
            <div className={styles.exitModalCard}>
                <div className={styles.exitModalQuestion}>
                    Are you sure you want to quit <br /> Learning and go back?
                </div>
                <div className={styles.exitModalButtons}>
                    <button onClick={handleContinueLearning} className={styles.exitButtonNo}>No</button>
                    <button onClick={handleExitLearning} className={styles.exitButtonYes}>Yes</button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearnStart;