import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { http } from '../../../apis/http';
import Character1 from '../../../assets/Character1.png';
import CharacterCute from '../../../assets/Character-Cute.png';
import './survey.css';

// --- 데이터 및 타입 정의 ---

interface Question {
  bubbleText: string;
  options: string[];
}

const surveyData: Question[] = [
  {
    // Survey 페이지 1
    bubbleText: 'Why are you learning Korean?',
    options: [
      'Preparing for the TOPIK exam',
      'Studying or working abroad to Korea',
      'K-dramas, K-pop, and other hobbies',
      'Travel and everyday conversations',
    ],
  },

  {
    // Survey 페이지 2
    bubbleText: 'How do you like to study?',
    options: [
      'Quick and focused learning',
      'Situation-based examples',
      'Repetitive memorization',
      'Game or quiz format',
    ],
  },
  {
    // Survey 페이지 3
    bubbleText: 'Which level suits you best?',
    options: ['Beginner', 'Intermediate', 'Advanced'],
  },
  {
    // Survey 페이지 4
    bubbleText: 'What kind of words are you most interested in?',
    options: [
      'Daily expressions',
      'Emotion expressions',
      'Food and travel',
      'Topik vocabulary',
      'Slang and informal words',
    ],
  },
  {
    // Survey 페이지 5
    bubbleText: 'How long does it take you to study?',
    options: ['5 mins', '10 mins', 'More than 15mins'],
  },
];

const FINAL_BUBBLE_TEXT =
  "All set! Here's your personalized Korean learning path";
const DONE_PAGE_INDEX = surveyData.length;

// --- 컴포넌트 분리 (SpeechBubble, CharacterSection, PaginationDots) ---

const SpeechBubble: React.FC<{ text: string; isFinal?: boolean }> = ({
  text,
  isFinal = false,
}) => (
  <div className="speech-bubble surveyIng-bubble">
    {text}
    <div className={`speech-tail ${isFinal ? 'final-tail' : ''}`}></div>
  </div>
);

// const CharacterSection: React.FC<{ pageIndex: number, isStarted: boolean, onLogout: () => void }> = ({ pageIndex, isStarted, onLogout }) => {
//     let currentBubbleText;
//     if (pageIndex === DONE_PAGE_INDEX) {
//         currentBubbleText = FINAL_BUBBLE_TEXT;
//     } else {
//         // SurveyStart.tsx를 통과했으므로 무조건 질문 텍스트를 표시
//         currentBubbleText = surveyData[pageIndex].bubbleText;
//     }

//     return (
//         <div className="header-section">
//             <button className="logout" onClick={onLogout}>Logout</button>
//             <SpeechBubble text={currentBubbleText} isFinal={pageIndex === DONE_PAGE_INDEX} />
//             <div className={`character-placeholder ${pageIndex === DONE_PAGE_INDEX ? 'final-character' : ''}`}>

//             </div>
//         </div>
//     );
// };

const CharacterSection: React.FC<{
  pageIndex: number;
  isStarted: boolean;
  onLogout: () => void;
}> = ({ pageIndex, isStarted, onLogout }) => {
  // 설문 진행 중인지 확인
  const isDone = pageIndex === DONE_PAGE_INDEX;

  let currentBubbleText;
  if (isDone) {
    currentBubbleText = FINAL_BUBBLE_TEXT;
  } else {
    // SurveyStart.tsx를 통과했으므로 무조건 질문 텍스트를 표시
    currentBubbleText = surveyData[pageIndex].bubbleText;
  }

  // ⭐ 2. 페이지에 따라 사용할 이미지 경로 결정
  const characterImage = isDone ? CharacterCute : Character1;

  return (
    <div className="header-section">
      <button className="logout" onClick={onLogout}>
        Logout
      </button>
      <SpeechBubble text={currentBubbleText} isFinal={isDone} />

      {/* ⭐ 3. 이미지 태그를 사용하여 캐릭터 이미지 표시 */}
      <div
        className={`character-placeholder ${isDone ? 'final-character' : ''}`}
      >
        <img
          src={characterImage}
          alt={
            isDone
              ? 'Cute Character for Success'
              : 'Instructor Character for Survey'
          }
          // 필요하다면 이미지 스타일링을 위한 클래스를 추가합니다.
          className="character-icon"
        />
      </div>
    </div>
  );
};

const PaginationDots: React.FC<{
  currentPage: number;
  totalPages: number;
  onDotClick: (index: number) => void;
}> = ({ currentPage, totalPages, onDotClick }) => {
  return (
    <div className="pagination-dots">
      {Array.from({ length: totalPages }, (_, index) => (
        <div
          key={index}
          className={`dot ${index === currentPage ? 'active' : ''}`}
          onClick={() => {
            if (index < currentPage) onDotClick(index);
          }}
        />
      ))}
    </div>
  );
};

// --- 메인 컴포넌트 ---

const Survey: React.FC = () => {
  const navigate = useNavigate();

  // 🔥 설문 시작 상태를 true로 고정하여 1페이지부터 바로 시작
  const [isSurveyStarted, setIsSurveyStarted] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>(
    Array(DONE_PAGE_INDEX).fill(null),
  );
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(
    null,
  );

  const handleDotClick = (index: number) => {
    if (index < currentPage) {
      setCurrentPage(index);
      setSelectedOptionIndex(null);
    }
  };

  const handleOptionClick = (optionText: string, optionIndex: number) => {
    if (currentPage >= DONE_PAGE_INDEX) return;

    setSelectedOptionIndex(optionIndex);

    setTimeout(() => {
      const updatedAnswers = [...selectedAnswers];
      updatedAnswers[currentPage] = optionText;
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

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('../learnList');
  };

//설문저장 api - accesstoken발급안되서 안넘어가는 이슈 해결 안됨 
const handleDoneMessageClick = async () => {
    try {
      const rawResponses: Record<string, string> = {};

      selectedAnswers.forEach((answer, index) => {
        if (answer) {
          // surveyData의 질문 텍스트를 키로 사용하고, 사용자 입력값을 그대로 저장
          rawResponses[surveyData[index].bubbleText] = answer;
        }
      });

      // API 호출
      await http.post('/api/v1/surveys', { rawResponses });

      navigate('../learnList');
    } catch (error) {
      console.error('Failed to save survey:', error);
    }
  };


  // --- Survey Content Window 내부 내용 렌더링 함수 ---
  const renderSurveyContent = () => {
    // 설문 완료 뷰
    if (currentPage === DONE_PAGE_INDEX) {
      return (
        <div className="survey-done-view">
          <div className="survey-done-message" onClick={handleDoneMessageClick}>
            Well Done!
          </div>
        </div>
      );
    }

    // 일반 설문 페이지 뷰 (질문 옵션 렌더링)
    const currentQuestion = surveyData[currentPage];
    return (
      <div className="survey-question-view">
        <div className="survey-options-list">
          {currentQuestion.options.map((option, index) => (
            <div className="survey-option-container" key={index}>
              <span className="bullet-point">●</span>
              <button
                className={`survey-option-button ${
                  selectedOptionIndex === index ? 'selected' : ''
                }`}
                onClick={() => handleOptionClick(option, index)}
              >
                {option}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="survey-container">
      {/* 상단 섹션 */}
      <CharacterSection
        pageIndex={currentPage}
        isStarted={isSurveyStarted} // true로 고정
        onLogout={handleLogout}
      />

      {/* 하단 Survey 내용 창 */}
      <div className="content-window">
        <h1 className="survey-title">Survey</h1>

        <div className="survey-form-area">{renderSurveyContent()}</div>

        {/* ⭐️ Fixed Bottom Controls (페이지네이션과 Skip 버튼) */}
        {currentPage !== DONE_PAGE_INDEX && (
          <div className="fixed-bottom-controls">
            {/* 페이지네이션 도트 (설문 진행 중일 때) */}
            <div className="pagination-area">
              <PaginationDots
                currentPage={currentPage}
                totalPages={DONE_PAGE_INDEX}
                onDotClick={handleDotClick}
              />
            </div>

            {/* Skip to learning 버튼 (진행 중일 때 고정) */}
            <div className="skip-button-container skip-bottom-fixed-inner">
              <button className="skip-button" onClick={handleSkip}>
                Skip to learning
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Survey;
