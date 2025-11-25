// src/pages/krLearn/learnReview/learnReview.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, Calendar } from 'lucide-react';
import styles from './learnReview.module.css';
import { http } from '../../../apis/http';
import Header from '@/components/layout/Header/Header';
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
  resultId: number;
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
  topicName?: string;
  isUpdateComplete?: boolean;
  isRetryWrong?: boolean;
  categoryName?: string;
}

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
  const initialResultId = state?.resultId;
  const isUpdateComplete = state?.isUpdateComplete || false;
  const categoryName = state?.categoryName || 'TOPIK';

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
    topicName: state?.topicName || 'Result',
    learningTime: '0m 0s',
    rawDurationSeconds: 0,
    wordResults: [],
    totalCount: 0,
    correctCount: 0,
    isLoading: !!initialSessionId,
    completionDate: 'N/A',
  });

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
          resultId: summary.resultId,
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
    if (initialSessionId) {
      fetchReviewResult(initialSessionId);
    } else {
      navigate('/main/learnList');
    }
  }, [initialSessionId, fetchReviewResult, navigate]);

  const handleBackButtonClick = () => {
    navigate('/main/learn/complete', {
      state: {
        sessionId: reviewData.sessionId,
        categoryName: categoryName,
      },
    });
  };

  const handleWrongOnlyTryAgain = () => {
    const { sessionId, wordResults, resultId } = reviewData;

    if (!sessionId || !resultId) {
      alert('Review data is not fully loaded.');
      return;
    }

    const incorrectWords = wordResults.filter((w) => !w.isCorrect);

    if (incorrectWords.length === 0) {
      alert('All correct! Perfect 🎉');
      return;
    }

    navigate(`/main/learn/${sessionId}`, {
      state: {
        isRetryWrong: true,
        baseResultId: resultId,
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
          disabled={isAllCorrect}
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