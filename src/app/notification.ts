import { Injectable } from '@angular/core';

import { CustomerBooking } from './rules';

import type {
  BookingNotification,
  DashboardNotification
} from './rules';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  // Generate notifications for the Notifications page
  generateNotifications(
    bookings: CustomerBooking[]
  ): BookingNotification[] {

    const alerts: BookingNotification[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const booking of bookings) {

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
        const [year, month, day] =
          booking.pickupDate.split('-').map(Number);

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

    // Sort notifications by date, newest first
    return alerts.sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  // Generate the latest notification for the Overview
  getLatestDashboardNotification(
    bookings: CustomerBooking[],
    formatCurrency: (amount: number) => string,
    formatDate: (timestamp: number) => string
  ): DashboardNotification | null {

    const notifications: DashboardNotification[] = [];

    bookings.forEach(booking => {
      const timestamp = new Date(
        booking.updatedAt || booking.createdAt || booking.bookingDate
      ).getTime();

      const bookingNumber =
        booking.bookingNumber || booking.id || 'Booking';

      if (booking.status === 'Pending') {
        notifications.push({
          title: 'Pending Booking',
          message: `${booking.customerName} has a booking awaiting processing.`,
          bookingNumber,
          date: formatDate(timestamp),
          timestamp,
          type: 'pending'
        });
      }

      if (booking.status === 'In Progress') {
        notifications.push({
          title: 'Laundry In Progress',
          message: `${booking.customerName}'s laundry is currently being processed.`,
          bookingNumber,
          date: formatDate(timestamp),
          timestamp,
          type: 'progress'
        });
      }

      const balance = Number(
        booking.balance ??
        (
          Number(booking.totalAmount || 0) -
          Number(booking.amountPaid || 0)
        )
      );

      if (
        booking.status !== 'Cancelled' &&
        balance > 0
      ) {
        notifications.push({
          title: 'Payment Reminder',
          message: `${booking.customerName} has an outstanding balance of ${formatCurrency(balance)}.`,
          bookingNumber,
          date: formatDate(timestamp),
          timestamp,
          type: 'payment'
        });
      }
    });

    if (notifications.length === 0) {
      return null;
    }

    return notifications.sort(
      (a, b) => b.timestamp - a.timestamp
    )[0];
  }
}