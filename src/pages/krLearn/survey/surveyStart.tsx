// SurveyStart.tsx (메인 페이지에서 처음 접근하는 파일)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Character1 from '../../../assets/Character1.png';
import './surveyStart.css';
import Header from '@/components/layout/Header/Header';

// --- 데이터 및 타입 정의 (유지) ---
const surveyData = [
  /* ... */
];
const INTRO_BUBBLE_TEXT =
  "Before we start, Answer a few simple questions and we'll tailor your learning to your needs.";

// --- 컴포넌트 분리 (SpeechBubble, CharacterSection 유지) ---
const SpeechBubble: React.FC<{ text: string }> = ({ text }) => (
  <div className="speech-bubble survey-bubble">
    {text}
    <div className="speech-tail suvery-tail"></div>
  </div>
);

const CharacterSection = () => {
  return (
    <div className="header-section">
      <Header hasBackButton />
      <SpeechBubble text={INTRO_BUBBLE_TEXT} />
      <div className="character-placeholder">
        <img src={Character1} alt="Character" className="character-icon" />
      </div>
    </div>
  );
};

// --- 메인 컴포넌트 ---

const SurveyStart: React.FC = () => {
  const navigate = useNavigate();

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();

    navigate('../survey');
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Skip 버튼 클릭 시, LearnList.tsx로 라우팅
    navigate('../learnList');
  };

  return (
    <div className="survey-start-container">
      {/* 상단 섹션 */}
      <CharacterSection />

      {/* 하단 Survey 내용 창 */}
      <div className="content-window">
        <h1 className="survey-title">Survey</h1>

        {/* 1. Start 버튼 */}
        <div className="start-button-container">
          <button className="start-button" onClick={handleStart}>
            Start
          </button>
        </div>

        {/* 2. Skip to learning 버튼 */}
        <div className="skip-button-container">
          <button className="skip-button" onClick={handleSkip}>
            Skip to learning
          </button>
        </div>
      </div>
    </div>
  );
};

export default SurveyStart;
