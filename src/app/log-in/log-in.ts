
import { Component, EventEmitter, Output, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CustomerService, Account } from '../customer';

@Component({
  selector: 'app-log-in',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './log-in.html',
  styleUrl: './log-in.css'
})
export class LogInComponent implements OnInit {

  private accounts: Account[] = [];
  accountsLoaded = false;

  private customerService = inject(CustomerService);

  username = '';
  password = '';

  errorMessage = '';
  isLoading = false;

  @Output() loginSuccess = new EventEmitter<{
    username: string;
    role: string;
  }>();

  ngOnInit(): void {
    this.loadAccounts();
  }

  // Load accounts once when the login component opens
  loadAccounts(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.customerService.getAccounts().subscribe({
      next: (accounts: Account[]) => {
        this.accounts = accounts;
        this.accountsLoaded = true;
        this.isLoading = false;
      },

      error: (error) => {
        console.error('Account loading failed:', error);

        this.accountsLoaded = false;
        this.isLoading = false;

        this.errorMessage =
          'Unable to connect to the server. Please check JSON Server and try again.';
      }
    });
  }

  // Validate credentials using the loaded accounts
  login(): void {
    this.errorMessage = '';

    const enteredUsername = this.username.trim();
    const enteredPassword = this.password;

    if (!enteredUsername || !enteredPassword.trim()) {
      this.errorMessage =
        'Please enter both username and password.';
      return;
    }

    if (!this.accountsLoaded) {
      this.errorMessage =
        'Login accounts are still loading. Please try again.';
      return;
    }

    const account = this.accounts.find(item =>
      item.username?.trim().toLowerCase() ===
        enteredUsername.toLowerCase() &&
      item.password === enteredPassword
    );

    if (!account) {
      this.errorMessage = 'Invalid username or password.';
      return;
    }

    if (!account.isActive) {
      this.errorMessage =
        'Your account is inactive. Please contact the administrator.';
      return;
    }

    this.loginSuccess.emit({
      username: account.username,
      role: account.role
    });
  }
}
