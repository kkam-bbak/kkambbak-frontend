// SurveyStart.tsx (메인 페이지에서 처음 접근하는 파일)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { http } from '../../../apis/http';
//import Character1 from '../../../assets/Character1.png';
import './surveyStart.css';
import Header from '@/components/layout/Header/Header';
import Mascot from '@/components/Mascot/Mascot';
import ContentSection from '@/components/layout/ContentSection/ContentSection';

// --- 데이터 및 타입 정의 (유지) ---
const surveyData = [
  /* ... */
];
const INTRO_BUBBLE_TEXT =
  "Before we start, Answer a few simple questions and we'll tailor your learning to your needs.";

// --- 컴포넌트 분리 (SpeechBubble, CharacterSection 유지) ---

const CharacterSection = () => {
  return (
    <div className="header-section">
      <Header hasBackButton />
      <Mascot image="basic" text={INTRO_BUBBLE_TEXT} />
    </div>
  );
};

// --- 메인 컴포넌트 ---

const SurveyStart: React.FC = () => {
  const navigate = useNavigate();

  //설문 완료 확인여부 api
  const handleStart = async (e: React.MouseEvent) => {
  e.stopPropagation();

  // 1. **(제거됨)** 토큰을 수동으로 가져오는 로직 (인터셉터가 처리함)
  
  try {
    // 2. /api/v1/surveys/check API 호출 (Axios 방식)
    // http.get()은 두 번째 인자로 config 객체를 받지만,
    // 이 요청은 별도의 header나 body가 필요 없으므로, config 객체(headers 등)를 제거합니다.
    const response = await http.get('/api/v1/surveys/check'); 

    // 3. 응답 데이터 접근 (Axios는 response.data로 접근)
    // response.data가 API의 JSON 본문입니다.
    const jsonResponse = response.data; 
    
    // 4. 응답 데이터(body.completed)를 확인하여 이동 경로 결정
    // Axios는 HTTP 상태 코드가 200번대가 아니면 자동으로 catch 블록으로 이동시킵니다.
    const isCompleted = jsonResponse?.body?.completed; 
    
    if (isCompleted === true) {
      console.log('이미 설문을 완료했습니다. 학습 목록으로 이동합니다.');
      // ✅ 완료 상태: 설문 시작 대신 학습 목록으로 이동
      navigate('../learnList'); 
      
    } else {
      console.log('설문 미완료 상태입니다. 설문 시작 페이지로 이동합니다.');
      // ✅ 미완료 상태: 원래 목적지인 설문 시작 페이지로 이동
      navigate('../survey'); 
    }

  } catch (error) {
    // Axios는 에러 발생 시 err.response, err.message 등을 포함하는 객체를 반환합니다.
    console.error('설문 확인 중 오류 발생:', error);
    
    // 401 Unauthorized 등 토큰 문제일 경우 로그인 페이지로 보내는 로직 추가 가능
    // if (axios.isAxiosError(error) && error.response?.status === 401) {
    //     navigate('/login');
    //     return;
    // }
    
    // API 호출 오류가 발생했더라도, 사용자 경험을 위해 설문 시작 페이지로 이동시키는 폴백(Fallback) 처리
    navigate('../survey'); 
  }
};

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Skip 버튼 클릭 시, LearnList.tsx로 라우팅
    navigate('../learnList');
  };

  return (
    <div className="survey-start-container">
      {/* 상단 섹션 */}
      <CharacterSection />

      {/* 하단 Survey 내용 창 */}
      <ContentSection>
        <h1 className="survey-title">Survey</h1>

        {/* 1. Start 버튼 */}
        <div className="start-button-container">
          <button className="start-button" onClick={handleStart}>
            Start
          </button>
        </div>

        {/* 2. Skip to learning 버튼 */}
        <div className="skip-button-container">
          <button className="skip-button" onClick={handleSkip}>
            Skip to learning
          </button>
        </div>
      </ContentSection>
    </div>
  );
};

export default SurveyStart;
