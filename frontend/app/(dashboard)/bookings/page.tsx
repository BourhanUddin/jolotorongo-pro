'use client';
import { useQuery } from '@tanstack/react-query';
import { bookingApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import Link from 'next/link';
import { useState } from 'react';
import { PageLoader, EmptyState, StatusBadge, SectionHeader } from '@/components/ui';
import { formatDate, formatMoney } from '@/lib/labels';
import type { Booking, Room, User } from '@/types';
import { Plus } from 'lucide-react';

const STATUSES = ['', 'on_hold', 'confirmed', 'completed', 'cancelled', 'expired'];
const STATUS_LABELS: Record<string, string> = { '': 'সব', on_hold: 'হোল্ড', confirmed: 'কনফার্ম', completed: 'সম্পন্ন', cancelled: 'বাতিল', expired: 'মেয়াদোত্তীর্ণ' };

export default function BookingsPage() {
  const { user } = useAuthStore();
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', status, date],
    queryFn: () => bookingApi.list({ status: status || undefined, date: date || undefined, limit: 30 }),
  });

  const bookings: Booking[] = data?.data?.data?.bookings || [];
  const isAgent = user?.role === 'agent';
  const isVerifiedAgent = isAgent && user?.isApprovedByAdmin && user?.status === 'active' && !!user?.joinedHouseboatId;

  if (isLoading) return <PageLoader />;

  return (
    <div className="page fade-in">
      <SectionHeader
        title={`📋 বুকিং (${data?.data?.data?.total || 0})`}
        action={
          isVerifiedAgent && (
            <Link href="/bookings/new" className="btn btn-primary text-sm">
              <Plus size={15} /> হোল্ড করুন
            </Link>
          )
        }
      />

      {/* Status filter pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-4">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all min-h-0 ${
              status === s ? 'bg-sky-500 text-white' : 'bg-white text-slate-500 border border-slate-200'
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Date filter */}
      <div className="mb-4">
        <input
          type="date"
          className="input text-sm"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          placeholder="তারিখ ফিল্টার"
        />
      </div>

      {bookings.length === 0 ? (
        <EmptyState icon="📋" title="কোনো বুকিং নেই" desc="এখানে বুকিং দেখাবে" />
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map((b) => {
            const room = typeof b.roomId === 'object' ? b.roomId as Room : null;
            const agent = typeof b.agentId === 'object' ? b.agentId as User : null;
            return (
              <Link key={b._id} href={`/bookings/${b._id}`} className="card hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-slate-800">{b.customerName}</p>
                    <p className="text-xs text-slate-500">{b.customerPhone}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-slate-500">🛏️ রুম {room?.roomNumber || '—'} · {b.guestCount} জন</p>
                    <p className="text-xs text-slate-500">📅 {formatDate(b.checkIn)} → {formatDate(b.checkOut)}</p>
                    {agent && <p className="text-xs text-slate-400 mt-0.5">এজেন্ট: {agent.name}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800">{formatMoney(b.totalPrice)}</p>
                    {b.dueAmount > 0 && <p className="text-xs text-red-500">বাকি {formatMoney(b.dueAmount)}</p>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
