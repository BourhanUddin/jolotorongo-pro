'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomApi } from '@/lib/api';
import { useState } from 'react';
import { PageLoader, EmptyState, Modal, Field, Spinner, SectionHeader } from '@/components/ui';
import toast from 'react-hot-toast';
import { Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import type { Room } from '@/types';
import Image from 'next/image';
import Link from 'next/link';

const TYPES = ['single','double','family','vip','dormitory'];

export default function RoomsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [form, setForm] = useState({ roomNumber:'', roomType:'double', acRoomPrice:'', nonAcRoomPrice:'', extraPersonPrice:'0', maxCapacity:'2', description:'', amenities:'', services:'', imageUrls:'' });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const up = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const { data, isLoading } = useQuery({ queryKey: ['rooms'], queryFn: () => roomApi.list() });
  const rooms: Room[] = data?.data?.data?.rooms || [];

  const openEdit = (r: Room) => { setEditing(r); setImageFiles([]); setForm({ roomNumber: r.roomNumber, roomType: r.roomType, acRoomPrice: String(r.acRoomPrice || r.basePrice), nonAcRoomPrice: String(r.nonAcRoomPrice || r.basePrice), extraPersonPrice: String(r.extraPersonPrice), maxCapacity: String(r.maxCapacity), description: r.description, amenities: r.amenities.join(', '), services: (r.services || []).join(', '), imageUrls: (r.images || []).join('\n') }); setShowModal(true); };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, acRoomPrice: Number(form.acRoomPrice), nonAcRoomPrice: Number(form.nonAcRoomPrice), basePrice: Number(form.acRoomPrice), extraPersonPrice: Number(form.extraPersonPrice), maxCapacity: Number(form.maxCapacity), amenities: form.amenities.split(',').map(a => a.trim()).filter(Boolean), services: form.services.split(',').map(a => a.trim()).filter(Boolean), imageUrls: form.imageUrls.split('\n').map(url => url.trim()).filter(Boolean) };
      if (imageFiles.length > 0) {
        const fd = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          fd.append(key, Array.isArray(value) ? JSON.stringify(value) : String(value));
        });
        imageFiles.forEach(file => fd.append('images', file));
        return editing ? roomApi.update(editing._id, fd) : roomApi.create(fd);
      }
      return editing ? roomApi.update(editing._id, payload) : roomApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'রুম আপডেট হয়েছে' : 'রুম তৈরি হয়েছে'); qc.invalidateQueries({ queryKey: ['rooms'] }); setShowModal(false); },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'ত্রুটি'),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => roomApi.toggle(id),
    onSuccess: () => { toast.success('রুমের অবস্থা পরিবর্তন হয়েছে'); qc.invalidateQueries({ queryKey: ['rooms'] }); },
  });

  if (isLoading) return <PageLoader />;

  const statusColor = (s: string) => ({ available: 'bg-emerald-100 text-emerald-700', on_hold: 'bg-amber-100 text-amber-700', booked: 'bg-blue-100 text-blue-700', maintenance: 'bg-slate-100 text-slate-600' }[s] || 'bg-slate-100');
  const statusLabel = (s: string) => ({ available: 'উপলব্ধ', on_hold: 'হোল্ড', booked: 'বুক', maintenance: 'মেরামত' }[s] || s);

  return (
    <div className="page fade-in">
      <SectionHeader title={`🛏️ রুম (${rooms.length})`} action={
        <Link href="/rooms/new" className="btn btn-primary text-sm">
          <Plus size={15} /> নতুন রুম
        </Link>
      } />

      {rooms.length === 0 ? (
        <EmptyState icon="🛏️" title="কোনো রুম নেই" desc="প্রথম রুম তৈরি করুন" />
      ) : (
        <div className="flex flex-col gap-3">
          {rooms.map((r) => (
            <div key={r._id} className="card">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-slate-800">রুম {r.roomNumber}</p>
                    <span className={`badge text-[10px] ${statusColor(r.status)}`}>{statusLabel(r.status)}</span>
                  </div>
                  <p className="text-xs text-slate-500 capitalize">{r.roomType} · সর্বোচ্চ {r.maxCapacity} জন</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sky-600">AC ৳{(r.acRoomPrice || r.basePrice).toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Non-AC ৳{(r.nonAcRoomPrice || r.basePrice).toLocaleString()}</p>
                  {r.extraPersonPrice > 0 && <p className="text-xs text-slate-500">+৳{r.extraPersonPrice}/জন</p>}
                </div>
              </div>
              {r.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
              {r.amenities.map((a, i) => <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{a}</span>)}
                </div>
              )}
              {(r.services || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {r.services.map((a, i) => <span key={i} className="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full">{a}</span>)}
                </div>
              )}
              {r.images?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 mb-2">
                  {r.images.slice(0, 4).map((src, i) => (
                    <Image key={src + i} src={src} alt={`Room ${r.roomNumber}`} width={80} height={56} className="h-14 w-20 object-cover rounded-md border border-slate-100" />
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <button onClick={() => openEdit(r)} className="btn btn-outline flex-1 text-xs">সম্পাদনা</button>
                <button onClick={() => toggleMutation.mutate(r._id)} disabled={toggleMutation.isPending} className={`btn flex-1 text-xs flex items-center justify-center gap-1 ${r.isActive ? 'btn-outline text-amber-600 border-amber-200' : 'btn-success'}`}>
                  {r.isActive ? <><ToggleLeft size={14} />নিষ্ক্রিয়</> : <><ToggleRight size={14} />সক্রিয়</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'রুম সম্পাদনা' : 'নতুন রুম তৈরি করুন'}>
        <div className="flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="রুম নম্বর" required>
              <input className="input" placeholder="A1" value={form.roomNumber} onChange={e => up('roomNumber', e.target.value)} />
            </Field>
            <Field label="ধরন / Type">
              <select className="input" value={form.roomType} onChange={e => up('roomType', e.target.value)}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="AC Room Price (৳)" required>
              <input type="number" className="input" placeholder="2500" value={form.acRoomPrice} onChange={e => up('acRoomPrice', e.target.value)} />
            </Field>
            <Field label="Non-AC Room Price (৳)" required>
              <input type="number" className="input" placeholder="2000" value={form.nonAcRoomPrice} onChange={e => up('nonAcRoomPrice', e.target.value)} />
            </Field>
          </div>
          <Field label="অতিরিক্ত/জন (৳)">
            <input type="number" className="input" placeholder="500" value={form.extraPersonPrice} onChange={e => up('extraPersonPrice', e.target.value)} />
          </Field>
          <Field label="সর্বোচ্চ ধারণক্ষমতা">
            <input type="number" className="input" placeholder="2" value={form.maxCapacity} onChange={e => up('maxCapacity', e.target.value)} />
          </Field>
          <Field label="সুযোগ-সুবিধা (কমা দিয়ে)">
            <input className="input" placeholder="AC, Attached Bath, TV" value={form.amenities} onChange={e => up('amenities', e.target.value)} />
          </Field>
          <Field label="সার্ভিস (কমা দিয়ে)">
            <input className="input" placeholder="Breakfast, Guide, Life Jacket" value={form.services} onChange={e => up('services', e.target.value)} />
          </Field>
          <Field label="ছবির URL (প্রতি লাইনে একটি)">
            <textarea className="input" rows={2} placeholder="https://..." value={form.imageUrls} onChange={e => up('imageUrls', e.target.value)} />
          </Field>
          <Field label="ছবি আপলোড">
            <input type="file" accept="image/*" multiple className="input text-sm" onChange={e => setImageFiles(Array.from(e.target.files || []))} />
          </Field>
          <Field label="বিবরণ">
            <textarea className="input" rows={2} placeholder="রুমের বিবরণ..." value={form.description} onChange={e => up('description', e.target.value)} />
          </Field>
          <div className="flex gap-2 mt-1">
            <button onClick={() => setShowModal(false)} className="btn btn-outline flex-1">বাতিল</button>
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.roomNumber || !form.acRoomPrice || !form.nonAcRoomPrice} className="btn btn-primary flex-1">
              {saveMutation.isPending ? <Spinner size="sm" /> : (editing ? 'আপডেট' : 'তৈরি করুন')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
