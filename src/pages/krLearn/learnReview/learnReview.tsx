import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, Calendar } from 'lucide-react';
import styles from './learnReview.module.css';
import { http } from '../../../apis/http';
import Header from '@/components/layout/Header/Header';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';
import type { WordResult } from '../learnStart/learnStart';
import Button from '@/components/Button/Button';
import SpinnerIcon from '@/components/icons/SpinnerIcon/SpinnerIcon';

// --- API 인터페이스 ---
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

interface ReviewState {
  sessionId?: number;
  resultId?: number;
  results?: WordResult[]; // 최초 학습 완료 시에만 존재
  topicName?: string;
  learningTime?: string;
  learningDuration?: number;
  isUpdateComplete?: boolean; // 재학습 후 돌아왔는지 여부
  isRetryWrong?: boolean; // 재학습 모드였는지 여부
}

// --- 로컬 스토리지 로직 ---
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

// ... (ResultRow, WordResultRow 컴포넌트) ...
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
  const isUpdateComplete = state?.isUpdateComplete || false;
  const isRetryWrong = state?.isRetryWrong || false;

  const [reviewData, setReviewData] = useState<{
    sessionId: number | undefined;
    resultId: number | undefined; // 🔥 최신 resultId 관리
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
    resultId: state?.resultId,
    topicName: state?.topicName || 'Result',
    learningTime: state?.learningTime || '0m 0s',
    rawDurationSeconds: state?.learningDuration
      ? state.learningDuration / 1000
      : 0,
    wordResults: state?.results || [],
    totalCount: state?.results?.length || 0,
    correctCount: state?.results
      ? state.results.filter((w) => w.isCorrect).length
      : 0,
    // sessionId가 있고, (결과 배열이 없거나 || 재학습 후 돌아온 경우) -> 로딩 시작
    isLoading: !!initialSessionId && (!state?.results || isUpdateComplete),
    completionDate: formatDate(new Date().toISOString()),
  });

  // API로 최신 결과 가져오기
  const fetchReviewResult = useCallback(
    async (sId: number) => {
      setReviewData((prev) => ({ ...prev, isLoading: true }));
      try {
        const response = await http.get<ReviewResponse>(
          `/learning/${sId}/results/review`,
        );
        const { summary, items } = response.data.body;

        const wordResults: WordResult[] = items.map((item) => ({
          romnized: item.romanization,
          korean: item.korean,
          translation: item.english,
          isCorrect: item.correct,
        }));

        setReviewData({
          sessionId: sId,
          resultId: summary.resultId, // 🔥 서버가 준 최신 resultId로 갱신
          topicName: summary.sessionTitle,
          learningTime: formatDuration(summary.durationSeconds),
          rawDurationSeconds: summary.durationSeconds,
          wordResults: wordResults,
          totalCount: summary.totalCount,
          correctCount: summary.correctCount,
          isLoading: false,
          completionDate: formatDate(summary.completedAt),
        });
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
    // 로딩이 필요하다고 판단되면 API 호출
    if (initialSessionId && reviewData.isLoading) {
      fetchReviewResult(initialSessionId);
    }
  }, [initialSessionId, reviewData.isLoading, fetchReviewResult]);

  // 뒤로 가기 (완료 페이지로)
  const handleBackButtonClick = () => {
    // 재도전 모드가 아니었을 때만 완료 기록 저장 (기존 로직 유지)
    if (
      !isRetryWrong &&
      reviewData.sessionId &&
      reviewData.rawDurationSeconds > 0
    ) {
      saveLocalLearningTime(
        reviewData.sessionId,
        reviewData.rawDurationSeconds,
      );
    }

    // ⭐ [수정] 목록(/learnList) 대신 완료 페이지(/learn/complete)로 이동
    navigate('/main/learn/complete', {
      state: {
        // 완료 페이지에 필요한 정보를 다시 넘겨줍니다.
        resultId: reviewData.resultId,
        sessionId: reviewData.sessionId,
        // wordResults를 results라는 이름으로 전달 (LearnComplete에서 사용하는 이름 확인 필요)
        results: reviewData.wordResults,
        topicName: reviewData.topicName,
        learningDuration: reviewData.rawDurationSeconds * 1000, // ms 단위로 변환 필요할 수 있음
        categoryName: 'TOPIK', // 카테고리 정보가 있다면 state에서 가져와서 넣기
      },
    });
  };

  // 🔥 [핵심] Only Wrong Try Again 핸들러
  const handleWrongOnlyTryAgain = () => {
    // 현재 화면에 보이는 최신 데이터 사용
    const { sessionId, wordResults, resultId } = reviewData;

    if (!sessionId) {
      navigate('/main/learnList');
      return;
    }

    // 틀린 단어 필터링
    const incorrectWords = wordResults.filter((w) => !w.isCorrect);

    // 혹시라도 틀린 게 없는데 눌렸다면 차단
    if (incorrectWords.length === 0) {
      alert('All correct! Perfect 🎉');
      return;
    }

    // 다시 LearnStart로 이동하되, 방금 받은 최신 resultId를 base로 전달
    navigate(`/main/learn/${sessionId}`, {
      state: {
        isRetryWrong: true,
        baseResultId: resultId, // 🔥 여기가 중요! 갱신된 ID를 넘겨야 연속 재도전 가능
        wordsToRetry: incorrectWords,
        sessionId: sessionId,
        categoryName: 'TOPIK', // 필요 시 카테고리 유지
      },
    });
  };

  const handleTryAgain = () => {
    if (reviewData.sessionId) {
      navigate(`/main/learn/${reviewData.sessionId}`);
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
                  color: 'E3E3E3',
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
