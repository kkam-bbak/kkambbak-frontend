// SurveyStart.tsx (메인 페이지에서 처음 접근하는 파일)

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './surveyStart.css'; 

// --- 데이터 및 타입 정의 (유지) ---
const surveyData = [/* ... */];
const INTRO_BUBBLE_TEXT = "Before we start, Answer a few simple questions and we'll tailor your learning to your needs.";

// --- 컴포넌트 분리 (SpeechBubble, CharacterSection 유지) ---
const SpeechBubble: React.FC<{ text: string }> = ({ text }) => (
    <div className="speech-bubble">
        {text}
        <div className="bubble-tail"></div>
    </div>
);

const CharacterSection: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    return (
        <div className="survey-header-section">
            <button className="logout-button" onClick={onLogout}>Logout</button>
            <SpeechBubble text={INTRO_BUBBLE_TEXT} />
            <div className="character-placeholder"></div>
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

    const handleLogout = () => {
        navigate('/auth/login');
    };

    return (
        <div className="survey-container">
            {/* 상단 섹션 */}
            <CharacterSection onLogout={handleLogout} />

            {/* 하단 Survey 내용 창 */}
            <div className="survey-content-window">
                <h1 className="survey-title">Survey</h1>
                
                
                {/* 1. Start 버튼 */}
                <div className="start-button-container">
                    <button className="start-button" onClick={handleStart}>
                        Start
                    </button>
                </div>
                
                {/* 2. Skip to learning 버튼 */}
                <div className="skip-button-container">
                    <button 
                        className="skip-button" 
                        onClick={handleSkip}
                    >
                        Skip to learning
                    </button>
                </div>
                
            </div>
        </div>
    );
};

export default SurveyStart;