'use client';
import { Fragment, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { bookingApi } from '@/lib/api';
import { PageLoader, SectionHeader } from '@/components/ui';
import { formatDate, formatMoney } from '@/lib/labels';
import type { Booking, Room, User } from '@/types';

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
};

const today = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
};

type ManifestCell = {
  checkIn: string;
  checkOut: string;
  state: 'available' | 'on_hold' | 'booked' | 'maintenance';
  booking: Booking | null;
};

type ManifestRow = {
  room: Room;
  allocations: ManifestCell[];
};

const stateClass: Record<string, string> = {
  available: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  on_hold: 'bg-amber-50 border-amber-200 text-amber-800',
  booked: 'bg-red-50 border-red-200 text-red-800',
  maintenance: 'bg-slate-100 border-slate-200 text-slate-600',
};

export default function ManifestPage() {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(addDays(today(), 6));

  const { data, isLoading } = useQuery({
    queryKey: ['manifest', from, to],
    queryFn: () => bookingApi.manifest({ from, to }),
    refetchInterval: 30000,
  });

  const rows: ManifestRow[] = useMemo(() => data?.data?.data?.rows || [], [data]);
  const rotations: { checkIn: string; checkOut: string }[] = data?.data?.data?.rotations || [];

  const counts = useMemo(() => {
    const flat = rows.flatMap((row) => row.allocations);
    return {
      available: flat.filter((cell) => cell.state === 'available').length,
      onHold: flat.filter((cell) => cell.state === 'on_hold').length,
      booked: flat.filter((cell) => cell.state === 'booked').length,
    };
  }, [rows]);

  return (
    <div className="page fade-in">
      <SectionHeader title="📅 2D/1N ম্যানিফেস্ট" />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">শুরু</label>
          <input type="date" className="input text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">শেষ</label>
          <input type="date" className="input text-sm" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-center">
          <p className="text-lg font-bold text-emerald-700">{counts.available}</p>
          <p className="text-[11px] text-emerald-700">উপলব্ধ</p>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-center">
          <p className="text-lg font-bold text-amber-700">{counts.onHold}</p>
          <p className="text-[11px] text-amber-700">হোল্ড</p>
        </div>
        <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-center">
          <p className="text-lg font-bold text-red-700">{counts.booked}</p>
          <p className="text-[11px] text-red-700">বুকড</p>
        </div>
      </div>

      {isLoading ? <PageLoader /> : (
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[760px]">
            <div className="grid gap-2" style={{ gridTemplateColumns: `92px repeat(${rotations.length}, minmax(128px, 1fr))` }}>
              <div className="text-xs font-semibold text-slate-500 px-2 py-2">রুম</div>
              {rotations.map((rotation) => (
                <div key={rotation.checkIn} className="text-xs font-semibold text-slate-600 px-2 py-2">
                  {formatDate(rotation.checkIn)}
                  <span className="block text-[10px] text-slate-400">→ {formatDate(rotation.checkOut)}</span>
                </div>
              ))}

              {rows.map((row) => (
                <Fragment key={row.room._id}>
                  <div className="rounded-lg bg-white border border-slate-100 px-2 py-3">
                    <p className="text-sm font-bold text-slate-800">রুম {row.room.roomNumber}</p>
                    <p className="text-[11px] text-slate-500 capitalize">{row.room.roomType}</p>
                  </div>
                  {row.allocations.map((cell) => {
                    const booking = cell.booking;
                    const agent = typeof booking?.agentId === 'object' ? booking.agentId as User : null;
                    return (
                      <div key={`${row.room._id}-${cell.checkIn}`} className={`rounded-lg border p-2 min-h-[92px] ${stateClass[cell.state]}`}>
                        {booking ? (
                          <>
                            <p className="text-xs font-bold truncate">{booking.customerName}</p>
                            <p className="text-[11px] opacity-80 truncate">এজেন্ট: {agent?.name || '—'}</p>
                            <p className="text-[11px] opacity-80">{formatMoney(booking.totalPrice)}</p>
                            <p className="text-[11px] font-semibold mt-1">{cell.state === 'on_hold' ? 'হোল্ড' : 'বুকড'}</p>
                          </>
                        ) : (
                          <p className="text-xs font-semibold">{cell.state === 'maintenance' ? 'মেরামত' : 'উপলব্ধ'}</p>
                        )}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
