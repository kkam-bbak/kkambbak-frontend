// LearnInfo.tsx
import React, { useState, useEffect } from 'react';
import styles from './learnInfo.module.css';
import Header from '@/components/layout/Header/Header';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';

// Topic 인터페이스는 유지
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

// 🔥 안내 단계 텍스트 정의 (로직 유지를 위해 텍스트는 그대로 사용)
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
];

const LearnInfo: React.FC<LearnInfoProps> = ({
  topic,
  tab,
  isOpen,
  onClose,
  onConfirmStart,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [micHeldDown, setMicHeldDown] = useState(false);

  const topicDisplay = `${tab === 'casual' ? 'Casual_' : ''}${topic.title}`;
  const wordCount = topic.vocabularies;
  const modalClassName = `learn-info-modal-overlay ${isOpen ? 'open' : ''}`;

  useEffect(() => {
    if (!isOpen) return;

    let timer: number | undefined;
    const totalSteps = INFO_STEPS_TEXT.length;
    const isMicControlStep = currentStep >= 3 && currentStep <= 5; // 3, 4, 5 단계

    if (currentStep < totalSteps) {
      const delay = currentStep === 0 || currentStep === 1 ? 3000 : 5000;

      // 🚨 Step 3, 4, 5가 아닐 때만 자동 타이머 설정
      if (!isMicControlStep) {
        timer = setTimeout(() => {
          setCurrentStep((prev) => prev + 1);
        }, delay);
      }

      // Step 5는 사용자 액션(마이크 떼기)으로 진입하며, 5초 뒤 Step 6으로 자동 전환되어야 함
      if (currentStep === 5) {
        timer = setTimeout(() => {
          setCurrentStep((prev) => prev + 1);
        }, 5000);
      }
    } else {
      // 최종 단계 (Step 8) 완료 후 2초 뒤 자동 학습 시작
      timer = setTimeout(() => {
        onConfirmStart();
      }, 2000); // 2000ms = 2초로 설정했습니다.
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [currentStep, isOpen, onConfirmStart]);

  const currentSpeechText = INFO_STEPS_TEXT[currentStep] || '';
  const isFieldsActive = currentStep >= 2 && currentStep <= 5;

  // 🔥 캐릭터 이미지 소스를 결정하는 함수
  const getMascotImage = (): MascotImage => {
    switch (currentStep) {
      case 0: // "Okay, Let's go!"
      case 5: // "and then release the button."
        return 'smile';
      case 8: // "Okay, now focus on my instructions."
        return 'shining';
      case 1: // "Before we begin, let me briefly explain."
      case 2: // "I'll show you an image and play it back in Korean with pronunciation."
      case 3: // "Then, you hold down the button"
      case 4: // "Say the words"
      case 7: // "You can also press the voice to hear it again."
        return 'basic';
      default:
        // 6 (If you don't understand after listening,) 은 Character1이나 디폴트 이미지로 설정
        return 'basic';
    }
  };

  // 🔥 마이크 버튼 스타일 결정 (ON/OFF/Disabled)
  const getMicButtonState = () => {
    if (currentStep === 4) return 'on';
    if (currentStep === 3 || currentStep === 5) return 'off';
    return 'disabled-info';
  };

  // 🔥🔥 학습 카드 (learning-card-info) 클래스 결정 🔥🔥
  const getCardClass = () => {
    // Step 3~8일 때만 카드 전체에 흐림 효과 적용
    if (currentStep >= 3 && currentStep <= 8) {
      return 'card-fade';
    }
    // Step 2는 흐림 효과가 없고, 개별 요소만 하이라이트되어야 함.
    if (currentStep === 2) {
      return 'card-fade'; // 요청에 따라 Step 2도 전체 흐림 적용
    }
    return '';
  };

  // 🔥🔥 필드 활성화 스타일 클래스 결정 🔥🔥
  const getInputClass = (
    field: 'image' | 'korean' | 'romnized' | 'translation',
  ) => {
    let classes = '';

    if (currentStep === 2) {
      // Step 2: 이미지와 Romnized만 원색 표시 + 주황색 테두리
      if (field === 'image' || field === 'romnized') {
        classes += ' highlight-no-fade border-highlight-orange';
      }
    }

    if (currentStep === 7) {
      // Step 7: Romnized만 원색 표시 + 주황색 테두리
      if (field === 'romnized') {
        classes +=
          ' highlight-no-fade border-highlight-orange highlight-speaker';
      }
    }

    return classes.trim();
  };

  // 3. 마이크 시뮬레이션 핸들러 (유지)
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

      <Mascot image={getMascotImage()} text={currentSpeechText} />
      <div className="page-container ">
        {/* 학습 카드 영역 */}
        <div className={`${styles.learningCardInfo} ${getCardClass()}`}>
          {/* 제목 및 페이지 */}
          <div className={styles.cardTitleBarInfo}>
            <span className="topic-name-info">Casual_Emotions</span>
            <span className="word-count-info">{`01/${wordCount
              .toString()
              .padStart(2, '0')}`}</span>
          </div>

          {/* 빈 영역 (이미지) */}
          <div className={`${styles.wordDisplayAreaInfo} ${getInputClass('image')}`}>
            {/* 🔥 내용은 완전히 비워둠 */}
          </div>

          {/* 단어 정보 입력 필드 */}
          <div className={styles.inputFieldsContainerInfo}>
            {/* Romnized Row (스피커 포함) - First row */}
            <div
              className={`${styles.inputRowInfo} ${getInputClass(
                'romnized',
              )}`}
            >
              <label>Romnized</label>
              <input type="text" readOnly value={isFieldsActive ? '' : ''} />
              <button
                className={`${styles.speakerIconInfo} ${
                  currentStep === 7 ? 'highlight-speaker' : ''
                }`}
                disabled={currentStep !== 7} // Step 7에서만 활성화
              >
                {/* 🔊 아이콘을 <span>으로 감싸고 CSS로 스타일링 */}
                <span className="speaker-icon-symbol">🔊</span>
              </button>
            </div>

            {/* Korean Row - Second row */}
            <div
              className={`${styles.inputRowInfo} ${getInputClass(
                'korean',
              )}`}
            >
              <label>Korean</label>
              <input type="text" readOnly value={isFieldsActive ? '' : ''} />
            </div>

            {/* Translation Row - Third row */}
            <div
              className={`${styles.inputRowInfo}${styles.translationInfo} ${getInputClass(
                'translation',
              )}`}
            >
              <label>Translation</label>
              <input type="text" readOnly value={isFieldsActive ? '' : ''} />
            </div>
          </div>

          {/* 마이크 버튼 */}
          <button
            className={`${styles.micButtonInfo} ${getMicButtonState()}`}
            onMouseDown={handleMicDown}
            onMouseUp={handleMicUp}
            onTouchStart={handleMicDown}
            onTouchEnd={handleMicUp}
            disabled={currentStep !== 3 && currentStep !== 4}
          >
            <span className="mic-icon">🎤</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LearnInfo;
