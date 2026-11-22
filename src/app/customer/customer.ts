import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnInit,
  inject,
  ChangeDetectorRef
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { BookingService } from '../services/booking.service';

import {
  CustomerService,
  BookingRecord,
  BookingFormItem
} from '../customer';

import {
  CustomerBooking,
  BookingItem,
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  BOOKING_STATUS_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_STATUS_OPTIONS
} from '../rules';

@Component({
  selector: 'app-customer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer.html',
  styleUrl: './customer.css'
})
export class CustomerComponent implements OnInit {

  private readonly bookingService = inject(BookingService);
  private readonly customerService = inject(CustomerService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() initialView: 'records' | 'customers' = 'records';

  readonly bookingStatusOptions = BOOKING_STATUS_OPTIONS;
  readonly paymentMethodOptions = PAYMENT_METHOD_OPTIONS;
  readonly paymentStatusOptions = PAYMENT_STATUS_OPTIONS;

  readonly minimumWeight = this.customerService.minimumWeight;
  readonly maximumWeight = this.customerService.maximumWeight;
  readonly expressMultiplier = this.customerService.expressMultiplier;
  readonly maximumCapacity = this.customerService.maximumCapacity;

  readonly services = this.customerService.services;
  readonly categories = this.customerService.categories;

  bookings: BookingRecord[] = [];

  isLoading = false;
  isSaving = false;
  isUpdatingPayment = false;
  isCancellingBooking = false;

  isEditingBooking = false;
  editingBookingId: string | null = null;

  subView: 'records' | 'customers' | 'add' = 'records';

  searchQuery = '';
  statusFilter = 'ALL';

  errorMessage = '';
  successMessage = '';

  selectedBooking: BookingRecord | null = null;
  selectedCustomer: BookingRecord | null = null;

  showBookingDetails = false;
  showCustomerDetails = false;
  showReceipt = false;
  showCancellationForm = false;

  receiptBooking: BookingRecord | null = null;

  cancellationReason = '';

  paymentDraft: {
    paymentAmount: number;
    paymentMethod: PaymentMethod | '';
  } = {
    paymentAmount: 0,
    paymentMethod: ''
  };

  calendarMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );

  selectedDate = '';

  form = this.createEmptyForm();

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

  ngOnInit(): void {
    this.subView = this.initialView;
    this.loadBookings();
  }

  // --------------------------------------------------
  // CUSTOMER VALIDATION
  // --------------------------------------------------

  get phoneError(): string {
    return this.customerService.validatePhoneNumber(
      this.form.phoneNumber
    );
  }

  get emailError(): string {
    return this.customerService.validateEmail(
      this.form.email
    );
  }

  // --------------------------------------------------
  // BOOKING DATA
  // --------------------------------------------------

  loadBookings(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.cdr.markForCheck();

    this.bookingService.getBookings().subscribe({
      next: data => {
        this.bookings = data.map(booking =>
          this.normalizeBooking(booking)
        );

        this.isLoading = false;
        this.cdr.markForCheck();

        console.log('Bookings loaded successfully:', this.bookings);
      },

      error: error => {
        console.error('Unable to load bookings:', error);

        this.errorMessage =
          'Unable to load bookings. Make sure JSON Server is running.';

        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private normalizeBooking(
    booking: CustomerBooking
  ): BookingRecord {
    return this.customerService.normalizeBooking(booking);
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

    if (this.receiptBooking?.id === normalized.id) {
      this.receiptBooking = normalized;
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
  // BOOKING FORM CALCULATIONS
  // --------------------------------------------------

  get totalWeight(): number {
    return this.customerService.getTotalWeight(
      this.form.items
    );
  }

  get baseSubtotal(): number {
    return this.customerService.getBaseSubtotal(
      this.form.items
    );
  }

  get expressSurcharge(): number {
    return this.customerService.getExpressSurcharge(
      this.baseSubtotal,
      this.form.isExpress
    );
  }

  get grandTotal(): number {
    return this.customerService.getGrandTotal(
      this.baseSubtotal,
      this.form.isExpress
    );
  }

  get balance(): number {
    return this.customerService.getBalance(
      this.grandTotal,
      Number(this.form.amountPaid || 0)
    );
  }

  get currentPaymentStatus(): PaymentStatus {
    return this.customerService.getPaymentStatus(
      Number(this.form.amountPaid || 0),
      this.grandTotal
    );
  }

  // --------------------------------------------------
  // PICKUP CAPACITY
  // --------------------------------------------------

  get selectedPickupBookingCount(): number {
    return this.customerService.getPickupDateBookingCount(
      this.bookings,
      this.form.pickupDate,
      this.isEditingBooking ? this.editingBookingId || undefined : undefined
    );
  }

  get remainingPickupSlots(): number {
    return this.customerService.getRemainingPickupSlots(
      this.bookings,
      this.form.pickupDate,
      this.isEditingBooking ? this.editingBookingId || undefined : undefined
    );
  }

  get pickupCapacityMessage(): string {
    if (!this.form.pickupDate) {
      return '';
    }

    if (this.remainingPickupSlots <= 0) {
      return `Fully booked. This date has reached its maximum capacity of ${this.maximumCapacity} bookings.`;
    }

    return `${this.selectedPickupBookingCount} of ${this.maximumCapacity} bookings reserved. ${this.remainingPickupSlots} slot(s) remaining.`;
  }

  get pickupCapacityError(): string {
    if (!this.form.pickupDate) {
      return '';
    }

    const result = this.customerService.validatePickupCapacity(
      this.bookings,
      this.form.pickupDate,
      this.isEditingBooking ? this.editingBookingId || undefined : undefined
    );

    return result.message;
  }

  // --------------------------------------------------
  // BOOKING FORM VALIDATION
  // --------------------------------------------------

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
    const dateValidation = this.validatePickupDate(
      this.form.bookingDate,
      this.form.pickupDate,
      this.form.isExpress
    );

    if (!dateValidation.valid) {
      return dateValidation.message;
    }

    return this.pickupCapacityError;
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
      !this.phoneError &&
      !this.emailError &&
      this.form.address.trim().length >= 3 &&
      this.isItemsValid &&
      this.isWeightValid &&
      this.validateBookingDate(this.form.bookingDate).valid &&
      this.validatePickupDate(
        this.form.bookingDate,
        this.form.pickupDate,
        this.form.isExpress
      ).valid &&
      !this.pickupCapacityError &&
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

  // --------------------------------------------------
  // BOOKING FORM ACTIONS
  // --------------------------------------------------

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

    this.isEditingBooking = false;
    this.editingBookingId = null;

    this.errorMessage = '';
    this.successMessage = '';
  }

  getServicePrice(serviceId: number): number {
    return this.customerService.getServicePrice(serviceId);
  }

  getItemSubtotal(item: BookingFormItem): number {
    return this.customerService.getItemSubtotal(item);
  }

  // --------------------------------------------------
  // DATE VALIDATION
  // --------------------------------------------------

  validateBookingDate(
    dateValue: string
  ): { valid: boolean; message: string } {
    return this.customerService.validateBookingDate(dateValue);
  }

  validatePickupDate(
    bookingDate: string,
    pickupDate: string,
    isExpress: boolean
  ): { valid: boolean; message: string } {
    return this.customerService.validatePickupDate(
      bookingDate,
      pickupDate,
      isExpress
    );
  }

  private getNextValidDate(): string {
    return this.customerService.getNextValidDate();
  }

  // --------------------------------------------------
  // CREATE OR UPDATE BOOKING
  // --------------------------------------------------

  submitForm(): void {
    this.submitBooking();
  }

  submitBooking(): void {
    if (this.isSaving) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    if (!this.isFormValid) {
      this.errorMessage =
        this.pickupCapacityError ||
        'Please correct the highlighted fields before submitting.';
      return;
    }

    // Recheck capacity immediately before saving.
    const capacityCheck = this.customerService.validatePickupCapacity(
      this.bookings,
      this.form.pickupDate,
      this.isEditingBooking ? this.editingBookingId || undefined : undefined
    );

    if (!capacityCheck.valid) {
      this.errorMessage = capacityCheck.message;
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

    // --------------------------------------------------
    // UPDATE EXISTING BOOKING
    // --------------------------------------------------

    if (this.isEditingBooking && this.editingBookingId) {
      const existing = this.bookings.find(
        entry => entry.id === this.editingBookingId
      );

      if (!existing) {
        this.isSaving = false;
        this.errorMessage = 'The booking could not be found.';
        this.cdr.markForCheck();
        return;
      }

      const updatedBooking = {
        ...booking,
        id: existing.id,
        bookingNumber: existing.bookingNumber,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
        status: existing.status,
        completedAt: existing.completedAt,
        cancellationReason: existing.cancellationReason
      } as CustomerBooking;

      this.bookingService.updateBooking(
        existing.id,
        updatedBooking
      ).subscribe({
        next: saved => {
          this.replaceBooking(saved);

          this.isSaving = false;
          this.isEditingBooking = false;
          this.editingBookingId = null;

          this.form = this.createEmptyForm();
          this.subView = 'records';

          this.successMessage =
            `Booking ${saved.bookingNumber} has been updated successfully.`;

          this.cdr.markForCheck();
        },

        error: error => {
          console.error('Unable to update booking:', error);

          this.isSaving = false;
          this.errorMessage =
            'Unable to update booking. Please try again.';

          this.cdr.markForCheck();
        }
      });

      return;
    }

    // --------------------------------------------------
    // CREATE NEW BOOKING
    // --------------------------------------------------

    this.bookingService.addBooking(booking).subscribe({
      next: saved => {
        this.bookings.unshift(this.normalizeBooking(saved));

        this.isSaving = false;
        this.form = this.createEmptyForm();
        this.subView = 'records';

        this.successMessage =
          `Booking ${saved.bookingNumber} has been added successfully.`;

        this.cdr.markForCheck();
      },

      error: error => {
        console.error('Unable to save booking:', error);

        this.isSaving = false;
        this.errorMessage =
          'Unable to save booking. Please check your connection and make sure JSON Server is running.';

        this.cdr.markForCheck();
      }
    });
  }

  // --------------------------------------------------
  // BOOKING RECORDS AND FILTERING
  // --------------------------------------------------

  get filteredBookings(): BookingRecord[] {
    return this.customerService.filterBookings(
      this.bookings,
      this.searchQuery,
      this.statusFilter
    );
  }

  getBookingServiceNames(booking: BookingRecord): string {
    return this.customerService.getBookingServiceNames(booking);
  }

  // --------------------------------------------------
  // BOOKING STATUS
  // --------------------------------------------------

  updateStatus(
    booking: BookingRecord,
    status: BookingStatus
  ): void {
    if (
      booking.status === 'Done' ||
      booking.status === 'Cancelled' ||
      status === 'Cancelled' ||
      booking.status === status
    ) {
      return;
    }

    const now = new Date().toISOString();

    const updated = {
      ...booking,
      status,
      updatedAt: now,
      completedAt: status === 'Done'
        ? now
        : undefined
    } as CustomerBooking;

    this.errorMessage = '';
    this.successMessage = '';

    this.bookingService.updateBooking(
      booking.id,
      updated
    ).subscribe({
      next: saved => {
        this.replaceBooking(saved);

        this.successMessage =
          `Booking ${saved.bookingNumber} status changed to ${saved.status}.`;

        this.cdr.markForCheck();
      },

      error: error => {
        console.error('Unable to update booking status:', error);

        this.errorMessage = 'Unable to update booking status.';
        this.cdr.markForCheck();
      }
    });
  }

  // --------------------------------------------------
  // BOOKING CANCELLATION
  // --------------------------------------------------

  openCancellationForm(): void {
    if (
      !this.selectedBooking ||
      this.selectedBooking.status === 'Done' ||
      this.selectedBooking.status === 'Cancelled'
    ) {
      this.errorMessage =
        'Completed or cancelled bookings cannot be cancelled.';
      return;
    }

    this.showCancellationForm = true;
    this.cancellationReason = '';
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeCancellationForm(): void {
    this.showCancellationForm = false;
    this.cancellationReason = '';
    this.errorMessage = '';
  }

  cancelBooking(): void {
    if (!this.selectedBooking || this.isCancellingBooking) {
      return;
    }

    const reason = this.cancellationReason.trim();

    if (reason.length < 5) {
      this.errorMessage =
        'Please provide a cancellation reason with at least 5 characters.';
      return;
    }

    if (this.selectedBooking.status === 'Cancelled') {
      this.errorMessage = 'This booking is already cancelled.';
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to cancel booking ${this.selectedBooking.bookingNumber}?`
    );

    if (!confirmed) {
      return;
    }

    const booking = this.selectedBooking;

    const updated = {
      ...booking,
      status: 'Cancelled' as BookingStatus,
      cancellationReason: reason,
      updatedAt: new Date().toISOString()
    } as CustomerBooking;

    this.isCancellingBooking = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.bookingService.updateBooking(
      booking.id,
      updated
    ).subscribe({
      next: saved => {
        this.replaceBooking(saved);

        this.isCancellingBooking = false;
        this.showCancellationForm = false;
        this.cancellationReason = '';

        this.successMessage =
          `Booking ${saved.bookingNumber} has been cancelled.`;

        this.cdr.markForCheck();
      },

      error: error => {
        console.error('Unable to cancel booking:', error);

        this.isCancellingBooking = false;
        this.errorMessage =
          'Unable to cancel booking. Please try again.';

        this.cdr.markForCheck();
      }
    });
  }

  // --------------------------------------------------
  // BOOKING DETAILS MODAL
  // --------------------------------------------------

  openBookingDetails(booking: BookingRecord): void {
    this.selectedBooking = booking;

    this.paymentDraft = {
      paymentAmount: 0,
      paymentMethod: ''
    };

    this.cancellationReason = '';
    this.showCancellationForm = false;

    this.errorMessage = '';
    this.successMessage = '';

    this.showBookingDetails = true;
  }

  closeBookingDetails(): void {
    this.showBookingDetails = false;
    this.selectedBooking = null;

    this.showCancellationForm = false;
    this.cancellationReason = '';

    this.errorMessage = '';
    this.successMessage = '';
  }

  // --------------------------------------------------
  // PAYMENT VALIDATION AND UPDATE
  // --------------------------------------------------

  get paymentUpdateError(): string {
    if (!this.selectedBooking) {
      return '';
    }

    const amount = Number(this.paymentDraft.paymentAmount);
    const balance = Number(this.selectedBooking.balance);

    if (
      this.paymentDraft.paymentAmount === null ||
      this.paymentDraft.paymentAmount === undefined ||
      this.paymentDraft.paymentAmount === 0 ||
      this.paymentDraft.paymentAmount === ('' as unknown as number)
    ) {
      return '';
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return 'Enter a valid payment amount greater than zero.';
    }

    if (amount > balance) {
      return `Payment cannot exceed the remaining balance of ${this.currency(balance)}.`;
    }

    if (!this.paymentDraft.paymentMethod) {
      return 'Please select a payment method.';
    }

    return '';
  }

  savePaymentUpdate(): void {
    if (!this.selectedBooking || this.isUpdatingPayment) {
      return;
    }

    const booking = this.selectedBooking;
    const newPayment = Number(this.paymentDraft.paymentAmount);
    const remainingBalance = Number(booking.balance);

    if (!Number.isFinite(newPayment) || newPayment <= 0) {
      this.errorMessage = 'Enter a payment amount greater than zero.';
      return;
    }

    if (newPayment > remainingBalance) {
      this.errorMessage = 'Payment cannot exceed the remaining balance.';
      return;
    }

    if (!this.paymentDraft.paymentMethod) {
      this.errorMessage = 'Please select a payment method.';
      return;
    }

    const updatedAmountPaid =
      Number(booking.amountPaid) + newPayment;

    const updatedBalance = this.customerService.getBalance(
      Number(booking.totalAmount),
      updatedAmountPaid
    );

    const updated = {
      ...booking,
      amountPaid: updatedAmountPaid,
      balance: updatedBalance,
      paymentStatus: this.getPaymentStatus(
        updatedAmountPaid,
        Number(booking.totalAmount)
      ),
      paymentMethod: this.paymentDraft.paymentMethod,
      updatedAt: new Date().toISOString()
    } as CustomerBooking;

    this.isUpdatingPayment = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.bookingService.updateBooking(
      booking.id,
      updated
    ).subscribe({
      next: saved => {
        this.replaceBooking(saved);

        this.isUpdatingPayment = false;

        this.paymentDraft = {
          paymentAmount: 0,
          paymentMethod: ''
        };

        this.successMessage =
          `Payment of ${this.currency(newPayment)} recorded successfully.`;

        this.cdr.markForCheck();
      },

      error: error => {
        console.error('Unable to update payment:', error);

        this.isUpdatingPayment = false;
        this.errorMessage =
          'Unable to save payment. Please try again.';

        this.cdr.markForCheck();
      }
    });
  }

  getPaymentStatus(
    paid: number,
    total: number
  ): PaymentStatus {
    return this.customerService.getPaymentStatus(paid, total);
  }

  // --------------------------------------------------
  // EDIT BOOKING
  // --------------------------------------------------

  editBooking(booking: BookingRecord): void {
    if (booking.status === 'Done') {
      this.errorMessage = 'Completed bookings cannot be edited.';
      return;
    }

    if (booking.status === 'Cancelled') {
      this.errorMessage = 'Cancelled bookings cannot be edited.';
      return;
    }

    this.isEditingBooking = true;
    this.editingBookingId = booking.id;

    this.form = {
      customerName: booking.customerName,
      phoneNumber: booking.phoneNumber,
      email: booking.email || '',
      address: booking.address,
      bookingDate: booking.bookingDate,
      pickupDate: booking.pickupDate,
      isExpress: booking.isExpress,
      amountPaid: booking.amountPaid,
      paymentMethod: booking.paymentMethod || '',
      notes: booking.notes || '',
      items: booking.items.map(item => ({
        serviceId: item.serviceId,
        itemCategoryId: item.itemCategoryId,
        weight: item.weight
      }))
    };

    this.errorMessage = '';
    this.successMessage = '';

    this.showBookingDetails = false;
    this.showCancellationForm = false;
    this.selectedBooking = null;

    this.subView = 'add';
  }

  // --------------------------------------------------
  // CUSTOMER DIRECTORY
  // --------------------------------------------------

  get uniqueCustomers(): BookingRecord[] {
    return this.customerService.getUniqueCustomers(
      this.bookings
    );
  }

  get filteredCustomers(): BookingRecord[] {
    return this.customerService.filterCustomers(
      this.uniqueCustomers,
      this.searchQuery
    );
  }

  getCustomerBookingCount(phoneNumber: string): number {
    return this.customerService.getCustomerBookingCount(
      this.bookings,
      phoneNumber
    );
  }

  getCustomerBookings(customer: BookingRecord): BookingRecord[] {
    return this.customerService.getCustomerBookings(
      this.bookings,
      customer
    );
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
  // BOOKING CALENDAR
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
    return this.customerService.getCalendarCells(
      this.calendarMonth
    );
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

    return this.customerService.getBookingsOnDate(
      this.bookings,
      this.selectedDate
    );
  }

  hasBookingsOnDate(dateKey: string): boolean {
    return this.customerService.hasBookingsOnDate(
      this.bookings,
      dateKey
    );
  }

  // --------------------------------------------------
  // RECEIPT
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

  // --------------------------------------------------
  // GENERAL UTILITIES
  // --------------------------------------------------

  currency(value: number): string {
    return this.customerService.formatCurrency(value);
  }

  trackByBooking(
    _index: number,
    booking: BookingRecord
  ): string {
    return booking.id;
  }
}