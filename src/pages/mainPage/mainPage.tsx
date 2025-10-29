import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './mainPage.css'; 

// Navigate Prop 타입 정의
interface NavigateProp {
    navigate: ReturnType<typeof useNavigate>;
}

// Learn Korean in the blink 상세 콘텐츠
const LearnContent: React.FC<NavigateProp> = ({ navigate }) => (
    <>
        <div className="menu-header">
            <h2>Learn Korean in the blink</h2>
        </div>
        <div className="extended-content">
            <div className="content-image-box">이미지 들어감</div>
            <div className="content-buttons">
                <button className="action-button white" onClick={() => navigate('../mainpage/survey')}>Survey</button>
                <button className="action-button white" onClick={() => navigate('../mainpage/learnList')}>Start learning</button>
            </div>
        </div>
    </>
);

// Role Play 상세 콘텐츠
const RoleContent: React.FC<NavigateProp> = ({ navigate }) => (
    <>
        <div className="menu-header">
            <h2>Role Play</h2>
        </div>
        <div className="extended-content">
            <div className="content-image-box blue">이미지 들어감</div>
            <div className="content-buttons center">
                <button className="action-button white full-width" onClick={() => navigate('/roleplay/start')}>Start Role Playing</button>
            </div>
        </div>
    </>
);

// 1vs1 Game 상세 콘텐츠
const GameContent: React.FC<NavigateProp> = ({ navigate }) => (
    <>
        <div className="menu-header">
            <h2>1vs1 Game</h2>
        </div>
        <div className="extended-content">
            <div className="content-image-box green">이미지 들어감</div>
            <div className="content-buttons center">
                <button className="action-button white full-width" onClick={() => navigate('/game/start')}>Start 1vs1 Game</button>
            </div>
        </div>
    </>
);

// Profile 상세 콘텐츠
const ProfileContent: React.FC<NavigateProp> = ({ navigate }) => (
    <>
        {/* ProfileContent 내부에서 전체화면 상단 영역을 직접 처리 */}
        <div className="profile-top-bar">
            <div className="profile-top-header">
                <h2 className="profile-title">Profile</h2>
            </div>
            
            {/* 프로필 이미지 (실제 이미지 경로 필요) */}
            <div className="profile-image-box">
                <img src="https://placehold.co/100x100/9a4097/ffffff?text=Profile" alt="Profile" className="profile-avatar"/> 
            </div>
        </div>
        
        <div className="profile-fields-container">
            <div className="profile-field">
                <label>Korean name *</label>
                <input type="text" value="박다빛 (Park Da-bit)" readOnly />
            </div>
            <div className="profile-description-box">
                A person who radiates bright and gentle energy, like the light that warms the world.
            </div>
            
            <div className="profile-field">
                <label>Name *</label>
                <input type="text" value="Emily Parker" readOnly />
            </div>
            
            <div className="profile-row-fields">
                <div className="profile-field half-width">
                    <label>Gender *</label>
                    <input type="text" value="Female" readOnly />
                </div>
                <div className="profile-field half-width">
                    <label>Country of origin *</label>
                    <input type="text" value="United States" readOnly />
                </div>
            </div>

            <div className="profile-field">
                <label>Personality or image *</label>
                <div className="profile-description-box">
                    I'm lively and full of positive energy, with an adorable and approachable impression.
                </div>
                <p className="no-rounds-left">No rounds left</p>
            </div>
        </div>

        <div className="profile-buttons">
            <button className="action-button white" onClick={() => navigate('/profile/share')}>Share</button>
          
        </div>
    </>
);

const contentMap = {
    learn: LearnContent,
    role: RoleContent,
    '1vs1': GameContent,
    profile: ProfileContent,
};

// [메인 컴포넌트 로직]
interface MenuItem {
    id: 'learn' | 'role' | '1vs1' | 'profile';
    text: string;
    backgroundColor: string;
    bubbleText: string;
}

const menuItems: MenuItem[] = [
    { id: 'learn', text: 'Learn Korean in the blink', backgroundColor: '#ff4d00', bubbleText: 'Let\'s learn basic Korean words' },
    { id: 'role', text: 'Role Play', backgroundColor: '#007CFF', bubbleText: 'Let\'s learn how to converse in Korean through role playing.' },
    { id: '1vs1', text: '1vs1 Game', backgroundColor: '#39FF14', bubbleText: 'Let\'s learn how to converse in Korean through role playing.' },
    { id: 'profile', text: 'Profile', backgroundColor: '#FB14FF', bubbleText: 'Profile management is here!' },
];

const APP_HEIGHT = 720;
const HEADER_HEIGHT = 300; 
const COLLAPSED_HEIGHT = 40; 
const EXTENDED_HEIGHT_NORMAL = APP_HEIGHT - HEADER_HEIGHT - (3 * COLLAPSED_HEIGHT); // 420px

// 프로필이 전체 화면을 차지할 때의 높이와 top
const PROFILE_FULL_HEIGHT = APP_HEIGHT; 
const PROFILE_FULL_TOP = 0; 

const MainPage: React.FC = () => {
    const [activeMenu, setActiveMenu] = useState<MenuItem['id']>('learn');
    const navigate = useNavigate();

    
    
    // 토글 로직이 포함된 클릭 핸들러
    const handleMenuClick = (id: MenuItem['id']) => {
        if (id === 'profile' && activeMenu === 'profile') {
            setActiveMenu('learn');
        } else {
            setActiveMenu(id);
        }
    };

    const ActiveContent = contentMap[activeMenu];
    const activeBubbleText = menuItems.find(item => item.id === activeMenu)?.bubbleText || '';

    // 스타일 계산 로직: 확장/축소 높이 및 위치 계산
    const calculateStyle = (item: MenuItem, index: number) => {
        const isActive = item.id === activeMenu;
        
        let height = COLLAPSED_HEIGHT; 
        let top = HEADER_HEIGHT; 

        if (isActive) {
            if (item.id === 'profile') {
                height = PROFILE_FULL_HEIGHT; 
                top = PROFILE_FULL_TOP;       
            } else {
                height = EXTENDED_HEIGHT_NORMAL; 
            }
        }

        // Top 위치 계산 (Profile이 활성 탭이 아닐 때)
        if (item.id !== 'profile' || !isActive) { 
            top = HEADER_HEIGHT; 
            for (let i = 0; i < index; i++) {
                const prevItem = menuItems[i];
                const prevIsActive = prevItem.id === activeMenu;
                top += prevIsActive ? EXTENDED_HEIGHT_NORMAL : COLLAPSED_HEIGHT;
            }
        }
        
        return {
            top: `${top}px`,
            height: `${height}px`,
            zIndex: isActive ? 10 : 1, 
        };
    };

    return (
        <div className="app-container">
            {/* 상단 고정 요소들은 Profile 탭이 활성화되면 숨겨짐 */}
            {activeMenu !== 'profile' && (
                <>
                    {/* Logout 버튼 (비활성 시) */}
                    <button className="logout-button" onClick={() => navigate('/auth/login')}>Logout</button>
                    
                    {/* 말풍선과 꼬리 */}
                    <div className="speech-bubble">
                        {activeBubbleText}
                        <div className="bubble-tail"></div>
                    </div>
                    <div className="character-placeholder"></div>
                </>
            )}

            {/* 하단 메뉴 영역 (클릭 및 애니메이션) */}
            <div className="menu-container">
                {menuItems.map((item, index) => (
                    <div
                        key={item.id}
                        className={`menu-item menu-item-${item.id} ${item.id === 'profile' && activeMenu === 'profile' ? 'profile-active' : ''}`}
                        style={{
                            ...calculateStyle(item, index),
                            backgroundColor: item.backgroundColor,
                        }}
                        onClick={() => handleMenuClick(item.id)}
                    >
                        {/* 탭 헤더 (활성화된 탭일 경우 숨김) */}
                        {item.id !== activeMenu && (
                            <div className="tab-header">
                                <h3 className={item.id === 'learn' ? 'large-text' : 'collapsed-text'}>
                                    {item.text}
                                </h3>
                            </div>
                        )}

                        {/* 확장된 콘텐츠 (활성화된 탭만 표시) */}
                        {item.id === activeMenu && (
                            <div className="tab-content">
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