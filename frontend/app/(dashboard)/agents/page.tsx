'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentApi, bookingRequestApi, roomApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useState } from 'react';
import { PageLoader, EmptyState, StatusBadge, Modal, Field, Spinner, InfoCard } from '@/components/ui';
import toast from 'react-hot-toast';
import type { Houseboat, User, JoinRequest, BookingRequest, Room } from '@/types';
import { Check, X, CalendarCheck } from 'lucide-react';

const addOneDay = (date: string) => {
  if (!date) return '';
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
};

const todayInput = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
};

export default function AgentsPage() {
  const { user } = useAuthStore();
  if (user?.role === 'boat_owner') return <OwnerAgentsView />;
  return <AgentHouseboatView />;
}

// ─── Boat Owner: see incoming join requests ───────────────────
function OwnerAgentsView() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['incoming-requests'], queryFn: () => agentApi.incomingRequests() });
  const { data: bookingReqData, isLoading: bookingReqLoading } = useQuery({ queryKey: ['incoming-booking-requests'], queryFn: () => bookingRequestApi.incoming() });
  const requests: JoinRequest[] = data?.data?.data?.requests || [];
  const bookingRequests: BookingRequest[] = bookingReqData?.data?.data?.requests || [];

  const approveMutation = useMutation({
    mutationFn: (id: string) => agentApi.approveRequest(id),
    onSuccess: () => { toast.success('এজেন্ট অনুমোদিত! ✅'); qc.invalidateQueries({ queryKey: ['incoming-requests'] }); },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'ত্রুটি'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => agentApi.rejectRequest(id, { reason: 'এই মুহূর্তে আসন নেই' }),
    onSuccess: () => { toast.success('প্রত্যাখ্যান করা হয়েছে'); qc.invalidateQueries({ queryKey: ['incoming-requests'] }); },
  });

  const approveBookingRequest = useMutation({
    mutationFn: (id: string) => bookingRequestApi.approve(id),
    onSuccess: () => {
      toast.success('বুকিং রিকোয়েস্ট অনুমোদিত হয়েছে');
      qc.invalidateQueries({ queryKey: ['incoming-booking-requests'] });
    },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'ত্রুটি'),
  });

  const rejectBookingRequest = useMutation({
    mutationFn: (id: string) => bookingRequestApi.reject(id, { reason: 'স্লট উপলব্ধ নয়' }),
    onSuccess: () => {
      toast.success('বুকিং রিকোয়েস্ট প্রত্যাখ্যাত হয়েছে');
      qc.invalidateQueries({ queryKey: ['incoming-booking-requests'] });
    },
  });

  if (isLoading || bookingReqLoading) return <PageLoader />;

  return (
    <div className="page fade-in">
      <h1 className="font-bold text-slate-800 text-lg mb-4">🤝 এজেন্ট রিকোয়েস্ট</h1>
      {bookingRequests.length > 0 && (
        <div className="mb-5">
          <h2 className="section-title">📩 বুকিং রিকোয়েস্ট</h2>
          <div className="flex flex-col gap-3">
            {bookingRequests.map((r) => {
              const agent = typeof r.agentId === 'object' ? r.agentId as User : null;
              const boat = typeof r.boatId === 'object' ? r.boatId as Houseboat : null;
              const room = typeof r.roomId === 'object' ? r.roomId as Room : null;
              return (
                <div key={r._id} className="card">
                  <div className="flex justify-between gap-3 mb-3">
                    <div>
                      <p className="font-bold text-slate-800">{boat?.name || '—'}</p>
                      <p className="text-xs text-slate-500">রুম {room?.roomNumber || '—'} · {r.guestCount} জন</p>
                      <p className="text-xs text-slate-500">{new Date(r.tripDates.checkIn).toLocaleDateString('bn-BD')} → {new Date(r.tripDates.checkOut).toLocaleDateString('bn-BD')}</p>
                      <p className="text-xs text-slate-400">এজেন্ট: {agent?.name || '—'}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={r.status} />
                      <p className="text-sm font-bold text-slate-800 mt-2">৳{r.totalPrice.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => rejectBookingRequest.mutate(r._id)} disabled={rejectBookingRequest.isPending} className="btn btn-outline flex-1 text-red-500 border-red-200 text-xs">
                      <X size={14} /> প্রত্যাখ্যান
                    </button>
                    <button onClick={() => approveBookingRequest.mutate(r._id)} disabled={approveBookingRequest.isPending} className="btn btn-success flex-1 text-xs">
                      {approveBookingRequest.isPending ? <Spinner size="sm" /> : <><Check size={14} /> অনুমোদন</>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {requests.length === 0 && bookingRequests.length === 0 ? (
        <EmptyState icon="🤝" title="কোনো রিকোয়েস্ট নেই" desc="এজেন্টরা যোগ বা বুকিং রিকোয়েস্ট করলে এখানে দেখাবে" />
      ) : requests.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="section-title">যোগ দেওয়ার আবেদন</h2>
          {requests.map((r) => {
            const agent = typeof r.agentId === 'object' ? r.agentId as User : null;
            return (
              <div key={r._id} className="card">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-slate-800">{agent?.name || '—'}</p>
                    <p className="text-xs text-slate-500">{agent?.email}</p>
                    <p className="text-xs text-slate-500">{agent?.phone}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                {r.message && <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2 mb-3 italic">&ldquo;{r.message}&rdquo;</p>}
                {r.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => rejectMutation.mutate(r._id)} disabled={rejectMutation.isPending} className="btn btn-outline flex-1 text-red-500 border-red-200 text-xs">
                      <X size={14} /> প্রত্যাখ্যান
                    </button>
                    <button onClick={() => approveMutation.mutate(r._id)} disabled={approveMutation.isPending} className="btn btn-success flex-1 text-xs">
                      {approveMutation.isPending ? <Spinner size="sm" /> : <><Check size={14} /> অনুমোদন</>}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Agent: browse houseboats + send booking request ──────────
function AgentHouseboatView() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Houseboat | null>(null);
  const [message, setMessage] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [roomId, setRoomId] = useState('');
  const [guestCount, setGuestCount] = useState('1');
  const isVerified = user?.isApprovedByAdmin && user?.status === 'active';

  const { data, isLoading } = useQuery({ queryKey: ['houseboats'], queryFn: () => agentApi.listHouseboats() });
  const { data: myReqData } = useQuery({ queryKey: ['my-join-requests'], queryFn: () => agentApi.myJoinRequests() });
  const { data: myBookingReqData } = useQuery({ queryKey: ['my-booking-requests'], queryFn: () => bookingRequestApi.my(), enabled: isVerified });
  const { data: availabilityData } = useQuery({
    queryKey: ['boat-room-availability', selected?._id, checkIn, checkOut],
    queryFn: () => roomApi.availability(selected!._id, checkIn, checkOut),
    enabled: !!selected?._id && !!checkIn && !!checkOut && isVerified,
  });

  const houseboats: Houseboat[] = data?.data?.data?.houseboats || [];
  const myRequests: JoinRequest[] = myReqData?.data?.data?.requests || [];
  const myBookingRequests: BookingRequest[] = myBookingReqData?.data?.data?.requests || [];
  const availableRooms: Room[] = availabilityData?.data?.data?.rooms || [];
  const joinedId = typeof user?.joinedHouseboatId === 'object' ? user?.joinedHouseboatId?._id : user?.joinedHouseboatId;

  const bookingRequestMutation = useMutation({
    mutationFn: () => bookingRequestApi.create({
      boatId: selected!._id,
      roomId,
      checkIn,
      checkOut,
      guestCount: Number(guestCount) || 1,
      note: message,
    }),
    onSuccess: () => {
      toast.success('বুকিং রিকোয়েস্ট পাঠানো হয়েছে');
      qc.invalidateQueries({ queryKey: ['my-booking-requests'] });
      setShowModal(false);
      setMessage('');
      setRoomId('');
    },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'ত্রুটি'),
  });

  if (isLoading) return <PageLoader />;

  const getStatus = (hbId: string) => myRequests.find(r => {
    const rid = typeof r.houseboatId === 'object' ? r.houseboatId._id : r.houseboatId;
    return rid === hbId;
  });
  const getBookingStatus = (hbId: string) => myBookingRequests.find(r => {
    const bid = typeof r.boatId === 'object' ? r.boatId._id : r.boatId;
    return bid === hbId && r.status === 'pending';
  });

  const openBookingRequest = (houseboat: Houseboat) => {
    setSelected(houseboat);
    setCheckIn('');
    setCheckOut('');
    setRoomId('');
    setGuestCount('1');
    setMessage('');
    setShowModal(true);
  };

  return (
    <div className="page fade-in">
      <h1 className="font-bold text-slate-800 text-lg mb-4">🛥️ হাউসবোট তালিকা</h1>

      {!isVerified && (
        <div className="mb-4">
          <InfoCard type="warning" message="আপনার অ্যাকাউন্ট এখনো ভেরিফাই হয়নি। ভেরিফাইড হলে যোগ দেওয়ার আবেদন করতে পারবেন।" />
        </div>
      )}

      {joinedId && (
        <div className="mb-4">
          <InfoCard type="info" message="আপনি ইতিমধ্যে একটি হাউসবোটে যুক্ত আছেন।" />
        </div>
      )}

      {houseboats.length === 0 ? (
        <EmptyState icon="🛥️" title="কোনো হাউসবোট নেই" desc="সক্রিয় হাউসবোট পাওয়া যায়নি" />
      ) : (
        <div className="flex flex-col gap-3">
          {houseboats.map((h) => {
            const req = getStatus(h._id);
            const bookingReq = getBookingStatus(h._id);
            const owner = typeof h.ownerId === 'object' ? h.ownerId as User : null;
            const isJoined = joinedId === h._id;
            return (
              <div key={h._id} className="card">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-slate-800">{h.name}</p>
                    <p className="text-xs text-slate-500">📍 {h.location}</p>
                    {owner && <p className="text-xs text-slate-500">👤 {owner.name} · {owner.phone}</p>}
                    <p className="text-xs text-slate-400">👥 {h.approvedAgents?.length || 0} জন এজেন্ট</p>
                  </div>
                  {isJoined ? (
                    <span className="badge badge-green">যুক্ত আছি</span>
                  ) : req ? (
                    <StatusBadge status={req.status} />
                  ) : null}
                </div>
                {isVerified && (
                  <button onClick={() => openBookingRequest(h)} disabled={!!bookingReq} className="btn btn-outline btn-full text-sm text-sky-600 border-sky-200 mt-2">
                    <CalendarCheck size={14} /> {bookingReq ? 'বুকিং রিকোয়েস্ট পেন্ডিং' : 'বুকিং রিকোয়েস্ট পাঠান'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Booking request modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={`${selected?.name || ''} বুকিং রিকোয়েস্ট`}>
        <div className="flex flex-col gap-4">
          <InfoCard type="info" message="২ দিন ১ রাতের ট্রিপ তারিখ বেছে রুম সিলেক্ট করুন। মালিক অনুমোদন করলে বুকিং কনফার্ম হবে।" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="চেক-ইন" required>
              <input type="date" className="input" min={todayInput()} value={checkIn} onChange={e => { setCheckIn(e.target.value); setCheckOut(addOneDay(e.target.value)); setRoomId(''); }} />
            </Field>
            <Field label="চেক-আউট">
              <input type="date" className="input" value={checkOut} readOnly />
            </Field>
          </div>
          <Field label="অতিথি সংখ্যা">
            <input type="number" className="input" min="1" value={guestCount} onChange={e => setGuestCount(e.target.value)} />
          </Field>
          {checkIn && (
            <Field label="উপলব্ধ রুম" required>
              <div className="flex flex-col gap-2">
                {availableRooms.length === 0 ? (
                  <p className="text-sm text-slate-500">এই তারিখে কোনো রুম পাওয়া যায়নি</p>
                ) : availableRooms.map(room => {
                  const selectable = room.availabilityState === 'available';
                  return (
                    <button
                      type="button"
                      key={room._id}
                      disabled={!selectable}
                      onClick={() => setRoomId(room._id)}
                      className={`rounded-lg border p-3 text-left ${roomId === room._id ? 'border-sky-500 bg-sky-50' : selectable ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50 opacity-70'}`}
                    >
                      <div className="flex justify-between gap-2">
                        <span className="font-semibold text-sm">রুম {room.roomNumber} ({room.roomType})</span>
                        <span className="font-bold text-sm">৳{room.basePrice.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{room.maxCapacity} জন · {room.availabilityState === 'available' ? 'উপলব্ধ' : 'অনুপলব্ধ'}</p>
                    </button>
                  );
                })}
              </div>
            </Field>
          )}
          <Field label="বার্তা (ঐচ্ছিক)">
            <textarea className="input" rows={3} placeholder="গ্রাহকের চাহিদা বা নোট..." value={message} onChange={e => setMessage(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <button onClick={() => setShowModal(false)} className="btn btn-outline flex-1">বাতিল</button>
            <button onClick={() => bookingRequestMutation.mutate()} disabled={bookingRequestMutation.isPending || !roomId || !checkIn} className="btn btn-primary flex-1">
              {bookingRequestMutation.isPending ? <Spinner size="sm" /> : 'রিকোয়েস্ট পাঠান'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
