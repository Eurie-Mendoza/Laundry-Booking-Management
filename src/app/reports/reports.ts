import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrls: ['./reports.css']
})
export class ReportsComponent {
  @Output() openAllNotifications = new EventEmitter<void>();
  @Output() selectBooking = new EventEmitter<string>();

  estimateRate = 50;
  estimateWeight = 5;
  estimateExpress = false;

  get estimatedTotal(): number {
    const safeWeight = Math.max(0, Number(this.estimateWeight) || 0);
    return this.estimateRate * safeWeight * (this.estimateExpress ? 2 : 1);
  }

  alertPreviews = [
    { id: 'BK-1001', type: 'Express priority', title: 'BK-1001 has express priority', detail: 'Juan Dela Cruz • Prioritize this order' },
    { id: 'BK-1002', type: 'Pending booking', title: 'BK-1002 is awaiting processing', detail: 'Maria Santos • Dry Cleaning' },
    { id: 'BK-1003', type: 'Completed', title: 'BK-1003 is completed', detail: 'Carlo Mendoza • Ready for pickup' }
  ];

  todayQueue = [
    { id: 'BK-1001', customerName: 'Juan Dela Cruz', status: 'In-Progress', isExpress: true },
    { id: 'BK-1004', customerName: 'Angela Reyes', status: 'In-Progress', isExpress: true },
    { id: 'BK-1003', customerName: 'Carlo Mendoza', status: 'Done', isExpress: false }
  ];

  recentActivities = [
    { message: 'BK-1001 marked In-Progress', time: '10:30 AM' },
    { message: 'New booking added for Angela Reyes (BK-1004)', time: '09:45 AM' },
    { message: 'BK-1003 completed and ready for pickup', time: '08:15 AM' }
  ];

  upcomingDays = [
    { label: 'Sun', dayNum: 15, orders: 0, weight: '0.0' },
    { label: 'Mon', dayNum: 16, orders: 1, weight: '4.5' },
    { label: 'Tue', dayNum: 17, orders: 1, weight: '5.0' }
  ];

  weeklyChart = [
    { day: 'Mon', label: '₱280', heightPct: 45, barClass: 'bg-gray-400 hover:bg-blue-500', highlight: false, closed: false },
    { day: 'Tue', label: '₱350', heightPct: 58, barClass: 'bg-gray-500 hover:bg-blue-500', highlight: false, closed: false },
    { day: 'Wed', label: '₱420', heightPct: 70, barClass: 'bg-gray-500 hover:bg-blue-500', highlight: false, closed: false },
    { day: 'Thu', label: '₱310', heightPct: 52, barClass: 'bg-gray-400 hover:bg-blue-500', highlight: false, closed: false },
    { day: 'Fri', label: '₱490', heightPct: 82, barClass: 'bg-gray-600 hover:bg-blue-500', highlight: false, closed: false },
    { day: 'Sat', label: '₱600', heightPct: 95, barClass: 'bg-slate-900 shadow-sm', highlight: true, closed: false },
    { day: 'Sun', label: 'Closed', heightPct: 10, barClass: 'bg-gray-200', highlight: false, closed: true }
  ];

  serviceDistributions = [
    { name: 'Wash & Fold', countLabel: '2 orders', percent: 65, colorClass: 'bg-slate-800' },
    { name: 'Dry Cleaning', countLabel: '1 order', percent: 35, colorClass: 'bg-blue-600' },
    { name: 'Express Priority (2x)', countLabel: '2 orders', percent: 50, colorClass: 'bg-orange-500' },
    { name: 'Comforter & Ironing', countLabel: '1 order', percent: 25, colorClass: 'bg-emerald-500' }
  ];
}