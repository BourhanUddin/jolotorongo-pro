'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useState } from 'react';
import { PageLoader, Field, InfoCard, Spinner, StatusBadge } from '@/components/ui';
import { formatMoney, formatDate, daysLeft } from '@/lib/labels';
import toast from 'react-hot-toast';
import type { SubscriptionPlan } from '@/types';
import { CheckCircle } from 'lucide-react';

export default function SubscriptionPage() {
  const { user, setUser } = useAuthStore();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'super_admin';

  const { data: plansData, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => subscriptionApi.getPlans(),
  });
  const { data: pendingData } = useQuery({
    queryKey: ['pending-subs'],
    queryFn: () => subscriptionApi.getPending(),
    enabled: isAdmin,
  });

  const plans: SubscriptionPlan[] = plansData?.data?.data?.plans || [];
  const pending = pendingData?.data?.data?.users || [];

  const [selected, setSelected] = useState<SubscriptionPlan | null>(null);
  const [payForm, setPayForm] = useState({ paymentMethod: 'bkash', paymentReference: '' });
  const [step, setStep] = useState<'plans' | 'pay'>('plans');

  const purchaseMutation = useMutation({
    mutationFn: () => subscriptionApi.purchase({ planId: selected!._id, ...payForm }),
    onSuccess: async (res) => {
      toast.success('পেমেন্ট তথ্য জমা হয়েছে! অনুমোদনের জন্য অপেক্ষা করুন।');
      const me = await import('@/lib/api').then(m => m.authApi.me());
      setUser(me.data.data.user);
      qc.invalidateQueries({ queryKey: ['plans'] });
      setStep('plans');
    },
    onError: (err: unknown) => {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'ত্রুটি হয়েছে');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => subscriptionApi.approve(id),
    onSuccess: () => { toast.success('সাবস্ক্রিপশন অনুমোদিত!'); qc.invalidateQueries({ queryKey: ['pending-subs'] }); },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'ত্রুটি'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => subscriptionApi.reject(id, { reason: 'পেমেন্ট যাচাই ব্যর্থ' }),
    onSuccess: () => { toast.success('প্রত্যাখ্যান করা হয়েছে।'); qc.invalidateQueries({ queryKey: ['pending-subs'] }); },
  });

  if (isLoading) return <PageLoader />;

  const sub = user?.subscription;
  const active = sub?.isActive && sub?.paymentStatus === 'paid' && sub?.endDate && new Date(sub.endDate) > new Date();

  return (
    <div className="page fade-in">
      <h1 className="font-bold text-slate-800 text-lg mb-4">💳 সাবস্ক্রিপশন</h1>

      {/* Current subscription status */}
      {user?.role === 'boat_owner' && sub && (
        <div className="card mb-5">
          <p className="text-xs text-slate-500 mb-2">বর্তমান প্ল্যান</p>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-bold text-slate-800">{sub.planName || 'কোনো প্ল্যান নেই'}</p>
              {sub.endDate && <p className="text-xs text-slate-500 mt-0.5">মেয়াদ: {formatDate(sub.endDate)} ({daysLeft(sub.endDate)} দিন)</p>}
            </div>
            <StatusBadge status={active ? 'active' : sub.paymentStatus || 'unpaid'} />
          </div>
          {sub.paymentStatus === 'pending_approval' && (
            <div className="mt-3">
              <InfoCard type="info" message="আপনার পেমেন্ট যাচাই হচ্ছে। সুপার অ্যাডমিন শীঘ্রই অনুমোদন করবেন।" />
            </div>
          )}
        </div>
      )}

      {/* Admin: pending approvals */}
      {isAdmin && pending.length > 0 && (
        <div className="mb-6">
          <h2 className="section-title">⏳ অনুমোদন বাকি ({pending.length})</h2>
          <div className="flex flex-col gap-3">
            {pending.map((u: { _id: string; name: string; email: string; phone: string; subscription: { planName: string; paymentMethod: string; paymentReference: string } }) => (
              <div key={u._id} className="card">
                <div className="mb-3">
                  <p className="font-semibold text-slate-800">{u.name}</p>
                  <p className="text-xs text-slate-500">{u.email} · {u.phone}</p>
                  <p className="text-xs text-sky-600 mt-1">📦 {u.subscription?.planName} · 💳 {u.subscription?.paymentMethod?.toUpperCase()}</p>
                  <p className="text-xs text-slate-600">Ref: <span className="font-mono">{u.subscription?.paymentReference}</span></p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => rejectMutation.mutate(u._id)} disabled={rejectMutation.isPending} className="btn btn-outline flex-1 text-red-500 border-red-200 text-xs">
                    ❌ প্রত্যাখ্যান
                  </button>
                  <button onClick={() => approveMutation.mutate(u._id)} disabled={approveMutation.isPending} className="btn btn-success flex-1 text-xs">
                    {approveMutation.isPending ? <Spinner size="sm" /> : '✅ অনুমোদন'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plans */}
      {step === 'plans' && (
        <div>
          <h2 className="section-title">সাবস্ক্রিপশন প্ল্যান</h2>
          <div className="flex flex-col gap-3">
            {plans.map((plan) => (
              <div
                key={plan._id}
                onClick={() => user?.role === 'boat_owner' && !active && setSelected(plan)}
                className={`card border-2 transition-all ${
                  selected?._id === plan._id ? 'border-sky-500 bg-sky-50' : 'border-transparent'
                } ${user?.role === 'boat_owner' && !active ? 'cursor-pointer' : ''}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-slate-800">{plan.name}</p>
                    <p className="text-xs text-slate-500">{plan.durationDays} দিন</p>
                  </div>
                  <p className="font-bold text-xl text-sky-600">{formatMoney(plan.price)}</p>
                </div>
                <ul className="flex flex-col gap-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                      <CheckCircle size={13} className="text-emerald-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {selected && user?.role === 'boat_owner' && (
            <button onClick={() => setStep('pay')} className="btn btn-primary btn-full mt-4">
              &ldquo;{selected.name}&rdquo; প্ল্যান কিনুন →
            </button>
          )}
        </div>
      )}

      {/* Payment form */}
      {step === 'pay' && selected && (
        <div className="fade-in">
          <button onClick={() => setStep('plans')} className="text-sm text-sky-600 mb-4 flex items-center gap-1">← ফিরে যান</button>
          <div className="card mb-4 bg-sky-50 border border-sky-200">
            <p className="font-bold text-sky-800">{selected.name}</p>
            <p className="text-sky-600 text-xl font-bold">{formatMoney(selected.price)}</p>
            <p className="text-xs text-sky-700">{selected.durationDays} দিনের জন্য</p>
          </div>
          <div className="flex flex-col gap-4">
            <Field label="পেমেন্ট পদ্ধতি / Payment Method" required>
              <select className="input" value={payForm.paymentMethod} onChange={(e) => setPayForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                {['bkash', 'nagad', 'rocket', 'bank', 'cash'].map(m => (
                  <option key={m} value={m}>{m.toUpperCase()}</option>
                ))}
              </select>
            </Field>
            <Field label="ট্রানজেকশন ID / Reference" required>
              <input className="input" placeholder="TXN123456" value={payForm.paymentReference} onChange={(e) => setPayForm(f => ({ ...f, paymentReference: e.target.value }))} />
            </Field>
            <InfoCard type="info" message={`bKash/Nagad নম্বরে পাঠান: 01700-000000। তারপর ট্রানজেকশন ID দিন।`} />
            <button
              onClick={() => purchaseMutation.mutate()}
              disabled={!payForm.paymentReference || purchaseMutation.isPending}
              className="btn btn-primary btn-full"
            >
              {purchaseMutation.isPending ? <Spinner size="sm" /> : 'পেমেন্ট সাবমিট করুন'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
