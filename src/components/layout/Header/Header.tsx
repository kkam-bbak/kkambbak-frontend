import { useNavigate } from 'react-router-dom';
import styles from './Header.module.css';
import ArrowBackIcon from '@/components/icons/ArrowBackIcon/ArrowBackIcon';

type HeaderProps = {
  hasBackButton?: boolean;
};

function Header({ hasBackButton = false }: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className={`${styles.header} ${hasBackButton && styles.between}`}>
      {hasBackButton && (
        <button className={styles['back-button']} onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </button>
      )}

      <button
        className={`p2 ${styles['logout-button']} `}
        onClick={() => navigate('/login')}
      >
        Logout
      </button>
    </header>
  );
}

export default Header;
