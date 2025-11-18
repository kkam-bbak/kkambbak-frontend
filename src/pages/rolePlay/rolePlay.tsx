import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Character1 from '../../assets/Character1.png';

import CharacterSmile from '../../assets/Character-Smile.png';
import CharacterJump from '../../assets/Character-Jump.png';
import CharacterWrong from '../../assets/Character-Wrong.png';
import CharacterGloomy from '../../assets/Character-Gloomy.png';
import CharacterSullen from '../../assets/Character-Sullen.png';
import './rolePlay.css';

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


// 단계별 상태 정의 (내부 로직을 위해 유지)
const STEPS = {
    START: 'START',               
    LISTEN: 'LISTEN',             
    LISTEN_DONE: 'LISTEN_DONE', 
    SPEAK_SETUP: 'SPEAK_SETUP',   
    RECORDING: 'RECORDING',       
    GRADING: 'GRADING',           
    PRACTICE_LISTEN: 'PRACTICE_LISTEN', 
    PRACTICE_LISTEN_DONE: 'PRACTICE_LISTEN_DONE', 
    PRACTICE_SPEAK: 'PRACTICE_SPEAK', 
    PRACTICE_GRADING: 'PRACTICE_GRADING',
    CHOICE_SETUP: 'CHOICE_SETUP', 
    CHOICE_TTS: 'CHOICE_TTS',     
    CHOICE_FEEDBACK: 'CHOICE_FEEDBACK', 
    DONE: 'DONE',                 
};

// 상태별 말풍선 텍스트 (요청에 따라 통일 및 TTS 지침 추가)
const BUBBLE_TEXT = {
    [STEPS.START]: "Okay, Let's go!",
    [STEPS.LISTEN]: "Listen carefully.", // TTS 유도 텍스트 추가 및 진행 안내
    //[STEPS.LISTEN_DONE]: "Ready to speak? Push the mic button.",
    [STEPS.SPEAK_SETUP]: "Speak!",
    [STEPS.RECORDING]: "Speak!",
    
    // 연습 단계 텍스트는 일반 단계 텍스트로 대체하여 사용
    [STEPS.PRACTICE_LISTEN]: "Listen carefully.",
    //[STEPS.PRACTICE_LISTEN_DONE]: "Ready to speak? Push the mic button.",
    [STEPS.PRACTICE_SPEAK]: "Speak!",
    
    [STEPS.CHOICE_SETUP]: "Which is correct?", 
    CORRECT: "good jo!",
    INCORRECT: "It's a waste.",
    OOS: "That's out of our Learning Scope\ntry to focus on your Study", 
};

// Mock Navigate Hook (라우팅 시뮬레이션)
// const useNavigate = () => (path) => console.log(`Navigating to: ${path}`);


// 🧪 상태에 따른 캐릭터 이미지 결정 함수
const getCharacterImage = (step, gradingResult) => {
    if (step === STEPS.START) return CharacterSmile;
    if (step === STEPS.GRADING || step === STEPS.CHOICE_FEEDBACK || step === STEPS.PRACTICE_GRADING) {
        if (gradingResult === 'CORRECT') return CharacterJump;
        if (gradingResult === 'INCORRECT') return CharacterGloomy; 
        if (gradingResult === 'OOS') return CharacterSullen; 
    }
    return Character1; 
};


// 🔥🔥🔥 Web Speech Synthesis 함수 🔥🔥🔥
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
    
    // 🎨 상태 관리
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
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [turnHistory]);


    // 📝 턴 완료 및 다음 턴 전환 로직
    const completeTurn = useCallback((result, userResponseData = {}) => {
        const finalTurnData = { ...activeTurnData, result, userResponseData };
        setTurnHistory(prev => [...prev, finalTurnData]);
        
        const nextIndex = activeTurnIndex + 1;
        if (nextIndex === SCENARIO_SEQUENCE.length) {
            setActiveTurnIndex(nextIndex);
            const nextTurn = SCENARIO_SEQUENCE[nextIndex];
            const nextStep = nextTurn.type === 'CHOICE' ? STEPS.CHOICE_SETUP : STEPS.LISTEN;
            setStep(nextStep); 
            setSelectedChoiceId(null);
            setGradingResult(null);
        } else {
            setStep(STEPS.DONE); // 시나리오 종료
        }
    }, [activeTurnData, activeTurnIndex]);
    
    
    // 📝 녹음 채점 로직 (녹음 턴)
const handleRecordingGrading = useCallback((mockResult) => {
    clearInterval(timerRef.current);
    setStep(STEPS.GRADING);
    setGradingResult(mockResult);

    setTimeout(() => {
        // ⭐ turnHistory에 현재 턴(RECORDING) 결과 기록
        const finalTurnData = { 
            ...activeTurnData, 
            result: mockResult, 
            userResponseData: { text: "Simulated User Recording", grade: mockResult } 
        };
        setTurnHistory(prev => [...prev, finalTurnData]);

        // ⭐ 다음 단계 결정 (completeTurn 대체 로직)
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
        }

    }, 1500);
}, [activeTurnData, activeTurnIndex]);

  // ⭐ 연습 단계 녹음 채점 로직
const handlePracticeGrading = useCallback((mockResult) => {
    clearInterval(timerRef.current);
    setStep(STEPS.PRACTICE_GRADING);
    setGradingResult(mockResult);
    
    // 채점 결과 표시 후 1.5초 뒤 다음 턴으로 이동/완료
    setTimeout(() => {
        const selectedOption = activeTurnData.choices.find(c => c.id === selectedChoiceId);
        
        // ⭐ 1. turnHistory에 현재 턴(CHOICE) 결과 기록 (채점까지 완료된 최종 결과)
        const finalTurnData = { 
            ...activeTurnData, 
            result: selectedOption.isCorrect ? 'CORRECT' : 'INCORRECT', // 선택지 결과
            practiceResult: mockResult, // 연습 결과 추가 (옵션)
            userResponseData: { 
                selectedId: selectedChoiceId, 
                text: selectedOption.korean, 
                romanized: selectedOption.romanized,
                english: selectedOption.english,
                finalResult: selectedOption.isCorrect ? 'CORRECT' : 'INCORRECT',
            } 
        };
        setTurnHistory(prev => [...prev, finalTurnData]);

        // ⭐ 2. 다음 단계 결정: 현재가 마지막 턴(index 5)인지 확인
        const nextIndex = activeTurnIndex + 1;
        
        if (nextIndex === SCENARIO_SEQUENCE.length) {
            // 마지막 턴 완료: DONE 단계로 전환하여 페이지 이동
            setStep(STEPS.DONE);
        } else {
            // 다음 턴으로 이동
            setActiveTurnIndex(nextIndex);
            const nextTurn = SCENARIO_SEQUENCE[nextIndex];
            const nextStep = nextTurn.type === 'CHOICE' ? STEPS.CHOICE_SETUP : STEPS.LISTEN;
            setStep(nextStep); 
            setSelectedChoiceId(null);
            setGradingResult(null);
        }
        setPracticeLineData(null); // 연습 데이터 초기화

    }, 1500);

}, [activeTurnData, activeTurnIndex, selectedChoiceId]);

    // ⭐ TTS 재생이 끝났을 때 호출되는 콜백
    const handleTtsPlaybackFinished = useCallback((success) => {
        setIsTtsPlaying(false);
        
        // TTS 재생 완료 시, 강제 전환 타이머를 취소
        if (flowTimerRef.current) {
            clearTimeout(flowTimerRef.current);
            flowTimerRef.current = null;
        }

        // LISTEN 단계 (일반/연습)에서 TTS가 끝나면 LISTEN_DONE 상태로 전환합니다.
        if (success && (step === STEPS.LISTEN || step === STEPS.PRACTICE_LISTEN)) {
            const nextStep = step === STEPS.LISTEN ? STEPS.LISTEN_DONE : STEPS.PRACTICE_LISTEN_DONE;
            setTimeout(() => { setStep(nextStep); }, 500); 
            return;
        }
        
        // 선택지 재생의 경우
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
        
        startTtsAndListen(text); // onFinish는 handleTtsPlaybackFinished가 처리
    }, [step, isRecording, startTtsAndListen]);
    
    
    // ⭐ LISTEN 단계에서 TTS 버튼을 눌렀을 때
    const handleListenTtsClick = useCallback(() => {
        // TTS 버튼은 LISTEN 단계에서만 활성화됩니다.
        if ((step === STEPS.LISTEN || step === STEPS.PRACTICE_LISTEN) && !isTtsPlaying) {
            
            let textToSpeak = activeTurnData.korean;
            if (step === STEPS.PRACTICE_LISTEN && practiceLineData) {
                textToSpeak = practiceLineData.korean;
            }
            if (textToSpeak) {
                // ⭐ TTS 재생 시작 시 강제 전환 타이머 취소
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
    const result = selectedOption && selectedOption.isCorrect ? 'CORRECT' : 'INCORRECT';

    setStep(STEPS.CHOICE_FEEDBACK);
    setGradingResult(result);
    
    setTimeout(() => {
        // ⭐ 마지막 턴인지 여부와 관계없이 연습 단계 진입 (요청 사항)
        const practiceData = activeTurnData.choices.find(c => c.isCorrect); 
        setPracticeLineData(practiceData);
        setStep(STEPS.PRACTICE_LISTEN);
        
    }, 1500); // 1.5초 후 피드백 완료

}, [selectedChoiceId, step, activeTurnData]); 
// activeTurnIndex 의존성을 제거하고, activeTurnData만으로 충분합니다.



    // 🎙️ 마이크 누름/뗌 핸들러
    const handleMicPress = useCallback(() => {
        const isActionable = activeTurnData.type === 'RECORDING' || step === STEPS.PRACTICE_SPEAK;
        const isReady = step === STEPS.SPEAK_SETUP || step === STEPS.PRACTICE_SPEAK;
        
        // ⭐ 마이크 비활성화 조건에 isTtsPlaying 추가: TTS 재생 중에는 녹음 금지
        if (!isActionable || !isReady || isTtsPlaying) return;

        setIsRecording(true);
        clearInterval(timerRef.current); // 녹음 시작 시 카운트다운 중단
    }, [step, activeTurnData.type, isTtsPlaying]);

    const handleMicRelease = useCallback(() => {
        if (!isRecording) return;
        setIsRecording(false);
        
        // Mock 채점 결과
        const randomResult = ['CORRECT', 'INCORRECT', 'OOS'][Math.floor(Math.random() * 3)];
        
        if (activeTurnData.type === 'RECORDING') {
            handleRecordingGrading(randomResult); // 일반 녹음 턴 채점
        } else {
            handlePracticeGrading(randomResult); // 연습 단계 채점
        }
    }, [isRecording, handleRecordingGrading, handlePracticeGrading, activeTurnData.type]);


    // 🕒 흐름 제어 (useEffect)
    useEffect(() => {
        
        clearInterval(timerRef.current); // 마이크 카운트다운 타이머 정리
        clearTimeout(flowTimerRef.current); // 흐름 제어 타이머 정리
        
        // 1. START -> LISTEN / CHOICE_SETUP (애니메이션 완료 후 1.5초 대기)
        if (step === STEPS.START) {
            flowTimerRef.current = setTimeout(() => {
                const nextStep = activeTurnData.type === 'CHOICE' ? STEPS.CHOICE_SETUP : STEPS.LISTEN;
                setStep(nextStep); 
            }, 1500); 
        }

        // ⭐ LISTEN 단계 (자동 진행 안전 장치 복원)
        if (step === STEPS.LISTEN || step === STEPS.PRACTICE_LISTEN) {
            // TTS가 안 들릴 경우를 대비해 4초 후 강제 전환 (LISTEN_DONE)
            // TTS가 정상 재생되면 handleTtsPlaybackFinished에서 이 타이머를 취소합니다.
            flowTimerRef.current = setTimeout(() => {
                window.speechSynthesis.cancel();
                setIsTtsPlaying(false);
                const nextStep = step === STEPS.LISTEN ? STEPS.LISTEN_DONE : STEPS.PRACTICE_LISTEN_DONE;
                setStep(nextStep);
            }, 4000); 
        }

        // 2. LISTEN_DONE 단계 (TTS 재생 완료 후) -> SPEAK_SETUP으로 전환 (2초 대기)
        if (step === STEPS.LISTEN_DONE) {
            flowTimerRef.current = setTimeout(() => {
                setStep(STEPS.SPEAK_SETUP);
            }, 0); 
        }

        // 3. SPEAK_SETUP (10초 카운트다운 시작 - 녹음 턴)
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
        // ⭐ 시나리오 완료 후 페이지 이동 로직 수정 (3초 딜레이 추가)
    // ⭐ 시나리오 완료 후 페이지 이동 로직
    if (step === STEPS.DONE) {
        console.log("Scenario Complete. Navigating to RolePlayComplete page.");
        // 짧은 딜레이 후 정확한 절대 경로로 이동
        flowTimerRef.current = setTimeout(() => { 
            navigate('/mainpage/rolePlay/complete'); // ⭐ 정확한 절대 경로로 수정하세요.
        }, 500); 
    }
        
        // ⭐ PRACTICE_LISTEN_DONE 단계 -> PRACTICE_SPEAK으로 전환 (2초 대기)
        if (step === STEPS.PRACTICE_LISTEN_DONE) {
             flowTimerRef.current = setTimeout(() => {
                 setStep(STEPS.PRACTICE_SPEAK);
             }, 0);
        }

        // ⭐ PRACTICE_SPEAK (연습 단계 카운트다운 시작)
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


    }, [step, isRecording, activeTurnData.type, handleRecordingGrading, handlePracticeGrading]);


    // 🎨 UI 데이터 설정
    let currentBubbleText;
    let bubbleClass = 'role-bubble';
    
    const isPracticeStep = step === STEPS.PRACTICE_LISTEN || step === STEPS.PRACTICE_SPEAK || step === STEPS.PRACTICE_GRADING || step === STEPS.PRACTICE_LISTEN_DONE;
    
    if (step === STEPS.GRADING || step === STEPS.CHOICE_FEEDBACK || step === STEPS.PRACTICE_GRADING) {
        currentBubbleText = BUBBLE_TEXT[gradingResult];
        bubbleClass += gradingResult === 'CORRECT' ? ' correct' : ' incorrect';
    } else {
        // Practice 단계의 텍스트를 일반 단계 텍스트로 매핑하여 사용
        if (step === STEPS.PRACTICE_LISTEN) {
            currentBubbleText = BUBBLE_TEXT[STEPS.LISTEN];
        } else if (step === STEPS.PRACTICE_LISTEN_DONE) {
            currentBubbleText = BUBBLE_TEXT[STEPS.LISTEN_DONE];
        } else if (step === STEPS.PRACTICE_SPEAK) {
            currentBubbleText = BUBBLE_TEXT[STEPS.SPEAK_SETUP]; // SPEAK_SETUP으로 통일
        } else {
            currentBubbleText = BUBBLE_TEXT[step] || BUBBLE_TEXT[STEPS.START]; 
        }
    }
    
    const characterImage = getCharacterImage(step, gradingResult);

    // 턴이 완료된 후 표시될 대화 상자 렌더링
    const TurnContentBox = ({ data }) => {
        const isRecordingTurn = data.type === 'RECORDING';
        
        const contextLineData = data.contextLine || {};
        
        const romanizedClass = data.result === 'CORRECT' ? ' correct' : data.result ? ' incorrect' : '';
        const role = data.speaker;
        
        const mainKoreanText = data.type === 'CHOICE' 
            ? data.userResponseData?.text || data.korean
            : data.korean; 
        
        const mainRomanizedText = data.type === 'CHOICE' 
            ? (data.choices.find(c => c.id === data.userResponseData?.selectedId)?.romanized || data.romanized)
            : data.romanized;
            
        const mainEnglishText = data.type === 'CHOICE' 
            ? (data.choices.find(c => c.id === data.userResponseData?.selectedId)?.english || data.english)
            : data.english;

        return (
            <div className="text-display-box history-box">
                
                {/* 현재 턴의 주요 대화 내용 */}
                <div className="text-line korean-line">
                    <span className="korean-text">{mainKoreanText}</span>
                    {isRecordingTurn && <button className="tts-button active" onClick={() => startTtsAndListen(data.korean)} disabled={isTtsPlaying}>🔊</button>}
                </div>
                <div className="text-line romanized-line">
                    <span className={`romanized-text ${romanizedClass}`}>{mainRomanizedText}</span>
                    {isRecordingTurn && <span className="small-mic-icon active">🎤</span>}
                </div>
                <span className="english-text">{mainEnglishText}</span>
                {/* <div className='content-tail'></div> */}
                
                <div className="role-container"><span className="role-tag">{role}</span></div>
            </div>
        );
    };


    // ⬇️ 현재 활성 입력 턴 렌더링
    const renderActiveInput = () => {
        const isCurrentlySpeaking = window.speechSynthesis.speaking; 
        
        // 현재 진행 단계가 PRACTICE_LISTEN 이면 isPracticeStep = true
        const isPracticeStep = step === STEPS.PRACTICE_LISTEN || step === STEPS.PRACTICE_SPEAK || step === STEPS.PRACTICE_GRADING || step === STEPS.PRACTICE_LISTEN_DONE;
        
        // 녹음 입력 턴 (T1, T3, T5)
        if (activeTurnData.type === 'RECORDING' && !isPracticeStep) {
            // LISTEN 단계에서만 TTS 버튼 활성화
            const isTtsActionable = step === STEPS.LISTEN; 
            
            // SPEAK_SETUP/RECORDING 상태에서만 마이크 활성화
            const isMicActionable = step === STEPS.SPEAK_SETUP || step === STEPS.RECORDING;
            const mainMicButtonClass = isMicActionable ? (isRecording ? 'on' : 'off') : 'off disabled';
            const getRomClass = () => (step === STEPS.GRADING && gradingResult !== 'CORRECT') ? ' incorrect' : '';

            return (
                <div className="active-turn-recording-flow">
                    <div className="text-display-box active-turn-box">
                 
                        <div className="text-line korean-line">
                            <span className="korean-text">{activeTurnData.korean}</span>
                            <button 
                                className={`tts-button ${isTtsActionable ? ' active' : ''}`}
                                onClick={handleListenTtsClick}
                                disabled={!isTtsActionable || isCurrentlySpeaking}>
                                🔊
                            </button>
                        </div>
                        <div className="text-line romanized-line">
                            <span className={`romanized-text${getRomClass()}`}>{activeTurnData.romanized}</span>
                            <span className={`small-mic-icon${isRecording || isMicActionable ? ' active' : ''}`}>🎤</span>
                        </div>
                        <span className="english-text">{activeTurnData.english}</span>
                            <div className="role-container"><span className="role-tag">{activeTurnData.speaker}</span></div>
                        
                    </div>
                    {/* <div className='content-tail'></div> */}
                 
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
        
        // 선택지 입력 턴 (T2, T4, T6)
        else if (activeTurnData.type === 'CHOICE' && !isPracticeStep) {
            const customerData = activeTurnData.choices;
            const isDisabled = step === STEPS.CHOICE_FEEDBACK || isCurrentlySpeaking;
            
            const getChoiceRomClass = (optionId) => {
                const option = customerData.find(c => c.id === optionId);
                const isCorrect = option && option.isCorrect;
                
                if (step === STEPS.CHOICE_FEEDBACK) {
                    if (isCorrect) return ' correct';
                    if (!isCorrect && optionId === selectedChoiceId) return ' incorrect'; 
                }
                return '';
            };
            
            const isSubmitActive = selectedChoiceId !== null && step === STEPS.CHOICE_SETUP;
            const submitButtonClass = isSubmitActive ? 'on' : 'off disabled';

            // 중앙에 표시할 옵션 선택: 피드백 중 오답이면 정답으로 교체
            let displayOption = customerData.find(c => c.id === selectedChoiceId);
            if (step === STEPS.CHOICE_FEEDBACK && gradingResult === 'INCORRECT') {
                displayOption = customerData.find(c => c.isCorrect);
            } else if (!displayOption) {
                displayOption = customerData[0]; // 초기 상태일 때 첫 번째 옵션을 표시
            }

            return (
                <>
                    {/* 턴 2 중앙 선택지 표시 영역 (내용만 바뀜) */}
                        <div className="choice-options-area center-display">
                            
                            {/* 선택된(또는 피드백 중인) 옵션의 내용을 중앙에 표시 */}
                            {displayOption && (
                                <div className="text-display-box active-choice-content">
                                    <div className="text-line korean-line">
                                        <span className="korean-text choice-option-korean">{displayOption.korean}</span>
                                        <button 
                                            className={`tts-button ${isCurrentlySpeaking && ttsOptionId === displayOption.id ? 'active' : 'choice-tts-inactive'}`}
                                            onClick={() => handleChoiceOptionClick(displayOption.id, displayOption.korean)}
                                            disabled={isDisabled}
                                        >
                                            🔊
                                        </button>
                                    </div>
                                    <div className="text-line romanized-line">
                                        <span className={`romanized-text choice-option-romanized ${getChoiceRomClass(displayOption.id)}`}>
                                            {displayOption.romanized}
                                        </span>
                                    </div>
                                    <span className="english-text choice-option-english">{displayOption.english}</span>
                                   <div className="role-container costomer"><span className="role-tag">{activeTurnData.speaker}</span></div>
                                </div>

                            )}
                        </div>
               
                    
                    {/* 선택 버튼 영역 (하단 고정) */}
                    <div className="mic-area choice-button">
                        {customerData.map(option => (
                            <button 
                                key={option.id}
                                className={`choice-button-action ${option.id === selectedChoiceId ? 'selected' : ''}`}
                                onClick={() => handleChoiceOptionClick(option.id, option.korean)}
                                disabled={isDisabled && option.id !== selectedChoiceId}
                            >
                                {option.id}
                            </button>
                        ))}
                        
                        <button 
                            className={`main-mic-button select-submit-button 
                                ${step === STEPS.CHOICE_FEEDBACK ? (gradingResult === 'CORRECT' ? 'correct-submit' : 'incorrect-submit') : ''}
                                ${isSubmitActive ? 'on' : 'off disabled'}`}
                            onClick={handleChoiceSelect}
                            disabled={!isSubmitActive}
                        >
                            <span className="select-submit-text">
                                {step === STEPS.CHOICE_FEEDBACK ? "Continue" : "select"}
                            </span>
                        </button>
                    </div>
                </>
            );
        }
        
        // ⭐ 연습 단계 렌더링 (T2 선택 후)
        else if (isPracticeStep) {
             const practiceText = practiceLineData || { korean: '', romanized: '', english: '' };
            
             // PRACTICE_LISTEN 단계에서만 TTS 버튼 활성화
             const isTtsActionable = step === STEPS.PRACTICE_LISTEN; 

             const practiceButtonActive = step === STEPS.PRACTICE_SPEAK;
             const practiceMainMicClass = practiceButtonActive ? (isRecording ? 'on' : 'off') : 'off disabled';
             const practiceRomClass = (step === STEPS.PRACTICE_GRADING && gradingResult !== 'CORRECT') ? ' incorrect' : '';

             return (
                <div className="active-turn-recording-flow">
                    <div className="text-display-box practice-line-box">
                
                        <div className="text-line korean-line">
                            <span className="korean-text">{practiceText.korean}</span>
                            <button 
                                className={`tts-button ${isTtsActionable ? ' active' : ''}`}
                                onClick={handlePracticeListenTtsClick}
                                disabled={!isTtsActionable || isCurrentlySpeaking}>
                                🔊
                            </button>
                        </div>
                        <div className="text-line romanized-line">
                            <span className={`romanized-text ${practiceRomClass}`}>{practiceText.romanized}</span>
                            <span className={`small-mic-icon ${isRecording || step === STEPS.PRACTICE_SPEAK ? ' active' : ''}`}>🎤</span>
                        </div>
                        <span className="english-text">{practiceText.english}</span>
                        {/* <div className='content-tail'></div> */}
                        <div className="role-container costomer"><span className="role-tag">{activeTurnData.speaker}</span></div>
                    </div>

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
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = Character1; }}
                        />
                    </div>
               </div>

                <div className="role-content-window rolePlay-content-window">
                    <div className="card-title-bar">
                        <span className="card-title-text">Role Play_At a Cafe</span>
                        <span className="card-step-text">{activeTurnData.id}</span>
                    </div>

                    {/* 스크롤 가능한 대화 기록 영역 */}
                    <div className="turn-history-area" ref={scrollRef}>
    
                        {turnHistory.map((turn, index) => (
                            <TurnContentBox key={index} data={turn} />
                        ))}
                       {renderActiveInput()}    
{/*                         활성 턴의 공간을 미리 확보하여 스크롤 위치를 예상
                        {activeTurnIndex < SCENARIO_SEQUENCE.length && (
                           <div className="active-turn-placeholder"></div>
                        )} */}
       
                    </div>

                
                </div>
        
</div>
    );
};

export default RolePlay;