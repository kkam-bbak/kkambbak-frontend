import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type User = {
  providerId: string // 게스트 ID
  accessToken: string
  refreshToken: string
  isGuest: boolean
} | null

type State = {
  user: User
  login: (u: NonNullable<User>) => void
  logout: () => void
}

export const useUser = create<State>()(
  persist(
    (set) => ({
      user: null,
      login: (u) => set({ user: u }),
      logout: () => {
        set({ user: null })
        // localStorage 완전히 정리
        localStorage.removeItem('auth')
        localStorage.clear()
      },
    }),
    { name: 'auth', partialize: (s) => ({ user: s.user }) }
  )
)