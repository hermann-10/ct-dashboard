import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UtmBreakdown } from '../../dashboard.model';

const SOURCE_COLORS: Record<string, string> = {
  meta: '#6C5CE7',
  facebook: '#1877F2',
  instagram: '#E4405F',
  google: '#4285F4',
  direct: '#10B981',
  email: '#F59E0B',
};

@Component({
  selector: 'app-utm-table',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="utm-card">
      <span class="card-title">Sources de trafic</span>
      @if (sourcesWithPercent().length > 0) {
        <div class="source-list">
          @for (src of sourcesWithPercent(); track src.source) {
            <div class="source-item">
              <div class="source-header">
                <span class="source-name">{{ src.source }}</span>
                <span class="source-percent">{{ src.percent }}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" [style.width.%]="src.percent" [style.background]="getColor(src.source)"></div>
              </div>
              <span class="source-count">{{ src.count }} clic{{ src.count > 1 ? 's' : '' }}</span>
            </div>
          }
        </div>
        <div class="card-footer">
          <a routerLink="/admin/traffic" class="detail-link">Voir le détail traffic →</a>
        </div>
      } @else {
        <p class="no-data">Aucune source identifiée</p>
      }
    </div>
  `,
  styles: `
    .utm-card {
      background: var(--hm-surface, #fff);
      border: 1px solid var(--hm-border, #E5E7EB);
      border-radius: var(--hm-radius-md, 12px);
      padding: 1.25rem;
    }
    .card-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--hm-text-primary, #1E1B4B);
      display: block;
      margin-bottom: 1rem;
    }
    .source-list {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }
    .source-item {}
    .source-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
    }
    .source-name {
      font-size: 0.8125rem;
      color: var(--hm-text-secondary, #6B7280);
      font-weight: 500;
    }
    .source-percent {
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--hm-text-primary, #1E1B4B);
    }
    .progress-track {
      height: 4px;
      background: var(--hm-border-light, #F3F4F6);
      border-radius: 2px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.4s ease;
    }
    .source-count {
      font-size: 0.6875rem;
      color: var(--hm-text-tertiary, #9CA3AF);
      margin-top: 0.125rem;
      display: block;
    }
    .card-footer {
      margin-top: 1rem;
      text-align: center;
      padding-top: 0.75rem;
      border-top: 1px solid var(--hm-border-light, #F3F4F6);
    }
    .detail-link {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--hm-brand-primary, #6C5CE7);
      cursor: pointer;
      text-decoration: none;
      &:hover { text-decoration: underline; }
    }
    .no-data {
      text-align: center;
      color: var(--hm-text-tertiary, #9CA3AF);
      font-size: var(--hm-text-sm, 0.8125rem);
      padding: 2rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UtmTableComponent {
  sources = input<UtmBreakdown[]>([]);

  sourcesWithPercent = computed(() => {
    const data = this.sources();
    const total = data.reduce((s, r) => s + r.count, 0);
    return data.map(d => ({
      source: d.source,
      count: d.count,
      percent: total > 0 ? Math.round((d.count / total) * 100) : 0,
    }));
  });

  getColor(source: string): string {
    return SOURCE_COLORS[source.toLowerCase()] || '#6C5CE7';
  }
}
