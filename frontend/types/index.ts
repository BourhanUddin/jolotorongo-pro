// ─── User & Auth ─────────────────────────────────────────────
export type Role = 'super_admin' | 'boat_owner' | 'agent';
export type UserStatus = 'unverified' | 'pending' | 'active' | 'suspended';

export interface Subscription {
  planId: string | null;
  planName: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  paymentMethod: string | null;
  paymentReference: string | null;
  paymentStatus: 'unpaid' | 'pending_approval' | 'paid' | 'failed';
  renewalAlertSent: boolean;
}

export interface Notification {
  _id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isRead: boolean;
  createdAt: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  status: UserStatus;
  isApprovedByAdmin: boolean;
  subscription: Subscription;
  joinedHouseboatId: string | Houseboat | null;
  notifications: Notification[];
  createdAt: string;
}

// ─── Houseboat ────────────────────────────────────────────────
export interface Houseboat {
  _id: string;
  name: string;
  location: string;
  logoUrl: string | null;
  ownerId: string | User;
  holdTimeoutMinutes: number;
  isOperational: boolean;
  approvedAgents: string[];
  createdAt: string;
}

// ─── Subscription Plan ────────────────────────────────────────
export interface SubscriptionPlan {
  _id: string;
  name: string;
  durationDays: number;
  price: number;
  description: string;
  features: string[];
  isActive: boolean;
  maxRooms: number;
  maxAgents: number;
}

// ─── Room ─────────────────────────────────────────────────────
export type RoomStatus = 'available' | 'on_hold' | 'booked' | 'maintenance';
export type RoomType = 'single' | 'double' | 'family' | 'vip' | 'dormitory';

export interface Room {
  _id: string;
  houseboatId: string;
  roomNumber: string;
  roomType: RoomType;
  basePrice: number;
  extraPersonPrice: number;
  maxCapacity: number;
  description: string;
  amenities: string[];
  images: string[];
  availability?: {
    checkIn: string;
    checkOut: string;
    status: 'on_hold' | 'booked' | 'expired' | 'cancelled' | 'completed';
    bookingId?: string | Booking | null;
    bookingRequestId?: string | BookingRequest | null;
  }[];
  status: RoomStatus;
  isActive: boolean;
  availableOnDate?: boolean;
  availabilityState?: 'available' | 'on_hold' | 'booked' | 'maintenance';
  blockingBooking?: Booking | null;
}

// ─── Booking ──────────────────────────────────────────────────
export type BookingStatus = 'on_hold' | 'confirmed' | 'cancelled' | 'expired' | 'completed';

export interface Booking {
  _id: string;
  houseboatId: string | Houseboat;
  roomId: string | Room;
  agentId: string | User;
  approvedById: string | User | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  guestCount: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  basePrice: number;
  extraCharge: number;
  discount: number;
  totalPrice: number;
  advancePaid: number;
  dueAmount: number;
  status: BookingStatus;
  expiresAt: string | null;
  paymentMethod: string;
  note: string;
  createdAt: string;
}

// ─── Expense ──────────────────────────────────────────────────
export type ExpenseCategory = 'fuel' | 'food' | 'repair' | 'salary' | 'utility' | 'marketing' | 'other';

export interface Expense {
  _id: string;
  houseboatId: string;
  createdById: string | User;
  title: string;
  amount: number;
  category: ExpenseCategory;
  note: string;
  date: string;
}

// ─── Join Request ─────────────────────────────────────────────
export interface JoinRequest {
  _id: string;
  agentId: string | User;
  houseboatId: string | Houseboat;
  ownerId: string;
  status: 'pending' | 'approved' | 'rejected';
  message: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
}

// ─── Booking Request ─────────────────────────────────────────
export interface BookingRequest {
  _id: string;
  agentId: string | User;
  boatId: string | Houseboat;
  roomId: string | Room;
  ownerId: string | User;
  tripDates: {
    checkIn: string;
    checkOut: string;
  };
  guestCount: number;
  totalPrice: number;
  status: 'pending' | 'approved' | 'rejected';
  note: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  bookingId: string | Booking | null;
  createdAt: string;
}

// ─── API Response ─────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
  redirectTo?: string;
}
