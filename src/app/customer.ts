
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  Customer,
  CustomerBooking,
  PaymentStatus,
  LaundryService,
  ItemCategory,
  ShopRules,
  BookingStatusOption,
  PaymentStatusOption,
  PaymentMethodOption
} from './rules';

// --------------------------------------------------
// INTERFACES AND TYPES
// --------------------------------------------------

export interface Account {
  id: string;
  username: string;
  password: string;
  role: string;
  isActive: boolean;
}

export interface ShopInformation {
  id: string;
  shopName: string;
  logoPath: string;
  projectName: string;
  projectVersion: string;
}

export type BookingRecord = CustomerBooking & {
  subtotal: number;
  expressMultiplier: number;
  balance: number;
  weightKg?: number;
  servicePrice?: number;
};

export type BookingFormItem = {
  serviceId: number;
  itemCategoryId: number;
  weight: number;
};

export type CalendarCell = {
  day: number;
  dateKey: string;
};

// --------------------------------------------------
// CUSTOMER SERVICE
// --------------------------------------------------

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000';

  minimumWeight = 0;
  maximumWeight = 0;
  expressMultiplier = 1;
  maximumCapacity = 0;

  expressEnabled = false;
  allowSameDayBooking = false;
  allowCancellation = false;
  preventPastBookings = true;

  openingTime = '';
  closingTime = '';

  operatingDays: string[] = [];
  closedDays: string[] = [];

  shopRules: ShopRules | null = null;

  services: LaundryService[] = [];
  categories: ItemCategory[] = [];
  customers: Customer[] = [];

  bookingStatuses: BookingStatusOption[] = [];
  paymentStatuses: PaymentStatusOption[] = [];
  paymentMethods: PaymentMethodOption[] = [];

  // --------------------------------------------------
  // ACCOUNT / LOGIN OPERATIONS
  // --------------------------------------------------

  getAccounts(): Observable<Account[]> {
    return this.http.get<Account[]>(
      `${this.apiUrl}/accounts`
    );
  }

  // --------------------------------------------------
  // SHOP INFORMATION
  // --------------------------------------------------

  getShopInformation(): Observable<ShopInformation[]> {
    return this.http.get<ShopInformation[]>(
      `${this.apiUrl}/shopInformation`
    );
  }

  // --------------------------------------------------
  // CUSTOMER DATABASE OPERATIONS
  // --------------------------------------------------

  getCustomers(): Observable<Customer[]> {
    return this.http.get<Customer[]>(
      `${this.apiUrl}/customers`
    );
  }

  getCustomer(id: string): Observable<Customer> {
    return this.http.get<Customer>(
      `${this.apiUrl}/customers/${encodeURIComponent(id)}`
    );
  }

  addCustomer(customer: Customer): Observable<Customer> {
    return this.http.post<Customer>(
      `${this.apiUrl}/customers`,
      customer
    );
  }

  updateCustomer(
    id: string,
    customer: Customer
  ): Observable<Customer> {
    return this.http.put<Customer>(
      `${this.apiUrl}/customers/${encodeURIComponent(id)}`,
      customer
    );
  }

  normalizePhoneNumber(phoneNumber: string): string {
    return (phoneNumber || '').replace(/[\s\-()]/g, '');
  }

  normalizeCustomerName(customerName: string): string {
    return (customerName || '').trim().toLowerCase();
  }

  findCustomerByName(
    customerName: string,
    customers: Customer[] = this.customers
  ): Customer | undefined {
    const normalizedName =
      this.normalizeCustomerName(customerName);

    if (!normalizedName) return undefined;

    return customers.find(
      customer =>
        this.normalizeCustomerName(customer.customerName) ===
        normalizedName
    );
  }

  // --------------------------------------------------
  // LOAD DATABASE CONFIGURATION
  // --------------------------------------------------

  getServices(): Observable<LaundryService[]> {
    return this.http.get<LaundryService[]>(
      `${this.apiUrl}/services`
    );
  }

  getCategories(): Observable<ItemCategory[]> {
    return this.http.get<ItemCategory[]>(
      `${this.apiUrl}/itemCategories`
    );
  }

  updateShopRules(
    id: string,
    rules: ShopRules
  ): Observable<ShopRules> {
    return this.http.put<ShopRules>(
      `${this.apiUrl}/shopRules/${encodeURIComponent(id)}`,
      rules
    );
  }

  getShopRules(): Observable<ShopRules[]> {
    return this.http.get<ShopRules[]>(
      `${this.apiUrl}/shopRules`
    );
  }

  getBookingStatuses(): Observable<BookingStatusOption[]> {
    return this.http.get<BookingStatusOption[]>(
      `${this.apiUrl}/bookingStatuses`
    );
  }

  getPaymentStatuses(): Observable<PaymentStatusOption[]> {
    return this.http.get<PaymentStatusOption[]>(
      `${this.apiUrl}/paymentStatuses`
    );
  }

  getPaymentMethods(): Observable<PaymentMethodOption[]> {
    return this.http.get<PaymentMethodOption[]>(
      `${this.apiUrl}/paymentMethods`
    );
  }

  applyShopRules(rules: ShopRules): void {
    this.shopRules = rules;

    this.minimumWeight = Number(rules.minimumWeight);
    this.maximumWeight = Number(rules.maximumWeight);

    this.maximumCapacity = Number(
      rules.maximumDailyBookingCapacity
    );

    this.expressEnabled = Boolean(rules.expressEnabled);
    this.expressMultiplier = Number(rules.expressMultiplier);

    this.allowSameDayBooking = Boolean(
      rules.allowSameDayBooking
    );

    this.allowCancellation = Boolean(
      rules.allowCancellation
    );

    this.preventPastBookings = Boolean(
      rules.preventPastBookings
    );

    this.openingTime = rules.openingTime;
    this.closingTime = rules.closingTime;

    this.operatingDays = Array.isArray(rules.operatingDays)
      ? rules.operatingDays
      : [];

    this.closedDays = Array.isArray(rules.closedDays)
      ? rules.closedDays
      : [];
  }

  // --------------------------------------------------
  // PICKUP CAPACITY
  // --------------------------------------------------

  getPickupDateBookingCount(
    bookings: CustomerBooking[],
    pickupDate: string,
    excludeBookingId?: string
  ): number {
    if (!pickupDate) return 0;

    return bookings.filter(booking =>
      booking.pickupDate === pickupDate &&
      booking.status !== 'Cancelled' &&
      booking.id !== excludeBookingId
    ).length;
  }

  getRemainingPickupSlots(
    bookings: CustomerBooking[],
    pickupDate: string,
    excludeBookingId?: string
  ): number {
    const booked = this.getPickupDateBookingCount(
      bookings,
      pickupDate,
      excludeBookingId
    );

    return Math.max(0, this.maximumCapacity - booked);
  }

  isPickupDateFullyBooked(
    bookings: CustomerBooking[],
    pickupDate: string,
    excludeBookingId?: string
  ): boolean {
    return this.getRemainingPickupSlots(
      bookings,
      pickupDate,
      excludeBookingId
    ) <= 0;
  }

  validatePickupCapacity(
    bookings: CustomerBooking[],
    pickupDate: string,
    excludeBookingId?: string
  ): { valid: boolean; message: string } {
    if (!pickupDate) {
      return {
        valid: false,
        message: 'Please select an expected pickup date.'
      };
    }

    const booked = this.getPickupDateBookingCount(
      bookings,
      pickupDate,
      excludeBookingId
    );

    if (booked >= this.maximumCapacity) {
      return {
        valid: false,
        message:
          `This pickup date is fully booked. ` +
          `The maximum capacity is ${this.maximumCapacity} bookings per day.`
      };
    }

    return { valid: true, message: '' };
  }

  // --------------------------------------------------
  // CUSTOMER VALIDATION
  // --------------------------------------------------

  validatePhoneNumber(phoneNumber: string): string {
    const phone = this.normalizePhoneNumber(phoneNumber);

    if (!phone) {
      return 'Contact number is required.';
    }

    const validPhilippineMobile =
      /^(09\d{9}|\+639\d{9}|639\d{9})$/;

    if (!validPhilippineMobile.test(phone)) {
      return 'Enter a valid Philippine mobile number, such as 09171234567 or +639171234567.';
    }

    return '';
  }

  validateEmail(emailValue: string): string {
    const email = (emailValue || '').trim();

    if (!email) return '';

    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    return validEmail.test(email)
      ? ''
      : 'Enter a valid email address.';
  }

  // --------------------------------------------------
  // BOOKING CALCULATIONS
  // --------------------------------------------------

  getServicePrice(serviceId: number): number {
    return Number(
      this.services.find(
        service => service.id === Number(serviceId)
      )?.pricePerKg || 0
    );
  }

  getItemSubtotal(item: BookingFormItem): number {
    return Number(item.weight || 0) *
      this.getServicePrice(item.serviceId);
  }

  getTotalWeight(items: BookingFormItem[]): number {
    return items.reduce(
      (total, item) => total + Number(item.weight || 0),
      0
    );
  }

  getBaseSubtotal(items: BookingFormItem[]): number {
    return items.reduce(
      (total, item) => total + this.getItemSubtotal(item),
      0
    );
  }

  getExpressSurcharge(
    baseSubtotal: number,
    isExpress: boolean
  ): number {
    return isExpress && this.expressEnabled
      ? baseSubtotal * (this.expressMultiplier - 1)
      : 0;
  }

  getGrandTotal(
    baseSubtotal: number,
    isExpress: boolean
  ): number {
    return baseSubtotal *
      (isExpress && this.expressEnabled
        ? this.expressMultiplier
        : 1);
  }

  getBalance(total: number, paid: number): number {
    return Math.max(0, total - paid);
  }

  // --------------------------------------------------
  // PAYMENT STATUS FROM DB.JSON
  // --------------------------------------------------

  getPaymentStatus(
    paid: number,
    total: number
  ): PaymentStatus {
    let expectedName = '';

    if (paid <= 0) {
      expectedName = 'Unpaid';
    } else if (paid < total) {
      expectedName = 'Partially Paid';
    } else {
      expectedName = 'Paid';
    }

    const matchingStatus = this.paymentStatuses.find(
      status =>
        status.name.toLowerCase() === expectedName.toLowerCase()
    );

    return (matchingStatus?.name || '') as PaymentStatus;
  }

  // --------------------------------------------------
  // BOOKING DATA NORMALIZATION
  // --------------------------------------------------

  normalizeBooking(booking: CustomerBooking): BookingRecord {
    const data = booking as any;

    const items = Array.isArray(data.items)
      ? data.items
      : [];

    const totalWeight = Number(
      data.totalWeight ?? data.weightKg ?? 0
    );

    const subtotal = Number(
      data.subtotal ?? data.servicePrice ?? data.totalAmount ?? 0
    );

    const totalAmount = Number(data.totalAmount ?? 0);
    const amountPaid = Number(data.amountPaid ?? 0);

    return {
      ...booking,
      bookingNumber: data.bookingNumber || data.id,
      phoneNumber: data.phoneNumber || data.contactNumber || '',
      email: data.email || '',
      items,
      totalWeight,
      weightKg: Number(data.weightKg ?? totalWeight),
      subtotal,
      servicePrice: subtotal,
      expressMultiplier: Number(
        data.expressMultiplier ||
        (data.isExpress ? this.expressMultiplier : 1)
      ),
      totalAmount,
      amountPaid,
      balance: this.getBalance(totalAmount, amountPaid),
      paymentStatus: this.getPaymentStatus(
        amountPaid,
        totalAmount
      ),
      status: data.status === 'In-Progress'
        ? 'In Progress'
        : data.status || 'Pending'
    } as BookingRecord;
  }

  // --------------------------------------------------
  // DATE HELPERS
  // --------------------------------------------------

  private getDayName(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long'
    });
  }

  private isOperatingDay(date: Date): boolean {
    const dayName = this.getDayName(date);

    const isClosed = this.closedDays.some(
      day => day.toLowerCase() === dayName.toLowerCase()
    );

    if (isClosed) return false;

    if (this.operatingDays.length === 0) {
      return true;
    }

    return this.operatingDays.some(
      day => day.toLowerCase() === dayName.toLowerCase()
    );
  }

  // --------------------------------------------------
  // DATE VALIDATION
  // --------------------------------------------------

  validateBookingDate(
    dateValue: string
  ): { valid: boolean; message: string } {
    if (!dateValue) {
      return {
        valid: false,
        message: 'Please select a booking date.'
      };
    }

    const selected = this.parseLocalDate(dateValue);

    if (!selected) {
      return {
        valid: false,
        message: 'Please select a valid booking date.'
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (this.preventPastBookings && selected < today) {
      return {
        valid: false,
        message: 'Past dates cannot be booked.'
      };
    }

    if (
      !this.allowSameDayBooking &&
      selected.getTime() === today.getTime()
    ) {
      return {
        valid: false,
        message: 'Same-day bookings are not allowed. Please choose another date.'
      };
    }

    if (!this.isOperatingDay(selected)) {
      return {
        valid: false,
        message: 'The shop is closed on this day. Please choose an operating day.'
      };
    }

    return { valid: true, message: '' };
  }

  validatePickupDate(
    bookingDate: string,
    pickupDate: string,
    isExpress: boolean
  ): { valid: boolean; message: string } {
    if (!bookingDate || !pickupDate) {
      return {
        valid: false,
        message: 'Please select an expected pickup date.'
      };
    }

    const booking = this.parseLocalDate(bookingDate);
    const pickup = this.parseLocalDate(pickupDate);

    if (!booking || !pickup) {
      return {
        valid: false,
        message: 'Please select valid booking and pickup dates.'
      };
    }

    if (pickup <= booking) {
      return {
        valid: false,
        message: 'Pickup date must be after the booking date.'
      };
    }

    if (!this.isOperatingDay(pickup)) {
      return {
        valid: false,
        message: 'The shop is closed on the selected pickup date. Please choose an operating day.'
      };
    }

    if (!isExpress) {
      const minimumPickup = new Date(booking);
      minimumPickup.setDate(minimumPickup.getDate() + 7);

      if (pickup < minimumPickup) {
        return {
          valid: false,
          message: 'Regular bookings require at least 7 days before pickup.'
        };
      }
    }

    return { valid: true, message: '' };
  }

  private parseLocalDate(value: string): Date | null {
    if (!value) return null;

    const parts = value.split('-').map(Number);

    if (
      parts.length !== 3 ||
      parts.some(part => !Number.isFinite(part))
    ) {
      return null;
    }

    const [year, month, day] = parts;
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    date.setHours(0, 0, 0, 0);
    return date;
  }

  getNextValidDate(): string {
    const date = new Date();
    date.setHours(0, 0, 0, 0);

    while (
      !this.isOperatingDay(date) ||
      (
        !this.allowSameDayBooking &&
        date.getTime() === new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          new Date().getDate()
        ).getTime()
      )
    ) {
      date.setDate(date.getDate() + 1);
    }

    return this.toDateString(date);
  }

  toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // --------------------------------------------------
  // BOOKING FILTERING
  // --------------------------------------------------

  filterBookings(
    bookings: BookingRecord[],
    searchQuery: string,
    statusFilter: string
  ): BookingRecord[] {
    const query = searchQuery.toLowerCase().trim();

    return bookings.filter(booking => {
      const matchesSearch =
        !query ||
        booking.bookingNumber.toLowerCase().includes(query) ||
        booking.customerName.toLowerCase().includes(query) ||
        booking.phoneNumber.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === 'ALL' ||
        booking.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }

  getBookingServiceNames(booking: BookingRecord): string {
    const names = booking.items
      .map(item => item.serviceName)
      .filter(Boolean);

    return [...new Set(names)].join(', ') || 'Laundry Service';
  }

  // --------------------------------------------------
  // CUSTOMER DIRECTORY AND HISTORY
  // --------------------------------------------------

  // Booking-based customer directory.
  // Customer name is used as the matching identifier.

  getUniqueCustomers(
    bookings: BookingRecord[]
  ): BookingRecord[] {
    const seen = new Set<string>();

    return bookings.filter(booking => {
      const key = this.normalizeCustomerName(
        booking.customerName
      );

      if (!key || seen.has(key)) return false;

      seen.add(key);
      return true;
    });
  }

  filterCustomers(
    customers: BookingRecord[],
    searchQuery: string
  ): BookingRecord[] {
    const query = searchQuery.toLowerCase().trim();

    return customers.filter(customer =>
      !query ||
      customer.customerName.toLowerCase().includes(query) ||
      customer.phoneNumber.toLowerCase().includes(query) ||
      (customer.email || '').toLowerCase().includes(query)
    );
  }

  getCustomerBookingCount(
    bookings: BookingRecord[],
    customerName: string
  ): number {
    const normalizedName = this.normalizeCustomerName(customerName);

    if (!normalizedName) {
      return 0;
    }

    return bookings.filter(
      booking =>
        this.normalizeCustomerName(booking.customerName) === normalizedName
    ).length;
  }

  getCustomerBookings(
    bookings: BookingRecord[],
    customer: BookingRecord
  ): BookingRecord[] {
    const normalizedName =
      this.normalizeCustomerName(customer.customerName);

    return bookings.filter(
      booking =>
        this.normalizeCustomerName(booking.customerName) ===
        normalizedName
    );
  }

  // --------------------------------------------------
  // CUSTOMER PROFILE DIRECTORY
  // --------------------------------------------------

  getUniqueCustomerProfiles(customers: Customer[]): Customer[] {
    const seen = new Set<string>();

    return customers.filter(customer => {
      const key = this.normalizeCustomerName(
        customer.customerName
      );

      if (!key || seen.has(key)) return false;

      seen.add(key);
      return true;
    });
  }

  filterCustomerProfiles(
    customers: Customer[],
    searchQuery: string
  ): Customer[] {
    const query = searchQuery.toLowerCase().trim();

    return customers.filter(customer =>
      !query ||
      customer.customerName.toLowerCase().includes(query) ||
      customer.phoneNumber.toLowerCase().includes(query) ||
      (customer.email || '').toLowerCase().includes(query)
    );
  }

  getCustomerProfileBookings(
    bookings: BookingRecord[],
    customer: Customer
  ): BookingRecord[] {
    const normalizedName =
      this.normalizeCustomerName(customer.customerName);

    return bookings.filter(
      booking =>
        this.normalizeCustomerName(booking.customerName) ===
        normalizedName
    );
  }

  // --------------------------------------------------
  // CALENDAR HELPERS
  // --------------------------------------------------

  getCalendarCells(month: Date): CalendarCell[] {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();

    const firstDay = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    const cells: CalendarCell[] = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: 0, dateKey: '' });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = this.toDateString(
        new Date(year, monthIndex, day)
      );

      cells.push({ day, dateKey });
    }

    return cells;
  }

  getBookingsOnDate(
    bookings: BookingRecord[],
    dateKey: string
  ): BookingRecord[] {
    return bookings.filter(
      booking => booking.bookingDate === dateKey
    );
  }

  hasBookingsOnDate(
    bookings: BookingRecord[],
    dateKey: string
  ): boolean {
    return bookings.some(
      booking => booking.bookingDate === dateKey
    );
  }

  // --------------------------------------------------
  // GENERAL UTILITIES
  // --------------------------------------------------

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(Number(value || 0));
  }
}
