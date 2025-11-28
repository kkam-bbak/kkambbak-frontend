import React, { useState, useEffect } from 'react';
import styles from './learnInfo.module.css';
import Header from '@/components/layout/Header/Header';
import soundButton from '../../../assets/soundButton.png';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';
import ContentSection from '@/components/layout/ContentSection/ContentSection';
import MicOn from '@/assets/MicOn.png';
import MicOff from '@/assets/MicOff.png';

import { http } from '../../../apis/http';

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
  onClose: () => void; // 이 함수는 상위 컴포넌트에서 navigate('/main/learnList')를 포함해야 합니다.
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
  'start!', //9
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
  const wordCount = topic.vocabularies; // 🔥 모달 클래스도 styles 사용
  const modalClassName = `${styles.learnInfoModalOverlay} ${
    isOpen ? styles.open : ''
  }`;

  useEffect(() => {
    let timer: number | undefined; // ⭐ [수정] 모달이 닫히면 타이머 진행을 즉시 중단하고 상태를 초기화합니다.
    if (!isOpen) {
      setCurrentStep(0);
      return;
    }

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
    // 1. 활성화 단계 (3: 누르기 전, 4: 말하기)
    if (currentStep === 4) return styles.on;
    if (currentStep === 3) return styles.off;

    // 2. ⭐ [수정] 0, 1, 9번 단계: 비활성화 상태지만 "선명하게" 보여야 함
    if (currentStep === 0 || currentStep === 1 || currentStep === 9) {
      return styles.cleanDisabled;
    }

    // 3. 나머지 단계 (2, 5~8): 흐릿하게 보여야 함 (오버레이 아래)
    return styles.disabledInfo;
  };

  const renderMicIcon = () => {
    const stateClass = getMicButtonState();
    
    // 기본 이미지는 MicBase
    let micImageSrc = MicOff; 

    // 3번, 4번 단계일 때만 MicOn/MicOff 사용
    if (currentStep === 3 || currentStep === 4) {
      micImageSrc = stateClass === styles.on ? MicOn : MicOff;
    }
    
    // (참고: cleanDisabled나 disabledInfo일 때는 위에서 설정한 MicBase가 그대로 유지됨)

    return (
      <img
        src={micImageSrc}
        alt="Mic Status"
        className={styles.micStatusImage}
      />
    );
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
      {/* ⭐ [핵심 수정]: customBackAction에 onClose 연결 */}
      <Header hasBackButton customBackAction={onClose} />
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

            <div
              className={`${styles.wordDisplayAreaInfo} ${getInputClass(
                'image',
              )}`}
            >
              {/* 내용 없음 */}
            </div>

            <div className={styles.inputFieldsContainerInfo}>
              {/* Romnized */}
              <div
                className={`${styles.inputRowInfo} ${getInputClass(
                  'romnized',
                )}`}
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
                className={`${styles.inputRowInfo} ${
                  styles.translationInfo
                } ${getInputClass('translation')}`}
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
              {renderMicIcon()}
            </button>
          </div>
        </ContentSection>
      </div>
    </div>
  );
};

export default LearnInfo;
