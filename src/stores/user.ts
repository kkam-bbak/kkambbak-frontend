import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Profile = {
  name: string;
  koreanName: string | null;
  nameMeaning: string | null;
  gender: string | null;
  countryOfOrigin: string | null;
  personalityOrImage: string | null;
  profileImage: string;
};

export type Auth = {
  providerId: string; // 게스트 ID
  accessToken: string;
  refreshToken: string;
  isGuest?: boolean;
} | null;

type User = (Partial<Auth> & Partial<Profile>) | null;

type State = {
  user: User;
  login: (u: Auth) => void;
  logout: (clearStorage?: boolean) => void;
  updateProfile: (profile: Profile) => void;
};

export const useUser = create<State>()(
  persist(
    (set) => ({
      user: null,
      login: (u) => set({ user: u }),
      logout: (clearStorage = true) => {
        set({ user: null });
        if (clearStorage) {
          localStorage.clear();
        }
      },
      updateProfile: (profile) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...profile } : null,
        })),
    }),
    { name: 'auth', partialize: (s) => ({ user: s.user }) },
  ),
);
