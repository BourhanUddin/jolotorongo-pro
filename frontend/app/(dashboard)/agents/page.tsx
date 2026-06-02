'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentApi, bookingRequestApi, houseboatApi, roomApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useState } from 'react';
import { PageLoader, EmptyState, StatusBadge, Modal, Field, Spinner, InfoCard } from '@/components/ui';
import toast from 'react-hot-toast';
import type { Houseboat, User, JoinRequest, BookingRequest, Room } from '@/types';
import { Check, X, CalendarCheck, Plus, UserRoundPlus } from 'lucide-react';

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
  const [selected, setSelected] = useState<Houseboat | null>(null);
  const [message, setMessage] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [roomId, setRoomId] = useState('');
  const [guestCount, setGuestCount] = useState('1');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const isVerified = user?.isApprovedByAdmin && user?.status === 'active';

  const { data, isLoading } = useQuery({ queryKey: ['houseboats'], queryFn: () => agentApi.listHouseboats() });
  const { data: myReqData } = useQuery({ queryKey: ['my-join-requests'], queryFn: () => agentApi.myJoinRequests() });
  const { data: myBookingReqData } = useQuery({ queryKey: ['my-booking-requests'], queryFn: () => bookingRequestApi.my(), enabled: isVerified });

  const houseboats: Houseboat[] = data?.data?.data?.houseboats || [];
  const myRequests: JoinRequest[] = myReqData?.data?.data?.requests || [];
  const myBookingRequests: BookingRequest[] = myBookingReqData?.data?.data?.requests || [];
  const approvedJoin = myRequests.find((r) => r.status === 'approved');
  const approvedJoinBoatId = approvedJoin
    ? typeof approvedJoin.houseboatId === 'object' ? approvedJoin.houseboatId._id : approvedJoin.houseboatId
    : null;
  const joinedId = (typeof user?.joinedHouseboatId === 'object' ? user?.joinedHouseboatId?._id : user?.joinedHouseboatId) || approvedJoinBoatId;
  const { data: availabilityData } = useQuery({
    queryKey: ['boat-room-availability', selected?._id, checkIn, checkOut],
    queryFn: () => roomApi.availability(selected!._id, checkIn, checkOut),
    enabled: !!selected?._id && selected?._id === joinedId && !!checkIn && !!checkOut && isVerified,
  });
  const rooms: Room[] = availabilityData?.data?.data?.rooms || [];
  const availableRooms = rooms.filter((room) => room.availabilityState === 'available');

  const joinRequestMutation = useMutation({
    mutationFn: (houseboatId: string) => agentApi.sendJoinRequest({ houseboatId }),
    onSuccess: () => {
      toast.success('যোগ দেওয়ার আবেদন পাঠানো হয়েছে');
      qc.invalidateQueries({ queryKey: ['my-join-requests'] });
    },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'ত্রুটি'),
  });

  const bookingRequestMutation = useMutation({
    mutationFn: () => bookingRequestApi.create({
      boatId: selected!._id,
      roomId,
      checkIn,
      checkOut,
      guestCount: Number(guestCount) || 1,
      customerName,
      customerPhone,
      customerAddress,
      note: message,
    }),
    onSuccess: () => {
      toast.success('বুকিং রিকোয়েস্ট পাঠানো হয়েছে');
      qc.invalidateQueries({ queryKey: ['my-booking-requests'] });
      setShowModal(false);
      setMessage('');
      setRoomId('');
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
            const canRequestJoin = isVerified && !joinedId && (!req || req.status === 'rejected');
            return (
              <div key={h._id} className="card">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-slate-800">{h.name}</p>
                    <p className="text-xs text-slate-500">📍 {h.location}</p>
                    {owner && <p className="text-xs text-slate-500">👤 {owner.name} · {owner.phone}</p>}
                  </div>
                  {isJoined ? (
                    <span className="badge badge-green">যুক্ত আছি</span>
                  ) : req ? (
                    <StatusBadge status={req.status} />
                  ) : null}
                </div>
                {isVerified && isJoined && (
                  <>
                    {bookingReq && <p className="text-xs text-amber-600 mb-2">এই বোটে একটি বুকিং রিকোয়েস্ট পেন্ডিং আছে।</p>}
                    <button onClick={() => openBookingRequest(h)} className="btn btn-outline btn-full text-sm text-sky-600 border-sky-200 mt-2">
                      <CalendarCheck size={14} /> রুম দেখে বুকিং রিকোয়েস্ট পাঠান
                    </button>
                  </>
                )}
                {canRequestJoin && (
                  <button onClick={() => joinRequestMutation.mutate(h._id)} disabled={joinRequestMutation.isPending} className="btn btn-primary btn-full text-sm mt-2">
                    {joinRequestMutation.isPending ? <Spinner size="sm" /> : 'এজেন্ট হতে আবেদন পাঠান'}
                  </button>
                )}
                {isVerified && !isJoined && req?.status === 'pending' && (
                  <p className="text-xs text-amber-600 mt-2">মালিকের অনুমোদনের জন্য অপেক্ষা করছে।</p>
                )}
                {isVerified && joinedId && !isJoined && (
                  <p className="text-xs text-slate-500 mt-2">বুকিং রিকোয়েস্ট পাঠাতে এই বোটের অনুমোদিত এজেন্ট হতে হবে।</p>
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
          <Field label="গ্রাহকের নাম" required>
            <input className="input" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="যাত্রীর নাম" />
          </Field>
          <Field label="গ্রাহকের ফোন" required>
            <input className="input" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="মোবাইল নম্বর" />
          </Field>
          <Field label="গ্রাহকের ঠিকানা">
            <input className="input" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="ঐচ্ছিক" />
          </Field>
          {checkIn && (
            <Field label="উপলব্ধ রুম" required>
              <div className="flex flex-col gap-2">
                {availableRooms.length === 0 ? (
                  <p className="text-sm text-slate-500">এই তারিখে কোনো রুম পাওয়া যায়নি</p>
                ) : availableRooms.map(room => (
                    <button
                      type="button"
                      key={room._id}
                      onClick={() => setRoomId(room._id)}
                      className={`rounded-lg border p-3 text-left ${roomId === room._id ? 'border-sky-500 bg-sky-50' : 'border-emerald-200 bg-emerald-50'}`}
                    >
                      <div className="flex justify-between gap-2">
                        <span className="font-semibold text-sm">রুম {room.roomNumber} ({room.roomType})</span>
                        <span className="font-bold text-sm">৳{room.basePrice.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{room.maxCapacity} জন · উপলব্ধ</p>
                    </button>
                ))}
              </div>
            </Field>
          )}
          <Field label="বার্তা (ঐচ্ছিক)">
            <textarea className="input" rows={3} placeholder="গ্রাহকের চাহিদা বা নোট..." value={message} onChange={e => setMessage(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <button onClick={() => setShowModal(false)} className="btn btn-outline flex-1">বাতিল</button>
            <button onClick={() => bookingRequestMutation.mutate()} disabled={bookingRequestMutation.isPending || !roomId || !checkIn || !customerName.trim() || !customerPhone.trim()} className="btn btn-primary flex-1">
              {bookingRequestMutation.isPending ? <Spinner size="sm" /> : 'রিকোয়েস্ট পাঠান'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
