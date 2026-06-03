// ─── User & Auth ─────────────────────────────────────────────
export type Role = 'super_admin' | 'boat_owner' | 'manager' | 'agent';
export type UserStatus = 'unverified' | 'pending' | 'active' | 'suspended';

export interface Notification {
  _id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isRead: boolean;
  createdAt: string;
}

export type PaymentMethod = 'bkash' | 'nagad' | 'rocket' | 'bank' | 'card' | 'cash' | 'demo_card';
export type PaymentStatus = 'unpaid' | 'pending_approval' | 'paid' | 'failed';

export interface Subscription {
  planId: string | SubscriptionPlan | null;
  planName: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  paymentMethod: PaymentMethod | null;
  paymentReference: string | null;
  paymentStatus: PaymentStatus;
  senderNumber?: string | null;
  paymentScreenshotUrl?: string | null;
  paymentNote?: string | null;
  rejectionReason?: string | null;
  renewalAlertSent: boolean;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  status: UserStatus;
  isApprovedByAdmin: boolean;
  subscription?: Subscription;
  joinedHouseboatId: string | Houseboat | null;
  notifications: Notification[];
  createdAt: string;
}

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

// ─── Houseboat ────────────────────────────────────────────────
export interface Houseboat {
  _id: string;
  name: string;
  location: string;
  logoUrl: string | null;
  ownerId: string | User;
  holdTimeoutMinutes: number;
  isOperational: boolean;
  approvedAgents: string[] | User[];
  createdAt: string;
}

// ─── Room ─────────────────────────────────────────────────────
export type RoomStatus = 'available' | 'on_hold' | 'booked' | 'maintenance';
export type RoomType = 'single' | 'double' | 'family' | 'vip' | 'dormitory';
export type RoomClimate = 'ac' | 'non_ac';

export interface Room {
  _id: string;
  houseboatId: string;
  roomNumber: string;
  roomType: RoomType;
  climate?: RoomClimate;
  acRoomPrice: number;
  nonAcRoomPrice: number;
  basePrice: number;
  extraPersonPrice: number;
  maxCapacity: number;
  description: string;
  amenities: string[];
  services: string[];
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
  state?: 'available' | 'on_hold' | 'booked' | 'maintenance';
  blockingBookingId?: string | null;
  expiresAt?: string | null;
  blockingBooking?: Booking | null;
}

// ─── Tour ─────────────────────────────────────────────────────
export interface Tour {
  _id: string;
  houseboatId: string | Houseboat;
  title: string;
  checkIn: string;
  checkOut: string;
  roomIds: string[] | Room[];
  createdById: string | User;
  status: 'scheduled' | 'cancelled' | 'completed';
  note: string;
  createdAt: string;
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
  referenceName: string;
  guestCount: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  tourName: string;
  pricingMode: 'ac' | 'non_ac';
  basePrice: number;
  extraCharge: number;
  discount: number;
  totalPrice: number;
  agentCommission: number;
  netRevenue: number;
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
  agentCommission: number;
  paymentConfirmedByAgent: boolean;
  paymentConfirmedAt: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  status: 'pending' | 'approved' | 'rejected';
  note: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  bookingId: string | Booking | null;
  createdAt: string;
}

export interface InvoiceTemplate {
  _id: string;
  houseboatId: string;
  title: string;
  businessName: string;
  phone: string;
  address: string;
  paymentInstructions: string;
  terms: string;
  footerNote: string;
}

// ─── API Response ─────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
  redirectTo?: string;
}
