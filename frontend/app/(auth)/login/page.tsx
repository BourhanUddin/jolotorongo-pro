'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import { Field, InfoCard, Spinner } from '@/components/ui';
import type { User } from '@/types';

type Mode = 'password' | 'otp';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('password');
  const [form, setForm] = useState({ identifier: '', password: '', otp: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const finishLogin = (res: { data: { token: string; data: { user: User }; redirectTo?: string } }, message: string) => {
    const { token, data, redirectTo } = res.data;
    setAuth(data.user, token);
    toast.success(message);
    router.replace(redirectTo || '/dashboard');
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.identifier || !form.password) { toast.error('ইমেইল/ফোন ও পাসওয়ার্ড দিন'); return; }
    setLoading(true);
    try {
      const res = await authApi.login({ identifier: form.identifier, password: form.password });
      finishLogin(res, 'লগইন সফল');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'লগইন ব্যর্থ হয়েছে';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const requestOtp = async () => {
    if (!form.identifier) { toast.error('ইমেইল বা ফোন দিন'); return; }
    setLoading(true);
    try {
      const res = await authApi.requestOtp({ identifier: form.identifier, purpose: 'login' });
      setOtpSent(true);
      setDemoOtp(res.data?.data?.demoOtp || '');
      toast.success('OTP পাঠানো হয়েছে');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'OTP পাঠানো যায়নি';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpSent) { await requestOtp(); return; }
    if (!form.otp) { toast.error('OTP দিন'); return; }
    setLoading(true);
    try {
      const verify = await authApi.verifyOtp({ identifier: form.identifier, otp: form.otp, purpose: 'login' });
      const res = await authApi.otpLogin({ identifier: form.identifier, otpToken: verify.data.data.otpToken });
      finishLogin(res, 'OTP লগইন সফল');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'OTP লগইন ব্যর্থ';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const googleDemoLogin = async () => {
    setLoading(true);
    try {
      const res = await authApi.google({ email: 'demo.google@jolotorongo.com', name: 'Google Demo User', googleId: 'demo-google-user' });
      finishLogin(res, 'Google লগইন সফল');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Google লগইন ব্যর্থ';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <h2 className="text-xl font-bold text-slate-800 mb-1">লগইন করুন</h2>
      <p className="text-sm text-slate-500 mb-5">ইমেইল, ফোন, OTP বা Google দিয়ে প্রবেশ করুন</p>

      <div className="grid grid-cols-2 gap-2 mb-4 rounded-xl bg-slate-100 p-1">
        {[
          { key: 'password', label: 'Password' },
          { key: 'otp', label: 'OTP' },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setMode(item.key as Mode)}
            className={`rounded-lg py-2 text-sm font-semibold min-h-0 ${mode === item.key ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {mode === 'password' ? (
        <form onSubmit={handlePasswordLogin} className="flex flex-col gap-4">
          <Field label="ইমেইল বা ফোন / Email or Phone" required>
            <input
              className="input"
              placeholder="admin@jolotorongo.com / 01XXXXXXXXX"
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
            />
          </Field>

          <Field label="পাসওয়ার্ড / Password" required>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className="input pr-10"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 min-h-0 p-0"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          <button type="submit" disabled={loading} className="btn btn-primary btn-full mt-2">
            {loading ? <Spinner size="sm" /> : 'লগইন করুন'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleOtpLogin} className="flex flex-col gap-4">
          <Field label="ইমেইল বা ফোন / Email or Phone" required>
            <input
              className="input"
              placeholder="your@email.com / 01XXXXXXXXX"
              value={form.identifier}
              onChange={(e) => {
                setForm({ ...form, identifier: e.target.value });
                setOtpSent(false);
                setDemoOtp('');
              }}
            />
          </Field>
          {otpSent && (
            <Field label="OTP" required>
              <input className="input" placeholder="123456" value={form.otp} onChange={(e) => setForm({ ...form, otp: e.target.value })} />
            </Field>
          )}
          {demoOtp && <InfoCard type="info" message={`ডেমো OTP: ${demoOtp}`} />}
          <button type="submit" disabled={loading} className="btn btn-primary btn-full mt-2">
            {loading ? <Spinner size="sm" /> : otpSent ? 'OTP দিয়ে লগইন' : 'OTP পাঠান'}
          </button>
        </form>
      )}

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs text-slate-400">or</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <button type="button" onClick={googleDemoLogin} disabled={loading} className="btn btn-outline btn-full">
        Google দিয়ে চালু করুন
      </button>

      <div className="mt-6 text-center">
        <p className="text-sm text-slate-500">
          নতুন ব্যবহারকারী?{' '}
          <Link href="/register" className="text-sky-600 font-semibold">
            নিবন্ধন করুন
          </Link>
        </p>
      </div>

      <div className="mt-4 bg-slate-50 rounded-xl p-3 border border-slate-100">
        <p className="text-xs text-slate-500 font-medium mb-1.5">ডেমো সুপার অ্যাডমিন:</p>
        <p className="text-xs text-slate-600">Email: admin@jolotorongo.com</p>
        <p className="text-xs text-slate-600">Password: Admin@1234</p>
        <button
          type="button"
          onClick={() => {
            setMode('password');
            setForm({ identifier: 'admin@jolotorongo.com', password: 'Admin@1234', otp: '' });
          }}
          className="mt-2 text-xs font-semibold text-sky-700"
        >
          Fill admin demo
        </button>
      </div>
    </div>
  );
}
