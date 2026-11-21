
import { Injectable } from '@angular/core';
import {
  CustomerBooking,
  PaymentStatus
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

@Injectable({
  providedIn: 'root'
})
export class CustomerService {

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
      balance: Math.max(0, totalAmount - amountPaid),
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
}
