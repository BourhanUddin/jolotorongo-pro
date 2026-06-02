"use client";

import { useAuthStore } from "@/store/auth.store";
import { useQuery } from "@tanstack/react-query";
import { agentApi, bookingApi, expenseApi, roomApi } from "@/lib/api";
import { StatCard, PageLoader, InfoCard, SectionHeader } from "@/components/ui";
import { formatMoney, formatDate, statusBadge } from "@/lib/labels";
import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import type { Booking, JoinRequest, Room } from "@/types";
import SuperAdminDashboard from "../admin/_components/SuperAdminDashboard";
import { Bell, CalendarCheck, CircleCheck, CirclePlus, Headphones, Hotel, Plus, ReceiptText, Search, ShipWheel, Zap } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const role = user?.role;
  if (role === "super_admin") return <SuperAdminDashboard />;
  if (role === "manager") return <OwnerDashboard />;
  if (role === "boat_owner") return <OwnerDashboard />;
  return <AgentDashboard />;
}

function OwnerDashboard() {
  const { data: bookingData, isLoading } = useQuery({
    queryKey: ["bookings-dashboard"],
    queryFn: () => bookingApi.list({ limit: 8 }),
  });
  const { data: reportData } = useQuery({
    queryKey: ["report-dashboard"],
    queryFn: () => expenseApi.report(),
  });
  const { data: roomData } = useQuery({
    queryKey: ["rooms-dashboard"],
    queryFn: () => roomApi.list(),
  });
  const bookings: Booking[] = bookingData?.data?.data?.bookings || [];
  const rooms: Room[] = roomData?.data?.data?.rooms || [];
  const report = reportData?.data?.data;
  const activeTours = bookings.filter((b) => ["on_hold", "confirmed"].includes(b.status)).length;
  const upcoming = bookings.filter((b) => new Date(b.checkIn) >= new Date()).length;
  const roomHealth = rooms.slice(0, 4).map((room) => ({
    name: `Room ${room.roomNumber}`,
    status: room.status === "maintenance" || !room.isActive ? "MAINTENANCE" : "ACTIVE",
    efficiency: room.status === "maintenance" || !room.isActive ? 35 : 92,
    image: room.images?.[0] || "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=160&q=80",
  }));

  if (isLoading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-[#fbf5ff] px-4 pb-10 pt-3 text-[#151020]">
      <div className="mb-7 flex items-center justify-between text-[#32157c]">
        <div className="flex items-center gap-2">
          <ShipWheel size={18} />
          <span className="text-lg font-semibold">Fleet Management</span>
        </div>
        <div className="flex gap-5 text-black">
          <Search size={20} />
          <Bell size={19} />
        </div>
      </div>

      <h1 className="text-2xl font-bold">Ahoy, Captain</h1>
      <p className="mt-1 text-sm text-slate-700">Operational overview for your houseboat fleet.</p>

      <section className="mt-6 rounded-lg bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#32157c]">Total Revenue</p>
            <p className="mt-1 text-3xl font-semibold">{formatMoney(report?.totalRevenue || 0)}</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-4 py-2 text-[10px] font-bold text-emerald-700">+12% vs last<br />month</span>
        </div>
        <div className="mt-8 flex h-20 items-end gap-2 rounded bg-[#f6f0fb] p-1">
          {[50, 66, 34, 74, 50, 66, 84].map((h, i) => <span key={i} className="flex-1 rounded-t-sm bg-[#6b4caf]" style={{ height: `${h}%` }} />)}
        </div>
      </section>

      <section className="mt-4 rounded-lg bg-[#6b4caf] p-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <CircleCheck size={21} className="opacity-80" />
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Active Tours</p>
        </div>
        <p className="mt-2 text-xl font-light">{activeTours} Tours</p>
      </section>

      <section className="mt-4 rounded-lg border border-[#e2d9e7] bg-[#ebe4ed] p-4">
        <p className="text-xs uppercase tracking-widest">Bookings</p>
        <div className="mt-1 flex items-center gap-2">
          <CalendarCheck size={20} className="text-[#32157c]" />
          <p className="text-xl font-medium">{upcoming} Upcoming</p>
        </div>
      </section>

      <section className="mt-7">
        <h2 className="flex items-center gap-2 text-lg font-medium"><Zap size={18} /> Quick Actions</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <QuickAction href="/bookings/new" icon={<CirclePlus size={23} />} label="Create Tour" />
          <QuickAction href="/rooms/new" icon={<Hotel size={23} />} label="Add Room" />
          <QuickAction href="/finance" icon={<ReceiptText size={23} />} label="Reports" />
          <QuickAction href="/profile" icon={<Headphones size={23} />} label="Support" />
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Fleet Health</h2>
          <Link href="/rooms" className="text-xs font-bold text-[#32157c]">Manage All</Link>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="grid grid-cols-[1.4fr_1fr_1fr] text-[10px] tracking-widest text-slate-500">
            <span>Vessel Name</span><span>Status</span><span>Efficiency</span>
          </div>
          <div className="mt-4 grid gap-4">
            {roomHealth.length === 0 && (
              <p className="col-span-3 text-sm text-slate-500">No rooms yet. Add rooms to start bookings.</p>
            )}
            {roomHealth.map((item) => (
              <div key={item.name} className="grid grid-cols-[1.4fr_1fr_1fr] items-center gap-3">
                <div className="flex items-center gap-2">
                  <Image src={item.image} alt="" width={36} height={36} className="h-9 w-9 rounded object-cover" />
                  <p className="text-sm font-bold leading-tight">{item.name}</p>
                </div>
                <span className={`w-fit rounded px-2 py-1 text-[10px] font-bold ${item.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{item.status}</span>
                <div className="h-2 rounded-full bg-[#eee7f4]"><div className="h-2 rounded-full bg-[#563795]" style={{ width: `${item.efficiency}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Recent Activity</h2>
        <div className="mt-4 rounded-lg border border-[#eee7f4] bg-white/70 p-4 shadow-sm">
          {bookings.length === 0 && <p className="text-sm text-slate-500">No recent booking activity.</p>}
          {bookings.slice(0, 4).map((booking) => (
            <div key={booking._id} className="mb-4 flex gap-3 last:mb-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dfd0ff]"><CircleCheck size={15} /></span>
              <div>
                <p className="text-sm"><b>{booking.status.replace("_", " ")}:</b> {booking.customerName} on {formatDate(booking.checkIn)}</p>
                <p className="mt-1 text-[10px] uppercase text-slate-500">{formatMoney(booking.totalPrice)}</p>
              </div>
            </div>
          ))}
          <Link href="/bookings" className="mt-4 block border-t border-[#eee7f4] pt-4 text-center text-sm font-semibold text-[#32157c]">View Activity Log</Link>
        </div>
      </section>

      <section className="relative mt-8 rounded-lg bg-[#563795] p-5 text-white shadow-lg">
        <h2 className="text-lg font-bold">Smart Fleet Tools</h2>
        <p className="mt-1 max-w-[250px] text-sm leading-relaxed">Manage rooms, bookings, reports, and guest operations from one dashboard.</p>
        <Link href="/rooms" className="mt-4 inline-flex rounded-full bg-white px-5 py-2 text-sm font-bold text-[#32157c]">Manage Rooms</Link>
        <Link href="/bookings/new" className="absolute bottom-0 right-0 flex h-14 w-14 items-center justify-center rounded-tl-xl rounded-br-lg bg-[#4b2a91]"><Plus size={30} /></Link>
      </section>
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link href={href} className="flex h-28 flex-col items-center justify-center gap-3 rounded-lg bg-[#eee7f4] text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#563795] text-white">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}

function AgentDashboard() {
  const { user } = useAuthStore();
  const { data: bookingData, isLoading } = useQuery({
    queryKey: ["agent-bookings"],
    queryFn: () => bookingApi.list({ limit: 5 }),
  });
  const { data: myReqData } = useQuery({
    queryKey: ["my-join-requests"],
    queryFn: () => agentApi.myJoinRequests(),
  });

  const bookings: Booking[] = bookingData?.data?.data?.bookings || [];
  const joinRequests: JoinRequest[] = myReqData?.data?.data?.requests || [];
  const isVerified = user?.isApprovedByAdmin && user?.status === "active";
  const hasHouseboat = !!user?.joinedHouseboatId;
  const joinedName = typeof user?.joinedHouseboatId === "object" ? user.joinedHouseboatId?.name ?? null : null;

  if (isLoading) return <PageLoader />;

  return (
    <div className="page fade-in">
      <h1 className="mb-1 text-lg font-bold text-slate-800">স্বাগতম, {user?.name?.split(" ")[0]} 👋</h1>
      {joinedName && <p className="mb-4 text-xs text-slate-500">🛥️ {joinedName}-এ কর্মরত</p>}

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

      <div className="mb-5 grid grid-cols-2 gap-3">
        <StatCard icon="📋" label="মোট বুকিং" value={bookingData?.data?.data?.total || 0} color="sky" />
        <StatCard icon="⏰" label="হোল্ড বুকিং" value={bookings.filter((b) => b.status === "on_hold").length} color="amber" />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <Link href="/agents" className="card flex items-center gap-3 transition-shadow hover:shadow-md">
          <span className="text-2xl">🛥️</span>
          <span className="text-sm font-semibold text-slate-700">বোট খুঁজুন</span>
        </Link>
        {hasHouseboat && isVerified && (
          <Link href="/bookings/new" className="card flex items-center gap-3 border border-sky-200 bg-sky-50 transition-shadow hover:shadow-md">
            <span className="text-2xl">⏰</span>
            <span className="text-sm font-semibold text-sky-700">হোল্ড করুন</span>
          </Link>
        )}
        <Link href="/bookings" className="card flex items-center gap-3 transition-shadow hover:shadow-md">
          <span className="text-2xl">📋</span>
          <span className="text-sm font-semibold text-slate-700">আমার বুকিং</span>
        </Link>
      </div>

      {joinRequests.length > 0 && (
        <div className="mb-4">
          <SectionHeader title="যোগ দেওয়ার আবেদন" />
          <div className="flex flex-col gap-2">
            {joinRequests.slice(0, 3).map((r) => {
              const { cls, label } = statusBadge(r.status);
              const hb = typeof r.houseboatId === "object" ? r.houseboatId : null;
              return (
                <div key={r._id} className="card flex items-center justify-between">
                  <p className="text-sm font-medium">{hb?.name || "—"}</p>
                  <span className={`badge ${cls}`}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {bookings.length > 0 && (
        <div>
          <SectionHeader title="সাম্প্রতিক বুকিং" />
          <div className="flex flex-col gap-2">
            {bookings.map((b) => {
              const { cls, label } = statusBadge(b.status);
              return (
                <Link key={b._id} href={`/bookings/${b._id}`} className="card flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{b.customerName}</p>
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
