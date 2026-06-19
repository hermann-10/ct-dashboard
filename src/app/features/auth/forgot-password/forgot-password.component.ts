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
  selector: 'app-forgot-password',
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
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent implements OnInit {
  readonly store = inject(AuthStore);

  email = signal('');

  ngOnInit(): void {
    this.store.clearMessages();
  }

  onSubmit(): void {
    if (!this.email().trim() || this.store.loading()) return;
    this.store.resetPassword(this.email());
  }
}
