import axios from 'axios'
import { useUser } from '../stores/user'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://kkambbak.duckdns.org/api',
  withCredentials: true,
})

// Request interceptor - accessToken을 Authorization 헤더에 추가
http.interceptors.request.use(
  (config) => {
    const { user } = useUser.getState()
    if (user?.accessToken) {
      config.headers.Authorization = `Bearer ${user.accessToken}`
    }
    return config
  },
  (err) => Promise.reject(err)
)

// Response interceptor - 에러 처리
http.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
)