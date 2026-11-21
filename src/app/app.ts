import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { CustomerComponent } from './customer/customer';
import { NotificationsComponent } from './notifications/notifications';
import { NotificationService, DashboardNotification } from './notification';import { ReportsComponent } from './reports/reports';
import { ReportsService } from './reports';
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
private reportsService = inject(ReportsService);
private notificationService = inject(NotificationService);

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
  return this.reportsService.getTotalRevenue(this.bookings);
}

get totalBookings(): number {
  return this.reportsService.getTotalBookings(this.bookings);
}

get pendingBookings(): number {
  return this.reportsService.getPendingBookings(this.bookings);
}

get expressPriorityBookings(): number {
  return this.reportsService.getExpressPriorityBookings(this.bookings);
}

get inProgressBookings(): number {
  return this.reportsService.getInProgressBookings(this.bookings);
}

get completedToday(): number {
  return this.reportsService.getCompletedToday(
    this.bookings,
    this.todayDate
  );
}

get completedBookings(): number {
  return this.reportsService.getCompletedBookings(this.bookings);
}

formatCurrency(amount: number): string {
  return this.reportsService.formatCurrency(amount);
}

  // -----------------------------
  // TODAY'S PICKUP SCHEDULE
  // -----------------------------

  get todaysSchedule(): CustomerBooking[] {
    return this.reportsService.getTodaysSchedule(
      this.bookings,
      this.todayDate
    );
  }

  // -----------------------------
  // UPCOMING PICKUP SCHEDULE
  // -----------------------------

  setScheduleFilter(filter: ScheduleFilter): void {
    this.scheduleFilter = filter;
  }

  get upcomingSchedule(): CustomerBooking[] {
    const numberOfDays = this.scheduleFilter === '3-days' ? 3 : 7;

    return this.reportsService.getUpcomingSchedule(
      this.bookings,
      numberOfDays,
      this.todayDate
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
    return this.notificationService.getLatestDashboardNotification(
      this.bookings,
      (amount) => this.formatCurrency(amount),
      (timestamp) => this.formatNotificationDate(timestamp)
    );
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