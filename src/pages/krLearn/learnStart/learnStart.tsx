import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import styles from './learnStart.module.css';
import { http } from '../../../apis/http';
import Header from '@/components/layout/Header/Header';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';
import ContentSection from '@/components/layout/ContentSection/ContentSection';

// API 응답의 공통 구조를 정의하는 제네릭 인터페이스
interface ApiResponseBody<T> {
  status: {
    statusCode: string;
    message: string;
    description: string | null;
  };
  body: T; // 실제 비즈니스 데이터는 'body' 속성에 포함됨
}

// API 응답의 firstVocabulary에 맞는 인터페이스 정의
interface FirstVocabulary {
  vocabularyId: number;
  korean: string;
  romanization: string;
  english: string;
  imageId: string; // 이미지 ID 또는 URL (여기서는 URL로 처리)
}

// 학습 시작 API의 'body' 내부 데이터 인터페이스
interface LearningStartData {
  sessionId: string;
  resultId: number;
  baseResultId: number | null;
  vocabularies: number[]; // 전체 단어 ID 목록 (사용하지 않음)
  totalVocabularyCount: number; // 총 단어 수
  firstVocabulary: FirstVocabulary | null; // 첫 번째 단어 정보
  sessionTitle: string;
}

// 최종 학습 시작 API 응답 타입
type LearningStartResponse = ApiResponseBody<LearningStartData>;


// API 응답의 next 객체에 맞는 인터페이스 정의 (채점 API 응답의 next 필드)
interface NextItem {
  itemId: number;
  korean: string;
  romanization: string;
  english: string;
}

// API 채점 API의 'body' 내부 데이터 인터페이스
interface GradeData {
  correct: boolean;
  moved: boolean;
  finished: boolean;
  next: NextItem | null;
  correctAnswer: string | null;
}

// 최종 채점 API 응답 타입
type GradeResponse = ApiResponseBody<GradeData>;


// 학습 데이터 타입을 정의합니다. (UI에서 사용할 구조)
interface LearningContent {
  topicTitle: string; // 세션 제목 (API의 sessionTitle)
  itemId: number; // API 호출을 위한 현재 단어의 ID
  korean: string;
  romanized: string;
  translation: string;
  imageUrl: string;
}

// src/types.ts (새 파일 생성 예시)

interface WordResult {
  romnized: string;
  korean: string;
  translation: string;
  isCorrect: boolean;
  // learnStart에서 필요한 다른 속성이 있다면 여기에 추가
}

type LearningStatus = 'initial' | 'listen' | 'countdown' | 'speak';
type ResultStatus = 'none' | 'processing' | 'correct' | 'incorrect';
type ResultDisplayStatus = 'none' | 'initial_feedback' | 'meaning_revealed';

// 초기 로딩 상태에서 사용할 빈 콘텐츠
const emptyContent: LearningContent = {
  topicTitle: 'Loading...',
  itemId: 0,
  korean: '',
  romanized: '',
  translation: '',
  imageUrl: 'https://placehold.co/100x100/CCCCCC/000000?text=Wait',
};


// API의 firstVocabulary 데이터를 LearningContent로 변환하는 헬퍼 함수
const firstVocabToContent = (vocab: FirstVocabulary, title: string): LearningContent => ({
  topicTitle: title,
  itemId: vocab.vocabularyId,
  korean: vocab.korean,
  romanized: vocab.romanization,
  translation: vocab.english,
  // API 응답의 imageId를 이미지 URL로 직접 사용한다고 가정
  imageUrl: vocab.imageId, 
});

// API의 next 데이터를 LearningContent로 변환하는 헬퍼 함수
const nextItemToContent = (item: NextItem, topicTitle: string): LearningContent => ({
  topicTitle,
  itemId: item.itemId,
  korean: item.korean,
  romanized: item.romanization,
  translation: item.english,
  // 다음 단어는 이미지 정보가 없으므로 임시로 한글 텍스트를 사용
  imageUrl: 'https://placehold.co/100x100/E64A19/FFFFFF?text=' + item.korean,
});

const LearnStart: React.FC = () => {
  const { topicId: sessionId } = useParams<{ topicId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { topicName } = useParams<{ topicName: string }>();

  

  // 1. 라우터 state에서 전달받은 단어 목록을 확인
  const state = location.state as { wordsToRetry?: WordResult[], isRetryWrong?: boolean };
  const wordsToRetry = state?.wordsToRetry;
  const isRetryWrong = state?.isRetryWrong || false;

  // 2. 학습할 단어 목록 결정
  // 만약 wordsToRetry가 있으면 그 목록을 사용하고, 없으면 기존 로직(전체 단어 API 호출 등)을 따릅니다.
  // const wordsToLearn = wordsToRetry ? wordsToRetry : fetchedAllWords;

  // API 호출 관련 상태
  const [content, setContent] = useState<LearningContent>(emptyContent);
  const [currentWordIndex, setCurrentWordIndex] = useState(1);
  const [totalWords, setTotalWords] = useState(0); // 총 단어수 상태 추가
  const [resultId, setResultId] = useState<number | null>(null); // 채점 API에 필요한 resultId
  const [isLoading, setIsLoading] = useState(true); // 로딩 상태 추가

  // UI 상태 관리
  const [status, setStatus] = useState<LearningStatus>('initial');
  const [resultStatus, setResultStatus] = useState<ResultStatus>('none');
  const [displayStatus, setDisplayStatus] =
    useState<ResultDisplayStatus>('none');
  const [micOn, setMicOn] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdownTime, setCountdownTime] = useState(0);

  // ... (표시 상태 관련 변수들은 이전과 동일)
  const isWordVisible = status !== 'initial';
  const isSpeakerActive = status !== 'initial';
  const isInputTextHiddenDuringChallenge =
    (status === 'countdown' || status === 'speak') && resultStatus === 'none';
  const isInputTextVisible = !isInputTextHiddenDuringChallenge;
  const isRomnizedVisible = isInputTextVisible;
  const isKoreanVisible = isInputTextVisible;
  const isTranslationVisible = isInputTextVisible;
  const isIncorrectView = resultStatus === 'incorrect';
  const isMicActiveForRecording =
    (status === 'countdown' || status === 'speak') &&
    resultStatus === 'none' &&
    !isProcessing;

  const countdownRef = useRef<number | null>(null);

  // 🔥🔥🔥 Web Speech Synthesis 함수 🔥🔥🔥
  const speakKoreanText = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      console.error('Web Speech API is not supported by this browser.');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  // --------------------------------------------------
  // 🔥 API 호출: 학습 시작 데이터 로드 함수 (수정 적용) 🔥
  // --------------------------------------------------
  const fetchLearningData = useCallback(async () => {
    if (!sessionId) {
      console.error('Session ID is missing.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    try {
      // 1. ApiResponseBody<LearningStartData> 타입으로 HTTP 호출
      const response = await http.post<LearningStartResponse>(
        `/api/v1/learning/sessions/${sessionId}/start`,
        { mode: 'ALL' }, 
      );
      
      // 2. response.data.body에서 실제 데이터 추출
      const data = response.data.body;

      if (data.firstVocabulary) {
        // 첫 단어 정보 및 세션 정보로 상태 업데이트
        setContent(firstVocabToContent(data.firstVocabulary, data.sessionTitle));
        setTotalWords(data.totalVocabularyCount);
        setResultId(data.resultId);
        setCurrentWordIndex(1);
        setStatus('initial'); // 로드 완료 후 initial 상태로 진입
      } else {
         // 단어 목록이 비어있는 경우
        console.warn('No vocabulary found for this session.');
        navigate('/mainpage/learn/complete', { state: { message: 'No words to learn.' } });
      }

    } catch (error) {
      console.error('Failed to start learning session:', error);
      // 에러 발생 시 완료 페이지 또는 이전 페이지로 이동
      navigate('/mainpage/learn/complete', { state: { message: 'Failed to load session data.' } });
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, navigate]);

  // --------------------------------------------------
  // 🔥 API 호출: 채점 로직 함수 (수정: GradeResponse 타입 적용) 🔥
  // --------------------------------------------------
  const startGrading = useCallback(
    async (
      action: 'GRADE' | 'NEXT_AFTER_WRONG',
      audioFile: File | null = null,
    ) => {
      if (!sessionId || resultId === null) {
        console.error('Session ID or Result ID is missing for grading.');
        return;
      }
      setIsProcessing(true);
      setMicOn(false);

      const formData = new FormData();
      formData.append('action', action);
      formData.append('itemId', String(content.itemId));
      if (audioFile) {
        formData.append('audioFile', audioFile);
      }

      try {
        // 1. ApiResponseBody<GradeData> 타입으로 HTTP 호출
        const response = await http.post<GradeResponse>(`/api/v1/learning/${sessionId}/grade`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        // 2. response.data.body에서 실제 데이터 추출
        const data = response.data.body;

        // 1. 결과 상태 업데이트
        setResultStatus(data.correct ? 'correct' : 'incorrect');

        if (data.correct) {
          setDisplayStatus('initial_feedback');
        } else {
          setDisplayStatus('none');
        }
        
        // 2. 다음 단어 정보 처리 (핵심 로직)
        if (data.finished) {
            // 세션 완료 처리
             setTimeout(() => {
                navigate('/mainpage/learn/complete');
             }, data.correct ? 2000 : 0); // 정답 시 잠깐 딜레이
             return;
        }

        if (data.next) {
            // 다음 단어로 이동
            const nextContent = nextItemToContent(data.next, content.topicTitle);
            
            // 정답 후 자동 이동 (useEffect에서 처리)
            if(data.correct){
                setTimeout(() => {
                    setContent(nextContent);
                    setCurrentWordIndex((prev) => prev + 1);
                    setStatus('initial');
                }, 2000); 
            } else {
                // 오답 후 'Next' 액션을 눌렀다면 바로 업데이트
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
    },
    [sessionId, resultId, content, navigate],
  );

  // --------------------------------------------------
  // 🔥 0. 초기 데이터 로드 (컴포넌트 마운트 시) 🔥
  // --------------------------------------------------
  useEffect(() => {
    fetchLearningData();
  }, [fetchLearningData]);


  // --------------------------------------------------
  // 1. 학습 흐름 제어 useEffect 
  // --------------------------------------------------
  useEffect(() => {
    let timer: number | undefined;

    // 로딩 중이거나 단어 수가 0이면 흐름 정지
    if (isLoading || totalWords === 0) return; 

    if (status === 'initial') {
      setResultStatus('none');
      setDisplayStatus('none');

      const initialTimer = setTimeout(() => {
        setStatus('listen');
      }, 2000);
      return () => clearTimeout(initialTimer);
    }

    if (status === 'listen') {
      speakKoreanText(content.korean);

      timer = setTimeout(() => {
        setStatus('countdown');
        setCountdownTime(0);
      }, 3000);
    }

    if (status === 'countdown') {
      if (countdownRef.current !== null) clearInterval(countdownRef.current);

      countdownRef.current = setInterval(() => {
        setCountdownTime((prevTime) => {
          const newTime = prevTime + 0.1;

          if (newTime >= 10) {
            if (countdownRef.current !== null)
              clearInterval(countdownRef.current);
            setStatus('speak');
            // 자동 채점 시작
            startGrading('GRADE', null); 
            return 10;
          }
          return newTime;
        });
      }, 100) as unknown as number;
    }

    // A. 정답 로직 
    if (resultStatus === 'correct' && displayStatus === 'initial_feedback') {
      timer = setTimeout(() => {
        setDisplayStatus('meaning_revealed');
      }, 1000);
    }

    // B. 오답 로직 유지

    return () => {
      if (countdownRef.current !== null) clearInterval(countdownRef.current);
      if (timer) clearTimeout(timer);
      window.speechSynthesis.cancel();
    };
  }, [
    status,
    resultStatus,
    displayStatus,
    content.korean,
    isLoading,
    totalWords,
    startGrading,
  ]);
  
  // --------------------------------------------------
  // 2. 이벤트 핸들러
  // --------------------------------------------------

  // 학습 완료 처리 핸들러 (예: 모든 단어 학습 후)
const handleLearningComplete = (finalResults: WordResult[]) => {
  // 3. 재학습이 맞다면, 최종 결과를 Review 페이지로 전달
  if (isRetryWrong) {
    navigate(`/mainPage/review/${topicName}`, {
      state: { updatedWordResults: finalResults }, // 최종 결과 목록을 state로 전달
    });
  } else {
    // 전체 학습 완료 시의 기존 로직 (API 전송 등)
    // navigate(`/mainPage/review/${summary.topicName}`);
  }
};
  const handleAction = async (action: 'tryAgain' | 'next') => {
    if (action === 'next') {
      // 오답 후 'Next' 버튼 클릭 시, ACTION: NEXT_AFTER_WRONG으로 API 호출
      await startGrading('NEXT_AFTER_WRONG', null);
    } else if (action === 'tryAgain') {
      // 재시도 시 상태만 초기화
      setStatus('initial');
      setResultStatus('none');
      setDisplayStatus('none');
    }
  };

  const handleMicDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (isMicActiveForRecording) { setMicOn(true); }
  };
  const handleMicUp = () => {
    if (isMicActiveForRecording && micOn) { setMicOn(false); }
  };
  const handleSpeakerClick = () => {
    if (isSpeakerActive) { speakKoreanText(content.korean); }
  };


  // --------------------------------------------------
  // 3. UI 렌더링 값 (로딩 상태 처리) 
  // --------------------------------------------------
  const bubbleText = (() => {
    if (isLoading) return 'Loading session data...';
    if (isProcessing) return 'Grading...';
    if (resultStatus === 'correct') {
      if (displayStatus === 'initial_feedback') return 'good job!';
      if (displayStatus === 'meaning_revealed')
        return `${
          content.romanized
        } means ${content.translation.toLowerCase()}.`;
      return 'good job!';
    }
    if (resultStatus === 'incorrect') return 'Should we try again?';
    if (status === 'initial') return 'Start!';
    if (status === 'countdown' || status === 'speak')
      return 'What was it? Tell me';
    return 'Listen carefully';
  })();

  const getMascotImage = (): MascotImage => {
    if (isLoading || isProcessing) return 'basic';
    if (resultStatus === 'none') {
      return 'smile';
    }
    if (resultStatus === 'incorrect') {
      return 'wrong';
    }
    if (resultStatus === 'correct') {
      return 'jump';
    }
    return 'basic';
  };
  
  const renderWordImage = () => {
    if (!isWordVisible) return null;
    return (
      <div className="word-image-placeholder">
        <img src={content.imageUrl} alt="Word visual" className="word-image" />
        {resultStatus === 'correct' && (
          <div className="result-ring correct-ring" />
        )}
        {resultStatus === 'incorrect' && (
          <div className="result-cross incorrect-cross" />
        )}
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
          <span className="word-count">{`${currentWordIndex
            .toString()
            .padStart(2, '0')}/${totalWords
            .toString()
            .padStart(2, '0')}`}</span>
        </div>

        <div className={styles.wordDisplayArea}>
          {status === 'countdown' && !isIncorrectView && (
            <div className={styles.countdownBarContainer}>
              <div
                className={styles.countdownBarFill}
                style={{ width: `${100 - (countdownTime / 10) * 100}%` }}
              ></div>
            </div>
          )}
          {renderWordImage()}
        </div>

        <div className={styles.inputFieldsContainer}>
          <div className={styles.inputRow}>
            <label>Romnized</label>
            <input
              type="text"
              value={isRomnizedVisible ? content.romanized : ''}
              readOnly
            />
            <button
              className={`${styles.speakerIcon}`}
              onClick={handleSpeakerClick}
              disabled={!isSpeakerActive}
            >
              <div className="speaker-placeholder">🔊</div>
            </button>
          </div>

          <div className={styles.inputRow}>
            <label>Korean</label>
            <input
              type="text"
              value={isKoreanVisible ? content.korean : ''}
              readOnly
            />
          </div>

          <div className={`${styles.inputRow} ${styles.translation}`}>
            <label>Translation</label>
            <input
              type="text"
              value={isTranslationVisible ? content.translation : ''}
              readOnly
            />
          </div>
        </div>

        {isIncorrectView ? (
          <div className={styles.actionButtonsContainer}>
            <button
              className={styles.actionButton}
              onClick={() => handleAction('tryAgain')}
            >
              Try Again
            </button>
            <button
              className={styles.actionButton}
              onClick={() => handleAction('next')} 
              // 총 단어 수와 현재 인덱스를 비교하여 마지막 단어일 경우 비활성화할 수도 있습니다.
            >
              Next
            </button>
          </div>
        ) : (
          <button
            className={`${styles.micButton} ${micOn ? styles.on : styles.off} ${
              !isMicActiveForRecording || isProcessing ? styles.disabled: ''
            }`}
            onMouseDown={handleMicDown}
            onMouseUp={handleMicUp}
            onTouchStart={handleMicDown}
            onTouchEnd={handleMicUp}
            disabled={
              resultStatus === 'correct' || !isMicActiveForRecording || isProcessing
            }
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