import React, { useMemo, useEffect } from 'react';
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

// 로컬 스토리지 타입 및 저장 로직
const LS_LEARNING_TIMES_KEY = 'learning_completion_times';
interface CompletionTime {
    time: string; // 'Xm Ys' 형식
    completedAt: number; // 타임스탬프
}
type LearningTimes = { [sessionId: number]: CompletionTime };

const saveLocalLearningTime = (sessionId: number, durationMs: number) => {
    if (sessionId === null || durationMs === 0) return;
    
    const timeString = formatDuration(durationMs);
    const newCompletion: CompletionTime = {
        time: timeString,
        completedAt: Date.now(),
    };
    
    try {
        const storedData = localStorage.getItem(LS_LEARNING_TIMES_KEY);
        const times: LearningTimes = storedData ? JSON.parse(storedData) : {};
        
        times[sessionId] = newCompletion;
        
        localStorage.setItem(LS_LEARNING_TIMES_KEY, JSON.stringify(times));
        console.log(`[LearnComplete] Saved completion time for Session ${sessionId}: ${timeString}`);
    } catch (e) {
        console.error('Failed to save local learning time', e);
    }
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

interface LocationState {
  sessionId?: number;
  resultId?: number;
  results?: WordResult[];
  topicName?: string;
  learningDuration?: number;
  categoryName?: string;

  totalCount?: number;
}

const LearnComplete: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const results = state?.results || []; 
  const currentSessionId = state?.sessionId ? Number(state.sessionId) : null;
  const topicName = state?.topicName || 'Result'; 
  const learningDurationMs = state?.learningDuration || 0;

  const categoryName = state?.categoryName || 'TOPIK';

  const correctCount = results.filter(r => r.isCorrect).length;
  const totalCount = state?.totalCount || results.length || 0;

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
   
  useEffect(() => {
    if (currentSessionId && learningDurationMs > 0) {
        saveLocalLearningTime(currentSessionId, learningDurationMs);
    }
  }, [currentSessionId, learningDurationMs]);


  // 🔥 [추가] 헤더 뒤로가기 버튼 클릭 시 learnList로 이동하는 핸들러
  const handleBackToLearnList = () => {
    navigate('/mainpage/learnList');
  };

  // 핸들러
  const handleReview = () => {
    navigate('/mainpage/learn/review', {
        state: {
            sessionId: currentSessionId,
            resultId: state?.resultId,
            results: results,
            topicName: topicName,
            learningTime: learningTime,
        }
    });
  };

  const handleTryAgain = () => {
    if (currentSessionId) {
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
      
      const response = await http.get<NextLearningResponse>('/learning/sessions', {
        params: { 
            limit: 20,
            category: categoryName
        }
      });

      const sessions = response.data.body.sessions;

      if (sessions && sessions.length > 0) {
        let nextSession = sessions.find(s => !s.completed && s.id !== currentSessionId);
        
        if (!nextSession) {
            nextSession = sessions.find(s => s.id > (currentSessionId || 0));
        }

        if (!nextSession) {
            nextSession = sessions.find(s => s.id !== currentSessionId);
        }

        if (nextSession) {
            console.log(`[Next Learning] Starting: ${nextSession.title}`);
            
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
      {/* 🔥 [중요] customBackAction이 적용된 헤더 */}
      <Header hasBackButton customBackAction={handleBackToLearnList} />
      
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