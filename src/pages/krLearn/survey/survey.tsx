import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { http } from '../../../apis/http';
import styles from './survey.module.css';
import Header from '@/components/layout/Header/Header';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';
import ContentSection from '@/components/layout/ContentSection/ContentSection';
import Button from '@/components/Button/Button';

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

// --- 컴포넌트 분리 (CharacterSection, PaginationDots) ---

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
  const characterImage: MascotImage = isDone ? 'cute' : 'basic';

  return (
    <div className="header-section">
      <Header hasBackButton />

      <Mascot image={characterImage} text={currentBubbleText} />
    </div>
  );
};

// 🌟 PaginationDots 컴포넌트: CSS 모듈 클래스 적용 수정 완료
const PaginationDots: React.FC<{
  currentPage: number;
  totalPages: number;
  onDotClick: (index: number) => void;
}> = ({ currentPage, totalPages, onDotClick }) => {
  return (
    <div className={styles.paginationDotsList}>
      {Array.from({ length: totalPages }, (_, index) => (
        <div
          key={index}
          // ✅ styles.dot과 styles.active를 조건부로 적용
          className={`${styles.dot} ${index === currentPage ? styles.active : ''}`}
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
          rawResponses[surveyData[index].bubbleText] = answer;
        }
      });

      // API 호출
      await http.post('/surveys', { rawResponses });

      // 🔥 [수정] 설문 완료 후 learnList로 이동할 때 히스토리 기록을 대체합니다.
      navigate('../learnList', { replace: true });
    } catch (error) {
      console.error('Failed to save survey:', error);
      // API 오류가 발생해도 히스토리 대체 후 learnList로 이동하여 무한 루프를 방지합니다.
      navigate('../learnList', { replace: true }); 
    }
  };


  // --- Survey Content Window 내부 내용 렌더링 함수 ---
  const renderSurveyContent = () => {
    // 설문 완료 뷰
    if (currentPage === DONE_PAGE_INDEX) {
      return (
        <div className={styles.surveyDoneView}>
          <div className={styles.surveyDoneMessage} onClick={handleDoneMessageClick}>
            Well Done!
          </div>
        </div>
      );
    }

    // 일반 설문 페이지 뷰 (질문 옵션 렌더링)
    const currentQuestion = surveyData[currentPage];
    return (
      <div className={styles.surveyQuestionView}>
        <div className={styles.surveyOptionsList}>
          {currentQuestion.options.map((option, index) => (
            <div className={styles.surveyOptionContainer}key={index}>
              <span className={styles.bulletPoint}>●</span>
              <button
                className={`${styles.surveyOptionButton} ${
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
      <ContentSection>
        <h1 className={styles.surveyTitle}>Survey</h1>

        <div className={styles.surveyFormArea}>{renderSurveyContent()}</div>

        {currentPage !== DONE_PAGE_INDEX && (
          <>
            {/* 페이지네이션 도트 (설문 진행 중일 때) */}
            <div className={styles.paginationArea}>
              <PaginationDots
                currentPage={currentPage}
                totalPages={DONE_PAGE_INDEX}
                onDotClick={handleDotClick}
              />
            </div>
            <Button className={styles.skipButtonContainer} isFull onClick={handleSkip}>
              Skip to learning
            </Button>
          </>
        )}
      </ContentSection>
    </div>
  );
};

export default Survey;