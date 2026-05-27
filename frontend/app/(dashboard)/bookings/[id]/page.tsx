'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useParams, useRouter } from 'next/navigation';
import {
  PageLoader, StatusBadge, ConfirmDialog,
  Spinner, InfoCard, Field,
} from '@/components/ui';
import { formatDate, formatMoney } from '@/lib/labels';
import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';
import type { Room, User, Houseboat } from '@/types';
import { MessageCircle, CheckCircle, XCircle, Flag, ArrowLeft } from 'lucide-react';

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'complete' | null>(null);
  const [payMethod, setPayMethod] = useState('bkash');
  const [advancePaid, setAdvancePaid] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [now, setNow] = useState(0);

  useEffect(() => {
    const refresh = () => setNow(Date.now());
    window.setTimeout(refresh, 0);
    const timer = window.setInterval(refresh, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingApi.get(id),
    refetchInterval: 30000,
  });

  const booking = data?.data?.data?.booking;
  const whatsappLink = data?.data?.data?.whatsappLink;

  const confirmMutation = useMutation({
    mutationFn: () => bookingApi.confirm(id, {
      paymentMethod: payMethod,
      advancePaid: advancePaid ? Number(advancePaid) : undefined,
    }),
    onSuccess: () => {
      toast.success('বুকিং কনফার্ম হয়েছে! ✅');
      qc.invalidateQueries({ queryKey: ['booking', id] });
      qc.invalidateQueries({ queryKey: ['bookings-dashboard'] });
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'ত্রুটি'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => bookingApi.cancel(id, { reason: cancelReason || 'বাতিল' }),
    onSuccess: () => {
      toast.success('বাতিল করা হয়েছে');
      qc.invalidateQueries({ queryKey: ['booking', id] });
      setConfirmAction(null);
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'ত্রুটি'),
  });

  const completeMutation = useMutation({
    mutationFn: () => bookingApi.complete(id),
    onSuccess: () => {
      toast.success('সম্পন্ন হিসেবে চিহ্নিত! 🎉');
      qc.invalidateQueries({ queryKey: ['booking', id] });
      setConfirmAction(null);
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'ত্রুটি'),
  });

  if (isLoading) return <PageLoader />;
  if (!booking) {
    return (
      <div className="page text-center mt-20 text-slate-500">
        <p className="text-3xl mb-2">😕</p>
        <p>বুকিং পাওয়া যায়নি</p>
      </div>
    );
  }

  const room      = typeof booking.roomId    === 'object' ? booking.roomId    as Room      : null;
  const agent     = typeof booking.agentId   === 'object' ? booking.agentId   as User      : null;
  const houseboat = typeof booking.houseboatId === 'object' ? booking.houseboatId as Houseboat : null;
  const approvedBy = typeof booking.approvedById === 'object' ? booking.approvedById as User : null;

  const isOwner    = user?.role === 'boat_owner';
  const isAgent    = user?.role === 'agent';
  const canConfirm = isOwner && booking.status === 'on_hold';
  const canCancel  = ['on_hold', 'confirmed'].includes(booking.status) && (isOwner || isAgent);
  const canComplete = isOwner && booking.status === 'confirmed';

  const expiryMins = booking.expiresAt && now
    ? Math.max(0, Math.ceil((new Date(booking.expiresAt).getTime() - now) / 60000))
    : null;

  return (
    <div className="page fade-in">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-sky-600 mb-4 min-h-0"
      >
        <ArrowLeft size={16} /> ফিরে যান
      </button>

      {/* Header */}
      <div className="card mb-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-bold text-slate-800 text-lg">{booking.customerName}</p>
            <p className="text-sm text-slate-500">{booking.customerPhone}</p>
            {booking.customerAddress && (
              <p className="text-xs text-slate-400">{booking.customerAddress}</p>
            )}
          </div>
          <StatusBadge status={booking.status} />
        </div>

        {/* Hold expiry warning */}
        {booking.status === 'on_hold' && expiryMins !== null && (
          <InfoCard
            type={expiryMins <= 10 ? 'error' : 'warning'}
            message={`⏰ হোল্ড ${expiryMins} মিনিটে শেষ হবে। দ্রুত কনফার্ম করুন।`}
          />
        )}
      </div>

      {/* Booking details */}
      <div className="card mb-4">
        <p className="font-semibold text-slate-700 mb-3">📋 বুকিং বিবরণ</p>
        <div className="flex flex-col gap-2">
          {[
            { label: '🛏️ রুম',       value: `রুম ${room?.roomNumber || '—'} (${room?.roomType || ''})` },
            { label: '🛥️ হাউসবোট',  value: houseboat?.name || '—' },
            { label: '📅 চেক-ইন',    value: formatDate(booking.checkIn) },
            { label: '📅 চেক-আউট',   value: formatDate(booking.checkOut) },
            { label: '🌙 প্যাকেজ',    value: '২ দিন ১ রাত' },
            { label: '👥 অতিথি',     value: `${booking.guestCount} জন` },
            { label: '🤝 এজেন্ট',    value: agent?.name || '—' },
            { label: '✅ অনুমোদন',   value: approvedBy?.name || '—' },
            { label: '💳 পেমেন্ট',   value: booking.paymentMethod },
            { label: '📝 নোট',       value: booking.note || '—' },
          ].map(row => (
            <div key={row.label} className="flex justify-between text-sm">
              <span className="text-slate-500">{row.label}</span>
              <span className="font-medium text-slate-800 text-right max-w-[60%] capitalize">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment summary */}
      <div className="card mb-4 bg-sky-50 border border-sky-100">
        <p className="font-semibold text-sky-800 mb-3">💰 পেমেন্ট সারসংক্ষেপ</p>
        {[
          { label: 'বেস মূল্য',      value: formatMoney(booking.basePrice),    cls: '' },
          { label: 'অতিরিক্ত চার্জ', value: formatMoney(booking.extraCharge),  cls: '' },
          { label: 'ছাড়',           value: `-${formatMoney(booking.discount)}`,cls: 'text-emerald-600' },
          { label: 'মোট',           value: formatMoney(booking.totalPrice),    cls: 'font-bold text-sky-800' },
          { label: 'অগ্রিম পরিশোধ', value: formatMoney(booking.advancePaid),   cls: 'text-emerald-600' },
          { label: 'বাকি',          value: formatMoney(booking.dueAmount),     cls: booking.dueAmount > 0 ? 'text-red-500 font-semibold' : 'text-emerald-600' },
        ].map(row => (
          <div key={row.label} className={`flex justify-between text-sm mb-1.5 ${row.cls}`}>
            <span className={row.cls ? '' : 'text-slate-600'}>{row.label}</span>
            <span>{row.value}</span>
          </div>
        ))}
      </div>

      {/* WhatsApp send */}
      {whatsappLink && (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-success btn-full mb-4"
        >
          <MessageCircle size={16} /> হোয়াটসঅ্যাপে ইনভয়েস পাঠান
        </a>
      )}

      {/* Confirm panel */}
      {canConfirm && (
        <div className="card mb-4 border-2 border-emerald-200">
          <p className="font-semibold text-slate-700 mb-3">✅ বুকিং কনফার্ম করুন</p>
          <div className="flex flex-col gap-3">
            <Field label="পেমেন্ট পদ্ধতি">
              <select
                className="input"
                value={payMethod}
                onChange={e => setPayMethod(e.target.value)}
              >
                {['cash', 'bkash', 'nagad', 'rocket', 'bank'].map(m => (
                  <option key={m} value={m}>{m.toUpperCase()}</option>
                ))}
              </select>
            </Field>
            <Field label="অগ্রিম পেমেন্ট (৳) — ঐচ্ছিক">
              <input
                type="number"
                className="input"
                placeholder={String(booking.advancePaid)}
                value={advancePaid}
                onChange={e => setAdvancePaid(e.target.value)}
              />
            </Field>
            <button
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
              className="btn btn-success btn-full"
            >
              {confirmMutation.isPending
                ? <Spinner size="sm" />
                : <><CheckCircle size={16} /> কনফার্ম করুন</>}
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {canComplete && (
          <button
            onClick={() => setConfirmAction('complete')}
            className="btn btn-primary flex-1"
          >
            <Flag size={15} /> সম্পন্ন করুন
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => setConfirmAction('cancel')}
            className="btn btn-outline flex-1 text-red-500 border-red-200"
          >
            <XCircle size={15} /> বাতিল করুন
          </button>
        )}
      </div>

      {/* Cancel reason input */}
      {confirmAction === 'cancel' && (
        <div className="mt-3">
          <Field label="বাতিলের কারণ (ঐচ্ছিক)">
            <input
              className="input"
              placeholder="কারণ লিখুন..."
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
            />
          </Field>
        </div>
      )}

      <ConfirmDialog
        open={confirmAction === 'cancel'}
        onClose={() => { setConfirmAction(null); setCancelReason(''); }}
        onConfirm={() => cancelMutation.mutate()}
        loading={cancelMutation.isPending}
        title="বুকিং বাতিল করুন?"
        message="এই বুকিং বাতিল করলে রুমটি আবার উপলব্ধ হবে।"
        danger
      />
      <ConfirmDialog
        open={confirmAction === 'complete'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => completeMutation.mutate()}
        loading={completeMutation.isPending}
        title="সম্পন্ন হিসেবে চিহ্নিত করুন?"
        message="এই বুকিং সম্পন্ন হয়েছে নিশ্চিত করুন।"
      />
    </div>
  );
}
