
import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges
} from '@angular/core';

import { CustomerBooking, BookingNotification } from '../rules';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css'
})
export class NotificationsComponent implements OnChanges {

  // Receive booking data from AppComponent
  @Input() bookings: CustomerBooking[] = [];
  @Input() isLoading = false;
  @Input() errorMessage = '';

  // Request AppComponent to reload bookings when Refresh is clicked
  @Output() refreshRequested = new EventEmitter<void>();

  notifications: BookingNotification[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bookings']) {
      this.generateNotifications();
    }
  }

  private generateNotifications(): void {
    const alerts: BookingNotification[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const booking of this.bookings) {

      // Ignore cancelled bookings
      if (booking.status === 'Cancelled') {
        continue;
      }

      // Pending booking notification
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

      // In-progress booking notification
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

      // Completed booking notification
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

      // Express priority notification
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

      // Upcoming pickup notification
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

    // Sort notifications by date
    this.notifications = alerts.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  // Refresh using the parent component's existing booking loader
  refresh(): void {
    this.refreshRequested.emit();
  }
}
