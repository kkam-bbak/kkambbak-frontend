import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import  styles from './mainPage.module.css';
import Header from '@/components/layout/Header/Header';
import Mascot from '@/components/Mascot/Mascot';
import learnVideo from '../../assets/Learn Korean with one blink.mp4';
import roleplayVideo from '../../assets/Role Play.mp4';

// Navigate Prop 타입 정의
interface NavigateProp {
  navigate: ReturnType<typeof useNavigate>;
}


// --------------------------------------------------
// 📚 Learn Korean in the blink 상세 콘텐츠
// --------------------------------------------------
const LearnContent: React.FC<NavigateProp> = ({ navigate }) => (
  <>
   <div className={styles.menuHeader}>
      <h2>Learn Korean in the blink</h2>
    </div>
    <div className={styles.extendedContent}>
      
      {/* 🔥 [수정] 이미지 박스 안에 video 태그 추가 */}
      <div className={styles.contentImageBox}>
        <video
          src={learnVideo}
          className={styles.videoElement} // CSS 스타일링용 클래스
          autoPlay
          loop
          muted        // 소리 끔 (필수: 없으면 자동재생 안됨)
          playsInline  // 모바일 전체화면 방지 (필수)
        />
      </div>

      <div className={styles.contentButtons}>
        <button
          className={`${styles.actionButton} ${styles.white} ${styles.fullWidth}`}
          onClick={() => navigate('../mainpage/surveyStart')}
        >
          Start learning
        </button>
      </div>
    </div>
  </>
);

// --------------------------------------------------
// 🎭 Role Play 상세 콘텐츠
// --------------------------------------------------
const RoleContent: React.FC<NavigateProp> = ({ navigate }) => (
  <>
    <div className={styles.menuHeader}>
      <h2>Role Play</h2>
    </div>
    <div className={styles.extendedContent}>
      {/* 🔥 [수정] 이미지 박스 안에 video 태그 추가 */}
      <div className={styles.contentImageBox}>
        <video
          src={roleplayVideo}
          className={styles.videoElement} // CSS 스타일링용 클래스
          autoPlay
          loop
          muted        // 소리 끔 (필수: 없으면 자동재생 안됨)
          playsInline  // 모바일 전체화면 방지 (필수)
        />
      </div>
      <div className={`${styles.contentButtons} ${styles.center}`}>
        <button
          className={`${styles.actionButton} ${styles.white} ${styles.fullWidth}`}
          onClick={() => navigate('/mainPage/roleList')}
        >
          Start Role Playing
        </button>
      </div>
    </div>
  </>
);

// --------------------------------------------------
// 🎮 1vs1 Game 상세 콘텐츠
// --------------------------------------------------
const GameContent: React.FC<NavigateProp> = ({ navigate }) => (
  <>
    <div className={styles.menuHeader}>
      <h2>1vs1 Game</h2>
    </div>
    <div className={styles.extendedContent}>
      <div className={`${styles.contentImageBox} ${styles.green}`}>이미지 들어감</div>
      <div className={`${styles.contentButtons} ${styles.center}`}>
        <button
          className={`${styles.actionButton} ${styles.white} ${styles.fullWidth}`}
          onClick={() => navigate('/game/start')}
        >
          Start 1vs1 Game
        </button>
      </div>
    </div>
  </>
);

// --------------------------------------------------
// 👤 Profile 상세 콘텐츠
// --------------------------------------------------
const ProfileContent: React.FC<NavigateProp> = ({ navigate }) => (
  <>
    {/* ProfileContent 내부에서 전체화면 상단 영역을 직접 처리 */}
    <div className={styles.profileTopBar}>
      <div className={styles.profileTopHeader}>
        <h2 className={styles.profileTitle}>Profile</h2>
      </div>

      {/* 프로필 이미지 (실제 이미지 경로 필요) */}
      <div className={styles.profileImageBox}>
        <img
          src="https://placehold.co/100x100/9a4097/ffffff?text=Profile"
          alt="Profile"
          className={styles.profileAvatar}
        />
      </div>
    </div>

    <div className={styles.profileFieldsContainer}>
      <div className={styles.profileField}>
        <label>Korean name *</label>
        <input type="text" value="박다빛 (Park Da-bit)" readOnly />
      </div>
      <div className={styles.profileDescriptionBox}>
        A person who radiates bright and gentle energy, like the light that
        warms the world.
      </div>

      <div className={styles.profileField}>
        <label>Name *</label>
        <input type="text" value="Emily Parker" readOnly />
      </div>

      <div className={styles.profileRowFields}>
        <div className={`${styles.profileField} ${styles.halfWidth}`}>
          <label>Gender *</label>
          <input type="text" value="Female" readOnly />
        </div>
        <div className={`${styles.profileField} ${styles.halfWidth}`}>
          <label>Country of origin *</label>
          <input type="text" value="United States" readOnly />
        </div>
      </div>

      <div className={styles.profileField}>
        <label>Personality or image *</label>
        <div className={styles.profileDescriptionBox}>
          I'm lively and full of positive energy, with an adorable and
          approachable impression.
        </div>
        <p className={styles.noRoundsLeft}>No rounds left</p>
      </div>
    </div>

    <div className={styles.profileButtons}>
      <button
        className={`${styles.actionButton} ${styles.white}`}
        onClick={() => navigate('/profile/tryagain')}
      >
        Try again
      </button>
      <button
        className={`${styles.actionButton} ${styles.white}`}
        onClick={() => navigate('/profile/share')}
      >
        Share
      </button>
      <button
        className={`${styles.actionButton} ${styles.white}`}
        onClick={() => navigate('/profile/done')}
      >
        Done
      </button>
    </div>
  </>
);

// --------------------------------------------------
// [메인 컴포넌트 로직]
// --------------------------------------------------
const contentMap = {
  learn: LearnContent,
  role: RoleContent,
  '1vs1': GameContent,
  profile: ProfileContent,
};

interface MenuItem {
  id: 'learn' | 'role' | '1vs1' | 'profile';
  text: string;
  backgroundColor: string;
  bubbleText: string;
}

const menuItems: MenuItem[] = [
  {
    id: 'learn',
    text: 'Learn Korean in the blink',
    backgroundColor: '#FF5000',
    bubbleText: "Let's learn basic Korean words",
  },
  {
    id: 'role',
    text: 'Role Play',
    backgroundColor: '#007CFF',
    bubbleText: "Let's learn how to converse in Korean through role playing.",
  },
  {
    id: '1vs1',
    text: '1vs1 Game',
    backgroundColor: '#39FF14',
    bubbleText: "Let's learn how to converse in Korean through role playing.",
  },
  {
    id: 'profile',
    text: 'Profile',
    backgroundColor: '#FB14FF',
    bubbleText: 'Profile management is here!',
  },
];

const APP_HEIGHT = 720;
const HEADER_HEIGHT = 290;
const COLLAPSED_HEIGHT = 52;
const EXTENDED_HEIGHT_NORMAL =
  APP_HEIGHT - HEADER_HEIGHT - 3 * COLLAPSED_HEIGHT; // 274px (720 - 290 - 156)

// 프로필이 전체 화면을 차지할 때의 높이와 top
const PROFILE_FULL_HEIGHT = APP_HEIGHT;
const PROFILE_FULL_TOP = 0;

const MainPage: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<MenuItem['id']>('learn');
  const navigate = useNavigate();

  // 토글 로직이 포함된 클릭 핸들러
  const handleMenuClick = (id: MenuItem['id']) => {
    // Profile이 활성 상태일 때 다시 클릭하면 'learn'으로 돌아감 (토글)
    if (id === 'profile' && activeMenu === 'profile') {
      setActiveMenu('learn');
    } else {
      setActiveMenu(id);
    }
  };

  const ActiveContent = contentMap[activeMenu];
  const activeBubbleText =
    menuItems.find((item) => item.id === activeMenu)?.bubbleText || '';

  // 스타일 계산 로직: 확장/축소 높이 및 위치 계산
  const calculateStyle = (item: MenuItem, index: number) => {
    const isActive = item.id === activeMenu;

    let height = COLLAPSED_HEIGHT;
    let top = HEADER_HEIGHT; // 기본 시작 위치 (Profile이 아닌 경우)

    if (isActive) {
      if (item.id === 'profile') {
        height = PROFILE_FULL_HEIGHT;
        top = PROFILE_FULL_TOP;
      } else {
        height = EXTENDED_HEIGHT_NORMAL;
      }
    }

    // Top 위치 계산:
    if (item.id !== 'profile' || !isActive) {
      top = HEADER_HEIGHT;
      let calculatedTop = HEADER_HEIGHT;
      for (let i = 0; i < index; i++) {
        const prevItem = menuItems[i];
        const prevIsActive = prevItem.id === activeMenu;
        
        // 현재 활성화된 탭 앞에 있는 모든 탭의 높이를 더합니다.
        calculatedTop += prevIsActive ? EXTENDED_HEIGHT_NORMAL : COLLAPSED_HEIGHT;
      }
      top = calculatedTop;
    }
    
    return {
      top: `${top}px`,
      height: `${height}px`,
      zIndex: isActive ? 10 : 1, // 활성 탭이 가장 위에 오도록 z-index 조정
      // 트랜지션 적용을 위해 CSS에서 transition: all 0.3s; 설정이 필요합니다.
    };
  };

  return (
    <div className={styles.mainContainer}>
      {/* Header 컴포넌트 */}
      <Header /> 
       <Mascot image='basic' text={activeBubbleText} />
      {/* 상단 고정 요소들은 Profile 탭이 활성화되면 숨겨짐 */}
      {activeMenu !== 'profile' && (
        // <Mascot image="basic" text={activeBubbleText} /> 
        <div className={styles.mascotPlaceholder}>{activeBubbleText}</div>
      )}

      {/* 하단 메뉴 영역 (클릭 및 애니메이션) */}
      <div className={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <div
            key={item.id}
            className={`${styles.menuItem} ${styles[`menuItem${item.id.charAt(0).toUpperCase() + item.id.slice(1)}`]} ${
              item.id === 'profile' && activeMenu === 'profile'
                ? styles.profileActive
                : ''
            }`}
            style={{
              ...calculateStyle(item, index),
              backgroundColor: item.backgroundColor,
            }}
            onClick={() => handleMenuClick(item.id)}
          >
            {/* 탭 헤더 (활성화된 탭일 경우 숨김) */}
            {item.id !== activeMenu && (
              <div className={styles.tabHeader}>
                <h3
                  className={
                    item.id === 'learn' ? styles.largeText : styles.collapsedText
                  }
                >
                  {item.text}
                </h3>
              </div>
            )}

            {/* 확장된 콘텐츠 (활성화된 탭만 표시) */}
            {item.id === activeMenu && (
              <div className={styles.tabContent}>
                {/* navigate 함수를 props으로 전달 */}
                <ActiveContent navigate={navigate} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MainPage;
