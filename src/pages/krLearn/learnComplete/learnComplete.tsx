// LearnComplete.tsx
import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { WordResult } from '../learnStart/learnStart';
import styles from './learnComplete.module.css';
import Header from '@/components/layout/Header/Header';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';
import { http } from '../../../apis/http';
import Clock from '@/assets/Clock.png';
import Check from '@/assets/sentenceCrt.png';
import Calendar from '@/assets/Calendar.png';
import ContentSection from '@/components/layout/ContentSection/ContentSection';
import Button from '@/components/Button/Button';
import SpinnerIcon from '@/components/icons/SpinnerIcon/SpinnerIcon'; // 스피너 추가

// --- API 응답 타입 ---
interface SummaryBody {
  resultId: number; // 새로 추가된 resultId
  sessionId: number;
  sessionTitle: string;
  totalCount: number;
  correctCount: number;
  durationSeconds: number;
  completedAt: string; // ISO 8601 형식
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

// 유틸리티
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
      month: 'long', // ✅ month 속성 중복 제거
      day: 'numeric',
    });
  } catch {
    return 'N/A';
  }
};

// 로컬 스토리지 타입 및 저장 로직 (기존 유지)
const LS_LEARNING_TIMES_KEY = 'learning_completion_times';
interface CompletionTime {
  time: string;
  completedAt: number;
}
type LearningTimes = { [sessionId: number]: CompletionTime };

const saveLocalLearningTime = (sessionId: number, durationSeconds: number) => {
  if (sessionId === null || durationSeconds === 0) return;

  const timeString = formatDuration(durationSeconds * 1000); // 초를 ms로 변환하여 사용
  const newCompletion: CompletionTime = {
    time: timeString,
    completedAt: Date.now(),
  };

  try {
    const storedData = localStorage.getItem(LS_LEARNING_TIMES_KEY);
    const times: LearningTimes = storedData ? JSON.parse(storedData) : {};

    times[sessionId] = newCompletion;

    localStorage.setItem(LS_LEARNING_TIMES_KEY, JSON.stringify(times));
    console.log(
      `[LearnComplete] Saved completion time for Session ${sessionId}: ${timeString}`,
    );
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

// LocationState에서 WordResult[] 제거 (API로 대체)
interface LocationState {
  sessionId?: number;
  categoryName?: string;
  // resultId?: number; // 서버에서 가져오므로 필요 없음 (필요 시 SummaryData에 포함)
  // results?: WordResult[]; // API로 대체
  // topicName?: string; // API로 대체
  // learningDuration?: number; // API로 대체
  // totalCount?: number; // API로 대체
}

interface SummaryData extends SummaryBody {
  categoryName: string; // API에는 없지만, Next Learning에 필요하여 State에서 가져옴
}


const LearnComplete: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const currentSessionId = state?.sessionId ? Number(state.sessionId) : null;
  const categoryName = state?.categoryName || 'TOPIK'; // Next Learning을 위해 유지

  // 🔥 상태를 로컬 state로 관리 (API 응답 기반)
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🔥 API 호출하여 학습 결과 요약 정보 가져오기
  const fetchSummary = useCallback(async (sId: number) => {
    if (!sId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await http.get<SummaryResponse>(
        `/learning/${sId}/results/summary`, // ✅ Summary API 호출
      );
      
      const data = response.data.body;
      const result: SummaryData = {
        ...data,
        categoryName: categoryName, // state에서 가져온 카테고리 정보 병합
      };

      setSummaryData(result);
      
      // 로컬 스토리지에 저장 (DurationSeconds 기준)
      saveLocalLearningTime(result.sessionId, result.durationSeconds); 
      
      console.log(`[LearnComplete] Fetched Summary for Session ${sId}`);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
      alert('학습 결과를 불러오지 못했습니다. 목록으로 이동합니다.');
      navigate('/main/learnList');
    } finally {
      setIsLoading(false);
    }
  }, [categoryName, navigate]);


  useEffect(() => {
    // 세션 ID가 있을 경우에만 API 호출
    if (currentSessionId) {
      fetchSummary(currentSessionId);
    } else {
      // 세션 ID가 없다면 목록으로 이동
      navigate('/main/learnList');
    }
  }, [currentSessionId, fetchSummary, navigate]);

  // 계산된 값들 (summaryData 기반)
  // !를 사용하여 summaryData가 null이 아닐 때만 접근하도록 보장하거나, 기본값 설정
  const { correctCount, totalCount, durationSeconds, sessionTitle, completedAt, resultId } = summaryData || {};

  const learningTime = useMemo(
    // durationSeconds가 있다면 ms로 변환하여 사용
    () => summaryData && durationSeconds !== undefined ? formatDuration(durationSeconds * 1000) : '0m 0s',
    [durationSeconds, summaryData],
  );
  const completionDate = useMemo(() => completedAt ? formatDate(completedAt) : 'N/A', [completedAt]);


  // 마스코트 텍스트 및 이미지 결정
  const { speechBubbleText, mascotImage: characterImageSrc } = useMemo(() => {
    let text = '';
    let mascot: MascotImage;
    if (totalCount && correctCount) {
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

  // 🔥 [추가] 헤더 뒤로가기 버튼 클릭 시 learnList로 이동하는 핸들러
  const handleBackToLearnList = () => {
    navigate('/main/learnList');
  };

  // 핸들러
  const handleReview = () => {
    if (!currentSessionId || !resultId) {
        alert('Review data is not ready.');
        return;
    }
    navigate('/main/learn/review', {
      state: {
        sessionId: currentSessionId,
        resultId: resultId, // ✅ Summary API에서 받은 resultId 전달
        topicName: sessionTitle, // API에서 받은 title 전달
        // learningTime, learningDuration 등은 Review 페이지에서 API로 가져오게 됩니다.
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

  // ... (handleNextLearning 함수는 변경 없음) ...
  const handleNextLearning = async () => {
    try {
      console.log(
        `[Next Learning] Fetching list for category: ${categoryName}`,
      );

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
          console.log(`[Next Learning] Starting: ${nextSession.title}`);

          navigate(`/main/learn/${nextSession.id}`, {
            state: { categoryName: categoryName },
          });
        } else {
          console.log('[Next Learning] No suitable next session found.');
          alert('더 이상 진행할 학습이 없습니다. 목록으로 이동합니다.');
          navigate('/main/learnList');
        }
      } else {
        console.log('[Next Learning] No sessions returned.');
        alert('학습 가능한 세션이 없습니다.');
        navigate('/main/learnList');
      }
    } catch (error) {
      console.error('Failed to fetch next learning session:', error);
      navigate('/main/learnList');
    }
  };

  // correctCount, totalCount 등은 summaryData가 있을 때만 사용 가능합니다.
  if (isLoading || !summaryData) {
    return (
      <div className={styles.spinner}>
        <SpinnerIcon />
      </div>
    );
  }

  // summaryData가 확정되었으므로, 구조 분해 할당을 다시 사용
  const { correctCount: finalCorrectCount, totalCount: finalTotalCount, sessionTitle: finalSessionTitle } = summaryData;

  return (
    <div className={styles.learnCompleteContainer}>
      {/* 🔥 [중요] customBackAction이 적용된 헤더 */}
      <Header hasBackButton customBackAction={handleBackToLearnList} />

      <Mascot image={characterImageSrc} text={speechBubbleText} />

      <ContentSection className={styles.completeCard}>
        <h1 className={styles.sessionCompleteTitle}>Session Complete!</h1>
        <div className={styles.resultsBox}>
          <h2 className={styles.comresultsTopicTitle}>{finalSessionTitle} Result</h2>
          <hr className={styles.divider} />
          {/* ⭐ 이미지 변수(Check, Clock, Calendar)를 icon prop으로 전달 */}
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