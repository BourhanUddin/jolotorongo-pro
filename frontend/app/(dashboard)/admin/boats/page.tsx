"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EllipsisVertical, MapPin, Plus, Search, UserRound } from "lucide-react";
import { adminApi } from "@/lib/api";
import type { Houseboat } from "@/types";
import { adminBoatImages } from "../_components/super-admin-data";

function ownerName(owner: Houseboat["ownerId"]) {
  return typeof owner === "object" && owner ? owner.name : "Owner pending";
}

export default function FleetInventoryPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { data } = useQuery({ queryKey: ["admin-houseboats"], queryFn: () => adminApi.houseboats() });

  const filtered = useMemo(() => {
    const boats: Houseboat[] = data?.data?.data?.houseboats || [];
    return boats.filter((boat) => {
      const status = !boat.isOperational ? "maintenance" : "active";
      const matchesFilter = filter === "all" || filter === status;
      const term = `${boat.name} ${boat.location} ${ownerName(boat.ownerId)}`.toLowerCase();
      return matchesFilter && term.includes(search.toLowerCase());
    });
  }, [data, filter, search]);

  return (
    <div className="min-h-screen bg-[#fbf5ff] px-4 pb-24 pt-4 text-[#191225]">
      <div className="mb-5 flex items-center gap-3">
        <h1 className="text-lg font-medium text-[#32157c]">Fleet Inventory</h1>
      </div>

      <label className="flex items-center gap-3 rounded-xl bg-white/80 px-4 py-4 text-slate-400 shadow-sm">
        <Search size={20} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by boat name or owner..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-300"
        />
      </label>

      <Link href="/admin/users/new" className="mt-4 flex items-center justify-center gap-3 rounded-lg bg-[#563795] py-4 text-sm font-semibold text-white shadow-md">
        <Plus size={20} /> Register New Boat
      </Link>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          ["all", "All Boats"],
          ["active", "Active"],
          ["maintenance", "Under Maintenance"],
          ["booked", "Booked"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`shrink-0 rounded-full px-5 py-2 text-xs font-semibold ${filter === key ? "bg-[#563795] text-white" : "bg-[#ede7ef] text-slate-800"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6">
        {filtered.map((boat, index) => {
          const status = !boat.isOperational
            ? { label: "HOLD", cls: "bg-amber-100 text-amber-800" }
            : { label: "OPERATIONAL", cls: "bg-emerald-100 text-emerald-800" };
          return (
            <article key={boat._id} className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="relative">
                <Image
                  src={boat.logoUrl || adminBoatImages[index % adminBoatImages.length]}
                  alt={boat.name}
                  width={416}
                  height={192}
                  className="h-48 w-full object-cover"
                />
                <span className={`absolute right-4 top-4 rounded-full px-4 py-1 text-xs font-bold ${status.cls}`}>{status.label}</span>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <h2 className="text-xl font-semibold">{boat.name}</h2>
                  <EllipsisVertical className="text-slate-500" size={22} />
                </div>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <p className="flex items-center gap-2"><UserRound size={16} /> {ownerName(boat.ownerId)}</p>
                  <p className="flex items-center gap-2"><MapPin size={16} /> {boat.location}</p>
                </div>
                <div className="my-5 h-px bg-slate-200" />
                <div className="grid grid-cols-2 text-sm">
                  <div>
                    <p className="text-xs tracking-widest text-slate-500">STATUS</p>
                    <p className="mt-1 text-[#32157c]">{status.label}</p>
                  </div>
                  <div>
                    <p className="text-xs tracking-widest text-slate-500">AGENTS</p>
                    <p className="mt-1 text-[#32157c]">{boat.approvedAgents?.length || 0}</p>
                  </div>
                </div>
                <button className="mt-6 w-full rounded-lg border-2 border-[#32157c] py-3 text-sm font-medium text-[#32157c]">
                  View Details
                </button>
              </div>
            </article>
          );
        })}
        {filtered.length === 0 && (
          <article className="rounded-xl bg-white p-5 text-sm text-slate-500 shadow-sm">
            No houseboats found.
          </article>
        )}
      </div>
      <Link href="/admin/users/new" className="fixed bottom-24 right-6 flex h-14 w-14 items-center justify-center rounded-xl bg-[#563795] text-white shadow-xl">
        <Plus size={30} />
      </Link>
    </div>
  );
}
