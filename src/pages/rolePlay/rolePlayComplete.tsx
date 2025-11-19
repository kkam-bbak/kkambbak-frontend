import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { http } from '../../apis/http';
import styles from './rolePlayComplete.module.css'; 
import Header from '@/components/layout/Header/Header';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';
import ContentSection from '@/components/layout/ContentSection/ContentSection';

// Mock 데이터 구조 (유지)
const mockSessionData = {
    sentenceCorrect: "02/02",
    timeTaken: "2m 30s",
    date: "Tuesday, November 3, 2023",
    rolePlayName: "Role Play_At a Cafe",
    turns: [
        { speaker: 'Staff', korean: '주문 하시겠어요?', romanized: 'Ju-mun ha-si-gess-eo-yo?', english: 'Would you like to order?', result: 'CORRECT' },
        { speaker: 'Customer', korean: '네, 주문 할게요', romanized: 'Nae, ju-mun hal-ge-yo', english: 'Yes, I\'d like to order.', result: 'CORRECT' },
    ]
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
    const isCustomerTurn = data.speaker === 'Customer';

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
                    {isCustomerTurn && <span className={`${styles.smallMicIcon} ${styles.active}`}>🎤</span>}
                </div>
                <span className={styles.completeEnglishText}>{data.english}</span>
            </div>
            {/* styles 객체를 통해 클래스 적용 */}
            <div className={`${styles.roleTagContainer} ${isCustomerTurn ? styles.customerTag : styles.staffTag}`}>
                <span className={styles.roleTag}>{data.speaker}</span>
            </div>
        </div>
    );
};


const RolePlayComplete: React.FC = () => {
    const navigate = useNavigate();
    const speechBubbleText = 'Perfect!';

    const handleTryAgain = useCallback(() => {
        // 실제 roleId를 사용하도록 수정 필요
        navigate(`/mainpage/rolePlay/defaultRoleId`); 
    }, [navigate]);

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
                    <span className={`${styles.detailItem} ${styles.roleName}`}>{mockSessionData.rolePlayName}</span>
                    <div className={`${styles.detailItem} ${styles.stat}`}>
                        <span className={styles.statLabel}>✅ {mockSessionData.sentenceCorrect} sentence correct</span>
                    </div>
                    <div className={`${styles.detailItem} ${styles.stat}`}>
                        <span className={styles.statLabel}>⏱️ {mockSessionData.timeTaken}</span>
                    </div>
                    <div className={`${styles.detailItem} ${styles.stat}`}>
                        <span className={styles.statLabel}>📅 {mockSessionData.date}</span>
                    </div>
                </div>

                <div className={styles.completeHistoryArea}>
                    {mockSessionData.turns.map((turn, index) => (
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