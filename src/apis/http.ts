import axios from 'axios'
import { useUser } from '../stores/user'

const API_ERROR_CODES = {
  TOKEN_EXPIRED: 'J001',
  UNAUTHORIZED: 'C401',
} as const

const API_ENDPOINTS = {
  REFRESH: '/api/v1/users/refresh',
} as const

const API_HEADERS = {
  REFRESH_TOKEN: 'RefreshToken',
} as const

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://kkambbak.duckdns.org',
  withCredentials: true,
})

let refreshPromise: Promise<string> | null = null

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

http.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config
    const errorCode = err.response?.data?.status?.statusCode
    const statusCode = err.response?.status

    // C401 (Unauthorized) - 토큰이 없거나 인증 실패 → 바로 로그인
    if (errorCode === API_ERROR_CODES.UNAUTHORIZED || statusCode === 401) {
      console.log('Unauthorized access. Redirecting to login...')
      const { logout } = useUser.getState()
      logout()
      window.location.href = '/login'
      return Promise.reject(err)
    }

    // J001 (Token Expired) - 토큰 만료 → refresh 시도
    if (errorCode === API_ERROR_CODES.TOKEN_EXPIRED && !originalRequest._retry) {
      originalRequest._retry = true

      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const { user } = useUser.getState()

            if (!user?.refreshToken) {
              throw new Error('No refresh token available')
            }

            const response = await axios.post(
              `${http.defaults.baseURL}${API_ENDPOINTS.REFRESH}`,
              {},
              {
                headers: {
                  [API_HEADERS.REFRESH_TOKEN]: user.refreshToken,
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

            return accessToken
          } catch (refreshErr) {
            console.error('Token refresh failed:', refreshErr)
            const { user, logout } = useUser.getState()
            if (!user?.isGuest) {
              logout()
            }
            window.location.href = '/login'
            throw refreshErr
          } finally {
            refreshPromise = null
          }
        })()
      }

      try {
        const newAccessToken = await refreshPromise
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return http(originalRequest)
      } catch (refreshErr) {
        return Promise.reject(refreshErr)
      }
    }

    return Promise.reject(err)
  }
)