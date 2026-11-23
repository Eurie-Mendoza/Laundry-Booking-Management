import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef
} from '@angular/core';
import { forkJoin } from 'rxjs';

import { BookingService } from '../services/booking.service';
import {
  ReportsService,
  PickupCapacityReport
} from '../reports';
import { CustomerBooking } from '../rules';
import { CustomerService } from '../customer';

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
  private customerService = inject(CustomerService);
  private cdr = inject(ChangeDetectorRef);

  bookings: CustomerBooking[] = [];

  isLoading = false;
  errorMessage = '';

  // Retrieve the current capacity from CustomerService.
  get maximumCapacity(): number {
    return this.customerService.maximumCapacity;
  }

  ngOnInit(): void {
    this.loadReports();
  }

  // --------------------------------------------------
  // LOAD REPORT DATA AND SHOP RULES
  // --------------------------------------------------

  loadReports(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.cdr.detectChanges();

    forkJoin({
      bookings: this.bookingService.getBookings(),
      shopRules: this.customerService.getShopRules()
    }).subscribe({
      next: data => {
        this.bookings = data.bookings || [];

        const rules = data.shopRules?.[0];

        if (!rules) {
          this.errorMessage = 'Unable to load shop configuration.';
          this.isLoading = false;
          this.cdr.detectChanges();
          return;
        }

        // Apply the latest shop configuration.
        this.customerService.applyShopRules(rules);

        this.isLoading = false;
        this.cdr.detectChanges();
      },

      error: error => {
        console.error('Reports loading error:', error);

        this.errorMessage =
          'Unable to load report information. Please check JSON Server.';

        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --------------------------------------------------
  // WEEKLY PICKUP CAPACITY REPORT
  // --------------------------------------------------

  get weeklyCapacityReport(): PickupCapacityReport[] {
    return this.reportsService.getWeeklyPickupCapacityReport(
      this.bookings,
      this.maximumCapacity
    );
  }

  get weeklyTotalCapacity(): number {
    return this.weeklyCapacityReport.reduce(
      (total, day) => total + day.capacity,
      0
    );
  }

  get weeklyBookedSlots(): number {
    return this.weeklyCapacityReport.reduce(
      (total, day) => total + day.booked,
      0
    );
  }

  get weeklyRemainingSlots(): number {
    return this.weeklyCapacityReport.reduce(
      (total, day) => total + day.remaining,
      0
    );
  }

  get weeklyCapacityPercentage(): number {
    if (this.weeklyTotalCapacity === 0) {
      return 0;
    }

    return Math.round(
      (this.weeklyBookedSlots / this.weeklyTotalCapacity) * 100
    );
  }

  // --------------------------------------------------
  // EXISTING REPORT CALCULATIONS
  // --------------------------------------------------

  get serviceNames(): string[] {
    return this.reportsService.getServiceNames(this.bookings);
  }

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

  get totalRevenue(): number {
    return this.reportsService.getTotalRevenue(this.bookings);
  }

  get totalCollected(): number {
    return this.reportsService.getTotalCollected(this.bookings);
  }

  get outstandingBalance(): number {
    return this.reportsService.getOutstandingBalance(this.bookings);
  }

  get totalWeight(): number {
    return this.reportsService.getTotalWeight(this.bookings);
  }

  get expressBookings(): number {
    return this.reportsService.getExpressBookings(this.bookings);
  }

  get averageBookingValue(): number {
    return this.reportsService.getAverageBookingValue(this.bookings);
  }

  getServiceCount(serviceName: string): number {
    return this.reportsService.getServiceCount(
      this.bookings,
      serviceName
    );
  }

  getServicePercentage(serviceName: string): number {
    return this.reportsService.getServicePercentage(
      this.bookings,
      serviceName
    );
  }

  getStatusPercentage(status: string): number {
    return this.reportsService.getStatusPercentage(
      this.bookings,
      status
    );
  }

  currency(value: number): string {
    return this.reportsService.formatCurrency(value);
  }
}