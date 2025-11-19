import axios from 'axios'
import { useUser } from '../stores/user'

const API_ERROR_CODES = {
  TOKEN_EXPIRED: 'J001',
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