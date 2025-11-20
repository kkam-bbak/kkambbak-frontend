import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './rolePlay.css';
import { http } from '../../apis/http';
import Header from '@/components/layout/Header/Header';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';
import ContentSection from '@/components/layout/ContentSection/ContentSection';

import CharacterSmile from '@/assets/Character-Smile.png';
import CharacterJump from '@/assets/Character-Jump.png';
import CharacterGloomy from '@/assets/Character-Gloomy.png';
import CharacterWrong from '@/assets/Character-Wrong.png';
import CharacterBasic from '@/assets/Character-Basic.png';
import CharacterSullen from '@/assets/Character-Sullen.png';

// --- 다중 턴 시나리오 데이터 구조 정의 ---
const SCENARIO_SEQUENCE = [
    // Turn 1 (index 0): Staff Speaks (User Recording) - 01/06
    { 
        turnIndex: 1, id: '01/06', speaker: 'Staff', type: 'RECORDING', 
        korean: "주문 하시겠어요?", romanized: "Ju-mun ha-si-gess-eo-yo?", english: "Would you like to order?"
    },
    // Turn 2 (index 1): Customer Choices (User Selects) - 02/06
    { 
        turnIndex: 2, id: '02/06', speaker: 'Customer', type: 'CHOICE',
        contextLine: { 
            korean: "주문 하시겠어요?", 
            romanized: "Ju-mun ha-si-gess-eo-yo?", 
            english: "Would you like to order?", 
            role: "Staff" 
        },
        choices: [
            { id: 1, korean: "아니요, 아직이요", romanized: "a-ni-yo, i-jjog-i-e-yo", english: "No, this way.", isCorrect: false },
            { id: 2, korean: "네, 콜라 주세요", romanized: "Nae, kol-la ju-se-yo", english: "Yes, Coke, please.", isCorrect: true }
        ]
    },
    // Turn 3 (index 2): Staff Speaks (User Recording) - 03/06
    { 
        turnIndex: 3, id: '03/06', speaker: 'Staff', type: 'RECORDING', 
        korean: "다른 메뉴도 보시겠어요?", romanized: "Da-reun me-nyu-do bo-si-gess-eo-yo?", english: "Would you like to see other menus?"
    },
//     // Turn 4 (index 3): Customer Choices (User Selects) - 04/06
    { 
        turnIndex: 4, id: '04/06', speaker: 'Customer', type: 'CHOICE', 
        contextLine: { 
             korean: "다른 메뉴도 보시겠어요?", 
             romanized: "Da-reun me-nyu-do bo-si-gess-eo-yo?", 
             english: "Would you like to see other menus?", 
             role: "Staff" 
        },
        choices: [
             { id: 1, korean: "네, 다른메뉴도 보고싶어요", romanized: "a-ni-yo, a-jik-i-yeo-yo", english: "Not yet, thank you.", isCorrect: false },
             { id: 2, korean: "안녕하세요", romanized: "An-nyeong-ha-se-yo", english: "Hello.", isCorrect: true }
        ]
    },
//      // Turn 5 (index 4): Staff Speaks (User Recording) - 05/06
    { 
        turnIndex: 5, id: '05/06', speaker: 'Staff', type: 'RECORDING', 
        korean: "메뉴 고르신 후 알려주세요?", romanized: "Me-nyu go-reu-sin hu al-lyeo-ju-se-yo?", english: "Please let me know after choosing the menu."
    },
//     // Turn 6 (index 5): Customer Choices (User Selects) - 06/06
    { 
        turnIndex: 6, id: '06/06', speaker: 'Customer', type: 'CHOICE', 
        contextLine: { 
            korean: "메뉴 고르신 후 알려주세요", 
            romanized: "Me-nyu go-reu-sin hu al-lyeo-ju-se-yo?", 
            english: "Please let me know after choosing the menu.", 
            role: "Staff" 
        },
        choices: [
            { id: 1, korean: "감사합니다", romanized: "Gam-sa-ham-ni-da", english: "Thank you.", isCorrect: true },
            { id: 2, korean: "안녕하세요", romanized: "An-nyeong-ha-se-yo", english: "Hello.", isCorrect: false }
        ]
    },
];

// 단계별 상태 정의
const STEPS = {
    START: 'START', LISTEN: 'LISTEN', LISTEN_DONE: 'LISTEN_DONE', 
    SPEAK_SETUP: 'SPEAK_SETUP', RECORDING: 'RECORDING', GRADING: 'GRADING', 
    PRACTICE_LISTEN: 'PRACTICE_LISTEN', PRACTICE_LISTEN_DONE: 'PRACTICE_LISTEN_DONE', 
    PRACTICE_SPEAK: 'PRACTICE_SPEAK', PRACTICE_GRADING: 'PRACTICE_GRADING',
    CHOICE_SETUP: 'CHOICE_SETUP', CHOICE_TTS: 'CHOICE_TTS', CHOICE_FEEDBACK: 'CHOICE_FEEDBACK', 
    DONE: 'DONE', 
};

// 상태별 말풍선 텍스트
const BUBBLE_TEXT = {
    [STEPS.START]: "Okay, Let's go!",
    [STEPS.LISTEN]: "Listen carefully.", 
    //[STEPS.LISTEN_DONE]: "Ready to speak? Push the mic button.",
    [STEPS.SPEAK_SETUP]: "Speak!",
    [STEPS.RECORDING]: "Speak!",
    [STEPS.PRACTICE_LISTEN]: "Listen carefully.",
   // [STEPS.PRACTICE_LISTEN_DONE]: "Now, it's your turn to practice. Speak!", 
    [STEPS.PRACTICE_SPEAK]: "Speak!",
    [STEPS.CHOICE_SETUP]: "Which is correct?", 
    CORRECT: "Good job!", 
    INCORRECT: "It's a waste.", 
    OOS: "That's out of our Learning Scope\ntry to focus on your Study", 
};

// STEPS는 이 코드 외부에 정의되어 있다고 가정합니다. (예: const STEPS = { START: 'START', GRADING: 'GRADING', ... })
const getCharacterImage = (step, gradingResult) => {
    // 1. 시작 단계
    if (step === STEPS.START) return 'smile'; // 'CharacterSmile' 대신 문자열 'smile' 반환

    // 2. 채점 또는 피드백 단계
    if (step === STEPS.GRADING || step === STEPS.CHOICE_FEEDBACK || step === STEPS.PRACTICE_GRADING) {
        if (gradingResult === 'CORRECT') return CharacterJump; // 'CharacterJump' 대신 문자열 'jump' 반환
        if (gradingResult === 'INCORRECT') return CharacterGloomy; // 'CharacterGloomy' 대신 문자열 'gloomy' 반환
        if (gradingResult === 'OOS') return CharacterSullen; // 'CharacterSullen'이 없으므로, 유사한 'wrong' 사용 (다른 키로 변경 가능)
    }

    // 3. 기타/기본값
    return CharacterBasic; // 'Character1' 대신 문자열 'basic' 반환
};

const speakKoreanText = (text, onFinish = null) => {
    if (!('speechSynthesis' in window)) {
        console.error("Web Speech API is not supported by this browser.");
        if (onFinish) onFinish(false);
        return;
    }
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR'; 
    
    utterance.onend = () => {
        if (onFinish) onFinish(true);
    };

    utterance.onerror = (event) => {
        console.error('SpeechSynthesis Utterance Error:', event);
        if (onFinish) onFinish(false);
    };

    window.speechSynthesis.speak(utterance);
};

// --- 핵심 컴포넌트 ---

const RolePlay = () => {
    const navigate = useNavigate();
    const scrollRef = useRef(null);
    
    const [turnHistory, setTurnHistory] = useState([]); 
    const [activeTurnIndex, setActiveTurnIndex] = useState(0); 
    const [practiceLineData, setPracticeLineData] = useState(null); 

    const [step, setStep] = useState(STEPS.START);
    const [isRecording, setIsRecording] = useState(false);
    const [isTtsPlaying, setIsTtsPlaying] = useState(false); 
    const [gradingResult, setGradingResult] = useState(null); 
    const [recordingCountdown, setRecordingCountdown] = useState(10);
    const [selectedChoiceId, setSelectedChoiceId] = useState(null); 
    const [ttsOptionId, setTtsOptionId] = useState(null); 
    const timerRef = useRef(null);
    const flowTimerRef = useRef(null); 

    const activeTurnData = SCENARIO_SEQUENCE[activeTurnIndex];


    // ✅ 스크롤 자동 이동 로직 
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }, 0);
        return () => clearTimeout(timeout);
    }, [turnHistory, step, selectedChoiceId]); 

    
    // 📝 다음 메인 턴으로 전환하는 유틸리티 함수
    const moveToNextTurn = useCallback(() => {
        const nextIndex = activeTurnIndex + 1;
        if (nextIndex === SCENARIO_SEQUENCE.length) {
            setStep(STEPS.DONE); 
        } else {
            setActiveTurnIndex(nextIndex);
            const nextTurn = SCENARIO_SEQUENCE[nextIndex];
            const nextStep = nextTurn.type === 'CHOICE' ? STEPS.CHOICE_SETUP : STEPS.LISTEN;
            
            setStep(nextStep); 
            setSelectedChoiceId(null);
            setGradingResult(null);
            setPracticeLineData(null); 
        }
    }, [activeTurnIndex]);

    // 📝 녹음 채점 로직 (일반 녹음 턴)
    const handleRecordingGrading = useCallback((mockResult) => {
        clearInterval(timerRef.current);
        setIsRecording(false);
        setStep(STEPS.GRADING);
        setGradingResult(mockResult);

        setTimeout(() => {
            const finalTurnData = { 
                ...activeTurnData, 
                result: mockResult, 
                userResponseData: { 
                    text: activeTurnData.korean, 
                    grade: mockResult 
                } 
            };
            setTurnHistory(prev => [...prev, finalTurnData]);
            
            moveToNextTurn();
        }, 1500);
    }, [activeTurnData, moveToNextTurn]);

    // ⭐ 연습 단계 녹음 채점 로직
    const handlePracticeGrading = useCallback((mockResult) => {
        clearInterval(timerRef.current);
        setIsRecording(false);
        setStep(STEPS.PRACTICE_GRADING);
        setGradingResult(mockResult);
        
        setTimeout(() => {
            // 연습 단계 후에는 다음 메인 턴으로 이동합니다.
            moveToNextTurn();
        }, 1500);

    }, [moveToNextTurn]);

    // ⭐ TTS 재생이 끝났을 때 호출되는 콜백
    const handleTtsPlaybackFinished = useCallback((success) => {
        setIsTtsPlaying(false);
        
        if (flowTimerRef.current) {
            clearTimeout(flowTimerRef.current);
            flowTimerRef.current = null;
        }

        if (success && (step === STEPS.LISTEN || step === STEPS.PRACTICE_LISTEN)) {
            const nextStep = step === STEPS.LISTEN ? STEPS.LISTEN_DONE : STEPS.PRACTICE_LISTEN_DONE;
            setTimeout(() => { setStep(nextStep); }, 500); 
            return;
        }
        
        if (success && ttsOptionId) {
            setStep(STEPS.CHOICE_SETUP);
            setTtsOptionId(null);
        }
        
    }, [step, ttsOptionId]);
    
    const startTtsAndListen = useCallback((text, onFinish = null) => {
        if (isRecording || window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
                setIsTtsPlaying(false);
                if (onFinish) onFinish(false);
                return;
        }
        
        setIsTtsPlaying(true);
        speakKoreanText(text, (success) => {
            handleTtsPlaybackFinished(success);
            if (onFinish) onFinish(success);
        });
        
    }, [isRecording, handleTtsPlaybackFinished]);


    // ⭐ 선택지 버튼 클릭 시 (TTS 재생 및 선택)
    const handleChoiceOptionClick = useCallback((optionId, text) => {
        if (step === STEPS.CHOICE_FEEDBACK || isRecording) return;
        
        setSelectedChoiceId(optionId);
        setTtsOptionId(optionId);
        
        startTtsAndListen(text); 
    }, [step, isRecording, startTtsAndListen]);
    
    
    // ⭐ LISTEN 단계에서 TTS 버튼을 눌렀을 때
    const handleListenTtsClick = useCallback(() => {
        if ((step === STEPS.LISTEN || step === STEPS.PRACTICE_LISTEN) && !isTtsPlaying) {
            
            let textToSpeak = activeTurnData.korean;
            if (step === STEPS.PRACTICE_LISTEN && practiceLineData) {
                textToSpeak = practiceLineData.korean;
            }
            if (textToSpeak) {
                if (flowTimerRef.current) {
                    clearTimeout(flowTimerRef.current);
                    flowTimerRef.current = null;
                }
                startTtsAndListen(textToSpeak);
            }
        }
    }, [step, activeTurnData, practiceLineData, isTtsPlaying, startTtsAndListen]);

    const handlePracticeListenTtsClick = handleListenTtsClick;


// ⭐ 선택 제출 로직 (턴 2, 4, 6)
const handleChoiceSelect = useCallback(() => {
    if (selectedChoiceId === null || step !== STEPS.CHOICE_SETUP) return;
    
    const selectedOption = activeTurnData.choices.find(c => c.id === selectedChoiceId);
    const isCorrect = selectedOption && selectedOption.isCorrect;
    const result = isCorrect ? 'CORRECT' : 'INCORRECT';

    // 정답 옵션 (연습용)
    const correctOption = activeTurnData.choices.find(c => c.isCorrect); 

    // ⭐ 1. turnHistory에 **사용자가 선택한 내용**과 **실제 정답 여부**를 기록
    const turnDataForHistory = { 
        ...activeTurnData, 
        result: result, // turnHistory에 사용자의 실제 선택 결과 기록
        userResponseData: { 
            selectedId: selectedOption.id, 
            text: selectedOption.korean, 
            romanized: selectedOption.romanized,
            english: selectedOption.english,
            finalResult: result, // 피드백을 위한 실제 정답 여부
        } 
    };
    setTurnHistory(prev => [...prev, turnDataForHistory]);

    // 2. 피드백 단계로 전환 (말풍선은 사용자의 실제 선택 결과에 따라 달라짐)
    setStep(STEPS.CHOICE_FEEDBACK);
    setGradingResult(result); 

    setTimeout(() => {
        // ⭐ 3. 피드백 기간 종료 후 처리
        
        if (isCorrect) {
            // 정답인 경우: 정답 텍스트를 연습하고 다음 메인 턴으로 이동
            setPracticeLineData(correctOption); 
            setStep(STEPS.PRACTICE_LISTEN); 
            
        } else {
            // ⭐ 오답인 경우: turnHistory의 마지막 항목을 정답 내용으로 덮어쓰기
            setTurnHistory(prev => {
                const updatedHistory = [...prev];
                const lastIndex = updatedHistory.length - 1;

                if (lastIndex >= 0 && updatedHistory[lastIndex].type === 'CHOICE') {
                    // 마지막 기록을 정답 내용으로 덮어씁니다.
                    updatedHistory[lastIndex] = {
                        ...updatedHistory[lastIndex],
                        result: 'CORRECT', // 색상을 초록색으로 변경
                        userResponseData: {
                            ...updatedHistory[lastIndex].userResponseData,
                            text: correctOption.korean,
                            romanized: correctOption.romanized,
                            english: correctOption.english,
                            finalResult: 'CORRECT',
                        }
                    };
                }
                return updatedHistory;
            });

            // 정답 텍스트를 연습하도록 설정
            setPracticeLineData(correctOption);
            
            // Practice Listen 단계로 전환 (정답 텍스트 학습)
            setStep(STEPS.PRACTICE_LISTEN);
        }
        
        setSelectedChoiceId(null);
        setGradingResult(null);
    }, 1500); // 1.5초 후 피드백 완료

}, [selectedChoiceId, step, activeTurnData, moveToNextTurn]);

    // 🎙️ 마이크 누름/뗌 핸들러
    const handleMicPress = useCallback(() => {
        const isActionable = activeTurnData.type === 'RECORDING' || step === STEPS.PRACTICE_SPEAK;
        const isReady = step === STEPS.SPEAK_SETUP || step === STEPS.PRACTICE_LISTEN_DONE || step === STEPS.PRACTICE_SPEAK;
        
        if (!isActionable || !isReady || isTtsPlaying) return;

        if (step === STEPS.SPEAK_SETUP || step === STEPS.LISTEN_DONE) {
            setStep(STEPS.RECORDING);
        } else if (step === STEPS.PRACTICE_LISTEN_DONE) {
            setStep(STEPS.PRACTICE_SPEAK);
        }

        setIsRecording(true);
        clearInterval(timerRef.current); 
    }, [step, activeTurnData.type, isTtsPlaying]);

    const handleMicRelease = useCallback(() => {
        if (!isRecording) return;
        setIsRecording(false);
        
        const randomResult = ['CORRECT', 'INCORRECT', 'OOS'][Math.floor(Math.random() * 3)];
        
        if (activeTurnData.type === 'RECORDING') {
            handleRecordingGrading(randomResult); 
        } else {
            handlePracticeGrading(randomResult); 
        }
    }, [isRecording, handleRecordingGrading, handlePracticeGrading, activeTurnData.type]);

    // --- (useEffect 흐름 제어 로직은 변화 없음) ---
    useEffect(() => {
        
        clearInterval(timerRef.current); 
        clearTimeout(flowTimerRef.current); 
        
        if (step === STEPS.START) {
            flowTimerRef.current = setTimeout(() => {
                const nextStep = activeTurnData.type === 'CHOICE' ? STEPS.CHOICE_SETUP : STEPS.LISTEN;
                setStep(nextStep); 
            }, 1500); 
        }

        if (step === STEPS.LISTEN || step === STEPS.PRACTICE_LISTEN) {
            flowTimerRef.current = setTimeout(() => {
                window.speechSynthesis.cancel();
                setIsTtsPlaying(false);
                const nextStep = step === STEPS.LISTEN ? STEPS.LISTEN_DONE : STEPS.PRACTICE_LISTEN_DONE;
                setStep(nextStep);
            }, 4000); 
        }

        if (step === STEPS.LISTEN_DONE) {
            flowTimerRef.current = setTimeout(() => {
                setStep(STEPS.SPEAK_SETUP);
            }, 0); 
        }

        if (step === STEPS.SPEAK_SETUP && activeTurnData.type === 'RECORDING') {
            setRecordingCountdown(10);
            timerRef.current = setInterval(() => {
                setRecordingCountdown(prev => {
                    if (prev === 0) {
                        clearInterval(timerRef.current);
                        if (!isRecording) { handleRecordingGrading('INCORRECT'); }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        
    if (step === STEPS.DONE) {
        navigate('/mainpage/rolePlay/complete'); 
    }
        
        if (step === STEPS.PRACTICE_LISTEN_DONE) {
                flowTimerRef.current = setTimeout(() => {
                    setStep(STEPS.PRACTICE_SPEAK);
                }, 0);
        }

        if (step === STEPS.PRACTICE_SPEAK) {
            setRecordingCountdown(10);
            timerRef.current = setInterval(() => {
                setRecordingCountdown(prev => {
                    if (prev === 0) {
                        clearInterval(timerRef.current);
                        if (!isRecording) { handlePracticeGrading('INCORRECT'); }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        
        return () => {
                clearInterval(timerRef.current);
                clearTimeout(flowTimerRef.current); 
                window.speechSynthesis.cancel(); 
        };


    }, [step, isRecording, activeTurnData.type, handleRecordingGrading, handlePracticeGrading, navigate]);


    // 🎨 UI 데이터 설정
    let currentBubbleText;
    let bubbleClass = 'role-bubble';
    
    const isPracticeFlow = step === STEPS.PRACTICE_LISTEN || step === STEPS.PRACTICE_SPEAK || step === STEPS.PRACTICE_GRADING || step === STEPS.PRACTICE_LISTEN_DONE;
    
    // ⭐ 스크롤 잠금 변수 정의 (렌더링 스코프)
    const isScrollLocked = step === STEPS.CHOICE_SETUP || step === STEPS.CHOICE_FEEDBACK;

    if (step === STEPS.GRADING || step === STEPS.CHOICE_FEEDBACK || step === STEPS.PRACTICE_GRADING) {
        currentBubbleText = BUBBLE_TEXT[gradingResult];
        bubbleClass += gradingResult === 'CORRECT' ? ' correct' : ' incorrect';
    } else {
        if (step === STEPS.PRACTICE_LISTEN) {
            currentBubbleText = BUBBLE_TEXT[STEPS.LISTEN];
        } else if (step === STEPS.PRACTICE_LISTEN_DONE) {
            currentBubbleText = BUBBLE_TEXT[STEPS.LISTEN_DONE]; 
        } else if (step === STEPS.PRACTICE_SPEAK) {
            currentBubbleText = BUBBLE_TEXT[STEPS.SPEAK_SETUP]; 
        } else {
            currentBubbleText = BUBBLE_TEXT[step] || BUBBLE_TEXT[STEPS.START]; 
        }
    }
    
    const characterImage = getCharacterImage(step, gradingResult);

    // 턴이 완료된 후 표시될 대화 상자 렌더링
    const TurnContentBox = ({ data }) => {
        const isRecordingTurn = data.type === 'RECORDING';
        const isChoiceTurn = data.type === 'CHOICE';
        
        // ⭐ turnHistory에 기록된 내용은 항상 CORRECT(정답)이므로 항상 초록색을 표시합니다.
        const resultForColor = isChoiceTurn ? data.userResponseData?.finalResult : data.result;
        // turnHistory에는 항상 'CORRECT'이므로 항상 초록색 클래스를 사용합니다.
        const romanizedClass = ' correct-rom'; 
        const role = data.speaker;
        
        const selectedData = isChoiceTurn ? data.userResponseData : {};
        
        const mainKoreanText = isChoiceTurn ? selectedData.text : data.korean; 
        const mainRomanizedText = isChoiceTurn ? selectedData.romanized : data.romanized;
        const mainEnglishText = isChoiceTurn ? selectedData.english : data.english;

        return ( /*저장되는 내용*/ 
            <div className="text-display-box history-box">
                
                {/* 현재 턴의 주요 대화 내용 */}
                <div className="text-line korean-line">
                    <span className="korean-text history-korean">{mainKoreanText}</span>
                    {isRecordingTurn && <button className="tts-button active" onClick={() => startTtsAndListen(data.korean)} disabled={isTtsPlaying}>🔊</button>}
                </div>
                <div className="text-line romanized-line">
                    <span className={`romanized-text history-romanized ${romanizedClass}`}>{mainRomanizedText}</span>
                    {isRecordingTurn && <span className="small-mic-icon active">🎤</span>}
                </div>
                <span className="english-text history-english">{mainEnglishText}</span>
                
                <div className="role-container costomer"><span className="role-tag">{role}</span></div>
            </div>
        );
    };


    // ⬇️ 현재 활성 입력 턴 렌더링
    const renderActiveInput = () => {
        const isCurrentlySpeaking = window.speechSynthesis.speaking; 
        
        if (activeTurnIndex >= SCENARIO_SEQUENCE.length) return null;
        
        const isPracticeFlow = step === STEPS.PRACTICE_LISTEN || step === STEPS.PRACTICE_SPEAK || step === STEPS.PRACTICE_GRADING || step === STEPS.PRACTICE_LISTEN_DONE;
        
        // 1. 일반 녹음 입력 턴 (T1, T3, T5)
        if (activeTurnData.type === 'RECORDING' && !isPracticeFlow) {
            const isTtsActionable = step === STEPS.LISTEN; 
            const isMicActionable = step === STEPS.SPEAK_SETUP || step === STEPS.RECORDING || step === STEPS.LISTEN_DONE;
            const mainMicButtonClass = isMicActionable ? (isRecording ? 'on' : 'off') : 'off disabled';
            const getRomClass = () => {
                if (step === STEPS.GRADING) {
                    return gradingResult === 'CORRECT' ? ' correct-active' : (gradingResult === 'INCORRECT' || gradingResult === 'OOS' ? ' incorrect-active' : '');
                }
                return '';
            };
            const currentGradeClass = getRomClass(); // 현재 채점 결과 클래스

            return (
                <div className="active-turn-recording-flow">
                    <div className="text-display-box history-box">
                 
                        <div className="text-line korean-line">
                            {/* ⭐ Korean 텍스트에 클래스 적용 */}
                            <span className={`korean-text ${currentGradeClass}`}>{activeTurnData.korean}</span>
                            <button 
                                className={`tts-button ${isTtsActionable ? ' active' : ''}`}
                                onClick={handleListenTtsClick}
                                disabled={!isTtsActionable || isCurrentlySpeaking}>
                                🔊
                            </button>
                        </div>
                        <div className="text-line romanized-line">
                            {/* ⭐ Romanized 텍스트에 클래스 적용 */}
                            <span className={`romanized-text${currentGradeClass}`}>{activeTurnData.romanized}</span>
                            <span className={`small-mic-icon${isRecording || isMicActionable ? ' active' : ''}`}>🎤</span>
                        </div>
                        {/* ⭐ English 텍스트에 클래스 적용 */}
                        <span className={`english-text${currentGradeClass}`}>{activeTurnData.english}</span>
                            <div className="role-container costomer"><span className="role-tag">{activeTurnData.speaker}</span></div>
                        
                    </div>
                 
                    <div className="mic-area full-width-mic">
                        <div className="mic-button-wrapper">
                           
                            <button 
                                className={`main-mic-button ${mainMicButtonClass}`}
                                onMouseDown={handleMicPress} onMouseUp={handleMicRelease}
                                onTouchStart={handleMicPress} onTouchEnd={handleMicRelease}
                                disabled={!isMicActionable || isCurrentlySpeaking}>
                                <span className="main-mic-icon">🎤
                                    <span className="mic-status-text">{isRecording ? "ON" : "OFF"}</span>
                                </span>
                            </button>
                            
                        </div>
                    </div>
                </div>
            );
        } 
        
        // 2. 선택지 입력 턴 (T2, T4, T6) - CHOICE_SETUP 또는 CHOICE_FEEDBACK 단계
        else if (activeTurnData.type === 'CHOICE' && !isPracticeFlow) {
            const customerData = activeTurnData.choices;
            
            const isDisabled = step === STEPS.CHOICE_FEEDBACK || isCurrentlySpeaking;
            
            const isSubmitActive = selectedChoiceId !== null;
            const submitButtonClass = isSubmitActive ? 'on' : 'off disabled';

            // 중앙에 표시할 옵션: 선택된 옵션이 없으면 첫 번째 옵션을 기본으로 표시
            let displayOption = customerData.find(c => c.id === selectedChoiceId);
            if (!displayOption && step === STEPS.CHOICE_SETUP) {
                displayOption = customerData[0];
            } else if (step === STEPS.CHOICE_FEEDBACK) {
                // 피드백 단계에서는 선택지 미리보기 표시 안함
                displayOption = null;
            }

            return (
                <>
                
                    {/* ⭐ 2. 선택지 내용 미리보기 (CHOICE_SETUP 단계에서만 렌더링) */}
                    {displayOption && step === STEPS.CHOICE_SETUP && (
                        <div className="text-display-box history-box"> 
                            <div className="text-line korean-line">
                                <span className="korean-text">{displayOption.korean}</span>
                                <button 
                                    className={`tts-button ${isCurrentlySpeaking && ttsOptionId === displayOption.id ? 'active' : 'choice-tts-inactive'}`}
                                    onClick={() => handleChoiceOptionClick(displayOption.id, displayOption.korean)}
                                    disabled={isDisabled}
                                >
                                    🔊
                                </button>
                            </div>
                            <div className="text-line romanized-line">
                                <span className={`romanized-text`}>{displayOption.romanized}</span>
                            </div>
                            <span className="english-text">{displayOption.english}</span>
                            <div className="role-container costomer"><span className="role-tag">{activeTurnData.speaker}</span></div>
                        </div>
                    )}
               
                    {/* 3. 선택 버튼 영역 (하단 고정) */}
                    <div className="mic-area choice-button">
                        {/* 1, 2 버튼 */}
                        {customerData.map(option => (
                            <button 
                                key={option.id}
                                className={`choice-button-action ${option.id === selectedChoiceId ? 'selected' : ''}`}
                                onClick={() => handleChoiceOptionClick(option.id, option.korean)}
                                disabled={isDisabled}
                            >
                                {option.id}
                            </button>
                        ))}
                        
                        <button 
                            className={`main-mic-button select-submit-button 
                                ${step === STEPS.CHOICE_FEEDBACK ? (gradingResult === 'CORRECT' ? 'correct-submit' : 'incorrect-submit') : ''}
                                ${isSubmitActive ? 'on' : 'off disabled'}`}
                            // CHOICE_FEEDBACK 단계에서는 Continue 로직 수행
                            onClick={handleChoiceSelect} 
                            disabled={!isSubmitActive}
                        >
                            <span className="select-submit-text">
                                Select
                            </span>
                        </button>
                    </div>
                </>
            );
        }
        
        // 3. ⭐ 연습 단계 렌더링
        else if (isPracticeFlow && practiceLineData) {
            const practiceText = practiceLineData; 
            
             const isTtsActionable = step === STEPS.PRACTICE_LISTEN; 
             const practiceButtonActive = step === STEPS.PRACTICE_SPEAK || step === STEPS.PRACTICE_LISTEN_DONE;
             const practiceMainMicClass = practiceButtonActive ? (isRecording ? 'on' : 'off') : 'off disabled';
             const practiceRomClass = (step === STEPS.PRACTICE_GRADING && gradingResult !== 'CORRECT') ? ' incorrect-active' : '';

             return (
                     <div className="mic-area full-width-mic">
                        <div className="mic-button-wrapper">
                  
                            <button 
                                className={`main-mic-button ${practiceMainMicClass}`}
                                onMouseDown={handleMicPress} onMouseUp={handleMicRelease}
                                onTouchStart={handleMicPress} onTouchEnd={handleMicRelease}
                                disabled={!practiceButtonActive || isCurrentlySpeaking}>
                                <span className="main-mic-icon">🎤
                                    <span className="mic-status-text">{isRecording ? "ON" : "OFF"}</span>
                                </span>
                            </button>
                          
                        </div>
                    </div>
             );
        }

        return <></>;
    };


    return (
        <div className="page-container app-container">
            
            <div className="header-section">
                <button className="logout" onClick={() => navigate('/logout')}>Logout</button>
                
                <div className="speech-bubble rolePlay-bubble">
                    <div className={bubbleClass}>
                        {currentBubbleText}
                  
                    </div>
                        <div className="speech-tail" /> 
                    </div>

                    <div className="character-placeholder">
                        <img 
                            src={characterImage} 
                            alt="Role Play Character" 
                            className="character-icon" 
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = CharacterBasic; }}
                        />
                    </div>
               </div>

                <div className="role-content-window rolePlay-content-window">
                    <div className="card-title-bar">
                        <span className="card-title-text">Role Play_At a Cafe</span>
                        <span className="card-step-text">{activeTurnData.id}</span>
                    </div>

                    {/* 스크롤 가능한 대화 기록 영역 */}
                    {/* ⭐ isScrollLocked 변수 사용 */}
                    <div className={`turn-history-area ${isScrollLocked ? 'scroll-locked' : ''}`} ref={scrollRef}>
    
                        {turnHistory.map((turn, index) => (
                            <TurnContentBox key={index} data={turn} />
                        ))}
                       {renderActiveInput()}    
       
                    </div>

                
                </div>
        
</div>
    );
};

export default RolePlay;
