import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { BookingService } from '../services/booking.service';
import {
  CustomerBooking,
  BookingItem,
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  LaundryService,
  ItemCategory
} from '../rules';

type BookingRecord = CustomerBooking & {
  subtotal: number;
  expressMultiplier: number;
  balance: number;
};

type BookingFormItem = {
  serviceId: number;
  itemCategoryId: number;
  weight: number;
};

@Component({
  selector: 'app-customer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer.html',
  styleUrl: './customer.css'
})
export class CustomerComponent implements OnInit {
  private bookingService = inject(BookingService);

  @Input() initialView: 'records' | 'customers' = 'records';

  bookings: BookingRecord[] = [];

  isLoading = false;
  isSaving = false;
  isUpdatingPayment = false;

  errorMessage = '';
  successMessage = '';

  subView: 'records' | 'customers' | 'add' = 'records';

  searchQuery = '';
  statusFilter = 'ALL';

  selectedBooking: BookingRecord | null = null;
  selectedCustomer: BookingRecord | null = null;

showBookingDetails = false;
showCustomerDetails = false;
showReceipt = false;

receiptBooking: BookingRecord | null = null;

  paymentDraft = {
    amountPaid: 0,
    paymentMethod: '' as PaymentMethod | ''
  };

  calendarMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );

  selectedDate = '';

  readonly minimumWeight = 3;
  readonly maximumWeight = 20;
  readonly expressMultiplier = 2;

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

  form = this.createEmptyForm();

  ngOnInit(): void {
    this.subView = this.initialView;
    this.loadBookings();
  }

  private createEmptyForm() {
    return {
      customerName: '',
      phoneNumber: '',
      email: '',
      address: '',
      bookingDate: this.getNextValidDate(),
      pickupDate: '',
      isExpress: false,
      amountPaid: 0,
      paymentMethod: '' as PaymentMethod | '',
      notes: '',
      items: [
        {
          serviceId: 1,
          itemCategoryId: 1,
          weight: 0
        }
      ] as BookingFormItem[]
    };
  }

  // --------------------------------------------------
  // BOOKING DATA
  // --------------------------------------------------

  loadBookings(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.bookingService.getBookings().subscribe({
      next: data => {
        this.bookings = data.map(booking =>
          this.normalizeBooking(booking)
        );

        this.isLoading = false;
      },
      error: () => {
        this.errorMessage =
          'Unable to load bookings. Make sure JSON Server is running.';

        this.isLoading = false;
      }
    });
  }

  private normalizeBooking(
    booking: CustomerBooking
  ): BookingRecord {
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

    const paymentStatus = this.getPaymentStatus(
      amountPaid,
      totalAmount
    );

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
      paymentStatus,
      status: data.status === 'In-Progress'
        ? 'In Progress'
        : data.status || 'Pending'
    } as BookingRecord;
  }

  private replaceBooking(updated: CustomerBooking): void {
    const normalized = this.normalizeBooking(updated);

    this.bookings = this.bookings.map(booking =>
      booking.id === normalized.id ? normalized : booking
    );

    if (this.selectedBooking?.id === normalized.id) {
      this.selectedBooking = normalized;
    }

    if (this.selectedCustomer?.id === normalized.id) {
      this.selectedCustomer = normalized;
    }
  }

  // --------------------------------------------------
  // VIEW NAVIGATION
  // --------------------------------------------------

  switchSubView(
    view: 'records' | 'customers' | 'add'
  ): void {
    this.subView = view;
    this.errorMessage = '';
    this.successMessage = '';

    if (view === 'add') {
      this.resetForm();
    }
  }

  // --------------------------------------------------
  // BOOKING FORM
  // --------------------------------------------------

  get totalWeight(): number {
    return this.form.items.reduce(
      (total, item) => total + Number(item.weight || 0),
      0
    );
  }

  get baseSubtotal(): number {
    return this.form.items.reduce(
      (total, item) =>
        total + this.getItemSubtotal(item),
      0
    );
  }

  get expressSurcharge(): number {
    return this.form.isExpress
      ? this.baseSubtotal * (this.expressMultiplier - 1)
      : 0;
  }

  get grandTotal(): number {
    return this.baseSubtotal *
      (this.form.isExpress ? this.expressMultiplier : 1);
  }

  get balance(): number {
    return Math.max(
      0,
      this.grandTotal - Number(this.form.amountPaid || 0)
    );
  }

  get currentPaymentStatus(): PaymentStatus {
    return this.getPaymentStatus(
      Number(this.form.amountPaid || 0),
      this.grandTotal
    );
  }

  get weightError(): string {
    if (this.totalWeight <= 0) {
      return 'Please enter the weight of your laundry items.';
    }

    if (this.totalWeight < this.minimumWeight) {
      return `Minimum booking weight is ${this.minimumWeight} kg.`;
    }

    if (this.totalWeight > this.maximumWeight) {
      return `Maximum booking weight is ${this.maximumWeight} kg.`;
    }

    return '';
  }

  get dateError(): string {
    return this.validateBookingDate(
      this.form.bookingDate
    ).message;
  }

  get pickupDateError(): string {
    return this.validatePickupDate(
      this.form.bookingDate,
      this.form.pickupDate,
      this.form.isExpress
    ).message;
  }

  get isItemsValid(): boolean {
    return (
      this.form.items.length > 0 &&
      this.form.items.every(item =>
        Number(item.weight) > 0 &&
        this.getServicePrice(item.serviceId) > 0
      )
    );
  }

  get isWeightValid(): boolean {
    return (
      this.totalWeight >= this.minimumWeight &&
      this.totalWeight <= this.maximumWeight
    );
  }

  get isFormValid(): boolean {
    const paid = Number(this.form.amountPaid || 0);

    return (
      this.form.customerName.trim().length >= 2 &&
      this.form.phoneNumber.trim().length >= 7 &&
      this.form.address.trim().length >= 3 &&
      this.isItemsValid &&
      this.isWeightValid &&
      this.validateBookingDate(this.form.bookingDate).valid &&
      this.validatePickupDate(
        this.form.bookingDate,
        this.form.pickupDate,
        this.form.isExpress
      ).valid &&
      Number.isFinite(paid) &&
      paid >= 0 &&
      paid <= this.grandTotal &&
      (
        paid === 0 ||
        this.form.paymentMethod !== ''
      )
    );
  }

  get isFormValidForSubmission(): boolean {
    return this.isFormValid;
  }

  addItemRow(): void {
    this.form.items.push({
      serviceId: 1,
      itemCategoryId: 1,
      weight: 0
    });
  }

  removeItemRow(index: number): void {
    if (this.form.items.length > 1) {
      this.form.items.splice(index, 1);
    }
  }

  resetForm(): void {
    this.form = this.createEmptyForm();
    this.errorMessage = '';
    this.successMessage = '';
  }

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

    if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) {
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

  private getNextValidDate(): string {
    const date = new Date();
    date.setHours(0, 0, 0, 0);

    while (date.getDay() === 0) {
      date.setDate(date.getDate() + 1);
    }

    return this.toDateString(date);
  }

  private toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // --------------------------------------------------
  // CREATE BOOKING
  // --------------------------------------------------

  submitForm(): void {
    this.submitBooking();
  }

  submitBooking(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.isFormValid) {
      this.errorMessage =
        'Please correct the highlighted fields before submitting.';

      return;
    }

    this.isSaving = true;

    const now = new Date().toISOString();

    const bookingNumber =
      `LABA-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const items: BookingItem[] = this.form.items.map(item => {
      const service = this.services.find(
        entry => entry.id === Number(item.serviceId)
      );

      const category = this.categories.find(
        entry => entry.id === Number(item.itemCategoryId)
      );

      const pricePerKg = Number(service?.pricePerKg || 0);
      const weight = Number(item.weight);

      return {
        serviceId: Number(item.serviceId),
        itemCategoryId: Number(item.itemCategoryId),
        serviceName: service?.serviceName || 'Service',
        categoryName: category?.categoryName || 'Item',
        weight,
        pricePerKg,
        subtotal: weight * pricePerKg
      };
    });

    const amountPaid = Number(this.form.amountPaid || 0);

    const booking = {
      id: bookingNumber,
      bookingNumber,

      customerName: this.form.customerName.trim(),
      phoneNumber: this.form.phoneNumber.trim(),
      email: this.form.email.trim(),
      address: this.form.address.trim(),

      bookingDate: this.form.bookingDate,
      pickupDate: this.form.pickupDate,

      items,

      weightKg: this.totalWeight,
      totalWeight: this.totalWeight,

      servicePrice: this.baseSubtotal,
      subtotal: this.baseSubtotal,

      isExpress: this.form.isExpress,
      expressMultiplier: this.form.isExpress
        ? this.expressMultiplier
        : 1,

      totalAmount: this.grandTotal,
      amountPaid,
      balance: this.balance,

      paymentStatus: this.currentPaymentStatus,
      paymentMethod: this.form.paymentMethod,

      status: 'Pending' as BookingStatus,
      notes: this.form.notes.trim(),

      createdAt: now,
      updatedAt: now
    } as CustomerBooking;

    this.bookingService.addBooking(booking).subscribe({
      next: saved => {
        this.bookings.unshift(
          this.normalizeBooking(saved)
        );

        this.successMessage =
          `Booking ${bookingNumber} has been added successfully.`;

        this.isSaving = false;
        this.form = this.createEmptyForm();
        this.subView = 'records';
      },
      error: () => {
        this.errorMessage =
          'Unable to save booking. Please check JSON Server.';

        this.isSaving = false;
      }
    });
  }

  // --------------------------------------------------
  // BOOKING RECORDS
  // --------------------------------------------------

  get filteredBookings(): BookingRecord[] {
    const query = this.searchQuery.toLowerCase().trim();

    return this.bookings.filter(booking => {
      const matchesSearch =
        !query ||
        booking.bookingNumber.toLowerCase().includes(query) ||
        booking.customerName.toLowerCase().includes(query) ||
        booking.phoneNumber.toLowerCase().includes(query);

      const matchesStatus =
        this.statusFilter === 'ALL' ||
        booking.status === this.statusFilter;

      return matchesSearch && matchesStatus;
    });
  }

  getBookingServiceNames(booking: BookingRecord): string {
    const names = booking.items
      .map(item => item.serviceName)
      .filter(Boolean);

    return [...new Set(names)].join(', ') || 'Laundry Service';
  }

  updateStatus(
    booking: BookingRecord,
    status: BookingStatus
  ): void {
    if (booking.status === 'Cancelled') {
      return;
    }

    const now = new Date().toISOString();

    const updated = {
      ...booking,
      status,
      updatedAt: now,
      completedAt: status === 'Done'
        ? now
        : booking.completedAt
    } as CustomerBooking;

    this.bookingService.updateBooking(
      booking.id,
      updated
    ).subscribe({
      next: saved => this.replaceBooking(saved),
      error: () => {
        this.errorMessage =
          'Unable to update booking status.';
      }
    });
  }

  deleteBooking(booking: BookingRecord): void {
    const confirmed = window.confirm(
      `Delete booking ${booking.bookingNumber}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    this.bookingService.deleteBooking(booking.id).subscribe({
      next: () => {
        this.bookings = this.bookings.filter(
          entry => entry.id !== booking.id
        );

        this.closeBookingDetails();
      },
      error: () => {
        this.errorMessage = 'Unable to delete booking.';
      }
    });
  }

  // --------------------------------------------------
  // BOOKING DETAILS AND PAYMENT UPDATE
  // --------------------------------------------------

  openBookingDetails(booking: BookingRecord): void {
    this.selectedBooking = booking;

    this.paymentDraft = {
      amountPaid: booking.amountPaid,
      paymentMethod: booking.paymentMethod || ''
    };

    this.showBookingDetails = true;
  }

  closeBookingDetails(): void {
    this.showBookingDetails = false;
    this.selectedBooking = null;
  }

  get paymentUpdateError(): string {
    if (!this.selectedBooking) {
      return '';
    }

    const paid = Number(this.paymentDraft.amountPaid);

    if (!Number.isFinite(paid) || paid < 0) {
      return 'Enter a valid payment amount.';
    }

    if (paid > this.selectedBooking.totalAmount) {
      return 'Amount paid cannot exceed the total charges.';
    }

    if (paid > 0 && !this.paymentDraft.paymentMethod) {
      return 'Please select a payment method.';
    }

    return '';
  }

  savePaymentUpdate(): void {
    if (!this.selectedBooking) {
      return;
    }

    if (this.paymentUpdateError) {
      this.errorMessage = this.paymentUpdateError;
      return;
    }

    const booking = this.selectedBooking;
    const amountPaid = Number(this.paymentDraft.amountPaid);
    const now = new Date().toISOString();

    const updated = {
      ...booking,
      amountPaid,
      balance: Math.max(0, booking.totalAmount - amountPaid),
      paymentStatus: this.getPaymentStatus(
        amountPaid,
        booking.totalAmount
      ),
      paymentMethod: this.paymentDraft.paymentMethod,
      updatedAt: now
    } as CustomerBooking;

    this.isUpdatingPayment = true;
    this.errorMessage = '';

    this.bookingService.updateBooking(
      booking.id,
      updated
    ).subscribe({
      next: saved => {
        this.replaceBooking(saved);
        this.isUpdatingPayment = false;
        this.successMessage = 'Payment information updated successfully.';
      },
      error: () => {
        this.isUpdatingPayment = false;
        this.errorMessage = 'Unable to update payment information.';
      }
    });
  }

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
  // CUSTOMER LIST AND CUSTOMER HISTORY
  // --------------------------------------------------

  get uniqueCustomers(): BookingRecord[] {
    const seen = new Set<string>();

    return this.bookings.filter(booking => {
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

  get filteredCustomers(): BookingRecord[] {
    const query = this.searchQuery.toLowerCase().trim();

    return this.uniqueCustomers.filter(customer => {
      return (
        !query ||
        customer.customerName.toLowerCase().includes(query) ||
        customer.phoneNumber.toLowerCase().includes(query) ||
        (customer.email || '').toLowerCase().includes(query)
      );
    });
  }

  getCustomerBookingCount(phoneNumber: string): number {
    return this.bookings.filter(
      booking => booking.phoneNumber === phoneNumber
    ).length;
  }

  getCustomerBookings(customer: BookingRecord): BookingRecord[] {
    return this.bookings.filter(booking => {
      if (customer.phoneNumber) {
        return booking.phoneNumber === customer.phoneNumber;
      }

      return (
        booking.customerName.toLowerCase() ===
        customer.customerName.toLowerCase()
      );
    });
  }

  openCustomerDetails(customer: BookingRecord): void {
    this.selectedCustomer = customer;
    this.showCustomerDetails = true;
  }

  closeCustomerDetails(): void {
    this.showCustomerDetails = false;
    this.selectedCustomer = null;
  }

  // --------------------------------------------------
  // CALENDAR
  // --------------------------------------------------

  get calendarMonthLabel(): string {
    return this.calendarMonth.toLocaleDateString('en-PH', {
      month: 'long',
      year: 'numeric'
    });
  }

  get calendarCells(): {
    day: number;
    dateKey: string;
  }[] {
    const year = this.calendarMonth.getFullYear();
    const month = this.calendarMonth.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: {
      day: number;
      dateKey: string;
    }[] = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: 0, dateKey: '' });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = this.toDateString(
        new Date(year, month, day)
      );

      cells.push({ day, dateKey });
    }

    return cells;
  }

  changeMonth(amount: number): void {
    this.calendarMonth = new Date(
      this.calendarMonth.getFullYear(),
      this.calendarMonth.getMonth() + amount,
      1
    );
  }

  selectDate(dateKey: string): void {
    this.selectedDate = dateKey;
  }

  get selectedDateBookings(): BookingRecord[] {
    if (!this.selectedDate) {
      return [];
    }

    return this.bookings.filter(
      booking => booking.bookingDate === this.selectedDate
    );
  }

  hasBookingsOnDate(dateKey: string): boolean {
    return this.bookings.some(
      booking => booking.bookingDate === dateKey
    );
  }

// --------------------------------------------------
// RECEIPT AND UTILITIES
// --------------------------------------------------

openReceipt(booking: BookingRecord): void {
  this.receiptBooking = booking;
  this.showReceipt = true;
}

closeReceipt(): void {
  this.showReceipt = false;
  this.receiptBooking = null;
}

printReceipt(): void {
  if (!this.receiptBooking) {
    return;
  }

  window.print();
}

currency(value: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(Number(value || 0));
}

trackByBooking(
  _index: number,
  booking: BookingRecord
): string {
  return booking.id;
}
}