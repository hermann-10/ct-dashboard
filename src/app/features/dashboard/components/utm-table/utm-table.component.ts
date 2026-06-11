import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { UtmBreakdown } from '../../dashboard.model';

@Component({
  selector: 'app-utm-table',
  standalone: true,
  imports: [MatCardModule, MatTableModule, MatIconModule],
  template: `
    <mat-card class="utm-card">
      <mat-card-header>
        <mat-card-title>Sources de trafic</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        @if (sources().length > 0) {
          <table mat-table [dataSource]="sources()" class="full-width">
            <ng-container matColumnDef="source">
              <th mat-header-cell *matHeaderCellDef>Source</th>
              <td mat-cell *matCellDef="let row">
                <div class="source-cell">
                  <mat-icon class="source-icon">{{ getIcon(row.source) }}</mat-icon>
                  {{ row.source }}
                </div>
              </td>
            </ng-container>
            <ng-container matColumnDef="count">
              <th mat-header-cell *matHeaderCellDef>Clics</th>
              <td mat-cell *matCellDef="let row">{{ row.count }}</td>
            </ng-container>
            <ng-container matColumnDef="percent">
              <th mat-header-cell *matHeaderCellDef>%</th>
              <td mat-cell *matCellDef="let row">{{ getPercent(row.count) }}%</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>
        } @else {
          <p class="no-data">Aucune source identifiée</p>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .utm-card { padding: 1rem; }
    .full-width { width: 100%; }
    .source-cell { display: flex; align-items: center; gap: 0.5rem; }
    .source-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; opacity: 0.6; }
    .no-data { text-align: center; opacity: 0.5; padding: 2rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UtmTableComponent {
  sources = input<UtmBreakdown[]>([]);
  columns = ['source', 'count', 'percent'];

  private total = computed(() => this.sources().reduce((s, r) => s + r.count, 0));

  getPercent(count: number): string {
    const t = this.total();
    return t > 0 ? ((count / t) * 100).toFixed(1) : '0';
  }

  getIcon(source: string): string {
    const map: Record<string, string> = {
      meta: 'campaign', facebook: 'facebook', instagram: 'photo_camera',
      google: 'search', direct: 'link', email: 'email',
    };
    return map[source.toLowerCase()] || 'public';
  }
}
