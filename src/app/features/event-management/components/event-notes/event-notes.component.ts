import { Component, input, output, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-event-notes',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="notes-container">
      <h3 class="notes-title">Notes & Stratégie</h3>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Notes sur l'événement</mat-label>
        <textarea
          matInput
          rows="5"
          [ngModel]="localNotes()"
          (ngModelChange)="localNotes.set($event)"
          placeholder="Ajoutez vos notes ici..."
        ></textarea>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Stratégie / Plan d'action</mat-label>
        <textarea
          matInput
          rows="5"
          [ngModel]="localStrategy()"
          (ngModelChange)="localStrategy.set($event)"
          placeholder="Décrivez votre stratégie..."
        ></textarea>
      </mat-form-field>

      <div class="notes-actions">
        <button
          mat-flat-button
          color="primary"
          [disabled]="saving()"
          (click)="onSave()"
        >
          @if (saving()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <mat-icon>save</mat-icon>
          }
          Enregistrer
        </button>
      </div>
    </div>
  `,
  styles: [`
    .notes-container {
      margin-bottom: 1.5rem;
    }

    .notes-title {
      margin: 0 0 1rem 0;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .full-width {
      width: 100%;
    }

    .notes-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 0.5rem;
    }

    .notes-actions button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    mat-spinner {
      display: inline-block;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventNotesComponent {
  notes = input<string | null>(null);
  strategy = input<string | null>(null);
  saving = input<boolean>(false);

  save = output<{ notes: string | null; strategy: string | null }>();

  localNotes = signal('');
  localStrategy = signal('');

  constructor() {
    effect(() => {
      this.localNotes.set(this.notes() ?? '');
    }, { allowSignalWrites: true });
    effect(() => {
      this.localStrategy.set(this.strategy() ?? '');
    }, { allowSignalWrites: true });
  }

  onSave(): void {
    this.save.emit({
      notes: this.localNotes() || null,
      strategy: this.localStrategy() || null,
    });
  }
}
