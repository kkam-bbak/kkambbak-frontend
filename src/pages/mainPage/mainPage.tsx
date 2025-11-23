import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styles from './mainPage.module.css';
import Header from '@/components/layout/Header/Header';
import Mascot from '@/components/Mascot/Mascot';
import learnVideo from '../../assets/Learn Korean with one blink.mp4';
import roleplayVideo from '../../assets/Role Play.mp4';
import Button from '@/components/Button/Button';
import ProfileSection from './components/ProfileSection/ProfileSection';

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

  const handleMenuToggle = (e: React.MouseEvent, menu: MENU) => {
    e.stopPropagation();
    setSearchParams({ menu }, { replace: menu !== PROFILE ? true : false });
  };

  useEffect(() => {
    const menu = searchParams.get('menu');
    setOpenMenu(MENUS[menu] ?? LEARN);
  }, [searchParams]);

  return (
    <div className={styles.page}>
      <Header />

      <Mascot
        image="basic"
        text={
          openMenu === ROLE
            ? `Let's learn how to converse\nin Korean through role playing.`
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
                  muted // 소리 끔 (필수: 없으면 자동재생 안됨)
                  playsInline // 모바일 전체화면 방지 (필수)
                />
                <Link to={'/mainpage/surveyStart'}>
                  <Button isFull>Start learning</Button>
                </Link>
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
                  muted // 소리 끔 (필수: 없으면 자동재생 안됨)
                  playsInline // 모바일 전체화면 방지 (필수)
                />
                <Link to={'/mainpage/roleList'}>
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
