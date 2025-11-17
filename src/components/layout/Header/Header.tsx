import { useNavigate } from 'react-router-dom';
import styles from './Header.module.css';
import ArrowBackIcon from '@/components/icons/ArrowBackIcon/ArrowBackIcon';
import { useUser } from '@/stores/user';
import { http } from '@/apis/http';

type HeaderProps = {
  hasBackButton?: boolean;
};

function Header({ hasBackButton = false }: HeaderProps) {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  const handleAuthClick = async () => {
    if (!user || user.isGuest) {
      navigate('/login');
      return;
    }

    try {
      await http.post('/api/v1/users/logout');
      logout();
    } catch (error) {
      console.error('Logout failed:', error);
      logout();
    }
  };

  return (
    <header className={`${styles.header} ${hasBackButton && styles.between}`}>
      {hasBackButton && (
        <button className={styles['back-button']} onClick={() => navigate(-1)}>
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
