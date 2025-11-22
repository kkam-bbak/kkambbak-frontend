import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, Calendar } from 'lucide-react';
import styles from './learnReview.module.css';
import { http } from '../../../apis/http';
import type { WordResult } from '../learnStart/learnStart'; // 경로 확인!

// --- API 인터페이스 정의 ---
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
// --- API 인터페이스 정의 끝 ---


interface ReviewState {
  sessionId?: number; // 세션 ID (API 호출에 사용)
  resultId?: number; // (기존 로직 대비 유지)
  results?: WordResult[]; // (최초 학습 결과 전달 시 사용)
  topicName?: string; 
  learningTime?: string; 
  isUpdateComplete?: boolean; // 업데이트 완료 후 진입 플래그
}

// ... (ResultRow, WordResultRow 컴포넌트 유지) ...
const ResultRow = ({ icon: Icon, value }: { icon: React.ElementType; value: string }) => (
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
      <span className={`${styles.resultTag} ${isCorrect ? styles.correct : styles.wrong}`}>
        {isCorrect ? 'Correct' : 'Wrong'}
      </span>
    )}
  </div>
);

// --- 헬퍼 함수 ---
const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
};
const formatDate = (dateString: string) => {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    } catch {
        return 'N/A';
    }
};


const LearnReview: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ReviewState;
  
  const initialSessionId = state?.sessionId;
  const isUpdateComplete = state?.isUpdateComplete || false;


  const [reviewData, setReviewData] = useState<{
      sessionId: number | undefined;
      topicName: string;
      learningTime: string;
      wordResults: WordResult[];
      totalCount: number;
      correctCount: number;
      isLoading: boolean;
      completionDate: string;
  }>({
      sessionId: initialSessionId,
      topicName: 'Result',
      learningTime: '0m 0s',
      wordResults: [],
      totalCount: 0,
      correctCount: 0,
      isLoading: initialSessionId ? true : false, // sessionId가 있으면 로딩 시작
      completionDate: formatDate(new Date().toISOString()),
  });

  // 💡 [핵심] API를 통해 세션의 최종 결과를 가져오는 함수
  const fetchReviewResult = useCallback(async (sId: number) => {
      setReviewData(prev => ({ ...prev, isLoading: true }));
      try {
          const response = await http.get<ReviewResponse>(`/learning/${sId}/results/review`);
          const { summary, items } = response.data.body;
          
          const wordResults: WordResult[] = items.map(item => ({
              romnized: item.romanization,
              korean: item.korean,
              translation: item.english,
              isCorrect: item.correct,
          }));

          setReviewData({
              sessionId: sId,
              topicName: summary.sessionTitle,
              learningTime: formatDuration(summary.durationSeconds),
              wordResults: wordResults,
              totalCount: summary.totalCount,
              correctCount: summary.correctCount,
              isLoading: false,
              completionDate: formatDate(summary.completedAt),
          });
      } catch (error) {
          console.error("Failed to fetch review result:", error);
          setReviewData(prev => ({ ...prev, isLoading: false }));
          alert("최종 결과를 불러오는 데 실패했습니다. 학습 목록으로 돌아갑니다.");
          navigate('/mainpage/learnList'); 
      }
  }, [navigate]);


  useEffect(() => {
      // 컴포넌트가 마운트되거나 sessionId가 state로 전달되면 API 호출
      if (initialSessionId && reviewData.isLoading) {
          fetchReviewResult(initialSessionId);
      }
      // 최초 진입 시 state에 results가 있으면 (LearnComplete -> Review 경로) API를 사용하지 않고 바로 표시
      else if (!initialSessionId && state?.results && state.results.length > 0) {
          setReviewData({
              sessionId: state.sessionId,
              topicName: state.topicName || 'Result',
              learningTime: state.learningTime || '0m 0s',
              wordResults: state.results,
              totalCount: state.results.length,
              correctCount: state.results.filter(w => w.isCorrect).length,
              isLoading: false,
              completionDate: formatDate(new Date().toISOString()),
          });
      }
  }, [initialSessionId, state]);


  const handleWrongOnlyTryAgain = () => {
    const { sessionId, wordResults, correctCount, totalCount } = reviewData;
    if (!sessionId) { navigate('/mainpage/learnList'); return; }

    const incorrectWords = wordResults.filter((w) => !w.isCorrect);
    if (incorrectWords.length === 0) {
        alert("틀린 문제가 없습니다! 완벽해요 🎉");
        return;
    }

    // 재도전 시 baseResultId는 API로 조회된 현재 결과의 resultId를 사용해야 하나,
    // API 응답에서 resultId를 사용하지 않고 sessionId 기반으로 재시작합니다.
    // 서버가 재도전 결과를 처리할 때 '최초의' resultId를 알고 있을 것이므로,
    // 여기서는 baseResultId에 resultId(summary에서 가져온)를 넣어줍니다.
    
    navigate(`/mainPage/learn/${sessionId}`, {
      state: {
        isRetryWrong: true,       
        baseResultId: state.resultId, // 최초 학습 후 전달받은 resultId를 재활용하거나, summary에서 조회된 resultId 사용 (현재는 summary.resultId 사용 불가)
        wordsToRetry: incorrectWords, 
        sessionId: sessionId
      }
    });
  };

  const handleTryAgain = () => {
    if (reviewData.sessionId) {
      navigate(`/mainPage/learn/${reviewData.sessionId}`);
    } else {
      navigate('/mainpage/learnList');
    }
  };
    
  if (reviewData.isLoading) {
    return (
      <div className={styles.ReviewPageContainer}>
        <h1 className={styles.reviewTitle}>Loading Session Result...</h1>
        <p>Loading the latest review data via API...</p>
      </div>
    );
  }

  // 재도전 완료 후 업데이트된 결과를 보여줄 때 제목 변경
  const displayTitle = isUpdateComplete ? `✅ Result Updated for ${reviewData.topicName}` : `${reviewData.topicName} Session Review`;


  return (
    <div className={styles.ReviewPageContainer}>
      <div className={styles.reviewHeader}>
        <h1 className={styles.reviewTitle}>{displayTitle}</h1>
        <div className={styles.reviewResultsBox}>
          <h2 className={styles.resultsTopicTitle}>{reviewData.topicName} Result</h2>
          <ResultRow icon={CheckCircle} value={`${reviewData.correctCount}/${reviewData.totalCount} Vocabularies correct`} />
          <ResultRow icon={Clock} value={reviewData.learningTime} />
          <ResultRow icon={Calendar} value={reviewData.completionDate} />
        </div>
      </div>

      <div className={styles.wordResultList}>
        {reviewData.wordResults.length === 0 ? (
            <div style={{color:'white', textAlign:'center', padding:'20px'}}>No review data.</div>
        ) : (
            reviewData.wordResults.map((word, index) => (
              <div key={word.romnized || index} className={styles.rvWordResultContainer}>
                <WordResultRow label="Romnized" value={word.romnized} isResult={true} isCorrect={word.isCorrect} />
                <WordResultRow label="Korean" value={word.korean} />
                <WordResultRow label="Translation" value={word.translation} />
              </div>
            ))
        )}
      </div>

      <div className={styles.reviewActionContainer}>
        <button
          className={styles.reviewActionButton}
          onClick={handleWrongOnlyTryAgain}
          disabled={reviewData.correctCount === reviewData.totalCount} 
          style={reviewData.correctCount === reviewData.totalCount ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        >
          Only wrong try Again
        </button>
        <button className={styles.reviewActionButton} onClick={handleTryAgain}>
          Try again
        </button>
      </div>
    </div>
  );
};

export default LearnReview;