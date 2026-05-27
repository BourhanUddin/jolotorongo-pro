import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

const setCookie = (name: string, value: string, days = 7) => {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
};

const deleteCookie = (name: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('jt_token', token);
        setCookie('jt_token', token);
        set({ user, token });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        localStorage.removeItem('jt_token');
        localStorage.removeItem('jt_user');
        deleteCookie('jt_token');
        set({ user: null, token: null });
      },
    }),
    {
      name: 'jt_user',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);

export const useIsAdmin  = () => useAuthStore((s) => s.user?.role === 'super_admin');
export const useIsOwner  = () => useAuthStore((s) => s.user?.role === 'boat_owner');
export const useIsAgent  = () => useAuthStore((s) => s.user?.role === 'agent');
export const useHasActiveSub = () =>
  useAuthStore((s) => {
    const sub = s.user?.subscription;
    if (!sub?.isActive || sub?.paymentStatus !== 'paid' || !sub?.endDate) return false;
    return new Date(sub.endDate) > new Date();
  });
