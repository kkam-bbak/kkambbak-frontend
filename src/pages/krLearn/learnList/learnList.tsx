import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { http } from '../../../apis/http';
import styles from './learnList.module.css';
import LearnInfo from '../learnInfo/learnInfo';
import Header from '@/components/layout/Header/Header';
import Mascot from '@/components/Mascot/Mascot';
import ContentSection from '@/components/layout/ContentSection/ContentSection';

// API 응답의 sessions 항목에 맞는 인터페이스 정의
interface Session {
  id: number;
  title: string;
  categoryName: 'TOPIK' | 'CASUAL';
  vocabularyCount: number;
  completed: boolean;
  durationSeconds: number;
}

// 화면에 표시할 Topic 인터페이스 (Session 기반)
interface Topic {
  id: number;
  title: string;
  vocabularies: number;
  time: string;
  completed: boolean;
}

const HAS_SEEN_INFO_KEY = 'hasSeenLearnInfo';

// ⭐ [추가] 로컬 스토리지 타입 및 키 정의 (LearnComplete와 동일)
const LS_LEARNING_TIMES_KEY = 'learning_completion_times';
interface CompletionTime {
    time: string; // 'Xm Ys' 형식
    completedAt: number; // 타임스탬프
}
type LearningTimes = { [sessionId: number]: CompletionTime };


const formatDuration = (durationSeconds: number): string => {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${minutes}m ${seconds}s`;
};

// ⭐ [추가] 로컬 스토리지에서 시간 데이터를 가져오는 함수
const getLocalLearningTime = (sessionId: number): CompletionTime | undefined => {
    try {
        const storedData = localStorage.getItem(LS_LEARNING_TIMES_KEY);
        if (storedData) {
            const times: LearningTimes = JSON.parse(storedData);
            // 숫자형 ID를 문자열 키로 변환하여 접근해야 할 수도 있습니다.
            return times[sessionId] || times[String(sessionId) as unknown as number];
        }
    } catch (e) {
        console.error('Failed to read local learning times', e);
    }
    return undefined;
};


// ⭐ [수정] sessionToTopic 함수: 로컬 기록이 없으면 completed 상태를 오버라이드합니다.
const sessionToTopic = (session: Session): Topic => {
    let durationString = formatDuration(session.durationSeconds);
    
    let finalCompleted = session.completed; 

    if (session.completed) {
        const localTimeData = getLocalLearningTime(session.id);
        
        if (localTimeData) {
            // Case 1: 로컬에 완료 기록이 있으면 (정상 완료) 시간을 사용
            durationString = localTimeData.time;
        } else {
            // 🔥 [핵심 수정] Case 2: API가 완료(true)를 보냈지만 로컬 기록이 없다면 (중단으로 간주)
            finalCompleted = false; // completed를 false로 오버라이드하여 'Start' 버튼을 강제합니다.
        }
    }
    
    // 시간 텍스트 설정: 오버라이드된 finalCompleted 상태에 따라 텍스트 조정
    const timeText = durationString === '0m 0s' 
        ? (finalCompleted ? 'Completed' : 'Est. Time N/A') 
        : durationString;

    return {
        id: session.id,
        title: session.title,
        vocabularies: session.vocabularyCount,
        time: timeText, 
        completed: finalCompleted, // 🔥 오버라이드된 상태 사용
    };
};

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
  // 🔥 [수정 1] 완료된 항목은 항상 버튼 노출, 진행 중인 항목은 활성화(클릭)되었을 때만 노출
  const showButton = isCompleted || (isActive && !isCompleted);
  
  // 🔥 [수정 2] 버튼 텍스트 변경 (Start -> learn again)
  const buttonText = isCompleted ? 'learn again' : 'Start';
  
  // 완료된 항목은 'learnAgain' 스타일(회색 버튼) 적용, 아니면 기본 'active' 스타일
  // (CSS에 .learnAgain 클래스가 있어야 회색으로 보입니다)
  const buttonStyleClass = isCompleted ? styles.learnAgain : '';

  // 텍스트 색상 (완료 여부 무관하게 활성화/비활성화만 따짐, 혹은 완료되면 active 느낌으로 처리 가능)
  const statusClass = isActive ? styles['active-text'] : styles['inactive-text'];
  
  // timeText는 이미 sessionToTopic에서 로컬 시간을 포함하여 결정됨
  const timeText = topic.time;

  return (
    <div
      // CSS Modules을 사용하므로 styles.completed를 명시적으로 사용해야 합니다.
      className={`${styles.topicCard} ${isCompleted ? styles.completed : ''} ${isActive ? styles.activeCard : ''}`}
      onClick={() => onCardClick(topic.id)}
    >
      <div className={styles.cardHeader}>
        <h3 className={statusClass}>{topic.title}</h3>
        {showButton && (
          <button
            className={`${styles.topicStartButton} ${buttonStyleClass}`}
            onClick={(e) => {
              e.stopPropagation();
              onStart(topic.id);
            }}
          >
            {buttonText}
          </button>
        )}
      </div>
      <div className={styles.cardDivider}></div>
      <div className={styles.cardFooter}>
        <span className={`${styles.vocabCount} ${statusClass}`}>
          {topic.vocabularies} Vocabularies
        </span>
        {/* 🔥 시간 정보: 로컬 또는 API 시간 사용 */}
        <span className={`${styles.timeInfo} ${statusClass}`}>
          {timeText}
          <div className={styles.timeIcon}>🕒</div>
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
  
  // 🔥 중복 클릭 방지 상태
  const [isNavigating, setIsNavigating] = useState(false);

  // API 상태 관리
  const [sessions, setSessions] = useState<Session[]>([]);
  const [nextCursor, setNextCursor] = useState<string | number | null>(null);
  const [hasNext, setHasNext] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
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
      const limit = 4; // or 10

      try {
        const cursorParam = cursor !== null ? String(cursor) : undefined;
        
        const response = await http.get('/learning/sessions', {
          params: {
            category: categoryParam,
            cursor: cursorParam,
            limit: limit,
          },
        });

        const data = response.data.body;
        const newSessions: Session[] = data.sessions || [];
        
        setSessions((prevSessions) => 
            isInitial ? newSessions : [...prevSessions, ...newSessions]
        );
        
        setNextCursor(data.nextCursor);
        setHasNext(data.hasNext);
        
      } catch (error) {
        console.error('Failed to fetch learning sessions:', error);
        if (isInitial) {
            setSessions([]);
            setActiveTopicId(null);
        }
        setHasNext(false); 
      } finally {
        setIsLoading(false); 
      }
    },
    [hasNext, isLoading]
  );

  // 탭 변경 시 초기 목록 로드
  useEffect(() => {
    setSessions([]);
    setNextCursor(null);
    setHasNext(true);
    setActiveTopicId(null); 
    
    fetchSessions(activeTab, null, true);
  }, [activeTab]);

  // 초기 로드 시 첫 번째 항목 활성화 (완료 안 된 것 우선 혹은 첫 번째)
  useEffect(() => {
    if (sessions.length > 0 && activeTopicId === null) {
      // 1. 완료되지 않은 첫 번째 찾기
      const firstIncomplete = sessions.find(s => !s.completed);
      // 2. 없으면 그냥 첫 번째
      setActiveTopicId(firstIncomplete ? firstIncomplete.id : sessions[0].id);
    }
  }, [sessions, activeTopicId]);

  // 스크롤 이벤트 핸들러 (무한 스크롤)
  const handleScroll = useCallback(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const isNearBottom =
      scrollContainer.scrollTop + scrollContainer.clientHeight >=
      scrollContainer.scrollHeight - 50;

    if (isNearBottom && hasNext && !isLoading) {
      fetchSessions(activeTab, nextCursor);
    }
  }, [hasNext, isLoading, nextCursor, activeTab, fetchSessions]);
  
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
  }, [handleScroll]);

  const topicsToDisplay: Topic[] = sessions.map(sessionToTopic);

  // 🔥 학습 시작 확정 후 이동
  const handleConfirmStart = (topicId: number) => {
    if (isNavigating) return; 
    
    setIsNavigating(true); 
    handleCloseInfoModal();
    
    console.log(`[Confirm Start] Navigating to: /mainPage/learn/${topicId}`);
    
    // 🔥 [수정] 이동할 때 categoryName을 함께 보냅니다!
    navigate(`/mainPage/learn/${topicId}`, {
        state: {
            categoryName: activeTab.toUpperCase() // 'TOPIK' or 'CASUAL'
        }
    }); 
  };

  // 🔥 Start 버튼 클릭 시 로직
  const handleStartLearning = (topicId: number) => {
    if (isNavigating) return; 

    const topic = topicsToDisplay.find((t) => t.id === topicId);
    if (!topic) return;

    // 이미 완료된 항목이면 튜토리얼 없이 바로 이동 (Learn Again)
    if (topic.completed) {
        handleConfirmStart(topicId);
        return;
    }

    // 처음 학습이면 튜토리얼 모달 띄우기
    const hasSeenInfo = localStorage.getItem(HAS_SEEN_INFO_KEY);
    if (!hasSeenInfo) {
      setIsInfoModalOpen(true);
      setSelectedTopic(topic);
      localStorage.setItem(HAS_SEEN_INFO_KEY, 'true');
    } else {
      handleConfirmStart(topicId);
    }
  };

  const handleCloseInfoModal = () => {
    setIsInfoModalOpen(false);
    setSelectedTopic(null);
  };

  const handleCardClick = (topicId: number) => {
    setActiveTopicId(topicId);
  };

  const handleTabChange = (tab: 'topik' | 'casual') => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  };
  
  // 🔥 [추가] 커스텀 뒤로가기 핸들러: /mainpage로 이동
  const handleGoBackToMain = useCallback(() => {
      navigate('/mainpage');
  }, [navigate]);

  const activeBubbleText =
    activeTab === 'topik'
      ? 'Should I help you prepare\nfor the exam?'
      : 'Can I help you with daily conversation?';

  return (
    <div className={styles.contentLitContainer}>
      
      {!isInfoModalOpen && (
        <>
          {/* 🔥 [수정] customBackAction prop 전달 */}
          <Header hasBackButton customBackAction={handleGoBackToMain} />
          <Mascot image="basic" text={activeBubbleText} />
        </>
      )}

      <ContentSection>
        <div className={styles.tabButtonsContainer}>
          <button
            className={`${styles.tabButton} ${activeTab === 'topik' ? styles.activeTabButton : ''}`}
            onClick={() => handleTabChange('topik')}
          >
            Topik
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'casual' ? styles.activeTabButton : ''}`}
            onClick={() => handleTabChange('casual')}
          >
            Casual
          </button>
        </div>

        <div className={`${styles.scrollableList}`} ref={scrollRef}>
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
        </div>
      </ContentSection>

      {isInfoModalOpen && selectedTopic && (
        <LearnInfo
          topic={selectedTopic}
          tab={activeTab}
          isOpen={isInfoModalOpen}
          onClose={handleCloseInfoModal}
          onConfirmStart={() => handleConfirmStart(selectedTopic.id)}
        />
      )}
    </div>
  );
};

export default LearnList;