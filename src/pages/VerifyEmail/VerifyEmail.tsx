import { useNavigate, useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useUser } from '../../stores/user'
import { http } from '../../apis/http'
import Character1 from '../../assets/Character1.png'
import CharacterWrong from '../../assets/Character-wrong.png'
import CharacterGloomy from '../../assets/Character-Gloomy.png'
import './VerifyEmail.css'

type ErrorCode = 'AT004' | 'AT005' | 'AT006' | 'AT007' | 'AT008' | 'AT009' | 'AT010' | 'MI001' | null

export default function VerifyEmail() {
  const { login } = useUser()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')
  const [otp, setOtp] = useState('')
  const [email, setEmail] = useState('')
  const [timeLeft, setTimeLeft] = useState(180) // 3분 = 180초
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<ErrorCode>(null)
  const isRateLimitExceeded = errorParam === 'email_rate_limit_exceeded' || error === 'MI001'

  useEffect(() => {
    if (timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
    setOtp(value)
    setError(null) 
  }

  const handleVerifyOtp = async () => {
    if (!code) {
      return
    }

    if (otp.length < 4) {
      return
    }

    try {
      setIsLoading(true)

      const emailResponse = await http.get('/auth/current-email', {
        params: { code }
      })

      // 응답 상태 확인
      const statusCode = emailResponse.data.status.statusCode
      if (statusCode === 'AT005') {
        navigate('/login')
        return
      }

      const currentEmail = emailResponse.data.body.email
      setEmail(currentEmail)

      const response = await http.post('/auth/verify-email', {
        email: currentEmail,
        otpCode: otp,
      })

      const { body } = response.data
      const { accessToken, refreshToken } = body

      login({
        providerId: currentEmail,
        accessToken,
        refreshToken,
        isGuest: false,
      })

      navigate('/mainpage')
    } catch (err: any) {
      const errorCode = err.response?.data?.status?.statusCode

      if (errorCode === 'AT005') {
        navigate('/login')
        return
      }

      if (['AT004', 'AT006', 'AT007', 'AT008', 'AT009', 'AT010', 'MI001'].includes(errorCode)) {
        setError(errorCode as ErrorCode)
      } else {
        console.error('OTP verification failed:', err)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendEmail = async () => {
    if (!code) return

    try {
      setIsLoading(true)

      let currentEmail = email
      if (!currentEmail) {
        const emailResponse = await http.get('/auth/current-email', {
          params: { code }
        })

        const statusCode = emailResponse.data.status.statusCode
        if (statusCode === 'AT005') {
          navigate('/login')
          return
        }

        currentEmail = emailResponse.data.body.email
        setEmail(currentEmail)
      }

      await http.post('/auth/resend-otp', { email: currentEmail })

      setTimeLeft(180)
      setOtp('')
      setError(null)
    } catch (err: any) {
      const errorCode = err.response?.data?.status?.statusCode

      if (errorCode === 'AT005') {
        navigate('/login')
        return
      }

      if (['AT004', 'AT006', 'AT007', 'AT008', 'AT009', 'AT010', 'MI001'].includes(errorCode)) {
        setError(errorCode as ErrorCode)
      } else {
        console.error('Resend failed:', err)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes.toString().padStart(2, '0')} : ${secs.toString().padStart(2, '0')}`
  }

  const isExpired = timeLeft === 0 || (error as string) === 'AT007'

  const characterSrc = isExpired || isRateLimitExceeded ? CharacterGloomy : error ? CharacterWrong : Character1

  return (
    <div className="page-container verify-email-container">
      <div className="verify-email-content">
        {/* 안내 메시지 말풍선 */}
        <div className="info-bubble">
          {isRateLimitExceeded ? (
            <>
              <div className="info-text">
                Too bad. Please wait 1 hour<br />
                to reactivate the OTP
              </div>
            </>
          ) : error && !isExpired ? (
            <>
              <div className="info-text">
                Your password is incorrect!<br />
                Please re-enter it correctly.
              </div>
            </>
          ) : isExpired ? (
            <>
              <div className="info-text">
                If you haven&apos;t received the email within a few minutes, please check your spam folder. If the issue persists, click on the &quot;Resend Email&quot; button.
              </div>
            </>
          ) : (
            <>
              <div className="info-title">verify your account</div>
              <div className="info-text">
                We&apos;ve sent a verification Code to your registered email address.
              </div>
            </>
          )}
        </div>

        {/* 캐릭터 */}
        <div className="character-placeholder">
          <img src={characterSrc} alt="Character" className="character-icon" />
        </div>

        {/* 입력 박스 (주황색 배경 - 버튼 포함) */}
        <div className={`input-box ${isExpired || isRateLimitExceeded ? 'expired' : ''}`}>
          {/* 정상 상태 - 입력 필드 표시 */}
          {!isExpired && !isRateLimitExceeded && (
            <>
              {/* 라벨 */}
              <div className="input-label">Email Verification *</div>

              {/* OTP 입력 필드 */}
              <input
                type="text"
                inputMode="numeric"
                placeholder="Enter OTP"
                value={otp}
                onChange={handleOtpChange}
                maxLength={6}
                disabled={isLoading}
                className={`otp-input ${error ? ((error as string) !== 'AT007' ? 'error' : '') : ''}`}
              />

              {/* 타이머 */}
              <div className="timer-display">
                {formatTime(timeLeft)}
              </div>
            </>
          )}

          {/* 만료 상태 - 만료 메시지 표시 */}
          {isExpired && (
            <div className="expired-message-box">
              The OTP has expired<br />
              (valid for 3 minutes).
            </div>
          )}

          {isRateLimitExceeded && (
            <div className="expired-message-box">
              Resend limit reached. You can<br />
              resend up to 30 times per hour.
            </div>
          )}

          {/* 버튼 그룹 */}
          <div className="button-group">
            {!isExpired && !isRateLimitExceeded && (
              <button
                className="verify-button confirm-btn"
                onClick={handleVerifyOtp}
                disabled={isLoading || otp.length === 0}
              >
                {isLoading ? 'Verifying...' : 'Confirm'}
              </button>
            )}
            <button
              className="verify-button resend-btn"
              onClick={isRateLimitExceeded ? () => navigate('/login') : handleResendEmail}
              disabled={isLoading && !isRateLimitExceeded}
            >
              {isRateLimitExceeded ? 'Confirm' : isLoading ? 'Sending...' : 'Resend email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
