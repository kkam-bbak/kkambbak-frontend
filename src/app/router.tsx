/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'

import Home from '../pages/Home'
import MainPage from '../pages/mainPage/mainPage' 

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
      {
        path: 'app',
        element: <Protected />,
        children: [{ index: true, element: <div>Protected Area</div> }],
      },
    ],
  },
])