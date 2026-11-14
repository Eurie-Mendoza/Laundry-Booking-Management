import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LogInComponent } from './log-in/log-in';
import { ReportsComponent } from './reports/reports';
import { CustomerComponent } from './customer/customer';
import { NotificationsComponent } from './notifications/notifications';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    LogInComponent,
    ReportsComponent,
    CustomerComponent,
    NotificationsComponent
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent implements OnInit, OnDestroy {
  isAuthenticated = false;
  currentUser = 'Admin Staff';
  activeTab: 'overview' | 'management' = 'overview';
  
  isNotificationsOpen = false;
  notificationCount = 5;
  selectedBookingIdForModal: string | null = null;

  headerClockTime = '--:--:--';
  headerClockDate = 'Loading date...';
  private clockInterval: any;

  toastMessage: string | null = null;
  private toastTimeout: any;

  get pageTitle(): string {
    return this.activeTab === 'overview' ? 'Overview' : 'Booking Management';
  }

  get breadcrumbLabel(): string {
    return this.activeTab === 'overview' ? 'Reports & Insights' : 'Bookings / Customers';
  }

  ngOnInit(): void {
    this.updateHeaderClock();
    this.clockInterval = setInterval(() => this.updateHeaderClock(), 1000);
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }

  onLoginSuccess(username: string): void {
    this.currentUser = username.charAt(0).toUpperCase() + username.slice(1);
    this.isAuthenticated = true;
    this.switchTab('overview');
    this.triggerToast(`Welcome back, ${username}!`);
  }

  handleLogout(): void {
    this.isAuthenticated = false;
    this.triggerToast('Logged out of L.A.B.A session.');
  }

  switchTab(tab: 'overview' | 'management'): void {
    this.activeTab = tab;
  }

  openNotifications(): void {
    this.isNotificationsOpen = true;
  }

  closeNotifications(): void {
    this.isNotificationsOpen = false;
  }

  handleSelectBooking(bookingId: string): void {
    this.isNotificationsOpen = false;
    this.activeTab = 'management';
    this.selectedBookingIdForModal = bookingId;
  }

  triggerToast(message: string): void {
    this.toastMessage = message;
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastMessage = null;
    }, 3200);
  }

  private updateHeaderClock(): void {
    const now = new Date();
    this.headerClockTime = now.toLocaleTimeString('en-PH', {
      timeZone: 'Asia/Manila',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    const dateStr = now.toLocaleDateString('en-PH', {
      timeZone: 'Asia/Manila',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    this.headerClockDate = `${dateStr} • PHT`;
  }
}