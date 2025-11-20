import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { http } from '../../apis/http';
import styles from './rolePlayComplete.module.css';
import Header from '@/components/layout/Header/Header';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';
import ContentSection from '@/components/layout/ContentSection/ContentSection';

// --- API 응답 타입 정의 ---
interface SessionSummary {
  sessionId: number;
  totalSentence: number;
  correctSentence: number;
  completedAt: string;
}

// 화면 표시용 데이터 구조
interface DisplaySessionData {
  sentenceCorrect: string;
  timeTaken: string;
  date: string;
  rolePlayName: string;
  turns: TurnData[];
}

// 초기 빈 데이터 상태
const emptySessionData: DisplaySessionData = {
    sentenceCorrect: "0/0",
    timeTaken: "-",
    date: "-",
    rolePlayName: "-",
    turns: []
};

interface TurnData {
    speaker: string;
    korean: string;
    romanized: string;
    english: string;
    result: 'CORRECT' | 'INCORRECT' | string;
}

// TurnDisplay 컴포넌트 수정 (CSS Modules 적용)
const TurnDisplay: React.FC<{ data: TurnData, index: number }> = ({ data, index }) => {
    // ✅ USER speaker (사용자가 선택/연습한 턴) 또는 Customer로 식별
    const isUserTurn = data.speaker === 'USER' || data.speaker === 'Customer';

    // 로마자 색상 결정
    const romanizedClass = data.result === 'CORRECT' ? styles.correct : data.result === 'INCORRECT' ? styles.incorrect : '';

    return (
        <div className={styles.turnDisplayBox}>
            <div className={styles.contentBox}>
                <div className={styles.koreanLine}>
                    <span className={styles.completeKoreanText}>{data.korean}</span>
                    <button className={`${styles.ttsButton} ${styles.active}`}>🔊</button>
                </div>
                <div className={styles.romanizedLine}>
                    {/* styles 객체를 통해 클래스 적용 */}
                    <span className={`${styles.completeRomanizedText} ${romanizedClass}`}>{data.romanized}</span>
                    {isUserTurn && <span className={`${styles.smallMicIcon} ${styles.active}`}>🎤</span>}
                </div>
                <span className={styles.completeEnglishText}>{data.english}</span>
            </div>
            {/* styles 객체를 통해 클래스 적용 */}
            <div className={`${styles.roleTagContainer} ${isUserTurn ? styles.customerTag : styles.staffTag}`}>
                <span className={styles.roleTag}>{data.speaker}</span>
            </div>
        </div>
    );
};


const RolePlayComplete: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [sessionData, setSessionData] = useState<DisplaySessionData>(emptySessionData);

    const speechBubbleText = 'Perfect!';

    // rolePlay에서 넘어온 state 데이터 처리
    useEffect(() => {
        const state = location.state as any;
        if (state?.sessionSummary) {
            // API에서 받은 세션 요약 데이터
            const summary: SessionSummary = state.sessionSummary;

            // 화면 표시용 데이터로 변환
            const displayData: DisplaySessionData = {
                sentenceCorrect: `${summary.correctSentence}/${summary.totalSentence}`,
                timeTaken: state.timeTaken || '-', // rolePlay에서 계산한 시간 사용
                date: new Date(summary.completedAt).toLocaleDateString(),
                rolePlayName: state.rolePlayName || 'Role Play',
                turns: state.turns || [],
            };
            setSessionData(displayData);
        }
    }, [location.state]);

    const handleTryAgain = useCallback(() => {
        const state = location.state as any;
        const scenarioId = state?.scenarioId;
        if (scenarioId) {
            navigate(`/mainpage/rolePlay/${scenarioId}`);
        } else {
            navigate('/mainpage/roleList');
        }
    }, [navigate, location.state]);

    const handleNextLearning = useCallback(() => {
        navigate('/mainpage/roleList');
    }, [navigate]);

    return (
        // 모든 클래스명을 styles 객체를 사용하도록 수정
        <div className={`${styles.pageContainer} ${styles.appContainer}`}>
            
     
                {/* Header 컴포넌트 추가 */}
                <Header hasBackButton /> 
                
                <Mascot image="shining" text={speechBubbleText} />

            <ContentSection color="blue">
                <h2 className={styles.summaryTitle}>Session Complete!</h2>

                <div className={styles.summaryDetails}>
                    <span className={`${styles.detailItem} ${styles.roleName}`}>{sessionData.rolePlayName}</span>
                    <div className={`${styles.detailItem} ${styles.stat}`}>
                        <span className={styles.statLabel}>✅ {sessionData.sentenceCorrect} sentence correct</span>
                    </div>
                    <div className={`${styles.detailItem} ${styles.stat}`}>
                        <span className={styles.statLabel}>⏱️ {sessionData.timeTaken}</span>
                    </div>
                    <div className={`${styles.detailItem} ${styles.stat}`}>
                        <span className={styles.statLabel}>📅 {sessionData.date}</span>
                    </div>
                </div>

                <div className={styles.completeHistoryArea}>
                    {sessionData.turns.map((turn, index) => (
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