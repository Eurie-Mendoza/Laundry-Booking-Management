
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { CustomerComponent } from './customer/customer';
import { NotificationsComponent } from './notifications/notifications';
import { ReportsComponent } from './reports/reports';

type NavigationTab =
  | 'overview'
  | 'booking-management'
  | 'notifications'
  | 'reports'
  | 'settings';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    CustomerComponent,
    NotificationsComponent,
    ReportsComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  activeTab: NavigationTab = 'overview';

  sidebarCollapsed = false;
  mobileSidebarOpen = false;

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
}
