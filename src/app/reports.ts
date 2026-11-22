import { Injectable } from '@angular/core';
import { CustomerBooking } from './rules';

export interface PickupCapacityReport {
  date: string;
  dayName: string;
  booked: number;
  capacity: number;
  remaining: number;
  percentage: number;
  status: 'Available' | 'Limited' | 'Fully Booked';
}

@Injectable({
  providedIn: 'root'
})
export class ReportsService {

  // -----------------------------
  // OVERVIEW DASHBOARD CALCULATIONS
  // -----------------------------

  getTotalRevenue(bookings: CustomerBooking[]): number {
    return bookings.reduce(
      (total, booking) => total + Number(booking.totalAmount || 0),
      0
    );
  }

  getTotalBookings(bookings: CustomerBooking[]): number {
    return bookings.length;
  }

  getPendingBookings(bookings: CustomerBooking[]): number {
    return bookings.filter(
      booking => booking.status === 'Pending'
    ).length;
  }

  getExpressPriorityBookings(bookings: CustomerBooking[]): number {
    return bookings.filter(
      booking =>
        booking.isExpress &&
        booking.status !== 'Done' &&
        booking.status !== 'Cancelled'
    ).length;
  }

  getInProgressBookings(bookings: CustomerBooking[]): number {
    return bookings.filter(
      booking => booking.status === 'In Progress'
    ).length;
  }

  getCompletedBookings(bookings: CustomerBooking[]): number {
    return bookings.filter(
      booking => booking.status === 'Done'
    ).length;
  }

  getCompletedToday(
    bookings: CustomerBooking[],
    todayDate: string
  ): number {
    return bookings.filter(booking => {
      if (booking.status !== 'Done' || !booking.completedAt) {
        return false;
      }

      const completedDate = new Date(booking.completedAt);

      if (Number.isNaN(completedDate.getTime())) {
        return false;
      }

      const year = completedDate.getFullYear();
      const month = String(completedDate.getMonth() + 1).padStart(2, '0');
      const day = String(completedDate.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}` === todayDate;
    }).length;
  }

  // -----------------------------
  // PICKUP SCHEDULE CALCULATIONS
  // -----------------------------

  private dateToTimestamp(dateString: string): number {
    if (!dateString) {
      return 0;
    }

    const parts = dateString.split('-').map(Number);

    if (parts.length !== 3 || parts.some(Number.isNaN)) {
      return 0;
    }

    return new Date(
      parts[0],
      parts[1] - 1,
      parts[2]
    ).getTime();
  }

  getTodaysSchedule(
    bookings: CustomerBooking[],
    todayDate: string
  ): CustomerBooking[] {
    return bookings
      .filter(booking =>
        booking.pickupDate === todayDate &&
        booking.status !== 'Cancelled'
      )
      .sort((a, b) =>
        String(a.bookingNumber || '').localeCompare(
          String(b.bookingNumber || '')
        )
      );
  }

  getUpcomingSchedule(
    bookings: CustomerBooking[],
    numberOfDays: number,
    todayDate: string
  ): CustomerBooking[] {
    const today = this.dateToTimestamp(todayDate);

    if (!today) {
      return [];
    }

    const lastDay = today + numberOfDays * 24 * 60 * 60 * 1000;

    return bookings
      .filter(booking => {
        if (!booking.pickupDate || booking.status === 'Cancelled') {
          return false;
        }

        const pickupTimestamp = this.dateToTimestamp(booking.pickupDate);

        return pickupTimestamp > today && pickupTimestamp <= lastDay;
      })
      .sort((a, b) =>
        this.dateToTimestamp(a.pickupDate || '') -
        this.dateToTimestamp(b.pickupDate || '')
      );
  }

  // -----------------------------
  // WEEKLY PICKUP CAPACITY REPORT
  // -----------------------------

  getWeeklyPickupCapacityReport(
    bookings: CustomerBooking[],
    maximumCapacity: number,
    startDate: Date = new Date()
  ): PickupCapacityReport[] {

    const report: PickupCapacityReport[] = [];

    const firstDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate()
    );

    for (let index = 0; index < 7; index++) {
      const currentDate = new Date(firstDate);
      currentDate.setDate(firstDate.getDate() + index);

      const dateKey = this.toDateString(currentDate);

      const booked = bookings.filter(booking =>
        booking.pickupDate === dateKey &&
        booking.status !== 'Cancelled'
      ).length;

      const remaining = Math.max(
        0,
        maximumCapacity - booked
      );

      const percentage = maximumCapacity > 0
        ? Math.min(
            100,
            Math.round((booked / maximumCapacity) * 100)
          )
        : 0;

      let status: PickupCapacityReport['status'] = 'Available';

      if (remaining === 0) {
        status = 'Fully Booked';
      } else if (percentage >= 75) {
        status = 'Limited';
      }

      report.push({
        date: dateKey,
        dayName: currentDate.toLocaleDateString('en-PH', {
          weekday: 'long'
        }),
        booked,
        capacity: maximumCapacity,
        remaining,
        percentage,
        status
      });
    }

    return report;
  }

  private toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // -----------------------------
  // REPORTS PAGE CALCULATIONS
  // -----------------------------

  getServiceNames(bookings: CustomerBooking[]): string[] {
    const services = new Set<string>();

    bookings.forEach(booking => {
      if (booking.items?.length) {
        booking.items.forEach(item => {
          if (item.serviceName) {
            services.add(item.serviceName);
          }
        });
      } else {
        const legacyService = (
          booking as CustomerBooking & { serviceType?: string }
        ).serviceType;

        if (legacyService) {
          services.add(legacyService);
        }
      }
    });

    return Array.from(services).sort();
  }

  getStatusCount(
    bookings: CustomerBooking[],
    status: string
  ): number {
    return bookings.filter(
      booking => booking.status === status
    ).length;
  }

  getActiveBookings(bookings: CustomerBooking[]): number {
    return bookings.filter(
      booking =>
        booking.status === 'Pending' ||
        booking.status === 'In Progress'
    ).length;
  }

  getCancelledBookings(bookings: CustomerBooking[]): number {
    return this.getStatusCount(bookings, 'Cancelled');
  }

  getTotalCollected(bookings: CustomerBooking[]): number {
    return bookings.reduce(
      (total, booking) =>
        total + Number(booking.amountPaid || 0),
      0
    );
  }

  getOutstandingBalance(bookings: CustomerBooking[]): number {
    return bookings.reduce((total, booking) => {
      const balance = Number(
        booking.balance ??
        (
          Number(booking.totalAmount || 0) -
          Number(booking.amountPaid || 0)
        )
      );

      return total + Math.max(0, balance);
    }, 0);
  }

  getTotalWeight(bookings: CustomerBooking[]): number {
    return bookings.reduce((total, booking) => {
      const legacyWeight = (
        booking as CustomerBooking & { weightKg?: number }
      ).weightKg;

      const weight = Number(
        booking.totalWeight || legacyWeight || 0
      );

      return total + weight;
    }, 0);
  }

  getExpressBookings(bookings: CustomerBooking[]): number {
    return bookings.filter(
      booking => booking.isExpress === true
    ).length;
  }

  getAverageBookingValue(bookings: CustomerBooking[]): number {
    const totalBookings = this.getTotalBookings(bookings);
    const totalRevenue = this.getTotalRevenue(bookings);

    return totalBookings ? totalRevenue / totalBookings : 0;
  }

  getServiceCount(
    bookings: CustomerBooking[],
    serviceName: string
  ): number {
    return bookings.filter(booking => {
      if (booking.items?.length) {
        return booking.items.some(
          item => item.serviceName === serviceName
        );
      }

      const legacyService = (
        booking as CustomerBooking & { serviceType?: string }
      ).serviceType;

      return legacyService === serviceName;
    }).length;
  }

  getServicePercentage(
    bookings: CustomerBooking[],
    serviceName: string
  ): number {
    const totalBookings = this.getTotalBookings(bookings);

    if (!totalBookings) {
      return 0;
    }

    return Math.round(
      (this.getServiceCount(bookings, serviceName) / totalBookings) * 100
    );
  }

  getStatusPercentage(
    bookings: CustomerBooking[],
    status: string
  ): number {
    const totalBookings = this.getTotalBookings(bookings);

    if (!totalBookings) {
      return 0;
    }

    return Math.round(
      (this.getStatusCount(bookings, status) / totalBookings) * 100
    );
  }

  // -----------------------------
  // CURRENCY FORMATTING
  // -----------------------------

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(Number(value || 0));
  }
}