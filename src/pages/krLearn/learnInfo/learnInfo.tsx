// LearnInfo.tsx
import React, { useState, useEffect } from 'react';
import styles from './learnInfo.module.css';
import Header from '@/components/layout/Header/Header';
import soundButton from '../../../assets/soundButton.png';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';
import ContentSection from '@/components/layout/ContentSection/ContentSection';

interface Topic {
  id: number;
  title: string;
  vocabularies: number;
  time: string;
  completed: boolean;
}
interface LearnInfoProps {
  topic: Topic;
  tab: 'topik' | 'casual';
  isOpen: boolean;
  onClose: () => void;
  onConfirmStart: () => void;
}

const INFO_STEPS_TEXT = [
  "Okay, Let's go!", // 0
  'Before we begin, let me briefly explain.', // 1
  "I'll show you an image and play it back in Korean with pronunciation.", // 2
  'Then, you hold down the button', // 3
  'Say the words', // 4
  'and then release the button.', // 5
  "If you don't understand after listening,", // 6
  'You can also press the voice to hear it again.', // 7
  'Okay, now focus on my instructions.', // 8
  'start!',
];

const LearnInfo: React.FC<LearnInfoProps> = ({
  topic,
  tab,
  isOpen,
  onClose,
  onConfirmStart,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const topicDisplay = `${tab === 'casual' ? 'Casual_' : ''}${topic.title}`;
  const wordCount = topic.vocabularies;
  // 🔥 모달 클래스도 styles 사용
  const modalClassName = `${styles.learnInfoModalOverlay} ${isOpen ? styles.open : ''}`;

  useEffect(() => {
    if (!isOpen) return;

    let timer: number | undefined;
    const totalSteps = INFO_STEPS_TEXT.length;
    const isMicControlStep = currentStep >= 3 && currentStep <= 5;

    if (currentStep < totalSteps) {
      const delay = currentStep === 0 || currentStep === 1 ? 3000 : 5000;

      if (!isMicControlStep) {
        timer = setTimeout(() => {
          setCurrentStep((prev) => prev + 1);
        }, delay);
      }

      if (currentStep === 5) {
        timer = setTimeout(() => {
          setCurrentStep((prev) => prev + 1);
        }, 2000);
      }
    } else {
      timer = setTimeout(() => {
        onConfirmStart();
      }, 0);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [currentStep, isOpen, onConfirmStart]);

  const currentSpeechText = INFO_STEPS_TEXT[currentStep] || '';
  const isFieldsActive = currentStep >= 2 && currentStep <= 5;

  const getMascotImage = (): MascotImage => {
    switch (currentStep) {
      case 0:
      case 5:
        return 'smile';
      case 8:
        return 'shining';
      case 1:
      case 2:
      case 3:
      case 4:
      case 7:
        return 'basic';
      default:
        return 'basic';
    }
  };

  const getMicButtonState = () => {
    if (currentStep === 4) return styles.on;
    if (currentStep === 3 || currentStep === 5) return styles.off;
    return styles.disabledInfo;
  };

  const getCardClass = () => {
    if (currentStep >= 3 && currentStep <= 8) {
      return styles.cardFade;
    }
    if (currentStep === 2) {
      return styles.cardFade;
    }
    return '';
  };

  const getInputClass = (
    field: 'image' | 'korean' | 'romnized' | 'translation',
  ) => {
    const classes = [];

    if (currentStep === 2) {
      if (field === 'image' || field === 'romnized') {
        classes.push(styles.highlightNoFade);
        classes.push(styles.borderHighlightOrange);
      }
    }

    if (currentStep === 7) {
      if (field === 'romnized') {
        classes.push(styles.highlightNoFade);
        classes.push(styles.borderHighlightOrange);
        classes.push(styles.highlightSpeaker);
      }
    }

    return classes.join(' ');
  };

  const handleMicDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (currentStep === 3) setCurrentStep(4);
  };
  const handleMicUp = () => {
    if (currentStep === 4) setCurrentStep(5);
  };

  return (
    <div className={modalClassName}>
      <Header hasBackButton />

      {/* 🔥 styles.mascotWrapper 적용 */}
      <div className={styles.mascotWrapper}>
        <Mascot image={getMascotImage()} text={currentSpeechText} />
      </div>

      <div className="page-container">
        <ContentSection>
          {/* 🔥 styles.learningCardInfo 적용 */}
          <div className={`${styles.learningCardInfo} ${getCardClass()}`}>
            <div className={styles.cardTitleBarInfo}>
              <span className={styles.topicNameInfo}>Casual_Emotions</span>
              <span className={styles.wordCountInfo}>{`01/${wordCount
                .toString()
                .padStart(2, '0')}`}</span>
            </div>

            <div className={`${styles.wordDisplayAreaInfo} ${getInputClass('image')}`}>
              {/* 내용 없음 */}
            </div>

            <div className={styles.inputFieldsContainerInfo}>
              {/* Romnized */}
              <div
                className={`${styles.inputRowInfo} ${getInputClass('romnized')}`}
              >
                <label>Romnized</label>
                <input type="text" readOnly value={isFieldsActive ? '' : ''} />
                <button
                  className={`${styles.speakerIconInfo} ${
                    currentStep === 7 ? styles.highlightSpeaker : ''
                  }`}
                  disabled={currentStep !== 7}
                >
                 
                  <img 
                  src={soundButton} 
                  alt="listen" 
                  className={styles.speakerIconImage} 
                
                  
                />
                </button>
                
              </div>

              {/* Korean */}
              <div
                className={`${styles.inputRowInfo} ${getInputClass('korean')}`}
              >
                <label>Korean</label>
                <input type="text" readOnly value={isFieldsActive ? '' : ''} />
              </div>

              {/* Translation */}
              <div
                className={`${styles.inputRowInfo} ${styles.translationInfo} ${getInputClass(
                  'translation',
                )}`}
              >
                <label>Translation</label>
                <input type="text" readOnly value={isFieldsActive ? '' : ''} />
              </div>
            </div>

            <button
              className={`${styles.micButtonInfo} ${getMicButtonState()}`}
              onMouseDown={handleMicDown}
              onMouseUp={handleMicUp}
              onTouchStart={handleMicDown}
              onTouchEnd={handleMicUp}
              disabled={currentStep !== 3 && currentStep !== 4}
            >
              <span className={styles.micIcon}>🎤</span>
            </button>
          </div>
        </ContentSection>
      </div>
    </div>
  );
};

export default LearnInfo;