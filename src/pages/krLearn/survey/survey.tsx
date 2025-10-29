import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './survey.css'; 

// --- 데이터 및 타입 정의 (이 부분은 이전과 동일하며, 5개 질문으로 구성) ---

interface Question {
    bubbleText: string;
    options: string[];
}

const surveyData: Question[] = [
    { // Survey 페이지 
        bubbleText: "Why are you learning Korean?",
        options: [
            "Preparing for the TOPIK exam", 
            "Studying or working abroad to Korea", 
            "K-dramas, K-pop, and other hobbies", 
            "Travel and everyday conversations"
        ],
    },

    { 
        bubbleText: "How do you like to study?",
        options: [
            "Quick and focused learning", 
            "Situation-based examples", 
            "Repetitive memorization", 
            "Game or quiz format"],
    },
    { 
        bubbleText: "Which level suits you best?",
        options: ["Beginner", "Intermediate", "Advanced"],
    },
    { 
        bubbleText: "What kind of words are you most interested in?",
        options: [
            "Daily expressions", 
            "Emotion expressions", 
            "Food and travel", 
            "Topik vocabulary",
            "Slang and informal words"],
    },
    { 
        bubbleText: "How long does it take you to study?",
        options: ["5 mins", "10 mins", "More than 15mins"],
    },
];

const INTRO_BUBBLE_TEXT = "Before we start, Answer a few simple questions and we'll tailor your learning to your needs.";
const FINAL_BUBBLE_TEXT = "All set! Here's your personalized Korean learning path";
const DONE_PAGE_INDEX = surveyData.length;


// --- 컴포넌트 분리 (이전과 동일) ---

const SpeechBubble: React.FC<{ text: string, isFinal?: boolean }> = ({ text, isFinal = false }) => (
    <div className="speech-bubble">
        {text}
        <div className={`bubble-tail ${isFinal ? 'final-tail' : ''}`}></div>
    </div>
);

const CharacterSection: React.FC<{ pageIndex: number, isStarted: boolean, onLogout: () => void }> = ({ pageIndex, isStarted, onLogout }) => {
    // 설문 시작 전: INTRO_BUBBLE_TEXT
    // 설문 진행 중: 현재 질문 텍스트
    // 설문 완료: FINAL_BUBBLE_TEXT
    let currentBubbleText;
    if (pageIndex === DONE_PAGE_INDEX) {
        currentBubbleText = FINAL_BUBBLE_TEXT;
    } else if (!isStarted) {
        currentBubbleText = INTRO_BUBBLE_TEXT;
    } else {
        currentBubbleText = surveyData[pageIndex].bubbleText;
    }

    return (
        <div className="survey-header-section">
            <button className="logout-button" onClick={onLogout}>Logout</button>
            <SpeechBubble text={currentBubbleText} isFinal={pageIndex === DONE_PAGE_INDEX} />
            <div className={`character-placeholder ${pageIndex === DONE_PAGE_INDEX ? 'final-character' : ''}`}></div>
        </div>
    );
};


// --- 메인 컴포넌트 ---

const Survey: React.FC = () => {
    const navigate = useNavigate();
    
    // ⭐️ 핵심 수정: 설문 시작 여부를 추적하는 상태 추가
    const [isSurveyStarted, setIsSurveyStarted] = useState(false); 
    const [currentPage, setCurrentPage] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);

    // Survey 창 클릭 핸들러: 설문을 시작하고 첫 질문을 보여줍니다.
    const handleSurveyWindowClick = () => {
        if (!isSurveyStarted) {
            setIsSurveyStarted(true);
            // currentPage는 이미 0이므로 별도 설정 불필요
        }
        // 설문이 이미 시작되었거나 완료된 상태라면 클릭 무시
    };
    
    // 답변 버튼 클릭 핸들러 (이전과 동일)
    const handleOptionClick = (optionText: string, index: number) => {
        if (currentPage >= DONE_PAGE_INDEX) return;

        setSelectedOptionIndex(index); 
        
        setTimeout(() => {
            const updatedAnswers = [...selectedAnswers, optionText];
            setSelectedAnswers(updatedAnswers);
            
            const nextPageIndex = currentPage + 1;
            
            if (nextPageIndex <= DONE_PAGE_INDEX) {
                setCurrentPage(nextPageIndex);
                setSelectedOptionIndex(null); 
            }
        }, 300); 
    };

    const handleLogout = () => {
        navigate('/auth/login');
    };

    // --- Survey Content Window 내부 내용 렌더링 함수 ---
    const renderSurveyContent = () => {
        if (!isSurveyStarted) {
            //  설문 시작 전: 빈 화면 (클릭 유도 텍스트가 필요하다면 여기에 추가)
            return (
                <div className="survey-start-message">
                    
                </div>
            );
        }

        if (currentPage === DONE_PAGE_INDEX) {
            // 설문 완료 화면 렌더링
            return (
                <div className="survey-done-message"  onClick={() => navigate('../mainpage/learnList')}>
                    Done!
                </div>
            );
        } else {
            // 일반 설문 페이지 렌더링
            const currentQuestion = surveyData[currentPage];
            return (
                <>
                    {/* SurveyOption 컴포넌트는 Survey.tsx에 정의되어 있어야 합니다. */}
                    {/* 정의되지 않았다면, 아래처럼 임시 버튼 코드를 사용하세요. */}
                    {currentQuestion.options.map((option, index) => (
                         <div className="survey-option-container" key={index}>
                            <span className="bullet-point">●</span>
                            <button 
                                className={`survey-option-button ${selectedOptionIndex === index ? 'selected' : ''}`}
                                onClick={() => handleOptionClick(option, index)}
                            >
                                {option}
                            </button>
                        </div>
                    ))}
                </>
            );
        }
    };

    return (
        <div className="survey-container">
            {/* 상단 섹션 */}
            <CharacterSection 
                pageIndex={currentPage} 
                isStarted={isSurveyStarted}
                onLogout={handleLogout}
            />

            {/* 하단 Survey 내용 창 */}
            {/* ⭐️ 설문 시작 전에는 클릭 이벤트를 받습니다. */}
            <div className="survey-content-window" onClick={handleSurveyWindowClick}>
                <div className="survey-content-inner">
                    <h1 className="survey-title">Survey</h1>
                    
                    <div className="survey-form-area">
                        {renderSurveyContent()}
                    </div>

                    {/* Skip to learning 버튼 (시작 전/진행 중일 때만 표시) */}
                    {currentPage < DONE_PAGE_INDEX && (
                        <div className="skip-button-container">
                            <button 
                                className="skip-button" 
                                onClick={(e) => {
                                    e.stopPropagation(); // Survey 창 클릭 이벤트 전파 방지
                                    navigate('/learn/start');
                                }}
                            >
                                Skip to learning
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Survey;