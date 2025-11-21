import React, { useState, useEffect, useCallback } from 'react'; // useCallback 추가
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react'; // 시간 아이콘
import { http } from '@/apis/http';
import styles from './roleList.module.css';
import Header from '@/components/layout/Header/Header';
import Mascot from '@/components/Mascot/Mascot';
import ContentSection from '@/components/layout/ContentSection/ContentSection';

// --- LocalStorage 타입 정의 ---
const LS_KEY_COMPLETIONS = 'roleplay_completions';

interface CompletionData {
  isCompleted: boolean;
  actualTime: number; // minutes 단위
}
type CompletedScenarios = { [scenarioId: number]: CompletionData };

// --- API 응답 타입 정의 ---
interface RoleplayScenario {
  id: number;
  title: string;
  description: string;
  estimated_minutes: number;
}

// --- 화면 표시용 타입 (🚩 isCompleted 추가) ---
interface RolePlayItem {
  id: number;
  title: string;
  time: string;
  isSubscribed: boolean;
  isCompleted: boolean; 
}

// --- 시간 포맷팅 함수 ---
const formatMinutesToDisplay = (minutes: number | null | undefined): string => { // minutes 타입 변경
  if (minutes === null || minutes === undefined || isNaN(minutes)) return 'N/A';
  const totalSeconds = Math.round(minutes * 60);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}m ${secs}s`;
};

// --- API 함수 ---
const getRoleplayScenarios = async (): Promise<RoleplayScenario[]> => {
  try {
    const response = await http.get('/roleplay/all');
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
  // 🚩 LocalStorage 상태 추가
  const [completedMap, setCompletedMap] = useState<CompletedScenarios>({});


  // 말풍선 텍스트
  const speechBubbleText = 'Choose a place to talk';

  // 🚩 LocalStorage에서 완료 데이터 로드 (초기 1회)
  useEffect(() => {
    try {
      const storedData = localStorage.getItem(LS_KEY_COMPLETIONS);
      if (storedData) {
        setCompletedMap(JSON.parse(storedData));
      }
    } catch (e) {
      console.error('Failed to load completions from LocalStorage', e);
    }
  }, []);

  // API에서 시나리오 데이터 로드
  useEffect(() => {
    const loadScenarios = async () => {
      try {
        setIsLoading(true);
        const data = await getRoleplayScenarios();

        // 🚩 LocalStorage의 완료 데이터를 기반으로 목록 구성
        const formatted: RolePlayItem[] = data.map((scenario) => {
            const completionInfo = completedMap[scenario.id];
            const isCompleted = completionInfo?.isCompleted || false;
            
            // 완료 여부에 따라 표시할 시간을 결정합니다.
            const minutesToDisplay = isCompleted && completionInfo.actualTime !== undefined
                ? completionInfo.actualTime // 완료 시 LocalStorage의 시간 사용
                : scenario.estimated_minutes; // 미완료 시 API의 예상 시간 사용

          return {
            id: scenario.id,
            title: scenario.title,
            time: formatMinutesToDisplay(minutesToDisplay),
            isSubscribed: true,
            isCompleted: isCompleted, // 🚩 완료 여부 반영
          };
        });

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

    // 🚩 completedMap이 로드되거나 변경될 때 시나리오 목록을 다시 로드하여 최신 상태 반영
    loadScenarios();
  }, [completedMap]); // 🚩 의존성 배열에 completedMap 추가

  const handleStart = (roleId: number) => {
    // 🔥 [수정 1] 선택된 시나리오 데이터를 찾습니다.
    const selectedScenario = scenarios.find(s => s.id === roleId);
    
    if (!selectedScenario) return;

    console.log(`Starting role play for ID: ${roleId}`);
    
    // 🔥 [수정 2] 시나리오 ID와 제목을 함께 보냅니다.
    navigate(`/mainpage/rolePlay/${roleId}`, {
        state: {
            scenarioTitle: selectedScenario.title // 👈 여기서 제목을 보냄
        }
    });
  };

  // 항목 클릭 시 상태 업데이트 핸들러
  const handleRoleSelect = (roleId: number) => {
    setSelectedRole(roleId);
  };

  const handleSubscribe = () => {
     navigate('/payment/checkout');
  };

  // (생략: 로딩, 에러, 데이터 없음 UI는 변경 없음)
  if (isLoading || error || scenarios.length === 0) {
        // 기존 로직 유지
        if (isLoading) return (
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
        if (error) return (
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
        if (scenarios.length === 0) return (
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

            // 🚩 버튼 텍스트와 시간 접두사 결정
            const buttonText = role.isCompleted ? 'Learn Again' : 'Start';
            const timePrefix = role.isCompleted ? 'Finished in ' : '';

            return (
              <div
                key={role.id}
                className={`${styles.roleItemRow} ${isSelected ? styles.selected : ''}`}
                onClick={() => handleRoleSelect(role.id)}
              >
                {/* 첫 번째 줄: 제목 및 Start/Learn Again 버튼 */}
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
                      {buttonText} {/* 🚩 버튼 텍스트 변경 */}
                    </button>
                  )}
                </div>

                {/* 두 번째 줄: 시간 정보 */}
                <div className={styles.roleItemInfo}>
                  <span className={styles.roleTime}>
                        {timePrefix} {/* 🚩 완료 시 "Finished in " 표시 */}
                        {role.time}
                    </span>
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