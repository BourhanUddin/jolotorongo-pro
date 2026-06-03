"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, BedDouble, CalendarDays, Check, FileText, Lock, Plus, Send, ShipWheel, X } from "lucide-react";
import { agentApi, bookingApi, bookingRequestApi, houseboatApi, tourApi } from "@/lib/api";
import { formatMoney } from "@/lib/labels";
import { useAuthStore } from "@/store/auth.store";
import type { BookingRequest, Houseboat, Room, Tour, User } from "@/types";

const todayInput = () => {
  const d = new Date();
  return formatInputDate(d);
};

const addOneDay = (date: string) => {
  if (!date) return "";
  const [year, month, day] = date.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + 1);
  return formatInputDate(d);
};

const formatInputDate = (date: Date) => {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
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

type AvailableGroup = {
  boat: Houseboat;
  tour: Tour;
  rooms: Room[];
};

type BookableRoom = Room & {
  boat?: Houseboat;
  tourTitle?: string;
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

const roomImage = (room: Room) => room.images?.[0] || "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=900&q=80";

const roomClimate = (room: Room): "ac" | "non_ac" | "both" => {
  if (room.climate) return room.climate;
  if ((room.acRoomPrice || 0) > 0 && (room.nonAcRoomPrice || 0) > 0) return "both";
  return (room.nonAcRoomPrice || 0) > 0 ? "non_ac" : "ac";
};

const defaultPricingMode = (room: Room): "ac" | "non_ac" => roomClimate(room) === "non_ac" ? "non_ac" : "ac";

const roomPrice = (room: Room, mode: "ac" | "non_ac") => {
  const primary = mode === "ac" ? room.acRoomPrice : room.nonAcRoomPrice;
  return primary > 0 ? primary : room.basePrice;
};

const climateLabel = (room: Room) => {
  const climate = roomClimate(room);
  if (climate === "both") return "AC / Non-AC";
  return climate === "ac" ? "AC" : "Non-AC";
};

export default function BookingsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isAdmin = user?.role === "boat_owner" || user?.role === "manager";
  const isAgent = user?.role === "agent";
  const [date, setDate] = useState(todayInput());
  const [selectedVesselId, setSelectedVesselId] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<BookableRoom | null>(null);
  const [form, setForm] = useState<BookingForm>(blankForm);
  const checkOut = addOneDay(date);

  const { data: fleetData } = useQuery({
    queryKey: ["houseboat-fleet"],
    queryFn: () => houseboatApi.fleet(),
    enabled: isAdmin,
  });
  const vessels: (Houseboat & { selected?: boolean })[] = useMemo(() => fleetData?.data?.data?.houseboats || [], [fleetData]);
  const defaultVesselId = fleetData?.data?.data?.selectedHouseboatId || vessels.find((boat) => boat.selected)?._id || vessels[0]?._id || "";
  const activeVesselId = selectedVesselId || defaultVesselId;

  const { data: matrixData, isLoading } = useQuery({
    queryKey: ["booking-matrix", activeVesselId, date, checkOut],
    queryFn: () => tourApi.matrix({ houseboatId: activeVesselId, checkIn: date, checkOut }),
    enabled: isAdmin && !!activeVesselId && !!date,
  });
  const { data: agentAvailabilityData, isLoading: loadingAgentRooms } = useQuery({
    queryKey: ["agent-approved-available-rooms", date, checkOut],
    queryFn: () => agentApi.availableRooms({ checkIn: date, checkOut }),
    enabled: isAgent && !!date && !!checkOut && !!user?.isApprovedByAdmin && user?.status === "active",
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

  const agentGroups: AvailableGroup[] = agentAvailabilityData?.data?.data?.groups || [];
  const rooms: BookableRoom[] = isAgent
    ? agentGroups.flatMap((group) => group.rooms.map((room) => ({ ...room, boat: group.boat, tourTitle: group.tour.title })))
    : matrixData?.data?.data?.rooms || [];
  const tour = matrixData?.data?.data?.tour;
  const loadingRooms = isAgent ? loadingAgentRooms : isLoading;
  const incomingRequests: BookingRequest[] = incomingData?.data?.data?.requests || [];
  const myRequests: BookingRequest[] = myRequestsData?.data?.data?.requests || [];
  const selectedPrice = selectedRoom
    ? roomPrice(selectedRoom, roomClimate(selectedRoom) === "non_ac" ? "non_ac" : form.pricingMode)
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
      boatId: selectedRoom?.boat?._id || activeVesselId,
      roomId: selectedRoom?._id,
      checkIn: date,
      checkOut,
      guestCount: Number(form.guestCount),
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      customerAddress: form.customerAddress,
      pricingMode: form.pricingMode,
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
              {isAgent
                ? "Showing available rooms across all approved boats for this 2D / 1N date."
                : tour ? `Tour: ${tour.title}` : "No active tour for this date. Rooms are shown only for an active tour date."}
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold">{isAgent ? "Approved Boat Available Rooms" : "Date-Based Room Matrix"}</h2>
            {loadingRooms ? (
              <p className="rounded-xl bg-white p-5 text-sm text-slate-600">Loading availability...</p>
            ) : rooms.length === 0 ? (
              <p className="rounded-xl bg-white p-5 text-sm text-slate-600">
                {isAgent ? "No available room found across approved boats for this date." : "No active tour for this date. Select a date where Tour Date equals Booking Date."}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {rooms.map((room) => {
                  const locked = room.availabilityState === "booked" || room.availabilityState === "on_hold" || room.availabilityState === "maintenance";
                  return (
                    <button
                      key={room._id}
                      disabled={locked}
                      onClick={() => { setSelectedRoom(room); setForm({ ...blankForm, pricingMode: defaultPricingMode(room) }); }}
                      className={`overflow-hidden rounded-xl border bg-white text-left shadow-sm transition ${locked ? "border-red-200 opacity-75" : "border-emerald-200 hover:-translate-y-0.5 hover:border-[#563795] hover:shadow-md"}`}
                    >
                      <span className="relative block h-32 w-full">
                        <Image src={roomImage(room)} alt={`Room ${room.roomNumber}`} fill sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 90vw" className="object-cover" />
                        <span className={`absolute left-3 top-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm ${locked ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}>
                          {locked ? (room.availabilityState === "on_hold" ? "On Hold" : room.availabilityState === "maintenance" ? "Maintenance" : "Booked") : "Available"}
                        </span>
                      </span>
                      <span className="block p-4 text-[#151020]">
                        <span className="flex items-start justify-between gap-3">
                          <span>
                            <b className="block text-base">Room {room.roomNumber}</b>
                            {room.boat && <span className="mt-1 block text-xs font-semibold text-[#32157c]">{room.boat.name}</span>}
                            <span className="mt-1 block text-sm capitalize text-slate-600">{room.roomType} · {climateLabel(room)} · {room.maxCapacity} guests</span>
                            {room.tourTitle && <span className="mt-1 block text-xs text-slate-500">{room.tourTitle}</span>}
                          </span>
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${locked ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                            {locked ? <Lock size={17} /> : <Check size={17} />}
                          </span>
                        </span>
                        <span className="mt-3 grid gap-1 text-xs text-slate-600">
                          {(roomClimate(room) === "ac" || roomClimate(room) === "both") && <span>AC: <b>{formatMoney(roomPrice(room, "ac"))}</b></span>}
                          {(roomClimate(room) === "non_ac" || roomClimate(room) === "both") && <span>Non-AC: <b>{formatMoney(roomPrice(room, "non_ac"))}</b></span>}
                          {room.amenities?.length > 0 && <span className="line-clamp-1">Amenities: {room.amenities.slice(0, 3).join(", ")}</span>}
                        </span>
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
              <div className="overflow-hidden rounded-lg bg-[#f8f4fb]">
                <div className="relative h-28">
                  <Image src={roomImage(selectedRoom)} alt={`Room ${selectedRoom.roomNumber}`} fill sizes="360px" className="object-cover" />
                </div>
                <p className="p-3 text-sm font-bold">
                  {selectedRoom.boat ? `${selectedRoom.boat.name} · ` : ""}Room {selectedRoom.roomNumber} · {date} to {checkOut}
                </p>
              </div>
              <input value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} placeholder="Customer name" className="input" />
              <input value={form.customerPhone} onChange={(event) => setForm({ ...form, customerPhone: event.target.value })} placeholder="Customer contact" className="input" />
              <input value={form.customerAddress} onChange={(event) => setForm({ ...form, customerAddress: event.target.value })} placeholder="Customer address" className="input" />
              <input value={form.guestCount} onChange={(event) => setForm({ ...form, guestCount: event.target.value })} type="number" min="1" className="input" />
              {isAdmin && <input value={form.referenceName} onChange={(event) => setForm({ ...form, referenceName: event.target.value })} placeholder="Reference Name" className="input" />}
              {isAdmin && <input value={form.advancePaid} onChange={(event) => setForm({ ...form, advancePaid: event.target.value })} type="number" min="0" placeholder="Advance paid" className="input" />}
              {roomClimate(selectedRoom) === "both" ? (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setForm({ ...form, pricingMode: "ac" })} className={`rounded-lg border px-3 py-2 text-sm font-bold ${form.pricingMode === "ac" ? "border-[#563795] bg-[#563795] text-white" : "border-[#d8cfdc]"}`}>AC</button>
                  <button onClick={() => setForm({ ...form, pricingMode: "non_ac" })} className={`rounded-lg border px-3 py-2 text-sm font-bold ${form.pricingMode === "non_ac" ? "border-[#563795] bg-[#563795] text-white" : "border-[#d8cfdc]"}`}>Non-AC</button>
                </div>
              ) : (
                <p className="rounded-lg border border-[#d8cfdc] px-3 py-2 text-sm font-bold">{climateLabel(selectedRoom)} room</p>
              )}
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
