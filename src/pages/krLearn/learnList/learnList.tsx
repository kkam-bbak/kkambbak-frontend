// learnList.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './learnList.css';
import LearnInfo from '../learnInfo/learnInfo'; // 🔥 경로 수정
import Header from '@/components/layout/Header/Header';
import Mascot from '@/components/Mascot/Mascot';
// Topic 인터페이스는 유지
interface Topic {
  id: number;
  title: string;
  vocabularies: number;
  time: string;
  completed: boolean;
}

// 🔥 localStorage 키 정의 (최초 이용 확인용)
const HAS_SEEN_INFO_KEY = 'hasSeenLearnInfo';

// 데이터는 유지
const topikList: Topic[] = [
  {
    id: 1,
    title: 'Topik 1',
    vocabularies: 30,
    time: '4m 17s',
    completed: false,
  },
  {
    id: 2,
    title: 'Topik 2',
    vocabularies: 30,
    time: '6m 20s',
    completed: false,
  },
  {
    id: 3,
    title: 'Topik 3',
    vocabularies: 30,
    time: '5m 15s',
    completed: false,
  },
  {
    id: 4,
    title: 'Topik 4',
    vocabularies: 30,
    time: '5m 15s',
    completed: false,
  },
  {
    id: 9,
    title: 'Topik 5',
    vocabularies: 30,
    time: '5m 15s',
    completed: false,
  },
  {
    id: 10,
    title: 'Topik 6',
    vocabularies: 30,
    time: '5m 15s',
    completed: false,
  },
];

const casualList: Topic[] = [
  {
    id: 5,
    title: 'Emotions',
    vocabularies: 30,
    time: '5m 15s',
    completed: false,
  },
  {
    id: 6,
    title: 'Fruits',
    vocabularies: 30,
    time: '5m 15s',
    completed: false,
  },
  {
    id: 7,
    title: 'Places',
    vocabularies: 30,
    time: '5m 15s',
    completed: false,
  },
  { id: 8, title: 'Body', vocabularies: 30, time: '5m 15s', completed: false },
  { id: 11, title: 'Food', vocabularies: 30, time: '5m 15s', completed: false },
  {
    id: 12,
    title: 'Travel',
    vocabularies: 30,
    time: '5m 15s',
    completed: false,
  },
];

// TopicCard 컴포넌트 정의는 유지
interface TopicCardProps {
  topic: Topic;
  onStart: (id: number) => void;
  onCardClick: (id: number) => void;
  isActive: boolean;
  isCompleted: boolean;
}

const TopicCard: React.FC<TopicCardProps> = ({
  topic,
  onStart,
  onCardClick,
  isActive,
  isCompleted,
}) => {
  const showButton = isCompleted || (isActive && !isCompleted);
  const buttonText = isCompleted ? 'Learn Again' : 'Start';
  const statusClass = isActive ? 'active-text' : 'inactive-text';

  return (
    <div
      className={`topic-card ${isCompleted ? 'completed' : ''}`}
      onClick={() => onCardClick(topic.id)}
    >
      <div className="card-header">
        <h3 className={statusClass}>{topic.title}</h3>
        {showButton && (
          <button
            className={`topic-start-button ${isCompleted ? 'learn-again' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onStart(topic.id);
            }}
          >
            {buttonText}
          </button>
        )}
      </div>
      <div className="card-divider"></div>
      <div className="card-footer">
        <span className={`vocab-count ${statusClass}`}>
          {topic.vocabularies} Vocabularies
        </span>
        <span className={`time-info ${statusClass}`}>
          {topic.time}
          <div className="time-icon">🕒</div>
        </span>
      </div>
    </div>
  );
};

// --------------------------------------------------------------------------

const LearnList: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'topik' | 'casual'>('topik');
  const [activeTopicId, setActiveTopicId] = useState<number | null>(null);

  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  // 🔥 학습 시작 컨펌 후 최종 라우팅
  const handleConfirmStart = (topicId: number) => {
    handleCloseInfoModal();
    navigate(`/mainPage/learn/${topicId}`);
  };

  // 🔥 Start 버튼 클릭 시 로직: 최초 이용 확인
  const handleStartLearning = (topicId: number) => {
    const topic = topicsToDisplay.find((t) => t.id === topicId);
    if (!topic) return;

    setSelectedTopic(topic);
    const hasSeenInfo = localStorage.getItem(HAS_SEEN_INFO_KEY);

    if (!hasSeenInfo) {
      // 1. 처음이면 모달 띄우고 기록 남기기
      setIsInfoModalOpen(true);
      localStorage.setItem(HAS_SEEN_INFO_KEY, 'true');
    } else {
      // 2. 이미 봤다면 바로 학습 페이지로 이동
      handleConfirmStart(topicId);
    }
  };

  // 🔥 모달 닫기 핸들러
  const handleCloseInfoModal = () => {
    setIsInfoModalOpen(false);
    setSelectedTopic(null);
  };

  // 카드 클릭 핸들러: 활성화된 ID 업데이트
  const handleCardClick = (topicId: number) => {
    setActiveTopicId(topicId);
  };

  const activeBubbleText =
    activeTab === 'topik'
      ? 'Should I help you prepare\nfor the exam?'
      : 'Can I help you with daily conversation?';

  const topicsToDisplay = activeTab === 'topik' ? topikList : casualList;

  // 디폴트 활성화 로직
  useEffect(() => {
    if (topicsToDisplay.length > 0) {
      setActiveTopicId(topicsToDisplay[0].id);
    }
  }, [topicsToDisplay]);

  // 탭 변경 로직
  const handleTabChange = (tab: 'topik' | 'casual') => {
    setActiveTab(tab);
    setActiveTopicId(null);
  };

  return (
    <div className="content-lit-container">
      <Header hasBackButton />

      <Mascot image="basic" text={activeBubbleText} />

      <div className="content-window">
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
              onCardClick={handleCardClick}
              isActive={topic.id === activeTopicId}
              isCompleted={topic.completed}
            />
          ))}
          <div style={{ height: '20px' }}></div>
        </div>
      </div>

      {/* 🔥🔥🔥 LearnInfo 모달 렌더링 🔥🔥🔥 */}
      {isInfoModalOpen && selectedTopic && (
        <LearnInfo
          topic={selectedTopic}
          tab={activeTab}
          isOpen={isInfoModalOpen}
          onClose={handleCloseInfoModal}
          // LearnInfoProps에 맞게 수정: onConfirmStart는 ID를 받아야 함
          onConfirmStart={() => handleConfirmStart(selectedTopic.id)}
        />
      )}
    </div>
  );
};

export default LearnList;
