'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

export default function Home() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  useEffect(() => {
    if (!token || !user) { router.replace('/login'); return; }
    if (user.role === 'boat_owner') {
      const sub = user.subscription;
      const active = sub?.isActive && sub?.paymentStatus === 'paid' && sub?.endDate && new Date(sub.endDate) > new Date();
      router.replace(active ? '/dashboard' : '/subscription');
    } else {
      router.replace('/dashboard');
    }
  }, [user, token, router]);
  return <div className="flex items-center justify-center min-h-screen"><div className="spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" /></div>;
}
