import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react'; // 시간 아이콘
import { http } from '@/apis/http';
import styles from './roleList.module.css';
import Header from '@/components/layout/Header/Header';
import Mascot from '@/components/Mascot/Mascot';
import ContentSection from '@/components/layout/ContentSection/ContentSection';

// --- API 응답 타입 정의 ---
interface RoleplayScenario {
  id: number;
  title: string;
  description: string;
  estimated_minutes: number;
}

// --- 화면 표시용 타입 ---
interface RolePlayItem {
  id: number;
  title: string;
  time: string;
  isSubscribed: boolean;
}

// --- 시간 포맷팅 함수 ---
const formatMinutesToDisplay = (minutes: number): string => {
  const totalSeconds = Math.round(minutes * 60);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}m ${secs}s`;
};

// --- API 함수 ---
const getRoleplayScenarios = async (): Promise<RoleplayScenario[]> => {
  try {
    const response = await http.get('/api/v1/roleplay/all');
    return response.data.body;
  } catch (error) {
    console.error('Failed to fetch roleplay scenarios:', error);
    throw error;
  }
};

const RoleList: React.FC = () => {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<RolePlayItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);

  // 말풍선 텍스트
  const speechBubbleText = 'Choose a place to talk';

  // API에서 시나리오 데이터 로드
  useEffect(() => {
    const loadScenarios = async () => {
      try {
        setIsLoading(true);
        const data = await getRoleplayScenarios();

        // API 응답을 화면 표시 형식으로 변환
        const formatted: RolePlayItem[] = data.map((scenario) => ({
          id: scenario.id,
          title: scenario.title,
          time: formatMinutesToDisplay(scenario.estimated_minutes),
          isSubscribed: true, // 임시로 모두 true로 설정 (나중에 백엔드에서 제공될 수 있음)
        }));

        setScenarios(formatted);
        // 첫 번째 항목 선택
        if (formatted.length > 0) {
          setSelectedRole(formatted[0].id);
        }
        setError(null);
      } catch (err) {
        // http.ts의 interceptor에서 인증 에러는 자동으로 /login으로 리다이렉트됨
        // 여기서는 다른 에러만 처리
        setError('시나리오를 불러오지 못했습니다. 다시 시도해주세요.');
        console.error('Error loading scenarios:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadScenarios();
  }, []);

  const handleStart = (roleId: number) => {
    console.log(`Starting role play for ID: ${roleId}`);
    navigate(`/mainpage/rolePlay/${roleId}`);
  };

  // 항목 클릭 시 상태 업데이트 핸들러
  const handleRoleSelect = (roleId: number) => {
    setSelectedRole(roleId);
  };

  const handleSubscribe = () => {
    alert('구독 페이지로 이동합니다.');
  };

  // 로딩 중 표시
  if (isLoading) {
    return (
      <div className={styles.roleListContainer}>
        <Header hasBackButton />
        <Mascot image="thinking" text="로딩 중..." />
        <ContentSection color="blue">
          <div className={styles.roleListContentHeader}>
            <h2 className={styles.roleListTitle}>Role Play</h2>
          </div>
          <div className={styles.roleListItemsContainer}>
            <p>시나리오를 불러오는 중입니다...</p>
          </div>
        </ContentSection>
      </div>
    );
  }

  // 에러 표시
  if (error) {
    return (
      <div className={styles.roleListContainer}>
        <Header hasBackButton />
        <Mascot image="gloomy" text="문제가 발생했어요" />
        <ContentSection color="blue">
          <div className={styles.roleListContentHeader}>
            <h2 className={styles.roleListTitle}>Role Play</h2>
          </div>
          <div className={styles.roleListItemsContainer}>
            <p style={{ color: 'red' }}>{error}</p>
            <button
              onClick={() => window.location.reload()}
              style={{ marginTop: '10px', padding: '10px 20px', cursor: 'pointer' }}
            >
              다시 시도
            </button>
          </div>
        </ContentSection>
      </div>
    );
  }

  // 데이터가 없을 때
  if (scenarios.length === 0) {
    return (
      <div className={styles.roleListContainer}>
        <Header hasBackButton />
        <Mascot image="thinking" text="이용 가능한 시나리오가 없습니다" />
        <ContentSection color="blue">
          <div className={styles.roleListContentHeader}>
            <h2 className={styles.roleListTitle}>Role Play</h2>
          </div>
          <div className={styles.roleListItemsContainer}>
            <p>시나리오가 준비 중입니다.</p>
          </div>
        </ContentSection>
      </div>
    );
  }

  return (
    <div className={styles.roleListContainer}>
      <Header hasBackButton />
      <Mascot image="basic" text={speechBubbleText} />

      {/* 하단 역할극 목록 섹션 */}
      <ContentSection color="blue">
        <div className={styles.roleListContentHeader}>
          <h2 className={styles.roleListTitle}>Role Play</h2>
          <button className={styles.subscribeButton} onClick={handleSubscribe}>
            Subscribe
          </button>
        </div>

        {/* 역할극 항목 리스트 */}
        <div className={styles.roleListItemsContainer}>
          {scenarios.map((role) => {
            const isSelected = role.id === selectedRole;
            const isStartVisible = isSelected && role.isSubscribed;

            return (
              <div
                key={role.id}
                className={`${styles.roleItemRow} ${isSelected ? styles.selected : ''}`}
                onClick={() => handleRoleSelect(role.id)}
              >
                {/* 첫 번째 줄: 제목 및 Start 버튼 */}
                <div className={styles.roleItemHeader}>
                  <span className={styles.roleItemTitle}>{role.title}</span>

                  {isStartVisible && (
                    <button
                      className={styles.roleStartButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStart(role.id);
                      }}
                    >
                      Start
                    </button>
                  )}
                </div>

                {/* 두 번째 줄: 시간 정보 */}
                <div className={styles.roleItemInfo}>
                  <span className={styles.roleTime}>{role.time}</span>
                  <Clock className={styles.roleTimeIcon} />
                </div>
              </div>
            );
          })}
        </div>
      </ContentSection>
    </div>
  );
};

export default RoleList;
