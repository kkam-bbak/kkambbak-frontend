import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, Calendar } from 'lucide-react';
import styles from './learnComplete.module.css'; // CSS 파일 임포트
import Header from '@/components/layout/Header/Header';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';

// --- 유틸리티 함수: 시간 및 날짜 처리 ---

/**
 * 밀리초(ms)를 "Xm Ys" 형식의 문자열로 변환합니다.
 * (현재는 더미 데이터를 그대로 반환하며, 실제 앱에서는 학습 시작/종료 시점을 기반으로 계산해야 합니다.)
 * @param durationMs 학습에 걸린 시간 (밀리초)
 * @returns {string} 형식화된 시간 문자열 (예: "6m 30s")
 */
const formatDuration = (durationMs: number): string => {
  // 💡 실제 구현에서는 durationMs를 사용하여 분과 초를 계산합니다.
  // 예시: const totalSeconds = Math.round(durationMs / 1000);
  // const minutes = Math.floor(totalSeconds / 60);
  // const seconds = totalSeconds % 60;
  // return `${minutes}m ${seconds}s`;

  // 현재는 더미 데이터를 반영하여 "6m 30s"를 반환합니다.
  return '6m 30s';
};

/**
 * 현재 날짜를 "Weekday, Month Day, Year" 형식의 문자열로 변환합니다.
 * @returns {string} 형식화된 날짜 문자열 (예: "Monday, November 10, 2025")
 */
const getFormattedCompletionDate = (): string => {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  // 언어는 'en-US' (미국 영어)로 지정하여 이미지와 동일한 형식으로 출력합니다.
  return now.toLocaleDateString('en-US', options);
};

// --- 더미 결과 데이터 ---
const DUMMY_RESULTS = {
  topicName: 'Casual_Emotions',
  correctCount: 12, // <-- 이 값을 변경하여 테스트
  totalCount: 26,
};
// --- END DUMMY DATA ---

// 결과 항목을 렌더링하는 보조 컴포넌트
const ResultRow = ({
  icon: Icon,
  value,
}: {
  icon: React.ElementType;
  value: string;
}) => (
  <div className={styles.resultRow}>
    <Icon className={styles.resultIcon}/>
    <span className={styles.resultValue}>{value}</span>
  </div>
);

const LearnComplete: React.FC = () => {
  const navigate = useNavigate();
  const { correctCount, totalCount, topicName } = DUMMY_RESULTS; // DUMMY_RESULTS에서 직접 비구조화 할당

  // 1. 학습 시간 (임시로 390000ms를 가정 = 6분 30초)
  // 💡 실제 앱에서는 이 값이 학습 시작/종료 시점을 기반으로 상위 컴포넌트/상태에서 전달되어야 합니다.
  const learningDurationMs = 390000;
  const learningTime = useMemo(
    () => formatDuration(learningDurationMs),
    [learningDurationMs],
  );

  // 2. 완료 날짜 (실시간으로 가져와서 형식화)
  const completionDate = useMemo(() => getFormattedCompletionDate(), []);

  // 3. 말풍선 텍스트 및 캐릭터 이미지 결정 로직
  const { speechBubbleText, mascotImage: characterImageSrc } = useMemo(() => {
    let text = '';
    let mascot: MascotImage;

    if (correctCount === totalCount) {
      text = 'Perfect!!!';
      mascot = 'shining';
    } else if (correctCount >= totalCount * (2 / 3)) {
      // 3분의 2 이상
      text = "It's not bad~";
      // imgSrc = goodImg;
      mascot = 'smile';
    } else if (correctCount >= totalCount * (1 / 2)) {
      // 절반 이상
      text = 'So so~';
      // imgSrc = sosoImg;
      mascot = 'thinking';
    } else {
      // 절반 이하
      text = "I'm sorry ..";
      // imgSrc = badImg;
      mascot = 'gloomy';
    }
    return { speechBubbleText: text, mascotImage: mascot };
  }, [correctCount, totalCount]); // correctCount 또는 totalCount가 변경될 때마다 재계산

  // 1. 로그아웃 핸들러
  // const handleLogout = () => navigate('/auth/login');

  // 2. Review 페이지 이동 핸들러
  const handleReview = () => navigate('/mainpage/learn/review');

  // 3. Try again (현재 학습 시작 화면으로 돌아감)
  const handleTryAgain = () => {
    navigate(`/mainPage/learn/${topicName}`);
  };

  // 4. Next learning (다음 학습) 핸들러
  const handleNextLearning = () => {
    navigate('/mainpage/learnList');
  };

  return (
    <div className={styles.learnCompleteContainer}>
      <Header hasBackButton />

      <Mascot image={characterImageSrc} text={speechBubbleText} />

      {/* 4. 세션 완료 결과 카드 (주황색 배경) */}
      <div className={styles.completeCard}>
        <h1 className={styles.sessionCompleteTitle}>Session Complete!</h1>

        {/* 결과 박스 (검은색 배경) */}
        <div className={styles.resultsBox}>
          {/* 1. 학습 이름: Casual_Emotions Result */}
          <h2 className={styles.comresultsTopicTitle}>{topicName} Result</h2>

          {/* 2. 정답 수: 18/25 Vocabularies correct */}
          <ResultRow
            icon={CheckCircle}
            value={`${correctCount}/${totalCount} Vocabularies correct`}
          />

          {/* 3. 학습 시간: **formatDuration 함수 사용** */}
          <ResultRow icon={Clock} value={learningTime} />

          {/* 4. 날짜: **getFormattedCompletionDate 함수 사용** */}
          <ResultRow icon={Calendar} value={completionDate} />
        </div>

        {/* Review / Try Again 버튼 */}
        <div className={styles.actionButtonsRow}>
          <button onClick={handleReview} className={styles.actionButton}>
            Review
          </button>
          <button onClick={handleTryAgain} className={styles.actionButton}>
            Try again
          </button>
        </div>

        {/* Next learning 버튼 */}
        <button onClick={handleNextLearning} className={styles.nextLearningButton}>
          Next learning
        </button>
      </div>
    </div>
  );
};

export default LearnComplete;
