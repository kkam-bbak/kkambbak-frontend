import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { http } from '../../../apis/http';
import styles from './learnList.module.css';
import LearnInfo from '../learnInfo/learnInfo';
import Header from '@/components/layout/Header/Header';
import Mascot from '@/components/Mascot/Mascot';
import ContentSection from '@/components/layout/ContentSection/ContentSection';
import Clock from '@/assets/Clock.png';

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

// 로컬 스토리지 타입 및 키 정의
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

// 로컬 스토리지에서 시간 데이터를 가져오는 함수
const getLocalLearningTime = (sessionId: number): CompletionTime | undefined => {
    try {
        const storedData = localStorage.getItem(LS_LEARNING_TIMES_KEY);
        if (storedData) {
            const times: LearningTimes = JSON.parse(storedData);
            return times[sessionId] || times[String(sessionId) as unknown as number];
        }
    } catch (e) {
        console.error('Failed to read local learning times', e);
    }
    return undefined;
};


const sessionToTopic = (session: Session): Topic => {
    let durationString = formatDuration(session.durationSeconds);
    let finalCompleted = session.completed; 

    if (session.completed) {
        const localTimeData = getLocalLearningTime(session.id);
        if (localTimeData) {
            durationString = localTimeData.time;
        } else {
            finalCompleted = false; 
        }
    }
    
    const timeText = durationString === '0m 0s' 
        ? (finalCompleted ? 'Completed' : 'Est. Time N/A') 
        : durationString;

    return {
        id: session.id,
        title: session.title,
        vocabularies: session.vocabularyCount,
        time: timeText, 
        completed: finalCompleted, 
    };
};

// TopicCard 컴포넌트
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
  const buttonText = isCompleted ? 'learn again' : 'Start';
  const buttonStyleClass = isCompleted ? styles.learnAgain : '';

  return (
    <div
      className={`${styles.topicCard} ${isCompleted ? styles.completed : ''} ${isActive ? styles.activeCard : ''}`}
      onClick={() => onCardClick(topic.id)}
    >
      <div className={styles.cardHeader}>
        <h3>{topic.title}</h3>
      
        <button
          className={`${styles.topicStartButton} ${buttonStyleClass}`}
          onClick={(e) => {
            e.stopPropagation();
            onStart(topic.id);
          }}
        >
          {buttonText}
        </button>
      </div>
      <div className={styles.cardDivider}></div>
      <div className={styles.cardFooter}>
        <span className={styles.vocabCount}>
          {topic.vocabularies} Vocabularies
        </span>
        <span className={styles.timeInfo}>
          {topic.time}
          <img src={Clock} alt="time" className={styles.timeIcon} />
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
  
  const [isNavigating, setIsNavigating] = useState(false);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [nextCursor, setNextCursor] = useState<string | number | null>(null);
  const [hasNext, setHasNext] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchSessions = useCallback(
    async (
      category: 'topik' | 'casual',
      cursor: string | number | null,
      isInitial: boolean = false,
    ) => {
      if (isLoading || (!hasNext && !isInitial)) return;

      setIsLoading(true); 
      const categoryParam = category.toUpperCase();
      const limit = 4; 

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

  useEffect(() => {
    setSessions([]);
    setNextCursor(null);
    setHasNext(true);
    setActiveTopicId(null); 
    
    fetchSessions(activeTab, null, true);
  }, [activeTab]);

  useEffect(() => {
    if (sessions.length > 0 && activeTopicId === null) {
      const firstIncomplete = sessions.find(s => !s.completed);
      setActiveTopicId(firstIncomplete ? firstIncomplete.id : sessions[0].id);
    }
  }, [sessions, activeTopicId]);

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

  const handleConfirmStart = (topicId: number) => {
    if (isNavigating) return; 
    
    setIsNavigating(true); 
    handleCloseInfoModal();
    
    console.log(`[Confirm Start] Navigating to: /mainPage/learn/${topicId}`);
    
    navigate(`/mainPage/learn/${topicId}`, {
        state: {
            categoryName: activeTab.toUpperCase() 
        }
    }); 
  };

  const handleStartLearning = (topicId: number) => {
    if (isNavigating) return; 

    const topic = topicsToDisplay.find((t) => t.id === topicId);
    if (!topic) return;

    if (topic.completed) {
        handleConfirmStart(topicId);
        return;
    }

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
          <Header hasBackButton customBackAction={handleGoBackToMain} />
          <Mascot image="basic" text={activeBubbleText} />
        </>
      )}

      <ContentSection noPadding>
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