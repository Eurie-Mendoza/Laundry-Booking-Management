
import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  ChangeDetectorRef,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, finalize } from 'rxjs';

import { CustomerComponent } from './customer/customer';

import { CustomerService } from './customer';
import type {
  BookingFormItem,
  ShopInformation
} from './customer';

import { NotificationsComponent } from './notifications/notifications';
import { NotificationService } from './notification';
import type { DashboardNotification } from './rules';

import { ReportsComponent } from './reports/reports';
import { ReportsService } from './reports';

import { BookingService } from './services/booking.service';
import type { CustomerBooking, ShopRules } from './rules';

import { LogInComponent } from './log-in/log-in';

type NavigationTab =
  | 'overview'
  | 'booking-management'
  | 'notifications'
  | 'reports'
  | 'settings';

type ScheduleFilter = '3-days' | '7-days';

interface EstimatorService {
  id: number;
  name: string;
  pricePerKg: number;
}

interface LoginAccount {
  username: string;
  role: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CustomerComponent,
    NotificationsComponent,
    ReportsComponent,
    LogInComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit {

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly bookingService = inject(BookingService);
  private readonly reportsService = inject(ReportsService);
  private readonly notificationService = inject(NotificationService);
  private readonly customerService = inject(CustomerService);

  // -----------------------------
  // LOGIN AND USER INFORMATION
  // -----------------------------

  isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';

  currentUsername = sessionStorage.getItem('username') || '';
  currentUserRole = sessionStorage.getItem('userRole') || '';

  handleLoginSuccess(account: LoginAccount): void {
    this.currentUsername = account.username;
    this.currentUserRole = account.role;

    this.isLoggedIn = true;

    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('username', account.username);
    sessionStorage.setItem('userRole', account.role);

    this.loadDashboard();
    this.loadEstimatorConfiguration();

    this.cdr.detectChanges();
  }

  get userInitials(): string {
    if (!this.currentUsername) {
      return 'U';
    }

    return this.currentUsername
      .trim()
      .split(/\s+/)
      .map(part => part.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  logout(): void {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('userRole');

    this.currentUsername = '';
    this.currentUserRole = '';

    this.isLoggedIn = false;

    this.activeTab = 'overview';
    this.mobileSidebarOpen = false;

    this.cdr.detectChanges();
  }

  // -----------------------------
  // SHOP BRAND INFORMATION
  // -----------------------------

  shopName = 'L.A.B.A.';
  shopLogo = '/WASH.png';
  projectName = 'LABA';
  projectVersion = '1.0.0';

  loadShopInformation(): void {
    this.customerService.getShopInformation().subscribe({
      next: (information: ShopInformation[]) => {
        const shop = information?.[0];

        if (!shop) {
          console.warn('No shop information was found in db.json.');
          return;
        }

        this.shopName = shop.shopName || 'L.A.B.A.';
        this.shopLogo = shop.logoPath || '/WASH.png';
        this.projectName = shop.projectName || 'LABA';
        this.projectVersion = shop.projectVersion || '1.0.0';

        this.cdr.detectChanges();

        console.log('Shop information loaded:', shop);
      },

      error: (error) => {
        console.error('Shop information loading error:', error);
      }
    });
  }

  onShopLogoError(): void {
    this.shopLogo = '/WASH.png';
  }

  // -----------------------------
  // NAVIGATION
  // -----------------------------

  activeTab: NavigationTab = 'overview';

  sidebarCollapsed = false;
  mobileSidebarOpen = false;

  // -----------------------------
  // BOOKINGS / DASHBOARD
  // -----------------------------

  bookings: CustomerBooking[] = [];

  isLoadingDashboard = false;
  dashboardError = '';

  private dashboardRequestInProgress = false;

  // Schedule filter
  scheduleFilter: ScheduleFilter = '3-days';

  // -----------------------------
  // ESTIMATOR CONFIGURATION
  // -----------------------------

  estimatorServices: EstimatorService[] = [];

  selectedEstimatorIndex = 0;
  estimatorWeight = 3;
  estimatorExpress = false;

  minimumWeight = 0;
  maximumWeight = 0;
  expressMultiplier = 1;
  expressEnabled = false;

  isLoadingEstimator = false;
  estimatorError = '';

  // -----------------------------
  // SHOP SETTINGS
  // -----------------------------

  readonly operatingDayOptions = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  ];

  shopSettings: ShopRules | null = null;

  isLoadingShopSettings = false;
  isSavingShopSettings = false;
  shopSettingsLoaded = false;

  shopSettingsError = '';
  shopSettingsSuccess = '';

  // -----------------------------
  // INITIALIZATION
  // -----------------------------

  ngOnInit(): void {

    // Load shop branding.
    this.loadShopInformation();

    // Load dashboard information only if already logged in.
    if (this.isLoggedIn) {
      this.loadDashboard();
      this.loadEstimatorConfiguration();
    }
  }

  // -----------------------------
  // LOAD DASHBOARD
  // -----------------------------

  loadDashboard(): void {

    // Prevent duplicate requests.
    if (this.dashboardRequestInProgress) {
      return;
    }

    this.dashboardRequestInProgress = true;

    this.isLoadingDashboard = true;
    this.dashboardError = '';

    this.cdr.detectChanges();

    this.bookingService.getBookings()
      .pipe(
        finalize(() => {
          this.isLoadingDashboard = false;
          this.dashboardRequestInProgress = false;

          // Update the dashboard after loading finishes,
          // including when the request encounters an error.
          this.cdr.detectChanges();
        })
      )
      .subscribe({

        next: (data) => {
          this.bookings = data || [];

          this.dashboardError = '';

          console.log(
            'Dashboard bookings loaded:',
            this.bookings
          );

          this.cdr.detectChanges();
        },

        error: (error) => {
          console.error('Dashboard loading error:', error);

          this.dashboardError =
            'Unable to load dashboard information. Please check JSON Server and try again.';

          this.cdr.detectChanges();
        }

      });
  }

  // -----------------------------
  // LOAD ESTIMATOR CONFIGURATION
  // -----------------------------

  loadEstimatorConfiguration(): void {

    this.isLoadingEstimator = true;
    this.estimatorError = '';

    this.cdr.detectChanges();

    forkJoin({
      services: this.customerService.getServices(),
      shopRules: this.customerService.getShopRules()
    })
      .pipe(
        finalize(() => {
          this.isLoadingEstimator = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({

        next: (data) => {

          const availableServices = (data.services || []).filter(
            service => service.isAvailable
          );

          this.customerService.services = availableServices;

          const rules = data.shopRules?.[0];

          if (!rules) {
            this.estimatorError =
              'No shop rules were found in db.json.';

            return;
          }

          this.customerService.applyShopRules(rules);

          this.minimumWeight = this.customerService.minimumWeight;
          this.maximumWeight = this.customerService.maximumWeight;
          this.expressMultiplier = this.customerService.expressMultiplier;
          this.expressEnabled = this.customerService.expressEnabled;

          this.estimatorServices = availableServices.map(service => ({
            id: Number(service.id),
            name: service.serviceName,
            pricePerKg: Number(service.pricePerKg || 0)
          }));

          this.estimatorWeight = this.minimumWeight;

          if (
            this.selectedEstimatorIndex >= this.estimatorServices.length
          ) {
            this.selectedEstimatorIndex = 0;
          }

          if (!this.expressEnabled) {
            this.estimatorExpress = false;
          }

          if (this.estimatorServices.length === 0) {
            this.estimatorError =
              'No available laundry services were found.';
          }

          this.cdr.detectChanges();
        },

        error: (error) => {
          console.error(
            'Estimator configuration loading error:',
            error
          );

          this.estimatorError =
            'Unable to load estimator services or shop rules. Please check JSON Server.';
        }

      });
  }

  // -----------------------------
  // SHOP SETTINGS OPERATIONS
  // -----------------------------

  loadShopSettings(): void {

    this.isLoadingShopSettings = true;
    this.shopSettingsError = '';
    this.shopSettingsSuccess = '';

    this.cdr.detectChanges();

    this.customerService.getShopRules()
      .pipe(
        finalize(() => {
          this.isLoadingShopSettings = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({

        next: (rulesList) => {

          const rules = rulesList?.[0];

          if (!rules) {
            this.shopSettings = null;
            this.shopSettingsLoaded = false;

            this.shopSettingsError =
              'No shop settings were found in db.json. Please check the shopRules collection.';

            return;
          }

          this.shopSettings = this.copyShopRules(rules);

          this.shopSettingsLoaded = true;

          console.log(
            'Shop settings loaded:',
            this.shopSettings
          );

          this.cdr.detectChanges();
        },

        error: (error) => {
          console.error('Shop settings loading error:', error);

          this.shopSettingsError =
            'Unable to load shop settings. Please check if JSON Server is running.';
        }

      });
  }

  private copyShopRules(rules: ShopRules): ShopRules {
    return {
      ...rules,
      operatingDays: [...(rules.operatingDays || [])],
      closedDays: [...(rules.closedDays || [])]
    };
  }

  isOperatingDay(day: string): boolean {
    return this.shopSettings?.operatingDays.includes(day) ?? false;
  }

  toggleOperatingDay(day: string, event: Event): void {

    if (!this.shopSettings) {
      return;
    }

    const checkbox = event.target as HTMLInputElement;
    const selectedDays = [...this.shopSettings.operatingDays];

    if (checkbox.checked) {
      if (!selectedDays.includes(day)) {
        selectedDays.push(day);
      }
    } else {
      const index = selectedDays.indexOf(day);

      if (index !== -1) {
        selectedDays.splice(index, 1);
      }
    }

    this.shopSettings.operatingDays = this.operatingDayOptions.filter(
      option => selectedDays.includes(option)
    );

    this.shopSettings.closedDays = this.operatingDayOptions.filter(
      option => !this.shopSettings!.operatingDays.includes(option)
    );

    this.shopSettingsError = '';
    this.shopSettingsSuccess = '';
  }

  saveShopSettings(): void {

    if (!this.shopSettings || this.isSavingShopSettings) {
      return;
    }

    this.shopSettingsError = '';
    this.shopSettingsSuccess = '';

    const settings = this.shopSettings;

    // Validate weight limits.
    if (
      !Number.isFinite(Number(settings.minimumWeight)) ||
      !Number.isFinite(Number(settings.maximumWeight)) ||
      Number(settings.minimumWeight) <= 0 ||
      Number(settings.maximumWeight) <= 0
    ) {
      this.shopSettingsError =
        'Minimum and maximum weight must be greater than zero.';
      return;
    }

    if (Number(settings.minimumWeight) > Number(settings.maximumWeight)) {
      this.shopSettingsError =
        'Minimum weight cannot be greater than maximum weight.';
      return;
    }

    // Validate daily booking capacity.
    if (
      !Number.isFinite(Number(settings.maximumDailyBookingCapacity)) ||
      Number(settings.maximumDailyBookingCapacity) < 1
    ) {
      this.shopSettingsError =
        'Maximum daily booking capacity must be at least 1.';
      return;
    }

    // Validate express multiplier.
    if (
      !Number.isFinite(Number(settings.expressMultiplier)) ||
      Number(settings.expressMultiplier) < 1
    ) {
      this.shopSettingsError =
        'Express multiplier must be at least 1.';
      return;
    }

    // Validate operating hours.
    if (!settings.openingTime || !settings.closingTime) {
      this.shopSettingsError =
        'Please provide both opening and closing times.';
      return;
    }

    if (settings.openingTime >= settings.closingTime) {
      this.shopSettingsError =
        'Closing time must be later than opening time.';
      return;
    }

    // Require at least one operating day.
    if (!settings.operatingDays || settings.operatingDays.length === 0) {
      this.shopSettingsError =
        'Please select at least one operating day.';
      return;
    }

    // Keep operatingDays and closedDays synchronized.
    const updatedSettings: ShopRules = {
      ...settings,
      minimumWeight: Number(settings.minimumWeight),
      maximumWeight: Number(settings.maximumWeight),
      maximumDailyBookingCapacity: Number(
        settings.maximumDailyBookingCapacity
      ),
      expressMultiplier: Number(settings.expressMultiplier),
      operatingDays: this.operatingDayOptions.filter(
        day => settings.operatingDays.includes(day)
      ),
      closedDays: this.operatingDayOptions.filter(
        day => !settings.operatingDays.includes(day)
      )
    };

    this.isSavingShopSettings = true;

    this.customerService.updateShopRules(
      updatedSettings.id,
      updatedSettings
    )
      .pipe(
        finalize(() => {
          this.isSavingShopSettings = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({

        next: (savedRules) => {

          this.shopSettings = this.copyShopRules(savedRules);

          this.customerService.applyShopRules(savedRules);

          // Update the Overview estimator immediately.
          this.minimumWeight = this.customerService.minimumWeight;
          this.maximumWeight = this.customerService.maximumWeight;
          this.expressMultiplier = this.customerService.expressMultiplier;
          this.expressEnabled = this.customerService.expressEnabled;

          // Keep estimator weight within the updated limits.
          if (this.estimatorWeight < this.minimumWeight) {
            this.estimatorWeight = this.minimumWeight;
          } else if (this.estimatorWeight > this.maximumWeight) {
            this.estimatorWeight = this.maximumWeight;
          }

          if (!this.expressEnabled) {
            this.estimatorExpress = false;
          }

          this.shopSettingsSuccess =
            'Shop settings have been saved successfully.';

          // Reload settings from JSON Server.
          this.loadShopSettings();

          this.cdr.detectChanges();
        },

        error: (error) => {
          console.error('Shop settings saving error:', error);

          this.shopSettingsError =
            'Unable to save shop settings. Please check JSON Server and try again.';
        }

      });
  }

  resetShopSettings(): void {
    this.loadShopSettings();
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

    return new Date(
      parts[0],
      parts[1] - 1,
      parts[2]
    ).getTime();
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

  get selectedEstimatorService(): EstimatorService | undefined {
    return this.estimatorServices[this.selectedEstimatorIndex];
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

    this.estimatorExpress =
      this.expressEnabled && input.checked;
  }

  get isEstimatorWeightValid(): boolean {
    return (
      Number.isFinite(this.estimatorWeight) &&
      this.estimatorWeight >= this.minimumWeight &&
      this.estimatorWeight <= this.maximumWeight
    );
  }

  get estimatorItems(): BookingFormItem[] {

    if (
      !this.selectedEstimatorService ||
      !this.isEstimatorWeightValid
    ) {
      return [];
    }

    return [
      {
        serviceId: this.selectedEstimatorService.id,
        itemCategoryId: 0,
        weight: this.estimatorWeight
      }
    ];
  }

  get estimatorSubtotal(): number {

    if (
      !this.isEstimatorWeightValid ||
      !this.selectedEstimatorService
    ) {
      return 0;
    }

    return this.customerService.getBaseSubtotal(
      this.estimatorItems
    );
  }

  get estimatorTotal(): number {

    if (
      !this.isEstimatorWeightValid ||
      !this.selectedEstimatorService
    ) {
      return 0;
    }

    return this.customerService.getGrandTotal(
      this.estimatorSubtotal,
      this.estimatorExpress
    );
  }

  // -----------------------------
  // SIDEBAR NAVIGATION
  // -----------------------------

  setActiveTab(tab: NavigationTab): void {

    this.activeTab = tab;
    this.mobileSidebarOpen = false;

    if (tab === 'settings') {
      this.loadShopSettings();
    }

    if (tab === 'overview') {
      this.loadDashboard();
    }

    this.cdr.detectChanges();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }
}
