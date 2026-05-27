'use client';
import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { bookingApi, roomApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Field, Spinner, InfoCard } from '@/components/ui';
import type { Room } from '@/types';

const addOneDay = (date: string) => {
  if (!date) return '';
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
};

const todayInput = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
};

function HoldCountdown({ expiresAt }: { expiresAt?: string | null }) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const refresh = () => setNow(Date.now());
    window.setTimeout(refresh, 0);
    const timer = window.setInterval(refresh, 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!expiresAt) return null;
  if (!now) return <span>--:--</span>;
  const remaining = Math.max(0, new Date(expiresAt).getTime() - now);
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  return <span>{mins}:{String(secs).padStart(2, '0')}</span>;
}

export default function NewBookingPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const houseboatId = user?.joinedHouseboatId
    ? (typeof user.joinedHouseboatId === 'object' ? user.joinedHouseboatId._id : user.joinedHouseboatId)
    : null;

  const [form, setForm] = useState({ roomId: '', customerName: '', customerPhone: '', customerAddress: '', checkIn: '', checkOut: '', guestCount: '1', advancePaid: '0', note: '' });
  const up = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const setCheckIn = (value: string) => {
    setForm(f => ({ ...f, checkIn: value, checkOut: addOneDay(value), roomId: '' }));
  };

  const { data: availData } = useQuery({
    queryKey: ['availability', houseboatId, form.checkIn, form.checkOut],
    queryFn: () => roomApi.availability(houseboatId!, form.checkIn, form.checkOut),
    enabled: !!houseboatId && !!form.checkIn && !!form.checkOut,
    refetchInterval: 30000,
  });

  const rooms: (Room & { availableOnDate: boolean })[] = availData?.data?.data?.rooms || [];
  const selectedRoom = rooms.find(r => r._id === form.roomId);
  const nights = 1;
  const guests = Number(form.guestCount) || 1;
  const extra = selectedRoom ? Math.max(0, guests - selectedRoom.maxCapacity) * selectedRoom.extraPersonPrice : 0;
  const total = selectedRoom ? (selectedRoom.basePrice * nights) + extra : 0;

  const holdMutation = useMutation({
    mutationFn: () => bookingApi.hold({ ...form, guestCount: Number(form.guestCount), nights, advancePaid: Number(form.advancePaid) }),
    onSuccess: () => { toast.success('হোল্ড সফল হয়েছে! ⏰'); router.push('/bookings'); },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'ত্রুটি হয়েছে'),
  });

  const canSubmit = form.roomId && form.customerName && form.customerPhone && form.checkIn && form.checkOut;

  return (
    <div className="page fade-in">
      <button onClick={() => router.back()} className="text-sm text-sky-600 mb-4 flex items-center gap-1 min-h-0">← ফিরে যান</button>
      <h1 className="font-bold text-slate-800 text-lg mb-4">🛏️ রুম হোল্ড করুন</h1>

      <div className="flex flex-col gap-4">
        {/* Date first */}
        <Field label="চেক-ইন তারিখ" required>
          <input type="date" className="input" value={form.checkIn} min={todayInput()} onChange={e => setCheckIn(e.target.value)} />
        </Field>
        {form.checkIn && (
          <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-800">
            ২ দিন ১ রাত: {form.checkIn} → {form.checkOut}
          </div>
        )}

        {/* Room selection */}
        {form.checkIn && (
          <Field label="রুম বেছে নিন" required>
            {rooms.length === 0 ? (
              <p className="text-sm text-slate-500 py-2">কোনো রুম পাওয়া যায়নি</p>
            ) : (
              <div className="flex flex-col gap-2">
                {rooms.map(r => {
                  const state = r.availabilityState || (r.availableOnDate ? 'available' : 'booked');
                  const selectable = state === 'available' && r.isActive;
                  const stateText = state === 'available' ? 'উপলব্ধ'
                    : state === 'on_hold' ? 'হোল্ড'
                    : state === 'maintenance' ? 'মেরামত'
                    : 'বুকড';
                  const stateClass = state === 'available'
                    ? 'border-emerald-300 bg-emerald-50'
                    : state === 'on_hold'
                      ? 'border-amber-300 bg-amber-50'
                      : state === 'maintenance'
                        ? 'border-slate-200 bg-slate-100 opacity-70'
                        : 'border-red-300 bg-red-50';
                  return (
                    <button
                      key={r._id}
                      type="button"
                      disabled={!selectable}
                      onClick={() => up('roomId', r._id)}
                      className={`border-2 rounded-lg p-3 text-left transition-all min-h-0 ${
                        form.roomId === r._id ? 'border-sky-500 bg-sky-50 shadow-sm' : stateClass
                      }`}
                    >
                      <div className="flex justify-between gap-3">
                        <p className="font-semibold text-sm">রুম {r.roomNumber} <span className="text-xs text-slate-500 font-normal capitalize">({r.roomType})</span></p>
                        <p className="font-bold text-sky-700 text-sm">৳{r.basePrice.toLocaleString()}</p>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                        <span className="text-slate-600">{r.maxCapacity} জন · {stateText}</span>
                        {state === 'on_hold' && (
                          <span className="font-semibold text-amber-700">
                            <HoldCountdown expiresAt={r.blockingBooking?.expiresAt} />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Field>
        )}

        {form.roomId && <>
          <Field label="অতিথি সংখ্যা">
            <input type="number" className="input" min="1" value={form.guestCount} onChange={e => up('guestCount', e.target.value)} />
          </Field>
          <Field label="গ্রাহকের নাম" required>
            <input className="input" placeholder="আব্দুল করিম" value={form.customerName} onChange={e => up('customerName', e.target.value)} />
          </Field>
          <Field label="গ্রাহকের ফোন" required>
            <input type="tel" className="input" placeholder="01XXXXXXXXX" value={form.customerPhone} onChange={e => up('customerPhone', e.target.value)} />
          </Field>
          <Field label="ঠিকানা">
            <input className="input" placeholder="গ্রাহকের ঠিকানা" value={form.customerAddress} onChange={e => up('customerAddress', e.target.value)} />
          </Field>
          <Field label="অগ্রিম পেমেন্ট (৳)">
            <input type="number" className="input" min="0" value={form.advancePaid} onChange={e => up('advancePaid', e.target.value)} />
          </Field>
          <Field label="নোট">
            <textarea className="input" rows={2} placeholder="বিশেষ কোনো নির্দেশনা..." value={form.note} onChange={e => up('note', e.target.value)} />
          </Field>

          {/* Price summary */}
          <div className="bg-sky-50 rounded-xl p-4 border border-sky-100">
            <p className="font-semibold text-sky-800 mb-2">💰 মূল্য সারসংক্ষেপ</p>
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between"><span className="text-slate-600">বেস মূল্য (২ দিন ১ রাত)</span><span>৳{(selectedRoom!.basePrice * nights).toLocaleString()}</span></div>
              {extra > 0 && <div className="flex justify-between text-amber-700"><span>অতিরিক্ত অতিথি</span><span>+৳{extra.toLocaleString()}</span></div>}
              <div className="flex justify-between font-bold text-sky-800 border-t border-sky-200 pt-1 mt-1"><span>মোট</span><span>৳{total.toLocaleString()}</span></div>
              <div className="flex justify-between text-emerald-600"><span>অগ্রিম</span><span>৳{Number(form.advancePaid).toLocaleString()}</span></div>
              <div className="flex justify-between text-red-500"><span>বাকি</span><span>৳{Math.max(0, total - Number(form.advancePaid)).toLocaleString()}</span></div>
            </div>
          </div>

          <InfoCard type="warning" message="হোল্ড ৬০ মিনিট পর স্বয়ংক্রিয়ভাবে বাতিল হবে। সময়মতো কনফার্ম করুন।" />
        </>}

        <button
          onClick={() => holdMutation.mutate()}
          disabled={!canSubmit || holdMutation.isPending}
          className="btn btn-primary btn-full"
        >
          {holdMutation.isPending ? <Spinner size="sm" /> : '⏰ হোল্ড করুন'}
        </button>
      </div>
    </div>
  );
}
