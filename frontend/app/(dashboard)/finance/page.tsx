'use client';
import { useQuery } from '@tanstack/react-query';
import { expenseApi, bookingApi } from '@/lib/api';
import { useState } from 'react';
import { PageLoader, StatCard, SectionHeader } from '@/components/ui';
import { formatMoney, formatDate } from '@/lib/labels';
import type { Booking, Expense } from '@/types';

const CAT_LABELS: Record<string, string> = {
  fuel: '⛽ জ্বালানি', food: '🍽️ খাবার', repair: '🔧 মেরামত',
  salary: '💼 বেতন', utility: '💡 ইউটিলিটি', marketing: '📢 মার্কেটিং', other: '📦 অন্যান্য',
};

export default function FinancePage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const params = { from: from || undefined, to: to || undefined };

  const { data: reportData, isLoading: r1 } = useQuery({
    queryKey: ['finance-report', from, to],
    queryFn: () => expenseApi.report(params),
  });

  const { data: bookingData, isLoading: r2 } = useQuery({
    queryKey: ['bookings-finance', from, to],
    queryFn: () => bookingApi.list({ status: 'confirmed', limit: 10, ...params }),
  });

  const { data: expenseData, isLoading: r3 } = useQuery({
    queryKey: ['expenses-finance', from, to],
    queryFn: () => expenseApi.list({ ...params, limit: 10 }),
  });

  const report = reportData?.data?.data;
  const bookings: Booking[] = bookingData?.data?.data?.bookings || [];
  const expenses: Expense[] = expenseData?.data?.data?.expenses || [];
  const isLoading = r1 || r2 || r3;

  return (
    <div className="page fade-in">
      <h1 className="font-bold text-slate-800 text-lg mb-4">📊 ফাইন্যান্স রিপোর্ট</h1>

      {/* Date filter */}
      <div className="card mb-5">
        <p className="text-xs font-semibold text-slate-500 mb-3">তারিখ ফিল্টার</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">শুরু / From</label>
            <input type="date" className="input text-sm" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">শেষ / To</label>
            <input type="date" className="input text-sm" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        </div>
        {(from || to) && (
          <button
            onClick={() => { setFrom(''); setTo(''); }}
            className="text-xs text-sky-500 mt-2 min-h-0"
          >
            ✕ ফিল্টার সরান
          </button>
        )}
      </div>

      {isLoading ? <PageLoader /> : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <StatCard icon="💰" label="মোট আয়"   value={formatMoney(report?.totalRevenue || 0)}  color="green" />
            <StatCard icon="💸" label="মোট ব্যয়"  value={formatMoney(report?.totalExpense || 0)}  color="red" />
            <StatCard icon="📈" label="নিট লাভ"  value={formatMoney(report?.netProfit || 0)}
              color={(report?.netProfit || 0) >= 0 ? 'sky' : 'red'} />
          </div>

          {/* Profit bar */}
          {(report?.totalRevenue || 0) > 0 && (
            <div className="card mb-5">
              <p className="text-xs font-semibold text-slate-500 mb-2">আয় বনাম ব্যয়</p>
              <div className="flex gap-1 h-6 rounded-full overflow-hidden">
                {/* Revenue bar */}
                <div
                  className="bg-emerald-400 h-full transition-all"
                  style={{ width: `${Math.min(100, ((report?.totalRevenue || 0) / Math.max(report?.totalRevenue || 1, 1)) * 100)}%` }}
                />
              </div>
              <div className="flex gap-1 h-3 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-red-400 h-full transition-all"
                  style={{ width: `${Math.min(100, ((report?.totalExpense || 0) / Math.max(report?.totalRevenue || 1, 1)) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-400 rounded-full inline-block" />আয়</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded-full inline-block" />ব্যয়</span>
              </div>
            </div>
          )}

          {/* Expense by category */}
          {report?.expenseByCategory?.length > 0 && (
            <div className="card mb-5">
              <SectionHeader title="ব্যয় ক্যাটাগরি" />
              <div className="flex flex-col gap-2">
                {report.expenseByCategory.map((c: { _id: string; total: number }) => {
                  const pct = report.totalExpense > 0
                    ? Math.round((c.total / report.totalExpense) * 100)
                    : 0;
                  return (
                    <div key={c._id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">{CAT_LABELS[c._id] || c._id}</span>
                        <span className="font-semibold">{formatMoney(c.total)} <span className="text-xs text-slate-400">({pct}%)</span></span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className="bg-red-400 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent confirmed bookings */}
          {bookings.length > 0 && (
            <div className="mb-5">
              <SectionHeader title="✅ কনফার্মড বুকিং (সাম্প্রতিক)" />
              <div className="flex flex-col gap-2">
                {bookings.map(b => (
                  <div key={b._id} className="card flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-sm">{b.customerName}</p>
                      <p className="text-xs text-slate-500">{formatDate(b.checkIn)} → {formatDate(b.checkOut)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600 text-sm">{formatMoney(b.totalPrice)}</p>
                      {b.dueAmount > 0 && <p className="text-xs text-red-400">বাকি {formatMoney(b.dueAmount)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent expenses */}
          {expenses.length > 0 && (
            <div>
              <SectionHeader title="💸 সাম্প্রতিক ব্যয়" />
              <div className="flex flex-col gap-2">
                {expenses.map(e => (
                  <div key={e._id} className="card flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-sm">{e.title}</p>
                      <p className="text-xs text-slate-500">{formatDate(e.date)} · {CAT_LABELS[e.category] || e.category}</p>
                    </div>
                    <p className="font-bold text-red-500 text-sm">{formatMoney(e.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
