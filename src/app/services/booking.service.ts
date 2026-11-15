
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { CustomerBooking } from '../rules';

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private http = inject(HttpClient);

  private readonly apiUrl = 'http://localhost:3000/bookings';

  // GET: Retrieve all bookings
  getBookings(): Observable<CustomerBooking[]> {
    return this.http.get<CustomerBooking[]>(this.apiUrl);
  }

  // GET: Retrieve one booking
  getBooking(id: string): Observable<CustomerBooking> {
    return this.http.get<CustomerBooking>(`${this.apiUrl}/${id}`);
  }

  // POST: Add a booking
  addBooking(booking: CustomerBooking): Observable<CustomerBooking> {
    return this.http.post<CustomerBooking>(this.apiUrl, booking);
  }

  // PUT: Update a booking
  updateBooking(
    id: string,
    booking: CustomerBooking
  ): Observable<CustomerBooking> {
    return this.http.put<CustomerBooking>(
      `${this.apiUrl}/${id}`,
      booking
    );
  }

  // DELETE: Remove a booking
  deleteBooking(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
