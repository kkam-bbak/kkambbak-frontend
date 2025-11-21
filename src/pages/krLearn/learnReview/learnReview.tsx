import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, Calendar } from 'lucide-react';
import styles from './learnReview.module.css';
import type { WordResult } from '../learnStart/learnStart'; // 경로 확인!

interface ReviewState {
  sessionId?: number;
  resultId?: number;
  results?: WordResult[]; 
  topicName?: string; 
  learningTime?: string; 
}

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

const LearnReview: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ReviewState;
  
  const wordResults = state?.results || [];
  const topicName = state?.topicName || 'Result';
  const sessionId = state?.sessionId;
  const resultId = state?.resultId;
  const learningTime = state?.learningTime || "0m 0s"; 

  const totalCount = wordResults.length;
  const correctCount = wordResults.filter((w) => w.isCorrect).length;
  
  const completionDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const handleWrongOnlyTryAgain = () => {
    if (!sessionId) { navigate('/mainpage/learnList'); return; }

    const incorrectWords = wordResults.filter((w) => !w.isCorrect);
    if (incorrectWords.length === 0) {
        alert("틀린 문제가 없습니다! 완벽해요 🎉");
        return;
    }

    navigate(`/mainPage/learn/${sessionId}`, {
      state: {
        isRetryWrong: true,       
        baseResultId: resultId,   
        wordsToRetry: incorrectWords, 
        sessionId: sessionId
      }
    });
  };

  const handleTryAgain = () => {
    if (sessionId) {
      navigate(`/mainPage/learn/${sessionId}`);
    } else {
      navigate('/mainpage/learnList');
    }
  };

  return (
    <div className={styles.ReviewPageContainer}>
      <div className={styles.reviewHeader}>
        <h1 className={styles.reviewTitle}>Session Result Review</h1>
        <div className={styles.reviewResultsBox}>
          <h2 className={styles.resultsTopicTitle}>{topicName} Result</h2>
          <ResultRow icon={CheckCircle} value={`${correctCount}/${totalCount} Vocabularies correct`} />
          <ResultRow icon={Clock} value={learningTime} />
          <ResultRow icon={Calendar} value={completionDate} />
        </div>
      </div>

      <div className={styles.wordResultList}>
        {wordResults.length === 0 ? (
            <div style={{color:'white', textAlign:'center', padding:'20px'}}>No review data.</div>
        ) : (
            wordResults.map((word, index) => (
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
          disabled={correctCount === totalCount} 
          style={correctCount === totalCount ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
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