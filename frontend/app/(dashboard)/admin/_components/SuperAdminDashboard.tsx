"use client";

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ClipboardList,
  Eye,
  Gauge,
  Pencil,
  Sailboat,
  Server,
  Users,
  WalletCards,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { formatMoney } from "@/lib/labels";
import type { Houseboat } from "@/types";
import { adminBoatImages } from "./super-admin-data";

type DashboardStats = {
  owners?: { total: number; active: number; pending: number };
  agents?: { total: number; verified: number; unverified: number };
  totalBookings?: number;
  totalOperationalHouseboats?: number;
  totalBoats?: number;
  totalUsers?: number;
  mtdRevenue?: number;
};

function ownerName(owner: Houseboat["ownerId"]) {
  return typeof owner === "object" && owner ? owner.name : "Owner pending";
}

function statusForBoat(boat: Houseboat) {
  if (!boat.isOperational) return { label: "HOLD", cls: "bg-amber-100 text-amber-700", bar: "bg-amber-400" };
  return { label: "AVAILABLE", cls: "bg-emerald-100 text-emerald-700", bar: "bg-violet-700" };
}

export default function SuperAdminDashboard() {
  const { data } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => adminApi.dashboard(),
    refetchInterval: 30000,
  });
  const { data: boatsData } = useQuery({
    queryKey: ["admin-houseboats-preview"],
    queryFn: () => adminApi.houseboats(),
  });

  const stats: DashboardStats = data?.data?.data || {};
  const boats: Houseboat[] = boatsData?.data?.data?.houseboats || [];
  const totalBoats = stats.totalBoats || boatsData?.data?.data?.count || stats.totalOperationalHouseboats || 0;
  const totalUsers = stats.totalUsers || (stats.owners?.total || 0) + (stats.agents?.total || 0);
  const mtdRevenue = stats.mtdRevenue || 0;

  return (
    <div className="min-h-screen bg-[#fbf5ff] px-4 pb-8 pt-4 text-[#191225]">
      <section className="relative overflow-hidden rounded-2xl bg-[#553795] text-white shadow-lg">
        <Image
          src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&q=80"
          alt="Haor fleet operations"
          fill
          sizes="448px"
          className="object-cover opacity-75"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#32155f] via-[#56328e]/75 to-transparent" />
        <div className="relative p-5">
          <p className="text-lg font-semibold leading-none">Welcome back,</p>
          <h1 className="mt-1 text-2xl font-bold leading-none">Super Admin</h1>
          <p className="mt-3 max-w-[240px] text-xs leading-relaxed text-white/85">
            Review tenants, users, subscriptions, and fleet readiness from one control panel.
          </p>
        </div>
      </section>

      <section className="mt-6 grid gap-4">
        <StatTile icon={<Sailboat size={20} />} label="TOTAL BOATS" value={totalBoats} sub={`${stats.totalOperationalHouseboats || 0} operational`} />
        <StatTile icon={<Users size={20} />} label="USERS" value={totalUsers.toLocaleString()} sub={`${stats.agents?.unverified || 0} agents pending`} />
        <StatTile
          dark
          icon={<WalletCards size={20} />}
          label="MTD REVENUE"
          value={formatMoney(mtdRevenue)}
          sub="From recorded ledger data"
        />
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold">Super Admin Access Hub</h2>
        <div className="mt-3 grid gap-3">
          <HubCard href="/admin/boats" icon={<Sailboat size={18} />} title="Manage Fleet" subtitle="Boat Owner View" text="Full control over vessel registrations, maintenance logs, and owner profiles." />
          <HubCard href="/admin" icon={<Gauge size={18} />} title="Operational Control" subtitle="Manager View" text="Oversee zone-wide logistics, staff scheduling, and platform-wide performance metrics." />
          <HubCard href="/bookings" icon={<ClipboardList size={18} />} title="Booking Desk" subtitle="Agent View" text="Direct access to reservation systems, customer support tickets, and guest communications." />
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Live Fleet Monitor</h2>
          <Link href="/admin/boats" className="flex items-center gap-1 text-xs font-semibold text-[#32157c]">
            View All <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid gap-4">
          {boats.length === 0 ? (
            <article className="rounded-xl bg-white p-4 text-sm text-slate-500 shadow-sm">
              No houseboats registered yet.
            </article>
          ) : boats.slice(0, 3).map((boat, index) => {
            const status = statusForBoat(boat);
            return (
              <article key={boat._id} className="overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="p-3">
                  <Image
                    src={boat.logoUrl || adminBoatImages[index % adminBoatImages.length]}
                    alt={boat.name}
                    width={416}
                    height={112}
                    className="h-28 w-full rounded-lg object-cover"
                  />
                  <div className="mt-3 flex items-start justify-between gap-3 px-1">
                    <div>
                      <h3 className="text-sm font-medium text-slate-700">{boat.name}</h3>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Owner: {ownerName(boat.ownerId)} <span className="mx-1">|</span> {boat.location}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${status.cls}`}>{status.label}</span>
                  </div>
                  <div className={`mt-3 h-1 rounded-full ${status.bar}`} />
                  <div className="mt-3 flex justify-center gap-8 text-[#432189]">
                    <Pencil size={14} />
                    <Eye size={14} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">Platform Alerts</h2>
        <div className="grid gap-2">
          {(stats.owners?.pending || 0) > 0 && <MiniAlert tone="violet" title="Owner Approval" text={`${stats.owners?.pending || 0} owner accounts need review.`} time="Live" />}
          {(stats.agents?.unverified || 0) > 0 && <MiniAlert tone="slate" title="Agent Verification" text={`${stats.agents?.unverified || 0} agents are waiting for verification.`} time="Live" />}
          {(!stats.owners?.pending && !stats.agents?.unverified) && (
            <article className="rounded-xl bg-white p-3 text-xs text-slate-500 shadow-sm">
              No active platform alerts.
            </article>
          )}
        </div>
        <Link href="/admin/alerts" className="mt-4 block rounded-xl border border-dashed border-[#cdb8eb] py-3 text-center text-xs font-medium text-[#32157c]">
          View Alert History
        </Link>
      </section>
    </div>
  );
}

function StatTile({ icon, label, value, sub, dark = false }: { icon: ReactNode; label: string; value: string | number; sub: string; dark?: boolean }) {
  return (
    <article className={`rounded-2xl p-5 shadow-sm ${dark ? "bg-[#563795] text-white" : "bg-white text-[#191225]"}`}>
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${dark ? "bg-white/15" : "bg-[#efe8fb] text-[#32157c]"}`}>{icon}</div>
      </div>
      <p className={`mt-4 text-[10px] font-medium tracking-wide ${dark ? "text-white/75" : "text-slate-500"}`}>{label}</p>
      <p className="mt-1 text-3xl font-light">{value}</p>
      <p className={`mt-1 text-[10px] ${dark ? "text-white/70" : "text-slate-400"}`}>{sub}</p>
    </article>
  );
}

function HubCard({ href, icon, title, subtitle, text }: { href: string; icon: ReactNode; title: string; subtitle: string; text: string }) {
  return (
    <Link href={href} className="flex gap-3 rounded-xl border border-[#d9cdec] bg-white p-4 shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4b2a91] text-white">{icon}</span>
      <span>
        <span className="block text-xs font-bold">{title}</span>
        <span className="block text-[10px] font-semibold text-[#4b2a91]">{subtitle}</span>
        <span className="mt-2 block text-[10px] leading-relaxed text-slate-500">{text}</span>
      </span>
    </Link>
  );
}

function MiniAlert({ tone, title, text, time }: { tone: "violet" | "green" | "red" | "slate"; title: string; text: string; time: string }) {
  const styles = {
    violet: "border-l-[#4b2a91] bg-[#f2eaff] text-[#4b2a91]",
    green: "border-l-emerald-500 bg-emerald-50 text-emerald-600",
    red: "border-l-red-500 bg-red-50 text-red-500",
    slate: "border-l-slate-500 bg-[#f0e6ff] text-slate-500",
  };
  return (
    <article className={`rounded-xl border-l-4 bg-white p-3 shadow-sm ${styles[tone]}`}>
      <div className="flex gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-current/10">
          <Server size={15} />
        </span>
        <span>
          <span className="block text-xs font-bold text-slate-800">{title}</span>
          <span className="block text-[10px] leading-relaxed text-slate-500">{text}</span>
          <span className="mt-1 block text-[9px] font-semibold uppercase tracking-wide text-slate-400">{time}</span>
        </span>
      </div>
    </article>
  );
}
