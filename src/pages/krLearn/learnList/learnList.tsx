// learnList.tsx
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
const TUTORIAL_KEY = 'hasSeenLearnInfo_v1'



const formatDuration = (durationSeconds: number): string => {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${minutes}m ${seconds}s`;
};

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
  // isActive가 true일 때만 'active-text'를 적용하여, 비활성 카드는 스타일을 제거합니다.
  const statusClass = isActive ? styles['active-text'] : styles['inactive-text'];

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
            className={`${styles.topicStartButton} ${isCompleted ? styles.learnAgain : ''}`}
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
        <span className={`${styles.timeInfo} ${statusClass}`}>
          {topic.time}
          <div className={styles.timeIcon}>🕒</div>
        </span>
      </div>
    </div>
  );
};

// --------------------------------------------------------------------------

const LearnList: React.FC = () => {
  const [isNavigating, setIsNavigating] = useState(false);

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'topik' | 'casual'>('topik');
  const [activeTopicId, setActiveTopicId] = useState<number | null>(null);

  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  // 🔥 API 상태 관리
  // nextCursor는 API 명세에 따라 string | number로 정의하고, null을 포함합니다.
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
      // 로딩 중이거나 더 이상 데이터가 없으면 요청하지 않습니다.
      if (isLoading || (!hasNext && !isInitial)) return;

      // 요청 시작 시 Loading 상태 설정
      setIsLoading(true); 
      const categoryParam = category.toUpperCase();
      const limit = 4;

      try {
        // cursor가 number일 경우, API 요청 시 문자열로 변환하여 보냅니다.
        const cursorParam = cursor !== null ? String(cursor) : undefined;
        
        const response = await http.get('/api/v1/learning/sessions', {
          params: {
            category: categoryParam,
            cursor: cursorParam, // undefined는 요청에서 제외됨
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
        
        // 이전의 activeTopicId 설정 로직 제거: 아래 useEffect로 분리했습니다.
        
      } catch (error) {
        console.error('Failed to fetch learning sessions:', error);
        // 에러 처리: 목록을 비우거나 에러 메시지를 표시할 수 있음
        if (isInitial) {
            setSessions([]);
            setActiveTopicId(null);
        }
        setHasNext(false); // 에러 발생 시 추가 로드 방지
      } finally {
        setIsLoading(false); // 요청 완료 시 Loading 상태 해제
      }
    },
    [hasNext],
//     [isLoading, hasNext], // fetchSessions는 activeTab이 변경되어도 함수 재생성을 막기 위해 activeTab을 제거했습니다.
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

  // 🔥 Sessions 배열이 업데이트될 때 첫 번째 항목을 활성화합니다. (목록 표시 문제 해결)
  useEffect(() => {
    // 데이터가 로드되었고 (sessions.length > 0) 아직 활성화된 ID가 없을 때 (activeTopicId === null)
    if (sessions.length > 0 && activeTopicId === null) {
      // 첫 번째 항목을 활성화합니다.
      setActiveTopicId(sessions[0].id);
    }
  }, [sessions, activeTopicId]); // sessions가 업데이트될 때마다 이 로직이 실행됩니다.

  // 스크롤 이벤트 핸들러 (무한 스크롤)
  const handleScroll = useCallback(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    // 스크롤이 끝에 도달했는지 확인
    const isNearBottom =
      scrollContainer.scrollTop + scrollContainer.clientHeight >=
      scrollContainer.scrollHeight - 50;

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
  }, [handleScroll]);

  // sessions 배열을 화면 표시용 Topic 배열로 변환
  const topicsToDisplay: Topic[] = sessions.map(sessionToTopic);


// 🔥 학습 시작 컨펌 후 최종 라우팅
const handleConfirmStart = (topicId: number) => {
    if (isNavigating) return; // 이미 이동 중이면 클릭 무시
    
    setIsNavigating(true); // 이동 시작! 잠금 걸기
    handleCloseInfoModal();
    
    console.log(`[Confirm Start] Navigating to: /mainPage/learn/${topicId}`);
    navigate(`/mainPage/learn/${topicId}`); 
    
    // (참고: 페이지가 이동되면 이 컴포넌트는 언마운트되므로 false로 되돌릴 필요가 거의 없습니다)
  };

  // 🔥 Start 버튼 클릭 시 로직: 최초 이용 확인
const handleStartLearning = (topicId: number) => {
    if (isNavigating) return; // 이동 중이면 무시

    const topic = topicsToDisplay.find((t) => t.id === topicId);
    if (!topic) return;

    // ... (기존 로직 동일)
    const hasSeenInfo = localStorage.getItem(HAS_SEEN_INFO_KEY);

    if (!hasSeenInfo) {
      setIsInfoModalOpen(true);
      setSelectedTopic(topic);
      localStorage.setItem(HAS_SEEN_INFO_KEY, 'true');
    } else {
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
    <div className={styles.contentLitContainer}>
      
      {/* 🔥 [수정 핵심] 모달이 닫혀있을 때만 뒤쪽 헤더와 마스코트를 보여줌 */}
      {!isInfoModalOpen && (
        <>
          <Header hasBackButton />
          <Mascot image="basic" text={activeBubbleText} />
        </>
      )}
      <ContentSection>
        {/* 탭 버튼 */}
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

        {/* 학습 목록 */}
        <div className={`${styles.scrollableList}`} ref={scrollRef}>
          {topicsToDisplay.length === 0 && !isLoading ? (
            <p className="no-sessions-message">No learning sessions available.</p>
          ) : (
            topicsToDisplay.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                // 🔥 핸들러 연결 확인
                onStart={handleStartLearning} 
                onCardClick={handleCardClick}
                isActive={topic.id === activeTopicId}
                isCompleted={topic.completed}
              />
            ))
          )}
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