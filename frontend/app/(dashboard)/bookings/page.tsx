"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, BedDouble, CalendarDays, Filter, FileText, MoreVertical, Plus, Search, ShipWheel, Users, MessageSquare } from "lucide-react";
import { bookingApi } from "@/lib/api";
import { formatDate } from "@/lib/labels";
import type { Booking, Room } from "@/types";

const statuses = [
  { key: "", label: "All" },
  { key: "on_hold", label: "Holds" },
  { key: "confirmed", label: "Paid" },
  { key: "completed", label: "Complete" },
  { key: "cancelled", label: "Cancelled" },
];

const statusStyle: Record<string, { label: string; cls: string; side: string }> = {
  on_hold: { label: "Pending", cls: "bg-red-50 text-red-700", side: "border-l-red-600" },
  confirmed: { label: "Paid", cls: "bg-emerald-50 text-emerald-700", side: "border-l-emerald-600" },
  completed: { label: "Paid", cls: "bg-emerald-50 text-emerald-700", side: "border-l-emerald-600" },
  cancelled: { label: "Cancelled", cls: "bg-slate-100 text-slate-600", side: "border-l-slate-400" },
  expired: { label: "Expired", cls: "bg-slate-100 text-slate-600", side: "border-l-slate-400" },
};

export default function BookingsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["bookings", status, date],
    queryFn: () => bookingApi.list({ status: status || undefined, date: date || undefined, limit: 50 }),
  });

  const bookings: Booking[] = data?.data?.data?.bookings || [];
  const grouped = bookings.reduce<Record<string, Booking[]>>((acc, booking) => {
    const key = new Date(booking.checkIn).toDateString();
    acc[key] = acc[key] || [];
    acc[key].push(booking);
    return acc;
  }, {});

  const invalidate = () => qc.invalidateQueries({ queryKey: ["bookings"] });
  const confirmMutation = useMutation({
    mutationFn: (id: string) => bookingApi.confirm(id, { paymentMethod: "cash" }),
    onSuccess: () => { toast.success("Booking confirmed."); invalidate(); },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not confirm"),
  });
  const completeMutation = useMutation({
    mutationFn: (id: string) => bookingApi.complete(id),
    onSuccess: () => { toast.success("Booking completed."); invalidate(); },
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => bookingApi.cancel(id, { reason: "Cancelled by admin" }),
    onSuccess: () => { toast.success("Booking cancelled."); invalidate(); },
  });

  return (
    <div className="min-h-screen bg-[#fbf5ff] pb-28 text-[#151020]">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#eee7f4] bg-[#fbf5ff]/95 px-5 py-5 backdrop-blur">
        <Link href="/dashboard" className="min-h-0 text-[#32157c]"><ArrowLeft size={28} /></Link>
        <h1 className="text-3xl font-medium text-[#32157c]">Bookings</h1>
        <div className="flex items-center gap-5 text-[#32157c]"><Search size={30} /><MoreVertical size={26} /></div>
      </div>

      <div className="px-5 py-8">
        <div className="mb-8 flex gap-3 overflow-x-auto no-scrollbar">
          <label className="flex shrink-0 items-center gap-3 rounded-full bg-[#6b4caf] px-6 py-4 text-lg font-bold text-white">
            <CalendarDays size={24} />
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-[148px] bg-transparent text-white outline-none" />
          </label>
          <button className="flex shrink-0 items-center gap-3 rounded-full bg-[#eee7f4] px-6 py-4 text-lg font-bold text-slate-700">
            <ShipWheel size={24} /> All Vessels
          </button>
          <button className="flex h-[60px] w-[72px] shrink-0 items-center justify-center rounded-full bg-[#eee7f4]"><Filter size={25} /></button>
        </div>

        <div className="mb-7 flex gap-2 overflow-x-auto no-scrollbar">
          {statuses.map((item) => (
            <button
              key={item.key}
              onClick={() => setStatus(item.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${status === item.key ? "bg-[#563795] text-white" : "bg-white text-slate-600"}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-slate-500">Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="rounded-xl bg-white p-10 text-center shadow-sm">
            <p className="font-bold">No bookings found</p>
            <p className="mt-1 text-sm text-slate-500">Create a tour or change your filters.</p>
          </div>
        ) : (
          <div className="grid gap-10">
            {Object.entries(grouped).map(([day, items]) => (
              <section key={day}>
                <h2 className="mb-4 flex items-center gap-3 text-3xl font-medium text-slate-700">
                  <CalendarDays size={31} /> {formatDate(items[0].checkIn)}
                  {new Date(day).getDate() === new Date().getDate() + 1 && <span className="rounded-md bg-[#dfd0ff] px-3 py-1 text-base font-bold text-slate-600">Tomorrow</span>}
                </h2>
                <div className="grid gap-7">
                  {items.map((booking) => (
                    <BookingCard
                      key={booking._id}
                      booking={booking}
                      onConfirm={() => confirmMutation.mutate(booking._id)}
                      onComplete={() => completeMutation.mutate(booking._id)}
                      onCancel={() => cancelMutation.mutate(booking._id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <Link href="/bookings/new" className="fixed bottom-24 right-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#563795] text-white shadow-2xl">
        <Plus size={38} />
      </Link>
    </div>
  );
}

function BookingCard({ booking, onConfirm, onComplete, onCancel }: { booking: Booking; onConfirm: () => void; onComplete: () => void; onCancel: () => void }) {
  const room = typeof booking.roomId === "object" ? booking.roomId as Room : null;
  const style = statusStyle[booking.status] || statusStyle.on_hold;
  const whatsappText = encodeURIComponent(`Booking for ${booking.customerName}. Room ${room?.roomNumber || ""}. Total ৳${booking.totalPrice}.`);

  return (
    <article className={`rounded-xl border-l-4 bg-white p-7 shadow-sm ${style.side}`}>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h3 className="text-3xl font-light leading-tight">{booking.customerName}</h3>
          <p className="mt-2 text-2xl text-slate-700">{booking.customerPhone}</p>
        </div>
        <span className={`rounded-md px-5 py-3 text-xl font-bold ${style.cls}`}>{style.label}</span>
      </div>

      <div className="grid gap-4 border-y border-slate-200 py-5 text-xl text-slate-700">
        <p className="flex items-center gap-4"><BedDouble size={30} className="text-slate-500" /> Room {room?.roomNumber || "—"}</p>
        <p className="flex items-center gap-4"><Users size={30} className="text-slate-500" /> {booking.guestCount} Guests</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link href={`/bookings/${booking._id}`} className="flex items-center justify-center gap-3 rounded-lg border-2 border-[#32157c] py-4 text-xl font-bold text-[#32157c]">
          <FileText size={26} /> Invoice
        </Link>
        <a href={`https://wa.me/${booking.customerPhone.replace(/\D/g, "")}?text=${whatsappText}`} target="_blank" className="flex items-center justify-center gap-3 rounded-lg bg-[#25d366] py-4 text-xl font-bold text-white">
          <MessageSquare size={27} /> WhatsApp
        </a>
      </div>

      {booking.status === "on_hold" && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button onClick={onConfirm} className="rounded-lg bg-[#563795] py-3 text-sm font-bold text-white">Approve</button>
          <button onClick={onCancel} className="rounded-lg border border-red-200 py-3 text-sm font-bold text-red-600">Reject</button>
        </div>
      )}
      {booking.status === "confirmed" && (
        <button onClick={onComplete} className="mt-4 w-full rounded-lg bg-emerald-600 py-3 text-sm font-bold text-white">Mark Completed</button>
      )}
    </article>
  );
}
