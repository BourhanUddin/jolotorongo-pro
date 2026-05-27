'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseApi } from '@/lib/api';
import { useState } from 'react';
import { PageLoader, EmptyState, Modal, Field, Spinner, SectionHeader, StatCard } from '@/components/ui';
import { formatMoney, formatDate } from '@/lib/labels';
import toast from 'react-hot-toast';
import type { Expense } from '@/types';
import { Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui';

const CATS = ['fuel','food','repair','salary','utility','marketing','other'];
const CAT_LABELS: Record<string,string> = { fuel:'জ্বালানি', food:'খাবার', repair:'মেরামত', salary:'বেতন', utility:'ইউটিলিটি', marketing:'মার্কেটিং', other:'অন্যান্য' };
const CAT_ICONS: Record<string,string> = { fuel:'⛽', food:'🍽️', repair:'🔧', salary:'💼', utility:'💡', marketing:'📢', other:'📦' };

export default function ExpensesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState('');
  const [form, setForm] = useState({ title: '', amount: '', category: 'other', note: '', date: '' });
  const up = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const { data, isLoading } = useQuery({ queryKey: ['expenses', catFilter], queryFn: () => expenseApi.list({ category: catFilter || undefined }) });
  const { data: reportData } = useQuery({ queryKey: ['report'], queryFn: () => expenseApi.report() });

  const expenses: Expense[] = data?.data?.data?.expenses || [];
  const report = reportData?.data?.data;

  const createMutation = useMutation({
    mutationFn: () => expenseApi.create({ ...form, amount: Number(form.amount) }),
    onSuccess: () => { toast.success('ব্যয় যোগ হয়েছে'); qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['report'] }); setShowModal(false); setForm({ title:'', amount:'', category:'other', note:'', date:'' }); },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'ত্রুটি'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseApi.delete(id),
    onSuccess: () => { toast.success('মুছে ফেলা হয়েছে'); qc.invalidateQueries({ queryKey: ['expenses'] }); setDeleteId(null); },
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="page fade-in">
      {/* Finance summary */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <StatCard icon="💰" label="মোট আয়" value={formatMoney(report?.totalRevenue || 0)} color="green" />
        <StatCard icon="💸" label="মোট ব্যয়" value={formatMoney(report?.totalExpense || 0)} color="red" />
        <StatCard icon="📈" label="নিট লাভ" value={formatMoney(report?.netProfit || 0)} color={report?.netProfit >= 0 ? 'sky' : 'red'} />
      </div>

      {/* Expense by category */}
      {report?.expenseByCategory?.length > 0 && (
        <div className="card mb-5">
          <p className="font-semibold text-slate-700 mb-3">ক্যাটাগরি অনুযায়ী ব্যয়</p>
          <div className="flex flex-col gap-2">
            {report.expenseByCategory.map((c: { _id: string; total: number }) => (
              <div key={c._id} className="flex justify-between items-center">
                <span className="text-sm text-slate-600">{CAT_ICONS[c._id]} {CAT_LABELS[c._id] || c._id}</span>
                <span className="text-sm font-semibold">{formatMoney(c.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <SectionHeader title={`💸 ব্যয় তালিকা (${expenses.length})`} action={
        <button onClick={() => setShowModal(true)} className="btn btn-primary text-sm"><Plus size={15} /> যোগ করুন</button>
      } />

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-4">
        {['', ...CATS].map(c => (
          <button key={c} onClick={() => setCatFilter(c)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium min-h-0 transition-all ${catFilter === c ? 'bg-sky-500 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
            {c ? `${CAT_ICONS[c]} ${CAT_LABELS[c]}` : 'সব'}
          </button>
        ))}
      </div>

      {expenses.length === 0 ? (
        <EmptyState icon="💸" title="কোনো ব্যয় নেই" />
      ) : (
        <div className="flex flex-col gap-2">
          {expenses.map((e) => (
            <div key={e._id} className="card flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span>{CAT_ICONS[e.category]}</span>
                  <p className="font-semibold text-sm text-slate-800">{e.title}</p>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{formatDate(e.date)} · {CAT_LABELS[e.category]}</p>
                {e.note && <p className="text-xs text-slate-400">{e.note}</p>}
              </div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-red-500">{formatMoney(e.amount)}</p>
                <button onClick={() => setDeleteId(e._id)} className="p-1.5 text-slate-400 hover:text-red-500 min-h-0">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add expense modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="নতুন ব্যয় যোগ করুন">
        <div className="flex flex-col gap-3.5">
          <Field label="শিরোনাম" required>
            <input className="input" placeholder="জ্বালানি খরচ" value={form.title} onChange={e => up('title', e.target.value)} />
          </Field>
          <Field label="পরিমাণ (৳)" required>
            <input type="number" className="input" placeholder="500" value={form.amount} onChange={e => up('amount', e.target.value)} />
          </Field>
          <Field label="ক্যাটাগরি">
            <select className="input" value={form.category} onChange={e => up('category', e.target.value)}>
              {CATS.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {CAT_LABELS[c]}</option>)}
            </select>
          </Field>
          <Field label="তারিখ">
            <input type="date" className="input" value={form.date} onChange={e => up('date', e.target.value)} />
          </Field>
          <Field label="নোট">
            <input className="input" placeholder="বিস্তারিত..." value={form.note} onChange={e => up('note', e.target.value)} />
          </Field>
          <div className="flex gap-2 mt-1">
            <button onClick={() => setShowModal(false)} className="btn btn-outline flex-1">বাতিল</button>
            <button onClick={() => createMutation.mutate()} disabled={!form.title || !form.amount || createMutation.isPending} className="btn btn-primary flex-1">
              {createMutation.isPending ? <Spinner size="sm" /> : 'যোগ করুন'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} title="ব্যয় মুছবেন?" message="এই ব্যয়টি স্থায়ীভাবে মুছে যাবে।" danger />
    </div>
  );
}
