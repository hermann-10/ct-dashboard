import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { DatePipe } from '@angular/common';
import { EventConfig } from '../../dashboard.model';

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [MatCardModule, MatTableModule, MatButtonModule, MatIconModule, MatChipsModule, DatePipe],
  template: `
    <mat-card class="events-card">
      <mat-card-header>
        <mat-card-title>Événements</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        @if (events().length > 0) {
          <table mat-table [dataSource]="events()" class="full-width">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Événement</th>
              <td mat-cell *matCellDef="let row">
                <div class="event-name">{{ row.name }}</div>
                <div class="event-date">{{ row.date | date:'d MMMM yyyy':'':'fr-CH' }}</div>
              </td>
            </ng-container>
            <ng-container matColumnDef="clicks">
              <th mat-header-cell *matHeaderCellDef>Clics</th>
              <td mat-cell *matCellDef="let row">
                <span class="stat-value">{{ row.totalClicks }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="unique">
              <th mat-header-cell *matHeaderCellDef>Uniques</th>
              <td mat-cell *matCellDef="let row">
                <span class="stat-value">{{ row.uniqueVisitors }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Statut</th>
              <td mat-cell *matCellDef="let row">
                <mat-chip [class]="isUpcoming(row.date) ? 'chip-upcoming' : 'chip-past'">
                  {{ isUpcoming(row.date) ? 'À venir' : 'Passé' }}
                </mat-chip>
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let row">
                <button mat-icon-button (click)="viewDetail.emit(row.slug)" matTooltip="Détails">
                  <mat-icon>visibility</mat-icon>
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;" class="clickable-row"></tr>
          </table>
        } @else {
          <p class="no-data">Aucun événement configuré</p>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .events-card { padding: 1rem; }
    .full-width { width: 100%; }
    .event-name { font-weight: 500; }
    .event-date { font-size: 0.8rem; opacity: 0.6; }
    .stat-value { font-weight: 600; font-size: 1.1rem; }
    .chip-upcoming { background: #dcfce7 !important; color: #166534 !important; }
    .chip-past { background: #f1f5f9 !important; color: #64748b !important; }
    .clickable-row:hover { background: rgba(99, 102, 241, 0.04); cursor: pointer; }
    .no-data { text-align: center; opacity: 0.5; padding: 2rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsListComponent {
  events = input<EventConfig[]>([]);
  viewDetail = output<string>();
  columns = ['name', 'clicks', 'unique', 'status', 'actions'];

  isUpcoming(date: string): boolean {
    return new Date(date) >= new Date(new Date().toISOString().split('T')[0]);
  }
}
