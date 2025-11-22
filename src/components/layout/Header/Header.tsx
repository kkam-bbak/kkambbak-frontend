import { useNavigate } from 'react-router-dom';
import styles from './Header.module.css';
import ArrowBackIcon from '@/components/icons/ArrowBackIcon/ArrowBackIcon';
import { useUser } from '@/stores/user';
import { http } from '@/apis/http';

type HeaderProps = {
  hasBackButton?: boolean;
  // 🔥 [추가] 뒤로 가기 버튼 클릭 시 실행할 커스텀 함수
  customBackAction?: () => void;
};

function Header({ hasBackButton = false, customBackAction }: HeaderProps) {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  const handleAuthClick = async () => {
    if (!user || user.isGuest) {
      navigate('/login');
      return;
    }

    try {
      await http.post('/users/logout');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      logout();
    }
  };
  
  // 🔥 [추가] 뒤로 가기 버튼 클릭 핸들러 (customBackAction 사용)
  const handleBackClick = () => {
    if (customBackAction) {
        customBackAction(); // 커스텀 액션 (예: LearnStart의 모달 띄우기) 실행
    } else {
        navigate(-1); // 기본 액션 (브라우저 히스토리) 실행
    }
  };

  return (
    <header className={`${styles.header} ${hasBackButton && styles.between}`}>
      {hasBackButton && (
        <button className={styles['back-button']} onClick={handleBackClick}>
          <ArrowBackIcon />
        </button>
      )}

      <button
        className={`p2 ${styles['logout-button']} `}
        onClick={handleAuthClick}
      >
        {!user || user.isGuest ? 'Login' : 'Logout'}
      </button>
    </header>
  );
}

export default Header;