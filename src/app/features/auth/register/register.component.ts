import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthStore } from '../auth.store';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent implements OnInit {
  readonly store = inject(AuthStore);

  fullName = signal('');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  hidePassword = signal(true);

  ngOnInit(): void {
    this.store.clearMessages();
  }

  get passwordsMatch(): boolean {
    return this.password() === this.confirmPassword();
  }

  get canSubmit(): boolean {
    return !!(
      this.fullName().trim() &&
      this.email().trim() &&
      this.password().length >= 6 &&
      this.passwordsMatch &&
      !this.store.loading()
    );
  }

  onSubmit(): void {
    if (!this.canSubmit) return;
    this.store.register(this.email(), this.password(), this.fullName());
  }
}
