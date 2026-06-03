import axios from 'axios';
import { offlineCache } from './offline-cache';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

const cacheKey = (config: { baseURL?: string; url?: string; params?: unknown }) =>
  `${config.baseURL || ''}${config.url || ''}?${JSON.stringify(config.params || {})}`;

// Attach JWT token from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('jt_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    config.headers?.delete?.('Content-Type');
    config.headers?.delete?.('content-type');
  }
  return config;
});

// Handle 401 — redirect to login
api.interceptors.response.use(
  async (res) => {
    if (res.config.method?.toLowerCase() === 'get') {
      await offlineCache.set(cacheKey(res.config), res.data);
    }
    return res;
  },
  async (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('jt_token');
      localStorage.removeItem('jt_user');
      document.cookie = 'jt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';
      window.location.href = '/login';
    }
    if (!err.response && err.config?.method?.toLowerCase() === 'get') {
      const cached = await offlineCache.get(cacheKey(err.config));
      if (cached) {
        return {
          data: cached,
          status: 200,
          statusText: 'Offline cache',
          headers: {},
          config: err.config,
          request: err.request,
        };
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// ─── API helpers ──────────────────────────────────────────────
export const authApi = {
  register: (d: object) => api.post('/auth/register', d),
  login:    (d: object) => api.post('/auth/login', d),
  requestOtp: (d: object) => api.post('/auth/otp/request', d),
  verifyOtp:  (d: object) => api.post('/auth/otp/verify', d),
  otpLogin:   (d: object) => api.post('/auth/otp/login', d),
  google:     (d: object) => api.post('/auth/google', d),
  me:       ()          => api.get('/auth/me'),
  changePassword: (d: object) => api.patch('/auth/change-password', d),
  notifications:  ()          => api.get('/auth/notifications'),
  readAllNotifications: ()    => api.patch('/auth/notifications/read-all'),
};

export const subscriptionApi = {
  getPlans:         () => api.get('/subscriptions/plans'),
  purchase:         (d: object | FormData) =>
    api.post('/subscriptions/purchase', d, d instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined),
  getPending:       () => api.get('/subscriptions/pending'),
  approve:          (id: string) => api.patch(`/subscriptions/${id}/approve`),
  reject:           (id: string, d: object) => api.patch(`/subscriptions/${id}/reject`, d),
  createPlan:       (d: object) => api.post('/subscriptions/plans', d),
  updatePlan:       (id: string, d: object) => api.patch(`/subscriptions/plans/${id}`, d),
};

export const agentApi = {
  listHouseboats:      ()          => api.get('/agents/houseboats'),
  sendJoinRequest:     (d: object) => api.post('/agents/join-request', d),
  myJoinRequests:      ()          => api.get('/agents/join-requests/my'),
  availableRooms:      (params: { checkIn: string; checkOut: string }) => api.get('/agents/available-rooms', { params }),
  incomingRequests:    ()          => api.get('/agents/join-requests/incoming'),
  approveRequest:      (id: string) => api.patch(`/agents/join-requests/${id}/approve`),
  rejectRequest:       (id: string, d: object) => api.patch(`/agents/join-requests/${id}/reject`, d),
  getUnverified:       ()          => api.get('/agents/unverified'),
  verify:              (id: string) => api.patch(`/agents/${id}/verify`),
  suspend:             (id: string) => api.patch(`/agents/${id}/suspend`),
};

export const roomApi = {
  list:           (params?: { houseboatId?: string }) => api.get('/rooms', { params }),
  get:            (id: string) => api.get(`/rooms/${id}`),
  create:         (d: object | FormData) => api.post('/rooms', d),
  update:         (id: string, d: object | FormData) => api.patch(`/rooms/${id}`, d),
  toggle:         (id: string) => api.patch(`/rooms/${id}/toggle-active`),
  availability:   (houseboatId: string, checkIn: string, checkOut: string) =>
    api.get('/rooms/availability', { params: { houseboatId, checkIn, checkOut } }),
};

export const bookingApi = {
  list:     (params?: object) => api.get('/bookings', { params }),
  manifest: (params?: object) => api.get('/bookings/manifest', { params }),
  get:      (id: string)      => api.get(`/bookings/${id}`),
  hold:     (d: object)       => api.post('/bookings/hold', d),
  direct:   (d: object)       => api.post('/bookings/direct', d),
  confirm:  (id: string, d: object) => api.patch(`/bookings/${id}/confirm`, d),
  cancel:   (id: string, d: object) => api.patch(`/bookings/${id}/cancel`, d),
  complete: (id: string)      => api.patch(`/bookings/${id}/complete`),
};

export const bookingRequestApi = {
  create:   (d: object) => api.post('/booking-requests', d),
  my:       () => api.get('/booking-requests/my'),
  incoming: () => api.get('/booking-requests/incoming'),
  paymentConfirmed: (id: string) => api.patch(`/booking-requests/${id}/payment-confirmed`),
  approve:  (id: string, d: object = {}) => api.patch(`/booking-requests/${id}/approve`, d),
  reject:   (id: string, d: object = {}) => api.patch(`/booking-requests/${id}/reject`, d),
};

export const tourApi = {
  list:   (params?: object) => api.get('/tours', { params }),
  matrix: (params?: object) => api.get('/tours/matrix', { params }),
  create: (d: object) => api.post('/tours', d),
  update: (id: string, d: object) => api.patch(`/tours/${id}`, d),
  delete: (id: string) => api.delete(`/tours/${id}`),
};

export const expenseApi = {
  list:   (params?: object) => api.get('/expenses', { params }),
  report: (params?: object) => api.get('/expenses/report', { params }),
  create: (d: object)       => api.post('/expenses', d),
  update: (id: string, d: object) => api.patch(`/expenses/${id}`, d),
  delete: (id: string)      => api.delete(`/expenses/${id}`),
};

export const adminApi = {
  dashboard:       () => api.get('/admin/dashboard'),
  owners:          (params?: object) => api.get('/admin/boat-owners', { params }),
  managers:        (params?: object) => api.get('/admin/managers', { params }),
  agents:          (params?: object) => api.get('/admin/agents', { params }),
  houseboats:      () => api.get('/admin/houseboats'),
  createUser:      (d: object) => api.post('/admin/users', d),
  updateUser:      (id: string, d: object) => api.patch(`/admin/users/${id}`, d),
  deleteUser:      (id: string) => api.delete(`/admin/users/${id}`),
  suspend:         (id: string) => api.patch(`/admin/users/${id}/suspend`),
  reactivate:      (id: string) => api.patch(`/admin/users/${id}/reactivate`),
  createBoatOwner: (d: object) => api.post('/admin/create-boat-owner', d),
};

export const houseboatApi = {
  fleet:       ()                    => api.get('/houseboat/fleet'),
  getMy:       ()                    => api.get('/houseboat/my'),
  updateMy:    (d: object)           => api.patch('/houseboat/my', d),
  createManager: (d: object)         => api.post('/houseboat/managers', d),
  removeAgent: (agentId: string)     => api.delete(`/houseboat/agents/${agentId}`),
};
