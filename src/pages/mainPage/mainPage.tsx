import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './mainPage.module.css';
import Header from '@/components/layout/Header/Header';
import Mascot from '@/components/Mascot/Mascot';
import learnVideo from '../../assets/Learn Korean with one blink.mp4';
import roleplayVideo from '../../assets/Role Play.mp4';
import Button from '@/components/Button/Button';
import ProfileSection from './components/ProfileSection/ProfileSection';

type MENU = 'learn' | 'role' | 'profile';

const MainPage: React.FC = () => {
  const [openMenu, setOpenMenu] = useState<MENU>('learn');

  const handleMenuToggle = (e: React.MouseEvent, menu: MENU) => {
    e.stopPropagation();
    setOpenMenu(menu);
  };

  return (
    <div className={styles.page}>
      <Header />

      <Mascot
        image="basic"
        text={
          openMenu === 'role'
            ? `Let's learn how to converse\nin Korean through role playing.`
            : `Let's learn basic Korean words`
        }
      />

      <nav className={styles.nav} data-open={openMenu}>
        <ol>
          <li
            className={`${styles.item} ${styles.learn} `}
            onClick={(e) => handleMenuToggle(e, 'learn')}
          >
            <h2 className={styles.title}>Learn Korean in the blink</h2>

            <div
              className={`${styles.panel} ${
                openMenu === 'learn' ? styles['is-open'] : ''
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
            onClick={(e) => handleMenuToggle(e, 'role')}
          >
            <h2 className={styles.title}>Role Play</h2>

            <div
              className={`${styles.panel} ${
                openMenu === 'role' ? styles['is-open'] : ''
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
            onClick={(e) => handleMenuToggle(e, 'profile')}
          >
            <h2 className={styles.title}>Profile</h2>

            <div
              className={`${styles.panel} ${
                openMenu === 'profile' ? styles['is-open'] : ''
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

// {/* 하단 메뉴 영역 (클릭 및 애니메이션) */}
// <div className={styles.menuContainer}>
//   {menuItems.map((item, index) => (
//     <div
//       key={item.id}
//       className={`${styles.menuItem} ${
//         styles[
//           `menuItem${item.id.charAt(0).toUpperCase() + item.id.slice(1)}`
//         ]
//       } ${
//         item.id === 'profile' && activeMenu === 'profile'
//           ? styles.profileActive
//           : ''
//       }`}
//       style={{
//         ...calculateStyle(item, index),
//         backgroundColor: item.backgroundColor,
//       }}
//       onClick={() => handleMenuClick(item.id)}
//     >
//       {/* 탭 헤더 (활성화된 탭일 경우 숨김) */}
//       {item.id !== activeMenu && (
//         <div className={styles.tabHeader}>
//           <h3
//             className={
//               item.id === 'learn'
//                 ? styles.largeText
//                 : styles.collapsedText
//             }
//           >
//             {item.text}
//           </h3>
//         </div>
//       )}

//       {/* 확장된 콘텐츠 (활성화된 탭만 표시) */}
//       {item.id === activeMenu && (
//         <div className={styles.tabContent}>
//           {/* navigate 함수를 props으로 전달 */}
//           <ActiveContent navigate={navigate} />
//         </div>
//       )}
//     </div>
//   ))}
// </div>
