'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, agentApi } from '@/lib/api';
import { useState } from 'react';
import { PageLoader, EmptyState, StatusBadge, ConfirmDialog } from '@/components/ui';
import toast from 'react-hot-toast';
import type { User } from '@/types';

const TABS = [
  { key: 'owners', label: '🛥️ বোট ওনার' },
  { key: 'agents', label: '🤝 এজেন্ট' },
  { key: 'unverified', label: '❓ অযাচাই' },
];

export default function AdminPage() {
  const [tab, setTab] = useState('owners');
  const qc = useQueryClient();
  const [actionUser, setActionUser] = useState<{ id: string; action: 'suspend' | 'reactivate' | 'verify' } | null>(null);

  const { data: ownersData, isLoading: l1 } = useQuery({ queryKey: ['admin-owners', tab], queryFn: () => adminApi.owners(), enabled: tab === 'owners' });
  const { data: agentsData, isLoading: l2 } = useQuery({ queryKey: ['admin-agents', tab], queryFn: () => adminApi.agents(), enabled: tab === 'agents' });
  const { data: unverifiedData, isLoading: l3 } = useQuery({ queryKey: ['admin-unverified', tab], queryFn: () => agentApi.getUnverified(), enabled: tab === 'unverified' });

  const owners: User[] = ownersData?.data?.data?.owners || [];
  const agents: User[] = agentsData?.data?.data?.agents || [];
  const unverified: User[] = unverifiedData?.data?.data?.agents || [];

  const actionMutation = useMutation({
    mutationFn: () => {
      if (!actionUser) return Promise.reject();
      if (actionUser.action === 'suspend') return adminApi.suspend(actionUser.id);
      if (actionUser.action === 'reactivate') return adminApi.reactivate(actionUser.id);
      if (actionUser.action === 'verify') return agentApi.verify(actionUser.id);
      return Promise.reject();
    },
    onSuccess: () => {
      const msgs: Record<string, string> = { suspend: 'সাসপেন্ড হয়েছে', reactivate: 'পুনরায় সক্রিয়', verify: 'ভেরিফাই সম্পন্ন ✅' };
      toast.success(msgs[actionUser!.action]);
      qc.invalidateQueries({ queryKey: ['admin-owners'] });
      qc.invalidateQueries({ queryKey: ['admin-agents'] });
      qc.invalidateQueries({ queryKey: ['admin-unverified'] });
      setActionUser(null);
    },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'ত্রুটি'),
  });

  const isLoading = l1 || l2 || l3;

  const UserCard = ({ u, showVerify = false }: { u: User; showVerify?: boolean }) => {
    const sub = u.subscription;
    return (
      <div className="card">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-bold text-slate-800">{u.name}</p>
            <p className="text-xs text-slate-500">{u.email}</p>
            <p className="text-xs text-slate-500">{u.phone}</p>
            {sub?.planName && <p className="text-xs text-sky-600 mt-0.5">📦 {sub.planName}</p>}
          </div>
          <StatusBadge status={u.status} />
        </div>
        <div className="flex gap-2 mt-2">
          {showVerify && (
            <button onClick={() => setActionUser({ id: u._id, action: 'verify' })} className="btn btn-success flex-1 text-xs">✅ ভেরিফাই</button>
          )}
          {u.status !== 'suspended' ? (
            <button onClick={() => setActionUser({ id: u._id, action: 'suspend' })} className="btn btn-outline text-red-500 border-red-200 flex-1 text-xs">⛔ সাসপেন্ড</button>
          ) : (
            <button onClick={() => setActionUser({ id: u._id, action: 'reactivate' })} className="btn btn-success flex-1 text-xs">✅ পুনরায় সক্রিয়</button>
          )}
        </div>
      </div>
    );
  };

  const currentList = tab === 'owners' ? owners : tab === 'agents' ? agents : unverified;

  return (
    <div className="page fade-in">
      <h1 className="font-bold text-slate-800 text-lg mb-4">🛡️ অ্যাডমিন প্যানেল</h1>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-4">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium min-h-0 transition-all ${tab === t.key ? 'bg-sky-500 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? <PageLoader /> : currentList.length === 0 ? (
        <EmptyState icon="👥" title="কোনো ব্যবহারকারী নেই" />
      ) : (
        <div className="flex flex-col gap-3">
          {currentList.map(u => <UserCard key={u._id} u={u} showVerify={tab === 'unverified'} />)}
        </div>
      )}

      <ConfirmDialog
        open={!!actionUser}
        onClose={() => setActionUser(null)}
        onConfirm={() => actionMutation.mutate()}
        loading={actionMutation.isPending}
        title={actionUser?.action === 'suspend' ? 'সাসপেন্ড করবেন?' : actionUser?.action === 'verify' ? 'ভেরিফাই করবেন?' : 'পুনরায় সক্রিয় করবেন?'}
        message="এই অ্যাকশন নিশ্চিত করুন।"
        danger={actionUser?.action === 'suspend'}
      />
    </div>
  );
}
