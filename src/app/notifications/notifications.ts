import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

interface AlertItem {
  id: string;
  type: string;
  tone: 'amber' | 'blue' | 'green' | 'orange' | 'purple';
  title: string;
  detail: string;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrls: ['./notifications.css']
})
export class NotificationsComponent {
  @Output() closeModal = new EventEmitter<void>();
  @Output() inspectBooking = new EventEmitter<string>();

  alerts: AlertItem[] = [
    { id: 'BK-1001', type: 'In progress', tone: 'blue', title: 'BK-1001 is being processed', detail: 'Juan Dela Cruz • Wash & Fold' },
    { id: 'BK-1021', type: 'Express priority', tone: 'orange', title: 'BK-1001 has express priority', detail: 'Juan Dela Cruz • Prioritize this order' },
    { id: 'BK-1002', type: 'Pending booking', tone: 'amber', title: 'BK-1002 is awaiting processing', detail: 'Maria Santos • Dry Cleaning' },
    { id: 'BK-1003', type: 'Completed', tone: 'green', title: 'BK-1003 is completed', detail: 'Carlo Mendoza • Ready for release / pickup' },
    { id: 'BK-1004', type: 'Express priority', tone: 'orange', title: 'BK-1004 has express priority', detail: 'Angela Reyes • Prioritize this order' }
  ];

  getToneClass(tone: AlertItem['tone']): string {
    const tones: Record<AlertItem['tone'], string> = {
      amber: 'border-amber-200 bg-amber-50 text-amber-800',
      blue: 'border-blue-200 bg-blue-50 text-blue-800',
      green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      orange: 'border-orange-200 bg-orange-50 text-orange-800',
      purple: 'border-violet-200 bg-violet-50 text-violet-800'
    };
    return tones[tone];
  }
}