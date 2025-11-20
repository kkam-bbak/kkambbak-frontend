import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import styles from './learnWrong.module.css';
import Header from '@/components/layout/Header/Header';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';

// LearnStart에서 가져온 타입 정의 (실제 프로젝트에서는 별도 파일에서 import 필요)
type LearningStatus = 'initial' | 'listen' | 'countdown' | 'speak';
type ResultStatus = 'none' | 'processing' | 'correct' | 'incorrect';
type ResultDisplayStatus = 'none' | 'initial_feedback' | 'meaning_revealed';

interface WordResult {
  romnized: string;
  korean: string;
  translation: string;
  isCorrect: boolean;
}

interface LearningContent {
  topicTitle: string;
  itemId: number;
  korean: string;
  romanized: string;
  translation: string;
  imageUrl: string;
}

// 초기 로딩 상태에서 사용할 빈 콘텐츠
const emptyContent: LearningContent = {
  topicTitle: 'Loading...',
  itemId: 0,
  korean: '',
  romanized: '',
  translation: '',
  imageUrl: 'https://placehold.co/100x100/CCCCCC/000000?text=Wait',
};


const LearnWrong: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { topicName } = useParams<{ topicName: string }>(); // topicName이 URL에 있어야 합니다.

  // 1. 라우터 State에서 틀린 단어 목록을 가져옵니다.
  const state = location.state as { wordsToRetry?: WordResult[] };
  const initialWordsToRetry = state?.wordsToRetry || [];

  // 2. 학습 상태 정의
  // 학습 중 isCorrect가 변경될 수 있으므로, 상태로 관리합니다.
  const [learningWords, setLearningWords] = useState<WordResult[]>(initialWordsToRetry);
  const [currentWordIndex, setCurrentWordIndex] = useState(1);
  const [resultStatus, setResultStatus] = useState<ResultStatus>('none'); // 'none'으로 초기화
  const [displayStatus, setDisplayStatus] = useState<ResultDisplayStatus>('none');
  const [micOn, setMicOn] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<LearningStatus>('initial');
  const [countdownTime, setCountdownTime] = useState(0);

  const totalWords = learningWords.length;
  const countdownRef = useRef<number | null>(null);

  // 현재 단어 정보를 WordResult에서 LearningContent로 매핑
  const currentWord = learningWords[currentWordIndex - 1];
  const content: LearningContent = currentWord
    ? {
        topicTitle: topicName || 'Retry Session',
        itemId: currentWordIndex, // WordResult의 인덱스를 ID로 임시 사용
        korean: currentWord.korean,
        romanized: currentWord.romnized,
        translation: currentWord.translation,
        // 이미지는 URL을 직접 사용한다고 가정
        imageUrl: `https://placehold.co/100x100/4CAF50/FFFFFF?text=${currentWord.translation}`, 
      }
    : emptyContent;


  // LearnStart 로직과 동일하게 상태를 정의
  const isWordVisible = status !== 'initial';
  const isSpeakerActive = status !== 'initial';
  const isInputTextHiddenDuringChallenge =
    (status === 'countdown' || status === 'speak') && resultStatus === 'none';
  const isInputTextVisible = !isInputTextHiddenDuringChallenge;

  // 오답 보기 모드는 resultStatus === 'incorrect'일 때만 활성화됩니다.
  const isIncorrectView = resultStatus === 'incorrect'; 
  
  const isRomnizedVisible = isIncorrectView ? true : isInputTextVisible; // 정답 보기 모드에서 항상 표시
  const isKoreanVisible = isIncorrectView ? true : isInputTextVisible;
  const isTranslationVisible = isIncorrectView || displayStatus === 'meaning_revealed';
  const isMicActiveForRecording =
    (status === 'countdown' || status === 'speak') &&
    resultStatus === 'none' &&
    !isProcessing;


  // 🔥 Web Speech Synthesis 함수 (LearnStart와 동일) 🔥
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
  // 🔥 학습 완료 핸들러 (Review 페이지로 결과 전달) 🔥
  // --------------------------------------------------
  const handleLearningComplete = useCallback(() => {
    // 재학습 완료된 최종 단어 목록 (isCorrect 상태가 업데이트된 배열)을 Review 페이지로 전달
    navigate(`/mainPage/review/${topicName}`, {
      state: { updatedWordResults: learningWords },
    });
  }, [navigate, topicName, learningWords]);


  // --------------------------------------------------
  // 🔥 마이크 업/채점 모의 로직 (API 채점 대체) 🔥
  // --------------------------------------------------
  // 재학습에서는 API 호출 없이, 성공/실패를 모의하여 상태를 업데이트합니다.
  const mockGrading = useCallback((succeed: boolean) => {
    setIsProcessing(true);
    setMicOn(false);

    // 1. 결과 상태 업데이트
    const newResultStatus = succeed ? 'correct' : 'incorrect';
    setResultStatus(newResultStatus);

    // 2. WordResult 목록의 isCorrect 업데이트 (성공 시)
    if (succeed) {
      setLearningWords(prevWords => 
        prevWords.map((word, index) => 
          index + 1 === currentWordIndex 
            ? { ...word, isCorrect: true } 
            : word
        )
      );
      setDisplayStatus('initial_feedback');

      // 3. 정답 시 자동 다음 단어로 이동 모의
      setTimeout(() => {
        if (currentWordIndex < totalWords) {
          setCurrentWordIndex(prev => prev + 1);
          setStatus('initial');
        } else {
          // 마지막 단어였으면 완료
          handleLearningComplete();
        }
      }, 2000); // 2초 후 자동 이동

    } else {
      // 오답 시 오답 보기 모드 진입
      setDisplayStatus('none');
    }

    setIsProcessing(false);
  }, [currentWordIndex, totalWords, handleLearningComplete]);


  // --------------------------------------------------
  // 🔥 액션 버튼 핸들러 (Try Again, Next) 🔥
  // --------------------------------------------------
  const handleAction = useCallback((action: 'tryAgain' | 'next') => {
    if (action === 'tryAgain') {
      // 재시도 시 상태 초기화
      setStatus('initial');
      setResultStatus('none');
      setDisplayStatus('none');
    } else if (action === 'next') {
      if (currentWordIndex < totalWords) {
        // 다음 단어로 이동
        setCurrentWordIndex(prev => prev + 1);
        setStatus('initial');
      } else {
        // 학습 완료
        handleLearningComplete();
      }
    }
  }, [currentWordIndex, totalWords, handleLearningComplete]);


  // --------------------------------------------------
  // 🔥 0. 초기 로드 및 유효성 검사 🔥
  // --------------------------------------------------
  useEffect(() => {
    if (totalWords === 0) {
      alert('There are no incorrect words to review! Navigating back.');
      navigate(-1); // 이전 페이지로 돌아감
    }
  }, [totalWords, navigate]);


  // --------------------------------------------------
  // 🔥 1. 학습 흐름 제어 useEffect (LearnStart와 동일) 🔥
  // --------------------------------------------------
  useEffect(() => {
    let timer: number | undefined;

    if (totalWords === 0 || isProcessing) return;

    // A. Initial -> Listen
    if (status === 'initial') {
      setResultStatus('none');
      setDisplayStatus('none');

      const initialTimer = setTimeout(() => {
        setStatus('listen');
      }, 2000);
      return () => clearTimeout(initialTimer);
    }

    // B. Listen -> Countdown
    if (status === 'listen') {
      speakKoreanText(content.korean);

      timer = setTimeout(() => {
        setStatus('countdown');
        setCountdownTime(0);
      }, 3000);
    }

    // C. Countdown -> Speak (자동 채점 모의)
    if (status === 'countdown') {
      if (countdownRef.current !== null) clearInterval(countdownRef.current);

      countdownRef.current = setInterval(() => {
        setCountdownTime((prevTime) => {
          const newTime = prevTime + 0.1;

          if (newTime >= 10) {
            if (countdownRef.current !== null) clearInterval(countdownRef.current);
            setStatus('speak');
            // ⚠️ 자동 채점 모의 시작 (API 호출 대신)
            // 임시로 자동 오답 처리 (시간 초과)
            mockGrading(false); 
            return 10;
          }
          return newTime;
        });
      }, 100) as unknown as number;
    }

    // D. 정답 후 의미 공개 로직
    if (resultStatus === 'correct' && displayStatus === 'initial_feedback') {
      timer = setTimeout(() => {
        setDisplayStatus('meaning_revealed');
      }, 1000);
    }


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
    totalWords,
    isProcessing,
    mockGrading
  ]);
  
  // --------------------------------------------------
  // 🔥 2. 이벤트 핸들러 (LearnStart와 유사하게 동작) 🔥
  // --------------------------------------------------
  const handleMicDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (isMicActiveForRecording && !isProcessing) { setMicOn(true); }
  };

  const handleMicUp = () => {
    if (isMicActiveForRecording && micOn && !isProcessing) {
      setMicOn(false);
      setIsProcessing(true); 
      
      // ⚠️ 임의의 성공/실패 로직 (예: 50% 확률로 성공)
      const isSuccessful = Math.random() < 0.5;
      
      setTimeout(() => {
        mockGrading(isSuccessful);
        setIsProcessing(false);
      }, 1000); // 1초 처리 시간 모의
    }
  };

  const handleSpeakerClick = () => {
    if (isSpeakerActive) { speakKoreanText(content.korean); }
  };


  // --------------------------------------------------
  // 🔥 3. UI 렌더링 값 (LearnStart와 동일) 🔥
  // --------------------------------------------------
  const bubbleText = (() => {
    if (isProcessing) return 'Checking your pronunciation...';
    if (resultStatus === 'correct') {
      if (displayStatus === 'initial_feedback') return 'Excellent! You got it right.';
      if (displayStatus === 'meaning_revealed')
        return `${
          content.romanized
        } means ${content.translation.toLowerCase()}.`;
      return 'Great job!';
    }
    if (resultStatus === 'incorrect') return 'That wasn\'t quite right. Review and try again.';
    if (status === 'initial') return 'Starting review...';
    if (status === 'countdown' || status === 'speak')
      return 'What was the word? Speak now!';
    return 'Listen carefully to the word.';
  })();

  const getMascotImage = (): MascotImage => {
    if (isProcessing) return 'basic'; // 처리 중
    if (resultStatus === 'none' || status === 'initial' || status === 'listen' || status === 'countdown') {
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
    if (!currentWord) return null; // 로딩 중이거나 단어가 없으면 null

    return (
      <div className={styles.wordImagePlaceholder}>
        <img src={content.imageUrl} alt="Word visual" className={styles.wordImage} />
        {resultStatus === 'correct' && (
          <div className={styles.resultRingCorrect} />
        )}
        {resultStatus === 'incorrect' && (
          <div className={styles.resultCrossIncorrect} />
        )}
      </div>
    );
  };


  if (totalWords === 0) {
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
          <span className={styles.wordCount}>{`${currentWordIndex
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
              // isRomnizedVisible은 오답/정답일 때 true
              value={isRomnizedVisible ? content.romanized : ''} 
              readOnly
            />
            <button
              className={styles.speakerIcon}
              onClick={handleSpeakerClick}
              disabled={!isSpeakerActive || isProcessing}
            >
              <div className={styles.speakerPlaceholder}>🔊</div>
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
            >
              {currentWordIndex === totalWords ? 'Finish Review' : 'Next Word'}
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
            {isProcessing ? 'PROCESSING' : micOn ? 'ON' : 'TALK'}
          </button>
        )}
      </div>
    </div>
  );
};

export default LearnWrong;