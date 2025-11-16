import axios from 'axios'
import { useUser } from '../stores/user'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://kkambbak.duckdns.org',
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
  async (err) => {
    const originalRequest = err.config
    const errorCode = err.response?.data?.status?.statusCode

    if (errorCode === 'J001' && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const { user } = useUser.getState()

        if (!user?.refreshToken) {
          throw new Error('No refresh token available')
        }

        const response = await axios.post(
          `${http.defaults.baseURL}/api/v1/users/refresh`,
          {},
          {
            headers: {
              RefreshToken: user.refreshToken,
            },
          }
        )

        const { accessToken, refreshToken } = response.data?.body

        if (!accessToken || !refreshToken) {
          throw new Error('Failed to get new tokens')
        }

        useUser.setState({
          user: {
            ...user,
            accessToken,
            refreshToken,
          },
        })

        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return http(originalRequest)
      } catch (refreshErr) {
        console.error('Token refresh failed:', refreshErr)
        useUser.getState().logout()
        window.location.href = '/login'
        return Promise.reject(refreshErr)
      }
    }

    return Promise.reject(err)
  }
)