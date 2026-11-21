
import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  inject
} from '@angular/core';

import { CustomerBooking, BookingNotification } from '../rules';
import { NotificationService } from '../notification';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css'
})
export class NotificationsComponent implements OnChanges {

  private notificationService = inject(NotificationService);

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

  // Generate notifications using NotificationService
  private generateNotifications(): void {
    this.notifications =
      this.notificationService.generateNotifications(this.bookings);
  }

  // Refresh using the parent component's existing booking loader
  refresh(): void {
    this.refreshRequested.emit();
  }
}
