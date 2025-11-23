import React, { useState, useEffect, useCallback } from 'react'; // useCallback 추가
import { useNavigate } from 'react-router-dom';
//import { Clock } from 'lucide-react'; 
import { http } from '@/apis/http';
import styles from './roleList.module.css';
import Header from '@/components/layout/Header/Header';
import Mascot from '@/components/Mascot/Mascot';
import ContentSection from '@/components/layout/ContentSection/ContentSection';
import Clock from '@/assets/Clock.png';

// --- LocalStorage 타입 정의 ---
const LS_KEY_COMPLETIONS = 'roleplay_completions';

interface CompletionData {
  isCompleted: boolean;
  actualTime: number; // minutes 단위
}
type CompletedScenarios = { [scenarioId: number]: CompletionData };

// --- API 응답 타입 정의 (보내주신 JSON에 맞춤) ---
interface RoleplayScenario {
  id: number;
  title: string;            // "At a Cafe", "At school" 등
  description: string;
  estimated_minutes: number;
}

interface ApiResponseBody<T> {
  status: { statusCode: string; message: string; description: string | null };
  body: T;
}

// --- 화면 표시용 타입 ---
interface RolePlayItem {
  id: number;
  title: string;
  time: string;
  isSubscribed: boolean;
  isCompleted: boolean; 
}

// --- 시간 포맷팅 함수 ---
const formatMinutesToDisplay = (minutes: number | null | undefined): string => {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return 'N/A';
  const totalSeconds = Math.round(minutes * 60);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}m ${secs}s`;
};

// --- API 함수 ---
const getRoleplayScenarios = async (): Promise<RoleplayScenario[]> => {
  try {
    const response = await http.get<ApiResponseBody<RoleplayScenario[]>>('/roleplay/all');
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
  const [completedMap, setCompletedMap] = useState<CompletedScenarios>({});

  const speechBubbleText = 'Choose a place to talk';

  // ⭐ [추가] 뒤로 가기 핸들러: 메인 페이지로 이동
  const handleBackClick = useCallback(() => {
      navigate('/mainpage');
  }, [navigate]);

  // 1. LocalStorage 데이터 로드
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

  // 2. API 데이터 로드 및 매핑
  useEffect(() => {
    const loadScenarios = async () => {
      try {
        setIsLoading(true);
        const data = await getRoleplayScenarios();

        const formatted: RolePlayItem[] = data.map((scenario) => {
            const completionInfo = completedMap[scenario.id];
            const isCompleted = completionInfo?.isCompleted || false;
            
            const minutesToDisplay = isCompleted && completionInfo.actualTime !== undefined
                ? completionInfo.actualTime
                : scenario.estimated_minutes;

          return {
            id: scenario.id,
            title: scenario.title,
            time: formatMinutesToDisplay(minutesToDisplay),
            isSubscribed: true,
            isCompleted: isCompleted,
          };
        });

        setScenarios(formatted);
        
        if (formatted.length > 0) {
          setSelectedRole(formatted[0].id);
        }
        setError(null);
      } catch (err) {
        setError('시나리오를 불러오지 못했습니다. 다시 시도해주세요.');
        console.error('Error loading scenarios:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadScenarios();
  }, [completedMap]);

  // 3. 학습 시작 핸들러
  const handleStart = (roleId: number) => {
    const selectedScenario = scenarios.find(s => s.id === roleId);
    
    if (!selectedScenario) return;

    console.log(`Starting role play: ${selectedScenario.title} (ID: ${roleId})`);
    
    navigate(`/mainpage/rolePlay/${roleId}`, {
        state: {
            scenarioTitle: selectedScenario.title 
        }
    });
  };

  const handleRoleSelect = (roleId: number) => {
    setSelectedRole(roleId);
  };

  const handleSubscribe = () => {
     navigate('/payment/checkout');
  };

  if (isLoading) return (
    <div className={styles.roleListContainer}>
        {/* ⭐ customBackAction 추가 */}
        <Header hasBackButton customBackAction={handleBackClick} />
        <Mascot image="thinking" text="로딩 중..." />
        <ContentSection color="blue">
            <div className={styles.roleListContentHeader}>
                <h2 className={styles.roleListTitle}>Role Play</h2>
            </div>
            <div className={styles.roleListItemsContainer}>
                <p style={{textAlign: 'center', color: 'white'}}>시나리오 목록을 불러오는 중입니다...</p>
            </div>
        </ContentSection>
    </div>
  );

  if (error) return (
      <div className={styles.roleListContainer}>
        {/* ⭐ customBackAction 추가 */}
        <Header hasBackButton customBackAction={handleBackClick} />
        <Mascot image="gloomy" text="문제가 발생했어요" />
        <ContentSection color="blue">
            <div className={styles.roleListContentHeader}>
                <h2 className={styles.roleListTitle}>Role Play</h2>
            </div>
            <div className={styles.roleListItemsContainer}>
                <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>
                <button onClick={() => window.location.reload()} style={{ display: 'block', margin: '20px auto', padding: '10px 20px' }}>
                    다시 시도
                </button>
            </div>
        </ContentSection>
    </div>
  );

  return (
    <div className={styles.roleListContainer}>
      {/* ⭐ customBackAction 추가 */}
      <Header hasBackButton customBackAction={handleBackClick} />
      <Mascot image="basic" text={speechBubbleText} />

      <ContentSection color="blue">
        <div className={styles.roleListContentHeader}>
          <h2 className={styles.roleListTitle}>Role Play</h2>
          <button className={styles.subscribeButton} onClick={handleSubscribe}>
            Subscribe
          </button>
        </div>

        <div className={styles.roleListItemsContainer}>
          {scenarios.map((role) => {
            const isSelected = role.id === selectedRole;
            // const isStartVisible = isSelected && role.isSubscribed;
            // const buttonText = role.isCompleted ? 'Learn Again' : 'Start';

            return (
              <div
                key={role.id}
                className={`${styles.roleItemRow} ${isSelected ? styles.selected : ''}`}
                onClick={() => handleRoleSelect(role.id)}
              >
                <div className={styles.roleItemHeader}>
                  <span className={styles.roleItemTitle}>{role.title}</span>

                  {/* ⭐ [수정] 버튼 렌더링 로직 변경 */}
                  {role.isCompleted ? (
                    /* Case 1: 학습 완료됨 -> 선택 여부 상관없이 항상 'Learn Again' 표시 */
                    <button
                      className={styles.learnAgainButton} // 새로 만든 스타일 적용
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStart(role.id);
                      }}
                    >
                      Learn Again
                    </button>
                  ) : (
                    /* Case 2: 학습 미완료 -> 선택되었을 때(isSelected)만 'Start' 표시 */
                    isSelected && (
                      <button
                        className={styles.roleStartButton} // 기존 흰색 버튼 스타일
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStart(role.id);
                        }}
                      >
                        Start
                      </button>
                    )
                  )}
                </div>

                <hr className={styles.divider}/>

                <div className={styles.roleItemInfo}>
                  <span className={styles.roleTime}>
                    {role.time}
                  </span>
                
                  <img src={Clock} alt="time" className={styles.roleTimeIcon} />
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