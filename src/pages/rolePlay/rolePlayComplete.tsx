import React, { useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './rolePlayComplete.module.css';
import Header from '@/components/layout/Header/Header';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';
import ContentSection from '@/components/layout/ContentSection/ContentSection';
import { http } from '../../apis/http';
import sentenceCrt from '@/assets/sentenceCrt.png';
import date from '@/assets/Calendar.png';
import clock from '@/assets/Clock.png';
import TailAI from '@/assets/TailAI.png';
import TailUser from '@/assets/TailUser.png';
import SoundImg from '@/assets/soundButton.png';
import MicBase from '@/assets/MicBase.png';
import Button from '@/components/Button/Button';

// 유틸리티
const getFormattedCompletionDate = (dateString: string): string => {
  const now = new Date(dateString);
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

interface RoleplayScenario {
  id: number;
  title: string;
  description: string;
  estimated_minutes: number;
}

interface ApiResponseBody<T> {
  status: { statusCode: string; message: string; description: string | null };
  body: T;
}

// ⭐ [수정] TurnData 인터페이스 명확화
interface TurnData {
  speaker: string;
  korean: string;
  romanized: string;
  english: string;
}

interface LocationState {
  sessionId?: number;
  resultId?: number;
  topicName?: string;
  learningDuration?: number;
  scenarioId?: number;
  sessionSummary?: {
    correctSentence: number;
    totalSentence: number;
    completedAt: string;
  };
  timeTaken?: string;
  rolePlayName?: string;
  turns?: TurnData[]; // ⭐ any[] 대신 TurnData[] 사용
}

// ⭐ [수정] TurnDisplay 컴포넌트 (Props 타입 명시)
const TurnDisplay = ({ data }: { data: TurnData }) => {
  const isUserTurn = data.speaker === 'USER';

  // 정렬 및 스타일 클래스
  const textAlignmentClass = isUserTurn ? styles.textRight : '';
  const rowDirectionClass = isUserTurn ? styles.rowReverse : '';
  const rolePositionClass = isUserTurn ? styles.userRole : styles.aiRole;

  return (
    <div className={styles.turnWrapper}>
      <div className={styles.textDisplayBox}>
        {/* 1. Korean Line */}
        <div className={`${styles.textLine} ${rowDirectionClass}`}>
          <span className={`${styles.koreanText} ${textAlignmentClass}`}>
            {data.korean}
          </span>
          <button className={styles.ttsButton}>
            <img
              src={SoundImg}
              alt="TTS"
              style={{ width: '20px', height: '20px' }}
            />
          </button>
        </div>

        <hr className={styles.divider} />

        {/* 2. Romanized Line */}
        <div className={`${styles.textLine} ${rowDirectionClass}`}>
          <span className={`${styles.romanizedText} ${textAlignmentClass}`}>
            {data.romanized}
          </span>
          <span
            className={styles.smallMicIcon}
            style={{ marginLeft: '5px', marginRight: '5px' }}
          >
            <img
              src={MicBase}
              alt="Mic"
              style={{ width: '20px', height: '20px' }}
            />
          </span>
        </div>

        <hr className={styles.divider} />

        {/* 3. English Line */}
        <span className={`${styles.englishText} ${textAlignmentClass}`}>
          {data.english}
        </span>

        {/* 꼬리 이미지 */}
        <img
          src={isUserTurn ? TailUser : TailAI}
          className={`${styles.tailIcon} ${
            isUserTurn ? styles.tailUser : styles.tailAI
          }`}
          alt="tail"
        />
      </div>

      {/* Role Tag */}
      <div className={`${styles.roleContainer} ${rolePositionClass}`}>
        <span className={styles.roleTag}>{data.speaker}</span>
      </div>
    </div>
  );
};

const LS_KEY_COMPLETIONS = 'roleplay_completions';
interface CompletionData {
  isCompleted: boolean;
  actualTime: number;
}
type CompletedScenarios = { [scenarioId: number]: CompletionData };

const RolePlayComplete: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const turnsHistory = state?.turns || [];

  const summary = state?.sessionSummary;
  const correctCount = summary?.correctSentence || 0;
  const totalCount = summary?.totalSentence || 0;
  const rolePlayName = state?.rolePlayName || 'Role Play Result';
  const timeTaken = state?.timeTaken || '0m 0s';

  const currentScenarioId = state?.scenarioId || 0;

  const completionDate = useMemo(
    () =>
      getFormattedCompletionDate(
        summary?.completedAt || new Date().toISOString(),
      ),
    [summary?.completedAt],
  );

  const { speechBubbleText, mascotImage: characterImageSrc } = useMemo(() => {
    let text = '';
    let mascot: MascotImage;
    const correctRatio = totalCount > 0 ? correctCount / totalCount : 0;

    if (totalCount === 0) {
      text = 'No data available.';
      mascot = 'thinking';
    } else if (correctCount === totalCount) {
      text = 'Perfect!!';
      mascot = 'shining';
    } else if (correctRatio >= 2 / 3) {
      text = "It's not bad~";
      mascot = 'smile';
    } else if (correctRatio >= 1 / 2) {
      text = 'So so~';
      mascot = 'thinking';
    } else {
      text = "I'm sorry..";
      mascot = 'gloomy';
    }
    return { speechBubbleText: text, mascotImage: mascot };
  }, [correctCount, totalCount]);

  const handleBackClick = useCallback(() => {
    navigate('/mainpage/roleList');
  }, [navigate]);

  const handleTryAgain = useCallback(() => {
    if (currentScenarioId) {
      navigate(`/mainpage/rolePlay/${currentScenarioId}`, {
        state: { scenarioTitle: rolePlayName },
      });
    } else {
      navigate('/mainpage/roleList');
    }
  }, [navigate, currentScenarioId, rolePlayName]);

  const handleNextLearning = useCallback(async () => {
    try {
      const response = await http.get<ApiResponseBody<RoleplayScenario[]>>(
        '/roleplay/all',
      );
      const sessions = response.data.body;

      let completedMap: CompletedScenarios = {};
      try {
        const storedData = localStorage.getItem(LS_KEY_COMPLETIONS);
        if (storedData) {
          completedMap = JSON.parse(storedData);
        }
      } catch (e) {
        console.error(e);
      }

      if (sessions && sessions.length > 0) {
        const sortedSessions = [...sessions].sort((a, b) => a.id - b.id);
        const currentIndex = sortedSessions.findIndex(
          (s) => s.id === currentScenarioId,
        );

        let nextSession = sortedSessions
          .slice(currentIndex + 1)
          .find((s) => !completedMap[s.id]?.isCompleted);

        if (!nextSession) {
          nextSession = sortedSessions
            .slice(0, currentIndex)
            .find((s) => !completedMap[s.id]?.isCompleted);
        }

        if (!nextSession) {
          const nextIndex = (currentIndex + 1) % sortedSessions.length;
          if (
            sortedSessions.length > 1 ||
            (sortedSessions.length === 1 &&
              sortedSessions[0].id !== currentScenarioId)
          ) {
            nextSession = sortedSessions[nextIndex];
          }
        }

        if (nextSession) {
          navigate(`/mainpage/roleplay/${nextSession.id}`, {
            state: {
              scenarioTitle: nextSession.title,
            },
          });
        } else {
          alert('모든 학습을 완료했습니다! 🎉 목록으로 이동합니다.');
          navigate('/mainpage/roleList');
        }
      } else {
        alert('학습 가능한 세션이 없습니다.');
        navigate('/mainpage/roleList');
      }
    } catch (error) {
      console.error('Failed to fetch next roleplay session:', error);
      navigate('/mainpage/roleList');
    }
  }, [navigate, currentScenarioId]);

  return (
    <div className={`${styles.pageContainer} ${styles.appContainer}`}>
      <Header hasBackButton customBackAction={handleBackClick} />
      <Mascot image={characterImageSrc} text={speechBubbleText} />

      <ContentSection color="blue">
        {/* ⭐ [추가] contentWrapper로 감싸서 Flex 레이아웃 적용 */}
        <div className={styles.contentWrapper}>
          <div className={styles.cardTitleBar}>
            <span className={styles.cardTitleText}>Session Complete!</span>
          </div>

          <div className={styles.summaryDetails}>
            <span className={styles.roleName}>{rolePlayName}</span>

            {/* ⭐ 요약 카드용 구분선 클래스 사용 */}
            <hr className={styles.summaryDivider} />

            <div className={`${styles.detailItem} ${styles.stat}`}>
              <img
                src={sentenceCrt}
                alt="Correct sentences"
                className={styles.statIcon}
                style={{ width: '14px', height: '14px' }}
              />
              <span className={styles.statLabel}>
                {correctCount}/{totalCount} sentences correct
              </span>
            </div>

            <hr className={styles.summaryDivider} />

            <div className={`${styles.detailItem} ${styles.stat}`}>
              <img
                src={clock}
                alt="Time taken"
                className={styles.statIcon}
                style={{ width: '14px', height: '14px' }}
              />
              <span className={styles.statLabel}>{timeTaken}</span>
            </div>

            <hr className={styles.summaryDivider} />

            <div className={`${styles.detailItem} ${styles.stat}`}>
              <img
                src={date}
                alt="Completion date"
                className={styles.statIcon}
                style={{ width: '14px', height: '14px' }}
              />
              <span className={styles.statLabel}>{completionDate}</span>
            </div>
          </div>

          {/* 히스토리 영역 */}
          <div className={styles.completeHistoryArea}>
            {/* ⭐ [수정] index prop 제거 (TurnDisplay에서도 안쓰도록 수정함) */}
            {turnsHistory.map((turn, index) => (
              <TurnDisplay key={index} data={turn} />
            ))}
          </div>

          <div className={styles.buttonsContainer}>
            <Button isFull onClick={handleTryAgain}>
              Try again
            </Button>
            <Button isFull onClick={handleNextLearning}>
              Next learning
            </Button>
          </div>
        </div>
      </ContentSection>
    </div>
  );
};

export default RolePlayComplete;
