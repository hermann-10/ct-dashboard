import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CreateContactDto } from '../../newsletter.model';

@Component({
  selector: 'app-import-contacts-dialog',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Importer des contacts</h2>
    <mat-dialog-content>
      <p class="hint">Format CSV attendu : <code>email,prénom,nom,tags</code></p>
      <p class="hint">Les tags sont séparés par des points-virgules (ex: vip;bâle)</p>

      <div
        class="drop-zone"
        [class.dragging]="dragging()"
        (dragover)="onDragOver($event)"
        (dragleave)="dragging.set(false)"
        (drop)="onDrop($event)"
      >
        <mat-icon>upload_file</mat-icon>
        <p>Glissez un fichier CSV ici ou</p>
        <button mat-stroked-button (click)="fileInput.click()">Parcourir</button>
        <input #fileInput type="file" accept=".csv,.txt" hidden (change)="onFileSelected($event)" />
      </div>

      @if (parsed().length > 0) {
        <p class="parsed-info">{{ parsed().length }} contacts détectés</p>
        <div class="preview">
          @for (c of parsed().slice(0, 5); track c.email) {
            <span class="preview-item">{{ c.email }}</span>
          }
          @if (parsed().length > 5) {
            <span class="preview-more">+{{ parsed().length - 5 }} autres</span>
          }
        </div>
      }

      @if (errorMsg()) {
        <p class="error-msg">{{ errorMsg() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" [disabled]="parsed().length === 0" (click)="onImport()">
        Importer {{ parsed().length }} contacts
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .hint { font-size: 0.85rem; color: #888; margin: 0 0 0.5rem; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; }
    .drop-zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 2rem;
      border: 2px dashed #d1d5db;
      border-radius: 10px;
      text-align: center;
      transition: border-color 0.2s;
      mat-icon { font-size: 2rem; width: 2rem; height: 2rem; color: #aaa; }
      p { margin: 0; color: #888; font-size: 0.9rem; }
      &.dragging { border-color: #6366f1; background: #f5f3ff; }
    }
    .parsed-info { margin: 1rem 0 0.5rem; font-weight: 600; color: #16a34a; }
    .preview { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .preview-item {
      font-size: 0.8rem;
      background: #f3f4f6;
      padding: 2px 8px;
      border-radius: 8px;
    }
    .preview-more { font-size: 0.8rem; color: #888; padding: 2px; }
    .error-msg { color: #dc2626; font-size: 0.85rem; margin-top: 0.5rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportContactsDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ImportContactsDialogComponent>);

  parsed = signal<CreateContactDto[]>([]);
  dragging = signal(false);
  errorMsg = signal('');

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragging.set(true);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragging.set(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) this.parseFile(file);
  }

  onFileSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.parseFile(file);
  }

  private parseFile(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

        // Skip header if first line looks like a header
        const start = /^email/i.test(lines[0]) ? 1 : 0;

        const contacts: CreateContactDto[] = [];
        for (let i = start; i < lines.length; i++) {
          const parts = lines[i].split(',').map(p => p.trim());
          const email = parts[0]?.toLowerCase();
          if (!email || !email.includes('@')) continue;

          contacts.push({
            email,
            first_name: parts[1] ?? '',
            last_name: parts[2] ?? '',
            tags: parts[3] ? parts[3].split(';').map(t => t.trim().toLowerCase()).filter(Boolean) : [],
            source: 'csv_import',
          });
        }

        if (contacts.length === 0) {
          this.errorMsg.set('Aucun email valide trouvé dans le fichier.');
        } else {
          this.errorMsg.set('');
        }
        this.parsed.set(contacts);
      } catch {
        this.errorMsg.set('Erreur lors de la lecture du fichier.');
      }
    };
    reader.readAsText(file);
  }

  onImport(): void {
    this.dialogRef.close(this.parsed());
  }
}
