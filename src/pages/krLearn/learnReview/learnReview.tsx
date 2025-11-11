import React from 'react';

import { useNavigate } from 'react-router-dom';

import { CheckCircle, Clock, Calendar } from 'lucide-react';

import './learnReview.css';



// --- 학습 데이터 구조 정의 ---

interface WordResult {

    romnized: string;

    korean: string;

    translation: string;

    isCorrect: boolean;

}



// --- 더미 데이터 ---

const DUMMY_SUMMARY = {

    topicName: "Emotions",

    correctCount: 18,

    totalCount: 25,

    learningTime: "6m 30s",

    completionDate: "Tuesday, November 3, 2023",

};



const DUMMY_WORD_RESULTS: WordResult[] = [

    { romnized: 'Sa - gwa', korean: '사 - 과', translation: 'Apple', isCorrect: true },

    { romnized: 'Ott', korean: '옷', translation: 'Cloth', isCorrect: false },

    { romnized: 'Bab', korean: '밥', translation: 'Rice', isCorrect: true },

    { romnized: 'Dang - geun', korean: '당 - 근', translation: 'Carrot', isCorrect: false },

    { romnized: 'Mul', korean: '물', translation: 'Water', isCorrect: true },

    { romnized: 'Hae - sal', korean: '해 - 살', translation: 'Sunshine', isCorrect: true },

    { romnized: 'Ba - da', korean: '바 - 다', translation: 'Sea', isCorrect: false },

    { romnized: 'Bi - haeng', korean: '비 - 행', translation: 'Flight', isCorrect: true },

    // 스크롤 테스트를 위해 더미 데이터 추가

    { romnized: 'Gong - bu', korean: '공 - 부', translation: 'Study', isCorrect: false },

    { romnized: 'Cha - kkan', korean: '착 - 한', translation: 'Kind', isCorrect: true },

];

// --- END DUMMY DATA ---



// 결과 요약 항목 렌더링 컴포넌트

const ResultRow = ({ icon: Icon, value }: { icon: React.ElementType, value: string }) => (

    <div className="result-row">

        <Icon className="result-icon" />

        <span className="result-value">{value}</span>

    </div>

);



// 단어별 결과 목록 행 컴포넌트

const WordResultRow: React.FC<{ label: string, value: string, isResult?: boolean, isCorrect?: boolean }> = ({ label, value, isResult = false, isCorrect }) => (

    <div className="word-result-row">

        <span className="word-label">{label}</span>

        <span className="word-value">{value}</span>

        {isResult && (

            <span className={`result-tag ${isCorrect ? 'correct' : 'wrong'}`}>

                {isCorrect ? 'Correct' : 'Wrong'}

            </span>

        )}

    </div>

);





const LearnReview: React.FC = () => {

    const navigate = useNavigate();

    const summary = DUMMY_SUMMARY;

    const wordResults = DUMMY_WORD_RESULTS;



    // 'Only wrong try Again' 클릭 핸들러 (틀린 단어만 재학습 시작)

    const handleWrongOnlyTryAgain = () => {

        const incorrectWords = wordResults.filter(w => !w.isCorrect);

        console.log("Navigating to learning page with only incorrect words:", incorrectWords);

        navigate(`/mainPage/learn/${summary.topicName}/retry-wrong`);

    };



    // 'Try again' 클릭 핸들러 (전체 학습 다시 시작)

    const handleTryAgain = () => {

        console.log("Navigating to learning page to retry all words.");

        navigate(`/mainPage/learn/${summary.topicName}`);

    };



    return (

        <div className="Review-page-container">

           

            {/* 1. 상단 타이틀 및 요약 (스크롤 시 고정) */}

            <div className="review-header">

                <h1 className="review-title">

                    Session Result Review

                </h1>



                {/* 결과 요약 박스 (검은색 배경) */}

                <div className="review-results-box">

                    <h2 className="results-topic-title">

                        {summary.topicName}_Result

                    </h2>



                    <ResultRow

                        icon={CheckCircle}

                        value={`${summary.correctCount}/${summary.totalCount} Vocabularies correct`}

                    />

                    <ResultRow

                        icon={Clock}

                        value={summary.learningTime}

                    />

                    <ResultRow

                        icon={Calendar}

                        value={summary.completionDate}

                    />

                </div>

            </div>



            {/* 2. 단어별 결과 목록 (스크롤 되는 본문 내용) */}

            <div className="word-results-list">

                {wordResults.map((word, index) => (

                    <div key={index} className="rv-word-result-container">

                        <WordResultRow label="Romnized" value={word.romnized} isResult={true} isCorrect={word.isCorrect} />

                        <WordResultRow label="Korean" value={word.korean} />

                        <WordResultRow label="Translation" value={word.translation} />

                    </div>

                ))}

            </div>



            {/* 3. 하단 고정 버튼 */}

            {/* ⚠️ 이 컨테이너는 fixed로 설정되어 페이지 스크롤과 독립적으로 움직입니다. */}

            <div className="review-action-container">

                <button

                    className="review-action-button wrong-only"

                    onClick={handleWrongOnlyTryAgain}

                >

                    Only wrong try Again

                </button>

                <button

                    className="review-action-button try-all"

                    onClick={handleTryAgain}

                >

                    Try again

                </button>

            </div>

           

        </div>

    );

};



export default LearnReview;