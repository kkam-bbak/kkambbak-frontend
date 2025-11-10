import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../stores/user'
import IconImage from '../../assets/ICON.png'
import './Splash.css'

export default function Splash() {
  const navigate = useNavigate()
  const user = useUser((s) => s.user)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (user) {
        navigate('/mainpage')
      } else {
        navigate('/login')
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [user, navigate])

  return (
    <div className="page-container splash-container">
      <div className="splash-content">
        <img src={IconImage} alt="App Icon" className="splash-icon" />
      </div>
    </div>
  )
}
