import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { Newsletter, CreateNewsletterDto, NEWSLETTER_TEMPLATES } from '../../newsletter.model';

interface EditorData {
  mode: 'create' | 'edit';
  newsletter?: Newsletter;
}

@Component({
  selector: 'app-newsletter-editor',
  standalone: true,
  imports: [
    FormsModule, MatButtonModule, MatIconModule, MatInputModule,
    MatFormFieldModule, MatSelectModule, MatDialogModule,
    MatChipsModule, MatTabsModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Nouvelle campagne' : 'Modifier la campagne' }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Objet de l'email *</mat-label>
        <input matInput [ngModel]="subject()" (ngModelChange)="subject.set($event)" placeholder="Ex: Soirée Afro House le 19 juin !" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Texte de prévisualisation</mat-label>
        <input matInput [ngModel]="previewText()" (ngModelChange)="previewText.set($event)" placeholder="Aperçu dans la boîte de réception" />
      </mat-form-field>

      <!-- Template selector -->
      @if (data.mode === 'create') {
        <div class="template-section">
          <p class="section-label">Choisir un template :</p>
          <div class="template-grid">
            @for (t of templates; track t.id) {
              <button
                class="template-card"
                [class.selected]="selectedTemplate() === t.id"
                (click)="onSelectTemplate(t.id)"
              >
                <mat-icon>{{ t.id === 'event-promo' ? 'celebration' : t.id === 'lineup-reveal' ? 'groups' : t.id === 'recap' ? 'photo_library' : 'article' }}</mat-icon>
                <span class="t-name">{{ t.label }}</span>
                <span class="t-desc">{{ t.description }}</span>
              </button>
            }
          </div>
        </div>
      }

      <!-- Tags -->
      <mat-form-field appearance="outline" class="full">
        <mat-label>Tags cibles (laisser vide = tous les contacts)</mat-label>
        <mat-chip-grid #tagGrid>
          @for (tag of targetTags(); track tag) {
            <mat-chip-row (removed)="removeTag(tag)">
              {{ tag }}
              <button matChipRemove><mat-icon>cancel</mat-icon></button>
            </mat-chip-row>
          }
        </mat-chip-grid>
        <input matInput [matChipInputFor]="tagGrid" (matChipInputTokenEnd)="addTag($event)" placeholder="Ex: vip" />
      </mat-form-field>

      <!-- Content editor -->
      <mat-tab-group>
        <mat-tab label="Éditeur">
          <mat-form-field appearance="outline" class="full content-field">
            <mat-label>Contenu HTML</mat-label>
            <textarea matInput rows="14" [ngModel]="htmlContent()" (ngModelChange)="htmlContent.set($event)"></textarea>
          </mat-form-field>
        </mat-tab>
        <mat-tab label="Prévisualisation">
          <iframe class="preview-frame" [attr.srcdoc]="htmlContent()" sandbox=""></iframe>
        </mat-tab>
      </mat-tab-group>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" [disabled]="!subject().trim()" (click)="onSave()">
        {{ data.mode === 'create' ? 'Créer' : 'Enregistrer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full { width: 100%; }
    .section-label { font-size: 0.85rem; font-weight: 500; color: #666; margin: 0 0 0.5rem; }
    .template-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .template-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      padding: 0.75rem;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      background: #fff;
      cursor: pointer;
      transition: border-color 0.2s;
      mat-icon { color: #6366f1; }
      .t-name { font-weight: 600; font-size: 0.85rem; }
      .t-desc { font-size: 0.7rem; color: #888; text-align: center; }
      &.selected { border-color: #6366f1; background: #f5f3ff; }
      &:hover { border-color: #a5b4fc; }
    }
    .content-field { margin-top: 0.5rem; }
    .preview-frame {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      width: 100%;
      min-height: 200px;
      max-height: 400px;
      margin-top: 0.5rem;
    }
    mat-dialog-content { max-height: 75vh; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsletterEditorComponent {
  readonly dialogRef = inject(MatDialogRef<NewsletterEditorComponent>);
  readonly data: EditorData = inject(MAT_DIALOG_DATA);
  readonly templates = NEWSLETTER_TEMPLATES;

  subject = signal(this.data.newsletter?.subject ?? '');
  previewText = signal(this.data.newsletter?.preview_text ?? '');
  htmlContent = signal(this.data.newsletter?.html_content ?? '');
  targetTags = signal<string[]>(this.data.newsletter?.target_tags ?? []);
  selectedTemplate = signal('');

  onSelectTemplate(templateId: string): void {
    this.selectedTemplate.set(templateId);
    const templateHtml = this.getTemplateHtml(templateId);
    if (templateHtml && !this.htmlContent()) {
      this.htmlContent.set(templateHtml);
    }
  }

  addTag(event: MatChipInputEvent): void {
    const value = (event.value ?? '').trim().toLowerCase();
    if (value && !this.targetTags().includes(value)) {
      this.targetTags.update(t => [...t, value]);
    }
    event.chipInput.clear();
  }

  removeTag(tag: string): void {
    this.targetTags.update(t => t.filter(x => x !== tag));
  }

  onSave(): void {
    const dto: CreateNewsletterDto = {
      subject: this.subject().trim(),
      preview_text: this.previewText().trim(),
      html_content: this.htmlContent(),
      target_tags: this.targetTags(),
    };
    this.dialogRef.close(dto);
  }

  private getTemplateHtml(id: string): string {
    const map: Record<string, string> = {
      'event-promo': `<div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
  <div style="background:#1a1a2e;color:#fff;padding:2rem;text-align:center;border-radius:12px 12px 0 0;">
    <h1 style="margin:0;font-size:1.8rem;">🎉 [NOM DE L'ÉVÉNEMENT]</h1>
    <p style="margin:0.5rem 0 0;opacity:0.8;">[DATE] · [LIEU], [VILLE]</p>
  </div>
  <div style="padding:1.5rem;background:#fff;">
    <p>Salut,</p>
    <p>[Description de l'événement, ambiance, lineup...]</p>
    <div style="text-align:center;margin:1.5rem 0;">
      <a href="[LIEN_BILLETTERIE]" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Réserver ma place</a>
    </div>
    <p>À bientôt !</p>
    <p><strong>L'équipe HM Events</strong></p>
  </div>
</div>`,
      'lineup-reveal': `<div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
  <div style="background:linear-gradient(135deg,#1a1a2e,#3730a3);color:#fff;padding:2rem;text-align:center;border-radius:12px 12px 0 0;">
    <h1 style="margin:0;">🎧 Lineup Reveal</h1>
    <p style="margin:0.5rem 0 0;opacity:0.8;">[NOM DE L'ÉVÉNEMENT]</p>
  </div>
  <div style="padding:1.5rem;background:#fff;">
    <p>Le lineup est enfin dévoilé !</p>
    <ul style="list-style:none;padding:0;">
      <li style="padding:0.5rem 0;border-bottom:1px solid #f3f4f6;font-weight:600;">🎵 [ARTISTE 1] — [HEURE]</li>
      <li style="padding:0.5rem 0;border-bottom:1px solid #f3f4f6;font-weight:600;">🎵 [ARTISTE 2] — [HEURE]</li>
      <li style="padding:0.5rem 0;font-weight:600;">🎵 [ARTISTE 3] — [HEURE]</li>
    </ul>
    <div style="text-align:center;margin:1.5rem 0;">
      <a href="[LIEN]" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Voir le lineup complet</a>
    </div>
  </div>
</div>`,
      'recap': `<div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
  <div style="background:#1a1a2e;color:#fff;padding:2rem;text-align:center;border-radius:12px 12px 0 0;">
    <h1 style="margin:0;">📸 Récap — [NOM]</h1>
  </div>
  <div style="padding:1.5rem;background:#fff;">
    <p>Merci d'avoir été là ! Voici les highlights de la soirée.</p>
    <p>[Insérer photos / liens galerie]</p>
    <p>Le prochain événement arrive bientôt... Stay tuned 🎶</p>
    <p><strong>HM Events</strong></p>
  </div>
</div>`,
      'general': `<div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
  <div style="background:#1a1a2e;color:#fff;padding:1.5rem;text-align:center;border-radius:12px 12px 0 0;">
    <h1 style="margin:0;font-size:1.4rem;">HM Events — Newsletter</h1>
  </div>
  <div style="padding:1.5rem;background:#fff;">
    <p>Salut,</p>
    <p>[Contenu de votre newsletter...]</p>
    <p>À bientôt !</p>
    <p><strong>L'équipe HM Events</strong></p>
  </div>
</div>`,
    };
    return map[id] ?? '';
  }
}
