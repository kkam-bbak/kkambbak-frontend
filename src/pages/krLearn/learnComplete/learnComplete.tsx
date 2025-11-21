import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; 
import { CheckCircle, Clock, Calendar } from 'lucide-react';
import type { WordResult } from '../learnStart/learnStart'; // 경로 확인!
import styles from './learnComplete.module.css';
import Header from '@/components/layout/Header/Header';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';
import { http } from '../../../apis/http';

// 유틸리티
const formatDuration = (durationMs: number): string => {
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
};

const getFormattedCompletionDate = (): string => {
  const now = new Date();
  return now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

// API 응답 타입
interface Session {
  id: number;
  title: string;
  categoryName: string;
  vocabularyCount: number;
  completed: boolean;
  durationSeconds: number;
}
interface NextLearningResponse {
  status: { statusCode: string; message: string; description: string | null };
  body: {
    categoryName: string;
    sessions: Session[];
    nextCursor: number | null;
    hasNext: boolean;
  };
}

const ResultRow = ({ icon: Icon, value }: { icon: React.ElementType; value: string }) => (
  <div className={styles.resultRow}>
    <Icon className={styles.resultIcon}/>
    <span className={styles.resultValue}>{value}</span>
  </div>
);

// 전달받을 데이터 타입
interface LocationState {
  sessionId?: number;
  resultId?: number;
  results?: WordResult[];
  topicName?: string;
  learningDuration?: number; // 시간
}

const LearnComplete: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const results = state?.results || []; 
  const currentSessionId = state?.sessionId ? Number(state.sessionId) : null;
  const topicName = state?.topicName || 'Result'; 
  const learningDurationMs = state?.learningDuration || 0;

  const correctCount = results.filter(r => r.isCorrect).length;
  const totalCount = results.length || 0;

  // 시간 포맷팅
  const learningTime = useMemo(() => formatDuration(learningDurationMs), [learningDurationMs]);
  const completionDate = useMemo(() => getFormattedCompletionDate(), []);

  const { speechBubbleText, mascotImage: characterImageSrc } = useMemo(() => {
    let text = '';
    let mascot: MascotImage;
    if (totalCount > 0 && correctCount === totalCount) { text = 'Perfect!!!'; mascot = 'shining'; } 
    else if (totalCount > 0 && correctCount >= totalCount * (2 / 3)) { text = "It's not bad~"; mascot = 'smile'; } 
    else if (totalCount > 0 && correctCount >= totalCount * (1 / 2)) { text = 'So so~'; mascot = 'thinking'; } 
    else { text = "I'm sorry .."; mascot = 'gloomy'; }
    return { speechBubbleText: text, mascotImage: mascot };
  }, [correctCount, totalCount]);

  // 핸들러
  const handleReview = () => {
    navigate('/mainpage/learn/review', {
        state: {
            sessionId: currentSessionId,
            resultId: state?.resultId,
            results: results,
            topicName: topicName,
            learningTime: learningTime // 시간 전달
        }
    });
  };

  const handleTryAgain = () => {
    if (currentSessionId) {
      navigate(`/mainPage/learn/${currentSessionId}`); 
    } else {
      navigate('/mainpage/learnList');
    }
  };

  const handleNextLearning = async () => {
    try {
      const response = await http.get<NextLearningResponse>('/api/v1/learning/sessions', {
        params: { limit: 10 }
      });
      const sessions = response.data.body.sessions;

      if (sessions && sessions.length > 0) {
        // 현재 완료한 ID가 아닌 다른 세션 찾기
        const nextSession = sessions.find(s => s.id !== currentSessionId);
        if (nextSession) {
            navigate(`/mainPage/learn/${nextSession.id}`);
        } else {
            alert("다음 학습 세션이 없습니다.");
            navigate('/mainpage/learnList');
        }
      } else {
        alert("학습 가능한 세션이 없습니다.");
        navigate('/mainpage/learnList');
      }
    } catch (error) {
      console.error("Failed to fetch next learning session:", error);
      navigate('/mainpage/learnList');
    }
  };

  return (
    <div className={styles.learnCompleteContainer}>
      <Header hasBackButton />
      <Mascot image={characterImageSrc} text={speechBubbleText} />
      <div className={styles.completeCard}>
        <h1 className={styles.sessionCompleteTitle}>Session Complete!</h1>
        <div className={styles.resultsBox}>
          <h2 className={styles.comresultsTopicTitle}>{topicName} Result</h2>
          <ResultRow icon={CheckCircle} value={`${correctCount}/${totalCount} Vocabularies correct`} />
          <ResultRow icon={Clock} value={learningTime} />
          <ResultRow icon={Calendar} value={completionDate} />
        </div>
        <div className={styles.actionButtonsRow}>
          <button onClick={handleReview} className={styles.actionButton}>Review</button>
          <button onClick={handleTryAgain} className={styles.actionButton}>Try again</button>
        </div>
        <button onClick={handleNextLearning} className={styles.nextLearningButton}>
          Next learning
        </button>
      </div>
    </div>
  );
};

export default LearnComplete;