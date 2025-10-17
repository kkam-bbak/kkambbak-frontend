import axios from 'axios'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
})

// 필요 시 공통 에러/토큰 처리 자리
http.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
)