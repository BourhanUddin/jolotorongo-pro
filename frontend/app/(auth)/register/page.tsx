'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import { Field, Spinner, InfoCard } from '@/components/ui';
import type { User } from '@/types';

type Role = 'boat_owner' | 'agent';
type OtpMethod = 'email' | 'phone';

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'agent' as Role,
    otp: '',
  });
  const [otpMethod, setOtpMethod] = useState<OtpMethod>('email');
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const up = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const otpIdentifier = otpMethod === 'email' ? form.email : form.phone;

  const finishAuth = (res: { data: { token: string; data: { user: User }; redirectTo?: string } }, message: string) => {
    const { token, data, redirectTo } = res.data;
    setAuth(data.user, token);
    toast.success(message);
    router.replace(redirectTo || '/dashboard');
  };

  const validateBase = () => {
    if (!form.name || !form.password) {
      toast.error('নাম ও পাসওয়ার্ড দিন');
      return false;
    }
    if (!form.email && !form.phone) {
      toast.error('ইমেইল বা ফোন নম্বর দিন');
      return false;
    }
    if (!otpIdentifier) {
      toast.error(otpMethod === 'email' ? 'OTP এর জন্য ইমেইল দিন' : 'OTP এর জন্য ফোন নম্বর দিন');
      return false;
    }
    if (form.password.length < 6) {
      toast.error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে');
      return false;
    }
    return true;
  };

  const requestOtp = async () => {
    if (!validateBase()) return;
    setLoading(true);
    try {
      const res = await authApi.requestOtp({ identifier: otpIdentifier, purpose: 'register' });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateBase()) return;
    if (!otpSent) { await requestOtp(); return; }
    if (!form.otp) { toast.error('OTP দিন'); return; }

    setLoading(true);
    try {
      const verify = await authApi.verifyOtp({ identifier: otpIdentifier, otp: form.otp, purpose: 'register' });
      const res = await authApi.register({
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        password: form.password,
        role: form.role,
        otpIdentifier,
        otpToken: verify.data.data.otpToken,
      });
      finishAuth(res, 'নিবন্ধন সফল');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'নিবন্ধন ব্যর্থ';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const googleDemoRegister = async () => {
    setLoading(true);
    try {
      const res = await authApi.google({
        email: `demo.google.${form.role}@jolotorongo.com`,
        name: form.name || 'Google Demo User',
        phone: form.phone || undefined,
        role: form.role,
        googleId: `demo-google-${form.role}`,
      });
      finishAuth(res, 'Google অ্যাকাউন্ট প্রস্তুত');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Google নিবন্ধন ব্যর্থ';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const resetOtp = () => {
    setOtpSent(false);
    setDemoOtp('');
    up('otp', '');
  };

  return (
    <div className="fade-in">
      <h2 className="text-xl font-bold text-slate-800 mb-1">নিবন্ধন করুন</h2>
      <p className="text-sm text-slate-500 mb-4">ইমেইল বা ফোন OTP দিয়ে নতুন অ্যাকাউন্ট তৈরি করুন</p>

      <div className="grid grid-cols-2 gap-2 mb-5">
        {[
          { value: 'boat_owner', label: 'বোট ওনার', desc: 'বোট পরিচালনা করুন' },
          { value: 'agent', label: 'এজেন্ট', desc: 'বিনামূল্যে যোগ দিন' },
        ].map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => up('role', r.value)}
            className={`border-2 rounded-xl p-3 text-left transition-all min-h-0 ${
              form.role === r.value ? 'border-sky-500 bg-sky-50' : 'border-slate-200'
            }`}
          >
            <p className="font-semibold text-slate-800 text-sm">{r.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <Field label="নাম / Name" required>
          <input className="input" placeholder="আপনার পূর্ণ নাম" value={form.name} onChange={(e) => up('name', e.target.value)} />
        </Field>
        <Field label="ইমেইল / Email">
          <input
            type="email"
            className="input"
            placeholder="your@email.com"
            value={form.email}
            onChange={(e) => { up('email', e.target.value); if (otpMethod === 'email') resetOtp(); }}
          />
        </Field>
        <Field label="ফোন নম্বর / Phone">
          <input
            type="tel"
            className="input"
            placeholder="01XXXXXXXXX"
            value={form.phone}
            onChange={(e) => { up('phone', e.target.value); if (otpMethod === 'phone') resetOtp(); }}
          />
        </Field>
        <Field label="OTP ভেরিফিকেশন পদ্ধতি" required>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'email', label: 'Email OTP' },
              { value: 'phone', label: 'Phone OTP' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => { setOtpMethod(item.value as OtpMethod); resetOtp(); }}
                className={`rounded-xl border py-2 text-sm font-semibold min-h-0 ${otpMethod === item.value ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-600'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="পাসওয়ার্ড / Password" required>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              className="input pr-10"
              placeholder="কমপক্ষে ৬ অক্ষর"
              value={form.password}
              onChange={(e) => up('password', e.target.value)}
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 min-h-0 p-0">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>

        {otpSent && (
          <Field label="OTP" required>
            <input className="input" placeholder="123456" value={form.otp} onChange={(e) => up('otp', e.target.value)} />
          </Field>
        )}
        {demoOtp && <InfoCard type="info" message={`ডেমো OTP: ${demoOtp}`} />}

        {form.role === 'boat_owner' && (
          <InfoCard type="info" message="বোট ওনার হিসেবে নিবন্ধনের পর সরাসরি ড্যাশবোর্ড ব্যবহার করতে পারবেন।" />
        )}
        {form.role === 'agent' && (
          <InfoCard type="info" message="এজেন্ট হিসেবে নিবন্ধন বিনামূল্যে। সুপার অ্যাডমিন ভেরিফাই করলে বোটে যোগ দিতে পারবেন।" />
        )}

        <button type="submit" disabled={loading} className="btn btn-primary btn-full mt-1">
          {loading ? <Spinner size="sm" /> : otpSent ? 'OTP ভেরিফাই ও নিবন্ধন' : 'OTP পাঠান'}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs text-slate-400">or</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <button type="button" onClick={googleDemoRegister} disabled={loading} className="btn btn-outline btn-full">
        Google দিয়ে অ্যাকাউন্ট তৈরি
      </button>

      <div className="mt-5 text-center">
        <p className="text-sm text-slate-500">
          আগে থেকে অ্যাকাউন্ট আছে?{' '}
          <Link href="/login" className="text-sky-600 font-semibold">লগইন করুন</Link>
        </p>
      </div>
    </div>
  );
}
