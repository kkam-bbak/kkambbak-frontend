// LearnInfo.tsx

import React, { useState, useEffect, useRef } from 'react';
import './learnInfo.css'; 

// Topic 인터페이스는 유지
interface Topic {
    id: number; title: string; vocabularies: number; time: string; completed: boolean; 
}
interface LearnInfoProps {
    topic: Topic; tab: 'topik' | 'casual'; isOpen: boolean; onClose: () => void; onConfirmStart: () => void; 
}

// 🔥 안내 단계 텍스트 정의 (로직 유지를 위해 텍스트는 그대로 사용)
const INFO_STEPS_TEXT = [
    "Okay, Let's go!", // 0
    "Before we begin, let me briefly explain.", // 1
    "I'll show you an image and play it back in Korean with pronunciation.", // 2
    "Then, you hold down the button", // 3 
    "Say the words", // 4
    "and then release the button.", // 5 
    "If you don't understand after listening,", // 6 
    "You can also press the voice to hear it again.", // 7 
    "Okay, now focus on my instructions.", // 8 
];

const LearnInfo: React.FC<LearnInfoProps> = ({ topic, tab, isOpen, onClose, onConfirmStart }) => {
    
    const [currentStep, setCurrentStep] = useState(0); 
    const [micHeldDown, setMicHeldDown] = useState(false);
    
    const topicDisplay = `${tab === 'casual' ? 'Casual_' : ''}${topic.title}`;
    const wordCount = topic.vocabularies;
    const modalClassName = `learn-info-modal-overlay ${isOpen ? 'open' : ''}`;
    
    useEffect(() => {
    if (!isOpen) return;
    
    let timer: number | undefined;
    const totalSteps = INFO_STEPS_TEXT.length;
    const isMicControlStep = currentStep >= 3 && currentStep <= 5; // 3, 4, 5 단계
    
    if (currentStep < totalSteps) {
        const delay = (currentStep === 0 || currentStep === 1) ? 3000 : 5000;
        
        // 🚨 Step 3, 4, 5가 아닐 때만 자동 타이머 설정
        if (!isMicControlStep) {
            timer = setTimeout(() => {
                setCurrentStep(prev => prev + 1);
            }, delay);
        }
        
        // 🚨 Step 5 완료 후 (마이크 뗀 후) 다음 Step 6으로 자동 전환하는 로직이 필요합니다.
        // 현재 Step 5는 사용자 액션으로 전환되지 않으므로, Step 5로 진입하는 순간 타이머를 설정해야 합니다.
        
        if (currentStep === 5) {
             // Step 5는 마이크 떼기 후 진입하며, 5초 뒤 Step 6으로 자동 전환되어야 함
             timer = setTimeout(() => {
                setCurrentStep(prev => prev + 1);
            }, 5000); 
        }


    } else {
        // 최종 단계 (Step 8) 완료 후 2초 뒤 자동 학습 시작
        timer = setTimeout(() => {
            onConfirmStart(); 
        }, 2000); 
    }

    return () => { 
        if (timer) clearTimeout(timer); 
    };
    
}, [currentStep, isOpen, onConfirmStart]);
    const currentSpeechText = INFO_STEPS_TEXT[currentStep] || "";
    const isFieldsActive = currentStep >= 2 && currentStep <= 5; 


    // 🔥 마이크 버튼 스타일 결정 (ON/OFF/Disabled)
    const getMicButtonState = () => {
        if (currentStep === 4) return 'on';
        if (currentStep === 3 || currentStep === 5 || currentStep === 8) return 'off';
        return 'disabled-info';
    };

    // 🔥 필드 활성화 스타일 클래스 결정
    const getInputClass = () => {
        if (currentStep >= 2 && currentStep <= 5) return 'active-fields';
        if (currentStep === 7) return 'highlight-romnized';
        return 'inactive-fields'; 
    };

    // 3. 마이크 시뮬레이션 핸들러 (유지)
    const handleMicDown = (e: React.MouseEvent | React.TouchEvent) => { 
        e.preventDefault();
        if (currentStep === 3) setCurrentStep(4); 
    };
    const handleMicUp = () => {
        if (currentStep === 4) setCurrentStep(5); 
    };
    

    return (
        <div className={modalClassName}>
            <div className="info-card-container">
                
                {/* 상단 헤더 */}
                <div className="info-header">
                    <button className="logout-button" onClick={onClose}>Logout</button>
                    <div className="speech-bubble-info">
                        {currentSpeechText}
                        <div className="bubble-tail-info"></div>
                    </div>
                    <div className="character-placeholder-info"></div>
                </div>

                {/* 학습 카드 영역 */}
                <div className="learning-card-info">
                    
                    {/* 제목 및 페이지 */}
                    <div className="card-title-bar-info">
                        <span className="topic-name-info">Casual_Emotions</span>
                        <span className="word-count-info">{`01/${wordCount.toString().padStart(2, '0')}`}</span>
                    </div>

                    {/* 빈 영역 (안내 메시지/이미지) */}
                    <div className="word-display-area-info">
                        {/* 🔥 내용은 완전히 비워둠 */}
                    </div>

                    {/* 단어 정보 입력 필드 */}
                    <div className="input-fields-container-info">
                        {/* Romnized Row (스피커 포함) */}
                        <div className={`input-row-info ${getInputClass()}`}>
                            <label>Korean</label>
                            {/* 🔥 value 제거 */}
                            <input type="text" readOnly value={isFieldsActive ? "" : ""} /> 
                            <button 
                                className="speaker-icon-info" 
                                disabled={currentStep !== 7 && currentStep !== 8}
                            >
                                🔊
                            </button>
                        </div>
                        
                        {/* Korean Row */}
                        <div className={`input-row-info ${getInputClass()}`}>
                            <label>Romnized</label>
                            {/* 🔥 value 제거 */}
                            <input type="text" readOnly value={isFieldsActive ? "" : ""} />
                        </div>

                        {/* Translation Row */}
                        <div className={`input-row-info translation-info ${getInputClass()}`}>
                            <label>Translation</label>
                            {/* 🔥 value 제거 */}
                            <input type="text" readOnly value={isFieldsActive ? "" : ""} />
                        </div>
                    </div>

                    {/* 마이크 버튼 */}
                    <button 
                            className={`mic-button-info ${getMicButtonState()}`}
                            onClick={currentStep === 8 ? onConfirmStart : undefined}
                            onMouseDown={handleMicDown}
                            onMouseUp={handleMicUp}
                            onTouchStart={handleMicDown}
                            onTouchEnd={handleMicUp}
                            disabled={currentStep !== 3 && currentStep !== 4 && currentStep !== 5 && currentStep !== 8}
                        >
                            <span className="mic-icon">🎤</span>
                        </button>
                </div>
            </div>
        </div>
    );
};

export default LearnInfo;