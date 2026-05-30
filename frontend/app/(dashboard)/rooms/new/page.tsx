"use client";

import Image from "next/image";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Camera,
  Check,
  Grid2X2,
  Info,
  Minus,
  Plus,
  Sailboat,
  Snowflake,
  Tv,
  WalletCards,
} from "lucide-react";
import { roomApi } from "@/lib/api";

const categories = [
  { label: "Deluxe", value: "double" },
  { label: "Premium", value: "vip" },
  { label: "Suite", value: "family" },
];

const amenityOptions = [
  { key: "Full A/C", icon: Snowflake },
  { key: "Private Balcony", icon: BedDouble },
  { key: "Attached Bath", icon: Bath },
  { key: "Smart TV", icon: Tv },
];

export default function AddRoomPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [roomNumber, setRoomNumber] = useState("");
  const [roomType, setRoomType] = useState("double");
  const [basePrice, setBasePrice] = useState("12500");
  const [extraPersonPrice, setExtraPersonPrice] = useState("1500");
  const [maxCapacity, setMaxCapacity] = useState(2);
  const [amenities, setAmenities] = useState<string[]>(["Full A/C", "Attached Bath"]);
  const [imageUrls, setImageUrls] = useState(
    "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=900&q=80"
  );

  const mutation = useMutation({
    mutationFn: () =>
      roomApi.create({
        roomNumber,
        roomType,
        basePrice: Number(basePrice),
        extraPersonPrice: Number(extraPersonPrice),
        maxCapacity,
        amenities,
        imageUrls: imageUrls.split("\n").map((url) => url.trim()).filter(Boolean),
        description: `${categories.find((item) => item.value === roomType)?.label || "Room"} cabin for 2D / 1N tours.`,
      }),
    onSuccess: () => {
      toast.success("Room added successfully.");
      qc.invalidateQueries({ queryKey: ["rooms"] });
      router.push("/rooms");
    },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not add room"),
  });

  const canSave = roomNumber.trim() && Number(basePrice) > 0;

  const toggleAmenity = (key: string) => {
    setAmenities((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };

  return (
    <div className="min-h-screen bg-[#fbf5ff] px-4 pb-28 pt-4 text-[#151020]">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => router.back()} className="min-h-0"><ArrowLeft size={22} /></button>
        <h1 className="text-lg font-bold">Add New Room</h1>
        <span className="text-xl">⋮</span>
      </div>

      <section className="relative overflow-hidden rounded-lg">
        <Image
          src={imageUrls.split("\n")[0] || "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=900&q=80"}
          alt="Room preview"
          width={480}
          height={260}
          className="h-48 w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <button className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-black/45 px-4 py-3 text-sm font-bold text-white backdrop-blur">
          <Camera size={20} /> Upload Room Photos
        </button>
      </section>

      <section className="mt-7">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-medium"><Info size={20} /> Basic Details</h2>
        <input
          value={roomNumber}
          onChange={(event) => setRoomNumber(event.target.value)}
          placeholder="Room Name or Number"
          className="h-16 w-full rounded-lg border-2 border-[#c8bdcf] bg-transparent px-5 text-base outline-none focus:border-[#563795]"
        />
        <p className="mt-5 text-xs font-semibold uppercase tracking-widest">Category</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => setRoomType(category.value)}
              className={`rounded-full border-2 py-3 text-sm font-bold ${roomType === category.value ? "border-[#563795] bg-[#6b4caf] text-white" : "border-[#c8bdcf] bg-transparent text-slate-700"}`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-[#e2d9e7] bg-[#eee7f4] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-medium"><WalletCards size={21} /> Base Pricing</h2>
          <span className="text-xs font-bold">2D / 1N TRIP</span>
        </div>
        <label className="block rounded-lg border-2 border-slate-600 bg-white px-4 py-3">
          <span className="text-xs text-slate-500">Base Price (BDT)</span>
          <span className="mt-1 flex items-center justify-between">
            <input value={basePrice} onChange={(event) => setBasePrice(event.target.value)} type="number" className="w-full bg-transparent text-3xl font-bold outline-none" />
            <span className="text-sm text-slate-600">per night</span>
          </span>
        </label>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-white/70 p-4">
            <p className="text-xs uppercase tracking-widest">Capacity</p>
            <div className="mt-3 flex items-center gap-4">
              <button onClick={() => setMaxCapacity(Math.max(1, maxCapacity - 1))} className="flex h-8 w-8 items-center justify-center rounded-md bg-[#6b4caf] text-white"><Minus size={16} /></button>
              <span className="text-2xl font-semibold">{maxCapacity}</span>
              <button onClick={() => setMaxCapacity(maxCapacity + 1)} className="flex h-8 w-8 items-center justify-center rounded-md bg-[#6b4caf] text-white"><Plus size={16} /></button>
            </div>
          </div>
          <label className="rounded-lg bg-white/70 p-4">
            <span className="text-xs uppercase tracking-widest">Extras</span>
            <input value={extraPersonPrice} onChange={(event) => setExtraPersonPrice(event.target.value)} type="number" className="mt-2 w-full bg-transparent text-2xl font-medium outline-none" />
            <span className="text-[10px] uppercase text-slate-500">per child/night</span>
          </label>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-medium"><Grid2X2 size={20} /> Amenities</h2>
        <div className="grid grid-cols-2 gap-3">
          {amenityOptions.map(({ key, icon: Icon }) => {
            const selected = amenities.includes(key);
            return (
              <button key={key} onClick={() => toggleAmenity(key)} className="flex items-center gap-3 rounded-lg bg-white/50 p-4 text-left">
                <span className={`flex h-5 w-5 items-center justify-center rounded border ${selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-500"}`}>
                  {selected && <Check size={14} />}
                </span>
                <Icon size={18} />
                <span className="text-sm">{key}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-medium">Placement</h2>
        <div className="rounded-xl border-2 border-dashed border-[#c8bdcf] p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#dfd0ff] text-[#32157c]"><Sailboat size={23} /></span>
          <p className="mt-4 font-bold">Assign to Houseboat</p>
          <p className="mt-1 text-sm text-slate-700">Selected: Your active fleet vessel</p>
          <p className="mt-4 text-xs font-bold uppercase tracking-widest">Change Vessel ›</p>
        </div>
      </section>

      <label className="mt-6 block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-widest">Image URLs</span>
        <textarea value={imageUrls} onChange={(event) => setImageUrls(event.target.value)} rows={3} className="input" />
      </label>

      <div className="mt-8 grid gap-4">
        <button
          onClick={() => mutation.mutate()}
          disabled={!canSave || mutation.isPending}
          className="rounded-lg bg-[#563795] py-4 text-lg font-bold text-white shadow-lg disabled:bg-white disabled:text-white disabled:opacity-70"
        >
          {mutation.isPending ? "Saving..." : "Save Room Details"}
        </button>
        <button
          onClick={() => {
            mutation.mutate();
            setRoomNumber("");
          }}
          disabled={!canSave || mutation.isPending}
          className="rounded-lg border border-[#d8cfdc] bg-transparent py-4 text-lg font-bold"
        >
          Save & Add Another
        </button>
      </div>
    </div>
  );
}
