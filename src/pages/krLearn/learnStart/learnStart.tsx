import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import styles from './learnStart.module.css';
import soundButton from '../../../assets/soundButton.png';
import { http } from '../../../apis/http';
import Header from '@/components/layout/Header/Header';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';
import CorrectImg from '@/assets/Correct.png';
import InCorrectImg from '@/assets/InCorrect.png';
import ContentSection from '@/components/layout/ContentSection/ContentSection';

// --- 인터페이스 정의 ---
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

  const isWordVisible = status !== 'initial';
  const isSpeakerActive = status !== 'initial';
  const isInputTextHiddenDuringChallenge = (status === 'countdown' || status === 'speak') && resultStatus === 'none';
  const isInputTextVisible = !isInputTextHiddenDuringChallenge;
  const isRomnizedVisible = isInputTextVisible;
  const isKoreanVisible = isInputTextVisible;
  const isTranslationVisible = isInputTextVisible;
  const isIncorrectView = resultStatus === 'incorrect';
  const isMicActiveForRecording = (status === 'countdown' || status === 'speak') && resultStatus === 'none' && !isProcessing;

  const speakKoreanText = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  // 데이터 처리 및 타이머 시작
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
      
      console.log(`[LearnStart] POST Request: /sessions/${numericSessionId}/start`);

      const response = await http.post<LearningStartResponse>(
        `/learning/sessions/${numericSessionId}/start`,
        bodyPayload,
        {}
      );
      
      handleSessionData(response.data.body);

    } catch (error: any) {
      console.error('Failed to start session:', error);
      // C001 등 에러 발생 시 안전하게 목록으로
      alert("세션 시작 실패: " + (error.response?.data?.status?.message || "알 수 없는 오류"));
      navigate('/mainpage/learnList');
    } finally {
      setIsLoading(false);
    }
  }, [sessionIdParam, navigate, wordsToRetry, isRetryWrong, baseResultId]);

  // 🔥 채점 로직
  const startGrading = useCallback(async (action: 'GRADE' | 'NEXT_AFTER_WRONG', audioFile: File | null = null) => {
      if (resultId === null) { console.error('Result ID is missing.'); return; }
      const numericSessionId = Number(sessionIdParam);

      // 🔥 [중요] GRADE인데 파일이 없으면 멈춰야 L009 에러 안 남
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
          // 🔥 파일이 실제로 존재하는지 확인 로그
          console.log(`📁 Sending Audio: ${audioFile.name} (${audioFile.size} bytes)`);
          formData.append('audioFile', audioFile);
      }

      try {
        const response = await http.post<GradeResponse>(
          `/learning/${numericSessionId}/grade`, 
          formData, 
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        const data = response.data.body;
        
        console.log("✅ Server Response:", data.correct ? "CORRECT" : "WRONG");

        setResultStatus(data.correct ? 'correct' : 'incorrect');
        if (data.correct) setDisplayStatus('initial_feedback');
        else setDisplayStatus('none');

        // 결과 저장 (정답 or Next)
        if (data.correct || action === 'NEXT_AFTER_WRONG') {
            resultsRef.current.push({
                romnized: content.romanized, 
                korean: content.korean,
                translation: content.translation,
                isCorrect: data.correct
            });
        }

        // 🔥 오답이면 멈춤 (Try Again 대기)
        if (!data.correct && action === 'GRADE') {
            setIsProcessing(false);
            return; 
        }

        // 완료 처리
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

        // 다음 문제
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
        
        // 에러 메시지 상세 확인
        const serverMsg = error.response?.data?.status?.message || "Unknown Error";
        const serverDesc = error.response?.data?.status?.description || "";
        console.log(`❌ API Error: ${serverMsg} / ${serverDesc}`);

        // L009 에러(파일 누락)가 아니면 오답 처리
        setResultStatus('incorrect'); 
        alert(`채점 실패: ${serverDesc || "다시 시도해주세요."}`);
      } finally {
        setIsProcessing(false);
      }
    }, [resultId, content, navigate, isRetryWrong, baseResultId, sessionIdParam, currentCategory]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchLearningData();
  }, [fetchLearningData]);

  // 타이머 로직 (기존 유지)
  useEffect(() => {
    let timer: number | undefined;
    if (isLoading || totalWords === 0) return; 
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
            // 시간 초과 -> 오답 처리 (파일 없이 호출 -> startGrading에서 방어)
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
  }, [status, resultStatus, displayStatus, content.korean, isLoading, totalWords, startGrading]);

  const handleAction = async (action: 'tryAgain' | 'next') => {
    if (action === 'next') await startGrading('NEXT_AFTER_WRONG', null);
    else if (action === 'tryAgain') { setStatus('initial'); setResultStatus('none'); setDisplayStatus('none'); }
  };

  // 녹음 로직 (WAV 변환 적용)
  const handleMicDown = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isMicActiveForRecording) return;
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

  // 🔥 [중요] WAV 변환 후 전송
  const handleMicUp = () => {
    if (!isMicActiveForRecording || !micOn || !mediaRecorderRef.current) return;

    mediaRecorderRef.current.onstop = async () => {
        try {
            if (audioChunksRef.current.length === 0) {
                console.error("❌ No audio data recorded.");
                return;
            }

            const webmBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            console.log(`🎙️ WebM Blob created. Size: ${webmBlob.size}`);

            // WAV 변환
            const wavFile = await convertToWav(webmBlob);
            console.log(`🎵 Converted to WAV. Size: ${wavFile.size}`);
            
            if (wavFile.size === 0) {
                alert("녹음 오류: 파일 크기가 0입니다.");
                return;
            }

            // 전송
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

  const handleSpeakerClick = () => { if (isSpeakerActive) { speakKoreanText(content.korean); } };

  const bubbleText = (() => {
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
    // 정답: 말풍선이 'good job!'일 때 (initial_feedback 상태)
    if (resultStatus === 'correct' && displayStatus === 'initial_feedback') {
      return <img src={CorrectImg} alt="Correct" className={styles.feedbackImage} />;
    }
    // 오답: 말풍선이 'Should we try again?'일 때 (incorrect 상태)
    if (resultStatus === 'incorrect') {
      return <img src={InCorrectImg} alt="Incorrect" className={styles.feedbackImage} />;
    }
    return null;
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
      <Header hasBackButton />
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
          <button className={`${styles.micButton} ${micOn ? styles.on : styles.off} ${!isMicActiveForRecording || isProcessing ? styles.disabled: ''}`}
            onMouseDown={handleMicDown} onMouseUp={handleMicUp} onTouchStart={handleMicDown} onTouchEnd={handleMicUp}
            disabled={resultStatus === 'correct' || !isMicActiveForRecording || isProcessing}
          >
            <span className={styles.micIcon}>🎤</span>
            {isProcessing ? 'PROCESSING' : micOn ? 'ON' : 'OFF'}
          </button>
        )}
      </div>
    </div>
  );
};

export default LearnStart;