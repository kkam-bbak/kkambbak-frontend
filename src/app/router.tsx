/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'

import Home from '../pages/Home'
import MainPage from '../pages/mainPage/mainPage' 
import SurveyStart from '../pages/krLearn/survey/surveyStart'   
import Survey from '../pages/krLearn/survey/survey'
import LearnList from '../pages/krLearn/learnList/learnList'
import LearnStart from '../pages/krLearn/learnStart/learnStart'

import { useUser } from '../stores/user'

function Protected() {
  const user = useUser((s) => s.user)
  return user ? <Outlet /> : <Navigate to="/" replace />
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [

      { index: true, element: <Home /> },
      { path: 'mainpage', element: <MainPage /> },
      { path: 'mainpage/surveyStart', element: <SurveyStart /> },
      { path: 'mainpage/survey', element: <Survey /> },
      { path: 'mainpage/learnList', element: <LearnList /> },

  
      
      // LearnList.tsx에서 navigate(`/mainpage/learn/${topicId}`) 로 사용해야 합니다.
      { 
        path: 'mainpage/learn/:topicId', 
        element: <LearnStart /> 
      },
      {
        path: 'app',
        element: <Protected />,
        children: [{ index: true, element: <div>Protected Area</div> }],
      },
    ],
  },
])