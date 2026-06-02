'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CreditCard, Landmark, Smartphone } from 'lucide-react';
import { subscriptionApi, authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Field, InfoCard, PageLoader, Spinner } from '@/components/ui';
import { formatMoney } from '@/lib/labels';
import type { PaymentMethod, SubscriptionPlan } from '@/types';

const methods: { value: PaymentMethod; label: string; icon: React.ReactNode; instructions: string[] }[] = [
  {
    value: 'bkash',
    label: 'bKash',
    icon: <Smartphone size={18} />,
    instructions: ['Send Money: 01700000000', 'Reference: Jolotorongo + your phone', 'Submit transaction ID and sender number.'],
  },
  {
    value: 'nagad',
    label: 'Nagad',
    icon: <Smartphone size={18} />,
    instructions: ['Send Money: 01800000000', 'Reference: Jolotorongo + your phone', 'Submit transaction ID and sender number.'],
  },
  {
    value: 'bank',
    label: 'Bank',
    icon: <Landmark size={18} />,
    instructions: ['Bank: Dutch-Bangla Bank', 'Account: Jolotorongo Ltd - 123456789', 'Submit deposit slip/reference and screenshot.'],
  },
  {
    value: 'card',
    label: 'Card',
    icon: <CreditCard size={18} />,
    instructions: ['Use only gateway transaction/reference ID.', 'Do not submit full card number, CVV, or PIN.', 'Attach gateway receipt screenshot if available.'],
  },
];

export default function SubscriptionPage() {
  const qc = useQueryClient();
  const { user, setUser } = useAuthStore();
  const [planId, setPlanId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bkash');
  const [paymentReference, setPaymentReference] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => subscriptionApi.getPlans(),
  });

  const plans: SubscriptionPlan[] = data?.data?.data?.plans || [];
  const selectedPlanId = planId || plans[0]?._id || '';
  const selected = plans.find((plan) => plan._id === selectedPlanId) || plans[0];
  const method = methods.find((item) => item.value === paymentMethod)!;
  const currentStatus = user?.subscription?.paymentStatus;

  const purchase = useMutation({
    mutationFn: async () => {
      if (!selected?._id) throw new Error('Plan missing');
      if (!paymentReference.trim()) throw new Error('Transaction/reference ID required');

      const form = new FormData();
      form.append('planId', selected._id);
      form.append('paymentMethod', paymentMethod);
      form.append('paymentReference', paymentReference.trim());
      form.append('senderNumber', senderNumber.trim());
      form.append('paymentNote', paymentNote.trim());
      if (screenshot) form.append('screenshot', screenshot);
      return subscriptionApi.purchase(form);
    },
    onSuccess: async () => {
      toast.success('পেমেন্ট প্রুফ জমা হয়েছে');
      const me = await authApi.me();
      setUser(me.data.data.user);
      qc.invalidateQueries({ queryKey: ['subscription-plans'] });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (err as { message?: string })?.message ||
        'পেমেন্ট প্রুফ জমা হয়নি';
      toast.error(message);
    },
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="page fade-in">
      <h1 className="mb-1 text-xl font-bold text-slate-800">সাবস্ক্রিপশন</h1>
      <p className="mb-4 text-sm text-slate-500">প্ল্যান বাছুন, পেমেন্ট করুন, প্রুফ জমা দিন।</p>

      {currentStatus === 'pending_approval' && (
        <div className="mb-4">
          <InfoCard type="info" message="আপনার পেমেন্ট সুপার অ্যাডমিন যাচাই করছেন।" />
        </div>
      )}
      {currentStatus === 'failed' && (
        <div className="mb-4">
          <InfoCard type="warning" message={user?.subscription?.rejectionReason || 'পেমেন্ট প্রত্যাখ্যান হয়েছে। আবার জমা দিন।'} />
        </div>
      )}

      <div className="mb-5 grid gap-3">
        {plans.map((plan) => (
          <button
            key={plan._id}
            type="button"
            onClick={() => setPlanId(plan._id)}
            className={`card text-left ${selectedPlanId === plan._id ? 'border-2 border-sky-500 bg-sky-50' : 'border border-slate-100'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-slate-800">{plan.name}</p>
                <p className="text-xs text-slate-500">{plan.durationDays} দিন · {plan.maxRooms} rooms · {plan.maxAgents} agents</p>
              </div>
              <p className="font-bold text-sky-700">{formatMoney(plan.price)}</p>
            </div>
            {plan.features?.length > 0 && <p className="mt-2 text-xs text-slate-500">{plan.features.join(' · ')}</p>}
          </button>
        ))}
        {plans.length === 0 && <InfoCard type="warning" message="কোনো প্ল্যান নেই। সুপার অ্যাডমিনকে প্ল্যান তৈরি করতে বলুন।" />}
      </div>

      <div className="card">
        <Field label="পেমেন্ট পদ্ধতি" required>
          <div className="grid grid-cols-2 gap-2">
            {methods.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setPaymentMethod(item.value)}
                className={`flex min-h-0 items-center justify-center gap-2 rounded-xl border py-2 text-sm font-semibold ${
                  paymentMethod === item.value ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-600'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="my-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          <p className="mb-2 font-bold text-slate-800">{method.label} instructions</p>
          {method.instructions.map((line) => (
            <p key={line}>- {line}</p>
          ))}
        </div>

        <div className="grid gap-3">
          <Field label="Transaction / Reference ID" required>
            <input className="input" value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="TXN123456" />
          </Field>
          <Field label="Sender number / Account number">
            <input className="input" value={senderNumber} onChange={(event) => setSenderNumber(event.target.value)} placeholder="01XXXXXXXXX" />
          </Field>
          <Field label="Screenshot">
            <input
              type="file"
              accept="image/*"
              className="input"
              onChange={(event) => setScreenshot(event.target.files?.[0] || null)}
            />
          </Field>
          <Field label="Note">
            <textarea className="input" rows={3} value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder="Bank branch, sender name, or extra info" />
          </Field>
        </div>

        <button
          type="button"
          disabled={!selected || !paymentReference || purchase.isPending}
          onClick={() => purchase.mutate()}
          className="btn btn-primary btn-full mt-4"
        >
          {purchase.isPending ? <Spinner size="sm" /> : 'সুপার অ্যাডমিনে পাঠান'}
        </button>
      </div>
    </div>
  );
}
