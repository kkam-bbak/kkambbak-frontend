import React, { useState, useEffect, useRef } from 'react';

import { useParams, useNavigate } from 'react-router-dom';

import './learnStart.css';



// 학습 데이터 타입을 정의합니다.

interface LearningContent {

    topicTitle: string;

    korean: string;

    romanized: string;

    translation: string;

    imageUrl: string;

}



type LearningStatus = 'initial' | 'listen' | 'countdown' | 'speak';

type ResultStatus = 'none' | 'processing' | 'correct' | 'incorrect';

// 🔥 새로운 상태: 정답 후 말풍선 단계 제어

type ResultDisplayStatus = 'none' | 'initial_feedback' | 'meaning_revealed';





const dummyWord: LearningContent = {

    topicTitle: "Casual_Emotions",

    korean: '사 - 과',

    romanized: 'sa - gwa',

    translation: 'Apple',

    imageUrl: 'https://placehold.co/100x100/E64A19/FFFFFF?text=🍎',

};



const LearnStart: React.FC = () => {

    const { topicId } = useParams<{ topicId: string }>();

    const navigate = useNavigate();



    // UI 상태 관리

    const [status, setStatus] = useState<LearningStatus>('initial');

    const [resultStatus, setResultStatus] = useState<ResultStatus>('none');

    const [displayStatus, setDisplayStatus] = useState<ResultDisplayStatus>('none'); // 🔥 결과 말풍선 제어

    const [micOn, setMicOn] = useState(false);

    const [isProcessing, setIsProcessing] = useState(false);

    const [content, setContent] = useState<LearningContent>(dummyWord);

    const [currentWordIndex, setCurrentWordIndex] = useState(1);

    const totalWords = 2; //총 단어수 예시

    const [countdownTime, setCountdownTime] = useState(0);



    // 표시 상태

    const isWordVisible = status !== 'initial';

    const isSpeakerActive = status !== 'initial';

   

    // 결과가 확정되지 않은 도전 중 (What was it? 말풍선 활성화 시점)

    const isInputTextHiddenDuringChallenge = (status === 'countdown' || status === 'speak') && resultStatus === 'none';

    const isInputTextVisible = !isInputTextHiddenDuringChallenge;



    const isRomnizedVisible = isInputTextVisible;

    const isKoreanVisible = isInputTextVisible;

    const isTranslationVisible = isInputTextVisible;

   

    const isIncorrectView = resultStatus === 'incorrect';

    const isMicActiveForRecording = (status === 'countdown' || status === 'speak') && resultStatus === 'none' && !isProcessing;



    const countdownRef = useRef<number | null>(null);

   

    // 🔥🔥🔥 자동 채점 로직 함수 (자동 종료 로직 제거) 🔥🔥🔥

    const startGrading = () => {

        setIsProcessing(true);

        setMicOn(false);



        setTimeout(() => {

            setIsProcessing(false);

            // 현재는 더미 로직: 50% 확률로 정답/오답

            //const isCorrect = Math.random() > 0.5;



            setIsProcessing(false);

           

            // 오답설정

            const isCorrect = true;

           

            setResultStatus(isCorrect ? 'correct' : 'incorrect');

            setDisplayStatus('initial_feedback');



           

        }, 1500); // 채점 처리 시간

    };



    // --------------------------------------------------

    // 🔥 1. 학습 흐름 제어 useEffect (정답 시 자동 이동 로직 수정) 🔥

    // --------------------------------------------------

    useEffect(() => {

        let timer: number | undefined;



        if (status === 'initial') {

            setResultStatus('none');

            setDisplayStatus('none'); // 상태 초기화

            // ... (초기 상태 로직)

            const initialTimer = setTimeout(() => { setStatus('listen'); }, 2000);

            return () => clearTimeout(initialTimer);

        }



        if (status === 'listen') {

            // ... (듣기 상태 로직)

            timer = setTimeout(() => {

                setStatus('countdown');

                setCountdownTime(0);

            }, 3000);

        }



        if (status === 'countdown') {

            // ... (카운트다운 로직)

            countdownRef.current = setInterval(() => {

                setCountdownTime((prevTime) => {

                    const newTime = prevTime + 0.1;

                   

                    if (newTime >= 10) {

                        if (countdownRef.current !== null) clearInterval(countdownRef.current);

                        setStatus('speak');

                        startGrading();

                        return 10;

                    }

                    return newTime;

                });

            }, 100) as unknown as number;

        }

       

        // 🔥🔥🔥 2. 정답 후 말풍선 순차 변경 및 자동 전환 로직 수정 🔥🔥🔥

       

        // A. 정답: 'good job!' -> 'sa-gwa means apple.' -> 다음 단어 OR 세션 완료

        if (resultStatus === 'correct' && displayStatus === 'initial_feedback') {

            // 'good job!' 표시 후 1초 뒤 'meaning_revealed'로 전환

            timer = setTimeout(() => {

                setDisplayStatus('meaning_revealed');

            }, 1000);

        }

       

        if (resultStatus === 'correct' && displayStatus === 'meaning_revealed') {

           

            const isLastWord = currentWordIndex === totalWords;



            // 'meaning_revealed' 표시 후 2초 뒤 다음 단어로 자동 전환

            timer = setTimeout(() => {

                if (isLastWord) {

                     // 🚨 마지막 단어 정답 시: LearnComplete로 자동 이동 (요청 사항)

                    console.log("Last word correct. Auto-navigating to LearnComplete.");

                    navigate('/mainpage/learn/complete');

                } else {

                    // 일반 단어 정답 시: 다음 단어로 자동 이동

                    setCurrentWordIndex(prev => prev + 1);

                    setStatus('initial');

                }

            }, 2000);

        }

       

        // B. 오답: 'Should we try again?' 표시 후 대기 (사용자 클릭 대기)

        // 오답 시 initial_feedback 상태에서 멈춰있습니다.



        return () => {

            if (countdownRef.current !== null) clearInterval(countdownRef.current);

            if (timer) clearTimeout(timer);

        };

       

    }, [status, resultStatus, displayStatus, currentWordIndex, totalWords, navigate]);

   

    // --------------------------------------------------

    // 🔥 2. 이벤트 핸들러 (handleAction 수정) 🔥

    // --------------------------------------------------

   

    const handleAction = (action: 'tryAgain' | 'next') => {

       

        if (action === 'next') {

            // 'Next' 버튼은 오답(incorrect) 상태일 때만 사용됨

           

            // 🔥🔥🔥 현재 단어가 마지막 단어인지 확인 🔥🔥🔥

            const isLastWord = currentWordIndex === totalWords;

           

            if (isLastWord) {

                // 마지막 단어에서 'Next' 클릭 시: LearnComplete로 이동 (요청 사항)

                console.log("Last word incorrect, user clicked Next. Navigating to LearnComplete.");

                navigate('/mainpage/learn/complete');

                return; // 함수 종료

            }



            // 마지막 단어가 아니면 다음 단어로 이동

            setCurrentWordIndex(prev => prev + 1);

        }

       

        // Try Again 또는 Next 클릭 후 (마지막 단어 Next 제외) 상태 초기화

        setStatus('initial');

        setResultStatus('none');

        setDisplayStatus('none'); // displayStatus 초기화

    };



    const handleMicDown = (e: React.MouseEvent | React.TouchEvent) => {

        e.preventDefault();

        if (isMicActiveForRecording) {

            setMicOn(true);

        }

    };



    const handleMicUp = () => {

        if (isMicActiveForRecording && micOn) {

            setMicOn(false);

            console.log("Recording stopped. Timer continues.");

        }

    };

   

    const handleLogout = () => navigate('/auth/login');

    const handleSpeakerClick = () => { console.log(`Playing audio for: ${content.korean}`); };





    // --------------------------------------------------

    // 🔥 3. UI 렌더링 값 (결과/상태에 따른 텍스트 및 클래스) 🔥

    // --------------------------------------------------



    const bubbleText = (() => {

        // 🔥🔥🔥 정답 시 말풍선 순차 로직 적용 🔥🔥🔥

        if (resultStatus === 'correct') {

            if (displayStatus === 'initial_feedback') return 'good job!'; // 1단계: good job!

            if (displayStatus === 'meaning_revealed') return `${content.romanized} means ${content.translation.toLowerCase()}.`; // 2단계: 의미 공개

            return 'good job!'; // 기본값

        }

       

        // 오답 말풍선 (initial_feedback 상태에서 고정)

        if (resultStatus === 'incorrect') return 'Should we try again?';

       

        // 학습 중

        if (status === 'initial') return 'Start!';

        if (status === 'countdown' || status === 'speak') return 'What was it? Tell me';

        return 'Listen carefully';

    })();

   

    const characterImageClass = resultStatus === 'incorrect' ? 'character-image incorrect-char' : 'character-image default-char';



    const renderWordImage = () => {

        if (!isWordVisible) return null;

       

        return (

            <div className="word-image-placeholder">

                <img

                    src={content.imageUrl}

                    alt="Word visual"

                    className="word-image"

                />

                {resultStatus === 'correct' && <div className="result-ring correct-ring" />}

                {resultStatus === 'incorrect' && <div className="result-cross incorrect-cross" />}

            </div>

        );

    };

   

    return (

        <div className="learn-page-container">

           

            <div className="learn-header">

                <button className="logout-button" onClick={handleLogout}>Logout</button>

            </div>

            <div className="character-section">

                <div className="speech-bubble-top">{bubbleText}</div>

                <div className={characterImageClass}></div>

            </div>



            <div className="learning-card">

               

                <div className="card-title-bar">

                    <span className="topic-name">{content.topicTitle}</span>

                    <span className="word-count">{`${currentWordIndex.toString().padStart(2, '0')}/${totalWords.toString().padStart(2, '0')}`}</span>

                </div>



                <div className="word-display-area">

                    {status === 'countdown' && !isIncorrectView && (

                        <div className="countdown-bar-container">

                            <div

                                className="countdown-bar-fill"

                                style={{ width: `${100 - (countdownTime / 10) * 100}%` }}

                            ></div>

                        </div>

                    )}

                    {renderWordImage()}

                </div>



                <div className="input-fields-container">

                    <div className="input-row">

                        <label>Romnized</label>

                        <input type="text" value={isRomnizedVisible ? content.romanized : ''} readOnly />

                        <button className="speaker-icon" onClick={handleSpeakerClick} disabled={!isSpeakerActive}>

                            <div className="speaker-placeholder">🔊</div>

                        </button>

                    </div>



                    <div className="input-row">

                        <label>Korean</label>

                        <input type="text" value={isKoreanVisible ? content.korean : ''} readOnly />

                    </div>

                   

                    <div className="input-row translation">

                        <label>Translation</label>

                        <input type="text" value={isTranslationVisible ? content.translation : ''} readOnly />

                    </div>

                </div>



                {/* 🔥🔥 액션 버튼/마이크 버튼 렌더링 로직 (오답 시 버튼 표시) 🔥🔥 */}

                {isIncorrectView ? (

                    // 오답일 때: Try Again / Next 버튼 표시

                    <div className="action-buttons-container">

                        <button className="action-button try-again" onClick={() => handleAction('tryAgain')}>

                            Try Again

                        </button>

                        <button className="action-button next" onClick={() => handleAction('next')}>

                            Next

                        </button>

                    </div>

                ) : (

                    // 정답 또는 학습 중일 때: 마이크 버튼 표시

                    <button

                        className={`mic-button ${micOn ? 'on' : 'off'} ${!isMicActiveForRecording ? 'disabled' : ''}`}

                        onMouseDown={handleMicDown}

                        onMouseUp={handleMicUp}

                        onTouchStart={handleMicDown}

                        onTouchEnd={handleMicUp}

                        // 정답 시 (resultStatus === 'correct') 마이크 버튼 비활성화

                        disabled={resultStatus === 'correct' ? true : !isMicActiveForRecording}

                    >

                        <span className="mic-icon">🎤</span>

                        {micOn ? 'ON' : 'OFF'}

                    </button>

                )}

            </div>

        </div>

    );

};



export default LearnStart;