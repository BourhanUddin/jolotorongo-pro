'use client';
import { useAuthStore } from '@/store/auth.store';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { Bell, ChevronDown, Menu, User } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Notification } from '@/types';

export default function TopBar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => authApi.notifications(),
    refetchInterval: 30_000,
    enabled: !!user,
  });

  const notifications: Notification[] = notifData?.data?.data?.notifications || [];
  const unread = notifications.filter(n => !n.isRead).length;

  if (user?.role === 'super_admin') {
    return (
      <header className="sticky top-0 z-40 border-b border-[#eee7f4] bg-[#fbf5ff]/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <button onClick={() => router.push('/dashboard')} className="flex min-h-0 items-center gap-4 text-[#32157c]">
            <Menu size={21} />
            <span className="text-base font-medium">HaorSaaS Admin</span>
          </button>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="relative flex h-9 w-9 min-h-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#32157c] bg-slate-900 text-xs font-bold text-white"
          >
            {user?.name?.[0]?.toUpperCase() || 'A'}
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-4 top-12 z-20 w-52 overflow-hidden rounded-xl border border-[#eee7f4] bg-white shadow-xl">
                <div className="border-b border-slate-100 p-3">
                  <p className="truncate text-sm font-bold text-slate-800">{user?.name}</p>
                  <p className="truncate text-xs text-slate-500">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setShowMenu(false); router.push('/admin/users/new'); }}
                  className="flex min-h-0 w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-[#fbf5ff]"
                >
                  <User size={14} /> Create User
                </button>
                <button
                  onClick={() => { logout(); router.replace('/login'); }}
                  className="flex min-h-0 w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50"
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </header>
    );
  }

  const roleLabel: Record<string, string> = {
    super_admin: '🛡️ সুপার অ্যাডমিন',
    boat_owner:  '🛥️ বোট ওনার',
    manager:     '🧭 ম্যানেজার',
    agent:       '🤝 এজেন্ট',
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
        {/* Logo */}
        <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 min-h-0">
          <span className="text-xl">🛥️</span>
          <div>
            <p className="font-bold text-sky-600 text-sm leading-none">জলতরঙ্গ</p>
            <p className="text-[10px] text-slate-400 leading-none">Jolotorongo</p>
          </div>
        </button>

        {/* Right */}
        <div className="flex items-center gap-1.5">
          {/* Notification bell */}
          <button
            onClick={() => router.push('/profile')}
            className="relative p-2 rounded-xl hover:bg-slate-100 flex items-center justify-center min-h-0"
          >
            <Bell size={19} className="text-slate-600" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {/* User dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-1.5 bg-slate-100 rounded-xl px-2.5 py-1.5 min-h-0"
            >
              <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <ChevronDown size={13} className="text-slate-400" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden">
                  {/* User info */}
                  <div className="p-3 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-800 truncate">{user?.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    <p className="text-xs text-sky-500 mt-0.5">{roleLabel[user?.role || '']}</p>
                  </div>

                  {/* Menu items */}
                  <button
                    onClick={() => { setShowMenu(false); router.push('/profile'); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 min-h-0"
                  >
                    <User size={14} /> প্রোফাইল ও বিজ্ঞপ্তি
                  </button>

                  {user?.role === 'boat_owner' && (
                    <button
                      onClick={() => { setShowMenu(false); router.push('/houseboat'); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 min-h-0"
                    >
                      ⚙️ বোট সেটিংস
                    </button>
                  )}

                  <div className="border-t border-slate-100">
                    <button
                      onClick={() => { logout(); router.replace('/login'); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 min-h-0"
                    >
                      🚪 লগআউট
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
