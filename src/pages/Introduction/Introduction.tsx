import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import styles from './Introduction.module.css';
import Header from '@/components/layout/Header/Header';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';

const MESSAGES: Array<{
  text: string;
  image: MascotImage;
}> = [
  {
    text: 'Hi, buddy!\nWelcome to korea!',
    image: 'smile',
  },
  {
    text: "I'm Blinky. I'll help you\nstart your life in Korea.",
    image: 'basic',
  },
  {
    text: "I'm looking forward to\nstudy with you!",
    image: 'smile',
  },
  {
    text: "Anyway, I'm going to give you a\nKorean name to commemorate\nyour learning Korean!",
    image: 'jump',
  },
  {
    text: "Okay, Let's do it~!",
    image: 'shining',
  },
];

const MESSAGE_INTERVAL = 3000;

function Introduction() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((prev) => prev + 1);
    }, MESSAGE_INTERVAL);

    return () => {
      clearInterval(timer);
    };
  }, []);

  if (messageIndex >= MESSAGES.length) {
    return <Navigate to={'/profile-creation'} />;
  }

  return (
    <div className={`${styles.container}`}>
      <Header />

      <div className={styles.introduction}>
        <Mascot
          text={MESSAGES[messageIndex].text}
          image={MESSAGES[messageIndex].image}
        />
      </div>

      <div className={styles.buttons}>
        <Link to={'/mainpage'}>
          <button className={styles.button}>Go to learning</button>
        </Link>

        <Link to={'/profile-creation'}>
          <button className={styles.button}>Go to korean naming</button>
        </Link>
      </div>
    </div>
  );
}

export default Introduction;
