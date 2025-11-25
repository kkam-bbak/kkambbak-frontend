import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { http } from '../../../apis/http';
import styles from './survey.module.css';
import Header from '@/components/layout/Header/Header';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';
import ContentSection from '@/components/layout/ContentSection/ContentSection';
import Button from '@/components/Button/Button';

// ... (데이터 및 타입 정의는 기존과 동일하여 생략) ...
interface Question {
  bubbleText: string;
  options: string[];
}

const surveyData: Question[] = [
  // ... (기존 surveyData 내용 유지) ...
  {
    bubbleText: 'Why are you learning Korean?',
    options: [
      'Preparing for the TOPIK exam',
      'Studying or working abroad to Korea',
      'K-dramas, K-pop, and other hobbies',
      'Travel and everyday conversations',
    ],
  },
  {
    bubbleText: 'How do you like to study?',
    options: [
      'Quick and focused learning',
      'Situation-based examples',
      'Repetitive memorization',
      'Game or quiz format',
    ],
  },
  {
    bubbleText: 'Which level suits you best?',
    options: ['Beginner', 'Intermediate', 'Advanced'],
  },
  {
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
    bubbleText: 'How long does it take you to study?',
    options: ['5 mins', '10 mins', 'More than 15mins'],
  },
];

const FINAL_BUBBLE_TEXT = "All set! Here's your personalized Korean learning path";
const DONE_PAGE_INDEX = surveyData.length;

// ... (CharacterSection, PaginationDots 컴포넌트 기존과 동일하여 생략) ...
const CharacterSection: React.FC<{
  pageIndex: number;
  isStarted: boolean;
  onLogout: () => void;
}> = ({ pageIndex, isStarted, onLogout }) => {
  const isDone = pageIndex === DONE_PAGE_INDEX;
  let currentBubbleText;
  if (isDone) {
    currentBubbleText = FINAL_BUBBLE_TEXT;
  } else {
    currentBubbleText = surveyData[pageIndex].bubbleText;
  }
  const characterImage: MascotImage = isDone ? 'cute' : 'basic';

  return (
    <div className="header-section">
      <Header hasBackButton />
      <Mascot image={characterImage} text={currentBubbleText} />
    </div>
  );
};

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
          className={`${styles.dot} ${index === currentPage ? styles.active : ''}`}
          onClick={() => {
            if (index < currentPage) onDotClick(index);
          }}
        />
      ))}
    </div>
  );
};

const Survey: React.FC = () => {
  const navigate = useNavigate();
  const [isSurveyStarted, setIsSurveyStarted] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>(
    Array(DONE_PAGE_INDEX).fill(null),
  );
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);

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

  // 설문 저장 및 이동 API 호출 함수
  const handleDoneAndNavigate = async () => {
    try {
      const rawResponses: Record<string, string> = {};
      selectedAnswers.forEach((answer, index) => {
        if (answer) {
          rawResponses[surveyData[index].bubbleText] = answer;
        }
      });

      // 설문 결과 저장 API 호출
      await http.post('/surveys', { rawResponses });

      // 설문 완료 상태가 되었으므로 목록 페이지로 이동
      navigate('../learnList', { replace: true });
    } catch (error) {
      console.error('Failed to save survey:', error);
      // 에러 발생 시에도 사용자 경험을 위해 목록으로 이동 (필요에 따라 에러 처리 로직 추가)
      navigate('../learnList', { replace: true });
    }
  };

  // 2초 후 자동 이동을 위한 useEffect
  useEffect(() => {
    if (currentPage === DONE_PAGE_INDEX) {
      const timer = setTimeout(() => {
        handleDoneAndNavigate();
      }, 2000); // 2초 후 실행

      return () => clearTimeout(timer); // 컴포넌트 언마운트 시 타이머 정리
    }
  }, [currentPage]);

  const renderSurveyContent = () => {
    // 설문 완료 뷰
    if (currentPage === DONE_PAGE_INDEX) {
      return (
        <div className={styles.surveyDoneView}>
          {/* 클릭 시 즉시 이동 가능하도록 핸들러 연결 */}
          <div className={styles.surveyDoneMessage} onClick={handleDoneAndNavigate}>
            Well Done!
          </div>
        </div>
      );
    }

    // 일반 설문 페이지 뷰
    const currentQuestion = surveyData[currentPage];
    return (
      <div className={styles.surveyQuestionView}>
        <div className={styles.surveyOptionsList}>
          {currentQuestion.options.map((option, index) => (
            <div className={styles.surveyOptionContainer} key={index}>
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
    <div>
      <CharacterSection
        pageIndex={currentPage}
        isStarted={isSurveyStarted}
        onLogout={handleLogout}
      />
      <ContentSection>
        <h1 className={styles.surveyTitle}>Survey</h1>
        <div className={styles.surveyFormArea}>{renderSurveyContent()}</div>
        {currentPage !== DONE_PAGE_INDEX && (
          <>
            <div className={styles.paginationArea}>
              <PaginationDots
                currentPage={currentPage}
                totalPages={DONE_PAGE_INDEX}
                onDotClick={handleDotClick}
              />
            </div>
            <Button  isFull className={styles.skipButtonContainer} onClick={handleSkip}>
              Skip to learning
            </Button>
          </>
        )}
      </ContentSection>
    </div>
  );
};

export default Survey;