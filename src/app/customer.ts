import { Injectable } from '@angular/core';

import {
  CustomerBooking,
  PaymentStatus,
  LaundryService,
  ItemCategory
} from './rules';

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

@Injectable({
  providedIn: 'root'
})
export class CustomerService {

  // --------------------------------------------------
  // SHARED BOOKING SETTINGS
  // --------------------------------------------------

  readonly minimumWeight = 3;
  readonly maximumWeight = 20;
  readonly expressMultiplier = 2;

  // Maximum number of active bookings allowed per pickup date.
  // Change this value to adjust the daily booking capacity.
  readonly maximumCapacity = 20;

  // --------------------------------------------------
  // LAUNDRY SERVICES
  // --------------------------------------------------

  readonly services: LaundryService[] = [
    {
      id: 1,
      serviceName: 'Wash & Fold',
      description: '',
      pricePerKg: 50,
      isAvailable: true
    },
    {
      id: 2,
      serviceName: 'Dry Cleaning',
      description: '',
      pricePerKg: 120,
      isAvailable: true
    },
    {
      id: 3,
      serviceName: 'Ironing',
      description: '',
      pricePerKg: 40,
      isAvailable: true
    },
    {
      id: 4,
      serviceName: 'Comforter Wash',
      description: '',
      pricePerKg: 150,
      isAvailable: true
    }
  ];

  // --------------------------------------------------
  // ITEM CATEGORIES
  // --------------------------------------------------

  readonly categories: ItemCategory[] = [
    {
      id: 1,
      categoryName: 'Tops',
      description: 'Shirts, blouses, and tops',
      isAvailable: true
    },
    {
      id: 2,
      categoryName: 'Bottoms',
      description: 'Pants, shorts, and skirts',
      isAvailable: true
    },
    {
      id: 3,
      categoryName: 'Bedding',
      description: 'Bedsheets, pillowcases, and blankets',
      isAvailable: true
    },
    {
      id: 4,
      categoryName: 'Delicates',
      description: 'Items requiring special care',
      isAvailable: true
    },
    {
      id: 5,
      categoryName: 'Comforters',
      description: 'Comforters and thick blankets',
      isAvailable: true
    }
  ];

  // --------------------------------------------------
  // PICKUP CAPACITY
  // --------------------------------------------------

  /**
   * Counts bookings assigned to a pickup date.
   * Cancelled bookings do not occupy a slot.
   * An optional booking ID can be excluded when editing.
   */
  getPickupDateBookingCount(
    bookings: CustomerBooking[],
    pickupDate: string,
    excludeBookingId?: string
  ): number {
    if (!pickupDate) {
      return 0;
    }

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

    return {
      valid: true,
      message: ''
    };
  }

  // --------------------------------------------------
  // CUSTOMER VALIDATION
  // --------------------------------------------------

  validatePhoneNumber(phoneNumber: string): string {
    const phone = (phoneNumber || '')
      .replace(/[\s\-()]/g, '');

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

    if (!email) {
      return '';
    }

    const validEmail =
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
    return isExpress
      ? baseSubtotal * (this.expressMultiplier - 1)
      : 0;
  }

  getGrandTotal(
    baseSubtotal: number,
    isExpress: boolean
  ): number {
    return baseSubtotal *
      (isExpress ? this.expressMultiplier : 1);
  }

  getBalance(total: number, paid: number): number {
    return Math.max(0, total - paid);
  }

  // --------------------------------------------------
  // PAYMENT LOGIC
  // --------------------------------------------------

  getPaymentStatus(
    paid: number,
    total: number
  ): PaymentStatus {
    if (paid <= 0) {
      return 'Unpaid';
    }

    if (paid < total) {
      return 'Partially Paid';
    }

    return 'Paid';
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
        data.expressMultiplier || (data.isExpress ? 2 : 1)
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

    if (selected < today) {
      return {
        valid: false,
        message: 'Past dates cannot be booked.'
      };
    }

    if (selected.getDay() === 0) {
      return {
        valid: false,
        message: 'The shop is closed on Sundays. Please choose another day.'
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
    if (!value) {
      return null;
    }

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

    while (date.getDay() === 0) {
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

  getUniqueCustomers(
    bookings: BookingRecord[]
  ): BookingRecord[] {

    const seen = new Set<string>();

    return bookings.filter(booking => {
      const key = booking.phoneNumber
        ? booking.phoneNumber.trim()
        : booking.customerName.toLowerCase().trim();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  filterCustomers(
    customers: BookingRecord[],
    searchQuery: string
  ): BookingRecord[] {

    const query = searchQuery.toLowerCase().trim();

    return customers.filter(customer => {
      return (
        !query ||
        customer.customerName.toLowerCase().includes(query) ||
        customer.phoneNumber.toLowerCase().includes(query) ||
        (customer.email || '').toLowerCase().includes(query)
      );
    });
  }

  getCustomerBookingCount(
    bookings: BookingRecord[],
    phoneNumber: string
  ): number {
    return bookings.filter(
      booking => booking.phoneNumber === phoneNumber
    ).length;
  }

  getCustomerBookings(
    bookings: BookingRecord[],
    customer: BookingRecord
  ): BookingRecord[] {

    return bookings.filter(booking => {
      if (customer.phoneNumber) {
        return booking.phoneNumber === customer.phoneNumber;
      }

      return (
        booking.customerName.toLowerCase() ===
        customer.customerName.toLowerCase()
      );
    });
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
      cells.push({
        day: 0,
        dateKey: ''
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = this.toDateString(
        new Date(year, monthIndex, day)
      );

      cells.push({
        day,
        dateKey
      });
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