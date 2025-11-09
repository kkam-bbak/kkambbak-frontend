import { useNavigate } from 'react-router-dom'
import { useUser } from '../../stores/user'
import Character1 from '../../assets/Character1.png'
import GoogleLogo from '../../assets/google-logo.png'
import './Login.css'

export default function Home() {
  const { login } = useUser()
  const navigate = useNavigate()

  const handleGuestLogin = () => {
    // Guest 사용자로 로그인
    login({ id: 'guest', name: 'Guest User' })
    // 로그인 후 메인 페이지로 이동
    navigate('/mainpage')
  }

  const handleGoogleLogin = () => {
    // TODO: Google OAuth 구현
    console.log('Google login not yet implemented')
  }

  return (
    <div className="page-container login-container">
      <div className="login-content">
        {/* 인사말 */}
        <div className="greeting-bubble">
          Which one do you want?
        </div>

        {/* 캐릭터 플레이스홀더 */}
        <div className="character-placeholder">
          <img src={Character1} alt="Character" className="character-icon" />
        </div>

        {/* 버튼 그룹 */}
        <div className="button-group">
          <button className="login-button guest-login-btn" onClick={handleGuestLogin}>
            Guest login
          </button>
          <button className="login-button google-login-btn" onClick={handleGoogleLogin}>
            <img src={GoogleLogo} alt="Google" className="google-icon" />
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  )
}