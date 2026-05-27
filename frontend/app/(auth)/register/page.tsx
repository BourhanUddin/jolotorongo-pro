'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import { Field, Spinner, InfoCard } from '@/components/ui';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'agent' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const up = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.password) {
      toast.error('সব তথ্য পূরণ করুন'); return;
    }
    if (form.password.length < 6) { toast.error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে'); return; }
    setLoading(true);
    try {
      const res = await authApi.register(form);
      const { token, data, redirectTo } = res.data;
      setAuth(data.user, token);
      toast.success('নিবন্ধন সফল! 🎉');
      router.replace(redirectTo || '/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'নিবন্ধন ব্যর্থ';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <h2 className="text-xl font-bold text-slate-800 mb-1">নিবন্ধন করুন</h2>
      <p className="text-sm text-slate-500 mb-4">নতুন অ্যাকাউন্ট তৈরি করুন</p>

      {/* Role selector */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        {[
          { value: 'boat_owner', label: '🛥️ বোট ওনার', desc: 'সাবস্ক্রিপশন প্রয়োজন' },
          { value: 'agent',      label: '🤝 এজেন্ট',   desc: 'বিনামূল্যে যোগ দিন' },
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
        <Field label="ইমেইল / Email" required>
          <input type="email" className="input" placeholder="your@email.com" value={form.email} onChange={(e) => up('email', e.target.value)} />
        </Field>
        <Field label="ফোন নম্বর / Phone" required>
          <input type="tel" className="input" placeholder="01XXXXXXXXX" value={form.phone} onChange={(e) => up('phone', e.target.value)} />
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

        {/* Role-specific notice */}
        {form.role === 'boat_owner' && (
          <InfoCard type="warning" message="বোট ওনার হিসেবে নিবন্ধনের পর সাবস্ক্রিপশন কিনতে হবে এবং সুপার অ্যাডমিনের অনুমোদনের জন্য অপেক্ষা করতে হবে।" />
        )}
        {form.role === 'agent' && (
          <InfoCard type="info" message="এজেন্ট হিসেবে নিবন্ধন বিনামূল্যে। সুপার অ্যাডমিন ভেরিফাই করলে বোটে যোগ দিতে পারবেন।" />
        )}

        <button type="submit" disabled={loading} className="btn btn-primary btn-full mt-1">
          {loading ? <Spinner size="sm" /> : 'নিবন্ধন করুন'}
        </button>
      </form>

      <div className="mt-5 text-center">
        <p className="text-sm text-slate-500">
          আগে থেকে অ্যাকাউন্ট আছে?{' '}
          <Link href="/login" className="text-sky-600 font-semibold">লগইন করুন</Link>
        </p>
      </div>
    </div>
  );
}
