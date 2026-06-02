export const t = {
  // App
  appName: 'Jolotorongo / জলতরঙ্গ',
  // Auth
  login: 'লগইন / Login',
  logout: 'লগআউট / Logout',
  register: 'নিবন্ধন / Register',
  email: 'ইমেইল / Email',
  password: 'পাসওয়ার্ড / Password',
  name: 'নাম / Name',
  phone: 'ফোন / Phone',
  // Nav
  dashboard: 'ড্যাশবোর্ড',
  rooms: 'রুম / Rooms',
  bookings: 'বুকিং / Bookings',
  expenses: 'ব্যয় / Expenses',
  agents: 'এজেন্ট / Agents',
  profile: 'প্রোফাইল / Profile',
  admin: 'অ্যাডমিন',
  // Status
  active: 'সক্রিয় / Active',
  pending: 'অপেক্ষমান / Pending',
  suspended: 'স্থগিত / Suspended',
  unverified: 'অযাচাই / Unverified',
  // Booking status
  on_hold: 'হোল্ড',
  confirmed: 'কনফার্ম',
  cancelled: 'বাতিল',
  expired: 'মেয়াদোত্তীর্ণ',
  completed: 'সম্পন্ন',
  // Room status
  available: 'উপলব্ধ',
  on_hold_room: 'হোল্ড',
  booked: 'বুক',
  maintenance: 'মেরামত',
  // Common
  save: 'সংরক্ষণ',
  cancel: 'বাতিল',
  confirm: 'কনফার্ম',
  delete: 'মুছুন',
  edit: 'সম্পাদনা',
  add: 'যোগ করুন',
  search: 'খুঁজুন',
  loading: 'লোড হচ্ছে...',
  noData: 'কোনো তথ্য নেই',
  error: 'ত্রুটি হয়েছে',
  success: 'সফল!',
  // Finance
  taka: '৳',
  revenue: 'আয় / Revenue',
  expense: 'ব্যয় / Expense',
  profit: 'লাভ / Profit',
} as const;

export const statusBadge = (status: string) => {
  const map: Record<string, { cls: string; label: string }> = {
    active:     { cls: 'badge-green',  label: 'সক্রিয়' },
    paid:       { cls: 'badge-green',  label: 'পেইড' },
    confirmed:  { cls: 'badge-green',  label: 'কনফার্ম' },
    completed:  { cls: 'badge-blue',   label: 'সম্পন্ন' },
    available:  { cls: 'badge-green',  label: 'উপলব্ধ' },
    approved:   { cls: 'badge-green',  label: 'অনুমোদিত' },
    on_hold:    { cls: 'badge-yellow', label: 'হোল্ড' },
    pending:    { cls: 'badge-yellow', label: 'অপেক্ষমান' },
    pending_approval: { cls: 'badge-yellow', label: 'অনুমোদন বাকি' },
    unverified: { cls: 'badge-gray',   label: 'অযাচাই' },
    booked:     { cls: 'badge-blue',   label: 'বুক' },
    cancelled:  { cls: 'badge-red',    label: 'বাতিল' },
    expired:    { cls: 'badge-red',    label: 'মেয়াদোত্তীর্ণ' },
    suspended:  { cls: 'badge-red',    label: 'স্থগিত' },
    rejected:   { cls: 'badge-red',    label: 'প্রত্যাখ্যাত' },
    failed:     { cls: 'badge-red',    label: 'ব্যর্থ' },
    maintenance:{ cls: 'badge-gray',   label: 'মেরামত' },
    unpaid:     { cls: 'badge-gray',   label: 'অপরিশোধিত' },
  };
  return map[status] || { cls: 'badge-gray', label: status };
};

export const formatDate = (d: string | null | undefined) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatMoney = (n: number) => `৳${n.toLocaleString('bn-BD')}`;

export const daysLeft = (endDate: string) => {
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};
