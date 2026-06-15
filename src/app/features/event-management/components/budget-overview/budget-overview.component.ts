import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { BudgetSummary } from '../../event-management.model';

@Component({
  selector: 'app-budget-overview',
  standalone: true,
  imports: [MatCardModule, MatIconModule, DecimalPipe],
  template: `
    <div class="budget-grid">
      <!-- Total Charges -->
      <mat-card class="budget-card charges">
        <mat-icon class="budget-icon">receipt_long</mat-icon>
        <div class="budget-content">
          <span class="budget-value">{{ budget()?.totalCharges ?? 0 | number:'1.2-2' }} CHF</span>
          <span class="budget-label">Total Charges</span>
          <span class="budget-subtitle">
            Payé: {{ budget()?.chargesPaid ?? 0 | number:'1.2-2' }} CHF /
            Impayé: {{ budget()?.chargesUnpaid ?? 0 | number:'1.2-2' }} CHF
          </span>
        </div>
      </mat-card>

      <!-- Total Recettes -->
      <mat-card class="budget-card revenues">
        <mat-icon class="budget-icon">trending_up</mat-icon>
        <div class="budget-content">
          <span class="budget-value">{{ budget()?.totalRevenues ?? 0 | number:'1.2-2' }} CHF</span>
          <span class="budget-label">Total Recettes</span>
          <span class="budget-subtitle">
            Reçu: {{ budget()?.revenuesReceived ?? 0 | number:'1.2-2' }} CHF /
            En attente: {{ budget()?.revenuesPending ?? 0 | number:'1.2-2' }} CHF
          </span>
        </div>
      </mat-card>

      <!-- Résultat -->
      <mat-card class="budget-card" [class.profit]="profitValue() >= 0" [class.loss]="profitValue() < 0">
        <mat-icon class="budget-icon">{{ profitValue() >= 0 ? 'check_circle' : 'warning' }}</mat-icon>
        <div class="budget-content">
          <span class="budget-value">{{ budget()?.profit ?? 0 | number:'1.2-2' }} CHF</span>
          <span class="budget-label">Résultat</span>
        </div>
      </mat-card>

      <!-- Cachets Lineup -->
      <mat-card class="budget-card lineup">
        <mat-icon class="budget-icon">music_note</mat-icon>
        <div class="budget-content">
          <span class="budget-value">{{ lineupFees() | number:'1.2-2' }} CHF</span>
          <span class="budget-label">Cachets Lineup</span>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .budget-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    @media (max-width: 960px) {
      .budget-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 480px) {
      .budget-grid {
        grid-template-columns: 1fr;
      }
    }

    .budget-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      border-left: 4px solid transparent;
    }

    .budget-card.charges {
      border-left-color: #ef4444;
    }

    .budget-card.revenues {
      border-left-color: #22c55e;
    }

    .budget-card.profit {
      border-left-color: #22c55e;
    }

    .budget-card.loss {
      border-left-color: #ef4444;
    }

    .budget-card.lineup {
      border-left-color: #8b5cf6;
    }

    .budget-icon {
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
      opacity: 0.85;
    }

    .charges .budget-icon { color: #ef4444; }
    .revenues .budget-icon { color: #22c55e; }
    .profit .budget-icon { color: #22c55e; }
    .loss .budget-icon { color: #ef4444; }
    .lineup .budget-icon { color: #8b5cf6; }

    .budget-content {
      display: flex;
      flex-direction: column;
    }

    .budget-value {
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1.2;
    }

    .budget-label {
      font-size: 0.85rem;
      font-weight: 500;
      opacity: 0.7;
      margin-top: 0.15rem;
    }

    .budget-subtitle {
      font-size: 0.75rem;
      opacity: 0.55;
      margin-top: 0.25rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetOverviewComponent {
  budget = input<BudgetSummary | null>(null);
  lineupFees = input<number>(0);

  profitValue = computed(() => this.budget()?.profit ?? 0);
}
