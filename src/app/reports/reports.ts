
import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef
} from '@angular/core';

import { BookingService } from '../services/booking.service';
import { ReportsService } from '../reports';
import { CustomerBooking } from '../rules';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.html',
  styleUrl: './reports.css'
})
export class ReportsComponent implements OnInit {

  private bookingService = inject(BookingService);
  private reportsService = inject(ReportsService);
  private cdr = inject(ChangeDetectorRef);

  bookings: CustomerBooking[] = [];
  isLoading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadReports();
  }

  // Load booking records from JSON Server
  loadReports(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.cdr.detectChanges();

    this.bookingService.getBookings().subscribe({
      next: (data) => {
        this.bookings = data || [];
        this.isLoading = false;

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('Reports loading error:', error);

        this.errorMessage =
          'Unable to load report information. Please check JSON Server.';

        this.isLoading = false;

        this.cdr.detectChanges();
      }
    });
  }

  // Available laundry services
  get serviceNames(): string[] {
    return this.reportsService.getServiceNames(this.bookings);
  }

  // Booking status count
  getStatusCount(status: string): number {
    return this.reportsService.getStatusCount(this.bookings, status);
  }

  get totalBookings(): number {
    return this.reportsService.getTotalBookings(this.bookings);
  }

  get activeBookings(): number {
    return this.reportsService.getActiveBookings(this.bookings);
  }

  get completedBookings(): number {
    return this.reportsService.getCompletedBookings(this.bookings);
  }

  get cancelledBookings(): number {
    return this.reportsService.getCancelledBookings(this.bookings);
  }

  // Total booking charges
  get totalRevenue(): number {
    return this.reportsService.getTotalRevenue(this.bookings);
  }

  // Total payments received
  get totalCollected(): number {
    return this.reportsService.getTotalCollected(this.bookings);
  }

  // Remaining balances
  get outstandingBalance(): number {
    return this.reportsService.getOutstandingBalance(this.bookings);
  }

  // Total laundry weight
  get totalWeight(): number {
    return this.reportsService.getTotalWeight(this.bookings);
  }

  // Express bookings
  get expressBookings(): number {
    return this.reportsService.getExpressBookings(this.bookings);
  }

  // Average booking value
  get averageBookingValue(): number {
    return this.reportsService.getAverageBookingValue(this.bookings);
  }

  // Count bookings containing a service
  getServiceCount(serviceName: string): number {
    return this.reportsService.getServiceCount(
      this.bookings,
      serviceName
    );
  }

  // Service percentage
  getServicePercentage(serviceName: string): number {
    return this.reportsService.getServicePercentage(
      this.bookings,
      serviceName
    );
  }

  // Booking status percentage
  getStatusPercentage(status: string): number {
    return this.reportsService.getStatusPercentage(
      this.bookings,
      status
    );
  }

  // Philippine Peso currency
  currency(value: number): string {
    return this.reportsService.formatCurrency(value);
  }
}
