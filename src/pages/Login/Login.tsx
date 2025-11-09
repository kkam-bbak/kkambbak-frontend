import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useUser } from '../../stores/user'
import { http } from '../../apis/http'
import Character1 from '../../assets/Character1.png'
import GoogleLogo from '../../assets/google-logo.png'
import './Login.css'

export default function Home() {
  const { login } = useUser()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  const handleGuestLogin = async () => {
    try {
      setIsLoading(true)
      // Guest 로그인 API 호출
      const response = await http.post('/users/guest-login')

      // API 응답에서 필요한 정보 추출
      const { body } = response.data
      const { tokenData, providerId, isGuest } = body

      // 사용자 정보를 store에 저장
      login({
        providerId, // 게스트 ID (소셜로그인 마이그레이션용)
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        isGuest,
      })

      // 로그인 후 메인 페이지로 이동
      navigate('/mainpage')
    } catch (error) {
      console.error('Guest login failed:', error)
      alert('게스트 로그인에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
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
          <button
            className="login-button guest-login-btn"
            onClick={handleGuestLogin}
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Guest login'}
          </button>
          <button
            className="login-button google-login-btn"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <img src={GoogleLogo} alt="Google" className="google-icon" />
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  )
}