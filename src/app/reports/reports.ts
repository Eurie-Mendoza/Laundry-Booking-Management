
import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef
} from '@angular/core';

import { BookingService } from '../services/booking.service';
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

        console.log('Bookings loaded:', this.bookings);
        console.log('Loading state:', this.isLoading);

        // Explicitly update the component view
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

  // Automatically identify available services
  get serviceNames(): string[] {
    const services = new Set<string>();

    this.bookings.forEach(booking => {
      if (booking.items?.length) {
        booking.items.forEach(item => {
          if (item.serviceName) {
            services.add(item.serviceName);
          }
        });
      } else {
        const legacyService = (booking as any).serviceType;

        if (legacyService) {
          services.add(legacyService);
        }
      }
    });

    return Array.from(services).sort();
  }

  // Booking status count
  getStatusCount(status: string): number {
    return this.bookings.filter(
      booking => booking.status === status
    ).length;
  }

  get totalBookings(): number {
    return this.bookings.length;
  }

  get activeBookings(): number {
    return this.bookings.filter(
      booking =>
        booking.status === 'Pending' ||
        booking.status === 'In Progress'
    ).length;
  }

  get completedBookings(): number {
    return this.getStatusCount('Done');
  }

  get cancelledBookings(): number {
    return this.getStatusCount('Cancelled');
  }

  // Total booking charges
  get totalRevenue(): number {
    return this.bookings.reduce(
      (total, booking) =>
        total + Number(booking.totalAmount || 0),
      0
    );
  }

  // Total payments received
  get totalCollected(): number {
    return this.bookings.reduce(
      (total, booking) =>
        total + Number(booking.amountPaid || 0),
      0
    );
  }

  // Remaining balances
  get outstandingBalance(): number {
    return this.bookings.reduce(
      (total, booking) => {
        const balance = Number(
          booking.balance ??
          (
            Number(booking.totalAmount || 0) -
            Number(booking.amountPaid || 0)
          )
        );

        return total + Math.max(0, balance);
      },
      0
    );
  }

  // Total laundry weight
  get totalWeight(): number {
    return this.bookings.reduce(
      (total, booking) => {
        const weight = Number(
          booking.totalWeight ||
          (booking as any).weightKg ||
          0
        );

        return total + weight;
      },
      0
    );
  }

  // Express bookings
  get expressBookings(): number {
    return this.bookings.filter(
      booking => booking.isExpress === true
    ).length;
  }

  // Average booking value
  get averageBookingValue(): number {
    return this.totalBookings
      ? this.totalRevenue / this.totalBookings
      : 0;
  }

  // Count bookings containing a service
  getServiceCount(serviceName: string): number {
    return this.bookings.filter(booking => {
      if (booking.items?.length) {
        return booking.items.some(
          item => item.serviceName === serviceName
        );
      }

      return (booking as any).serviceType === serviceName;
    }).length;
  }

  // Service percentage
  getServicePercentage(serviceName: string): number {
    if (!this.totalBookings) {
      return 0;
    }

    return Math.round(
      (this.getServiceCount(serviceName) / this.totalBookings) * 100
    );
  }

  // Booking status percentage
  getStatusPercentage(status: string): number {
    if (!this.totalBookings) {
      return 0;
    }

    return Math.round(
      (this.getStatusCount(status) / this.totalBookings) * 100
    );
  }

  // Philippine Peso currency
  currency(value: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(Number(value || 0));
  }

}
