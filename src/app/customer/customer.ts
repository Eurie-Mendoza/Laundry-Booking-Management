import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnInit,
  inject,
  ChangeDetectorRef
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { BookingService } from '../services/booking.service';

import {
  CustomerService,
  BookingRecord,
  BookingFormItem
} from '../customer';

import {
  Customer,
  CustomerBooking,
  BookingItem,
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  BookingStatusOption,
  PaymentMethodOption,
  PaymentStatusOption
} from '../rules';

type BookingFormLoadItem = BookingFormItem & { loads: number; loadsChanged?: boolean };

@Component({
  selector: 'app-customer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer.html',
  styleUrl: './customer.css'
})
export class CustomerComponent implements OnInit {

  readonly kilogramsPerLoad = 7;
  currentBookingStep: 1 | 2 | 3 = 1;
  bookingDateSort: 'asc' | 'desc' = 'desc';

  private readonly bookingService = inject(BookingService);
  private readonly customerService = inject(CustomerService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() initialView: 'records' | 'customers' = 'records';

  // Options retrieved from db.json.
  bookingStatusOptions: BookingStatusOption[] = [];
  paymentMethodOptions: PaymentMethodOption[] = [];
  paymentStatusOptions: PaymentStatusOption[] = [];

  // Shop settings retrieved from db.json.
  minimumWeight = 0;
  maximumWeight = 0;
  expressMultiplier = 1;
  maximumCapacity = 0;
  expressEnabled = false;
  allowCancellation = false;

  // Configuration data.
  services = this.customerService.services;
  categories = this.customerService.categories;

  // Database records.
  bookings: BookingRecord[] = [];
  customers: Customer[] = [];

  isLoading = false;
  isLoadingCustomers = false;
  isSaving = false;
  isUpdatingPayment = false;
  isCancellingBooking = false;
  isConfigurationLoading = true;

  isEditingBooking = false;
  editingBookingId: string | null = null;

  subView: 'records' | 'customers' | 'add' = 'records';

  searchQuery = '';
  statusFilter = 'ALL';

  errorMessage = '';
  successMessage = '';

  selectedBooking: BookingRecord | null = null;
  selectedCustomer: Customer | null = null;

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

  // --------------------------------------------------
  // FORM INITIALIZATION
  // --------------------------------------------------

  private createEmptyForm() {
    return {
      firstName: '',
      lastName: '',
      middleName: '',
      suffix: '',
      phoneNumber: '',
      email: '',
      houseNo: '',
      street: '',
      barangay: '',
      city: '',
      province: '',
      bookingDate: this.getNextValidDate(),
      pickupDate: '',
      isExpress: false,
      amountPaid: 0,
      paymentMethod: '' as PaymentMethod | '',
      notes: '',
      items: [
        {
          serviceId: this.services[0]?.id ?? 0,
          itemCategoryId: this.categories[0]?.id ?? 0,
          loads: 0,
          loadsChanged: false,
          weight: 0
        }
      ] as BookingFormLoadItem[]
    };
  }

  private composeCustomerName(): string {
    return [
      this.form.firstName,
      this.form.middleName,
      this.form.lastName,
      this.form.suffix
    ]
      .map(value => String(value || '').trim())
      .filter(Boolean)
      .join(' ');
  }

  private composeCustomerAddress(): string {
    return [
      this.form.houseNo,
      this.form.street,
      this.form.barangay,
      this.form.city,
      this.form.province
    ]
      .map(value => String(value || '').trim())
      .filter(Boolean)
      .join(', ');
  }

  private splitLegacyCustomerName(name: string): {
    firstName: string;
    middleName: string;
    lastName: string;
    suffix: string;
  } {
    const parts = String(name || '').trim().split(/\\s+/).filter(Boolean);

    if (parts.length <= 1) {
      return {
        firstName: parts[0] || '',
        middleName: '',
        lastName: '',
        suffix: ''
      };
    }

    const suffixPattern = /^(jr\\.?|sr\\.?|ii|iii|iv|v)$/i;
    const suffix = suffixPattern.test(parts[parts.length - 1])
      ? parts.pop() || ''
      : '';

    return {
      firstName: parts[0] || '',
      middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : '',
      lastName: parts.length > 1 ? parts[parts.length - 1] : '',
      suffix
    };
  }

  // --------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------

  ngOnInit(): void {
    this.subView = this.initialView;

    this.loadConfiguration();
    this.loadBookings();
    this.loadCustomers();
  }

  // --------------------------------------------------
  // LOAD CONFIGURATION FROM DB.JSON
  // --------------------------------------------------

  loadConfiguration(): void {
    this.isConfigurationLoading = true;
    this.errorMessage = '';

    forkJoin({
      services: this.customerService.getServices(),
      categories: this.customerService.getCategories(),
      shopRules: this.customerService.getShopRules(),
      bookingStatuses: this.customerService.getBookingStatuses(),
      paymentStatuses: this.customerService.getPaymentStatuses(),
      paymentMethods: this.customerService.getPaymentMethods()
    }).subscribe({
      next: data => {

        this.services = data.services.filter(
          service => service.isAvailable
        );

        this.categories = data.categories.filter(
          category => category.isAvailable
        );

        this.bookingStatusOptions = data.bookingStatuses.filter(
          status => status.isActive
        );

        this.paymentStatusOptions = data.paymentStatuses.filter(
          status => status.isActive
        );

        this.paymentMethodOptions = data.paymentMethods.filter(
          method => method.isActive
        );

        this.customerService.services = this.services;
        this.customerService.categories = this.categories;
        this.customerService.bookingStatuses = this.bookingStatusOptions;
        this.customerService.paymentStatuses = this.paymentStatusOptions;
        this.customerService.paymentMethods = this.paymentMethodOptions;

        const rules = data.shopRules[0];

        if (rules) {
          this.customerService.applyShopRules(rules);

          this.minimumWeight =
            this.customerService.minimumWeight;

          this.maximumWeight =
            this.customerService.maximumWeight;

          this.expressMultiplier =
            this.customerService.expressMultiplier;

          this.maximumCapacity =
            this.customerService.maximumCapacity;

          this.expressEnabled =
            this.customerService.expressEnabled;

          this.allowCancellation =
            this.customerService.allowCancellation;
        } else {
          this.errorMessage =
            'No shop rules were found in db.json.';
        }

        if (!this.expressEnabled) {
          this.form.isExpress = false;
        }

        const firstService = this.services[0];
        const firstCategory = this.categories[0];

        if (
          firstService &&
          firstCategory &&
          !this.isEditingBooking
        ) {
          this.form.items = this.form.items.map(item => ({
            ...item,
            serviceId: firstService.id,
            itemCategoryId: firstCategory.id
          }));
        }

        if (!this.isEditingBooking) {
          this.form.bookingDate = this.getNextValidDate();
        }

        this.isConfigurationLoading = false;

        this.cdr.markForCheck();

        console.log('Shop configuration loaded:', data);
      },

      error: error => {
        console.error(
          'Unable to load shop configuration:',
          error
        );

        this.isConfigurationLoading = false;

        this.errorMessage =
          'Unable to load shop settings. Please check JSON Server and your db.json data.';

        this.cdr.markForCheck();
      }
    });
  }

  // --------------------------------------------------
  // CUSTOMER DATA
  // --------------------------------------------------

  loadCustomers(): void {
    this.isLoadingCustomers = true;

    this.customerService.getCustomers().subscribe({
      next: data => {
        this.customers = data;

        // Keep the service's customer collection synchronized.
        this.customerService.customers = data;

        this.isLoadingCustomers = false;
        this.cdr.markForCheck();

        console.log(
          'Customers loaded successfully:',
          this.customers
        );
      },

      error: error => {
        console.error(
          'Unable to load customers:',
          error
        );

        this.isLoadingCustomers = false;

        this.errorMessage =
          'Unable to load customer records. Make sure JSON Server is running and the customers collection exists in db.json.';

        this.cdr.markForCheck();
      }
    });
  }

  // --------------------------------------------------
  // CUSTOMER NAME MATCHING
  // --------------------------------------------------

  private normalizeCustomerName(name: string): string {
    return String(name || '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
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

        console.log(
          'Bookings loaded successfully:',
          this.bookings
        );
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

    // Customer IDs and booking IDs are different identifiers.
    // Do not compare them or replace the selected customer here.

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

    if (view === 'customers') {
      this.loadCustomers();
    }

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
      this.isEditingBooking
        ? this.editingBookingId || undefined
        : undefined
    );
  }

  get remainingPickupSlots(): number {
    return this.customerService.getRemainingPickupSlots(
      this.bookings,
      this.form.pickupDate,
      this.isEditingBooking
        ? this.editingBookingId || undefined
        : undefined
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
      this.isEditingBooking
        ? this.editingBookingId || undefined
        : undefined
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
        Number.isInteger(Number((item as BookingFormLoadItem).loads)) &&
        Number((item as BookingFormLoadItem).loads) > 0 &&
        (!(item as BookingFormLoadItem).loadsChanged ||
          Number(item.weight) === Number((item as BookingFormLoadItem).loads) * this.kilogramsPerLoad) &&
        this.getServicePrice(item.serviceId) > 0 &&
        this.categories.some(
          category =>
            category.id === Number(item.itemCategoryId)
        )
      )
    );
  }

  get isWeightValid(): boolean {
    return (
      this.totalWeight >= this.minimumWeight &&
      this.totalWeight <= this.maximumWeight
    );
  }

  get isAddressValid(): boolean {
    const hasCompleteAddress = [
      this.form.houseNo,
      this.form.street,
      this.form.barangay,
      this.form.city,
      this.form.province
    ].every(value => String(value || '').trim().length > 0);

    // Older bookings only contain one combined address string.
    // Keep those editable without forcing users to guess the missing parts.
    const isLegacyAddress =
      this.isEditingBooking &&
      String(this.form.street || '').trim().length >= 3 &&
      !this.form.houseNo.trim() &&
      !this.form.barangay.trim() &&
      !this.form.city.trim() &&
      !this.form.province.trim();

    return hasCompleteAddress || isLegacyAddress;
  }

  get isCustomerAndBookingValid(): boolean {
    return (
      this.form.firstName.trim().length >= 1 &&
      this.form.lastName.trim().length >= 1 &&
      !this.phoneError &&
      !this.emailError &&
      this.isAddressValid &&
      this.validateBookingDate(this.form.bookingDate).valid &&
      this.validatePickupDate(
        this.form.bookingDate,
        this.form.pickupDate,
        this.form.isExpress
      ).valid &&
      !this.pickupCapacityError &&
      (!this.form.isExpress || this.expressEnabled)
    );
  }

  goToNextBookingStep(): void {
    this.errorMessage = '';

    if (this.currentBookingStep === 1) {
      if (!this.isCustomerAndBookingValid) {
        this.errorMessage = this.pickupCapacityError ||
          'Please complete and correct the customer details and booking parameters before continuing.';
        return;
      }
      this.currentBookingStep = 2;
      return;
    }

    if (this.currentBookingStep === 2) {
      if (!this.isItemsValid || !this.isWeightValid) {
        this.errorMessage = this.weightError ||
          'Please add at least one valid laundry service and enter whole-number loads.';
        return;
      }
      this.currentBookingStep = 3;
    }
  }

  goToPreviousBookingStep(): void {
    this.errorMessage = '';
    if (this.currentBookingStep > 1) {
      this.currentBookingStep = (this.currentBookingStep - 1) as 1 | 2 | 3;
    }
  }

  updateItemLoads(item: BookingFormLoadItem, value: number | string): void {
    const loads = Number(value);
    item.loads = Number.isInteger(loads) && loads >= 0 ? loads : 0;
    item.loadsChanged = true;
    item.weight = item.loads * this.kilogramsPerLoad;
  }

  get isFormValid(): boolean {
    return (
      !this.isConfigurationLoading &&
      this.services.length > 0 &&
      this.categories.length > 0 &&
      this.bookingStatusOptions.length > 0 &&
      this.paymentStatusOptions.length > 0 &&
      this.form.firstName.trim().length >= 1 &&
      this.form.lastName.trim().length >= 1 &&
      !this.phoneError &&
      !this.emailError &&
      this.isAddressValid &&
      this.isItemsValid &&
      this.isWeightValid &&
      this.validateBookingDate(this.form.bookingDate).valid &&
      this.validatePickupDate(
        this.form.bookingDate,
        this.form.pickupDate,
        this.form.isExpress
      ).valid &&
      !this.pickupCapacityError &&
      (!this.form.isExpress || this.expressEnabled)
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
      serviceId: this.services[0]?.id ?? 0,
      itemCategoryId: this.categories[0]?.id ?? 0,
      loads: 0,
      loadsChanged: false,
      weight: 0
    } as BookingFormLoadItem);
  }

  removeItemRow(index: number): void {
    if (this.form.items.length > 1) {
      this.form.items.splice(index, 1);
    }
  }

  resetForm(): void {
    this.form = this.createEmptyForm();
    this.currentBookingStep = 1;

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
    return this.customerService.validateBookingDate(
      dateValue
    );
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
  // SAVE OR UPDATE CUSTOMER PROFILE
  // --------------------------------------------------

  private saveCustomerProfile(
    booking: CustomerBooking,
    onSuccess: () => void
  ): void {
    this.customerService.getCustomers().subscribe({
      next: customers => {
        this.customers = customers;
        this.customerService.customers = customers;

        const existingCustomer =
          this.customerService.findCustomerByName(
            booking.customerName,
            customers
          );

        const customer: Customer = {
          id: existingCustomer?.id ?? `CUS-${Date.now()}`,
          customerName: booking.customerName.trim(),
          phoneNumber: booking.phoneNumber.trim(),
          email: booking.email?.trim() || '',
          address: booking.address.trim(),
          firstName: booking.firstName || '',
          lastName: booking.lastName || '',
          middleName: booking.middleName || '',
          suffix: booking.suffix || '',
          houseNo: booking.houseNo || '',
          street: booking.street || '',
          barangay: booking.barangay || '',
          city: booking.city || '',
          province: booking.province || ''
        };

        const request = existingCustomer
          ? this.customerService.updateCustomer(
              existingCustomer.id,
              customer
            )
          : this.customerService.addCustomer(customer);

        request.subscribe({
          next: savedCustomer => {
            if (existingCustomer) {
              this.customers = customers.map(existing =>
                existing.id === savedCustomer.id
                  ? savedCustomer
                  : existing
              );
            } else {
              this.customers = [
                ...customers,
                savedCustomer
              ];
            }

            this.customerService.customers = this.customers;

            this.isLoadingCustomers = false;

            console.log(
              'Customer profile saved:',
              savedCustomer
            );

            this.cdr.markForCheck();

            onSuccess();
          },

          error: error => {
            console.error(
              'Unable to save customer profile:',
              error
            );

            this.isSaving = false;
            this.errorMessage =
              'Unable to save the customer profile. The booking was not submitted.';

            this.cdr.markForCheck();
          }
        });
      },

      error: error => {
        console.error(
          'Unable to retrieve customer records:',
          error
        );

        this.isSaving = false;
        this.errorMessage =
          'Unable to retrieve customer records. Please try again.';

        this.cdr.markForCheck();
      }
    });
  }

  // --------------------------------------------------
  // CREATE OR UPDATE BOOKING
  // --------------------------------------------------

  submitForm(): void {
    this.submitBooking();
  }

  submitBooking(): void {
    if (this.isSaving || this.isConfigurationLoading) {
      return;
    }

    // Prevent Enter-key submission from skipping the wizard steps.
    if (this.currentBookingStep !== 3) {
      this.goToNextBookingStep();
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

    const pendingStatus = this.bookingStatusOptions.find(
      status =>
        status.name.toLowerCase() === 'pending' ||
        status.code.toLowerCase() === 'pending'
    );

    if (!pendingStatus && !this.isEditingBooking) {
      this.errorMessage =
        'The Pending booking status is missing from db.json.';
      return;
    }

    const capacityCheck =
      this.customerService.validatePickupCapacity(
        this.bookings,
        this.form.pickupDate,
        this.isEditingBooking
          ? this.editingBookingId || undefined
          : undefined
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

    // New bookings are created as unpaid. Payments can be recorded later
    // from the booking details payment section.
    const amountPaid = this.isEditingBooking
      ? Number(this.form.amountPaid || 0)
      : 0;

    const booking = {
      id: bookingNumber,
      bookingNumber,

      customerName: this.composeCustomerName(),
      firstName: this.form.firstName.trim(),
      lastName: this.form.lastName.trim(),
      middleName: this.form.middleName.trim(),
      suffix: this.form.suffix.trim(),
      phoneNumber: this.form.phoneNumber.trim(),
      email: this.form.email.trim(),
      address: this.composeCustomerAddress(),
      houseNo: this.form.houseNo.trim(),
      street: this.form.street.trim(),
      barangay: this.form.barangay.trim(),
      city: this.form.city.trim(),
      province: this.form.province.trim(),

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
      paymentMethod: this.isEditingBooking
        ? this.form.paymentMethod
        : '', 

      status: (pendingStatus?.name || '') as BookingStatus,
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

      this.saveCustomerProfile(updatedBooking, () => {
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
            this.currentBookingStep = 1;
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
      });

      return;
    }

    // --------------------------------------------------
    // CREATE NEW BOOKING
    // --------------------------------------------------

    this.saveCustomerProfile(booking, () => {
      this.bookingService.addBooking(booking).subscribe({
        next: saved => {
          this.bookings.unshift(
            this.normalizeBooking(saved)
          );

          this.isSaving = false;
          this.form = this.createEmptyForm();
          this.currentBookingStep = 1;
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
    });
  }

  // --------------------------------------------------
  // BOOKING RECORDS AND FILTERING
  // --------------------------------------------------

  get filteredBookings(): BookingRecord[] {
    const filtered = this.customerService.filterBookings(
      this.bookings,
      this.searchQuery,
      this.statusFilter
    );

    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.bookingDate).getTime();
      const dateB = new Date(b.bookingDate).getTime();
      const difference = dateA - dateB;
      return this.bookingDateSort === 'asc' ? difference : -difference;
    });
  }

  getBookingServiceNames(booking: BookingRecord): string {
    return this.customerService.getBookingServiceNames(
      booking
    );
  }

  // --------------------------------------------------
  // BOOKING STATUS
  // --------------------------------------------------

  updateStatus(
    booking: BookingRecord,
    status: BookingStatus
  ): void {
    const statusExists = this.bookingStatusOptions.some(
      option => option.name === status
    );

    if (!statusExists) {
      this.errorMessage =
        'The selected booking status is not available.';
      return;
    }

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
        console.error(
          'Unable to update booking status:',
          error
        );

        this.errorMessage =
          'Unable to update booking status.';

        this.cdr.markForCheck();
      }
    });
  }

  // --------------------------------------------------
  // BOOKING CANCELLATION
  // --------------------------------------------------

  openCancellationForm(): void {
    if (!this.allowCancellation) {
      this.errorMessage =
        'Booking cancellation is currently disabled by the shop.';
      return;
    }

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
    if (
      !this.selectedBooking ||
      this.isCancellingBooking
    ) {
      return;
    }

    if (!this.allowCancellation) {
      this.errorMessage =
        'Booking cancellation is currently disabled by the shop.';
      return;
    }

    const reason = this.cancellationReason.trim();

    if (reason.length < 5) {
      this.errorMessage =
        'Please provide a cancellation reason with at least 5 characters.';
      return;
    }

    if (
      this.selectedBooking.status === 'Cancelled' ||
      this.selectedBooking.status === 'Done'
    ) {
      this.errorMessage =
        'This booking can no longer be cancelled.';
      return;
    }

    const cancelledStatus = this.bookingStatusOptions.find(
      status =>
        status.name.toLowerCase() === 'cancelled' ||
        status.code.toLowerCase() === 'cancelled'
    );

    if (!cancelledStatus) {
      this.errorMessage =
        'The Cancelled booking status is missing from db.json.';
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
      status: cancelledStatus.name as BookingStatus,
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

    const amount = Number(
      this.paymentDraft.paymentAmount
    );

    const balance = Number(
      this.selectedBooking.balance
    );

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

    const methodExists = this.paymentMethodOptions.some(
      method =>
        method.name === this.paymentDraft.paymentMethod
    );

    if (!methodExists) {
      return 'Please select a valid payment method.';
    }

    return '';
  }

  savePaymentUpdate(): void {
    if (
      !this.selectedBooking ||
      this.isUpdatingPayment
    ) {
      return;
    }

    const booking = this.selectedBooking;
    const newPayment = Number(
      this.paymentDraft.paymentAmount
    );

    const remainingBalance = Number(booking.balance);

    if (!Number.isFinite(newPayment) || newPayment <= 0) {
      this.errorMessage =
        'Enter a payment amount greater than zero.';
      return;
    }

    if (newPayment > remainingBalance) {
      this.errorMessage =
        'Payment cannot exceed the remaining balance.';
      return;
    }

    if (!this.paymentDraft.paymentMethod) {
      this.errorMessage =
        'Please select a payment method.';
      return;
    }

    const methodExists = this.paymentMethodOptions.some(
      method =>
        method.name === this.paymentDraft.paymentMethod
    );

    if (!methodExists) {
      this.errorMessage =
        'Please select a valid payment method.';
      return;
    }

    const updatedAmountPaid =
      Number(booking.amountPaid) + newPayment;

    const updatedBalance =
      this.customerService.getBalance(
        Number(booking.totalAmount),
        updatedAmountPaid
      );

    const updatedPaymentStatus =
      this.getPaymentStatus(
        updatedAmountPaid,
        Number(booking.totalAmount)
      );

    if (!updatedPaymentStatus) {
      this.errorMessage =
        'Unable to determine the payment status. Check paymentStatuses in db.json.';
      return;
    }

    const updated = {
      ...booking,
      amountPaid: updatedAmountPaid,
      balance: updatedBalance,
      paymentStatus: updatedPaymentStatus,
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
        console.error(
          'Unable to update payment:',
          error
        );

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
    return this.customerService.getPaymentStatus(
      paid,
      total
    );
  }

  // --------------------------------------------------
  // EDIT BOOKING
  // --------------------------------------------------

  editBooking(booking: BookingRecord): void {
    if (booking.status === 'Done') {
      this.errorMessage =
        'Completed bookings cannot be edited.';
      return;
    }

    if (booking.status === 'Cancelled') {
      this.errorMessage =
        'Cancelled bookings cannot be edited.';
      return;
    }

    this.isEditingBooking = true;
    this.editingBookingId = booking.id;

    const legacyName = this.splitLegacyCustomerName(
      booking.customerName
    );

    this.form = {
      firstName: booking.firstName || legacyName.firstName,
      lastName: booking.lastName || legacyName.lastName,
      middleName: booking.middleName || legacyName.middleName,
      suffix: booking.suffix || legacyName.suffix,
      phoneNumber: booking.phoneNumber,
      email: booking.email || '',
      houseNo: booking.houseNo || '',
      street: booking.street || booking.address || '',
      barangay: booking.barangay || '',
      city: booking.city || '',
      province: booking.province || '',
      bookingDate: booking.bookingDate,
      pickupDate: booking.pickupDate,
      isExpress: booking.isExpress && this.expressEnabled,
      amountPaid: booking.amountPaid,
      paymentMethod: booking.paymentMethod || '',
      notes: booking.notes || '',
      items: booking.items.map(item => {
        const loads = Number(item.weight) > 0
          ? Math.ceil(Number(item.weight) / this.kilogramsPerLoad)
          : 0;
        return {
          serviceId: item.serviceId,
          itemCategoryId: item.itemCategoryId,
          loads,
          loadsChanged: false,
          weight: Number(item.weight)
        } as BookingFormLoadItem;
      })
    };

    this.errorMessage = '';
    this.successMessage = '';

    this.showBookingDetails = false;
    this.showCancellationForm = false;
    this.selectedBooking = null;

    this.currentBookingStep = 1;
    this.subView = 'add';
  }

  // --------------------------------------------------
  // CUSTOMER DIRECTORY
  // --------------------------------------------------

  get filteredCustomers(): Customer[] {
    const query = this.searchQuery.trim().toLowerCase();

    if (!query) {
      return this.customers;
    }

    return this.customers.filter(customer => {
      const searchableValues = [
        customer.customerName,
        customer.phoneNumber,
        customer.email,
        customer.address
      ];

      return searchableValues.some(value =>
        String(value || '')
          .toLowerCase()
          .includes(query)
      );
    });
  }

  getCustomerBookingCount(customerName: string): number {
    const normalizedName =
      this.normalizeCustomerName(customerName);

    if (!normalizedName) {
      return 0;
    }

    return this.bookings.filter(booking =>
      this.normalizeCustomerName(booking.customerName) ===
      normalizedName
    ).length;
  }

  getCustomerBookings(
    customer: Customer
  ): BookingRecord[] {
    const normalizedName =
      this.normalizeCustomerName(customer.customerName);

    if (!normalizedName) {
      return [];
    }

    return this.bookings.filter(booking =>
      this.normalizeCustomerName(booking.customerName) ===
      normalizedName
    );
  }

  openCustomerDetails(customer: Customer): void {
    this.selectedCustomer = customer;
    this.showCustomerDetails = true;
  }

  closeCustomerDetails(): void {
    this.showCustomerDetails = false;
    this.selectedCustomer = null;
  }

  // --------------------------------------------------
  // BOOKING CALENDAR - BASED ON PICKUP DATE
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

  // Convert pickup date to YYYY-MM-DD for calendar comparison.
  private getPickupDateKey(
    pickupDate: string | null | undefined
  ): string {
    return String(pickupDate || '').trim().slice(0, 10);
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

  // Display bookings scheduled for pickup on the selected date.
  get selectedDateBookings(): BookingRecord[] {
    if (!this.selectedDate) {
      return [];
    }

    return this.bookings.filter(booking =>
      this.getPickupDateKey(booking.pickupDate) ===
      this.selectedDate
    );
  }

  // Highlight dates that have scheduled pickups.
  hasBookingsOnDate(dateKey: string): boolean {
    return this.bookings.some(booking =>
      this.getPickupDateKey(booking.pickupDate) === dateKey
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