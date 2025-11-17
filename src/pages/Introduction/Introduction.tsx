import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../stores/user';
import { http } from '../../apis/http';
import Character2 from '../../assets/Character-Smile.png';
import Character1 from '../../assets/Character1.png';
import Character3 from '../../assets/Character-Jump.png';
import CharacterShining from '../../assets/Character-Shining.png';
import styles from './Introduction.module.css';

const MESSAGES = [
  {
    id: 1,
    english: 'Hi, buddy!\nWelcome to korea!',
    characterImage: Character2,
  },
  {
    id: 2,
    english: "I'm Blinky. I'll help you start your life in Korea.",
    characterImage: Character1,
  },
  {
    id: 3,
    english: "I'm looking forward to study with you!",
    characterImage: Character2,
  },
  {
    id: 4,
    english:
      "Anyway, I'm going to give you a Korean name to commemorate your learning Korean!",
    characterImage: Character3,
  },
  {
    id: 5,
    english: "Okay, Let's do it~!",
    characterImage: CharacterShining,
  },
];

const MESSAGE_INTERVAL = 2000;

function Introduction() {
  const navigate = useNavigate();
  const { user, logout } = useUser();
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const navigateTimeoutRef = useRef<number | null>(null);

  const currentMessage = MESSAGES[currentMessageIndex];

  useEffect(() => {
    if (!isAutoPlaying) return;

    const timer = setInterval(() => {
      setCurrentMessageIndex((prev) => {
        const nextIndex = prev + 1;

        if (nextIndex >= MESSAGES.length) {
          setIsAutoPlaying(false);
          navigateTimeoutRef.current = window.setTimeout(() => {
            navigate('/profile-creation');
          }, 1000);
          return prev;
        }

        return nextIndex;
      });
    }, MESSAGE_INTERVAL);

    return () => {
      clearInterval(timer);
      if (navigateTimeoutRef.current !== null) {
        clearTimeout(navigateTimeoutRef.current);
      }
    };
  }, [isAutoPlaying, navigate]);

  const handleGoToNaming = () => {
    setIsAutoPlaying(false);
    navigate('/profile-creation');
  };

  const handleLogout = async () => {
    if (!user?.isGuest) {
      try {
        await http.post('/api/v1/users/logout');
        logout();
      } catch (error) {
        console.error('Logout failed:', error);
        logout();
      }
    }
    navigate('/login');
  };

  return (
    <div className={`${styles.introductionContainer}`}>
      <div className={styles.introductionHeader}>
        <button className={styles.logoutButton} onClick={handleLogout}>
          {user?.isGuest ? 'Login' : 'Logout'}
        </button>
      </div>

      <div className={styles.introductionContent}>
        <div className={styles.speechBubble}>
          <p className={styles.bubbleText}>{currentMessage.english}</p>
        </div>

        <div className={styles.characterWrapper}>
          <img
            src={currentMessage.characterImage}
            alt="Character"
            className={styles.characterImage}
          />
        </div>
      </div>

      <div className={styles.introductionButtons}>
        <button
          className={`${styles.introButton} ${styles.buttonNaming}`}
          onClick={handleGoToNaming}
        >
          Go to korean naming
        </button>
      </div>
    </div>
  );
}

export default Introduction;
