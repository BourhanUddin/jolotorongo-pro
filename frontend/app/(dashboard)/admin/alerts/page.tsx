"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronDown, Filter, Search, TriangleAlert, UserPlus, Wrench } from "lucide-react";
import { platformAlerts } from "../_components/super-admin-data";

const toneStyles = {
  critical: { border: "border-l-red-600", icon: "bg-red-100 text-red-600", iconNode: <TriangleAlert size={24} /> },
  gold: { border: "border-l-amber-700", icon: "bg-[#d6aa43] text-[#402f08]", iconNode: <UserPlus size={24} /> },
  soft: { border: "border-l-slate-500", icon: "bg-[#dfd0ff] text-slate-700", iconNode: <CheckCircle2 size={24} /> },
  purple: { border: "border-l-[#32157c]", icon: "bg-[#6747aa] text-white", iconNode: <Wrench size={24} /> },
};

export default function AlertHistoryPage() {
  return (
    <div className="min-h-screen bg-[#fbf5ff] px-4 pb-28 pt-4 text-[#191225]">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/dashboard" className="min-h-0 text-[#32157c]"><ArrowLeft size={24} /></Link>
        <h1 className="flex-1 text-xl font-bold text-[#32157c]">Alert History</h1>
        <Search size={22} />
      </div>

      <label className="flex items-center gap-3 rounded-xl bg-white/80 px-4 py-4 text-slate-500 shadow-sm">
        <Search size={20} />
        <input placeholder="Search logs by boat name, operator or" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500" />
      </label>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {["All Logs", "Critical", "Revenue", "Fleet"].map((label, index) => (
          <button key={label} className={`shrink-0 rounded-full px-5 py-2 text-xs font-bold ${index === 0 ? "bg-[#563795] text-white" : "bg-[#ede7ef] text-slate-800"}`}>
            {label}
          </button>
        ))}
      </div>

      <SectionLabel label="TODAY" />
      <div className="grid gap-5">
        {platformAlerts.slice(0, 2).map((alert) => <AlertCard key={alert.id} alert={alert} />)}
      </div>

      <SectionLabel label="YESTERDAY" />
      <div className="grid gap-5">
        {platformAlerts.slice(2).map((alert) => <AlertCard key={alert.id} alert={alert} />)}
      </div>

      <button className="mx-auto mt-12 flex flex-col items-center gap-3 text-sm font-bold text-[#32157c]">
        Load More History <ChevronDown size={20} />
      </button>
      <button className="fixed bottom-24 right-6 flex h-14 w-14 items-center justify-center rounded-xl bg-[#563795] text-white shadow-xl">
        <Filter size={24} />
      </button>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="my-8 flex items-center gap-4">
      <span className="text-xs font-semibold tracking-[0.28em] text-slate-500">{label}</span>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

function AlertCard({ alert }: { alert: (typeof platformAlerts)[number] }) {
  const style = toneStyles[alert.tone as keyof typeof toneStyles];
  return (
    <article className={`rounded-xl border-l-4 bg-white p-5 shadow-sm ${style.border}`}>
      <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-lg ${style.icon}`}>
        {style.iconNode}
      </div>
      <h2 className="text-xl font-bold">{alert.title}</h2>
      <p className="mt-2 text-xs font-semibold text-slate-500">{alert.time}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">{alert.body}</p>
      <div className="mt-5 flex gap-3">
        <button className="rounded-md bg-[#563795] px-6 py-2 text-xs font-bold text-white">{alert.action}</button>
        {alert.link && <button className="px-3 py-2 text-xs font-bold text-[#32157c]">{alert.link}</button>}
      </div>
    </article>
  );
}
