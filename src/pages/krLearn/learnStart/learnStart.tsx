import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Character1 from '../../../assets/Character1.png';
import CharacterSmile from '../../../assets/Character-Smile.png';
import CharacterJump from '../../../assets/Character-Jump.png';
import CharacterWrong from '../../../assets/Character-Wrong.png';
import './learnStart.css';

// 학습 데이터 타입을 정의합니다.
interface LearningContent {
  topicTitle: string;
  korean: string;
  romanized: string;
  translation: string;
  imageUrl: string;
}

type LearningStatus = 'initial' | 'listen' | 'countdown' | 'speak';
type ResultStatus = 'none' | 'processing' | 'correct' | 'incorrect';
// 🔥 새로운 상태: 정답 후 말풍선 단계 제어
type ResultDisplayStatus = 'none' | 'initial_feedback' | 'meaning_revealed';

const dummyWord: LearningContent = {
  topicTitle: 'Casual_Emotions',
  // SpeechSynthesis는 띄어쓰기가 없어도 잘 작동하지만, 자연스러운 발음을 위해 띄어쓰기를 유지할 수 있습니다.
  korean: '사과',
  romanized: 'sa - gwa',
  translation: 'Apple',
  imageUrl: 'https://placehold.co/100x100/E64A19/FFFFFF?text=🍎',
};

const LearnStart: React.FC = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();

  // UI 상태 관리
  const [status, setStatus] = useState<LearningStatus>('initial');
  const [resultStatus, setResultStatus] = useState<ResultStatus>('none');
  const [displayStatus, setDisplayStatus] =
    useState<ResultDisplayStatus>('none');
  const [micOn, setMicOn] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [content, setContent] = useState<LearningContent>(dummyWord);
  const [currentWordIndex, setCurrentWordIndex] = useState(1);
  const totalWords = 2; //총 단어수 예시
  const [countdownTime, setCountdownTime] = useState(0);

  // 표시 상태
  const isWordVisible = status !== 'initial';
  const isSpeakerActive = status !== 'initial';

  // 결과가 확정되지 않은 도전 중 (What was it? 말풍선 활성화 시점)
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
  const speakKoreanText = (text: string) => {
    if (!('speechSynthesis' in window)) {
      console.error('Web Speech API is not supported by this browser.');
      alert('이 브라우저는 음성 합성 기능을 지원하지 않습니다.');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    // 한국어 음성 설정 시도
    // (브라우저에 따라 'ko-KR' 음성이 없을 수 있음)
    utterance.lang = 'ko-KR';

    // 현재 사용 가능한 음성 목록을 찾아서 한국어 음성을 명시적으로 지정할 수도 있습니다.
    // const voices = window.speechSynthesis.getVoices();
    // const koreanVoice = voices.find(voice => voice.lang === 'ko-KR');
    // if (koreanVoice) {
    //     utterance.voice = koreanVoice;
    // }

    window.speechSynthesis.speak(utterance);
  };

  // 🔥🔥🔥 자동 채점 로직 함수 🔥🔥🔥
  const startGrading = () => {
    setIsProcessing(true);
    setMicOn(false);

    setTimeout(() => {
      setIsProcessing(false);

      // 오답설정
      const isCorrect = true;

      setResultStatus(isCorrect ? 'correct' : 'incorrect');
      setDisplayStatus('initial_feedback');
    }, 1500); // 채점 처리 시간
  };

  // --------------------------------------------------
  // 🔥 1. 학습 흐름 제어 useEffect (자동 재생 TTS 로직 수정) 🔥
  // --------------------------------------------------
  useEffect(() => {
    let timer: number | undefined;
    // 이전의 Gemini TTS 호출을 취소합니다. (SpeechSynthesis는 취소할 필요가 적습니다.)

    if (status === 'initial') {
      setResultStatus('none');
      setDisplayStatus('none'); // 상태 초기화

      const initialTimer = setTimeout(() => {
        setStatus('listen');
      }, 2000);
      return () => clearTimeout(initialTimer);
    }

    if (status === 'listen') {
      // 듣기 상태 진입 시, 단어를 자동으로 한 번 재생 (SpeechSynthesis)
      speakKoreanText(content.korean); // 🔥 Web Speech API 사용

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
            startGrading();
            return 10;
          }
          return newTime;
        });
      }, 100) as unknown as number;
    }

    // A. 정답 로직 유지
    if (resultStatus === 'correct' && displayStatus === 'initial_feedback') {
      timer = setTimeout(() => {
        setDisplayStatus('meaning_revealed');
      }, 1000);
    }

    if (resultStatus === 'correct' && displayStatus === 'meaning_revealed') {
      const isLastWord = currentWordIndex === totalWords;
      timer = setTimeout(() => {
        if (isLastWord) {
          navigate('/mainpage/learn/complete');
        } else {
          setCurrentWordIndex((prev) => prev + 1);
          setStatus('initial');
        }
      }, 2000);
    }

    // B. 오답 로직 유지

    return () => {
      if (countdownRef.current !== null) clearInterval(countdownRef.current);
      if (timer) clearTimeout(timer);
      // 언마운트 시 SpeechSynthesis 중지 (선택 사항)
      window.speechSynthesis.cancel();
    };
  }, [
    status,
    resultStatus,
    displayStatus,
    currentWordIndex,
    totalWords,
    navigate,
    content.korean,
  ]);

  // --------------------------------------------------
  // 🔥 2. 이벤트 핸들러 (handleSpeakerClick 수정) 🔥
  // --------------------------------------------------

  const handleAction = (action: 'tryAgain' | 'next') => {
    if (action === 'next') {
      const isLastWord = currentWordIndex === totalWords;
      if (isLastWord) {
        navigate('/mainpage/learn/complete');
        return;
      }
      setCurrentWordIndex((prev) => prev + 1);
    }
    setStatus('initial');
    setResultStatus('none');
    setDisplayStatus('none');
  };

  const handleMicDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (isMicActiveForRecording) {
      setMicOn(true);
    }
  };

  const handleMicUp = () => {
    if (isMicActiveForRecording && micOn) {
      setMicOn(false);
    }
  };

  const handleLogout = () => navigate('/auth/login');

  // 🔥🔥🔥 Speaker 클릭 핸들러 수정: Web Speech API 호출 🔥🔥🔥
  const handleSpeakerClick = () => {
    if (isSpeakerActive) {
      // 현재 재생 중인 음성이 있다면 취소하고 다시 시작
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      speakKoreanText(content.korean);
    }
  };

  // --------------------------------------------------
  // 🔥 3. UI 렌더링 값 (로딩 상태 제거) 🔥
  // --------------------------------------------------

  const bubbleText = (() => {
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

  const getCharacterImage = () => {
    if (resultStatus === 'none') {
      return CharacterSmile;
    }
    if (resultStatus === 'incorrect') {
      return CharacterWrong;
    }
    if (resultStatus === 'correct') {
      return CharacterJump;
    }
    return Character1;
  };

  const characterImageClass =
    resultStatus === 'incorrect'
      ? 'character-image incorrect-char'
      : 'character-image default-char';

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

  return (
    <div className="learn-start-container app-container">
      <div className="header-section">
        <button className="logout" onClick={handleLogout}>
          Logout
        </button>
        <div className="character-section">
          <div className="speech-bubble start-bubble">{bubbleText}</div>
          <div className="speech-tail start-tail"></div>
          <div className={characterImageClass}>
            <img
              src={getCharacterImage()}
              alt="Character"
              className="character-icon"
            />
          </div>
        </div>
      </div>

      <div className="learning-card">
        <div className="card-title-bar">
          <span className="topic-name">{content.topicTitle}</span>
          <span className="word-count">{`${currentWordIndex
            .toString()
            .padStart(2, '0')}/${totalWords
            .toString()
            .padStart(2, '0')}`}</span>
        </div>

        <div className="word-display-area">
          {status === 'countdown' && !isIncorrectView && (
            <div className="countdown-bar-container">
              <div
                className="countdown-bar-fill"
                style={{ width: `${100 - (countdownTime / 10) * 100}%` }}
              ></div>
            </div>
          )}
          {renderWordImage()}
        </div>

        <div className="input-fields-container">
          <div className="input-row">
            <label>Romnized</label>
            <input
              type="text"
              value={isRomnizedVisible ? content.romanized : ''}
              readOnly
            />
            <button
              className={`speaker-icon`}
              onClick={handleSpeakerClick}
              disabled={!isSpeakerActive}
            >
              <div className="speaker-placeholder">🔊</div>
            </button>
          </div>

          <div className="input-row">
            <label>Korean</label>
            <input
              type="text"
              value={isKoreanVisible ? content.korean : ''}
              readOnly
            />
          </div>

          <div className="input-row translation">
            <label>Translation</label>
            <input
              type="text"
              value={isTranslationVisible ? content.translation : ''}
              readOnly
            />
          </div>
        </div>

        {isIncorrectView ? (
          <div className="action-buttons-container">
            <button
              className="action-button try-again"
              onClick={() => handleAction('tryAgain')}
            >
              Try Again
            </button>
            <button
              className="action-button next"
              onClick={() => handleAction('next')}
            >
              Next
            </button>
          </div>
        ) : (
          <button
            className={`mic-button ${micOn ? 'on' : 'off'} ${
              !isMicActiveForRecording ? 'disabled' : ''
            }`}
            onMouseDown={handleMicDown}
            onMouseUp={handleMicUp}
            onTouchStart={handleMicDown}
            onTouchEnd={handleMicUp}
            disabled={
              resultStatus === 'correct' ? true : !isMicActiveForRecording
            }
          >
            <span className="mic-icon">🎤</span>
            {micOn ? 'ON' : 'OFF'}
          </button>
        )}
      </div>
    </div>
  );
};

export default LearnStart;
