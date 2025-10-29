import React from 'react';
import { useNavigate } from 'react-router-dom';
import './survey.css'; 

const Survey: React.FC = () => {
    const navigate = useNavigate();

    // 말풍선과 캐릭터를 위한 임시 컴포넌트 (mainPage와 동일)
    const CharacterSection: React.FC = () => (
        <div className="survey-header-section">
            <button className="logout-button" onClick={() => navigate('/auth/login')}>Logout</button>
            <div className="speech-bubble">
                Before we start, Answer a few simple questions and we'll tailor your learning to your needs.
                <div className="bubble-tail"></div>
            </div>
            {/* 캐릭터 Placeholder */}
            <div className="character-placeholder"></div>
        </div>
    );

    return (
        <div className="survey-container">
            {/* 상단 섹션 (Logout, 말풍선, 캐릭터) */}
            <CharacterSection />

            {/* 하단 Survey 내용 창 */}
            <div className="survey-content-window">
                <div className="survey-content-inner">
                    {/* Survey Title Text */}
                    <h1 className="survey-title">Survey</h1>
                    
                    {/* 실제 설문 내용이 들어갈 곳 */}
                    <div className="survey-form-area">
                        {/* 폼 요소는 현재 생략 */}
                        
                    </div>

                    {/* Skip to learning 버튼 */}
                    <div className="skip-button-container">
                        <button 
                            className="skip-button" 
                            onClick={() => navigate('/learn/start')} // 학습 시작 페이지로 이동
                        >
                            Skip to learning
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Survey;