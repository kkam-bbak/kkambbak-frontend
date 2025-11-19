// learnList.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { http } from '../../../apis/http';
import './learnList.css';
import LearnInfo from '../learnInfo/learnInfo';
import Header from '@/components/layout/Header/Header';
import Mascot from '@/components/Mascot/Mascot';
import ContentSection from '@/components/layout/ContentSection/ContentSection';

// API 응답의 sessions 항목에 맞는 인터페이스 정의
interface Session {
  id: number;
  title: string;
  categoryName: 'TOPIK' | 'CASUAL'; // categoryName 추가
  vocabularyCount: number; // API의 vocabularyCount 사용
  completed: boolean;
  durationSeconds: number;
}

// 화면에 표시할 Topic 인터페이스 (Session 기반)
interface Topic {
  id: number;
  title: string;
  vocabularies: number;
  time: string; // durationSeconds를 변환하여 사용
  completed: boolean;
}

// 🔥 localStorage 키 정의 (최초 이용 확인용)
const HAS_SEEN_INFO_KEY = 'hasSeenLearnInfo';

// API의 durationSeconds를 'Xm Ys' 형식으로 변환하는 헬퍼 함수
const formatDuration = (durationSeconds: number): string => {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${minutes}m ${seconds}s`;
};

// Session 데이터를 Topic 데이터로 변환하는 함수
const sessionToTopic = (session: Session): Topic => ({
  id: session.id,
  title: session.title,
  vocabularies: session.vocabularyCount,
  time: formatDuration(session.durationSeconds),
  completed: session.completed,
});

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

  // 🔥 API 상태 관리
  const [sessions, setSessions] = useState<Session[]>([]);
  const [nextCursor, setNextCursor] = useState<string | number | null>(null);
  const [hasNext, setHasNext] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // 스크롤 영역 참조
  const scrollRef = useRef<HTMLDivElement>(null);

  // 학습 목록을 API에서 가져오는 함수
  const fetchSessions = useCallback(
    async (
      category: 'topik' | 'casual',
      cursor: string | number | null,
      isInitial: boolean = false,
    ) => {
      if (isLoading || (!hasNext && !isInitial)) return;

      setIsLoading(true);
      const categoryParam = category.toUpperCase();
      const limit = 4; // API 명세에 limit 기본값 4 참고

      try {
        const response = await http.get('/api/v1/learning/sessions', {
          params: {
            category: categoryParam,
            cursor: cursor || undefined, // 첫 페이지 요청 시 cursor는 null/undefined
            limit: limit,
          },
        });

        const data = response.data.body;
        const newSessions: Session[] = data.sessions || [];
        
        // 초기 로드인 경우 데이터를 덮어쓰고, 다음 페이지 로드인 경우 기존 데이터에 추가
        setSessions((prevSessions) => 
            isInitial ? newSessions : [...prevSessions, ...newSessions]
        );
        
        setNextCursor(data.nextCursor);
        setHasNext(data.hasNext);
        
        // 첫 페이지 로드 시 첫 번째 항목을 활성화
        if (isInitial && newSessions.length > 0) {
            setActiveTopicId(newSessions[0].id);
        }

      } catch (error) {
        console.error('Failed to fetch learning sessions:', error);
        // 에러 처리: 목록을 비우거나 에러 메시지를 표시할 수 있음
        if (isInitial) {
            setSessions([]);
            setActiveTopicId(null);
        }
        setHasNext(false); // 에러 발생 시 추가 로드 방지
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, hasNext],
  );

  // 탭 변경 시 초기 목록 로드
  useEffect(() => {
    // 탭 변경 시 상태 초기화
    setSessions([]);
    setNextCursor(null);
    setHasNext(true);
    setActiveTopicId(null); 
    
    fetchSessions(activeTab, null, true);
  }, [activeTab, fetchSessions]);

  // 스크롤 이벤트 핸들러 (무한 스크롤)
  const handleScroll = useCallback(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    // 스크롤이 끝에 도달했는지 확인
    const isNearBottom =
      scrollContainer.scrollTop + scrollContainer.clientHeight >=
      scrollContainer.scrollHeight - 50; // 바닥에서 50px 이내

    if (isNearBottom && hasNext && !isLoading) {
      fetchSessions(activeTab, nextCursor);
    }
  }, [hasNext, isLoading, nextCursor, activeTab, fetchSessions]);
  
  // 스크롤 이벤트 리스너 등록/해제
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [handleScroll]); // handleScroll이 바뀔 때마다 리스너 갱신

  // sessions 배열을 화면 표시용 Topic 배열로 변환
  const topicsToDisplay: Topic[] = sessions.map(sessionToTopic);


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

  // 탭 변경 로직
  const handleTabChange = (tab: 'topik' | 'casual') => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  };
  
  const activeBubbleText =
    activeTab === 'topik'
      ? 'Should I help you prepare\nfor the exam?'
      : 'Can I help you with daily conversation?';


  return (
    <div className="content-lit-container">
      <Header hasBackButton />

      <Mascot image="basic" text={activeBubbleText} />

      <ContentSection>
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
        <div className="scrollable-list" ref={scrollRef}>
          {topicsToDisplay.length === 0 && !isLoading ? (
            <p className="no-sessions-message">No learning sessions available.</p>
          ) : (
            topicsToDisplay.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                onStart={handleStartLearning}
                onCardClick={handleCardClick}
                isActive={topic.id === activeTopicId}
                isCompleted={topic.completed}
              />
            ))
          )}
          {/* 로딩 표시 */}
          {isLoading && (
            <div className="loading-indicator">
              <p>Loading...</p>
            </div>
          )}
          <div style={{ height: '20px' }}></div>
        </div>
      </ContentSection>

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