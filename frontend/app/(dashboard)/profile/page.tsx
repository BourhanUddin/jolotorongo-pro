'use client';
import { useAuthStore } from '@/store/auth.store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { StatusBadge, InfoCard, Spinner, Field, SectionHeader } from '@/components/ui';
import { formatDate, daysLeft, formatMoney } from '@/lib/labels';
import type { Notification } from '@/types';
import { Bell, Lock, LogOut, ChevronRight } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout, setUser } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'info' | 'notifications' | 'password'>('info');
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });

  const { data: notifData, isLoading: notifLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => authApi.notifications(),
    enabled: tab === 'notifications',
  });

  const notifications: Notification[] = notifData?.data?.data?.notifications || [];
  const unread = notifications.filter(n => !n.isRead).length;

  const readAllMutation = useMutation({
    mutationFn: () => authApi.readAllNotifications(),
    onSuccess: () => { toast.success('সব পড়া হয়েছে'); qc.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  const changePwMutation = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
    onSuccess: () => { toast.success('পাসওয়ার্ড পরিবর্তন হয়েছে! ✅'); setPwForm({ currentPassword: '', newPassword: '', confirm: '' }); },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'ত্রুটি'),
  });

  const handleChangePw = () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) { toast.error('সব ঘর পূরণ করুন'); return; }
    if (pwForm.newPassword !== pwForm.confirm) { toast.error('নতুন পাসওয়ার্ড মিলছে না'); return; }
    if (pwForm.newPassword.length < 6) { toast.error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষর'); return; }
    changePwMutation.mutate();
  };

  const sub = user?.subscription;
  const subActive = sub?.isActive && sub?.paymentStatus === 'paid' && sub?.endDate && new Date(sub.endDate) > new Date();
  const dLeft = sub?.endDate ? daysLeft(sub.endDate) : 0;

  const roleLabel: Record<string, string> = {
    super_admin: '🛡️ সুপার অ্যাডমিন',
    boat_owner: '🛥️ বোট ওনার',
    agent: '🤝 এজেন্ট',
  };

  const notifTypeIcon: Record<string, string> = {
    success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️',
  };

  return (
    <div className="page fade-in">
      {/* Avatar + name */}
      <div className="flex flex-col items-center mb-6 pt-2">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white text-3xl font-bold shadow-md mb-3">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <h1 className="font-bold text-slate-800 text-xl">{user?.name}</h1>
        <p className="text-sm text-slate-500">{user?.email}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm">{roleLabel[user?.role || '']}</span>
          <StatusBadge status={user?.status || 'unverified'} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5">
        {[
          { key: 'info', label: 'তথ্য' },
          { key: 'notifications', label: `বিজ্ঞপ্তি ${unread > 0 ? `(${unread})` : ''}` },
          { key: 'password', label: 'পাসওয়ার্ড' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all min-h-0 ${
              tab === t.key ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Info Tab */}
      {tab === 'info' && (
        <div className="fade-in flex flex-col gap-4">
          <div className="card flex flex-col gap-3">
            {[
              { label: '📞 ফোন', value: user?.phone },
              { label: '📅 যোগদান', value: formatDate(user?.createdAt) },
              { label: '🏠 হাউসবোট', value: typeof user?.joinedHouseboatId === 'object' ? user?.joinedHouseboatId?.name : (user?.joinedHouseboatId ? 'যুক্ত আছেন' : 'নেই') },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center text-sm">
                <span className="text-slate-500">{row.label}</span>
                <span className="font-medium text-slate-800">{row.value || '—'}</span>
              </div>
            ))}
          </div>

          {/* Subscription card */}
          {user?.role === 'boat_owner' && (
            <div className={`card border-2 ${subActive ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <div className="flex justify-between items-center mb-2">
                <p className="font-bold text-slate-800">💳 সাবস্ক্রিপশন</p>
                <StatusBadge status={subActive ? 'active' : (sub?.paymentStatus || 'unpaid')} />
              </div>
              {sub?.planName && (
                <>
                  <p className="text-sm font-semibold text-slate-700">{sub.planName}</p>
                  {sub.endDate && (
                    <p className="text-xs text-slate-500 mt-1">
                      মেয়াদ: {formatDate(sub.endDate)}
                      {subActive && <span className="text-emerald-600 font-medium"> ({dLeft} দিন বাকি)</span>}
                    </p>
                  )}
                </>
              )}
              {!subActive && (
                <button onClick={() => router.push('/subscription')} className="btn btn-primary btn-full mt-3 text-sm">
                  প্ল্যান কিনুন / রিনিউ করুন
                </button>
              )}
            </div>
          )}

          {/* Agent status */}
          {user?.role === 'agent' && !user?.isApprovedByAdmin && (
            <InfoCard type="warning" message="আপনার অ্যাকাউন্ট এখনো ভেরিফাই হয়নি। সুপার অ্যাডমিনের অনুমোদনের জন্য অপেক্ষা করুন।" />
          )}

          {/* Quick links */}
          <div className="flex flex-col gap-2">
            <button onClick={() => setTab('notifications')} className="card flex items-center justify-between min-h-0 h-auto py-3">
              <div className="flex items-center gap-3">
                <Bell size={18} className="text-sky-500" />
                <span className="text-sm font-medium text-slate-700">বিজ্ঞপ্তি</span>
              </div>
              <div className="flex items-center gap-2">
                {unread > 0 && <span className="badge badge-red text-[10px]">{unread}</span>}
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </button>
            <button onClick={() => setTab('password')} className="card flex items-center justify-between min-h-0 h-auto py-3">
              <div className="flex items-center gap-3">
                <Lock size={18} className="text-sky-500" />
                <span className="text-sm font-medium text-slate-700">পাসওয়ার্ড পরিবর্তন</span>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
          </div>

          {/* Logout */}
          <button
            onClick={() => { logout(); router.replace('/login'); }}
            className="btn btn-outline btn-full text-red-500 border-red-200 mt-2"
          >
            <LogOut size={16} /> লগআউট
          </button>
        </div>
      )}

      {/* Notifications Tab */}
      {tab === 'notifications' && (
        <div className="fade-in">
          <div className="flex justify-between items-center mb-3">
            <SectionHeader title={`🔔 বিজ্ঞপ্তি (${notifications.length})`} />
            {unread > 0 && (
              <button onClick={() => readAllMutation.mutate()} disabled={readAllMutation.isPending} className="text-xs text-sky-600 font-medium min-h-0">
                সব পড়া হয়েছে চিহ্নিত করুন
              </button>
            )}
          </div>
          {notifLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <p className="text-3xl mb-2">🔔</p>
              <p className="text-sm">কোনো বিজ্ঞপ্তি নেই</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {notifications.map((n, i) => (
                <div key={i} className={`rounded-xl p-3.5 flex gap-3 transition-all ${n.isRead ? 'bg-slate-50' : 'bg-sky-50 border border-sky-100'}`}>
                  <span className="text-lg flex-shrink-0 mt-0.5">{notifTypeIcon[n.type] || 'ℹ️'}</span>
                  <div className="flex-1">
                    <p className={`text-sm leading-relaxed ${n.isRead ? 'text-slate-600' : 'text-slate-800 font-medium'}`}>{n.message}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{formatDate(n.createdAt)}</p>
                  </div>
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-sky-500 mt-2 flex-shrink-0" />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Password Tab */}
      {tab === 'password' && (
        <div className="fade-in flex flex-col gap-4">
          <Field label="বর্তমান পাসওয়ার্ড" required>
            <input type="password" className="input" placeholder="••••••••" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} />
          </Field>
          <Field label="নতুন পাসওয়ার্ড" required>
            <input type="password" className="input" placeholder="••••••••" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} />
          </Field>
          <Field label="নতুন পাসওয়ার্ড নিশ্চিত করুন" required>
            <input type="password" className="input" placeholder="••••••••" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
          </Field>
          {pwForm.newPassword && pwForm.confirm && pwForm.newPassword !== pwForm.confirm && (
            <InfoCard type="error" message="পাসওয়ার্ড মিলছে না" />
          )}
          <button onClick={handleChangePw} disabled={changePwMutation.isPending} className="btn btn-primary btn-full">
            {changePwMutation.isPending ? <Spinner size="sm" /> : '🔒 পাসওয়ার্ড পরিবর্তন করুন'}
          </button>
        </div>
      )}
    </div>
  );
}
