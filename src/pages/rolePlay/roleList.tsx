import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react'; // 시간 아이콘
import './roleList.css';
import Header from '@/components/layout/Header/Header';
import Mascot from '@/components/Mascot/Mascot';

// --- 데이터 구조 정의 ---
interface RolePlayItem {
  id: number;
  title: string;
  time: string;
  isSubscribed: boolean;
}

// --- 더미 데이터 ---
const DUMMY_ROLES: RolePlayItem[] = [
  { id: 1, title: 'At a Cafe', time: '5m 15s', isSubscribed: true }, //구독된 항목 | 구독되지 않은 항목
  { id: 2, title: 'At School', time: '5m 15s', isSubscribed: true },
  { id: 3, title: 'At Hospital', time: '5m 15s', isSubscribed: true },
  { id: 4, title: 'Korean Slangs', time: '5m 15s', isSubscribed: false },
  { id: 5, title: 'Job Interview', time: '5m 15s', isSubscribed: false },
  { id: 6, title: 'Visiting a friend', time: '5m 15s', isSubscribed: false },
  { id: 7, title: 'Shopping at a mart', time: '5m 15s', isSubscribed: false },
];

const RoleList: React.FC = () => {
  const navigate = useNavigate();
  // 🔥 선택된 항목의 ID를 저장하는 상태 추가 (기본값 null)
  const [selectedRole, setSelectedRole] = useState<number | null>(
    DUMMY_ROLES[0].id,
  );

  // 말풍선 텍스트
  const speechBubbleText = 'Choose a place to talk';

  const handleStart = (roleId: number) => {
    console.log(`Starting role play for ID: ${roleId}`);
    navigate(`/mainpage/rolePlay/${roleId}`);
  };

  // 🔥 항목 클릭 시 상태 업데이트 핸들러
  const handleRoleSelect = (roleId: number) => {
    setSelectedRole(roleId);
  };

  const handleSubscribe = () => {
    alert('구독 페이지로 이동합니다.');
  };

  return (
    <div className="role-list-container">
      <Header hasBackButton />
      <Mascot image="basic" text={speechBubbleText} />

      {/* 하단 역할극 목록 섹션 */}
      <div className="role-content-window">
        <div className="role-list-content-header">
          <h2 className="role-list-title">Role Play</h2>
          <button className="subscribe-button" onClick={handleSubscribe}>
            Subscribe
          </button>
        </div>

        {/* 역할극 항목 리스트 */}
        <div className="role-list-items-container">
          {DUMMY_ROLES.map((role) => {
            const isSelected = role.id === selectedRole;
            const isStartVisible = isSelected && role.isSubscribed; // 구독 여부도 고려

            return (
              <div
                key={role.id}
                className={`role-item-row ${isSelected ? 'selected' : ''}`}
                onClick={() => handleRoleSelect(role.id)} // 🔥 클릭 핸들러 추가
              >
                {/* 첫 번째 줄: 제목 및 Start 버튼 */}
                <div className="role-item-header">
                  <span className="role-item-title">{role.title}</span>

                  {isStartVisible && (
                    <button
                      className="role-start-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStart(role.id);
                      }} // 🔥 이벤트 버블링 방지
                    >
                      Start
                    </button>
                  )}
                </div>

                {/* 두 번째 줄: 시간 정보 */}
                <div className="role-item-info">
                  <span className="role-time">{role.time}</span>
                  <Clock className="role-time-icon" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RoleList;
