import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EventRevenue, REVENUE_SOURCES } from '../../event-management.model';

@Component({
  selector: 'app-revenues-table',
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule,
    DecimalPipe,
  ],
  template: `
    <div class="table-container">
      <div class="table-header">
        <h3 class="table-title">Recettes</h3>
        <button mat-flat-button color="primary" (click)="add.emit()">
          <mat-icon>add</mat-icon>
          Ajouter
        </button>
      </div>

      <table mat-table [dataSource]="revenues()" class="full-width">
        <!-- Source -->
        <ng-container matColumnDef="source">
          <th mat-header-cell *matHeaderCellDef>Source</th>
          <td mat-cell *matCellDef="let revenue">{{ getSourceLabel(revenue.source) }}</td>
          <td mat-footer-cell *matFooterCellDef><strong>Total</strong></td>
        </ng-container>

        <!-- Libellé -->
        <ng-container matColumnDef="label">
          <th mat-header-cell *matHeaderCellDef>Libellé</th>
          <td mat-cell *matCellDef="let revenue">{{ revenue.label }}</td>
          <td mat-footer-cell *matFooterCellDef></td>
        </ng-container>

        <!-- Montant -->
        <ng-container matColumnDef="amount">
          <th mat-header-cell *matHeaderCellDef>Montant</th>
          <td mat-cell *matCellDef="let revenue">{{ revenue.amount | number:'1.2-2' }} CHF</td>
          <td mat-footer-cell *matFooterCellDef>
            <strong>{{ totalAmount() | number:'1.2-2' }} CHF</strong>
          </td>
        </ng-container>

        <!-- Reçu -->
        <ng-container matColumnDef="is_received">
          <th mat-header-cell *matHeaderCellDef>Reçu</th>
          <td mat-cell *matCellDef="let revenue">
            <mat-slide-toggle
              [checked]="revenue.is_received"
              (change)="toggleReceived.emit(revenue.id)"
              matTooltip="Marquer comme {{ revenue.is_received ? 'en attente' : 'reçu' }}"
            ></mat-slide-toggle>
          </td>
          <td mat-footer-cell *matFooterCellDef></td>
        </ng-container>

        <!-- Actions -->
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let revenue">
            <button mat-icon-button matTooltip="Modifier" (click)="edit.emit(revenue)">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button matTooltip="Supprimer" color="warn" (click)="remove.emit(revenue.id)">
              <mat-icon>delete</mat-icon>
            </button>
          </td>
          <td mat-footer-cell *matFooterCellDef></td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        <tr mat-footer-row *matFooterRowDef="displayedColumns"></tr>
      </table>

      @if (revenues().length === 0) {
        <p class="empty-message">Aucune recette enregistrée.</p>
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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RevenuesTableComponent {
  revenues = input<EventRevenue[]>([]);

  add = output<void>();
  edit = output<EventRevenue>();
  remove = output<string>();
  toggleReceived = output<string>();

  readonly displayedColumns = ['source', 'label', 'amount', 'is_received', 'actions'];
  private readonly sourceMap = new Map(REVENUE_SOURCES.map(s => [s.value, s.label]));

  totalAmount = computed(() =>
    this.revenues().reduce((sum, r) => sum + Number(r.amount), 0)
  );

  getSourceLabel(source: string): string {
    return this.sourceMap.get(source as any) ?? source;
  }
}
