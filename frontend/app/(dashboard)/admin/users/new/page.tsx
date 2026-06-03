"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, Building2, Info, Mail, Sailboat, Search, UserRound, UserRoundPlus, X } from "lucide-react";
import { adminApi } from "@/lib/api";
import type { Houseboat, Role } from "@/types";

const roles: { value: Role; title: string; sub: string }[] = [
  { value: "boat_owner", title: "Admin", sub: "Boat Owner" },
  { value: "manager", title: "Manager", sub: "Fleet Ops" },
  { value: "agent", title: "Agent", sub: "Bookings Only" },
];

export default function CreateUserPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("agent");
  const [boatQuery, setBoatQuery] = useState("");
  const [selectedBoatId, setSelectedBoatId] = useState<string>("");

  const { data } = useQuery({ queryKey: ["admin-houseboats-for-user"], queryFn: () => adminApi.houseboats() });

  const boatOptions = useMemo(() => {
    const boats: Houseboat[] = data?.data?.data?.houseboats || [];
    return boats.filter((boat) => `${boat.name} ${boat.location}`.toLowerCase().includes(boatQuery.toLowerCase()));
  }, [data, boatQuery]);
  const selectedBoat = boatOptions.find((boat) => boat._id === selectedBoatId) || boatOptions[0];

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.createUser({
        name,
        email,
        phone: phone || undefined,
        role,
        houseboatIds: ["agent", "manager"].includes(role) && selectedBoat ? [selectedBoat._id] : [],
      }),
    onSuccess: () => {
      toast.success("User created and activation notice queued.");
      qc.invalidateQueries({ queryKey: ["admin-agents"] });
      qc.invalidateQueries({ queryKey: ["admin-owners"] });
      setName("");
      setEmail("");
      setPhone("");
    },
    onError: (err: unknown) => {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not create user");
    },
  });

  return (
    <div className="min-h-screen bg-[#fbf5ff] px-4 pb-28 pt-6 text-[#191225]">
      <div className="mb-8 flex items-start gap-4">
        <Link href="/admin" className="mt-8 min-h-0 text-black"><ArrowLeft size={25} /></Link>
        <div>
          <h1 className="text-2xl font-semibold">Create New User</h1>
          <p className="mt-1 max-w-[300px] text-sm leading-relaxed text-slate-700">
            Grant platform access to a new team member or boat operator.
          </p>
        </div>
      </div>

      <form
        className="rounded-xl bg-white p-6 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name || !email) {
            toast.error("Name and email are required.");
            return;
          }
          mutation.mutate();
        }}
      >
        <Field icon={<UserRound size={18} />} label="Full Name">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ariful Islam" className="h-16 w-full rounded-lg bg-[#f4edf7] px-5 text-base outline-none placeholder:text-slate-300" />
        </Field>

        <Field icon={<Mail size={18} />} label="Email Address">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="ariful@haorsaas.com" className="h-16 w-full rounded-lg bg-[#f4edf7] px-5 text-base outline-none placeholder:text-slate-300" />
        </Field>

        <Field icon={<Building2 size={18} />} label="Account Role">
          <div className="grid gap-4">
            {roles.map((item) => (
              <button
                type="button"
                key={item.value}
                onClick={() => setRole(item.value)}
                className={`rounded-xl p-5 text-left transition ${role === item.value ? "border-2 border-[#6747aa] bg-[#e7dcff]" : "bg-[#f4edf7]"}`}
              >
                <span className="block text-2xl font-medium">{item.title}</span>
                <span className="mt-1 block text-sm text-slate-700">{item.sub}</span>
              </button>
            ))}
          </div>
        </Field>

        {["agent", "manager"].includes(role) && (
          <Field icon={<Sailboat size={18} />} label="Boat Assignment">
            <div className="rounded-lg bg-[#eee8f0] p-3">
              <label className="mb-3 flex h-14 items-center gap-3 rounded-lg bg-[#f4edf7] px-4 text-slate-500">
                <Search size={18} />
                <input value={boatQuery} onChange={(e) => setBoatQuery(e.target.value)} placeholder="Search registered houseboats..." className="w-full bg-transparent outline-none" />
              </label>

              {selectedBoat && (
                <div className="rounded-md border border-[#d1b3ff] bg-white p-4">
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#d8c9ff] text-[#32157c]"><Sailboat size={24} /></span>
                    <div className="flex-1">
                      <p className="text-xl font-semibold leading-tight">{selectedBoat.name}</p>
                      <p className="mt-1 text-sm text-slate-600">ID: {selectedBoat._id.slice(-6).toUpperCase()}</p>
                    </div>
                    <button type="button" onClick={() => setSelectedBoatId("")} className="min-h-0 text-[#32157c]"><X size={24} /></button>
                  </div>
                </div>
              )}

              <div className="mt-3 max-h-36 overflow-y-auto">
                {boatOptions.slice(0, 4).map((boat) => (
                  <button
                    type="button"
                    key={boat._id}
                    onClick={() => setSelectedBoatId(boat._id)}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white"
                  >
                    {boat.name}
                  </button>
                ))}
              </div>
              <button type="button" className="mt-2 w-full py-3 text-sm font-bold tracking-wide text-[#32157c]">+ Assign Another Boat</button>
            </div>
          </Field>
        )}

        <label className="mb-8 block">
          <span className="mb-2 block text-sm font-semibold">Phone Number</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01700000000" className="h-14 w-full rounded-lg bg-[#f4edf7] px-5 text-base outline-none placeholder:text-slate-300" />
        </label>

        <div className="mb-7 h-px bg-slate-200" />
        <Link href="/admin" className="mb-7 block text-center text-2xl text-slate-800">Cancel</Link>
        <button disabled={mutation.isPending} className="flex w-full items-center justify-center gap-3 rounded-full bg-[#563795] py-4 text-xl font-semibold text-white shadow-xl disabled:opacity-60">
          <UserRoundPlus size={24} /> {mutation.isPending ? "Creating..." : "Create User"}
        </button>
      </form>

      <div className="mt-8 flex gap-4 rounded-xl bg-[#eee7fb] p-5 text-sm leading-relaxed text-slate-700">
        <Info className="mt-1 shrink-0" size={22} />
        <p>An activation link will be sent to the user account email address. They will need to verify their account and set a password before they can log in.</p>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <label className="mb-7 block">
      <span className="mb-3 flex items-center gap-3 text-sm font-semibold tracking-wide">{icon} {label}</span>
      {children}
    </label>
  );
}
