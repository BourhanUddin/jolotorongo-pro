'use client';
import { statusBadge } from '@/lib/labels';
import { X, AlertTriangle } from 'lucide-react';

// ─── Spinner ─────────────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-4 h-4 border-2', md: 'w-7 h-7 border-3', lg: 'w-10 h-10 border-4' }[size];
  return <div className={`${s} border-sky-500 border-t-transparent rounded-full spin inline-block`} />;
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-slate-500 text-sm">লোড হচ্ছে...</p>
      </div>
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const { cls, label } = statusBadge(status);
  return <span className={`badge ${cls}`}>{label}</span>;
}

// ─── Empty State ──────────────────────────────────────────────
export function EmptyState({ icon, title, desc }: { icon?: string; title: string; desc?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center px-4">
      <div className="text-5xl mb-3">{icon || '📭'}</div>
      <p className="font-semibold text-slate-700">{title}</p>
      {desc && <p className="text-sm text-slate-500 mt-1">{desc}</p>}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────
export function Modal({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto shadow-xl fade-in">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center">
            <X size={18} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────
export function ConfirmDialog({
  open, onClose, onConfirm, title, message, loading = false, danger = false,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void;
  title: string; message: string; loading?: boolean; danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl fade-in">
        <div className="flex gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-100' : 'bg-yellow-100'}`}>
            <AlertTriangle size={20} className={danger ? 'text-red-500' : 'text-yellow-500'} />
          </div>
          <div>
            <p className="font-bold text-slate-800">{title}</p>
            <p className="text-sm text-slate-500 mt-0.5">{message}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn btn-outline flex-1">বাতিল</button>
          <button onClick={onConfirm} disabled={loading} className={`btn flex-1 ${danger ? 'btn-danger' : 'btn-primary'}`}>
            {loading ? <Spinner size="sm" /> : 'নিশ্চিত করুন'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Form Field ───────────────────────────────────────────────
export function Field({
  label, error, children, required,
}: { label: string; error?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Stats Card ───────────────────────────────────────────────
export function StatCard({
  label, value, icon, color = 'sky',
}: { label: string; value: string | number; icon: string; color?: string }) {
  const colors: Record<string, string> = {
    sky: 'from-sky-50 to-sky-100 text-sky-600',
    green: 'from-emerald-50 to-emerald-100 text-emerald-600',
    amber: 'from-amber-50 to-amber-100 text-amber-600',
    red: 'from-red-50 to-red-100 text-red-600',
    purple: 'from-purple-50 to-purple-100 text-purple-600',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color] || colors.sky} rounded-xl p-4`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-bold text-slate-800">{value}</div>
      <div className="text-xs font-medium mt-0.5 text-slate-600">{label}</div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────
export function SectionHeader({
  title, action,
}: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-bold text-slate-800 text-base">{title}</h2>
      {action}
    </div>
  );
}

// ─── Pull-to-reveal info card ─────────────────────────────────
export function InfoCard({ type, message }: { type: 'warning' | 'info' | 'error'; message: string }) {
  const styles = {
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info:    'bg-sky-50 border-sky-200 text-sky-800',
    error:   'bg-red-50 border-red-200 text-red-800',
  };
  const icons = { warning: '⚠️', info: 'ℹ️', error: '❌' };
  return (
    <div className={`border rounded-xl p-3.5 text-sm flex gap-2.5 items-start ${styles[type]}`}>
      <span className="mt-0.5">{icons[type]}</span>
      <span>{message}</span>
    </div>
  );
}

// ─── Simple Select ────────────────────────────────────────────
export function Select({
  value, onChange, options, placeholder,
}: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
