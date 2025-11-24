import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import styles from './mainPage.module.css';
import Header from '@/components/layout/Header/Header';
import Mascot from '@/components/Mascot/Mascot';
import learnVideo from '../../assets/Learn Korean with one blink.mp4';
import roleplayVideo from '../../assets/Role Play.mp4';
import Button from '@/components/Button/Button';
import ProfileSection from './components/ProfileSection/ProfileSection';
import { http } from '../../apis/http';

export const LEARN = 'learn';
const ROLE = 'role';
const PROFILE = 'profile';
const MENUS = {
  [LEARN]: LEARN,
  [ROLE]: ROLE,
  [PROFILE]: PROFILE,
};
type MENU = typeof LEARN | typeof ROLE | typeof PROFILE;

const MainPage: React.FC = () => {
  const [openMenu, setOpenMenu] = useState<MENU>(LEARN);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate(); // 네비게이션 훅 사용

  const handleMenuToggle = (e: React.MouseEvent, menu: MENU) => {
    e.stopPropagation();
    setSearchParams({ menu }, { replace: menu !== PROFILE ? true : false });
  };

  useEffect(() => {
    const menu = searchParams.get('menu');
    setOpenMenu(MENUS[menu] ?? LEARN);
  }, [searchParams]);

  // Start Learning 버튼 클릭 핸들러
  const handleStartLearning = async () => {
    try {
      // 설문 완료 여부 확인 API 호출
      const response = await http.get('/surveys/check');
      const isCompleted = response.data?.body?.completed;

      if (isCompleted) {
        // 설문 완료 상태라면 바로 학습 목록으로 이동
        navigate('/main/learnList');
      } else {
        // 설문 미완료 상태라면 설문 시작 페이지로 이동
        navigate('/main/surveyStart');
      }
    } catch (error) {
      console.error('설문 확인 중 오류 발생:', error);
      // API 호출 실패 시 기본 동작으로 설문 시작 페이지로 이동
      navigate('/main/surveyStart');
    }
  };

  return (
    <div className={styles.page}>
      <Header />

      <Mascot
        image="basic"
        text={
          openMenu === ROLE
            ? `Let's learn how to converse in\nKorean through role playing.`
            : `Let's learn basic Korean words`
        }
      />

      <nav className={styles.nav} data-open={openMenu}>
        <ol>
          <li
            className={`${styles.item} ${styles.learn} `}
            onClick={(e) => handleMenuToggle(e, LEARN)}
          >
            <h2 className={styles.title}>Learn Korean with one blink</h2>

            <div
              className={`${styles.panel} ${
                openMenu === LEARN ? styles['is-open'] : ''
              }`}
            >
              <div className={styles.content}>
                <video
                  src={learnVideo}
                  className={styles.video}
                  autoPlay
                  loop
                  muted
                  playsInline
                />
                <Button isFull onClick={handleStartLearning}>
                  Start learning
                </Button>
              </div>
            </div>
          </li>

          <li
            className={`${styles.item} ${styles.role} `}
            onClick={(e) => handleMenuToggle(e, ROLE)}
          >
            <h2 className={styles.title}>Role Play</h2>

            <div
              className={`${styles.panel} ${
                openMenu === ROLE ? styles['is-open'] : ''
              }`}
            >
              <div className={styles.content}>
                <video
                  src={roleplayVideo}
                  className={styles.video}
                  autoPlay
                  loop
                  muted
                  playsInline
                />
                <Link to={'/main/roleList'}>
                  <Button isFull>Start Role Playing</Button>
                </Link>
              </div>
            </div>
          </li>

          <li
            className={`${styles.item} ${styles.profile} `}
            onClick={(e) => handleMenuToggle(e, PROFILE)}
          >
            <h2 className={styles.title}>Profile</h2>

            <div
              className={`${styles.panel} ${
                openMenu === PROFILE ? styles['is-open'] : ''
              }`}
            >
              <div className={styles.content}>
                <ProfileSection onMenuToggle={handleMenuToggle} />
              </div>
            </div>
          </li>
        </ol>
      </nav>
    </div>
  );
};

export default MainPage;
