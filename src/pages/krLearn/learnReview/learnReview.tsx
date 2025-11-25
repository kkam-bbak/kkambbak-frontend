// LearnReview.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, Calendar } from 'lucide-react';
import styles from './learnReview.module.css';
import { http } from '../../../apis/http';
import Header from '@/components/layout/Header/Header';
// Mascot 관련 주석 처리 (리뷰 페이지에는 마스코트 로직이 불필요)
// import Mascot, { MascotImage } from '@/components/Mascot/Mascot';
import type { WordResult } from '../learnStart/learnStart';
import Button from '@/components/Button/Button';
import SpinnerIcon from '@/components/icons/SpinnerIcon/SpinnerIcon';

// --- API 인터페이스 (기존 유지) ---
interface ApiResponseBody<T> {
  status: { statusCode: string; message: string; description: string | null };
  body: T;
}

interface ReviewSummary {
  sessionId: number;
  resultId: number; // 🔥 가장 중요한 최신 결과 ID
  sessionTitle: string;
  totalCount: number;
  correctCount: number;
  durationSeconds: number;
  completedAt: string;
}

interface ReviewItem {
  vocabularyId: number;
  korean: string;
  romanization: string;
  english: string;
  correct: boolean;
}

interface ReviewApiResultBody {
  summary: ReviewSummary;
  items: ReviewItem[];
}
type ReviewResponse = ApiResponseBody<ReviewApiResultBody>;

// LocationState 간소화 (API로 모든 데이터 대체)
interface ReviewState {
  sessionId?: number;
  resultId?: number; // LearnComplete에서 받은 최신 resultId (API 호출 시 사용)
  topicName?: string; // (선택) 로딩 전 표시용
  isUpdateComplete?: boolean; // 재학습 후 돌아왔는지 여부
  isRetryWrong?: boolean; // 재학습 모드였는지 여부
  categoryName?: string; // Try Again 시 필요
}

// ... (로컬 스토리지 로직 및 유틸리티 함수 - formatDuration, formatDate, saveLocalLearningTime - 기존 유지) ...
const LS_LEARNING_TIMES_KEY = 'learning_completion_times';
interface CompletionTime {
  time: string;
  completedAt: number;
}
type LearningTimes = { [sessionId: number]: CompletionTime };

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
};

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return 'N/A';
  }
};

const saveLocalLearningTime = (sessionId: number, durationSeconds: number) => {
  if (!sessionId || durationSeconds === 0) return;
  const timeString = formatDuration(durationSeconds);
  const newCompletion: CompletionTime = {
    time: timeString,
    completedAt: Date.now(),
  };
  try {
    const storedData = localStorage.getItem(LS_LEARNING_TIMES_KEY);
    const times: LearningTimes = storedData ? JSON.parse(storedData) : {};
    times[sessionId] = newCompletion;
    localStorage.setItem(LS_LEARNING_TIMES_KEY, JSON.stringify(times));
  } catch (e) {
    console.error('Failed to save local learning time', e);
  }
};
// ... (ResultRow, WordResultRow 컴포넌트 - 기존 유지) ...
const ResultRow = ({
  icon: Icon,
  value,
}: {
  icon: React.ElementType;
  value: string;
}) => (
  <div className={styles.resultRow}>
    <Icon className={styles.resultIcon} />
    <span className={styles.resultValue}>{value}</span>
  </div>
);

const WordResultRow: React.FC<{
  label: string;
  value: string;
  isResult?: boolean;
  isCorrect?: boolean;
}> = ({ label, value, isResult = false, isCorrect }) => (
  <div className={styles.WordResultRow}>
    <span className={styles.wordLabel}>{label}</span>
    <span className={styles.wordValue}>{value}</span>
    {isResult && (
      <span
        className={`${styles.resultTag} ${
          isCorrect ? styles.correct : styles.wrong
        }`}
      >
        {isCorrect ? 'Correct' : 'Wrong'}
      </span>
    )}
  </div>
);


const LearnReview: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ReviewState;

  const initialSessionId = state?.sessionId;
  const initialResultId = state?.resultId; // API 호출 시 사용 가능 (최신 결과 보장)
  const isUpdateComplete = state?.isUpdateComplete || false;
  const isRetryWrong = state?.isRetryWrong || false;
  const categoryName = state?.categoryName || 'TOPIK';

  // API 호출로 채워질 초기 상태
  const [reviewData, setReviewData] = useState<{
    sessionId: number | undefined;
    resultId: number | undefined;
    topicName: string;
    learningTime: string;
    rawDurationSeconds: number;
    wordResults: WordResult[];
    totalCount: number;
    correctCount: number;
    isLoading: boolean;
    completionDate: string;
  }>({
    sessionId: initialSessionId,
    resultId: initialResultId,
    topicName: state?.topicName || 'Result', // 로딩 전 표시용
    learningTime: '0m 0s',
    rawDurationSeconds: 0,
    wordResults: [],
    totalCount: 0,
    correctCount: 0,
    isLoading: !!initialSessionId, // 세션 ID가 있다면 무조건 로딩 시작
    completionDate: 'N/A',
  });

  // 🔥 API로 최신 결과 가져오기 (useCallback을 사용하여 의존성 최적화)
  const fetchReviewResult = useCallback(
    async (sId: number) => {
      setReviewData((prev) => ({ ...prev, isLoading: true }));
      try {
        const response = await http.get<ReviewResponse>(
          `/learning/${sId}/results/review`, // ✅ Review API 호출
        );
        const { summary, items } = response.data.body;

        const wordResults: WordResult[] = items.map((item) => ({
          romnized: item.romanization,
          korean: item.korean,
          translation: item.english,
          isCorrect: item.correct,
          // WordResult 타입에 맞는 추가 필드 필요 시 여기서 매핑
        }));

        setReviewData({
          sessionId: sId,
          resultId: summary.resultId, // ✅ 서버가 준 최신 resultId로 갱신
          topicName: summary.sessionTitle,
          learningTime: formatDuration(summary.durationSeconds),
          rawDurationSeconds: summary.durationSeconds,
          wordResults: wordResults,
          totalCount: summary.totalCount,
          correctCount: summary.correctCount,
          isLoading: false,
          completionDate: formatDate(summary.completedAt),
        });
        console.log(`[LearnReview] Fetched Review Result for Session ${sId}`);
      } catch (error) {
        console.error('Failed to fetch review result:', error);
        setReviewData((prev) => ({ ...prev, isLoading: false }));
        alert('결과를 불러오지 못했습니다. 목록으로 이동합니다.');
        navigate('/main/learnList');
      }
    },
    [navigate],
  );

  useEffect(() => {
    // 세션 ID가 있다면 무조건 API 호출
    if (initialSessionId) {
      fetchReviewResult(initialSessionId);
    } else {
      navigate('/main/learnList'); // 세션 ID 없으면 목록으로 이동
    }
  }, [initialSessionId, fetchReviewResult, navigate]); // initialSessionId와 fetchReviewResult에 의존

  // 뒤로 가기 (완료 페이지로)
  const handleBackButtonClick = () => {
    // ⭐ 완료 페이지 이동 로직 (결과 데이터를 API로 가져오게 했으므로, 최소한의 정보만 전달)
    navigate('/main/learn/complete', {
      state: {
        sessionId: reviewData.sessionId,
        categoryName: categoryName, // Next learning을 위해 카테고리 정보 유지
        // 완료 페이지는 이제 Summary API를 호출하여 데이터를 가져옵니다.
      },
    });
  };

  // 🔥 [핵심] Only Wrong Try Again 핸들러
  const handleWrongOnlyTryAgain = () => {
    // 현재 화면에 보이는 최신 데이터 사용
    const { sessionId, wordResults, resultId } = reviewData;

    if (!sessionId || !resultId) {
      alert('Review data is not fully loaded.');
      return;
    }

    // 틀린 단어 필터링
    const incorrectWords = wordResults.filter((w) => !w.isCorrect);

    if (incorrectWords.length === 0) {
      alert('All correct! Perfect 🎉');
      return;
    }

    // 다시 LearnStart로 이동하되, 방금 받은 최신 resultId를 base로 전달
    navigate(`/main/learn/${sessionId}`, {
      state: {
        isRetryWrong: true,
        baseResultId: resultId, // ✅ 갱신된 ID를 넘겨야 연속 재도전 가능
        wordsToRetry: incorrectWords,
        sessionId: sessionId,
        categoryName: categoryName,
      },
    });
  };

  const handleTryAgain = () => {
    if (reviewData.sessionId) {
      navigate(`/main/learn/${reviewData.sessionId}`, {
        state: { categoryName: categoryName },
      });
    } else {
      navigate('/main/learnList');
    }
  };

  if (reviewData.isLoading) {
    return (
      <div className={styles.spinner}>
        <SpinnerIcon />
      </div>
    );
  }

  const displayTitle = isUpdateComplete
    ? `Result Updated`
    : `${reviewData.topicName} Session Review`;

  // 🔥 [버튼 비활성화 조건] 전체 개수와 정답 개수가 같으면 비활성화
  const isAllCorrect =
    reviewData.totalCount > 0 &&
    reviewData.correctCount === reviewData.totalCount;

  return (
    <div className={styles.ReviewPageContainer}>
      <Header hasBackButton customBackAction={handleBackButtonClick} />

      <div className={styles.reviewHeader}>
        <h1 className={styles.reviewTitle}>{displayTitle}</h1>
        <div className={styles.reviewResultsBox}>
          <h2 className={styles.resultsTopicTitle}>
            {reviewData.topicName} Result
          </h2>
          <hr className={styles.divider} />
          <ResultRow
            icon={CheckCircle}
            value={`${reviewData.correctCount}/${reviewData.totalCount} Vocabularies correct`}
          />
          <hr className={styles.divider} />
          <ResultRow icon={Clock} value={reviewData.learningTime} />
          <hr className={styles.divider} />
          <ResultRow icon={Calendar} value={reviewData.completionDate} />
        </div>
      </div>

      {/* ... (WordResultList 부분은 변경 없음) ... */}
      <div className={styles.wordResultList}>
        {reviewData.wordResults.length === 0 ? (
          <div style={{ color: 'white', textAlign: 'center' }}>
            No data available.
          </div>
        ) : (
          reviewData.wordResults.map((word, index) => (
            <div
              key={word.romnized || index}
              className={styles.rvWordResultContainer}
            >
              <WordResultRow
                label="Romnized"
                value={word.romnized}
                isResult={true}
                isCorrect={word.isCorrect}
              />
              <hr className={styles.divider} />
              <WordResultRow label="Korean" value={word.korean} />
              <hr className={styles.divider} />
              <WordResultRow label="Translation" value={word.translation} />
            </div>
          ))
        )}
      </div>

      <div className={styles.reviewActionContainer}>
        <Button
          className={styles.reviewActionButton}
          onClick={handleWrongOnlyTryAgain}
          disabled={isAllCorrect} // 🔥 다 맞으면 비활성화
          style={
            isAllCorrect
              ? {
                  cursor: 'not-allowed',
                  backgroundColor: 'white',
                  color: '#E3E3E3',
                }
              : {}
          }
        >
          Only wrong try Again
        </Button>
        <Button className={styles.reviewActionButton} onClick={handleTryAgain}>
          Try again
        </Button>
      </div>
    </div>
  );
};

export default LearnReview;