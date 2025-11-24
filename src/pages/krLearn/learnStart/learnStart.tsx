import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import styles from './learnStart.module.css';
import soundButton from '../../../assets/soundButton.png';
import { http } from '../../../apis/http';
import Header from '@/components/layout/Header/Header';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';
import CorrectImg from '@/assets/Correct.png';
import InCorrectImg from '@/assets/InCorrect.png';
import MicOn from '@/assets/MicOn.png';
import MicOff from '@/assets/MicOff.png';
import CrtSnd from '@/assets/CrtSnd.mp3';
import WrgSnd from '@/assets/WrgSnd.mp3';
import ContentSection from '@/components/layout/ContentSection/ContentSection';
import Button from '@/components/Button/Button';
import SpinnerIcon from '@/components/icons/SpinnerIcon/SpinnerIcon';

// --- 인터페이스 정의 ---
interface ApiResponseBody<T> {
  status: { statusCode: string; message: string; description: string | null };
  body: T;
}

interface FirstVocabulary {
  vocabularyId: number;
  korean: string;
  romanization: string;
  english: string;
  imageId?: string;
  imageUrl?: string;
}

interface LearningStartBody {
  sessionId: string | number;
  resultId: number;
  vocabIds: number[];
  totalVocabularyCount: number;
  baseResultId: number | null;
  firstVocabulary: FirstVocabulary | null;
  sessionTitle: string;
}
type LearningStartResponse = ApiResponseBody<LearningStartBody>;

interface NextItem {
  itemId: number;
  korean: string;
  romanization: string;
  english: string;
  imageUrl: string;
}

interface GradeData {
  correct: boolean;
  moved: boolean;
  finished: boolean;
  next: NextItem | null;
  correctAnswer: string | null;
  score: number;
}
type GradeResponse = ApiResponseBody<GradeData>;

interface LearningContent {
  topicTitle: string;
  itemId: number;
  korean: string;
  romanized: string;
  translation: string;
  imageUrl: string;
}
export interface WordResult {
  romnized: string;
  korean: string;
  translation: string;
  isCorrect: boolean;
}
interface LocationState {
  wordsToRetry?: WordResult[];
  isRetryWrong?: boolean;
  baseResultId?: number;
  categoryName?: string;
}
type LearningStatus = 'initial' | 'listen' | 'countdown' | 'speak';
type ResultStatus = 'none' | 'processing' | 'correct' | 'incorrect';
type ResultDisplayStatus = 'none' | 'initial_feedback' | 'meaning_revealed';

const LS_LEARNING_TIMES_KEY = 'learning_completion_times';

const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
};

// (삭제하지 않더라도 호출을 안 하면 되지만, 일단 함수는 둡니다)
const clearLocalLearningTime = (sessionId: number) => {
  try {
    const storedData = localStorage.getItem(LS_LEARNING_TIMES_KEY);
    if (storedData) {
      const times: any = JSON.parse(storedData);
      delete times[sessionId];
      if (times[String(sessionId) as unknown as number]) {
        delete times[String(sessionId) as unknown as number];
      }
      localStorage.setItem(LS_LEARNING_TIMES_KEY, JSON.stringify(times));
    }
  } catch (e) {
    console.error('Failed to clear local learning time', e);
  }
};

const emptyContent: LearningContent = {
  topicTitle: 'Loading...',
  itemId: 0,
  korean: '',
  romanized: '',
  translation: '',
  imageUrl: 'https://placehold.co/100x100/CCCCCC/000000?text=Wait',
};

const firstVocabToContent = (
  vocab: FirstVocabulary,
  title: string,
): LearningContent => ({
  topicTitle: title,
  itemId: vocab.vocabularyId,
  korean: vocab.korean,
  romanized: vocab.romanization,
  translation: vocab.english,
  imageUrl: vocab.imageUrl || vocab.imageId || '',
});

const nextItemToContent = (
  item: NextItem,
  topicTitle: string,
): LearningContent => ({
  topicTitle,
  itemId: item.itemId,
  korean: item.korean,
  romanized: item.romanization,
  translation: item.english,
  imageUrl:
    item.imageUrl ||
    'https://placehold.co/100x100/E64A19/FFFFFF?text=' + item.korean,
});

// ... WAV util functions ...
const writeWavHeader = (sampleRate: number, dataLength: number) => {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++)
      view.setUint8(offset + i, string.charCodeAt(i));
  };
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  return buffer;
};
const convertToWav = async (webmBlob: Blob): Promise<File> => {
  const audioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)();
  const arrayBuffer = await webmBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const channelData = audioBuffer.getChannelData(0); // Mono
  const dataLength = channelData.length * 2;
  const buffer = new ArrayBuffer(dataLength);
  const view = new DataView(buffer);
  for (let i = 0; i < channelData.length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  const header = writeWavHeader(audioBuffer.sampleRate, dataLength);
  const wavBlob = new Blob([header, buffer], { type: 'audio/wav' });
  return new File([wavBlob], 'recording.wav', { type: 'audio/wav' });
};

const LearnStart: React.FC = () => {
  const location = useLocation();
  const state = location.state as LocationState;
  const { topicId: sessionIdParam } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const currentCategory = state?.categoryName || 'TOPIK';

  // Refs
  const hasFetched = useRef(false);
  const startTimeRef = useRef<number>(0);
  const resultsRef = useRef<WordResult[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const isProcessingRef = useRef(false);

  const wordsToRetry = state?.wordsToRetry;
  const isRetryWrong = state?.isRetryWrong || false;
  const initialBaseResultId = state?.baseResultId || null;

  const [content, setContent] = useState<LearningContent>(emptyContent);
  const [currentWordIndex, setCurrentWordIndex] = useState(1);
  const [totalWords, setTotalWords] = useState(0);
  const [resultId, setResultId] = useState<number | null>(null);
  const [baseResultId, setBaseResultId] = useState<number | null>(
    initialBaseResultId,
  );
  const [isLoading, setIsLoading] = useState(true);

  const [status, setStatus] = useState<LearningStatus>('initial');
  const [resultStatus, setResultStatus] = useState<ResultStatus>('none');
  const [displayStatus, setDisplayStatus] =
    useState<ResultDisplayStatus>('none');
  const [micOn, setMicOn] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdownTime, setCountdownTime] = useState(0);
  const countdownRef = useRef<number | null>(null);

  const [showExitModal, setShowExitModal] = useState(false);

  const [isTtsPlaying, setIsTtsPlaying] = useState(false);

  // --- 가시성 조건 ---
  const isWordVisible = status !== 'initial';
  const isSpeakerActive = status !== 'initial';

  const isInputTextHiddenDuringChallenge =
    (status === 'countdown' || status === 'speak') && resultStatus === 'none';
  const isInputTextVisible = !isInputTextHiddenDuringChallenge;

  const isRomnizedVisible = isInputTextVisible || isTtsPlaying;
  const isKoreanVisible = isInputTextVisible;
  const isTranslationVisible = isInputTextVisible;

  const isIncorrectView = resultStatus === 'incorrect';
  const isMicActiveForRecording =
    (status === 'countdown' || status === 'speak') &&
    resultStatus === 'none' &&
    !isProcessing;

  // TTS
  const speakKoreanText = useCallback(
    (text: string) => {
      if (!('speechSynthesis' in window) || showExitModal) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';

      setIsTtsPlaying(true);
      utterance.onend = () => setIsTtsPlaying(false);
      utterance.onerror = () => setIsTtsPlaying(false);

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    [showExitModal],
  );

  // 효과음
  useEffect(() => {
    if (resultStatus === 'correct') {
      const audio = new Audio(CrtSnd);
      audio.play().catch((e) => console.error('Audio play failed', e));
    } else if (resultStatus === 'incorrect') {
      const audio = new Audio(WrgSnd);
      audio.play().catch((e) => console.error('Audio play failed', e));
    }
  }, [resultStatus]);

  const handleSessionData = (data: LearningStartBody) => {
    if (data.firstVocabulary) {
      setContent(firstVocabToContent(data.firstVocabulary, data.sessionTitle));
      setTotalWords(data.totalVocabularyCount);
      setResultId(data.resultId);
      if (data.baseResultId !== undefined) setBaseResultId(data.baseResultId);
      setCurrentWordIndex(1);
      setStatus('initial');
      startTimeRef.current = Date.now();
      resultsRef.current = [];
    } else {
      alert('학습 데이터가 없습니다.');
      navigate('/main/learnList');
    }
  };

  const fetchLearningData = useCallback(async () => {
    const numericSessionId = Number(sessionIdParam);
    if (!sessionIdParam || isNaN(numericSessionId)) {
      alert('잘못된 접근입니다.');
      navigate('/main/learn');
      return;
    }
    setIsLoading(true);
    try {
      const modeParam = isRetryWrong ? 'WRONG_ONLY' : 'ALL';
      const bodyPayload: { mode: string; baseResultId?: string | null } = {
        mode: modeParam,
      };

      if (modeParam === 'WRONG_ONLY') {
        if (baseResultId === null) {
          setIsLoading(false);
          return;
        }
        bodyPayload.baseResultId = String(baseResultId);
      }

      const response = await http.post<LearningStartResponse>(
        `/learning/sessions/${numericSessionId}/start`,
        bodyPayload,
        {},
      );
      handleSessionData(response.data.body);
    } catch (error: any) {
      alert(
        '세션 시작 실패: ' +
          (error.response?.data?.status?.message || '알 수 없는 오류'),
      );
      navigate('/main/learnList');
    } finally {
      setIsLoading(false);
    }
  }, [sessionIdParam, navigate, wordsToRetry, isRetryWrong, baseResultId]);

  const startGrading = useCallback(
    async (
      action: 'GRADE' | 'NEXT_AFTER_WRONG',
      audioFile: File | null = null,
    ) => {
      if (isProcessingRef.current && action === 'GRADE' && !audioFile) return;

      if (resultId === null) {
        console.warn('startGrading called without resultId. Ignoring.');
        return;
      }
      const numericSessionId = Number(sessionIdParam);

      if (action === 'GRADE' && !audioFile) {
        if (isProcessingRef.current) return;
        console.warn(
          '오디오 파일 없음: 시간 초과 또는 녹음 실패로 간주 -> 오답 처리',
        );
        setResultStatus('incorrect');
        return;
      }

      if (action === 'GRADE') {
        setIsProcessing(true);
        isProcessingRef.current = true;
      }
      setMicOn(false);
      setIsTtsPlaying(false);

      const formData = new FormData();
      formData.append('action', action);
      formData.append('itemId', String(content.itemId));
      formData.append('resultId', String(resultId));

      const mode = isRetryWrong ? 'WRONG_ONLY' : 'ALL';
      formData.append('mode', mode);

      if (audioFile) {
        formData.append('audioFile', audioFile);
      }

      try {
        const response = await http.post<GradeResponse>(
          `/learning/${numericSessionId}/grade`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        const data = response.data.body;

        console.log('💯 채점 점수 (Score):', data.score);

        setResultStatus(data.correct ? 'correct' : 'incorrect');
        if (data.correct) setDisplayStatus('initial_feedback');
        else setDisplayStatus('none');

        if (data.correct || action === 'NEXT_AFTER_WRONG') {
          resultsRef.current.push({
            romnized: content.romanized,
            korean: content.korean,
            translation: content.translation,
            isCorrect: data.correct,
          });
        }

        if (!data.correct && action === 'GRADE') {
          setIsProcessing(false);
          isProcessingRef.current = false;
          return;
        }

        if (data.finished) {
          const endTime = Date.now();
          const duration = endTime - startTimeRef.current;

          setTimeout(() => {
            if (isRetryWrong) {
              navigate('/main/learn/review', {
                state: {
                  sessionId: numericSessionId,
                  isUpdateComplete: true,
                  isRetryWrong: true,
                  resultId: resultId,
                },
              });
            } else {
              navigate('/main/learn/complete', {
                state: {
                  resultId: resultId,
                  sessionId: numericSessionId,
                  results: resultsRef.current,
                  topicName: content.topicTitle,
                  learningDuration: duration,
                  categoryName: currentCategory,
                  totalCount: totalWords,
                },
              });
            }
          }, 2000);
          return;
        }

        if (data.next) {
          const nextContent = nextItemToContent(data.next, content.topicTitle);

          if (data.correct) {
            setTimeout(() => {
              setContent(nextContent);
              setCurrentWordIndex((prev) => prev + 1);
              setStatus('initial');
              setResultStatus('none');
              setIsProcessing(false);
              isProcessingRef.current = false;
            }, 2000);
          } else {
            if (action === 'NEXT_AFTER_WRONG') {
              setContent(nextContent);
              setCurrentWordIndex((prev) => prev + 1);
              setStatus('initial');
              setResultStatus('none');
              setIsProcessing(false);
              isProcessingRef.current = false;
            }
          }
        }
      } catch (error: any) {
        console.error('Grading failed:', error);
        setResultStatus('incorrect');
        setIsProcessing(false);
        isProcessingRef.current = false;
      }
    },
    [
      resultId,
      content,
      navigate,
      isRetryWrong,
      baseResultId,
      sessionIdParam,
      currentCategory,
      totalWords,
    ],
  );

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchLearningData();
  }, [fetchLearningData]);

  // --- 타이머 & 상태 제어 ---
  useEffect(() => {
    let timer: number | undefined;

    if (isLoading || totalWords === 0 || showExitModal || resultId === null) {
      if (countdownRef.current !== null) clearInterval(countdownRef.current);
      if (timer) clearTimeout(timer);
      window.speechSynthesis.cancel();
      setIsTtsPlaying(false);
      return;
    }

    if (status === 'initial') {
      setResultStatus('none');
      setDisplayStatus('none');
      isProcessingRef.current = false;
      setIsTtsPlaying(false);
      const initialTimer = setTimeout(() => {
        setStatus('listen');
      }, 2000);
      return () => clearTimeout(initialTimer);
    }
    if (status === 'listen') {
      speakKoreanText(content.korean);
      timer = setTimeout(() => {
        setStatus('countdown');
        setCountdownTime(0);
      }, 3000);
    }
    if (status === 'countdown') {
      if (countdownRef.current !== null) clearInterval(countdownRef.current);

      countdownRef.current = setInterval(() => {
        setCountdownTime((prevTime) => {
          const newTime = prevTime + 0.1;

          if (newTime >= 10) {
            if (countdownRef.current !== null)
              clearInterval(countdownRef.current);

            if (isProcessingRef.current || resultStatus !== 'none') {
              return 10;
            }

            if (micOn) {
              if (
                mediaRecorderRef.current &&
                mediaRecorderRef.current.state === 'recording'
              ) {
                console.log('⏳ 시간 초과! 녹음 강제 종료 및 제출');
                isProcessingRef.current = true;
                setIsProcessing(true);
                mediaRecorderRef.current.stop();
              } else {
                return 10;
              }
            } else {
              if (!isProcessingRef.current && resultId !== null) {
                startGrading('GRADE', null);
              }
            }
            return 10;
          }
          return newTime;
        });
      }, 100) as unknown as number;
    }
    if (resultStatus === 'correct' && displayStatus === 'initial_feedback') {
      timer = setTimeout(() => {
        setDisplayStatus('meaning_revealed');
      }, 1000);
    }
    return () => {
      if (countdownRef.current !== null) clearInterval(countdownRef.current);
      if (timer) clearTimeout(timer);
      window.speechSynthesis.cancel();
      setIsTtsPlaying(false);
    };
  }, [
    status,
    resultStatus,
    displayStatus,
    content.korean,
    isLoading,
    totalWords,
    startGrading,
    showExitModal,
    micOn,
    isProcessing,
    speakKoreanText,
    resultId,
  ]);

  const handleAction = async (action: 'tryAgain' | 'next') => {
    if (action === 'next') await startGrading('NEXT_AFTER_WRONG', null);
    else if (action === 'tryAgain') {
      setStatus('initial');
      setResultStatus('none');
      setDisplayStatus('none');
    }
  };

  // ... (마이크 핸들러) ...
  const handleMicDown = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isMicActiveForRecording || showExitModal) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        isProcessingRef.current = true;
        setIsProcessing(true);
        setMicOn(false);

        try {
          if (audioChunksRef.current.length === 0) {
            console.warn('No audio data recorded.');
            setIsProcessing(false);
            isProcessingRef.current = false;
            setResultStatus('incorrect');
            return;
          }

          const webmBlob = new Blob(audioChunksRef.current, {
            type: 'audio/webm',
          });
          const wavFile = await convertToWav(webmBlob);

          startGrading('GRADE', wavFile);
        } catch (error) {
          console.error('Audio processing error:', error);
          setIsProcessing(false);
          isProcessingRef.current = false;
          setResultStatus('incorrect');
        } finally {
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
          }
        }
      };

      mediaRecorder.start();
      setMicOn(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('마이크 권한이 필요합니다.');
    }
  };

  const handleMicUp = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSpeakerClick = () => {
    if (isSpeakerActive && !showExitModal) {
      speakKoreanText(content.korean);
    }
  };

  const bubbleText = (() => {
    if (showExitModal) return 'What was it? Tell me!';
    if (isLoading) return 'Loading session data...';
    if (resultStatus === 'correct') {
      if (displayStatus === 'initial_feedback') return 'good job!';
      if (displayStatus === 'meaning_revealed')
        return `${
          content.romanized
        } means ${content.translation.toLowerCase()}.`;
      return 'good job!';
    }
    if (resultStatus === 'incorrect') return 'Should we try again?';
    if (isProcessing) return 'Grading...';
    if (status === 'initial') return 'Start!';
    if (status === 'countdown' || status === 'speak')
      return 'What was it? speak now!';
    return 'Listen carefully';
  })();

  const getMascotImage = (): MascotImage => {
    if (isLoading || isProcessing) return 'basic';
    if (showExitModal) return 'thinking';
    if (status === 'initial') return 'smile';
    if (resultStatus === 'incorrect') return 'wrong';
    if (resultStatus === 'correct') return 'jump';
    return 'basic';
  };

  const renderWordImage = () => {
    if (!isWordVisible) return null;
    return (
      <div className={styles.wordImagePlaceholder}>
        <img
          src={content.imageUrl}
          alt="Word visual"
          className={styles.wordImage}
        />
        {resultStatus === 'correct' && (
          <div className={`${styles.resultRing} ${styles.correctRing}`} />
        )}
        {resultStatus === 'incorrect' && (
          <div className={`${styles.resultCross} ${styles.incorrectCross}`} />
        )}
      </div>
    );
  };

  const renderResultFeedbackImage = () => {
    if (resultStatus === 'correct' && displayStatus === 'initial_feedback') {
      return (
        <img src={CorrectImg} alt="Correct" className={styles.feedbackImage} />
      );
    }
    if (resultStatus === 'incorrect') {
      return (
        <img
          src={InCorrectImg}
          alt="Incorrect"
          className={styles.feedbackImage}
        />
      );
    }
    return null;
  };

  const renderMicIcon = () => {
    return (
      <img
        src={micOn ? MicOn : MicOff}
        alt="Mic Status"
        className={styles.micStatusImage}
      />
    );
  };

  const isMicButtonDisabled =
    isLoading ||
    isProcessing ||
    status === 'initial' ||
    status === 'listen' ||
    (resultStatus !== 'none' && resultStatus !== 'processing') ||
    !isMicActiveForRecording ||
    showExitModal;

  const handleBackButtonClick = () => {
    if (micOn || isProcessing) return;
    setShowExitModal(true);
  };

  // ⭐ [수정] 뒤로 가기/나가기 시에 clearLocalLearningTime 호출 제거
  const handleExitLearning = () => {
    // 기존에 있던 clearLocalLearningTime(Number(sessionIdParam)) 삭제
    // 이렇게 해야 재학습 도중 나가더라도 기존 완료 기록이 보존됨

    setShowExitModal(false);
    navigate('/main/learnList');
  };

  const handleContinueLearning = () => {
    setShowExitModal(false);
  };

  if (isLoading) {
    return (
      <div className={styles.spinnerWrapper}>
        <SpinnerIcon />
      </div>
    );
  }

  return (
    <div className={styles.learnStartContainer}>
      <Header hasBackButton customBackAction={handleBackButtonClick} />
      <div className={styles.mascotWrapper}>
        {renderResultFeedbackImage()}
        <Mascot image={getMascotImage()} text={bubbleText} />
      </div>
      <ContentSection>
        <div className={styles.cardTitleBar}>
          <span className={styles.topicName}>{content.topicTitle}</span>
          <span className={styles.wordCount}>{`${Math.min(
            currentWordIndex,
            totalWords,
          )
            .toString()
            .padStart(2, '0')}/${totalWords
            .toString()
            .padStart(2, '0')}`}</span>
        </div>
        <div className={styles.wordDisplayArea}>
          {status === 'countdown' && resultStatus === 'none' && (
            <div className={styles.countdownBarContainer}>
              <div
                className={styles.countdownBarFill}
                style={{ width: `${100 - (countdownTime / 10) * 100}%` }}
              ></div>
            </div>
          )}
          {renderWordImage()}
        </div>
        <div className={styles.inputFieldsContainer}>
          <div className={styles.inputRow}>
            <label>Romnized</label>
            <input
              type="text"
              value={isRomnizedVisible ? content.romanized : ''}
              readOnly
            />
            <button
              className={`${styles.speakerIcon} ${
                isTtsPlaying ? styles.active : ''
              }`}
              onClick={handleSpeakerClick}
              disabled={!isSpeakerActive}
            >
              <img
                src={soundButton}
                alt="sound"
                className={styles.speakerIconImage}
              />
            </button>
          </div>
          <div className={styles.inputRow}>
            <label>Korean</label>
            <input
              type="text"
              value={isKoreanVisible ? content.korean : ''}
              readOnly
            />
          </div>
          <div className={`${styles.inputRow} ${styles.translation}`}>
            <label>Translation</label>
            <input
              type="text"
              value={isTranslationVisible ? content.translation : ''}
              readOnly
            />
          </div>
        </div>
        {isIncorrectView ? (
          <div className={styles.actionButtonsContainer}>
            <Button
              className={styles.actionButton}
              onClick={() => handleAction('tryAgain')}
            >
              Try Again
            </Button>
            <Button
              className={styles.actionButton}
              onClick={() => handleAction('next')}
            >
              Next
            </Button>
          </div>
        ) : (
          <button
            className={`${styles.micButton} ${micOn ? styles.on : styles.off} ${
              isMicButtonDisabled ? styles.disabled : ''
            }`}
            onMouseDown={handleMicDown}
            onMouseUp={handleMicUp}
            onTouchStart={handleMicDown}
            onTouchEnd={handleMicUp}
            disabled={isMicButtonDisabled}
          >
            {renderMicIcon()}
          </button>
        )}
      </ContentSection>

      {showExitModal && (
        <div className={styles.exitModalOverlay}>
          <div className={styles.exitModalContent}>
            <div className={styles.exitModalCard}>
              <div className={styles.exitModalQuestion}>
                Are you sure you want to quit <br /> Learning and go back?
              </div>
              <div className={styles.exitModalButtons}>
                <Button
                  onClick={handleContinueLearning}
                  className={styles.exitButtonNo}
                >
                  No
                </Button>
                <Button
                  onClick={handleExitLearning}
                  className={styles.exitButtonYes}
                >
                  Yes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearnStart;
