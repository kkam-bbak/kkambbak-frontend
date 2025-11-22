import React, { useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; 
import { CheckCircle, Clock, Calendar } from 'lucide-react';
import styles from './rolePlayComplete.module.css';
import Header from '@/components/layout/Header/Header';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';
import ContentSection from '@/components/layout/ContentSection/ContentSection';
import { http } from '../../apis/http';

// 유틸리티
const formatDuration = (durationMs: number): string => {
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
};

const getFormattedCompletionDate = (dateString: string): string => { 
  const now = new Date(dateString);
  return now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

// ⭐ [수정] RolePlay 시나리오 타입 정의 (RoleList와 동일하게 맞춤)
interface RoleplayScenario {
  id: number;
  title: string;
  description: string;
  estimated_minutes: number;
  // completed 여부는 로컬 스토리지나 별도 로직으로 판단해야 할 수 있음 (API가 안 준다면)
}

// API 응답 래퍼
interface ApiResponseBody<T> {
  status: { statusCode: string; message: string; description: string | null };
  body: T;
}

// 전달받을 데이터 타입 (categoryName 제거)
interface LocationState {
  sessionId?: number;
  resultId?: number;
  topicName?: string;
  learningDuration?: number; 
  scenarioId?: number; 
  sessionSummary?: { correctSentence: number; totalSentence: number; completedAt: string; };
  timeTaken?: string;
  rolePlayName?: string;
  turns?: any[]; // TurnData 배열
  // categoryName?: string; // ❌ 제거됨
}

// TurnDisplay 컴포넌트
interface TurnData {
  speaker: string;
  korean: string;
  romanized: string;
  english: string;
  result: 'CORRECT' | 'INCORRECT' | string;
}

const TurnDisplay: React.FC<{ data: TurnData, index: number }> = ({ data }) => {
  const isUserTurn = data.speaker === 'USER';
  const romanizedClass = data.result === 'CORRECT' ? styles.correct : data.result === 'INCORRECT' ? styles.incorrect : '';

  return (
    <div className={styles.turnDisplayBox}>
      <div className={styles.contentBox}>
        <div className={styles.koreanLine}>
          <span className={styles.completeKoreanText}>{data.korean}</span>
          <button className={`${styles.ttsButton} ${styles.active}`}>🔊</button>
        </div>
        <div className={styles.romanizedLine}>
          <span className={`${styles.completeRomanizedText} ${romanizedClass}`}>{data.romanized}</span>
          {isUserTurn && <span className={`${styles.smallMicIcon} ${styles.active}`}>🎤</span>}
        </div>
        <span className={styles.completeEnglishText}>{data.english}</span>
      </div>
      <div className={`${styles.roleTagContainer} ${isUserTurn ? styles.customerTag : styles.staffTag}`}>
        <span className={styles.roleTag}>{data.speaker}</span>
      </div>
    </div>
  );
};


// --- LocalStorage 키 (완료 여부 확인용) ---
const LS_KEY_COMPLETIONS = 'roleplay_completions';
interface CompletionData {
  isCompleted: boolean;
  actualTime: number;
}
type CompletedScenarios = { [scenarioId: number]: CompletionData };


const RolePlayComplete: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const turnsHistory = state?.turns || [];
  
  const summary = state?.sessionSummary;
  const correctCount = summary?.correctSentence || 0;
  const totalCount = summary?.totalSentence || 0;
  const rolePlayName = state?.rolePlayName || 'Role Play Result';
  const timeTaken = state?.timeTaken || '0m 0s';
  
  const currentScenarioId = state?.scenarioId || 0; 

  const completionDate = useMemo(() => getFormattedCompletionDate(summary?.completedAt || new Date().toISOString()), [summary?.completedAt]);
  
  const { speechBubbleText, mascotImage: characterImageSrc } = useMemo(() => {
    let text = '';
    let mascot: MascotImage;
    const correctRatio = totalCount > 0 ? correctCount / totalCount : 0;

    if (totalCount === 0) { text = 'No data available.'; mascot = 'thinking'; } 
    else if (correctCount === totalCount) { text = 'Perfect!!'; mascot = 'shining'; } 
    else if (correctRatio >= 2 / 3) { text = "It's not bad~"; mascot = 'smile'; } 
    else if (correctRatio >= 1 / 2) { text = 'So so~'; mascot = 'thinking'; } 
    else { text = "I'm sorry.."; mascot = 'gloomy'; }
    return { speechBubbleText: text, mascotImage: mascot };
  }, [correctCount, totalCount]);

  const handleBackClick = useCallback(() => {
    navigate('/mainpage/roleList');
  }, [navigate]);

  const handleTryAgain = useCallback(() => {
    if (currentScenarioId) {
      navigate(`/mainpage/rolePlay/${currentScenarioId}`, {
        state: { scenarioTitle: rolePlayName } // categoryName 제거
      });
    } else {
      navigate('/mainpage/roleList');
    }
  }, [navigate, currentScenarioId, rolePlayName]);

  // ⭐ [수정] Role Play 목록을 불러와 다음 단계 찾기
  const handleNextLearning = useCallback(async () => {
    try {
      console.log(`[Next Learning] Fetching RolePlay list...`);
      
      // 1. RolePlay 목록 API 호출 (RoleList와 동일)
      const response = await http.get<ApiResponseBody<RoleplayScenario[]>>('/roleplay/all');
      const sessions = response.data.body;

      // 2. 로컬 스토리지에서 완료 정보 가져오기 (API가 completed 정보를 안 준다면)
      let completedMap: CompletedScenarios = {};
      try {
          const storedData = localStorage.getItem(LS_KEY_COMPLETIONS);
          if (storedData) {
              completedMap = JSON.parse(storedData);
          }
      } catch (e) { console.error(e); }

      if (sessions && sessions.length > 0) {
        // 3. ID 순 정렬
        const sortedSessions = [...sessions].sort((a, b) => a.id - b.id);

        // 4. 현재 세션 인덱스 찾기
        const currentIndex = sortedSessions.findIndex(s => s.id === currentScenarioId);

        // 5. 다음 안 푼 세션 찾기 로직
        // (API 응답에는 completed가 없을 수 있으므로 로컬 스토리지나 로직으로 판단)
        
        // 우선순위 1: 현재 다음 것부터 끝까지 중에서 안 푼 것
        let nextSession = sortedSessions.slice(currentIndex + 1).find(s => !completedMap[s.id]?.isCompleted);

        // 우선순위 2: 처음부터 현재까지 중에서 안 푼 것 (순환)
        if (!nextSession) {
            nextSession = sortedSessions.slice(0, currentIndex).find(s => !completedMap[s.id]?.isCompleted);
        }

        // 우선순위 3: 다 풀었다면? 그냥 바로 다음 인덱스 (반복 학습)
        if (!nextSession) {
             const nextIndex = (currentIndex + 1) % sortedSessions.length;
             // 세션이 1개뿐이면 이동 안함
             if (sortedSessions.length > 1 || (sortedSessions.length === 1 && sortedSessions[0].id !== currentScenarioId)) {
                 nextSession = sortedSessions[nextIndex];
             }
        }

        if (nextSession) {
          // ⭐ [중요] 다음 세션으로 이동 (제목 전달)
          navigate(`/mainpage/roleplay/${nextSession.id}`, {
            state: { 
              scenarioTitle: nextSession.title 
            }
          });
        } else {
          alert("모든 학습을 완료했습니다! 🎉 목록으로 이동합니다.");
          navigate('/mainpage/roleList');
        }
      } else {
        alert("학습 가능한 세션이 없습니다.");
        navigate('/mainpage/roleList');
      }

    } catch (error) {
      console.error("Failed to fetch next roleplay session:", error);
      navigate('/mainpage/roleList');
    }
  }, [navigate, currentScenarioId]);

  return (
    <div className={`${styles.pageContainer} ${styles.appContainer}`}>
      <Header hasBackButton customBackAction={handleBackClick} />
      <Mascot image={characterImageSrc} text={speechBubbleText} />

      <ContentSection color="blue">
        <div className={styles.cardTitleBar}>
          <span className={styles.cardTitleText}>Session Complete!</span>
        </div>

        <div className={styles.summaryDetails}>
          <span className={styles.detailItem}>{rolePlayName}</span>
          <div className={`${styles.detailItem} ${styles.stat}`}>
            <CheckCircle className={styles.statIcon} />
            <span className={styles.statLabel}>{correctCount}/{totalCount} sentences correct</span>
          </div>
          <div className={`${styles.detailItem} ${styles.stat}`}>
            <Clock className={styles.statIcon} />
            <span className={styles.statLabel}>{timeTaken}</span>
          </div>
          <div className={`${styles.detailItem} ${styles.stat}`}>
            <Calendar className={styles.statIcon} />
            <span className={styles.statLabel}>{completionDate}</span>
          </div>
        </div>

        {/* 대화 기록 리스트 */}
        <div className={styles.completeHistoryArea}>
          {turnsHistory.map((turn, index) => (
            <TurnDisplay key={index} data={turn} index={index} />
          ))}
        </div>

        <div className={styles.buttonsContainer}>
          <button className={`${styles.actionButton} ${styles.tryAgain}`} onClick={handleTryAgain}>
            Try again
          </button>
          <button className={`${styles.actionButton} ${styles.nextLearning}`} onClick={handleNextLearning}>
            Next learning
          </button>
        </div>
      </ContentSection>
    </div>
  );
};

export default RolePlayComplete;