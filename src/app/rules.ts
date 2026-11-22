
export type BookingStatus =
  | 'Pending'
  | 'In Progress'
  | 'Done'
  | 'Cancelled';

export type PaymentStatus =
  | 'Unpaid'
  | 'Partially Paid'
  | 'Paid';

export type PaymentMethod =
  | 'Cash'
  | 'GCash'
  | 'Bank Transfer'
  | 'Maya'
  | 'paymaya'
  | 'Other';

  export const BOOKING_STATUS_OPTIONS: BookingStatus[] = [
  'Pending',
  'In Progress',
  'Done',
  'Cancelled'
];

export const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = [
  'Unpaid',
  'Partially Paid',
  'Paid'
];

export const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = [
  'Cash',
  'GCash',
  'Bank Transfer',
  'Maya',
  'paymaya',
  'Other'
];

export const DEFAULT_DAILY_BOOKING_CAPACITY = 20;

export interface Account {
  id: number;
  username: string;
  password: string;
  role: 'Admin' | 'Staff';
}

export interface BookingItem {
  serviceId: number;
  itemCategoryId: number;
  serviceName: string;
  categoryName: string;
  weight: number;
  pricePerKg: number;
  subtotal: number;
}

export interface CustomerBooking {
  id: string;
  bookingNumber: string;

  customerName: string;
  phoneNumber: string;
  email?: string;
  address: string;

  bookingDate: string;
  pickupDate: string;

  items: BookingItem[];
  totalWeight: number;

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

export interface LaundryService {
  id: number;
  serviceName: string;
  description: string;
  pricePerKg: number;
  isAvailable: boolean;
}

export interface ItemCategory {
  id: number;
  categoryName: string;
  description: string;
  isAvailable: boolean;
}

export interface ShopInformation {
  shopName: string;
  logoPath: string;
  projectName: string;
  projectVersion: string;
}

export interface ShopRules {
  minimumWeight: number;
  maximumWeight: number;
  maximumcapacity: number;
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

export interface LABAData {
  shop: ShopInformation;
  rules: ShopRules;
  accounts: Account[];
  services: LaundryService[];
  itemCategories: ItemCategory[];
}

export interface ActivityLog {
  id: string;
  action: string;
  description: string;
  date: string;
  user: string;
}

export interface BookingNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'priority';
  bookingId?: string;
  date: string;
}
