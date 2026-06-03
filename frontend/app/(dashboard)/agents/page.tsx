'use client';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentApi, bookingRequestApi, houseboatApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useState } from 'react';
import { PageLoader, EmptyState, StatusBadge, Modal, Field, Spinner, InfoCard } from '@/components/ui';
import toast from 'react-hot-toast';
import type { Houseboat, User, JoinRequest, BookingRequest, Room, Tour } from '@/types';
import { Check, X, Plus, UserRoundPlus } from 'lucide-react';

const fallbackRoomImage = 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=900&q=80';

const addOneDay = (date: string) => {
  if (!date) return '';
  const [year, month, day] = date.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + 1);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
};

const roomImage = (room: Room) => room.images?.[0] || fallbackRoomImage;

const roomClimate = (room: Room): 'ac' | 'non_ac' | 'both' => {
  if (room.climate) return room.climate;
  if ((room.acRoomPrice || 0) > 0 && (room.nonAcRoomPrice || 0) > 0) return 'both';
  return (room.nonAcRoomPrice || 0) > 0 ? 'non_ac' : 'ac';
};

const roomPrice = (room: Room, mode: 'ac' | 'non_ac') => {
  const primary = mode === 'ac' ? room.acRoomPrice : room.nonAcRoomPrice;
  return primary > 0 ? primary : room.basePrice;
};

type AvailableGroup = {
  boat: Houseboat;
  tour: Tour;
  rooms: Room[];
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
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['incoming-requests'], queryFn: () => agentApi.incomingRequests() });
  const { data: bookingReqData, isLoading: bookingReqLoading } = useQuery({ queryKey: ['incoming-booking-requests'], queryFn: () => bookingRequestApi.incoming() });
  const { data: teamData, isLoading: teamLoading } = useQuery({ queryKey: ['owner-team'], queryFn: () => houseboatApi.getMy() });
  const requests: JoinRequest[] = data?.data?.data?.requests || [];
  const bookingRequests: BookingRequest[] = bookingReqData?.data?.data?.requests || [];
  const managers: User[] = teamData?.data?.data?.managers || [];
  const approvedAgents: User[] = (teamData?.data?.data?.houseboat?.approvedAgents || []).filter((agent: string | User): agent is User => typeof agent === 'object');

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

  const createManager = useMutation({
    mutationFn: () => houseboatApi.createManager({
      name: managerName,
      email: managerEmail,
      phone: managerPhone,
      password: managerPassword,
    }),
    onSuccess: () => {
      toast.success('ম্যানেজার তৈরি হয়েছে');
      qc.invalidateQueries({ queryKey: ['owner-team'] });
      setShowManagerModal(false);
      setManagerName('');
      setManagerEmail('');
      setManagerPhone('');
      setManagerPassword('');
    },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'ত্রুটি'),
  });

  if (isLoading || bookingReqLoading || teamLoading) return <PageLoader />;

  return (
    <div className="page fade-in">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="font-bold text-slate-800 text-lg">🤝 টিম ম্যানেজমেন্ট</h1>
          <p className="text-xs text-slate-500">এজেন্ট রিকোয়েস্ট ও ম্যানেজার অ্যাকাউন্ট</p>
        </div>
        <button onClick={() => setShowManagerModal(true)} className="btn btn-primary text-xs px-3">
          <Plus size={14} /> ম্যানেজার
        </button>
      </div>

      <div className="mb-5">
        <h2 className="section-title">🧭 ম্যানেজার</h2>
        {managers.length === 0 ? (
          <div className="card text-sm text-slate-500">এখনো কোনো ম্যানেজার নেই।</div>
        ) : (
          <div className="flex flex-col gap-3">
            {managers.map((manager) => (
              <div key={manager._id} className="card">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-800">{manager.name}</p>
                    <p className="text-xs text-slate-500">{manager.email}</p>
                    <p className="text-xs text-slate-500">{manager.phone || 'ফোন নেই'}</p>
                  </div>
                  <StatusBadge status={manager.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {approvedAgents.length > 0 && (
        <div className="mb-5">
          <h2 className="section-title">✅ অনুমোদিত এজেন্ট</h2>
          <div className="flex flex-col gap-3">
            {approvedAgents.map((agent) => (
              <div key={agent._id} className="card">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-800">{agent.name}</p>
                    <p className="text-xs text-slate-500">{agent.email}</p>
                    <p className="text-xs text-slate-500">{agent.phone || 'ফোন নেই'}</p>
                  </div>
                  <StatusBadge status={agent.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                      <p className="text-xs text-slate-600 mt-2">গ্রাহক: {r.customerName || '—'} · {r.customerPhone || '—'}</p>
                      {r.customerAddress && <p className="text-xs text-slate-500">ঠিকানা: {r.customerAddress}</p>}
                      {r.note && <p className="text-xs text-slate-500 mt-1">নোট: {r.note}</p>}
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

      <Modal open={showManagerModal} onClose={() => setShowManagerModal(false)} title="ম্যানেজার তৈরি করুন">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!managerName.trim() || !managerEmail.trim() || !managerPassword.trim()) {
              toast.error('নাম, ইমেইল, পাসওয়ার্ড দরকার');
              return;
            }
            createManager.mutate();
          }}
        >
          <Field label="নাম" required>
            <input className="input" value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="ম্যানেজারের নাম" />
          </Field>
          <Field label="ইমেইল" required>
            <input className="input" type="email" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} placeholder="manager@example.com" />
          </Field>
          <Field label="ফোন">
            <input className="input" value={managerPhone} onChange={(e) => setManagerPhone(e.target.value)} placeholder="017..." />
          </Field>
          <Field label="অস্থায়ী পাসওয়ার্ড" required>
            <input className="input" type="password" value={managerPassword} onChange={(e) => setManagerPassword(e.target.value)} placeholder="কমপক্ষে ৬ অক্ষর" />
          </Field>
          <button disabled={createManager.isPending} className="btn btn-primary btn-full">
            {createManager.isPending ? <Spinner size="sm" /> : <><UserRoundPlus size={16} /> ম্যানেজার তৈরি</>}
          </button>
        </form>
      </Modal>
    </div>
  );
}

// ─── Agent: browse houseboats + send booking request ──────────
function AgentHouseboatView() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedBoat, setSelectedBoat] = useState<Houseboat | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [message, setMessage] = useState('');
  const [checkIn, setCheckIn] = useState(todayInput());
  const [checkOut, setCheckOut] = useState(addOneDay(todayInput()));
  const [pricingMode, setPricingMode] = useState<'ac' | 'non_ac'>('ac');
  const [guestCount, setGuestCount] = useState('1');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [joinRequestBoatId, setJoinRequestBoatId] = useState('');
  const isVerified = user?.isApprovedByAdmin && user?.status === 'active';

  const { data, isLoading } = useQuery({ queryKey: ['houseboats'], queryFn: () => agentApi.listHouseboats() });
  const { data: myReqData } = useQuery({ queryKey: ['my-join-requests'], queryFn: () => agentApi.myJoinRequests() });
  const { data: myBookingReqData } = useQuery({ queryKey: ['my-booking-requests'], queryFn: () => bookingRequestApi.my(), enabled: isVerified });

  const houseboats: Houseboat[] = data?.data?.data?.houseboats || [];
  const myRequests: JoinRequest[] = myReqData?.data?.data?.requests || [];
  const myBookingRequests: BookingRequest[] = myBookingReqData?.data?.data?.requests || [];
  const approvedBoatIds = new Set(
    myRequests
      .filter((r) => r.status === 'approved')
      .map((r) => typeof r.houseboatId === 'object' ? r.houseboatId._id : r.houseboatId)
  );
  const hasApprovedBoats = approvedBoatIds.size > 0;
  const { data: availabilityData, isLoading: availabilityLoading } = useQuery({
    queryKey: ['agent-approved-available-rooms', checkIn, checkOut],
    queryFn: () => agentApi.availableRooms({ checkIn, checkOut }),
    enabled: !!checkIn && !!checkOut && isVerified && hasApprovedBoats,
  });
  const availabilityGroups: AvailableGroup[] = availabilityData?.data?.data?.groups || [];

  const joinRequestMutation = useMutation({
    mutationFn: (houseboatId: string) => agentApi.sendJoinRequest({ houseboatId }),
    onMutate: (houseboatId) => setJoinRequestBoatId(houseboatId),
    onSuccess: () => {
      toast.success('যোগ দেওয়ার আবেদন পাঠানো হয়েছে');
      qc.invalidateQueries({ queryKey: ['my-join-requests'] });
    },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'ত্রুটি'),
    onSettled: () => setJoinRequestBoatId(''),
  });

  const bookingRequestMutation = useMutation({
    mutationFn: () => bookingRequestApi.create({
      boatId: selectedBoat!._id,
      roomId: selectedRoom!._id,
      checkIn,
      checkOut,
      guestCount: Number(guestCount) || 1,
      customerName,
      customerPhone,
      customerAddress,
      pricingMode,
      note: message,
    }),
    onSuccess: () => {
      toast.success('বুকিং রিকোয়েস্ট পাঠানো হয়েছে');
      qc.invalidateQueries({ queryKey: ['my-booking-requests'] });
      setShowModal(false);
      setMessage('');
      setSelectedBoat(null);
      setSelectedRoom(null);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
    },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'ত্রুটি'),
  });

  if (isLoading) return <PageLoader />;

  const getStatus = (hbId: string) => myRequests.find(r => {
    const rid = typeof r.houseboatId === 'object' ? r.houseboatId._id : r.houseboatId;
    return rid === hbId;
  });

  const openBookingRequest = (houseboat: Houseboat, room: Room) => {
    setSelectedBoat(houseboat);
    setSelectedRoom(room);
    setPricingMode(roomClimate(room) === 'non_ac' ? 'non_ac' : 'ac');
    setGuestCount('1');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
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

      {houseboats.length === 0 ? (
        <EmptyState icon="🛥️" title="কোনো হাউসবোট নেই" desc="সক্রিয় হাউসবোট পাওয়া যায়নি" />
      ) : (
        <div className="flex flex-col gap-3">
          {houseboats.map((h) => {
            const req = getStatus(h._id);
            const owner = typeof h.ownerId === 'object' ? h.ownerId as User : null;
            const isApproved = approvedBoatIds.has(h._id);
            const canRequestJoin = isVerified && !isApproved && (!req || req.status === 'rejected');
            return (
              <div key={h._id} className="card">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-slate-800">{h.name}</p>
                    <p className="text-xs text-slate-500">📍 {h.location}</p>
                    {owner && <p className="text-xs text-slate-500">👤 {owner.name} · {owner.phone}</p>}
                  </div>
                  {isApproved ? (
                    <span className="badge badge-green">অনুমোদিত</span>
                  ) : req ? (
                    <StatusBadge status={req.status} />
                  ) : null}
                </div>
                {canRequestJoin && (
                  <button onClick={() => joinRequestMutation.mutate(h._id)} disabled={joinRequestBoatId === h._id} className="btn btn-primary btn-full text-sm mt-2">
                    {joinRequestBoatId === h._id ? <Spinner size="sm" /> : 'এজেন্ট হতে আবেদন পাঠান'}
                  </button>
                )}
                {isVerified && !isApproved && req?.status === 'pending' && (
                  <p className="text-xs text-amber-600 mt-2">মালিকের অনুমোদনের জন্য অপেক্ষা করছে।</p>
                )}
                {isVerified && !isApproved && req?.status !== 'pending' && (
                  <p className="text-xs text-slate-500 mt-2">বুকিং রিকোয়েস্ট পাঠাতে এই বোটের অনুমোদিত এজেন্ট হতে হবে।</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isVerified && hasApprovedBoats && (
        <section className="mt-6">
          <div className="card">
            <h2 className="font-bold text-slate-800 mb-3">উপলব্ধ রুম খুঁজুন</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="চেক-ইন" required>
                <input type="date" className="input" min={todayInput()} value={checkIn} onChange={e => { setCheckIn(e.target.value); setCheckOut(addOneDay(e.target.value)); }} />
              </Field>
              <Field label="চেক-আউট">
                <input type="date" className="input" value={checkOut} readOnly />
              </Field>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4">
            {availabilityLoading ? (
              <div className="card flex items-center gap-2 text-sm text-slate-500"><Spinner size="sm" /> রুম খোঁজা হচ্ছে...</div>
            ) : availabilityGroups.length === 0 ? (
              <EmptyState icon="🛏️" title="কোনো উপলব্ধ রুম নেই" desc="এই তারিখে অনুমোদিত বোটে সক্রিয় ট্যুর/রুম পাওয়া যায়নি" />
            ) : availabilityGroups.map((group) => (
              <div key={group.boat._id} className="card">
                <div className="mb-3">
                  <p className="font-bold text-slate-800">{group.boat.name}</p>
                  <p className="text-xs text-slate-500">{group.tour.title} · {checkIn} → {checkOut}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {group.rooms.map((room) => (
                    <button key={room._id} onClick={() => openBookingRequest(group.boat, room)} className="overflow-hidden rounded-lg border border-emerald-200 bg-white text-left shadow-sm">
                      <span className="relative block h-28">
                        <Image src={roomImage(room)} alt={`Room ${room.roomNumber}`} fill sizes="(min-width: 640px) 45vw, 90vw" className="object-cover" />
                        <span className="absolute left-3 top-3 rounded-full bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white">উপলব্ধ</span>
                      </span>
                      <span className="block p-3">
                        <span className="block text-sm font-bold text-slate-800">রুম {room.roomNumber}</span>
                        <span className="mt-1 block text-xs capitalize text-slate-500">{room.roomType} · {room.maxCapacity} জন</span>
                        <span className="mt-2 block text-sm font-bold text-slate-800">৳{roomPrice(room, roomClimate(room) === 'non_ac' ? 'non_ac' : 'ac').toLocaleString()}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {isVerified && (
        <section className="mt-6">
          <h2 className="section-title">আমার বুকিং রিকোয়েস্ট ও কমিশন</h2>
          {myBookingRequests.length === 0 ? (
            <div className="card text-sm text-slate-500">এখনো কোনো বুকিং রিকোয়েস্ট নেই।</div>
          ) : (
            <div className="flex flex-col gap-3">
              {myBookingRequests.map((request) => {
                const boat = typeof request.boatId === 'object' ? request.boatId as Houseboat : null;
                const room = typeof request.roomId === 'object' ? request.roomId as Room : null;
                return (
                  <article key={request._id} className="card">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-800">{request.customerName || 'গ্রাহক'}</p>
                        <p className="text-xs text-slate-500">{boat?.name || 'বোট'} · রুম {room?.roomNumber || '—'}</p>
                        <p className="text-xs text-slate-500">{request.tripDates.checkIn.slice(0, 10)} → {request.tripDates.checkOut.slice(0, 10)}</p>
                        <p className="mt-1 text-xs font-semibold text-emerald-700">কমিশন: ৳{(request.agentCommission || 0).toLocaleString()}</p>
                      </div>
                      <StatusBadge status={request.status} />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Booking request modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={`${selectedBoat?.name || ''} বুকিং রিকোয়েস্ট`}>
        <div className="flex flex-col gap-4">
          <InfoCard type="info" message="আপনার রিকোয়েস্ট মালিক অনুমোদন করলে বুকিং কনফার্ম হবে।" />
          {selectedRoom && (
            <div className="overflow-hidden rounded-lg border border-slate-100 bg-white">
              <div className="relative h-28">
                <Image src={roomImage(selectedRoom)} alt={`Room ${selectedRoom.roomNumber}`} fill sizes="360px" className="object-cover" />
              </div>
              <p className="p-3 text-sm font-bold text-slate-800">রুম {selectedRoom.roomNumber} · {checkIn} → {checkOut}</p>
            </div>
          )}
          <Field label="অতিথি সংখ্যা">
            <input type="number" className="input" min="1" value={guestCount} onChange={e => setGuestCount(e.target.value)} />
          </Field>
          <Field label="গ্রাহকের নাম" required>
            <input className="input" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="যাত্রীর নাম" />
          </Field>
          <Field label="গ্রাহকের ফোন" required>
            <input className="input" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="মোবাইল নম্বর" />
          </Field>
          <Field label="গ্রাহকের ঠিকানা">
            <input className="input" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="ঐচ্ছিক" />
          </Field>
          {selectedRoom && roomClimate(selectedRoom) === 'both' && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setPricingMode('ac')} className={`rounded-lg border px-3 py-2 text-sm font-bold ${pricingMode === 'ac' ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200'}`}>AC</button>
              <button onClick={() => setPricingMode('non_ac')} className={`rounded-lg border px-3 py-2 text-sm font-bold ${pricingMode === 'non_ac' ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200'}`}>Non-AC</button>
            </div>
          )}
          <Field label="বার্তা (ঐচ্ছিক)">
            <textarea className="input" rows={3} placeholder="গ্রাহকের চাহিদা বা নোট..." value={message} onChange={e => setMessage(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <button onClick={() => setShowModal(false)} className="btn btn-outline flex-1">বাতিল</button>
            <button onClick={() => bookingRequestMutation.mutate()} disabled={bookingRequestMutation.isPending || !selectedRoom || !checkIn || !customerName.trim() || !customerPhone.trim()} className="btn btn-primary flex-1">
              {bookingRequestMutation.isPending ? <Spinner size="sm" /> : 'রিকোয়েস্ট পাঠান'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
