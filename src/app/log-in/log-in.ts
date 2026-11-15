
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-log-in',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './log-in.html',
  styleUrl: './log-in.css'
})
export class LogInComponent {
  username = 'admin';
  password = '1234';

  errorMessage = '';
  isLoading = false;

  @Output() loginSuccess = new EventEmitter<string>();

  login(): void {
    this.errorMessage = '';

    if (!this.username.trim() || !this.password.trim()) {
      this.errorMessage = 'Please enter both username and password.';
      return;
    }

    // Demonstration credentials from the original HTML.
    if (this.username === 'admin' && this.password === '1234') {
      this.loginSuccess.emit(this.username);
      return;
    }

    this.errorMessage = 'Invalid username or password.';
  }
}
