import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface BookingRecord {
  id: string;
  customerName: string;
  contactNumber: string;
  address: string;
  email?: string;
  serviceType: string;
  itemCategories?: string[];
  notes?: string;
  weightKg: number;
  bookingDate: string;
  isExpress: boolean;
  totalAmount: number;
  status: 'Pending' | 'In-Progress' | 'Done';
}

@Component({
  selector: 'app-customer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer.html',
  styleUrls: ['./customer.css']
})
export class CustomerComponent implements OnChanges {
  @Input() selectedBookingId: string | null = null;
  @Output() clearSelectedBooking = new EventEmitter<void>();
  @Output() notify = new EventEmitter<string>();

  subView: 'records' | 'add' = 'records';
  searchQuery = '';
  statusFilter = 'ALL';

  activeModalBooking: BookingRecord | null = null;
  modalStatusDraft: 'Pending' | 'In-Progress' | 'Done' = 'Pending';

  calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  selectedCalendarDate: string | null = null;

  availableCategories = ['Tops', 'Bottoms', 'Bedding', 'Delicates'];
  serviceRates: Record<string, number> = {
    'Wash & Fold': 50,
    'Dry Cleaning': 120,
    'Ironing': 40,
    'Comforter Wash': 150
  };

  bookings: BookingRecord[] = [
    { id: 'BK-1001', customerName: 'Juan Dela Cruz', contactNumber: '0917 123 4567', address: 'Marilao, Bulacan', serviceType: 'Wash & Fold', weightKg: 6.0, bookingDate: this.getNextValidDateString(0), isExpress: true, totalAmount: 600, status: 'In-Progress' },
    { id: 'BK-1002', customerName: 'Maria Santos', contactNumber: '0918 987 6543', address: 'Meycauayan, Bulacan', serviceType: 'Dry Cleaning', weightKg: 4.5, bookingDate: this.getNextValidDateString(1), isExpress: false, totalAmount: 540, status: 'Pending' },
    { id: 'BK-1003', customerName: 'Carlo Mendoza', contactNumber: '0920 555 8899', address: 'Bocaue, Bulacan', serviceType: 'Comforter Wash', weightKg: 5.0, bookingDate: this.getNextValidDateString(2), isExpress: false, totalAmount: 750, status: 'Done' },
    { id: 'BK-1004', customerName: 'Angela Reyes', contactNumber: '0915 444 2211', address: 'Marilao, Bulacan', serviceType: 'Wash & Fold', weightKg: 5.6, bookingDate: this.getNextValidDateString(0), isExpress: true, totalAmount: 560, status: 'In-Progress' }
  ];

  form = {
    customerName: '',
    contactNumber: '',
    address: '',
    email: '',
    serviceType: 'Wash & Fold',
    itemCategories: ['Tops', 'Bottoms'],
    notes: '',
    weightKg: 5,
    bookingDate: this.getNextValidDateString(0),
    isExpress: false
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedBookingId'] && this.selectedBookingId) {
      const target = this.bookings.find(b => b.id === this.selectedBookingId);
      if (target) {
        this.subView = 'records';
        this.openCustomerModal(target);
      }
      this.clearSelectedBooking.emit();
    }
  }

  get filteredBookings(): BookingRecord[] {
    const q = this.searchQuery.toLowerCase().trim();
    return this.bookings.filter(b => {
      const matchesSearch = b.customerName.toLowerCase().includes(q) || b.id.toLowerCase().includes(q) || b.serviceType.toLowerCase().includes(q);
      const matchesStatus = this.statusFilter === 'ALL' || b.status === this.statusFilter;
      return matchesSearch && matchesStatus;
    });
  }

  get currentRate(): number {
    return this.serviceRates[this.form.serviceType] || 50;
  }

  get baseSubtotal(): number {
    return this.currentRate * Math.max(0, Number(this.form.weightKg) || 0);
  }

  get expressSurcharge(): number {
    return this.form.isExpress ? this.baseSubtotal : 0;
  }

  get grandTotal(): number {
    return this.baseSubtotal + this.expressSurcharge;
  }

  get weightValidationError(): string | null {
    const val = Number(this.form.weightKg);
    if (isNaN(val) || this.form.weightKg === null) return 'Please enter a valid laundry weight in kg.';
    if (val < 3) return `Minimum weight for processing is 3 kg (Entered: ${val} kg).`;
    if (val > 20) return `Maximum machine load is 20 kg per order (Entered: ${val} kg).`;
    return null;
  }

  get dateValidationError(): string | null {
    if (!this.form.bookingDate) return 'Please select a valid pickup/booking date.';
    const [y, m, d] = this.form.bookingDate.split('-').map(Number);
    const selected = new Date(y, m - 1, d);
    selected.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selected < today) return 'Past dates cannot be booked. Select today or a future date.';
    if (selected.getDay() === 0) return 'Shop is closed on Sundays. Please select Monday–Saturday.';
    return null;
  }

  get isFormValid(): boolean {
    return (
      this.form.customerName.trim().length >= 2 &&
      this.form.contactNumber.trim().length >= 7 &&
      this.form.address.trim().length >= 3 &&
      !this.weightValidationError &&
      !this.dateValidationError
    );
  }

  toggleCategory(cat: string): void {
    const idx = this.form.itemCategories.indexOf(cat);
    if (idx >= 0) {
      this.form.itemCategories.splice(idx, 1);
    } else {
      this.form.itemCategories.push(cat);
    }
  }

  submitBooking(): void {
    if (!this.isFormValid) return;
    const nextId = `BK-${1001 + this.bookings.length}`;
    const newRecord: BookingRecord = {
      id: nextId,
      customerName: this.form.customerName.trim(),
      contactNumber: this.form.contactNumber.trim(),
      address: this.form.address.trim(),
      email: this.form.email.trim(),
      serviceType: this.form.serviceType,
      itemCategories: [...this.form.itemCategories],
      notes: this.form.notes.trim(),
      weightKg: Number(this.form.weightKg),
      bookingDate: this.form.bookingDate,
      isExpress: this.form.isExpress,
      totalAmount: this.grandTotal,
      status: 'Pending'
    };

    this.bookings.unshift(newRecord);
    this.notify.emit(`Booking ${nextId} added! Total: ₱${newRecord.totalAmount.toFixed(2)}`);
    this.resetForm();
    this.subView = 'records';
  }

  resetForm(): void {
    this.form = {
      customerName: '',
      contactNumber: '',
      address: '',
      email: '',
      serviceType: 'Wash & Fold',
      itemCategories: ['Tops', 'Bottoms'],
      notes: '',
      weightKg: 5,
      bookingDate: this.getNextValidDateString(0),
      isExpress: false
    };
  }

  deleteBooking(id: string): void {
    this.bookings = this.bookings.filter(b => b.id !== id);
    this.notify.emit(`Booking ${id} deleted.`);
  }

  openCustomerModal(booking: BookingRecord): void {
    this.activeModalBooking = booking;
    this.modalStatusDraft = booking.status;
  }

  closeCustomerModal(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.activeModalBooking = null;
    }
  }

  saveModalStatus(): void {
    if (!this.activeModalBooking) return;
    this.activeModalBooking.status = this.modalStatusDraft;
    this.notify.emit(`Booking ${this.activeModalBooking.id} marked as ${this.modalStatusDraft}`);
  }

  // Calendar UI Logic
  get calendarMonthLabel(): string {
    return this.calendarMonth.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  }

  get calendarCells(): Array<{ day: number | null; dateKey: string; bookings: BookingRecord[] }> {
    const y = this.calendarMonth.getFullYear();
    const m = this.calendarMonth.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const totalDays = new Date(y, m + 1, 0).getDate();

    const cells: Array<{ day: number | null; dateKey: string; bookings: BookingRecord[] }> = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: null, dateKey: '', bookings: [] });
    }
    for (let d = 1; d <= totalDays; d++) {
      const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        day: d,
        dateKey: key,
        bookings: this.bookings.filter(b => b.bookingDate === key)
      });
    }
    return cells;
  }

  get selectedDateBookings(): BookingRecord[] {
    if (!this.selectedCalendarDate) return [];
    return this.bookings.filter(b => b.bookingDate === this.selectedCalendarDate);
  }

  changeCalendarMonth(delta: number): void {
    this.calendarMonth = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() + delta, 1);
  }

  selectCalendarDate(dateKey: string): void {
    this.selectedCalendarDate = dateKey;
  }

  private getNextValidDateString(offsetDays: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}