import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { http } from '../../apis/http';
import  './rolePlayComplete.css';
import Header from '@/components/layout/Header/Header';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';


// Mock 데이터 구조 (실제로는 props나 context를 통해 받아와야 합니다)
const mockSessionData = {
    sentenceCorrect: "02/02",
    timeTaken: "2m 30s",
    date: "Tuesday, November 3, 2023",
    rolePlayName: "Role Play_At a Cafe",
    // 턴 데이터 (히스토리에서 가져온 완료된 턴 목록)
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

const TurnDisplay: React.FC<{ data: TurnData, index: number }> = ({ data, index }) => {
    const isCustomerTurn = data.speaker === 'Customer';
    
    // 로마자 색상 결정
    const romanizedClass = data.result === 'CORRECT' ? 'correct' : data.result === 'INCORRECT' ? 'incorrect' : '';
    
    return (
        <div className="turn-display-box">
            
            <div className="content-box">
                <div className="text-line korean-line">
                    <span className="complete-korean-text">{data.korean}</span>
                    <button className="tts-button active">🔊</button>
                </div>
                <div className="text-line romanized-line">
                    <span className={`complete-romanized-text ${romanizedClass}`}>{data.romanized}</span>
                    {/* Customer 턴에는 마이크 아이콘 표시 (녹음 완료 의미) */}
                    {isCustomerTurn && <span className="small-mic-icon active">🎤</span>}
                </div>
                <span className="complete-english-text">{data.english}</span>
            </div>
            <div className={`role-tag-container ${isCustomerTurn ? 'customer-tag' : 'staff-tag'}`}>
                <span className="role-tag">{data.speaker}</span>
            </div>
        </div>
    );
};


const RolePlayComplete: React.FC = () => {
    const navigate = useNavigate();


    // 완료 페이지이므로, 보통 'shining'이나 'cute' 같은 긍정적인 이미지를 사용합니다.
    const mascotImageShining: MascotImage = 'shining'; // 또는 'cute', 'smile'

    const handleTryAgain = useCallback(() => {
        // Try again 로직 (첫 턴으로 돌아가기 등)
        console.log("Attempting Try Again...");
        navigate('/mainpage/rolePlay/${roleId}'); // 임시로 루트로 이동
    }, [navigate]);

    const handleNextLearning = useCallback(() => {
        // Next learning 로직
        console.log("Attempting Next Learning...");
        navigate('/mainpage/roleList'); // 임시 다음 레슨 페이지로 이동
    }, [navigate]);

    return (
        <div className="page-container app-container">
            <div className="header-section">
                {/* <div className="back-arrow" onClick={() => navigate(-1)}>&larr;</div> */}
                <span className="logout" onClick={() => navigate('/logout')}>Logout</span>


            <div className="speech-bubble roleComplete-bubble">
                    Perfect!!
                    <div className="speech-tail"></div>
                </div>

            <div className="character-placeholder">
                <img 
                    src={mascotImageShining} 
                    alt="Character Complete" 
                    className="character-icon" 
                />
            </div>
            </div>

            <div className="role-content-window roleComplete-content-window">
                <h2 className="summary-title">Session Complete!</h2>
                
                <div className="summary-details">
                    <span className="detail-item role-name">{mockSessionData.rolePlayName}</span>
                    <div className="detail-item stat">
                        <span className="stat-label">✅ {mockSessionData.sentenceCorrect} sentence correct</span>
                    </div>
                    <div className="detail-item stat">
                        <span className="stat-label">⏱️ {mockSessionData.timeTaken}</span>
                    </div>
                    <div className="detail-item stat">
                        <span className="stat-label">📅 {mockSessionData.date}</span>
                    </div>
                </div>

                <div className="complete-history-area">
                    {mockSessionData.turns.map((turn, index) => (
                        <TurnDisplay key={index} data={turn} index={index} />
                    ))}
                </div>

                <div className="buttons-container">
                    <button className="action-button try-again" onClick={handleTryAgain}>
                        Try again
                    </button>
                    <button className="action-button next-learning" onClick={handleNextLearning}>
                        Next learning
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RolePlayComplete;