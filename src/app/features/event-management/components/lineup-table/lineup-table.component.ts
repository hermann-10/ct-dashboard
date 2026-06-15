import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EventLineup, ARTIST_ROLES } from '../../event-management.model';

@Component({
  selector: 'app-lineup-table',
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatTooltipModule,
    DecimalPipe,
  ],
  template: `
    <div class="table-container">
      <div class="table-header">
        <h3 class="table-title">Lineup</h3>
        <button mat-flat-button color="primary" (click)="add.emit()">
          <mat-icon>add</mat-icon>
          Ajouter
        </button>
      </div>

      <table mat-table [dataSource]="lineup()" class="full-width">
        <!-- Artiste -->
        <ng-container matColumnDef="artist_name">
          <th mat-header-cell *matHeaderCellDef>Artiste</th>
          <td mat-cell *matCellDef="let artist">{{ artist.artist_name }}</td>
          <td mat-footer-cell *matFooterCellDef><strong>Total</strong></td>
        </ng-container>

        <!-- Rôle -->
        <ng-container matColumnDef="role">
          <th mat-header-cell *matHeaderCellDef>Rôle</th>
          <td mat-cell *matCellDef="let artist">{{ getRoleLabel(artist.role) }}</td>
          <td mat-footer-cell *matFooterCellDef></td>
        </ng-container>

        <!-- Horaire -->
        <ng-container matColumnDef="set_time">
          <th mat-header-cell *matHeaderCellDef>Horaire</th>
          <td mat-cell *matCellDef="let artist">{{ artist.set_time ?? '—' }}</td>
          <td mat-footer-cell *matFooterCellDef></td>
        </ng-container>

        <!-- Cachet -->
        <ng-container matColumnDef="fee">
          <th mat-header-cell *matHeaderCellDef>Cachet</th>
          <td mat-cell *matCellDef="let artist">{{ artist.fee | number:'1.2-2' }} CHF</td>
          <td mat-footer-cell *matFooterCellDef>
            <strong>{{ totalFees() | number:'1.2-2' }} CHF</strong>
          </td>
        </ng-container>

        <!-- Confirmé -->
        <ng-container matColumnDef="is_confirmed">
          <th mat-header-cell *matHeaderCellDef>Statut</th>
          <td mat-cell *matCellDef="let artist">
            <mat-chip-set>
              @if (artist.is_confirmed) {
                <mat-chip class="chip-confirmed" (click)="toggleConfirmed.emit(artist.id)">
                  Confirmé
                </mat-chip>
              } @else {
                <mat-chip class="chip-pending" (click)="toggleConfirmed.emit(artist.id)">
                  En attente
                </mat-chip>
              }
            </mat-chip-set>
          </td>
          <td mat-footer-cell *matFooterCellDef></td>
        </ng-container>

        <!-- Actions -->
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let artist">
            <button mat-icon-button matTooltip="Modifier" (click)="edit.emit(artist)">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button matTooltip="Supprimer" color="warn" (click)="remove.emit(artist.id)">
              <mat-icon>delete</mat-icon>
            </button>
          </td>
          <td mat-footer-cell *matFooterCellDef></td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        <tr mat-footer-row *matFooterRowDef="displayedColumns"></tr>
      </table>

      @if (lineup().length === 0) {
        <p class="empty-message">Aucun artiste dans le lineup.</p>
      }
    </div>
  `,
  styles: [`
    .table-container {
      margin-bottom: 1.5rem;
    }

    .table-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }

    .table-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .full-width {
      width: 100%;
    }

    .empty-message {
      text-align: center;
      padding: 2rem 1rem;
      opacity: 0.6;
      font-style: italic;
    }

    td.mat-mdc-cell, th.mat-mdc-header-cell {
      padding: 0.5rem 0.75rem;
    }

    .mat-mdc-footer-row {
      font-weight: 600;
    }

    .chip-confirmed {
      --mdc-chip-elevated-container-color: #dcfce7;
      --mdc-chip-label-text-color: #166534;
      cursor: pointer;
    }

    .chip-pending {
      --mdc-chip-elevated-container-color: #fff7ed;
      --mdc-chip-label-text-color: #9a3412;
      cursor: pointer;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineupTableComponent {
  lineup = input<EventLineup[]>([]);

  add = output<void>();
  edit = output<EventLineup>();
  remove = output<string>();
  toggleConfirmed = output<string>();

  readonly displayedColumns = ['artist_name', 'role', 'set_time', 'fee', 'is_confirmed', 'actions'];
  private readonly roleMap = new Map(ARTIST_ROLES.map(r => [r.value, r.label]));

  totalFees = computed(() =>
    this.lineup().reduce((sum, a) => sum + Number(a.fee ?? 0), 0)
  );

  getRoleLabel(role: string): string {
    return this.roleMap.get(role as any) ?? role;
  }
}
