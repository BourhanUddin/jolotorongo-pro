"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, CalendarDays, ChevronDown, Edit3, Save, Send, ShipWheel } from "lucide-react";
import { bookingApi, roomApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import type { Room } from "@/types";

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

export default function CreateTourPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const isAgent = user?.role === "agent";
  const houseboatId = user?.joinedHouseboatId
    ? typeof user.joinedHouseboatId === "object" ? user.joinedHouseboatId._id : user.joinedHouseboatId
    : null;

  const [tourName, setTourName] = useState("Monsoon Serenity #402");
  const [checkIn, setCheckIn] = useState(todayInput());
  const [guestCount, setGuestCount] = useState("2");
  const [roomId, setRoomId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [advancePaid, setAdvancePaid] = useState("0");

  const checkOut = addOneDay(checkIn);

  const { data: ownerRoomsData } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => roomApi.list(),
    enabled: !isAgent,
  });
  const { data: availabilityData } = useQuery({
    queryKey: ["availability", houseboatId, checkIn, checkOut],
    queryFn: () => roomApi.availability(houseboatId!, checkIn, checkOut),
    enabled: isAgent && !!houseboatId && !!checkIn,
  });

  const rooms: (Room & { availableOnDate?: boolean; availabilityState?: string })[] = isAgent
    ? availabilityData?.data?.data?.rooms || []
    : ownerRoomsData?.data?.data?.rooms || [];
  const availableRooms = rooms.filter((room) => !isAgent || room.availableOnDate);
  const selectedRoom = rooms.find((room) => room._id === roomId) || availableRooms[0];
  const total = selectedRoom
    ? selectedRoom.basePrice + Math.max(0, Number(guestCount) - selectedRoom.maxCapacity) * selectedRoom.extraPersonPrice
    : 0;

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        roomId: selectedRoom?._id,
        customerName,
        customerPhone,
        customerAddress: "",
        checkIn,
        checkOut,
        guestCount: Number(guestCount),
        advancePaid: Number(advancePaid),
        paymentMethod: Number(advancePaid) >= total ? "cash" : "pending",
        note: tourName,
      };
      return isAgent ? bookingApi.hold(payload) : bookingApi.direct(payload);
    },
    onSuccess: () => {
      toast.success(isAgent ? "Hold request created." : "Tour booked and confirmed.");
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["bookings-dashboard"] });
      router.push("/bookings");
    },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not create booking"),
  });

  const canSave = selectedRoom && customerName && customerPhone && checkIn;
  const itinerary = useMemo(() => [
    ["Boarding & Sunset Cruise", "12:30 PM: Check-in at Tahirpur. Lunch on-board while cruising towards Watch Tower."],
    ["Morning Mist & Departure", "07:00 AM: Tea & Breakfast. Visit Lakma Chora. 11:30 AM: Drop-off at ghat."],
  ], []);

  return (
    <div className="min-h-screen bg-[#fbf5ff] pb-28 text-[#151020]">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#eee7f4] bg-[#fbf5ff]/95 px-5 py-4 backdrop-blur">
        <button onClick={() => router.back()} className="min-h-0 text-[#32157c]"><ArrowLeft size={24} /></button>
        <h1 className="text-xl font-medium text-[#32157c]">{isAgent ? "Request Hold" : "Create Tour"}</h1>
        <span className="text-2xl text-[#32157c]">⋮</span>
      </div>

      <div className="px-5 py-7">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Tour Identity</p>
        <label className="flex items-center justify-between rounded-xl bg-white p-5 shadow-sm">
          <input value={tourName} onChange={(event) => setTourName(event.target.value)} className="w-full bg-transparent text-2xl font-medium outline-none" />
          <Edit3 className="text-[#c8bdcf]" />
        </label>

        <section className="mt-7 rounded-xl bg-white p-5 shadow-sm">
          <div className="flex justify-between gap-4">
            <label className="flex-1">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Departure</span>
              <input type="date" min={todayInput()} value={checkIn} onChange={(event) => setCheckIn(event.target.value)} className="mt-3 w-full bg-transparent text-lg outline-none" />
            </label>
            <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#f1ebf7] text-[#32157c]"><CalendarDays size={23} /></span>
          </div>
          <div className="mt-8 border-t border-[#e2d9e7] pt-4">
            <div className="flex justify-between">
              <span>2D / 1N Logic</span>
              <span className="rounded bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">AUTOMATIC</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">Return: {checkOut || "Select departure date"}</p>
          </div>
        </section>

        <section className="mt-5 rounded-xl bg-white p-5 shadow-sm">
          <div className="flex justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Select Vessel</p>
              <p className="mt-3 text-lg">Your Assigned Houseboat</p>
            </div>
            <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#f1ebf7] text-[#32157c]"><ShipWheel size={23} /></span>
          </div>
          <div className="mt-8 flex items-center justify-between border-t border-[#e2d9e7] pt-4">
            <span>Capacity: {rooms.reduce((sum, room) => sum + room.maxCapacity, 0) || 12} Persons</span>
            <ChevronDown size={20} />
          </div>
        </section>

        <section className="mt-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg">Room Assignment</h2>
            <span className="text-sm font-bold text-[#32157c]">{availableRooms.length} AVAILABLE</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {rooms.slice(0, 6).map((room, index) => {
              const selectable = !isAgent || room.availableOnDate;
              const active = (roomId || selectedRoom?._id) === room._id;
              return (
                <button
                  key={room._id}
                  disabled={!selectable}
                  onClick={() => setRoomId(room._id)}
                  className={`overflow-hidden rounded-xl border bg-white text-left shadow-sm disabled:opacity-50 ${active ? "border-[#563795]" : "border-[#ddd4e5]"}`}
                >
                  <Image
                    src={room.images?.[0] || [
                      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=500&q=80",
                      "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=500&q=80",
                      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=500&q=80",
                    ][index % 3]}
                    alt={`Room ${room.roomNumber}`}
                    width={220}
                    height={120}
                    className="h-24 w-full object-cover"
                  />
                  <div className="p-3">
                    <p className="font-bold">Room {room.roomNumber}</p>
                    <p className="text-sm">{room.maxCapacity} Adults</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-7 grid gap-3">
          <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Customer name" className="h-14 rounded-lg border border-[#d8cfdc] bg-white px-4 outline-none" />
          <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Customer phone" className="h-14 rounded-lg border border-[#d8cfdc] bg-white px-4 outline-none" />
          <div className="grid grid-cols-2 gap-3">
            <input value={guestCount} onChange={(event) => setGuestCount(event.target.value)} type="number" min="1" className="h-14 rounded-lg border border-[#d8cfdc] bg-white px-4 outline-none" />
            <input value={advancePaid} onChange={(event) => setAdvancePaid(event.target.value)} type="number" min="0" placeholder="Advance paid" className="h-14 rounded-lg border border-[#d8cfdc] bg-white px-4 outline-none" />
          </div>
          <div className="rounded-lg bg-white p-4 text-sm shadow-sm">
            <div className="flex justify-between"><span>Total</span><b>৳{total.toLocaleString()}</b></div>
            <div className="mt-1 flex justify-between text-red-600"><span>Due</span><b>৳{Math.max(0, total - Number(advancePaid)).toLocaleString()}</b></div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-4 text-lg">Itinerary Preview</h2>
          <div className="grid gap-5">
            {itinerary.map(([title, body], index) => (
              <div key={title} className="flex gap-4">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold ${index === 0 ? "bg-[#6b4caf] text-white" : "bg-[#e6e0e8]"}`}>{index + 1}</span>
                <div className={`rounded-xl bg-white/50 p-5 shadow-sm ${index === 0 ? "border-l-4 border-[#563795]" : "border-l-4 border-[#c8bdcf]"}`}>
                  <p className="font-bold">{title}</p>
                  <p className="mt-2 leading-relaxed text-slate-700">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 bg-[#fbf5ff]/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-md gap-4">
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSave || mutation.isPending}
            className="flex flex-1 items-center justify-center gap-3 rounded-lg bg-[#563795] py-4 font-semibold text-white disabled:opacity-60"
          >
            <Save size={20} /> {mutation.isPending ? "Saving..." : isAgent ? "Send Hold" : "Save Tour"}
          </button>
          <button className="flex h-14 w-16 items-center justify-center rounded-lg border-2 border-[#32157c] text-[#32157c]">
            <Send size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}
