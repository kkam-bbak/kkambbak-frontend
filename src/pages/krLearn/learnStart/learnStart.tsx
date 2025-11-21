import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import styles from './learnStart.module.css';
import soundButton from '../../../assets/soundButton.png';
import { http } from '../../../apis/http';
import Header from '@/components/layout/Header/Header';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';
import ContentSection from '@/components/layout/ContentSection/ContentSection';

// --- 인터페이스 정의 (기존 유지) ---
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

const LearnStart: React.FC = () => {
  const { topicId: sessionIdParam } = useParams<{ topicId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Refs
  const hasFetched = useRef(false); 
  const startTimeRef = useRef<number>(0);
  const resultsRef = useRef<WordResult[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const state = location.state as LocationState;
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

  // 데이터 처리
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
        `/api/v1/learning/sessions/${numericSessionId}/start`,
        bodyPayload,
        {}
      );
      
      handleSessionData(response.data.body);

    } catch (error: any) {
      console.error('Failed to start session:', error);
      
      // 🔥 [수정 1] C001(중복) 에러여도 "오답 학습 모드(isRetryWrong)"면 무조건 Mock으로 진행!
      if (error.response?.data?.status?.statusCode === 'C001' || isRetryWrong) {
         console.warn("⚠️ 이미 진행 중인 세션입니다. (Mock Data 사용)");
         
         // 오답 모드면 wordsToRetry를 사용하거나 임시 데이터 사용
         const mockBody: LearningStartBody = {
             sessionId: numericSessionId,
             resultId: 99999,
             vocabIds: [1, 2, 3],
             totalVocabularyCount: isRetryWrong ? (wordsToRetry?.length || 3) : 3,
             baseResultId: null,
             sessionTitle: "Casual_Emotions (Practice)",
             firstVocabulary: {
                 // 오답 목록이 있으면 첫 번째 단어를 보여줌
                 vocabularyId: 101,
                 korean: isRetryWrong && wordsToRetry?.[0] ? wordsToRetry[0].korean : "행복해요",
                 romanization: isRetryWrong && wordsToRetry?.[0] ? wordsToRetry[0].romnized : "Haengbok-haeyo",
                 english: isRetryWrong && wordsToRetry?.[0] ? wordsToRetry[0].translation : "I am happy",
                 imageId: "https://placehold.co/200x200/orange/white?text=Mock"
             }
         };
         handleSessionData(mockBody);
         return; 
      }
      
      navigate('/mainpage/learn/complete', { state: { message: 'Failed to load session data.' } });
    } finally {
      setIsLoading(false);
    }
  }, [sessionIdParam, navigate, wordsToRetry, isRetryWrong, baseResultId]);

  const startGrading = useCallback(async (action: 'GRADE' | 'NEXT_AFTER_WRONG', audioFile: File | null = null) => {
      // Mock Mode 허용
      if (resultId === null && content.topicTitle !== "Casual_Emotions (Practice)") { 
          console.error('Result ID is missing.'); return; 
      }
      
      const numericSessionId = Number(sessionIdParam);

      // 🔥 [수정 2] Next 버튼 누를 땐 로딩 표시 없이 바로 넘어가게 함 (깜빡임 방지)
      if (action === 'GRADE') {
          setIsProcessing(true);
      }
      setMicOn(false);

      // ---------------------------------------------------------
      // 🧪 Mock Mode 시뮬레이션 (오답 학습 or 테스트용)
      // ---------------------------------------------------------
      if (resultId === 99999) {
          if (action === 'GRADE') {
              await new Promise(resolve => setTimeout(resolve, 800));
          }

          let isMockCorrect = false;
          
          if (action === 'GRADE') {
              isMockCorrect = Math.random() > 0.5; 
          }

          // 결과 저장
          if (isMockCorrect || action === 'NEXT_AFTER_WRONG') {
              resultsRef.current.push({
                  romnized: content.romanized, 
                  korean: content.korean,
                  translation: content.translation,
                  isCorrect: isMockCorrect
              });
          }

          // 🔥 오답이고 GRADE면 여기서 멈춤 (Try Again UI 표시)
          if (!isMockCorrect && action === 'GRADE') {
              setResultStatus('incorrect');
              setDisplayStatus('none');
              setIsProcessing(false);
              return; 
          }

          // 정답이거나 Next 버튼일 때만 다음으로 이동
          const isLastQuestion = currentWordIndex >= totalWords;
          
          if (isLastQuestion) {
                const endTime = Date.now();
                const duration = endTime - startTimeRef.current;
                
                // 정답 화면 보여주고 이동
                if (isMockCorrect) {
                    setResultStatus('correct');
                    setDisplayStatus('initial_feedback');
                    setTimeout(() => {
                        navigate('/mainpage/learn/complete', { 
                            state: { 
                                resultId: resultId,
                                sessionId: numericSessionId,
                                results: resultsRef.current,
                                topicName: content.topicTitle,
                                learningDuration: duration
                            } 
                        });
                    }, 1000);
                } else {
                    // Next 버튼으로 끝낸 경우 바로 이동
                    navigate('/mainpage/learn/complete', { 
                        state: { 
                            resultId: resultId,
                            sessionId: numericSessionId,
                            results: resultsRef.current,
                            topicName: content.topicTitle,
                            learningDuration: duration
                        } 
                    });
                }
          } else {
                // 다음 문제 이동
                if (isMockCorrect) {
                    setResultStatus('correct');
                    setDisplayStatus('initial_feedback');
                    setTimeout(() => {
                        setCurrentWordIndex((prev) => prev + 1);
                        setStatus('initial');
                        setResultStatus('none');
                    }, 1000);
                } else {
                    // Next 버튼: 딜레이 없이 바로 이동
                    setCurrentWordIndex((prev) => prev + 1);
                    setStatus('initial');
                    setResultStatus('none');
                }
          }
          
          setIsProcessing(false);
          return; 
      }

      // ---------------------------------------------------------
      // 🚀 Real Mode: 실제 API 호출
      // ---------------------------------------------------------
      const formData = new FormData();
      formData.append('action', action);
      formData.append('itemId', String(content.itemId));
      if (audioFile) formData.append('audioFile', audioFile);

      try {
        const response = await http.post<GradeResponse>(
          `/api/v1/learning/${numericSessionId}/grade`, 
          formData, 
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        const data = response.data.body;
        
        // 결과 저장
        if (data.correct || action === 'NEXT_AFTER_WRONG') {
            resultsRef.current.push({
                romnized: content.romanized, 
                korean: content.korean,
                translation: content.translation,
                isCorrect: data.correct
            });
        }

        // 🔥 오답이면 멈춤 (UI 갱신)
        if (!data.correct && action === 'GRADE') {
            setResultStatus('incorrect');
            setDisplayStatus('none'); // 메시지 숨김
            setIsProcessing(false);
            return; 
        }

        // 정답 시 UI 갱신
        if (data.correct) {
            setResultStatus('correct');
            setDisplayStatus('initial_feedback');
        }

        // 다음 진행 (완료)
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
                            learningDuration: duration
                        } 
                    });
                }
             }, data.correct ? 2000 : 0); // 정답이면 2초 대기 후 이동
             return;
        }

        // 다음 문제 진행
        if (data.next) {
            const nextContent = nextItemToContent(data.next, content.topicTitle);
            
            if(data.correct){
                // 정답: 2초 뒤 이동
                setTimeout(() => {
                    setContent(nextContent);
                    setCurrentWordIndex((prev) => prev + 1);
                    setStatus('initial');
                    setResultStatus('none');
                }, 2000); 
            } else {
                // 🔥 [수정 3] Next 버튼: 딜레이 없이 즉시 이동
                if(action === 'NEXT_AFTER_WRONG'){
                    setContent(nextContent);
                    setCurrentWordIndex((prev) => prev + 1);
                    setStatus('initial');
                    setResultStatus('none'); 
                }
            }
        }
      } catch (error) {
        console.error('Grading failed:', error);
        setResultStatus('incorrect'); 
      } finally {
        setIsProcessing(false);
      }
    }, [resultId, content, navigate, isRetryWrong, baseResultId, sessionIdParam, currentWordIndex, totalWords]);

  // ... (useEffect, handleAction 등 나머지 코드는 변경 없음) ...
  
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchLearningData();
  }, [fetchLearningData]);

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

  const handleMicUp = () => {
    if (!isMicActiveForRecording || !micOn || !mediaRecorderRef.current) return;
    mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], "recording.webm", { type: 'audio/webm' });
        startGrading('GRADE', audioFile);
        if (mediaRecorderRef.current?.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
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
      <Mascot image={getMascotImage()} text={bubbleText} />
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