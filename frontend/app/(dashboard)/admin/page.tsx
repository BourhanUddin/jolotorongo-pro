"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Edit3, Mail, Phone, Plus, Search, ShieldCheck, Trash2, UserRound, Users } from "lucide-react";
import { adminApi } from "@/lib/api";
import { ConfirmDialog, EmptyState, Modal, PageLoader, StatusBadge } from "@/components/ui";
import type { Role, User, UserStatus } from "@/types";

type UserTab = "owners" | "managers" | "agents";
type PendingAction = { id: string; action: "suspend" | "reactivate" | "delete" } | null;

const TABS: { key: UserTab; label: string; title: string }[] = [
  { key: "owners", label: "Admins", title: "Boat Owners" },
  { key: "managers", label: "Managers", title: "Operations Managers" },
  { key: "agents", label: "Agents", title: "Booking Agents" },
];

const roleLabels: Record<Role, string> = {
  super_admin: "Super Admin",
  boat_owner: "Admin (Boat Owner)",
  manager: "Manager",
  agent: "Agent",
};

export default function AdminPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<UserTab>("owners");
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const { data: ownersData, isLoading: l1 } = useQuery({
    queryKey: ["admin-owners"],
    queryFn: () => adminApi.owners(),
  });
  const { data: managersData, isLoading: l2 } = useQuery({
    queryKey: ["admin-managers"],
    queryFn: () => adminApi.managers(),
  });
  const { data: agentsData, isLoading: l3 } = useQuery({
    queryKey: ["admin-agents"],
    queryFn: () => adminApi.agents(),
  });

  const owners: User[] = ownersData?.data?.data?.owners || [];
  const managers: User[] = managersData?.data?.data?.managers || [];
  const agents: User[] = agentsData?.data?.data?.agents || [];
  const list = tab === "owners" ? owners : tab === "managers" ? managers : agents;

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return list.filter((user) => `${user.name} ${user.email} ${user.phone}`.toLowerCase().includes(term));
  }, [list, search]);

  const invalidateUsers = () => {
    qc.invalidateQueries({ queryKey: ["admin-owners"] });
    qc.invalidateQueries({ queryKey: ["admin-managers"] });
    qc.invalidateQueries({ queryKey: ["admin-agents"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };

  const actionMutation = useMutation({
    mutationFn: () => {
      if (!pendingAction) return Promise.reject();
      if (pendingAction.action === "suspend") return adminApi.suspend(pendingAction.id);
      if (pendingAction.action === "reactivate") return adminApi.reactivate(pendingAction.id);
      return adminApi.deleteUser(pendingAction.id);
    },
    onSuccess: () => {
      const messages = {
        suspend: "User suspended.",
        reactivate: "User reactivated.",
        delete: "User deleted.",
      };
      toast.success(messages[pendingAction!.action]);
      invalidateUsers();
      setPendingAction(null);
    },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Action failed"),
  });

  const isLoading = l1 || l2 || l3;
  const activeMeta = TABS.find((item) => item.key === tab)!;

  return (
    <div className="min-h-screen bg-[#fbf5ff] px-4 pb-24 pt-4 text-[#191225]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#6747aa]">Super Admin</p>
          <h1 className="mt-1 text-2xl font-bold">User Management</h1>
        </div>
        <Link href="/admin/users/new" className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#563795] text-white shadow-md">
          <Plus size={24} />
        </Link>
      </div>

      <label className="mb-4 flex items-center gap-3 rounded-xl bg-white px-4 py-4 text-slate-500 shadow-sm">
        <Search size={19} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search users by name, email or phone..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </label>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {TABS.map((item) => {
          const count = item.key === "owners" ? owners.length : item.key === "managers" ? managers.length : agents.length;
          return (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${tab === item.key ? "bg-[#563795] text-white" : "bg-[#ede7ef] text-slate-800"}`}
            >
              {item.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{activeMeta.title}</h2>
        <span className="text-xs font-medium text-slate-500">{filtered.length} users</span>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState icon="👥" title="No users found" desc="Create a user or adjust your search." />
      ) : (
        <div className="grid gap-3">
          {filtered.map((user) => (
            <UserCard
              key={user._id}
              user={user}
              onEdit={() => setEditingUser(user)}
              onSuspend={() => setPendingAction({ id: user._id, action: user.status === "suspended" ? "reactivate" : "suspend" })}
              onDelete={() => setPendingAction({ id: user._id, action: "delete" })}
            />
          ))}
        </div>
      )}

      <EditUserModal
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSaved={() => {
          invalidateUsers();
          setEditingUser(null);
        }}
      />

      <ConfirmDialog
        open={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={() => actionMutation.mutate()}
        loading={actionMutation.isPending}
        danger={pendingAction?.action === "delete" || pendingAction?.action === "suspend"}
        title={
          pendingAction?.action === "delete"
            ? "Delete user?"
            : pendingAction?.action === "suspend"
              ? "Suspend user?"
              : "Reactivate user?"
        }
        message="Please confirm this user management action."
      />
    </div>
  );
}

function UserCard({ user, onEdit, onSuspend, onDelete }: { user: User; onEdit: () => void; onSuspend: () => void; onDelete: () => void }) {
  return (
    <article className="rounded-xl border border-[#eadff4] bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eee7fb] text-[#32157c]">
          {user.role === "boat_owner" ? <ShieldCheck size={20} /> : user.role === "manager" ? <Users size={20} /> : <UserRound size={20} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-bold">{user.name}</h3>
              <p className="text-xs font-semibold text-[#563795]">{roleLabels[user.role]}</p>
            </div>
            <StatusBadge status={user.status} />
          </div>
          <div className="mt-3 grid gap-1 text-xs text-slate-500">
            <p className="flex items-center gap-2"><Mail size={13} /> {user.email}</p>
            <p className="flex items-center gap-2"><Phone size={13} /> {user.phone || "No phone"}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button onClick={onEdit} className="flex min-h-0 items-center justify-center gap-1 rounded-lg border border-[#d8c9ff] py-2 text-xs font-bold text-[#32157c]">
          <Edit3 size={14} /> Edit
        </button>
        <button onClick={onSuspend} className="min-h-0 rounded-lg border border-amber-200 py-2 text-xs font-bold text-amber-700">
          {user.status === "suspended" ? "Reactivate" : "Suspend"}
        </button>
        <button onClick={onDelete} className="flex min-h-0 items-center justify-center gap-1 rounded-lg border border-red-200 py-2 text-xs font-bold text-red-600">
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </article>
  );
}

function EditUserModal({ user, onClose, onSaved }: { user: User | null; onClose: () => void; onSaved: () => void }) {
  if (!user) return null;
  return (
    <Modal open={!!user} onClose={onClose} title="Edit User">
      <EditUserForm key={user._id} user={user} onSaved={onSaved} />
    </Modal>
  );
}

function EditUserForm({ user, onSaved }: { user: User; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    role: user.role,
    status: user.status,
  });

  const mutation = useMutation({
    mutationFn: () => adminApi.updateUser(user._id, form),
    onSuccess: () => {
      toast.success("User updated.");
      onSaved();
    },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Update failed"),
  });

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <label className="grid gap-1.5 text-sm font-semibold">
        Full Name
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="input" />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold">
        Email
        <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} type="email" className="input" />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold">
        Phone
        <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="input" />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold">
        Role
        <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })} className="input">
          <option value="boat_owner">Admin (Boat Owner)</option>
          <option value="manager">Manager</option>
          <option value="agent">Agent</option>
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-semibold">
        Status
        <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as UserStatus })} className="input">
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="unverified">Unverified</option>
          <option value="suspended">Suspended</option>
        </select>
      </label>
      <button disabled={mutation.isPending} className="btn btn-primary btn-full">
        {mutation.isPending ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
