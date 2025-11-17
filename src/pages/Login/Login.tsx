import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useUser } from '../../stores/user';
import { http } from '../../apis/http';
import Character1 from '../../assets/Character1.png';
import GoogleLogo from '../../assets/google-logo.png';
import styles from './Login.module.css';

export default function Home() {
  const { login } = useUser();
  const user = useUser((s) => s.user);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleGuestLogin = async () => {
    try {
      setIsLoading(true);
      // Guest 로그인 API 호출
      const response = await http.post('/api/v1/users/guest-login');

      // API 응답에서 필요한 정보 추출
      const { body } = response.data;
      const { tokenData, providerId, isGuest } = body;

      // 사용자 정보를 store에 저장
      login({
        providerId, // 게스트 ID
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        isGuest,
      });

      navigate('/introduction');
    } catch (error) {
      console.error('Guest login failed:', error);
      alert('게스트 로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    let oauthUrl = 'https://kkambbak.duckdns.org/oauth2/authorization/google';

    // 게스트 사용자인 경우 guestProviderId 파라미터 추가
    if (user?.isGuest) {
      oauthUrl += `?guestProviderId=${user.providerId}`;
    }

    window.location.href = oauthUrl;
  };

  return (
    <div className={styles.loginContainer}>
      {/* 인사말 */}
      <div className={styles.characterContainer}>
        <div className={styles.greetingBubble}>Which one do you want?</div>

        {/* 캐릭터 플레이스홀더 */}
        <div className={styles.characterPlaceholder}>
          <img
            src={Character1}
            alt="Character"
            className={styles.characterIcon}
          />
        </div>
      </div>

      {/* 버튼 그룹 */}
      <div className={styles.buttonGroup}>
        <button
          className={`${styles.loginButton} ${styles.guestLoginBtn}`}
          onClick={handleGuestLogin}
          disabled={isLoading}
        >
          {isLoading ? 'Logging in...' : 'Guest login'}
        </button>
        <button
          className={`${styles.loginButton} ${styles.googleLoginBtn}`}
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <img src={GoogleLogo} alt="Google" className={styles.googleIcon} />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
