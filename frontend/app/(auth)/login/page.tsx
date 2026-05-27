'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import { Field, Spinner } from '@/components/ui';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) { toast.error('ইমেইল ও পাসওয়ার্ড দিন'); return; }
    setLoading(true);
    try {
      const res = await authApi.login(form);
      const { token, data, redirectTo } = res.data;
      setAuth(data.user, token);
      toast.success('লগইন সফল! স্বাগতম 🎉');
      router.replace(redirectTo || '/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'লগইন ব্যর্থ হয়েছে';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <h2 className="text-xl font-bold text-slate-800 mb-1">লগইন করুন</h2>
      <p className="text-sm text-slate-500 mb-6">আপনার অ্যাকাউন্টে প্রবেশ করুন</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="ইমেইল / Email" required>
          <input
            type="email"
            className="input"
            placeholder="your@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
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

      <div className="mt-6 text-center">
        <p className="text-sm text-slate-500">
          নতুন ব্যবহারকারী?{' '}
          <Link href="/register" className="text-sky-600 font-semibold">
            নিবন্ধন করুন
          </Link>
        </p>
      </div>

      {/* Demo credentials */}
      <div className="mt-4 bg-slate-50 rounded-xl p-3 border border-slate-100">
        <p className="text-xs text-slate-500 font-medium mb-1.5">🔑 ডেমো অ্যাকাউন্ট:</p>
        <p className="text-xs text-slate-600">Super Admin: admin@jolotorongo.com</p>
        <p className="text-xs text-slate-600">Password: Admin@1234</p>
      </div>
    </div>
  );
}
