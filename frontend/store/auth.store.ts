import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  hydrated: boolean;
  setAuth: (user: User, token?: string | null) => void;
  setUser: (user: User) => void;
  setHydrated: (hydrated: boolean) => void;
  logout: () => void;
}

const deleteCookie = (name: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      hydrated: false,
      setAuth: (user, token) => {
        set({ user, token: token || null });
      },
      setUser: (user) => set({ user }),
      setHydrated: (hydrated) => set({ hydrated }),
      logout: () => {
        localStorage.removeItem('jt_token');
        localStorage.removeItem('jt_user');
        deleteCookie('jt_token');
        set({ user: null, token: null });
      },
    }),
    {
      name: 'jt_user',
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

export const useIsAdmin  = () => useAuthStore((s) => s.user?.role === 'super_admin');
export const useIsOwner  = () => useAuthStore((s) => s.user?.role === 'boat_owner');
export const useIsAgent  = () => useAuthStore((s) => s.user?.role === 'agent');
