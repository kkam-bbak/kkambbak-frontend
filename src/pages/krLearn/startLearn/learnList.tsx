import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './learnList.css';

// Topic 인터페이스는 유지
interface Topic {
    id: number;
    title: string;
    vocabularies: number;
    time: string;
    completed: boolean; 
}

// 데이터는 유지
const topikList: Topic[] = [
    { id: 1, title: 'Topik 1', vocabularies: 30, time: '4m 17s', completed: false }, // 완료: Learn Again 버튼
    { id: 2, title: 'Topik 2', vocabularies: 30, time: '6m 20s', completed: false }, // 미완료: 클릭 활성화 가능
    { id: 3, title: 'Topik 3', vocabularies: 30, time: '5m 15s', completed: false },
    { id: 4, title: 'Topik 4', vocabularies: 30, time: '5m 15s', completed: false },
    { id: 9, title: 'Topik 5', vocabularies: 30, time: '5m 15s', completed: false },
    { id: 10, title: 'Topik 6', vocabularies: 30, time: '5m 15s', completed: false },
];

const casualList: Topic[] = [
    { id: 5, title: 'Emotions', vocabularies: 30, time: '5m 15s', completed: false }, 
    { id: 6, title: 'Fruits', vocabularies: 30, time: '5m 15s', completed: false }, 
    { id: 7, title: 'Places', vocabularies: 30, time: '5m 15s', completed: false }, 
    { id: 8, title: 'Body', vocabularies: 30, time: '5m 15s', completed: false },
    { id: 11, title: 'Food', vocabularies: 30, time: '5m 15s', completed: false },
    { id: 12, title: 'Travel', vocabularies: 30, time: '5m 15s', completed: false },
];

// TopicCard 컴포넌트 정의는 유지
interface TopicCardProps {
    topic: Topic;
    onStart: (id: number) => void;
    onCardClick: (id: number) => void; 
    isActive: boolean; 
    isCompleted: boolean; 
}

const TopicCard: React.FC<TopicCardProps> = ({ topic, onStart, onCardClick, isActive, isCompleted }) => {
    
    // 버튼 표시 로직: 완료됐거나(Learn Again) 현재 활성화된 미완료 카드일 경우(Start)
    const showButton = isCompleted || (isActive && !isCompleted);
    
    const buttonText = isCompleted ? 'Learn Again' : 'Start';
    
    // 텍스트 활성화 로직: 현재 활성화된 카드만 흰색
    const statusClass = isActive ? 'active-text' : 'inactive-text'; 

    return (
        <div 
            className={`topic-card ${isCompleted ? 'completed' : ''}`}
            onClick={() => onCardClick(topic.id)} // 카드 클릭 시 ID 전달
        >
            <div className="card-header">
                <h3 className={statusClass}>{topic.title}</h3>
                {showButton && (
                    <button 
                        className={`start-button ${isCompleted ? 'learn-again' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation(); // 버튼 클릭이 카드 클릭 이벤트로 전파되는 것 방지
                            onStart(topic.id);
                        }}
                    >
                        {buttonText}
                    </button>
                )}
            </div>
            <div className="card-divider"></div>
            <div className="card-footer">
                <span className={`vocab-count ${statusClass}`}>{topic.vocabularies} Vocabularies</span>
                <span className={`time-info ${statusClass}`}>
                    {topic.time}
                    <div className="time-icon">🕒</div>
                </span>
            </div>
        </div>
    );
}

// --------------------------------------------------------------------------

const learnList: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'topik' | 'casual'>('topik');

    // 활성화된 카드 ID 상태 (클릭 기반 활성화)
    const [activeTopicId, setActiveTopicId] = useState<number | null>(null);

    // 🔥 Start 버튼 클릭 시 navigate로 페이지 이동 (모달 로직 제거)
    const handleStartLearning = (topicId: number) => {
        console.log(`Starting learning for topic: ${topicId}`);
        // 실제 학습 페이지로 이동 요청
        navigate(`/learn/topic/${topicId}`); 
    };
    
    // 카드 클릭 핸들러: 활성화된 ID 업데이트
    const handleCardClick = (topicId: number) => {
        setActiveTopicId(topicId);
    }

    const activeBubbleText = activeTab === 'topik' 
        ? 'Should I help you prepare for the exam?' 
        : 'Can I help you with daily conversation?';

    const topicsToDisplay = activeTab === 'topik' ? topikList : casualList;

    // 🔥 디폴트 활성화 로직: 탭 변경 시 또는 로드 시, 첫 번째 카드를 활성화
    useEffect(() => {
        if (topicsToDisplay.length > 0) {
            // 현재 topicsToDisplay 배열의 첫 번째 항목을 디폴트로 활성화
            setActiveTopicId(topicsToDisplay[0].id);
        }
    }, [topicsToDisplay]);


    // 탭 변경 로직
    const handleTabChange = (tab: 'topik' | 'casual') => {
        setActiveTab(tab);
        // useEffect가 새로운 리스트의 첫 항목을 활성화하도록 null로 설정
        setActiveTopicId(null); 
    };

    
    return (
        <div className="topic-page-container">
            {/* 상단 고정 요소 */}
            <div className="header-section">
                <button className="logout-button" onClick={() => navigate('/auth/login')}>Logout</button>
                <div className="speech-bubble">
                    {activeBubbleText}
                    <div className="bubble-tail"></div>
                </div>
                <div className="character-placeholder"></div>
            </div>

            <div className="learning-window">
                {/* 탭 버튼 */}
                <div className="tab-buttons-container">
                    <button 
                        className={`tab-button ${activeTab === 'topik' ? 'active' : ''}`}
                        onClick={() => handleTabChange('topik')}
                    >
                        Topik
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'casual' ? 'active' : ''}`}
                        onClick={() => handleTabChange('casual')}
                    >
                        Casual
                    </button>
                </div>

                {/* 학습 목록 */}
                <div className="scrollable-list">
                    {topicsToDisplay.map((topic) => (
                        <TopicCard 
                            key={topic.id} 
                            topic={topic} 
                            onStart={handleStartLearning}
                            onCardClick={handleCardClick} // 클릭 핸들러 전달
                            isActive={topic.id === activeTopicId} // 활성화 여부 전달
                            isCompleted={topic.completed} 
                        />
                    ))}
                    <div style={{ height: '20px' }}></div> 
                </div>
            </div>
            
            {/* LearningModal 컴포넌트 렌더링 로직 제거 완료 */}
        </div>
    );
};

export default learnList;