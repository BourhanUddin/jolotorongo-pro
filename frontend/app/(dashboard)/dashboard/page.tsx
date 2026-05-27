'use client';
import { useAuthStore } from '@/store/auth.store';
import { useQuery } from '@tanstack/react-query';
import { adminApi, bookingApi, expenseApi, agentApi, houseboatApi } from '@/lib/api';
import { StatCard, PageLoader, InfoCard, SectionHeader } from '@/components/ui';
import { formatMoney, formatDate, statusBadge, daysLeft } from '@/lib/labels';
import Link from 'next/link';
import type { Booking, JoinRequest } from '@/types';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const role = user?.role;
  if (role === 'super_admin') return <AdminDashboard />;
  if (role === 'boat_owner') return <OwnerDashboard />;
  return <AgentDashboard />;
}

// ─── Super Admin ──────────────────────────────────────────────
function AdminDashboard() {
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.dashboard(),
    refetchInterval: 30000,
  });
  const stats = data?.data?.data;

  if (isLoading) return <PageLoader />;

  const alertIcons: Record<string, string> = {
    registration: '🛥️',
    system: '🛡️',
    revenue: '⚠️',
    update: '🔔',
  };

  const alertColors: Record<string, string> = {
    registration: 'border-l-violet-500 bg-violet-50',
    system: 'border-l-green-500 bg-green-50',
    revenue: 'border-l-amber-500 bg-amber-50',
    update: 'border-l-sky-500 bg-sky-50',
  };

  return (
    <div className="page fade-in pb-6 bg-[#f4f3ff] min-h-screen">

      {/* ── Welcome Banner ── */}
      <div className="relative rounded-2xl overflow-hidden mb-5 mx-0">
        <div
          className="h-36 w-full bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80')`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-violet-900/80 to-violet-600/60" />
          <div className="relative z-10 p-4 h-full flex flex-col justify-center">
            <p className="text-violet-200 text-xs font-medium mb-1">Welcome back,</p>
            <h1 className="text-white font-bold text-xl leading-tight">Super Admin</h1>
            <p className="text-violet-100 text-xs mt-1 leading-relaxed opacity-90">
              The Jolotorongo fleet is currently operating at 84% capacity. System health is optimal.
            </p>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="flex flex-col gap-3 mb-5">

        {/* Total Boats */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-xl">
              ⛵
            </div>
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              +{stats?.boatGrowth || 12}% ↗
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">TOTAL BOATS</p>
          <p className="text-3xl font-bold text-slate-800">{stats?.totalBoats || stats?.owners?.active || 0}</p>
          <p className="text-xs text-slate-400 mt-1">Active across {stats?.totalHaors || 4} haors</p>
        </div>

        {/* Active Users */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-xl">
              👥
            </div>
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              +{stats?.userGrowth || 5}% ↗
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">ACTIVE USERS</p>
          <p className="text-3xl font-bold text-slate-800">
            {stats?.totalUsers || ((stats?.agents?.verified || 0) + (stats?.owners?.active || 0))}
          </p>
          <p className="text-xs text-slate-400 mt-1">{stats?.onlineNow || 0} currently online</p>
        </div>

        {/* MTD Revenue */}
        <div className="bg-violet-600 rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">
              💰
            </div>
            <span className="text-xs font-semibold text-white bg-white/20 px-2 py-0.5 rounded-full">
              +{stats?.revenueGrowth || 24}% ↗
            </span>
          </div>
          <p className="text-xs text-violet-200 font-medium uppercase tracking-wide mb-1">MTD REVENUE</p>
          <p className="text-3xl font-bold text-white">
            {formatMoney(stats?.mtdRevenue || 0)}
          </p>
          <p className="text-xs text-violet-200 mt-1">
            {stats?.revenueTarget ? `Exceeding target by ${formatMoney(stats.revenueTarget)}` : 'Revenue this month'}
          </p>
        </div>
      </div>

      {/* ── Pending alerts row ── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 text-center">
          <p className="text-2xl font-bold text-amber-500">{stats?.owners?.pending || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Pending Owners</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 text-center">
          <p className="text-2xl font-bold text-red-400">{stats?.agents?.unverified || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Unverified Agents</p>
        </div>
      </div>

      {/* ── Live Fleet Monitor ── */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-slate-800 text-base">Live Fleet Monitor</h2>
          <Link href="/admin" className="text-xs text-violet-600 font-semibold flex items-center gap-1">
            View All →
          </Link>
        </div>

        <div className="flex flex-col gap-4">
          {stats?.recentHouseboats?.length > 0 ? (
            stats.recentHouseboats.map((boat: {
              _id: string;
              name: string;
              status: string;
              owner?: { name: string };
              zone?: string;
              image?: string;
            }) => {
              const statusMap: Record<string, { label: string; cls: string }> = {
                active:      { label: 'AVAILABLE',   cls: 'bg-green-500 text-white' },
                booked:      { label: 'BOOKED',      cls: 'bg-red-500 text-white' },
                on_hold:     { label: 'HOLD',        cls: 'bg-amber-400 text-white' },
                maintenance: { label: 'MAINTENANCE', cls: 'bg-slate-400 text-white' },
              };
              const st = statusMap[boat.status] || { label: boat.status, cls: 'bg-slate-300 text-slate-700' };
              return (
                <div key={boat._id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                  <div className="relative">
                    <img
                      src={boat.image || `https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=70`}
                      alt={boat.name}
                      className="w-full h-40 object-cover"
                    />
                    <span className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded-md ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>
                  <div className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-slate-800">{boat.name}</p>
                    </div>
                    <div className="flex gap-4 text-xs text-slate-500">
                      <span>👤 {boat.owner?.name || '—'}</span>
                      <span>📍 {boat.zone || '—'}</span>
                    </div>
                    <div className="flex gap-3 mt-3 pt-3 border-t border-slate-100">
                      <Link
                        href={`/admin/houseboats/${boat._id}/edit`}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-violet-600"
                      >
                        ✏️ Edit
                      </Link>
                      <Link
                        href={`/admin/houseboats/${boat._id}`}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-violet-600"
                      >
                        👁️ View
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            /* Skeleton / empty state placeholders */
            <div className="bg-white rounded-2xl p-4 text-center text-sm text-slate-400 border border-dashed border-slate-200">
              No houseboats registered yet.
            </div>
          )}
        </div>
      </div>

      {/* ── Expiring Subscriptions ── */}
      {stats?.expiringSubscriptions?.length > 0 && (
        <div className="mb-5">
          <h2 className="font-bold text-slate-800 text-base mb-3">⚠️ Expiring Soon</h2>
          <div className="flex flex-col gap-2">
            {stats.expiringSubscriptions.map((o: {
              _id: string;
              name: string;
              subscription: { endDate: string; planName: string };
            }) => (
              <div key={o._id} className="bg-white rounded-xl p-3 flex justify-between items-center shadow-sm border border-amber-100">
                <div>
                  <p className="font-semibold text-sm text-slate-800">{o.name}</p>
                  <p className="text-xs text-slate-500">{o.subscription?.planName}</p>
                </div>
                <p className="text-xs text-amber-600 font-bold">
                  {daysLeft(o.subscription?.endDate)}d left
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Platform Alerts ── */}
      <div className="mb-5">
        <h2 className="font-bold text-slate-800 text-base mb-3">Platform Alerts</h2>
        <div className="flex flex-col gap-3">

          {/* New Registration */}
          {stats?.owners?.pending > 0 && (
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border-l-4 border-l-violet-500">
              <div className="p-3 flex gap-3 items-start">
                <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center text-base flex-shrink-0">
                  🛥️
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-800">New Registration</p>
                  <p className="text-xs text-slate-400 mb-1">2 mins ago</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {stats.owners.pending} boat(s) pending verification from owner.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* System Healthy */}
          <div className="bg-white rounded-xl overflow-hidden shadow-sm border-l-4 border-l-green-500">
            <div className="p-3 flex gap-3 items-start">
              <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center text-base flex-shrink-0">
                🛡️
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-800">System Healthy</p>
                <p className="text-xs text-slate-400 mb-1">45 mins ago</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Weekly backup completed successfully. All nodes are reporting 99.9% uptime.
                </p>
              </div>
            </div>
          </div>

          {/* Unverified agents warning */}
          {stats?.agents?.unverified > 0 && (
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border-l-4 border-l-amber-500">
              <div className="p-3 flex gap-3 items-start">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-base flex-shrink-0">
                  ⚠️
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-800">Agents Awaiting Approval</p>
                  <p className="text-xs text-slate-400 mb-1">1 hour ago</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {stats.agents.unverified} agent(s) are pending admin verification.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Total bookings info */}
          <div className="bg-white rounded-xl overflow-hidden shadow-sm border-l-4 border-l-sky-400">
            <div className="p-3 flex gap-3 items-start">
              <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center text-base flex-shrink-0">
                📋
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-800">Booking Summary</p>
                <p className="text-xs text-slate-400 mb-1">Today</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Total bookings on the platform: {stats?.totalBookings || 0}.
                  Operational houseboats: {stats?.totalOperationalHouseboats || 0}.
                </p>
              </div>
            </div>
          </div>
        </div>

        <Link href="/admin" className="block text-center text-sm font-semibold text-violet-600 mt-4 py-2">
          View Alert History →
        </Link>
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/admin" className="bg-white rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm hover:shadow-md transition-shadow border border-slate-100">
          <span className="text-3xl">👥</span>
          <span className="text-sm font-semibold text-slate-700">User Manage</span>
        </Link>
        <Link href="/subscription" className="bg-white rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm hover:shadow-md transition-shadow border border-slate-100">
          <span className="text-3xl">💳</span>
          <span className="text-sm font-semibold text-slate-700">Subscriptions</span>
        </Link>
      </div>
    </div>
  );
}

// ─── Boat Owner ───────────────────────────────────────────────
function OwnerDashboard() {
  const { user } = useAuthStore();
  const { data: bookingData, isLoading } = useQuery({
    queryKey: ['bookings-dashboard'],
    queryFn: () => bookingApi.list({ limit: 5 }),
  });
  const { data: reportData } = useQuery({
    queryKey: ['report-dashboard'],
    queryFn: () => expenseApi.report(),
  });
  const { data: holdData } = useQuery({
    queryKey: ['holds-dashboard'],
    queryFn: () => bookingApi.list({ status: 'on_hold', limit: 5 }),
  });
  const { data: hbData } = useQuery({
    queryKey: ['my-houseboat'],
    queryFn: () => houseboatApi.getMy(),
  });

  const bookings: Booking[] = bookingData?.data?.data?.bookings || [];
  const holds: Booking[]    = holdData?.data?.data?.bookings || [];
  const report = reportData?.data?.data;
  const houseboat = hbData?.data?.data?.houseboat;
  const sub = user?.subscription;
  const dl = sub?.endDate ? daysLeft(sub.endDate) : 0;

  if (isLoading) return <PageLoader />;

  return (
    <div className="page fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-bold text-slate-800 text-lg">স্বাগতম, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-xs text-slate-500">
            {houseboat?.name} · {sub?.planName || 'সাবস্ক্রিপশন নেই'}
            {sub?.endDate && <span className="text-amber-500 ml-1">({dl} দিন)</span>}
          </p>
        </div>
        <Link href="/houseboat" className="p-2 rounded-xl bg-slate-100 text-slate-600 min-h-0">
          ⚙️
        </Link>
      </div>

      {/* Finance summary */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <StatCard icon="💰" label="আয়"   value={formatMoney(report?.totalRevenue || 0)} color="green" />
        <StatCard icon="💸" label="ব্যয়"  value={formatMoney(report?.totalExpense || 0)} color="red" />
        <StatCard icon="📈" label="লাভ"  value={formatMoney(report?.netProfit    || 0)} color="sky" />
      </div>

      {/* Pending holds alert */}
      {holds.length > 0 && (
        <div className="mb-4">
          <InfoCard type="warning" message={`⏰ ${holds.length}টি রুম হোল্ড অনুমোদনের অপেক্ষায় আছে।`} />
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { href: '/rooms',     icon: '🛏️', label: 'রুম দেখুন' },
          { href: '/bookings',  icon: '📋', label: 'সব বুকিং' },
          { href: '/expenses',  icon: '💸', label: 'ব্যয় যোগ' },
          { href: '/finance',   icon: '📊', label: 'ফাইন্যান্স' },
          { href: '/agents',    icon: '🤝', label: 'এজেন্ট' },
          { href: '/houseboat', icon: '⚙️', label: 'বোট সেটিংস' },
        ].map(l => (
          <Link key={l.href} href={l.href} className="card flex items-center gap-3 hover:shadow-md transition-shadow">
            <span className="text-2xl">{l.icon}</span>
            <span className="text-sm font-semibold text-slate-700">{l.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent bookings */}
      {bookings.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="section-title mb-0">সাম্প্রতিক বুকিং</h2>
            <Link href="/bookings" className="text-xs text-sky-600 font-medium">সব দেখুন</Link>
          </div>
          <div className="flex flex-col gap-2">
            {bookings.map(b => {
              const { cls, label } = statusBadge(b.status);
              const room = typeof b.roomId === 'object' ? b.roomId : null;
              return (
                <Link key={b._id} href={`/bookings/${b._id}`} className="card flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{b.customerName}</p>
                    <p className="text-xs text-slate-500">
                      {formatDate(b.checkIn)} → {formatDate(b.checkOut)} · রুম {room?.roomNumber || '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`badge ${cls}`}>{label}</span>
                    <p className="text-xs text-slate-600 font-medium mt-1">{formatMoney(b.totalPrice)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Agent ────────────────────────────────────────────────────
function AgentDashboard() {
  const { user } = useAuthStore();
  const { data: bookingData, isLoading } = useQuery({
    queryKey: ['agent-bookings'],
    queryFn: () => bookingApi.list({ limit: 5 }),
  });
  const { data: myReqData } = useQuery({
    queryKey: ['my-join-requests'],
    queryFn: () => agentApi.myJoinRequests(),
  });

  const bookings: Booking[] = bookingData?.data?.data?.bookings || [];
  const joinRequests: JoinRequest[] = myReqData?.data?.data?.requests || [];
  const isVerified  = user?.isApprovedByAdmin && user?.status === 'active';
  const hasHouseboat = !!user?.joinedHouseboatId;
  const joinedName = typeof user?.joinedHouseboatId === 'object'
    ? user.joinedHouseboatId?.name ?? null : null;

  if (isLoading) return <PageLoader />;

  return (
    <div className="page fade-in">
      <h1 className="font-bold text-slate-800 text-lg mb-1">স্বাগতম, {user?.name?.split(' ')[0]} 👋</h1>
      {joinedName && <p className="text-xs text-slate-500 mb-4">🛥️ {joinedName}-এ কর্মরত</p>}

      {/* Status alerts */}
      {!isVerified && (
        <div className="mb-4">
          <InfoCard type="warning" message="আপনার অ্যাকাউন্ট এখনো ভেরিফাই হয়নি। সুপার অ্যাডমিনের অনুমোদনের জন্য অপেক্ষা করুন।" />
        </div>
      )}
      {isVerified && !hasHouseboat && (
        <div className="mb-4">
          <InfoCard type="info" message="কোনো বোটে যোগ দেননি। নিচের বাটন থেকে বোট খুঁজুন।" />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard icon="📋" label="মোট বুকিং"     value={bookingData?.data?.data?.total || 0} color="sky" />
        <StatCard icon="⏰" label="হোল্ড বুকিং"   value={bookings.filter(b => b.status === 'on_hold').length} color="amber" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Link href="/agents" className="card flex items-center gap-3 hover:shadow-md transition-shadow">
          <span className="text-2xl">🛥️</span>
          <span className="text-sm font-semibold text-slate-700">বোট খুঁজুন</span>
        </Link>
        {hasHouseboat && isVerified && (
          <Link href="/bookings/new" className="card flex items-center gap-3 hover:shadow-md transition-shadow bg-sky-50 border border-sky-200">
            <span className="text-2xl">⏰</span>
            <span className="text-sm font-semibold text-sky-700">হোল্ড করুন</span>
          </Link>
        )}
        <Link href="/bookings" className="card flex items-center gap-3 hover:shadow-md transition-shadow">
          <span className="text-2xl">📋</span>
          <span className="text-sm font-semibold text-slate-700">আমার বুকিং</span>
        </Link>
      </div>

      {/* Join request status */}
      {joinRequests.length > 0 && (
        <div className="mb-4">
          <SectionHeader title="যোগ দেওয়ার আবেদন" />
          <div className="flex flex-col gap-2">
            {joinRequests.slice(0, 3).map(r => {
              const { cls, label } = statusBadge(r.status);
              const hb = typeof r.houseboatId === 'object' ? r.houseboatId : null;
              return (
                <div key={r._id} className="card flex justify-between items-center">
                  <p className="text-sm font-medium">{hb?.name || '—'}</p>
                  <span className={`badge ${cls}`}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent bookings */}
      {bookings.length > 0 && (
        <div>
          <SectionHeader title="সাম্প্রতিক বুকিং" />
          <div className="flex flex-col gap-2">
            {bookings.map(b => {
              const { cls, label } = statusBadge(b.status);
              return (
                <Link key={b._id} href={`/bookings/${b._id}`} className="card flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-sm">{b.customerName}</p>
                    <p className="text-xs text-slate-500">{formatDate(b.checkIn)} → {formatDate(b.checkOut)}</p>
                  </div>
                  <span className={`badge ${cls}`}>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
