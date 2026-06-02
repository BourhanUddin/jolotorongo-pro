"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, CalendarDays, Check, Edit3, Save, ShipWheel, Trash2 } from "lucide-react";
import { houseboatApi, roomApi, tourApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import type { Houseboat, Room, Tour } from "@/types";

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
  const canManageTours = user?.role === "boat_owner" || user?.role === "manager";
  const [selectedVesselId, setSelectedVesselId] = useState("");
  const [editingTourId, setEditingTourId] = useState("");
  const [tourName, setTourName] = useState("");
  const [checkIn, setCheckIn] = useState(todayInput());
  const [note, setNote] = useState("");
  const [assignedRoomIds, setAssignedRoomIds] = useState<string[]>([]);
  const checkOut = addOneDay(checkIn);

  const { data: fleetData } = useQuery({
    queryKey: ["houseboat-fleet"],
    queryFn: () => houseboatApi.fleet(),
    enabled: canManageTours,
  });
  const vessels: (Houseboat & { selected?: boolean })[] = useMemo(() => fleetData?.data?.data?.houseboats || [], [fleetData]);
  const defaultVesselId = fleetData?.data?.data?.selectedHouseboatId || vessels.find((boat) => boat.selected)?._id || vessels[0]?._id || "";
  const activeVesselId = selectedVesselId || defaultVesselId;
  const selectedVessel = vessels.find((boat) => boat._id === activeVesselId);
  const effectiveTourName = tourName || selectedVesselName(selectedVessel);

  const { data: roomsData, isLoading: loadingRooms } = useQuery({
    queryKey: ["tour-config-rooms", activeVesselId],
    queryFn: () => roomApi.list({ houseboatId: activeVesselId }),
    enabled: canManageTours && !!activeVesselId,
  });
  const { data: toursData } = useQuery({
    queryKey: ["tours", activeVesselId],
    queryFn: () => tourApi.list({ houseboatId: activeVesselId }),
    enabled: canManageTours && !!activeVesselId,
  });

  const rooms: Room[] = roomsData?.data?.data?.rooms || [];
  const tours: Tour[] = toursData?.data?.data?.tours || [];
  const allSelected = rooms.length > 0 && assignedRoomIds.length === rooms.length;

  const saveTour = useMutation({
    mutationFn: () => {
      const payload = {
        houseboatId: activeVesselId,
        title: effectiveTourName,
        checkIn,
        checkOut,
        roomIds: assignedRoomIds,
        note,
      };
      return editingTourId ? tourApi.update(editingTourId, payload) : tourApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editingTourId ? "Tour updated." : "Tour scheduled.");
      qc.invalidateQueries({ queryKey: ["tours"] });
      resetForm(selectedVessel);
    },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not save tour"),
  });

  const deleteTour = useMutation({
    mutationFn: (id: string) => tourApi.delete(id),
    onSuccess: () => {
      toast.success("Tour deleted.");
      qc.invalidateQueries({ queryKey: ["tours"] });
      resetForm(selectedVessel);
    },
  });

  const toggleRoom = (roomId: string) => {
    setAssignedRoomIds((current) => current.includes(roomId) ? current.filter((id) => id !== roomId) : [...current, roomId]);
  };

  const selectAll = () => setAssignedRoomIds(allSelected ? [] : rooms.map((room) => room._id));

  const resetForm = (boat?: Houseboat) => {
    setEditingTourId("");
    setTourName(boat?.name || "");
    setCheckIn(todayInput());
    setNote("");
    setAssignedRoomIds([]);
  };

  const loadTour = (tour: Tour) => {
    const boatId = typeof tour.houseboatId === "object" ? tour.houseboatId._id : tour.houseboatId;
    setSelectedVesselId(boatId);
    setEditingTourId(tour._id);
    setTourName(tour.title);
    setCheckIn(tour.checkIn.slice(0, 10));
    setNote(tour.note || "");
    setAssignedRoomIds((tour.roomIds || []).map((room) => typeof room === "object" ? room._id : room));
  };

  if (!canManageTours) {
    return (
      <div className="min-h-screen bg-[#fbf5ff] px-5 py-8 text-[#151020]">
        <Link href="/bookings" className="inline-flex items-center gap-2 text-[#32157c]"><ArrowLeft size={20} /> Back</Link>
        <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold">Create Tour unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">Agents can view booking availability only. Tour configuration is Admin/Manager only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf5ff] pb-28 text-[#151020]">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#eee7f4] bg-[#fbf5ff]/95 px-5 py-4 backdrop-blur">
        <button onClick={() => router.back()} className="min-h-0 text-[#32157c]"><ArrowLeft size={24} /></button>
        <h1 className="text-xl font-medium text-[#32157c]">Create Tour</h1>
        <span className="w-6" />
      </div>

      <div className="grid gap-5 px-5 py-7 lg:grid-cols-[1fr_360px]">
        <main className="grid gap-5">
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Select Vessel</span>
              <span className="mt-3 flex items-center gap-3">
                <ShipWheel className="text-[#32157c]" size={22} />
                <select
                  value={activeVesselId}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    const boat = vessels.find((item) => item._id === nextId);
                    setSelectedVesselId(nextId);
                    resetForm(boat);
                  }}
                  className="input"
                >
                  {vessels.length === 0 ? <option value="">No active vessel found</option> : vessels.map((boat) => (
                    <option key={boat._id} value={boat._id}>{boat.name}</option>
                  ))}
                </select>
              </span>
            </label>

            <label className="mt-5 block border-t border-[#e2d9e7] pt-5">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Tour Identity</span>
              <span className="mt-3 flex items-center rounded-xl bg-[#f8f4fb] px-4 py-3">
                <input value={effectiveTourName} onChange={(event) => setTourName(event.target.value)} className="w-full bg-transparent text-xl font-medium outline-none" />
                <Edit3 className="text-[#c8bdcf]" />
              </span>
            </label>
          </section>

          <section className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex justify-between gap-4">
              <label className="flex-1">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Tour Date</span>
                <input type="date" min={todayInput()} value={checkIn} onChange={(event) => setCheckIn(event.target.value)} className="mt-3 w-full bg-transparent text-lg outline-none" />
              </label>
              <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#f1ebf7] text-[#32157c]"><CalendarDays size={23} /></span>
            </div>
            <p className="mt-4 text-xs text-slate-500">Rooms selected here initialize as Available for {checkIn} to {checkOut}.</p>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Dynamic Room List</h2>
                <p className="text-sm text-slate-600">Select rooms assigned to this tour. No booking action here.</p>
              </div>
              <button onClick={selectAll} disabled={rooms.length === 0} className="btn btn-outline text-sm">{allSelected ? "Clear" : "All"}</button>
            </div>
            {loadingRooms ? (
              <p className="rounded-lg bg-white p-4 text-sm text-slate-600">Loading rooms...</p>
            ) : rooms.length === 0 ? (
              <p className="rounded-lg bg-white p-4 text-sm text-slate-600">No room found for selected vessel.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {rooms.map((room) => {
                  const selected = assignedRoomIds.includes(room._id);
                  return (
                    <button
                      key={room._id}
                      onClick={() => toggleRoom(room._id)}
                      className={`rounded-xl border bg-white p-4 text-left shadow-sm ${selected ? "border-[#563795]" : "border-[#ddd4e5]"}`}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span>
                          <b>Room {room.roomNumber}</b>
                          <span className="mt-1 block text-sm">{room.roomType} · {room.maxCapacity} guests</span>
                          <span className="mt-1 block text-xs text-emerald-700">Initial tour status: Available</span>
                        </span>
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${selected ? "border-[#563795] bg-[#563795] text-white" : "border-slate-300 bg-white"}`}>
                          {selected && <Check size={15} />}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Tour note" className="rounded-xl border border-[#d8cfdc] bg-white px-4 py-3 outline-none" />

          <button
            onClick={() => saveTour.mutate()}
            disabled={!activeVesselId || !effectiveTourName.trim() || assignedRoomIds.length === 0 || saveTour.isPending}
            className="flex items-center justify-center gap-3 rounded-lg bg-[#563795] py-4 font-semibold text-white disabled:opacity-60"
          >
            <Save size={20} /> {saveTour.isPending ? "Saving..." : editingTourId ? "Update Tour" : "Save Tour"}
          </button>
        </main>

        <aside className="h-max rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Scheduled Tours</h2>
          <div className="mt-4 grid gap-3">
            {tours.length === 0 ? (
              <p className="text-sm text-slate-500">No tours yet.</p>
            ) : tours.map((tour) => (
              <article key={tour._id} className="rounded-lg border border-slate-100 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{tour.title}</p>
                    <p className="text-xs text-slate-500">{tour.checkIn.slice(0, 10)} → {tour.checkOut.slice(0, 10)}</p>
                    <p className="text-xs text-slate-500">{tour.roomIds.length} rooms assigned</p>
                  </div>
                  <button onClick={() => deleteTour.mutate(tour._id)} className="text-red-600"><Trash2 size={16} /></button>
                </div>
                <button onClick={() => loadTour(tour)} className="mt-3 w-full rounded-lg border border-[#d8cfdc] py-2 text-sm font-bold text-[#32157c]">Edit</button>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function selectedVesselName(boat?: Houseboat) {
  return boat?.name || "";
}
