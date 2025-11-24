import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../stores/user';
import IconImage from '../../assets/ICON.png';
import styles from './Splash.module.css';
import SplashVideo from '../../assets/splash.mp4';

export default function Splash() {
  const navigate = useNavigate();
  const user = useUser((s) => s.user);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (user) {
        navigate('/main');
      } else {
        navigate('/login');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [user, navigate]);

  return (
    <div className={styles.container}>
      <video
        src={SplashVideo}
        className={styles.video} // CSS 스타일링용 클래스
        autoPlay
        loop
        muted // 소리 끔 (필수: 없으면 자동재생 안됨)
        playsInline // 모바일 전체화면 방지 (필수)
      />
    </div>
  );
}
