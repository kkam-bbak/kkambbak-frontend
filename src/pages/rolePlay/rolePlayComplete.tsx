import React, { useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; 
import { CheckCircle, Clock, Calendar } from 'lucide-react';
// 🔥 [수정] WordResult 타입을 정확히 import 합니다.
import type { WordResult } from '../krLearn/learnStart/learnStart'; 
import styles from './rolePlayComplete.module.css';
import Header from '@/components/layout/Header/Header';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';
import ContentSection from '@/components/layout/ContentSection/ContentSection';
import { http } from '../../apis/http';

// 유틸리티 (기존 유지)
const formatDuration = (durationMs: number): string => {
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
};

const getFormattedCompletionDate = (dateString: string): string => { // 🔥 dateString 받도록 수정
  const now = new Date(dateString);
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

// 전달받을 데이터 타입 (scenarioId와 categoryName 추가)
interface LocationState {
  sessionId?: number;
  resultId?: number;
  results?: WordResult[];
  topicName?: string;
  learningDuration?: number; 
  scenarioId?: number; // 🔥 [수정 1] scenarioId 추가
  sessionSummary?: { correctSentence: number; totalSentence: number; completedAt: string; };
  timeTaken?: string;
  rolePlayName?: string;
  turns?: any[]; // TurnData 배열 (임시)
  categoryName?: string; // 🔥 [수정 2] categoryName 추가
}

// TurnDisplay 컴포넌트 (기존 유지)
interface TurnData {
    speaker: string;
    korean: string;
    romanized: string;
    english: string;
    result: 'CORRECT' | 'INCORRECT' | string;
}

const TurnDisplay: React.FC<{ data: TurnData, index: number }> = ({ data, index }) => {
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


const RolePlayComplete: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state as LocationState;
    const turnsHistory = state?.turns || [];
    // 데이터 추출
    const summary = state?.sessionSummary;
    const correctCount = summary?.correctSentence || 0;
    const totalCount = summary?.totalSentence || 0;
    const rolePlayName = state?.rolePlayName || 'Role Play Result';
    const timeTaken = state?.timeTaken || '0m 0s';
    
    // 🔥 [수정 3] categoryName 추출 (없으면 TOPIK으로 가정)
    const categoryName = state?.categoryName || 'TOPIK'; 
    const currentScenarioId = state?.scenarioId; // 재시작용 ID 확보

    // 시간 및 날짜 포맷팅
    const completionDate = useMemo(() => getFormattedCompletionDate(summary?.completedAt || new Date().toISOString()), [summary?.completedAt]);
    const learningDurationMs = state?.learningDuration || 0;
    const learningTime = useMemo(() => formatDuration(learningDurationMs), [learningDurationMs]);

    // 마스코트 및 말풍선 결정 로직 (기존 유지)
    const { speechBubbleText, mascotImage: characterImageSrc } = useMemo(() => {
        let text = '';
        let mascot: MascotImage;
        const correctRatio = totalCount > 0 ? correctCount / totalCount : 0;

        if (totalCount === 0) { text = 'No data available.'; mascot = 'thinking'; } 
        else if (correctCount === totalCount) { text = 'Perfect!!'; mascot = 'shining'; } 
        else if (correctRatio >= 2 / 3) { text = "It's not bad~"; mascot = 'smile'; } 
        else if (correctRatio >= 1 / 2) { text = 'So so~'; mascot = 'thinking'; } 
        else { text = "I'm sorry.."; mascot = mascot = 'gloomy'; }
        return { speechBubbleText: text, mascotImage: mascot };
    }, [correctCount, totalCount]);

    // --- 핸들러 ---
    const handleReview = useCallback(() => {
        // [수정] Review 페이지로 이동할 때 필요한 모든 정보를 전달
        // (Review 페이지는 Session ID를 받으면 됨)
        // 현재는 turns data를 사용하므로 turns를 전달
        navigate('/mainpage/learn/review', {
            state: {
                // sessionId: currentScenarioId, // 리뷰 페이지가 필요하다면 전달
                results: state?.turns, // 턴 히스토리를 결과로 전달
                topicName: rolePlayName,
                learningTime: timeTaken,
            }
        });
    }, [navigate, state, rolePlayName, timeTaken]);


    const handleTryAgain = useCallback(() => {
        if (currentScenarioId) {
            // ✅ Try Again 시, 현재 시나리오 ID로 돌아가고 카테고리 정보 유지
            navigate(`/mainpage/rolePlay/${currentScenarioId}`, {
                state: { categoryName: categoryName } // 카테고리 정보 전달
            });
        } else {
            navigate('/mainpage/roleList');
        }
    }, [navigate, currentScenarioId, categoryName]);

    const handleNextLearning = useCallback(async () => {
        try {
            console.log(`[Next Learning] Fetching list for category: ${categoryName}`);
            
            // 🔥 [수정 4] API 호출 시 category 파라미터 전달 (C007 에러 해결)
            const response = await http.get<NextLearningResponse>('/learning/sessions', {
                params: { limit: 20, category: categoryName }
            });

            const sessions = response.data.body.sessions;

            if (sessions && sessions.length > 0) {
                // 현재 ID보다 큰 ID를 찾거나, 완료 안 된 것 중 다음을 찾는 로직
                let nextSession = sessions.find(s => !s.completed && s.id !== currentScenarioId);
                
                if (!nextSession) {
                    nextSession = sessions.find(s => s.id > (currentScenarioId || 0));
                }

                if (nextSession) {
                    // 🔥 다음 학습으로 이동할 때 카테고리 정보 유지
                    navigate(`/mainpage/learn/${nextSession.id}`, {
                        state: { categoryName: categoryName }
                    });
                } else {
                    alert("더 이상 진행할 학습이 없습니다.");
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
    }, [navigate, currentScenarioId, categoryName]);

    return (
        <div className={`${styles.pageContainer} ${styles.appContainer}`}>
            <Header hasBackButton />
            <Mascot image={characterImageSrc} text={speechBubbleText} />

            <ContentSection color="blue">
                <h2 className={styles.summaryTitle}>Session Complete!</h2>

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