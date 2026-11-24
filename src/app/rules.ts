// ==========================================
// LABA - DATA MODELS AND INTERFACES
// ==========================================

// ==========================================
// ACCOUNT
// ==========================================

export type AccountRole = 'Admin' | 'Staff';

export interface Account {
  id: string;
  username: string;
  password: string;
  role: AccountRole;
  isActive: boolean;
}

// ==========================================
// CUSTOMER
// ==========================================

export interface Customer {
  id: string;
  customerName: string;
  phoneNumber: string;
  email: string;
  address: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  suffix?: string;
  houseNo?: string;
  street?: string;
  barangay?: string;
  city?: string;
  province?: string;
}

// ==========================================
// BOOKING STATUS
// ==========================================

export interface BookingStatusOption {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

// ==========================================
// PAYMENT STATUS
// ==========================================

export interface PaymentStatusOption {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

// ==========================================
// PAYMENT METHOD
// ==========================================

export interface PaymentMethodOption {
  id: string;
  name: string;
  isActive: boolean;
}

// ==========================================
// BOOKING TYPES
// ==========================================

export type BookingStatus = string;

export type PaymentStatus = string;

export type PaymentMethod = string;

// ==========================================
// BOOKING ITEM
// ==========================================

export interface BookingItem {
  serviceId: number;
  itemCategoryId: number;

  serviceName: string;
  categoryName: string;

  weight: number;
  pricePerKg: number;
  subtotal: number;
}

// ==========================================
// NOTIFICATION TYPES
// ==========================================

export type BookingNotificationType =
  | 'warning'
  | 'info'
  | 'success'
  | 'priority';

export interface BookingNotification {
  id: string;
  title: string;
  message: string;
  type: BookingNotificationType;
  bookingId: string;
  date: string;
}

export type DashboardNotificationType =
  | 'pending'
  | 'progress'
  | 'payment';

export interface DashboardNotification {
  title: string;
  message: string;
  bookingNumber: string;
  date: string;
  timestamp: number;
  type: DashboardNotificationType;
}

// ==========================================
// CUSTOMER BOOKING
// ==========================================

export interface CustomerBooking {
  id: string;
  bookingNumber: string;

  customerName: string;
  phoneNumber: string;
  email?: string;
  address: string;

  firstName?: string;
  lastName?: string;
  middleName?: string;
  suffix?: string;

  houseNo?: string;
  street?: string;
  barangay?: string;
  city?: string;
  province?: string;

  bookingDate: string;
  pickupDate: string;

  items: BookingItem[];

  weightKg?: number;
  totalWeight: number;
  servicePrice?: number;
  subtotal: number;

  isExpress: boolean;
  expressMultiplier: number;

  totalAmount: number;
  amountPaid: number;
  balance: number;

  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;

  status: BookingStatus;

  cancellationReason?: string;
  notes: string;

  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

// ==========================================
// LAUNDRY SERVICES
// ==========================================

export interface LaundryService {
  id: number;
  serviceName: string;
  description: string;
  pricePerKg: number;
  isAvailable: boolean;
}

// ==========================================
// ITEM CATEGORIES
// ==========================================

export interface ItemCategory {
  id: number;
  categoryName: string;
  description: string;
  isAvailable: boolean;
}

// ==========================================
// SHOP INFORMATION
// ==========================================

export interface ShopInformation {
  id: string;
  shopName: string;
  logoPath: string;
  projectName: string;
  projectVersion: string;
}

// ==========================================
// SHOP RULES
// ==========================================

export interface ShopRules {
  id: string;

  minimumWeight: number;
  maximumWeight: number;

  maximumDailyBookingCapacity: number;

  expressEnabled: boolean;
  expressMultiplier: number;

  openingTime: string;
  closingTime: string;

  operatingDays: string[];
  closedDays: string[];

  allowSameDayBooking: boolean;
  allowCancellation: boolean;
  preventPastBookings: boolean;
}

// ==========================================
// COMPLETE LABA DATABASE STRUCTURE
// ==========================================

export interface LABAData {
  accounts: Account[];
  customers: Customer[];
  bookings: CustomerBooking[];

  services: LaundryService[];
  itemCategories: ItemCategory[];

  bookingStatuses: BookingStatusOption[];
  paymentStatuses: PaymentStatusOption[];
  paymentMethods: PaymentMethodOption[];

  shopRules: ShopRules[];
  shopInformation: ShopInformation[];
}