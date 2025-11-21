import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; 
import { CheckCircle, Clock, Calendar } from 'lucide-react';
import type { WordResult } from '../learnStart/learnStart'; 
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

// 🔥 [수정 1] LocationState에 categoryName 추가
interface LocationState {
  sessionId?: number;
  resultId?: number;
  results?: WordResult[];
  topicName?: string;
  learningDuration?: number;
  categoryName?: string; // 🔥 추가됨
}

const LearnComplete: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const results = state?.results || []; 
  const currentSessionId = state?.sessionId ? Number(state.sessionId) : null;
  const topicName = state?.topicName || 'Result'; 
  const learningDurationMs = state?.learningDuration || 0;

  // 🔥 [수정 2] 카테고리 이름 가져오기 (없으면 기본값 'TOPIK')
  const categoryName = state?.categoryName || 'TOPIK';

  const correctCount = results.filter(r => r.isCorrect).length;
  const totalCount = results.length || 0;

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
            learningTime: learningTime,
            // categoryName: categoryName (리뷰 페이지에서도 필요하다면 추가)
        }
    });
  };

  const handleTryAgain = () => {
    if (currentSessionId) {
      // 🔥 Try Again 할 때도 카테고리 정보를 유지해서 보냅니다.
      navigate(`/mainPage/learn/${currentSessionId}`, {
          state: { categoryName: categoryName }
      }); 
    } else {
      navigate('/mainpage/learnList');
    }
  };

  const handleNextLearning = async () => {
    try {
      console.log(`[Next Learning] Fetching list for category: ${categoryName}`);
      
      // 🔥 [수정 3] API 호출 시 category 파라미터 추가 (C007 에러 해결)
      const response = await http.get<NextLearningResponse>('/learning/sessions', {
        params: { 
            limit: 20,
            category: categoryName // 🔥 필수!
        }
      });

      const sessions = response.data.body.sessions;

      if (sessions && sessions.length > 0) {
        // 1순위: 완료 안 된 것 중 다른 ID
        let nextSession = sessions.find(s => !s.completed && s.id !== currentSessionId);
        
        // 2순위: 없으면 그냥 다음 번호
        if (!nextSession) {
            nextSession = sessions.find(s => s.id > (currentSessionId || 0));
        }

        // 3순위: 그것도 없으면 목록의 첫 번째 (현재 ID 제외)
        if (!nextSession) {
            nextSession = sessions.find(s => s.id !== currentSessionId);
        }

        if (nextSession) {
            console.log(`[Next Learning] Starting: ${nextSession.title}`);
            
            // 🔥 [수정 4] 다음 학습으로 이동할 때도 카테고리 정보를 넘겨줘야 계속 유지됨
            navigate(`/mainPage/learn/${nextSession.id}`, {
                state: { categoryName: categoryName }
            });
        } else {
            console.log("[Next Learning] No suitable next session found.");
            alert("더 이상 진행할 학습이 없습니다. 목록으로 이동합니다.");
            navigate('/mainpage/learnList');
        }
      } else {
        console.log("[Next Learning] No sessions returned.");
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