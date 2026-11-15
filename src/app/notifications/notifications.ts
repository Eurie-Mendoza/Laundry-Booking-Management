
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';

import { BookingService } from '../services/booking.service';
import { CustomerBooking, BookingNotification } from '../rules';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css'
})
export class NotificationsComponent implements OnInit {
  private bookingService = inject(BookingService);

  bookings: CustomerBooking[] = [];
  notifications: BookingNotification[] = [];

  isLoading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.bookingService.getBookings().subscribe({
      next: (data) => {
        this.bookings = data;
        this.generateNotifications();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to retrieve booking notifications.';
        this.isLoading = false;
      }
    });
  }

  private generateNotifications(): void {
    const alerts: BookingNotification[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const booking of this.bookings) {
      if (booking.status === 'Cancelled') {
        continue;
      }

      if (booking.status === 'Pending') {
        alerts.push({
          id: `${booking.id}-pending`,
          title: 'Pending Booking',
          message: `${booking.customerName} has a booking waiting for processing.`,
          type: 'warning',
          bookingId: booking.id,
          date: booking.bookingDate
        });
      }

      if (booking.status === 'In Progress') {
        alerts.push({
          id: `${booking.id}-progress`,
          title: 'Laundry In Progress',
          message: `${booking.customerName}'s laundry is currently being processed.`,
          type: 'info',
          bookingId: booking.id,
          date: booking.bookingDate
        });
      }

      if (booking.status === 'Done') {
        alerts.push({
          id: `${booking.id}-completed`,
          title: 'Completed Booking',
          message: `${booking.customerName}'s laundry is ready for pickup.`,
          type: 'success',
          bookingId: booking.id,
          date: booking.pickupDate || booking.bookingDate
        });
      }

      if (booking.isExpress && booking.status !== 'Done') {
        alerts.push({
          id: `${booking.id}-express`,
          title: 'Express Priority',
          message: `${booking.customerName}'s booking has express priority.`,
          type: 'priority',
          bookingId: booking.id,
          date: booking.bookingDate
        });
      }

      if (booking.pickupDate) {
        const [year, month, day] = booking.pickupDate.split('-').map(Number);
        const pickup = new Date(year, month - 1, day);
        pickup.setHours(0, 0, 0, 0);

        const daysUntilPickup = Math.round(
          (pickup.getTime() - today.getTime()) / 86400000
        );

        if (daysUntilPickup >= 0 && daysUntilPickup <= 2) {
          const label =
            daysUntilPickup === 0
              ? 'Today'
              : daysUntilPickup === 1
                ? 'Tomorrow'
                : 'Within 2 Days';

          alerts.push({
            id: `${booking.id}-pickup`,
            title: `Upcoming Pickup — ${label}`,
            message: `${booking.customerName} has a scheduled laundry pickup.`,
            type: 'warning',
            bookingId: booking.id,
            date: booking.pickupDate
          });
        }
      }
    }

    this.notifications = alerts.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  get pendingCount(): number {
    return this.notifications.filter(
      item => item.title === 'Pending Booking'
    ).length;
  }

  get expressCount(): number {
    return this.notifications.filter(
      item => item.type === 'priority'
    ).length;
  }

  get pickupCount(): number {
    return this.notifications.filter(
      item => item.title.startsWith('Upcoming Pickup')
    ).length;
  }

  get completedCount(): number {
    return this.notifications.filter(
      item => item.type === 'success'
    ).length;
  }

  refresh(): void {
    this.loadNotifications();
  }
}
