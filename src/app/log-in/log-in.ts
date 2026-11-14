import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-log-in',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './log-in.html',
  styleUrls: ['./log-in.css']
})
export class LogInComponent {
  username = 'admin';
  password = '1234';
  showError = false;

  @Output() loginSuccess = new EventEmitter<string>();

  onSubmit(): void {
    const trimmedUser = this.username.trim();
    const trimmedPass = this.password.trim();

    if (!trimmedUser || !trimmedPass) {
      this.showError = true;
      return;
    }

    this.showError = false;
    this.loginSuccess.emit(trimmedUser);
  }
}