/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'

import Splash from '../pages/Splash/Splash'
import Login from '../pages/Login/Login'
import MainPage from '../pages/mainPage/mainPage'
import SurveyStart from '../pages/krLearn/survey/surveyStart'
import Survey from '../pages/krLearn/survey/survey'
import LearnList from '../pages/krLearn/learnList/learnList'
import LearnStart from '../pages/krLearn/learnStart/learnStart'
import LearnComplete from '../pages/krLearn/learnComplete/learnComplete'

import { useUser } from '../stores/user'

function Protected() {
  const user = useUser((s) => s.user)
  // accessToken이 있으면 로그인된 상태
  return user?.accessToken ? <Outlet /> : <Navigate to="/login" replace />
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Splash />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/mainpage',
    //element: <Protected />,
    children: [
      {
        
        element: <AppLayout />,
        children: [
          { index: true, element: <MainPage /> },
          { path: 'surveyStart', element: <SurveyStart /> },
          { path: 'survey', element: <Survey /> },
          { path: 'learnList', element: <LearnList /> },
          

          // LearnList.tsx에서 navigate(`/mainpage/learn/${topicId}`) 로 사용해야 합니다.
          {
            path: 'learn/:topicId',
            element: <LearnStart />
          },
          { path: 'learn/complete', element: <LearnComplete /> }
        ],
      },
    ],
  },
  {
    path: '/app',
    element: <Protected />,
    children: [{ index: true, element: <div>Protected Area</div> }],
  },
])