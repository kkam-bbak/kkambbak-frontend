import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type User = { id: string; name: string } | null
type State = { user: User; login: (u: NonNullable<User>) => void; logout: () => void }

export const useUser = create<State>()(
  persist(
    (set) => ({
      user: null,
      login: (u) => set({ user: u }),
      logout: () => set({ user: null }),
    }),
    { name: 'auth', partialize: (s) => ({ user: s.user }) }
  )
)