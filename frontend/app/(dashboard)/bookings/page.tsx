"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, BedDouble, CalendarDays, Check, FileText, Lock, Plus, Send, ShipWheel, X } from "lucide-react";
import { bookingApi, bookingRequestApi, houseboatApi, tourApi } from "@/lib/api";
import { formatMoney } from "@/lib/labels";
import { useAuthStore } from "@/store/auth.store";
import type { BookingRequest, Houseboat, Room, User } from "@/types";

const todayInput = () => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
};

const addOneDay = (date: string) => {
  if (!date) return "";
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
};

type BookingForm = {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  guestCount: string;
  advancePaid: string;
  referenceName: string;
  note: string;
  pricingMode: "ac" | "non_ac";
};

const blankForm: BookingForm = {
  customerName: "",
  customerPhone: "",
  customerAddress: "",
  guestCount: "2",
  advancePaid: "0",
  referenceName: "",
  note: "",
  pricingMode: "ac",
};

export default function BookingsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isAdmin = user?.role === "boat_owner" || user?.role === "manager";
  const isAgent = user?.role === "agent";
  const [date, setDate] = useState(todayInput());
  const [selectedVesselId, setSelectedVesselId] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [form, setForm] = useState<BookingForm>(blankForm);
  const checkOut = addOneDay(date);

  const agentBoatId = typeof user?.joinedHouseboatId === "object" ? user.joinedHouseboatId?._id : user?.joinedHouseboatId || "";

  const { data: fleetData } = useQuery({
    queryKey: ["houseboat-fleet"],
    queryFn: () => houseboatApi.fleet(),
    enabled: isAdmin,
  });
  const vessels: (Houseboat & { selected?: boolean })[] = useMemo(() => fleetData?.data?.data?.houseboats || [], [fleetData]);
  const defaultVesselId = fleetData?.data?.data?.selectedHouseboatId || vessels.find((boat) => boat.selected)?._id || vessels[0]?._id || "";
  const activeVesselId = isAgent ? agentBoatId : selectedVesselId || defaultVesselId;

  const { data: matrixData, isLoading } = useQuery({
    queryKey: ["booking-matrix", activeVesselId, date, checkOut],
    queryFn: () => tourApi.matrix({ houseboatId: activeVesselId, checkIn: date, checkOut }),
    enabled: !!activeVesselId && !!date,
  });
  const { data: incomingData } = useQuery({
    queryKey: ["incoming-booking-requests"],
    queryFn: () => bookingRequestApi.incoming(),
    enabled: isAdmin,
  });
  const { data: myRequestsData } = useQuery({
    queryKey: ["my-booking-requests"],
    queryFn: () => bookingRequestApi.my(),
    enabled: isAgent,
  });

  const rooms: Room[] = matrixData?.data?.data?.rooms || [];
  const tour = matrixData?.data?.data?.tour;
  const incomingRequests: BookingRequest[] = incomingData?.data?.data?.requests || [];
  const myRequests: BookingRequest[] = myRequestsData?.data?.data?.requests || [];
  const selectedPrice = selectedRoom
    ? form.pricingMode === "ac"
      ? selectedRoom.acRoomPrice || selectedRoom.basePrice
      : selectedRoom.nonAcRoomPrice || selectedRoom.basePrice
    : 0;
  const extraCharge = selectedRoom ? Math.max(0, Number(form.guestCount) - selectedRoom.maxCapacity) * selectedRoom.extraPersonPrice : 0;
  const total = selectedPrice + extraCharge;
  const agentCommission = Math.round(total * 0.1);

  const resetBookingForm = () => {
    setSelectedRoom(null);
    setForm(blankForm);
  };

  const directBooking = useMutation({
    mutationFn: () => bookingApi.direct({
      roomId: selectedRoom?._id,
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      customerAddress: form.customerAddress,
      referenceName: form.referenceName,
      checkIn: date,
      checkOut,
      guestCount: Number(form.guestCount),
      advancePaid: Number(form.advancePaid),
      pricingMode: form.pricingMode,
      paymentMethod: Number(form.advancePaid) >= total ? "cash" : "pending",
      note: form.note,
      tourName: tour?.title || "",
    }),
    onSuccess: () => {
      toast.success("Room booked.");
      qc.invalidateQueries({ queryKey: ["booking-matrix"] });
      qc.invalidateQueries({ queryKey: ["finance-report"] });
      resetBookingForm();
    },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not book room"),
  });

  const createRequest = useMutation({
    mutationFn: () => bookingRequestApi.create({
      boatId: activeVesselId,
      roomId: selectedRoom?._id,
      checkIn: date,
      checkOut,
      guestCount: Number(form.guestCount),
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      customerAddress: form.customerAddress,
      note: form.note,
    }),
    onSuccess: () => {
      toast.success("Booking request sent.");
      qc.invalidateQueries({ queryKey: ["my-booking-requests"] });
      resetBookingForm();
    },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not send request"),
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => bookingRequestApi.paymentConfirmed(id),
    onSuccess: () => {
      toast.success("Payment marked confirmed.");
      qc.invalidateQueries({ queryKey: ["my-booking-requests"] });
    },
  });

  const approveRequest = useMutation({
    mutationFn: (id: string) => bookingRequestApi.approve(id, { referenceName: "Agent Request" }),
    onSuccess: () => {
      toast.success("Agent request approved and booked.");
      qc.invalidateQueries({ queryKey: ["incoming-booking-requests"] });
      qc.invalidateQueries({ queryKey: ["booking-matrix"] });
    },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not approve"),
  });

  const rejectRequest = useMutation({
    mutationFn: (id: string) => bookingRequestApi.reject(id, { reason: "Slot unavailable" }),
    onSuccess: () => {
      toast.success("Request rejected.");
      qc.invalidateQueries({ queryKey: ["incoming-booking-requests"] });
    },
  });

  const canSubmitDirect = selectedRoom && form.customerName.trim() && form.customerPhone.trim() && form.referenceName.trim() && selectedRoom.availableOnDate;
  const canSubmitRequest = selectedRoom && form.customerName.trim() && form.customerPhone.trim() && selectedRoom.availableOnDate;

  return (
    <div className="min-h-screen bg-[#fbf5ff] pb-28 text-[#151020]">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#eee7f4] bg-[#fbf5ff]/95 px-5 py-5 backdrop-blur">
        <Link href="/dashboard" className="min-h-0 text-[#32157c]"><ArrowLeft size={26} /></Link>
        <h1 className="text-2xl font-medium text-[#32157c]">Bookings</h1>
        {isAdmin ? (
          <Link href="/bookings/new" className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#563795] text-white"><Plus size={24} /></Link>
        ) : <span className="w-11" />}
      </div>

      <div className="grid gap-5 px-5 py-7 lg:grid-cols-[1fr_360px]">
        <main className="grid gap-5">
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Tour Date</span>
                <span className="mt-2 flex items-center gap-2 rounded-lg border border-[#d8cfdc] px-3 py-2">
                  <CalendarDays size={18} />
                  <input type="date" value={date} onChange={(event) => { setDate(event.target.value); resetBookingForm(); }} className="w-full bg-transparent outline-none" />
                </span>
              </label>
              {isAdmin && (
                <label>
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Vessel</span>
                  <span className="mt-2 flex items-center gap-2 rounded-lg border border-[#d8cfdc] px-3 py-2">
                    <ShipWheel size={18} />
                    <select value={activeVesselId} onChange={(event) => { setSelectedVesselId(event.target.value); resetBookingForm(); }} className="w-full bg-transparent outline-none">
                      {vessels.map((boat) => <option key={boat._id} value={boat._id}>{boat.name}</option>)}
                    </select>
                  </span>
                </label>
              )}
            </div>
            <p className="mt-4 text-sm text-slate-600">
              {tour ? `Tour: ${tour.title}` : "No configured tour for this date. Showing vessel rooms."}
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold">Date-Based Room Matrix</h2>
            {isLoading ? (
              <p className="rounded-xl bg-white p-5 text-sm text-slate-600">Loading availability...</p>
            ) : rooms.length === 0 ? (
              <p className="rounded-xl bg-white p-5 text-sm text-slate-600">No rooms found for this date.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {rooms.map((room) => {
                  const locked = room.availabilityState === "booked" || room.availabilityState === "on_hold" || room.availabilityState === "maintenance";
                  return (
                    <button
                      key={room._id}
                      disabled={locked}
                      onClick={() => { setSelectedRoom(room); setForm(blankForm); }}
                      className={`rounded-xl border p-4 text-left shadow-sm ${locked ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span>
                          <b>Room {room.roomNumber}</b>
                          <span className="mt-1 block text-sm">{room.roomType} · {room.maxCapacity} guests</span>
                          <span className="mt-1 block text-xs">AC {formatMoney(room.acRoomPrice || room.basePrice)} · Non-AC {formatMoney(room.nonAcRoomPrice || room.basePrice)}</span>
                        </span>
                        {locked ? <Lock size={18} /> : <Check size={18} />}
                      </span>
                      <span className="mt-3 inline-flex rounded-full bg-white/80 px-2 py-1 text-[11px] font-bold">
                        {locked ? (room.availabilityState === "on_hold" ? "On Hold" : room.availabilityState === "maintenance" ? "Maintenance" : "Booked") : "Available"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {isAdmin && incomingRequests.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Agent Requests Awaiting Approval</h2>
              <div className="grid gap-3">
                {incomingRequests.map((request) => <IncomingRequestCard key={request._id} request={request} onApprove={() => approveRequest.mutate(request._id)} onReject={() => rejectRequest.mutate(request._id)} />)}
              </div>
            </section>
          )}

          {isAgent && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">My Booking Requests</h2>
              <div className="grid gap-3">
                {myRequests.length === 0 ? <p className="rounded-xl bg-white p-5 text-sm text-slate-600">No booking requests yet.</p> : myRequests.map((request) => (
                  <article key={request._id} className="rounded-xl bg-white p-4 shadow-sm">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-bold">{request.customerName}</p>
                        <p className="text-xs text-slate-500">{request.tripDates.checkIn.slice(0, 10)} · {request.status}</p>
                        <p className="text-xs text-slate-500">Commission: {formatMoney(request.agentCommission || 0)}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${request.paymentConfirmedByAgent ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {request.paymentConfirmedByAgent ? "Payment Confirmed" : "Payment Pending"}
                      </span>
                    </div>
                    {request.status === "pending" && !request.paymentConfirmedByAgent && (
                      <button onClick={() => markPaid.mutate(request._id)} className="mt-3 w-full rounded-lg border border-[#32157c] py-2 text-sm font-bold text-[#32157c]">Mark Payment Confirmed</button>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}
        </main>

        <aside className="h-max rounded-xl bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><BedDouble size={20} /> {isAgent ? "Booking Request" : "Direct Booking"}</h2>
          {!selectedRoom ? (
            <p className="mt-4 text-sm text-slate-600">Select an available room from the matrix.</p>
          ) : (
            <div className="mt-4 grid gap-3">
              <p className="rounded-lg bg-[#f8f4fb] p-3 text-sm font-bold">Room {selectedRoom.roomNumber} · {date} to {checkOut}</p>
              <input value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} placeholder="Customer name" className="input" />
              <input value={form.customerPhone} onChange={(event) => setForm({ ...form, customerPhone: event.target.value })} placeholder="Customer contact" className="input" />
              <input value={form.customerAddress} onChange={(event) => setForm({ ...form, customerAddress: event.target.value })} placeholder="Customer address" className="input" />
              <input value={form.guestCount} onChange={(event) => setForm({ ...form, guestCount: event.target.value })} type="number" min="1" className="input" />
              {isAdmin && <input value={form.referenceName} onChange={(event) => setForm({ ...form, referenceName: event.target.value })} placeholder="Reference Name" className="input" />}
              {isAdmin && <input value={form.advancePaid} onChange={(event) => setForm({ ...form, advancePaid: event.target.value })} type="number" min="0" placeholder="Advance paid" className="input" />}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setForm({ ...form, pricingMode: "ac" })} className={`rounded-lg border px-3 py-2 text-sm font-bold ${form.pricingMode === "ac" ? "border-[#563795] bg-[#563795] text-white" : "border-[#d8cfdc]"}`}>AC</button>
                <button onClick={() => setForm({ ...form, pricingMode: "non_ac" })} className={`rounded-lg border px-3 py-2 text-sm font-bold ${form.pricingMode === "non_ac" ? "border-[#563795] bg-[#563795] text-white" : "border-[#d8cfdc]"}`}>Non-AC</button>
              </div>
              <textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} rows={3} placeholder={isAgent ? "Note / special request" : "Booking note"} className="input" />
              <div className="rounded-lg bg-slate-50 p-3 text-sm">
                <div className="flex justify-between"><span>Total</span><b>{formatMoney(total)}</b></div>
                {isAgent && <div className="mt-1 flex justify-between text-emerald-700"><span>Agent Commission</span><b>{formatMoney(agentCommission)}</b></div>}
              </div>
              {isAdmin ? (
                <button onClick={() => directBooking.mutate()} disabled={!canSubmitDirect || directBooking.isPending} className="flex items-center justify-center gap-2 rounded-lg bg-[#563795] py-3 font-bold text-white disabled:opacity-60">
                  <FileText size={18} /> {directBooking.isPending ? "Booking..." : "Direct Book"}
                </button>
              ) : (
                <button onClick={() => createRequest.mutate()} disabled={!canSubmitRequest || createRequest.isPending} className="flex items-center justify-center gap-2 rounded-lg bg-[#563795] py-3 font-bold text-white disabled:opacity-60">
                  <Send size={18} /> {createRequest.isPending ? "Sending..." : "Send Request"}
                </button>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function IncomingRequestCard({ request, onApprove, onReject }: { request: BookingRequest; onApprove: () => void; onReject: () => void }) {
  const agent = typeof request.agentId === "object" ? request.agentId as User : null;
  const room = typeof request.roomId === "object" ? request.roomId as Room : null;

  return (
    <article className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex justify-between gap-3">
        <div>
          <p className="font-bold">{request.customerName}</p>
          <p className="text-xs text-slate-500">Room {room?.roomNumber || "—"} · {request.tripDates.checkIn.slice(0, 10)}</p>
          <p className="text-xs text-slate-500">Agent: {agent?.name || "—"} · Commission {formatMoney(request.agentCommission || 0)}</p>
          <p className="mt-1 text-xs text-slate-600">Payment: {request.paymentConfirmedByAgent ? "Confirmed by agent" : "Not confirmed yet"}</p>
          {request.note && <p className="mt-1 text-xs text-slate-500">Note: {request.note}</p>}
        </div>
        <p className="font-bold text-emerald-700">{formatMoney(request.totalPrice)}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={onReject} className="flex items-center justify-center gap-2 rounded-lg border border-red-200 py-2 text-sm font-bold text-red-600"><X size={15} /> Reject</button>
        <button onClick={onApprove} className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white"><Check size={15} /> Approve & Book</button>
      </div>
    </article>
  );
}
