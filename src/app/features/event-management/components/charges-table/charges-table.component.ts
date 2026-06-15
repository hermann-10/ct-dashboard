import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EventCharge, CHARGE_CATEGORIES } from '../../event-management.model';

@Component({
  selector: 'app-charges-table',
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
        <h3 class="table-title">Charges</h3>
        <button mat-flat-button color="primary" (click)="add.emit()">
          <mat-icon>add</mat-icon>
          Ajouter
        </button>
      </div>

      <table mat-table [dataSource]="charges()" class="full-width">
        <!-- Catégorie -->
        <ng-container matColumnDef="category">
          <th mat-header-cell *matHeaderCellDef>Catégorie</th>
          <td mat-cell *matCellDef="let charge">{{ getCategoryLabel(charge.category) }}</td>
          <td mat-footer-cell *matFooterCellDef><strong>Total</strong></td>
        </ng-container>

        <!-- Libellé -->
        <ng-container matColumnDef="label">
          <th mat-header-cell *matHeaderCellDef>Libellé</th>
          <td mat-cell *matCellDef="let charge">{{ charge.label }}</td>
          <td mat-footer-cell *matFooterCellDef></td>
        </ng-container>

        <!-- Montant -->
        <ng-container matColumnDef="amount">
          <th mat-header-cell *matHeaderCellDef>Montant</th>
          <td mat-cell *matCellDef="let charge">{{ charge.amount | number:'1.2-2' }} CHF</td>
          <td mat-footer-cell *matFooterCellDef>
            <strong>{{ totalAmount() | number:'1.2-2' }} CHF</strong>
          </td>
        </ng-container>

        <!-- Payée -->
        <ng-container matColumnDef="is_paid">
          <th mat-header-cell *matHeaderCellDef>Payée</th>
          <td mat-cell *matCellDef="let charge">
            <mat-slide-toggle
              [checked]="charge.is_paid"
              (change)="togglePaid.emit(charge.id)"
              matTooltip="Marquer comme {{ charge.is_paid ? 'impayée' : 'payée' }}"
            ></mat-slide-toggle>
          </td>
          <td mat-footer-cell *matFooterCellDef></td>
        </ng-container>

        <!-- Actions -->
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let charge">
            <button mat-icon-button matTooltip="Modifier" (click)="edit.emit(charge)">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button matTooltip="Supprimer" color="warn" (click)="remove.emit(charge.id)">
              <mat-icon>delete</mat-icon>
            </button>
          </td>
          <td mat-footer-cell *matFooterCellDef></td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        <tr mat-footer-row *matFooterRowDef="displayedColumns"></tr>
      </table>

      @if (charges().length === 0) {
        <p class="empty-message">Aucune charge enregistrée.</p>
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
export class ChargesTableComponent {
  charges = input<EventCharge[]>([]);

  add = output<void>();
  edit = output<EventCharge>();
  remove = output<string>();
  togglePaid = output<string>();

  readonly displayedColumns = ['category', 'label', 'amount', 'is_paid', 'actions'];
  private readonly categoryMap = new Map(CHARGE_CATEGORIES.map(c => [c.value, c.label]));

  totalAmount = computed(() =>
    this.charges().reduce((sum, c) => sum + Number(c.amount), 0)
  );

  getCategoryLabel(category: string): string {
    return this.categoryMap.get(category as any) ?? category;
  }
}
