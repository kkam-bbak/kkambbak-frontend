import React, { useState, useEffect, useRef, useCallback } from 'react';
import './rolePlay.css';
import Header from '@/components/layout/Header/Header';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';

// --- 상수 및 데이터 정의 ---

const ROLE_PLAY_DATA = {
  korean: '주문 하시겠어요?',
  romanized: 'Ju-mun ha-si-gess-eo-yo?',
  english: 'Would you like to order?',
  role: 'Staff',
  currentStep: '01/02',
};

// 단계별 상태 정의
const STEPS = {
  START: 'START', // 시작 애니메이션 (하단 창 슬라이드 인)
  LISTEN: 'LISTEN', // 듣기 단계
  SPEAK_SETUP: 'SPEAK_SETUP', // 말하기 준비
  RECORDING: 'RECORDING', // 녹음 중
  GRADING: 'GRADING', // 채점 중
  DONE: 'DONE', // 다음 단계로 전환
};

// 상태별 말풍선 텍스트
const BUBBLE_TEXT = {
  [STEPS.START]: "Okay, Let's go!",
  [STEPS.LISTEN]: 'Listen carefully.',
  [STEPS.SPEAK_SETUP]: 'Speak!',
  [STEPS.RECORDING]: 'Speak!',
  CORRECT: 'good job!',
  INCORRECT: "It's a waste.",
  OOS: "That's out of our Learning Scope\ntry to focus on your Study",
};

// Mock Navigate Hook (라우팅 시뮬레이션)
const useNavigate = () => (path) => console.log(`Navigating to: ${path}`);

// 🧪 상태에 따른 캐릭터 이미지 결정 함수
const getMascotImage = (step, gradingResult): MascotImage => {
  if (step === STEPS.START) return 'smile';
  if (step === STEPS.GRADING) {
    if (gradingResult === 'CORRECT') return 'jump';
    if (gradingResult === 'INCORRECT') return 'gloomy';
    if (gradingResult === 'OOS') return 'wrong';
  }
  return 'basic'; // LISTEN, SPEAK_SETUP, RECORDING
};

// --- 핵심 컴포넌트 ---

// 🎤 메인 역할극 학습 컴포넌트
const RolePlay = () => {
  const navigate = useNavigate();

  // 🎨 상태 관리
  const [step, setStep] = useState(STEPS.START);
  const [isRecording, setIsRecording] = useState(false);
  const [gradingResult, setGradingResult] = useState(null); // 'CORRECT', 'INCORRECT', 'OOS'
  const [recordingCountdown, setRecordingCountdown] = useState(10); // 10초 카운트다운
  const timerRef = useRef(null);

  // 🕒 흐름 제어 (useEffect)
  const handleGrading = useCallback((mockResult) => {
    clearInterval(timerRef.current);
    setStep(STEPS.GRADING);
    setGradingResult(mockResult);

    setTimeout(() => {
      setStep(STEPS.DONE);
    }, 1500);
  }, []);

  useEffect(() => {
    // 1. START -> LISTEN (하단 창 애니메이션 시점)
    if (step === STEPS.START) {
      // 하단 창 애니메이션 시간(0.5s)을 고려하여 0.7s 후 LISTEN으로 전환하여 자연스러운 애니메이션 유도
      const startTimer = setTimeout(() => {
        setStep(STEPS.LISTEN);
      }, 1500);
      return () => clearTimeout(startTimer);
    }

    // 2. LISTEN -> SPEAK_SETUP (TTS 재생 후 2초 대기)
    if (step === STEPS.LISTEN) {
      const ttsDuration = 2000; // TTS 재생 시간 시뮬레이션
      const speakSetupTimer = setTimeout(() => {
        setStep(STEPS.SPEAK_SETUP);
      }, ttsDuration + 2000); // TTS 재생 후 2초 대기

      return () => clearTimeout(speakSetupTimer);
    }

    // 3. SPEAK_SETUP (10초 카운트다운 시작)
    if (step === STEPS.SPEAK_SETUP) {
      setRecordingCountdown(10);
      timerRef.current = setInterval(() => {
        setRecordingCountdown((prev) => {
          if (prev === 0) {
            clearInterval(timerRef.current);
            if (!isRecording) {
              handleGrading('INCORRECT');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }

    // 4. DONE -> 다음 롤플레이 또는 목록으로 이동
    if (step === STEPS.DONE) {
      const doneTimer = setTimeout(() => {
        console.log('Next learning');
      }, 5000);
      return () => clearTimeout(doneTimer);
    }
  }, [step, isRecording, handleGrading]);

  // 🎙️ 마이크 누름/뗌 핸들러
  const handleMicPress = useCallback(() => {
    if (step !== STEPS.SPEAK_SETUP && step !== STEPS.RECORDING) return;

    setIsRecording(true);
    setStep(STEPS.RECORDING);
  }, [step]);

  const handleMicRelease = useCallback(() => {
    if (!isRecording) return;

    setIsRecording(false);

    const results = ['CORRECT', 'INCORRECT', 'OOS'];
    const randomResult = results[Math.floor(Math.random() * results.length)];

    handleGrading(randomResult);
  }, [isRecording, handleGrading]);

  // 🎨 UI 데이터 설정
  let currentBubbleText;
  let bubbleClass = 'role-bubble';

  if (step === STEPS.GRADING) {
    currentBubbleText = BUBBLE_TEXT[gradingResult];
    // CSS에서 색상 처리를 위해 클래스 추가
    bubbleClass +=
      gradingResult === 'CORRECT'
        ? ' correct'
        : gradingResult === 'INCORRECT'
        ? ' incorrect'
        : ' oos';
  } else {
    currentBubbleText = BUBBLE_TEXT[step];
  }

  // 로마자 텍스트 색상 결정 (CSS 클래스 반환)
  const getRomanizedTextColorClass = () => {
    if (step !== STEPS.GRADING) return '';
    if (gradingResult === 'CORRECT') return ' correct';
    if (gradingResult === 'INCORRECT') return ' incorrect';
    return ' oos'; // OOS
  };

  // TTS 버튼 클래스
  const getTtsButtonClass = () => {
    // TTS 버튼은 LISTEN 단계에서 활성화 (흰색)
    return step === STEPS.LISTEN ? ' active' : '';
  };

  // 마이크 버튼 (검은색 창 안의 작은 마이크) 클래스
  const getSmallMicClass = () => {
    // SPEAK_SETUP부터 RECORDING까지 활성화 (흰색)
    return step === STEPS.SPEAK_SETUP || isRecording ? ' active' : '';
  };

  // 메인 마이크 버튼 클래스
  const getMainMicButtonClass = () => {
    const isActiveStep = step === STEPS.SPEAK_SETUP || step === STEPS.RECORDING;

    if (!isActiveStep) {
      return 'off disabled';
    }
    return isRecording ? 'on' : 'off';
  };

  const characterImage = getMascotImage(step, gradingResult);

  return (
    <div className="role-play-container">
      <Header hasBackButton />

      <Mascot image={characterImage} text={currentBubbleText} />

      {/* ⬇️ 하단 컨텐츠 영역 (슬라이드 애니메이션) */}
      {/* ⭐ START 단계에서 slide-out 클래스만 적용 (초기에는 숨겨짐) */}
      <div
        className={`role-content-window rolePlay-content-window ${
          step === STEPS.START ? 'slide-out' : ''
        }`}
      >
        <div className="card-title-bar">
          {' '}
          {/* 카드 타이틀/스텝 바 */}
          <span className="card-title-text">Role Play_At a Cafe</span>
          <span className="card-step-text">{ROLE_PLAY_DATA.currentStep}</span>
        </div>

        {/* 검은색 텍스트 창 (text-display-box 적용) */}
        <div className="text-display-box">
          {/* 첫 번째 줄: 한국어 & TTS 버튼 */}
          <div className="text-line korean-line">
            <span className="korean-text">{ROLE_PLAY_DATA.korean}</span>
            <button className={`tts-button${getTtsButtonClass()}`}>🔊</button>
          </div>
          <div className="divider-line" /> {/* 구분선 */}
          {/* 두 번째 줄: 로마자 & 작은 마이크 아이콘 */}
          <div className="text-line romanized-line">
            <span className={`romanized-text${getRomanizedTextColorClass()}`}>
              {ROLE_PLAY_DATA.romanized}
            </span>
            <span className={`small-mic-icon${getSmallMicClass()}`}>🎤</span>
          </div>
          <div className="divider-line" /> {/* 구분선 */}
          <div className="text-line">
            {/* 세 번째 줄: 영어 번역 */}
            <span className="english-text">{ROLE_PLAY_DATA.english}</span>
          </div>
        </div>

        <div className="content-tail"></div>

        {/* 역할 태그 */}
        <div className="role-tag-container">
          <span className="role-tag">{ROLE_PLAY_DATA.role}</span>
        </div>

        {/* 하단 마이크 버튼 영역 (mic-area 적용) */}
        <div className="mic-area">
          <div className="mic-button-wrapper">
            {/* 10초 카운트다운 표시 */}
            {/* {(step === STEPS.SPEAK_SETUP || step === STEPS.RECORDING) && (
                             <span className="countdown-text">
                                {isRecording ? "Recording..." : `Time remaining: ${recordingCountdown}s`}
                            </span>
                        )} */}

            {/* 메인 마이크 버튼 (main-mic-button 및 on/off 클래스 적용) */}
            <button
              className={`main-mic-button ${getMainMicButtonClass()}`}
              onMouseDown={handleMicPress}
              onMouseUp={handleMicRelease}
              onTouchStart={handleMicPress}
              onTouchEnd={handleMicRelease}
              disabled={step !== STEPS.SPEAK_SETUP && step !== STEPS.RECORDING}
            >
              <span className="main-mic-icon">🎤</span>

              <span className="mic-status-text">
                {isRecording ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolePlay;
