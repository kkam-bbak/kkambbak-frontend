import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../stores/user'
import Character2 from '../../assets/Character2.png'
import Character1 from '../../assets/Character1.png'
import Character3 from '../../assets/Character3.png'
import CharacterShining from '../../assets/Character-shining.png'
import './Introduction.css'

const MESSAGES = [
  {
    id: 1,
    english: 'Hi, buddy!\nWelcome to korea!',
    characterImage: Character2
  },
  {
    id: 2,
    english: "I'm Blinky. I'll help you start your life in Korea.",
    characterImage: Character1
  },
  {
    id: 3,
    english: "I'm looking forward to study with you!",
    characterImage: Character2
  },
  {
    id: 4,
    english: "Anyway, I'm going to give you a Korean name to commemorate your learning Korean!",
    characterImage: Character3
  },
  {
    id: 5,
    english: "Okay, Let's do it~!",
    characterImage: CharacterShining
  }
]

const MESSAGE_INTERVAL = 2000

function Introduction() {
  const navigate = useNavigate()
  const { user, logout } = useUser()
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  const currentMessage = MESSAGES[currentMessageIndex]

  useEffect(() => {
    if (!isAutoPlaying) return

    const timer = setInterval(() => {
      setCurrentMessageIndex((prev) => {
        const nextIndex = prev + 1

        if (nextIndex >= MESSAGES.length) {
          setIsAutoPlaying(false)
          setTimeout(() => {
            navigate('/mainPage')
          }, 1000)
          return prev
        }

        return nextIndex
      })
    }, MESSAGE_INTERVAL)

    return () => clearInterval(timer)
  }, [isAutoPlaying, navigate])

  const handleGoToNaming = () => {
    setIsAutoPlaying(false)
    navigate('/mainPage')
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="page-container introduction-container">
      <div className="introduction-header">
        <button className="logout-button" onClick={handleLogout}>
          {user?.isGuest ? 'Login' : 'Logout'}
        </button>
      </div>

      <div className="introduction-content">
        <div className="speech-bubble">
          <p className="bubble-text">{currentMessage.english}</p>
        </div>

        <div className="character-wrapper">
          <img
            src={currentMessage.characterImage}
            alt="Character"
            className="character-image"
          />
        </div>
      </div>

      <div className="introduction-buttons">
        <button
          className="intro-button button-naming"
          onClick={handleGoToNaming}
        >
          Go to korean naming
        </button>
      </div>
    </div>
  )
}

export default Introduction
