import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useUser } from '../../stores/user'

export default function OAuthRedirect() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useUser()

  useEffect(() => {
    const accessToken = searchParams.get('accessToken')
    const refreshToken = searchParams.get('refreshToken')

    if (accessToken && refreshToken) {
      login({
        providerId: '',
        accessToken,
        refreshToken,
        isGuest: false,
      })

      navigate('/mainpage')
    } else {
      // 토큰이 없으면 로그인 페이지로
      navigate('/login')
    }
  }, [searchParams, login, navigate])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#1b1b1b',
      color: '#FFFFFF'
    }}>
      <p>로그인 중...</p>
    </div>
  )
}
