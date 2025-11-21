import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import styles from './learnStart.module.css';
import soundButton from '../../../assets/soundButton.png';
import { http } from '../../../apis/http';
import Header from '@/components/layout/Header/Header';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';
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

// 🔥 [수정 1] API 명세서에 맞춰 imageUrl 추가
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

// 🔥 [수정 2] API에서 받은 실제 이미지 URL 사용
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
  
  const resultsRef = useRef<WordResult[]>([]);
  const hasFetched = useRef(false); 
  const startTimeRef = useRef<number>(0);

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
        navigate('/mainpage/learn/complete', { state: { message: 'No words to learn.' } });
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
      
      if (error.response?.data?.status?.statusCode === 'C001') {
         console.warn("⚠️ 이미 진행 중인 세션입니다. (Mock Data 사용)");
         
         const mockBody: LearningStartBody = {
             sessionId: numericSessionId,
             resultId: 99999,
             vocabIds: [1, 2, 3],
             totalVocabularyCount: 3,
             baseResultId: null,
             sessionTitle: "Casual_Emotions (Retry Mode)",
             firstVocabulary: {
                 vocabularyId: 101,
                 korean: "행복해요",
                 romanization: "Haengbok-haeyo",
                 english: "I am happy",
                 imageId: "https://placehold.co/200x200/orange/white?text=Happy"
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

  // 🔥 [수정 3] 채점 로직 URL 변경 (resultId -> sessionIdParam)
  const startGrading = useCallback(async (action: 'GRADE' | 'NEXT_AFTER_WRONG', audioFile: File | null = null) => {
      if (resultId === null) { console.error('Result ID is missing.'); return; }
      const numericSessionId = Number(sessionIdParam); // URL 파라미터를 숫자로 변환

      setIsProcessing(true);
      setMicOn(false);

      const formData = new FormData();
      formData.append('action', action);
      formData.append('itemId', String(content.itemId));
      if (audioFile) formData.append('audioFile', audioFile);

      try {
        // 🔥 API 명세에 따라 {sessionId}/grade 로 요청
        const response = await http.post<GradeResponse>(
          `/api/v1/learning/${numericSessionId}/grade`, 
          formData, 
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        const data = response.data.body;
        
        setResultStatus(data.correct ? 'correct' : 'incorrect');
        if (data.correct) setDisplayStatus('initial_feedback');
        else setDisplayStatus('none');

        if (action === 'GRADE') {
            resultsRef.current.push({
                romnized: content.romanized, 
                korean: content.korean,
                translation: content.translation,
                isCorrect: data.correct
            });
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
                            learningDuration: duration
                        } 
                    });
                }
             }, data.correct ? 2000 : 0); 
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
      } catch (error) {
        console.error('Grading failed:', error);
        setResultStatus('incorrect'); 
      } finally {
        setIsProcessing(false);
      }
    }, [resultId, content, navigate, isRetryWrong, baseResultId, sessionIdParam]); // sessionIdParam 의존성 추가

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
  const handleMicDown = (e: React.MouseEvent | React.TouchEvent) => { e.preventDefault(); if (isMicActiveForRecording) { setMicOn(true); } };
  const handleMicUp = () => { if (isMicActiveForRecording && micOn) { setMicOn(false); } };
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