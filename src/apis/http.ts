import axios from 'axios'
import { useUser } from '../stores/user'

const API_ERROR_CODES = {
  TOKEN_EXPIRED: 'J001',
} as const

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://kkambbak.duckdns.org',
  withCredentials: true,
})

let isRefreshing = false
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

      if (isRefreshing) {
        try {
          const newAccessToken = await refreshPromise
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          return http(originalRequest)
        } catch (refreshErr) {
          return Promise.reject(refreshErr)
        }
      }

      isRefreshing = true
      refreshPromise = new Promise(async (resolve, reject) => {
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

          resolve(accessToken)
        } catch (refreshErr) {
          console.error('Token refresh failed:', refreshErr)
          const { user } = useUser.getState()
          if (!user?.isGuest) {
            useUser.getState().logout()
          }
          window.location.href = '/login'
          reject(refreshErr)
        } finally {
          isRefreshing = false
          refreshPromise = null
        }
      })

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