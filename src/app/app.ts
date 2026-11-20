import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { CustomerComponent } from './customer/customer';
import { NotificationsComponent } from './notifications/notifications';
import { ReportsComponent } from './reports/reports';
import { BookingService } from './services/booking.service';
import { CustomerBooking } from './rules';
import { LogInComponent } from './log-in/log-in';

type NavigationTab =
  | 'overview'
  | 'booking-management'
  | 'notifications'
  | 'reports'
  | 'settings';

type ScheduleFilter = '3-days' | '7-days';

interface EstimatorService {
  name: string;
  category: string;
  pricePerKg: number;
}

interface DashboardNotification {
  title: string;
  message: string;
  bookingNumber: string;
  date: string;
  timestamp: number;
  type: 'pending' | 'progress' | 'payment';
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    CustomerComponent,
    NotificationsComponent,
    ReportsComponent,
    LogInComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit {

  isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';

  onLoginSuccess(username: string): void {
    this.isLoggedIn = true;
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('username', username);
  }
  
  
  private bookingService = inject(BookingService);

  activeTab: NavigationTab = 'overview';

  sidebarCollapsed = false;
  mobileSidebarOpen = false;

  bookings: CustomerBooking[] = [];

  isLoadingDashboard = true;
  dashboardError = '';

  // Schedule filter
  scheduleFilter: ScheduleFilter = '3-days';

  // Estimator
  estimatorServices: EstimatorService[] = [
    { name: 'Wash & Fold', category: 'General', pricePerKg: 50 },
    { name: 'Dry Cleaning', category: 'General', pricePerKg: 120 },
    { name: 'Comforter Wash', category: 'General', pricePerKg: 150 },
    { name: 'Ironing', category: 'General', pricePerKg: 40 }
  ];

  selectedEstimatorIndex = 0;
  estimatorWeight = 3;
  estimatorExpress = false;

  ngOnInit(): void {
    this.loadDashboard();
  }

  // -----------------------------
  // LOAD BOOKINGS
  // -----------------------------

  loadDashboard(): void {
    this.isLoadingDashboard = true;
    this.dashboardError = '';

    this.bookingService.getBookings().subscribe({
      next: (data) => {
        this.bookings = data || [];
        this.updateEstimatorServices();
        this.isLoadingDashboard = false;
      },
      error: (error) => {
        console.error('Dashboard loading error:', error);
        this.dashboardError =
          'Unable to load dashboard information. Please check JSON Server.';
        this.isLoadingDashboard = false;
      }
    });
  }

  // -----------------------------
  // DATE HELPERS
  // -----------------------------

  private getLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  get todayDate(): string {
    return this.getLocalDateString(new Date());
  }

  private dateToTimestamp(dateString: string): number {
    if (!dateString) {
      return 0;
    }

    const parts = dateString.split('-').map(Number);

    if (parts.length !== 3 || parts.some(Number.isNaN)) {
      return 0;
    }

    return new Date(parts[0], parts[1] - 1, parts[2]).getTime();
  }

  formatScheduleDate(dateString?: string): string {
    if (!dateString) {
      return 'No pickup date';
    }

    const timestamp = this.dateToTimestamp(dateString);

    if (!timestamp) {
      return 'Invalid date';
    }

    return new Date(timestamp).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatNotificationDate(timestamp: number): string {
    if (!timestamp) {
      return 'Date unavailable';
    }

    return new Date(timestamp).toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  // -----------------------------
  // OVERVIEW METRICS
  // -----------------------------

  get totalRevenue(): number {
    return this.bookings.reduce(
      (total, booking) => total + Number(booking.totalAmount || 0),
      0
    );
  }

  get totalBookings(): number {
    return this.bookings.length;
  }

  get pendingBookings(): number {
  return this.bookings.filter(
    booking => booking.status === 'Pending'
  ).length;
  }

  // Express bookings that are not yet finished
get expressPriorityBookings(): number {
  return this.bookings.filter(
    booking =>
      booking.isExpress &&
      booking.status !== 'Done' &&
      booking.status !== 'Cancelled'
  ).length;
}

// Laundry bookings currently being processed
get inProgressBookings(): number {
  return this.bookings.filter(
    booking => booking.status === 'In Progress'
  ).length;
}

  // Bookings completed today
  get completedToday(): number {
    const today = this.todayDate;

    return this.bookings.filter(booking => {
      if (
        booking.status !== 'Done' ||
        !booking.completedAt
      ) {
        return false;
      }

      const completedDate = new Date(booking.completedAt);

      const year = completedDate.getFullYear();
      const month = String(completedDate.getMonth() + 1).padStart(2, '0');
      const day = String(completedDate.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}` === today;
    }).length;
  }

  get completedBookings(): number {
    return this.bookings.filter(
      booking => booking.status === 'Done'
    ).length;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  }

  // -----------------------------
  // TODAY'S PICKUP SCHEDULE
  // -----------------------------

  get todaysSchedule(): CustomerBooking[] {
    return this.bookings
      .filter(booking =>
        booking.pickupDate === this.todayDate &&
        booking.status !== 'Cancelled'
      )
      .sort((a, b) =>
        String(a.bookingNumber || '').localeCompare(
          String(b.bookingNumber || '')
        )
      );
  }

  // -----------------------------
  // UPCOMING PICKUP SCHEDULE
  // -----------------------------

  setScheduleFilter(filter: ScheduleFilter): void {
    this.scheduleFilter = filter;
  }

  get upcomingSchedule(): CustomerBooking[] {
    const today = this.dateToTimestamp(this.todayDate);
    const numberOfDays = this.scheduleFilter === '3-days' ? 3 : 7;
    const lastDay = today + numberOfDays * 24 * 60 * 60 * 1000;

    return this.bookings
      .filter(booking => {
        if (!booking.pickupDate || booking.status === 'Cancelled') {
          return false;
        }

        const pickupTimestamp = this.dateToTimestamp(booking.pickupDate);

        // Excludes today because today's pickups have their own section.
        return pickupTimestamp > today && pickupTimestamp <= lastDay;
      })
      .sort((a, b) =>
        this.dateToTimestamp(a.pickupDate || '') -
        this.dateToTimestamp(b.pickupDate || '')
      );
  }

  get upcomingScheduleLabel(): string {
    return this.scheduleFilter === '3-days'
      ? 'Next 3 Days'
      : 'Next 7 Days';
  }

  // -----------------------------
  // LATEST NOTIFICATION SNAPSHOT
  // -----------------------------

  get latestNotification(): DashboardNotification | null {
    const notifications: DashboardNotification[] = [];

    this.bookings.forEach(booking => {
      const timestamp = new Date(
        booking.updatedAt || booking.createdAt || booking.bookingDate
      ).getTime();

      const bookingNumber = booking.bookingNumber || booking.id || 'Booking';

      if (booking.status === 'Pending') {
        notifications.push({
          title: 'Pending Booking',
          message: `${booking.customerName} has a booking awaiting processing.`,
          bookingNumber,
          date: this.formatNotificationDate(timestamp),
          timestamp,
          type: 'pending'
        });
      }

      if (booking.status === 'In Progress') {
        notifications.push({
          title: 'Laundry In Progress',
          message: `${booking.customerName}'s laundry is currently being processed.`,
          bookingNumber,
          date: this.formatNotificationDate(timestamp),
          timestamp,
          type: 'progress'
        });
      }

      const balance = Number(
        booking.balance ??
        (Number(booking.totalAmount || 0) - Number(booking.amountPaid || 0))
      );

      if (
        booking.status !== 'Cancelled' &&
        balance > 0
      ) {
        notifications.push({
          title: 'Payment Reminder',
          message: `${booking.customerName} has an outstanding balance of ${this.formatCurrency(balance)}.`,
          bookingNumber,
          date: this.formatNotificationDate(timestamp),
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

  openNotifications(): void {
    this.setActiveTab('notifications');
  }

  // -----------------------------
  // WEIGHT AND PRICE ESTIMATOR
  // -----------------------------

  private updateEstimatorServices(): void {
    const serviceMap = new Map<string, EstimatorService>();

    this.bookings.forEach(booking => {
      (booking.items || []).forEach(item => {
        const name = item.serviceName || 'Laundry Service';
        const category = item.categoryName || 'General';
        const key = `${name}-${category}`;

        if (!serviceMap.has(key)) {
          serviceMap.set(key, {
            name,
            category,
            pricePerKg: Number(item.pricePerKg || 0)
          });
        }
      });
    });

    // Use actual saved booking rates when they are available.
    if (serviceMap.size > 0) {
      this.estimatorServices = Array.from(serviceMap.values());
    }

    if (this.selectedEstimatorIndex >= this.estimatorServices.length) {
      this.selectedEstimatorIndex = 0;
    }
  }

  get selectedEstimatorService(): EstimatorService {
    return this.estimatorServices[this.selectedEstimatorIndex] ||
      this.estimatorServices[0];
  }

  onEstimatorServiceChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedEstimatorIndex = Number(select.value);
  }

  onEstimatorWeightChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.estimatorWeight = Number(input.value);
  }

  onEstimatorExpressChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.estimatorExpress = input.checked;
  }

  get isEstimatorWeightValid(): boolean {
    return (
      Number.isFinite(this.estimatorWeight) &&
      this.estimatorWeight >= 3 &&
      this.estimatorWeight <= 20
    );
  }

  get estimatorSubtotal(): number {
    if (!this.isEstimatorWeightValid || !this.selectedEstimatorService) {
      return 0;
    }

    return this.estimatorWeight *
      this.selectedEstimatorService.pricePerKg;
  }

  get estimatorTotal(): number {
    return this.estimatorSubtotal *
      (this.estimatorExpress ? 2 : 1);
  }

  // -----------------------------
  // SIDEBAR NAVIGATION
  // -----------------------------

  setActiveTab(tab: NavigationTab): void {
    this.activeTab = tab;
    this.mobileSidebarOpen = false;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }

  logout(): void {
  sessionStorage.removeItem('isLoggedIn');
  sessionStorage.removeItem('username');

  this.isLoggedIn = false;
}
}