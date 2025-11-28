// src/pages/krLearn/learnComplete/learnComplete.tsx
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './learnComplete.module.css';
import Header from '@/components/layout/Header/Header';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';
import { http } from '../../../apis/http';
import Clock from '@/assets/Clock.png';
import Check from '@/assets/sentenceCrt.png';
import Calendar from '@/assets/Calendar.png';
import ContentSection from '@/components/layout/ContentSection/ContentSection';
import Button from '@/components/Button/Button';
import SpinnerIcon from '@/components/icons/SpinnerIcon/SpinnerIcon';

// --- API 응답 타입 ---
interface SummaryBody {
  resultId: number;
  sessionId: number;
  sessionTitle: string;
  totalCount: number;
  correctCount: number;
  durationSeconds: number;
  completedAt: string;
}
interface SummaryResponse {
  status: { statusCode: string; message: string; description: string | null };
  body: SummaryBody;
}

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

const formatDuration = (durationMs: number): string => {
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
};

const formatDate = (dateString: string): string => {
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

const LS_LEARNING_TIMES_KEY = 'learning_completion_times';
interface CompletionTime {
  time: string;
  completedAt: number;
}
type LearningTimes = { [sessionId: number]: CompletionTime };

const saveLocalLearningTime = (sessionId: number, durationSeconds: number) => {
  if (sessionId === null || durationSeconds === 0) return;
  const timeString = formatDuration(durationSeconds * 1000);
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

const ResultRow = ({ icon, value }: { icon: string; value: string }) => (
  <div className={styles.resultRow}>
    <img src={icon} alt="icon" className={styles.resultIcon} />
    <span className={styles.resultValue}>{value}</span>
  </div>
);

interface LocationState {
  sessionId?: number;
  categoryName?: string;
}

interface SummaryData extends SummaryBody {
  categoryName: string;
}

const LearnComplete: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const currentSessionId = state?.sessionId ? Number(state.sessionId) : null;
  const categoryName = state?.categoryName || 'TOPIK';

  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🔥 [수정 1] 중복 요청 방지용 ref 추가
  const hasFetched = useRef(false);

  useEffect(() => {
    console.log('🏁 [LearnComplete] Received Session ID:', currentSessionId);
  }, [currentSessionId]);

  // 🔥 [수정 2] fetchSummary 제거하고 useEffect 내부에 로직 통합 (중복 방지 적용)
  useEffect(() => {
    if (!currentSessionId) {
      navigate('/main/learnList');
      return;
    }

    // 이미 데이터를 가져왔으면 실행 중단
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchPayload = async () => {
      setIsLoading(true);
      try {
        const response = await http.get<SummaryResponse>(
          `/learning/${currentSessionId}/results/summary`,
        );
        
        const data = response.data.body;
        const result: SummaryData = {
          ...data,
          categoryName: categoryName,
        };

        setSummaryData(result);
        saveLocalLearningTime(result.sessionId, result.durationSeconds);
        
        console.log(`[LearnComplete] Fetched Summary for Session ${currentSessionId}`);
      } catch (error) {
        console.error('Failed to fetch summary:', error);
        alert('학습 결과를 불러오지 못했습니다. 목록으로 이동합니다.');
        navigate('/main/learnList');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayload();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 마운트 시 1회만 실행

  const { correctCount, totalCount, durationSeconds, sessionTitle, completedAt, resultId } = summaryData || {};

  const learningTime = useMemo(
    () => summaryData && durationSeconds !== undefined ? formatDuration(durationSeconds * 1000) : '0m 0s',
    [durationSeconds, summaryData],
  );
  const completionDate = useMemo(() => completedAt ? formatDate(completedAt) : 'N/A', [completedAt]);

  const { speechBubbleText, mascotImage: characterImageSrc } = useMemo(() => {
    let text = '';
    let mascot: MascotImage;
    if (totalCount && correctCount !== undefined) {
      if (correctCount === totalCount) {
        text = 'Perfect!!!';
        mascot = 'shining';
      } else if (correctCount >= totalCount * (2 / 3)) {
        text = "It's not bad~";
        mascot = 'smile';
      } else if (correctCount >= totalCount * (1 / 2)) {
        text = 'So so~';
        mascot = 'thinking';
      } else {
        text = "I'm sorry ..";
        mascot = 'gloomy';
      }
    } else {
      text = 'Completed!';
      mascot = 'smile';
    }
    return { speechBubbleText: text, mascotImage: mascot };
  }, [correctCount, totalCount]);

  const handleBackToLearnList = () => {
    navigate('/main/learnList');
  };

  // 🔥 [수정 3] handleReview는 순수하게 이동 로직만 수행
  const handleReview = () => {
    if (!currentSessionId || !resultId) {
      alert('Review data is not ready.');
      return;
    }
    navigate('/main/learn/review', {
      state: {
        sessionId: currentSessionId,
        resultId: resultId,
        topicName: sessionTitle,
        categoryName: categoryName,
      },
    });
  };

  const handleTryAgain = () => {
    if (currentSessionId) {
      navigate(`/main/learn/${currentSessionId}`, {
        state: { categoryName: categoryName },
      });
    } else {
      navigate('/main/learnList');
    }
  };

  const handleNextLearning = async () => {
    try {
      const response = await http.get<NextLearningResponse>(
        '/learning/sessions',
        {
          params: {
            limit: 20,
            category: categoryName,
          },
        },
      );

      const sessions = response.data.body.sessions;

      if (sessions && sessions.length > 0) {
        let nextSession = sessions.find(
          (s) => !s.completed && s.id !== currentSessionId,
        );
        if (!nextSession) {
          nextSession = sessions.find((s) => s.id > (currentSessionId || 0));
        }
        if (!nextSession) {
          nextSession = sessions.find((s) => s.id !== currentSessionId);
        }

        if (nextSession) {
          navigate(`/main/learn/${nextSession.id}`, {
            state: { categoryName: categoryName },
          });
        } else {
          alert('더 이상 진행할 학습이 없습니다. 목록으로 이동합니다.');
          navigate('/main/learnList');
        }
      } else {
        alert('학습 가능한 세션이 없습니다.');
        navigate('/main/learnList');
      }
    } catch (error) {
      console.error('Failed to fetch next learning session:', error);
      navigate('/main/learnList');
    }
  };

  if (isLoading || !summaryData) {
    return (
         <div className={styles.spinnerWrapper}>
        <SpinnerIcon></SpinnerIcon>
      </div>
    );
  }

  const { correctCount: finalCorrectCount, totalCount: finalTotalCount, sessionTitle: finalSessionTitle } = summaryData;

  return (
    <div className={styles.learnCompleteContainer}>
      <Header hasBackButton customBackAction={handleBackToLearnList} />

      <Mascot image={characterImageSrc} text={speechBubbleText} />

      <ContentSection className={styles.completeCard}>
        <h1 className={styles.sessionCompleteTitle}>Session Complete!</h1>
        <div className={styles.resultsBox}>
          <h2 className={styles.comresultsTopicTitle}>{finalSessionTitle} Result</h2>
          <hr className={styles.divider} />
          <ResultRow
            icon={Check}
            value={`${finalCorrectCount}/${finalTotalCount} Vocabularies correct`}
          />
          <hr className={styles.divider} />
          <ResultRow icon={Clock} value={learningTime} />
          <hr className={styles.divider} />
          <ResultRow icon={Calendar} value={completionDate} />
        </div>

        <div className={styles.actionButtonsRow}>
          <Button onClick={handleReview} className={styles.actionButton}>
            Review
          </Button>
          <Button onClick={handleTryAgain} className={styles.actionButton}>
            Try again
          </Button>
        </div>

        <Button
          isFull
          onClick={handleNextLearning}
          className={styles.nextLearningButton}
        >
          Next learning
        </Button>
      </ContentSection>
    </div>
  );
};

export default LearnComplete;